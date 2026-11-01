"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ItemBAST, StatusBAST } from "@/generated/prisma";
import {
  updateChecklistBASTSchema,
  type UpdateChecklistBASTInput,
  type UpdateInspeksiBASTInput,
} from "@/schemas/bast.schema";

export interface BastActionResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    id: number;
    transaksiId: number;
    item: ItemBAST;
    status: StatusBAST;
  };
}

/**
 * Updates a checklist item for BAST (Serah Terima Bangunan / Kavling).
 * Records status BELUM_LENGKAP or LENGKAP.
 * Role required: ADMIN
 */
export async function updateChecklistBAST(
  input: UpdateChecklistBASTInput
): Promise<BastActionResponse> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const role = session.user.role;
  if (role !== "ADMIN") {
    return {
      success: false,
      error: "Hanya Admin yang berwenang memperbarui checklist serah terima BAST.",
    };
  }

  const adminId = Number(session.user.id);
  if (!Number.isSafeInteger(adminId) || adminId <= 0) {
    return {
      success: false,
      error: "Sesi admin tidak valid. Silakan login kembali.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user || !user.isActive || user.role !== "ADMIN") {
    return {
      success: false,
      error: "Pengguna tidak aktif atau tidak memiliki hak akses Admin.",
    };
  }

  const parsed = updateChecklistBASTSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Data checklist BAST tidak valid.",
    };
  }

  const { transaksiId, item, status } = parsed.data;

  try {
    const trx = await prisma.transaksi.findUnique({
      where: { id: transaksiId },
      select: { id: true },
    });

    if (!trx) {
      return { success: false, error: "Transaksi tidak ditemukan." };
    }

    const updated = await prisma.checklistBAST.upsert({
      where: {
        transaksi_id_item: {
          transaksi_id: transaksiId,
          item,
        },
      },
      create: {
        transaksi_id: transaksiId,
        item,
        status,
      },
      update: {
        status,
      },
    });

    revalidatePath(`/admin/transaksi/${transaksiId}`);
    revalidatePath("/admin/transaksi");
    revalidatePath("/manager/transaksi");

    return {
      success: true,
      message: `Item ${item.replace(/_/g, " ")} berhasil ditandai ${status === "LENGKAP" ? "Lengkap" : "Belum Lengkap"}.`,
      data: {
        id: updated.id,
        transaksiId: updated.transaksi_id,
        item: updated.item,
        status: updated.status,
      },
    };
  } catch (error: unknown) {
    console.error("updateChecklistBAST error:", error);
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui checklist BAST.";
    return { success: false, error: message };
  }
}

/**
 * Backwards compatibility wrapper for updateInspeksiBAST
 */
export async function updateInspeksiBAST(
  inputOrTransaksiId: number | UpdateInspeksiBASTInput,
  maybeItemId?: ItemBAST | string | number,
  maybeNewStatus?: string
): Promise<BastActionResponse> {
  let transaksiId: number;
  let targetItem: ItemBAST;
  let targetStatus: StatusBAST = "LENGKAP";

  if (typeof inputOrTransaksiId === "object") {
    transaksiId = inputOrTransaksiId.transaksiId;
    targetItem = (
      typeof inputOrTransaksiId.itemId === "string"
        ? inputOrTransaksiId.itemId
        : "PONDASI_STRUKTUR"
    ) as ItemBAST;
    targetStatus =
      inputOrTransaksiId.newStatus === "SESUAI" ||
      inputOrTransaksiId.newStatus === "SELESAI_DIPERBAIKI" ||
      inputOrTransaksiId.newStatus === "LENGKAP"
        ? "LENGKAP"
        : "BELUM_LENGKAP";
  } else {
    transaksiId = inputOrTransaksiId;
    targetItem = (
      typeof maybeItemId === "string" ? maybeItemId : "PONDASI_STRUKTUR"
    ) as ItemBAST;
    targetStatus =
      maybeNewStatus === "SESUAI" ||
      maybeNewStatus === "SELESAI_DIPERBAIKI" ||
      maybeNewStatus === "LENGKAP"
        ? "LENGKAP"
        : "BELUM_LENGKAP";
  }

  return updateChecklistBAST({
    transaksiId,
    item: targetItem,
    status: targetStatus,
  });
}
