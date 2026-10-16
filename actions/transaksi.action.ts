"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import {
  createPembayaranSchema,
  updateTransactionStatusSchema,
  type CreatePembayaranInput,
  type UpdateTransactionStatusInput,
} from "@/schemas/transaksi.schema";

export interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Creates a new payment record (Pembayaran) for a transaction.
 * Role required: ADMIN
 */
export async function createPembayaran(
  data: CreatePembayaranInput
): Promise<ActionResponse> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      error: "Hanya Admin yang dapat mencatat pembayaran.",
    };
  }

  const adminId = Number(session.user.id);
  if (!Number.isSafeInteger(adminId) || adminId <= 0) {
    return {
      success: false,
      error: "Sesi admin tidak valid. Silakan login kembali.",
    };
  }

  const parsed = createPembayaranSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Data pembayaran tidak valid.",
    };
  }

  const validData = parsed.data;

  try {
    // Verify transaction exists
    const trx = await prisma.transaksi.findUnique({
      where: { id: validData.transaksiId },
    });

    if (!trx) {
      return { success: false, error: "Transaksi tidak ditemukan." };
    }

    // Insert payment record
    await prisma.pembayaran.create({
      data: {
        transaksi_id: validData.transaksiId,
        admin_id: adminId,
        jenis_pembayaran: validData.jenisBayar,
        nominal: validData.nominal,
        catatan: validData.catatan || null,
      },
    });

    revalidatePath(`/admin/transaksi/${validData.transaksiId}`);
    revalidatePath("/admin/transaksi");

    return {
      success: true,
      message: `Pembayaran ${validData.jenisBayar} berhasil dicatat.`,
    };
  } catch (error: unknown) {
    console.error("createPembayaran error:", error);
    const message =
      error instanceof Error ? error.message : "Gagal menyimpan pembayaran.";
    return { success: false, error: message };
  }
}

/**
 * Updates transaction progress status, checklist metadata, and records an Aktivitas log.
 * Role required: ADMIN or MANAGER
 */
export async function updateTransactionStatus(
  inputOrId: number | UpdateTransactionStatusInput,
  maybeData?: Omit<UpdateTransactionStatusInput, "transaksiId">
): Promise<ActionResponse> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return {
      success: false,
      error: "Hanya Admin atau Manager yang dapat memperbarui status transaksi.",
    };
  }

  const rawInput =
    typeof inputOrId === "object"
      ? inputOrId
      : {
          transaksiId: inputOrId,
          ...maybeData,
        };

  const parsed = updateTransactionStatusSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Data status tidak valid.",
    };
  }

  const validData = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Validasi Keberadaan Transaksi
      const existingTrx = await tx.transaksi.findUnique({
        where: { id: validData.transaksiId },
        include: { customer: true, unit: true },
      });

      if (!existingTrx) {
        throw new Error("Transaksi tidak ditemukan.");
      }

      // 2. Validasi Keberadaan Lead
      const existingLead = await tx.lead.findUnique({
        where: { id: validData.leadId },
      });

      if (!existingLead) {
        throw new Error("Lead prospek tidak ditemukan.");
      }

      // 3. Siapkan payload update transaksi
      const updatePayload: Prisma.TransaksiUpdateInput = {
        status_transaksi: validData.status,
      };

      if (validData.namaBank !== undefined) {
        updatePayload.nama_bank = validData.namaBank;
      }
      if (validData.namaNotaris !== undefined) {
        updatePayload.nama_notaris = validData.namaNotaris;
      }
      if (validData.tglAkad !== undefined) {
        updatePayload.tgl_akad = validData.tglAkad
          ? new Date(validData.tglAkad)
          : null;
      }
      if (validData.tglBast !== undefined) {
        updatePayload.tgl_bast = validData.tglBast
          ? new Date(validData.tglBast)
          : null;
      }
      if (validData.catatanAdmin !== undefined) {
        updatePayload.catatan_admin = validData.catatanAdmin;
      }
      if (validData.berkas !== undefined) {
        updatePayload.berkas_json = validData.berkas ? validData.berkas : Prisma.JsonNull;
      }
      if (validData.bast !== undefined) {
        updatePayload.bast_json = validData.bast ? validData.bast : Prisma.JsonNull;
      }

      // Jika status BAST dan tgl_bast belum terisi, otomatis isi sekarang
      if (
        validData.status.toUpperCase() === "BAST" &&
        !updatePayload.tgl_bast &&
        !existingTrx.tgl_bast
      ) {
        updatePayload.tgl_bast = new Date();
      }

      // Update tabel Transaksi
      await tx.transaksi.update({
        where: { id: validData.transaksiId },
        data: updatePayload,
      });

      // Jika BAST, pastikan unit status_unit menjadi SOLD
      if (validData.status.toUpperCase() === "BAST") {
        await tx.masterUnit.update({
          where: { id: existingTrx.unit_id },
          data: { status_unit: "SOLD" },
        });
      }

      // 4. Catat riwayat ke tabel Aktivitas yang terhubung ke leadId
      const notesParts = [
        `Status Transaksi diupdate Admin menjadi: [${validData.status}]`,
        validData.catatanAdmin ? `Catatan: ${validData.catatanAdmin}` : null,
        validData.berkas && validData.berkas.length > 0
          ? `Checklist Berkas: ${validData.berkas.join(", ")}`
          : null,
        validData.bast && validData.bast.length > 0
          ? `Checklist BAST (${validData.bast.length} item lengkap 100%)`
          : null,
      ].filter(Boolean);

      await tx.aktivitas.create({
        data: {
          lead_id: validData.leadId,
          jenis: "UPDATE_ADMIN",
          hasil: "MINTA_INFO_LAGI",
          catatan: notesParts.join(" • "),
        },
      });
    });

    revalidatePath(`/admin/transaksi/${validData.transaksiId}`);
    revalidatePath("/admin/transaksi");
    revalidatePath(`/marketing/lead/${validData.leadId}`);
    revalidatePath("/marketing/lead");

    return {
      success: true,
      message: `Status transaksi berhasil diperbarui menjadi "${validData.status}".`,
    };
  } catch (error: unknown) {
    console.error("updateTransactionStatus error:", error);
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui status transaksi.";
    return { success: false, error: message };
  }
}
