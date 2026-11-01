
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  ajukanKPRSchema,
  updateStatusPengajuanKPRSchema,
  tolakPengajuanKPRSchema,
  ALLOWED_KPR_STATUS_TRANSITIONS,
} from "@/schemas/kpr.schema";
import { getRequiredDocuments } from "@/lib/transaksi/document-rules";
import { logActivity } from "@/lib/activity/log";

export interface ServerActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * Authorization:
 * - ADMIN: boleh mengelola semua transaksi.
 * - MARKETING: hanya boleh mengelola transaksi miliknya sendiri (PIC).
 *
 * Role diambil dari database, bukan session, agar selalu menggunakan
 * data role terbaru.
 */
async function requireCanEditKpr(transaksiId: number) {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Silakan login kembali.");
  }

  const userId = Number(session.user.id);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("Sesi pengguna tidak valid.");
  }

  // Ambil data user terbaru dari database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new Error("Pengguna tidak aktif atau tidak ditemukan.");
  }

  // Admin dapat mengakses semua transaksi
  if (user.role === "ADMIN") {
    return {
      session,
      adminId: user.id,
      userId: user.id,
      user,
    };
  }

  // Selain admin, hanya MARKETING yang boleh mengakses
  if (user.role !== "MARKETING") {
    throw new Error("Hanya PIC Marketing atau Admin yang berwenang.");
  }

  // Pastikan transaksi tersedia
  const trx = await prisma.transaksi.findUnique({
    where: { id: transaksiId },
    select: {
      id: true,
      pic_id: true,
    },
  });

  if (!trx) {
    throw new Error("Transaksi tidak ditemukan.");
  }

  // Pastikan user adalah PIC transaksi
  if (user.id !== trx.pic_id) {
    throw new Error(
      "Hanya PIC Marketing atau Admin yang dapat memperbarui pengajuan KPR transaksi ini."
    );
  }

  return {
    session,
    adminId: user.id,
    userId: user.id,
    user,
  };
}

/**
 * Fetch master bank list with auto-seed fallback
 */
export async function getBankMasterList(): Promise<
  ServerActionResponse<
    Array<{
      id: number;
      nama: string;
      kode: string | null;
      is_active: boolean;
    }>
  >
