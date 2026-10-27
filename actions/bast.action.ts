"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ItemBAST,
  StatusInspeksi,
} from "@/generated/prisma";
import {
  updateInspeksiBASTSchema,
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
    status: StatusInspeksi;
    catatan: string | null;
  };
}

/**
 * Updates an inspection item for BAST (Serah Terima Bangunan).
 * Inside a transaction:
 * 1. Upserts the InspeksiBAST record.
 * 2. Creates an audit log record in InspeksiBASTLog capturing status_sebelum and status_sesudah.
 * Role required: ADMIN
 */
export async function updateInspeksiBAST(
  inputOrTransaksiId: number | UpdateInspeksiBASTInput,
  maybeItemId?: ItemBAST | string | number,
  maybeNewStatus?: StatusInspeksi,
  maybeNote?: string | null
): Promise<BastActionResponse> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const role = session.user.role;
  if (role !== "ADMIN") {
    return {
      success: false,
      error: "Hanya Admin yang berwenang memperbarui hasil inspeksi BAST.",
    };
  }

  const adminId = Number(session.user.id);
  if (!Number.isSafeInteger(adminId) || adminId <= 0) {
    return {
      success: false,
      error: "Sesi admin tidak valid. Silakan login kembali.",
    };
  }

  // Verify actor exists and is active in database
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

  // Normalize positional vs object invocation
  const rawInput =
    typeof inputOrTransaksiId === "object"
      ? inputOrTransaksiId
      : {
          transaksiId: inputOrTransaksiId,
          itemId: maybeItemId,
          newStatus: maybeNewStatus,
          note: maybeNote,
        };

  const parsed = updateInspeksiBASTSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Data inspeksi tidak valid.",
    };
  }

  const { transaksiId, itemId, newStatus, note } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify transaction exists
      const trx = await tx.transaksi.findUnique({
        where: { id: transaksiId },
        select: { id: true, unit: { select: { blok: true } } },
      });

      if (!trx) {
        throw new Error("Transaksi tidak ditemukan.");
      }

      // 2. Resolve ItemBAST enum
      let targetItemEnum: ItemBAST;

      if (typeof itemId === "number") {
        const found = await tx.inspeksiBAST.findUnique({
          where: { id: itemId },
          select: { item: true },
        });
        if (!found) {
          throw new Error("Item inspeksi tidak ditemukan.");
        }
        targetItemEnum = found.item;
      } else {
        targetItemEnum = itemId as ItemBAST;
      }

      // 3. Find current inspection record to get status_sebelum
      const existing = await tx.inspeksiBAST.findUnique({
        where: {
          transaksi_id_item: {
            transaksi_id: transaksiId,
            item: targetItemEnum,
          },
        },
      });

      const statusSebelum: StatusInspeksi | null = existing ? existing.status : null;
      const cleanNote = note?.trim() || null;

      // 4. Upsert InspeksiBAST
      const updated = await tx.inspeksiBAST.upsert({
        where: {
          transaksi_id_item: {
            transaksi_id: transaksiId,
            item: targetItemEnum,
          },
        },
        create: {
          transaksi_id: transaksiId,
          item: targetItemEnum,
          status: newStatus,
          catatan: cleanNote,
          inspektur_id: adminId,
          diperiksa_at: new Date(),
        },
        update: {
          status: newStatus,
          catatan: cleanNote,
          inspektur_id: adminId,
          diperiksa_at: new Date(),
        },
      });

      // 5. CRITICAL: Create log record in InspeksiBASTLog
      await tx.inspeksiBASTLog.create({
        data: {
          inspeksi_bast_id: updated.id,
          status_sebelum: statusSebelum,
          status_sesudah: newStatus,
          catatan: cleanNote,
          inspektur_id: adminId,
        },
      });

      return updated;
    });

    revalidatePath(`/admin/transaksi/${transaksiId}`);
    revalidatePath("/admin/transaksi");
    revalidatePath("/manager/transaksi");

    return {
      success: true,
      message: `Inspeksi ${result.item.replace(/_/g, " ")} berhasil diperbarui menjadi ${newStatus}.`,
      data: {
        id: result.id,
        transaksiId: result.transaksi_id,
        item: result.item,
        status: result.status,
        catatan: result.catatan,
      },
    };
  } catch (error: unknown) {
    console.error("updateInspeksiBAST error:", error);
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui inspeksi BAST.";
    return { success: false, error: message };
  }
}