> {
  try {
    let banks = await prisma.bank.findMany({
      where: { is_active: true },
      orderBy: { nama: "asc" },
    });

    if (banks.length === 0) {
      await prisma.bank.createMany({
        data: [
          { nama: "Bank BTN", kode: "BTN" },
          { nama: "Bank BTN Syariah", kode: "BTNS" },
          {
            nama: "Bank BSI (Bank Syariah Indonesia)",
            kode: "BSI",
          },
          { nama: "Bank Mandiri", kode: "MANDIRI" },
          { nama: "Bank BRI", kode: "BRI" },
          { nama: "Bank BNI", kode: "BNI" },
          { nama: "Bank BCA", kode: "BCA" },
        ],
        skipDuplicates: true,
      });

      banks = await prisma.bank.findMany({
        where: { is_active: true },
        orderBy: { nama: "asc" },
      });
    }

    return {
      success: true,
      data: banks.map((b) => ({
        id: b.id,
        nama: b.nama,
        kode: b.kode,
        is_active: b.is_active,
      })),
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Ajukan KPR baru ke Bank.
 *
 * Akses:
 * - ADMIN: semua transaksi.
 * - MARKETING: hanya transaksi dengan PIC dirinya sendiri.
 */
export async function ajukanKPR(
  input: unknown
): Promise<ServerActionResponse> {
  try {
    // 1. Validasi input terlebih dahulu
    const parsed = ajukanKPRSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Data pengajuan KPR tidak valid.",
      };
    }

    const { transaksiId, bankId, catatan } = parsed.data;

    // 2. Validasi hak akses berdasarkan transaksi
    const { adminId } = await requireCanEditKpr(transaksiId);

    // 3. Proses pengajuan
    const result = await prisma.$transaction(async (tx) => {
      const trx = await tx.transaksi.findUnique({
        where: { id: transaksiId },
        include: {
          customer: true,
          unit: {
            include: { tipe: true },
          },
          dokumen: true,
          itj: true,
        },
      });

      if (!trx) {
        throw new Error("Transaksi tidak ditemukan.");
      }

      if (trx.metode_bayar !== "KPR") {
        throw new Error(
          "Pengajuan KPR hanya berlaku untuk metode pembayaran KPR."
        );
      }

      if (
        trx.tahap_detail === "BATAL" ||
        trx.tahap_detail === "BAST"
      ) {
        throw new Error(
          "Transaksi sudah selesai atau telah dibatalkan."
        );
      }

      if (
        trx.tahap_detail !== "PENGUMPULAN_DOKUMEN" &&
        trx.tahap_detail !== "PROSES_BANK"
      ) {
        throw new Error(
          `Pengajuan KPR hanya dapat dilakukan pada tahap Pengumpulan Dokumen atau Proses Bank (tahap saat ini: ${trx.tahap_detail}).`
        );
      }

      // 4. Validasi dokumen saat pertama kali masuk proses bank
      if (trx.tahap_detail === "PENGUMPULAN_DOKUMEN") {
        const docEvaluation = getRequiredDocuments({
          metode: trx.metode_bayar,
          kategori: trx.unit.tipe.kategori,
          statusPernikahan: trx.customer.status_pernikahan,
          statusPekerjaan: trx.customer.status_pekerjaan,
        });

        if (!docEvaluation.isProfileComplete) {
          throw new Error(
            `Pengajuan KPR belum dapat dilakukan: ${docEvaluation.message}`
          );
        }

        const verifiedDocKeys = new Set(
          trx.dokumen
            .filter((d) => d.status === "LENGKAP")
            .map((d) => d.jenis)
        );

        const requiredDocs = docEvaluation.documents.filter(
          (d) => d.required && !d.bisaMenyusul
        );

        const missingRequiredDocs = requiredDocs.filter((doc) => {
          if (
            doc.key === "KTP_PEMOHON" ||
            doc.key === "KTP_SUAMI_ISTRI"
          ) {
            return (
              !verifiedDocKeys.has("KTP_PEMOHON") &&
              !verifiedDocKeys.has("KTP_SUAMI_ISTRI")
            );
          }

          return !verifiedDocKeys.has(doc.key);
        });

        if (missingRequiredDocs.length > 0) {
          const missingLabels = missingRequiredDocs
            .map((d) => d.label)
            .join(", ");

          throw new Error(
            `Pengajuan KPR belum dapat dilakukan: Dokumen pemberkasan wajib [${missingLabels}] belum lengkap.`
          );
        }
      }

      // 5. Validasi bank
      const bank = await tx.bank.findUnique({
        where: { id: bankId },
      });

      if (!bank || !bank.is_active) {
        throw new Error(
          "Bank yang dipilih tidak aktif atau tidak ditemukan."
        );
      }

      // 6. Tentukan nomor pengajuan berikutnya
      const lastPengajuan = await tx.pengajuanKPR.findFirst({
        where: { transaksi_id: transaksiId },
        orderBy: { nomor_pengajuan: "desc" },
        select: { nomor_pengajuan: true },
      });

      const nextNomor =
        (lastPengajuan?.nomor_pengajuan ?? 0) + 1;

      // 7. Buat pengajuan KPR
      const newPengajuan = await tx.pengajuanKPR.create({
        data: {
          transaksi_id: transaksiId,
          bank_id: bankId,
          nomor_pengajuan: nextNomor,
          status: "DIAJUKAN",
          tanggal_ajukan: new Date(),
          catatan: catatan?.trim() || null,
        },
        include: { bank: true },
      });

      // 8. Catat log pengajuan
      await tx.pengajuanKPRLog.create({
        data: {
          pengajuan_id: newPengajuan.id,
          status_sebelum: null,
          status_sesudah: "DIAJUKAN",
          actor_id: adminId,
          catatan:
            catatan?.trim() ||
            `Pengajuan KPR #${nextNomor} diajukan ke ${bank.nama}`,
        },
      });

      const actor = await tx.user.findUnique({
        where: { id: adminId },
        select: { nama: true },
      });

      // 9. Pindahkan transaksi ke PROSES_BANK
      if (trx.tahap_detail === "PENGUMPULAN_DOKUMEN") {
        await tx.transaksi.update({
          where: { id: transaksiId },
          data: {
            tahap_detail: "PROSES_BANK",
            tahap_since: new Date(),
            version: { increment: 1 },
          },
        });

        await tx.transaksiTahapLog.create({
          data: {
            transaksi_id: transaksiId,
            actor_id: adminId,
            detail_sebelum: trx.tahap_detail,
            detail_sesudah: "PROSES_BANK",
            catatan: `Tahap transaksi beralih ke Proses Bank seiring pengajuan KPR #${nextNomor} ke ${bank.nama}`,
          },
        });

        await logActivity(tx, {
          entityType: "TRANSAKSI",
          entityId: transaksiId,
          action: "STAGE_ADVANCED",
          leadId: trx.itj?.lead_id || null,
          transaksiId: trx.id,
          tahapDetail: "PROSES_BANK",
          actorId: adminId,
          summaryContext: {
            actorName: actor?.nama,
            blok: trx.unit.blok,
            stageName: "Proses KPR (PROSES_BANK)",
            prevStageName: "Pengumpulan Dokumen",
          },
          before: {
            tahap_detail: "PENGUMPULAN_DOKUMEN",
          },
          after: {
            tahap_detail: "PROSES_BANK",
          },
        });
      }

      // 10. Catat aktivitas pengajuan KPR
      await logActivity(tx, {
        entityType: "PENGAJUAN_KPR",
        entityId: newPengajuan.id,
        action: "KPR_SUBMITTED",
        leadId: trx.itj?.lead_id || null,
        transaksiId: trx.id,
        tahapDetail:
          trx.tahap_detail === "PENGUMPULAN_DOKUMEN"
            ? "PROSES_BANK"
            : trx.tahap_detail,
        actorId: adminId,
        summaryContext: {
          actorName: actor?.nama,
          nomorPengajuan: nextNomor,
          bankName: bank.nama,
          blok: trx.unit.blok,
        },
        after: {
          pengajuan_id: newPengajuan.id,
          nomor_pengajuan: nextNomor,
          bank_id: bankId,
          bank_nama: bank.nama,
        },
      });

      return newPengajuan;
    });

    revalidatePath(`/admin/transaksi/${transaksiId}`);

    return {
      success: true,
      message: `Berhasil mengajukan KPR ke ${result.bank.nama} (Pengajuan #${result.nomor_pengajuan}).`,
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update status pengajuan KPR.
 *
 * Akses:
 * - ADMIN: semua transaksi.
 * - MARKETING: hanya PIC transaksi terkait.
 */
export async function updateStatusPengajuanKPR(
  input: unknown
): Promise<ServerActionResponse> {
  try {
    // 1. Validasi input
    const parsed = updateStatusPengajuanKPRSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Data status pengajuan KPR tidak valid.",
      };
    }

    const {
      pengajuanId,
      status,
      alasanPenolakan,
      catatan,
    } = parsed.data;

    // 2. Ambil data pengajuan dan transaksi
    const existing = await prisma.pengajuanKPR.findUnique({
      where: { id: pengajuanId },
      include: {
        bank: true,
        transaksi: {
          include: {
            itj: true,
            unit: true,
          },
        },
      },
    });

    if (!existing) {
      throw new Error("Data Pengajuan KPR tidak ditemukan.");
    }

    // 3. Validasi hak akses berdasarkan transaksi
    const { adminId } = await requireCanEditKpr(
      existing.transaksi.id
    );

    // 4. Proses perubahan status
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.pengajuanKPR.findUnique({
        where: { id: pengajuanId },
        include: {
          bank: true,
          transaksi: {
            include: {
              itj: true,
              unit: true,
            },
          },
        },
      });

      if (!current) {
        throw new Error("Data Pengajuan KPR tidak ditemukan.");
      }

      if (
        current.status === "DITOLAK" ||
        current.status === "DIBATALKAN"
      ) {
        throw new Error(
          "Pengajuan KPR yang sudah ditolak/dibatalkan tidak dapat diubah lagi."
        );
      }

      if (current.status === status) {
        return current;
      }

      // 5. Validasi transisi status
      const allowedNext =
        ALLOWED_KPR_STATUS_TRANSITIONS[current.status] || [];

      if (!allowedNext.includes(status)) {
        throw new Error(
          `Perubahan status pengajuan KPR dari "${current.status}" ke "${status}" tidak diizinkan. Status berikutnya yang valid: [${allowedNext.join(", ")}].`
        );
      }

      // 6. Validasi alasan penolakan
      if (
        status === "DITOLAK" &&
        (!alasanPenolakan?.trim() ||
          alasanPenolakan.trim().length < 3)
      ) {
        throw new Error(
          "Alasan penolakan bank wajib diisi (minimal 3 karakter)."
        );
      }

      // 7. Simpan log perubahan status
      await tx.pengajuanKPRLog.create({
        data: {
          pengajuan_id: current.id,
          status_sebelum: current.status,
          status_sesudah: status,
          actor_id: adminId,
          catatan:
            catatan?.trim() ||
            (status === "DITOLAK"
              ? `Ditolak oleh ${current.bank.nama}: ${alasanPenolakan?.trim() ?? "-"}`
              : `Status pengajuan KPR diubah menjadi ${status}`),
        },
      });

      // 8. Update pengajuan KPR
      const isDecision =
        status === "SP3K" ||
        status === "DITOLAK" ||
        status === "DIBATALKAN";

      const updated = await tx.pengajuanKPR.update({
        where: { id: pengajuanId },
        data: {
          status,
          alasan_penolakan:
            status === "DITOLAK"
              ? alasanPenolakan?.trim() || null
              : current.alasan_penolakan,
          tanggal_keputusan: isDecision
            ? new Date()
            : current.tanggal_keputusan,
          catatan: catatan?.trim() || current.catatan,
        },
        include: { bank: true },
      });

      // 9. Pastikan tahap transaksi berada di PROSES_BANK
      if (
        current.transaksi.tahap_detail ===
        "PENGUMPULAN_DOKUMEN"
      ) {
        await tx.transaksi.update({
          where: { id: current.transaksi.id },
          data: {
            tahap_detail: "PROSES_BANK",
            tahap_since: new Date(),
            version: { increment: 1 },
          },
        });
      }

      const actor = await tx.user.findUnique({
        where: { id: adminId },
        select: { nama: true },
      });

      // 10. Catat aktivitas
      await logActivity(tx, {
        entityType: "PENGAJUAN_KPR",
        entityId: current.id,
        action:
          status === "DITOLAK"
            ? "KPR_REJECTED"
            : "KPR_STATUS_CHANGED",
        leadId: current.transaksi.itj?.lead_id || null,
        transaksiId: current.transaksi.id,
        tahapDetail: current.transaksi.tahap_detail,
        actorId: adminId,
        summaryContext: {
          actorName: actor?.nama,
          bankName: current.bank.nama,
          nomorPengajuan: current.nomor_pengajuan,
          statusKpr: status,
          alasan: alasanPenolakan,
          blok: current.transaksi.unit?.blok,
        },
        before: {
          status: current.status,
        },
        after: {
          status,
          alasan_penolakan:
            status === "DITOLAK"
              ? alasanPenolakan?.trim() || null
              : undefined,
        },
      });

      return updated;
    });

    revalidatePath(
      `/admin/transaksi/${result.transaksi_id}`
    );

    return {
      success: true,
      message: `Status pengajuan KPR di ${result.bank.nama} berhasil diubah ke ${result.status}.`,
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Dedicated helper to mark PengajuanKPR as DITOLAK.
 *
 * Authorization tetap dilakukan melalui updateStatusPengajuanKPR.
 */
export async function tolakPengajuanKPR(
  input: unknown
): Promise<ServerActionResponse> {
  try {
    const parsed = tolakPengajuanKPRSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error:
          parsed.error.issues[0]?.message ??
          "Alasan penolakan tidak valid.",
      };
    }

    return await updateStatusPengajuanKPR({
      pengajuanId: parsed.data.pengajuanId,
      status: "DITOLAK",
      alasanPenolakan: parsed.data.alasanPenolakan,
      catatan: parsed.data.catatan,
    });
  } catch (error: unknown) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : String(error),
    };
  }
}
