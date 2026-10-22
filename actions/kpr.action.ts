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
import type { StatusPengajuanKPR, TahapDetail } from "@/generated/prisma";
import { getRequiredDocuments } from "@/lib/transaksi/document-rules";

export interface ServerActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * Helper to ensure user is authenticated as PIC marketing or active ADMIN
 */
async function requireCanEditKpr(transaksiId?: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Silakan login kembali.");
  }

  const userId = Number(session.user.id);
  const role = session.user.role;

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("Sesi pengguna tidak valid.");
  }

  // Verify actor exists and is active in database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw new Error("Pengguna tidak aktif atau tidak ditemukan.");
  }

  if (transaksiId) {
    const trx = await prisma.transaksi.findUnique({
      where: { id: transaksiId },
      select: { id: true, marketing_id: true },
    });
    if (!trx) {
      throw new Error("Transaksi tidak ditemukan.");
    }
    const canEdit = userId === trx.marketing_id || role === "ADMIN";
    if (!canEdit) {
      throw new Error(
        "Hanya PIC Marketing atau Admin yang dapat memperbarui pengajuan KPR transaksi ini."
      );
    }
  } else if (role !== "ADMIN") {
    throw new Error("Hanya PIC Marketing atau Admin yang berwenang.");
  }

  return { session, adminId: userId, userId, user };
}

const requireActiveAdmin = requireCanEditKpr;

/**
 * Fetch master bank list with auto-seed fallback
 */
export async function getBankMasterList(): Promise<
  ServerActionResponse<
    Array<{ id: number; nama: string; kode: string | null; is_active: boolean }>
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
          { nama: "Bank BSI (Bank Syariah Indonesia)", kode: "BSI" },
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
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Ajukan KPR baru ke Bank (creates PengajuanKPR record + log)
 * Rule: Only ONE PengajuanKPR can be active/approved at a time.
 */
export async function ajukanKPR(
  input: unknown
): Promise<ServerActionResponse> {
  try {
    const { adminId } = await requireActiveAdmin();

    const parsed = ajukanKPRSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Data pengajuan KPR tidak valid.",
      };
    }

    const { transaksiId, bankId, catatan } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify transaction
      const trx = await tx.transaksi.findUnique({
        where: { id: transaksiId },
        include: {
          customer: true,
          unit: {
            include: { tipe: true },
          },
          dokumen: true,
        },
      });

      if (!trx) {
        throw new Error("Transaksi tidak ditemukan.");
      }

      if (trx.metode_bayar !== "KPR") {
        throw new Error("Pengajuan KPR hanya berlaku untuk metode pembayaran KPR.");
      }

      if (trx.status_transaksi === "BATAL" || trx.tahap_detail === "BAST") {
        throw new Error("Transaksi sudah selesai atau telah dibatalkan.");
      }

      // Enforce document gate when advancing from PENGUMPULAN_DOKUMEN
      if (trx.tahap_detail === "PENGUMPULAN_DOKUMEN") {
        const docEvaluation = getRequiredDocuments({
          metode: trx.metode_bayar,
          kategori: trx.unit.tipe.kategori,
          statusPernikahan: trx.customer.status_pernikahan,
          statusPekerjaan: trx.customer.status_pekerjaan,
        });

        if (!docEvaluation.isProfileComplete) {
          throw new Error(`Pengajuan KPR belum dapat dilakukan: ${docEvaluation.message}`);
        }

        const verifiedDocKeys = new Set(
          trx.dokumen
            .filter((d) => d.status === "TERVERIFIKASI")
            .map((d) => d.jenis)
        );

        const requiredDocs = docEvaluation.documents.filter((d) => d.required);
        const missingRequiredDocs = requiredDocs.filter((doc) => {
          if (doc.key === "KTP_PEMOHON") {
            return !verifiedDocKeys.has("KTP_PEMOHON") && !verifiedDocKeys.has("KTP_SUAMI_ISTRI");
          }
          return !verifiedDocKeys.has(doc.key);
        });

        if (missingRequiredDocs.length > 0) {
          const missingLabels = missingRequiredDocs.map((d) => d.label).join(", ");
          throw new Error(
            `Pengajuan KPR belum dapat dilakukan: Dokumen pemberkasan wajib [${missingLabels}] belum lengkap/terverifikasi.`
          );
        }
      }

      // 2. Check invariant: Only ONE active PengajuanKPR allowed
      const activePengajuan = await tx.pengajuanKPR.findFirst({
        where: {
          transaksi_id: transaksiId,
          status: {
            notIn: ["DITOLAK", "DIBATALKAN"],
          },
        },
        include: { bank: true },
      });

      if (activePengajuan) {
        throw new Error(
          `Masih ada pengajuan KPR aktif di ${activePengajuan.bank.nama} (Status: ${activePengajuan.status}). ` +
          `Tandai Ditolak atau Batalkan pengajuan tersebut sebelum mengajukan ke Bank lain.`
        );
      }

      // 3. Verify bank
      const bank = await tx.bank.findUnique({
        where: { id: bankId },
      });

      if (!bank || !bank.is_active) {
        throw new Error("Bank yang dipilih tidak aktif atau tidak ditemukan.");
      }

      // 4. Calculate next nomor_pengajuan
      const lastPengajuan = await tx.pengajuanKPR.findFirst({
        where: { transaksi_id: transaksiId },
        orderBy: { nomor_pengajuan: "desc" },
        select: { nomor_pengajuan: true },
      });

      const nextNomor = (lastPengajuan?.nomor_pengajuan ?? 0) + 1;

      // 5. Create PengajuanKPR
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

      // 6. Create Log in PengajuanKPRLog
      await tx.pengajuanKPRLog.create({
        data: {
          pengajuan_id: newPengajuan.id,
          status_sebelum: null,
          status_sesudah: "DIAJUKAN",
          admin_id: adminId,
          catatan: catatan?.trim() || `Pengajuan KPR #${nextNomor} diajukan ke ${bank.nama}`,
        },
      });

      // 7. Update Transaksi deprecated nama_bank for backwards compatibility
      // and advance tahap to WAWANCARA (PROSES_BANK) if it was in PENGUMPULAN_DOKUMEN
      const nextDetail: TahapDetail =
        trx.tahap_detail === "PENGUMPULAN_DOKUMEN" ? "WAWANCARA" : trx.tahap_detail;
      const nextMacro =
        trx.status_transaksi === "PEMBERKASAN" ? "PROSES_BANK" : trx.status_transaksi;

      await tx.transaksi.update({
        where: { id: transaksiId },
        data: {
          status_transaksi: nextMacro,
          tahap_detail: nextDetail,
        },
      });

      if (trx.tahap_detail !== nextDetail) {
        await tx.transaksiTahapLog.create({
          data: {
            transaksi_id: transaksiId,
            tahap_sebelum: trx.status_transaksi,
            tahap_sesudah: nextMacro,
            detail_sebelum: trx.tahap_detail,
            detail_sesudah: nextDetail,
            admin_id: adminId,
            catatan: `Tahap dimajukan ke ${nextDetail} seiring pengajuan KPR #${nextNomor} ke ${bank.nama}`,
          },
        });
      }

      return newPengajuan;
    });

    revalidatePath(`/admin/transaksi/${transaksiId}`);
    return {
      success: true,
      message: `Berhasil mengajukan KPR ke ${result.bank.nama} (Pengajuan #${result.nomor_pengajuan}).`,
      data: result,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Update Status Pengajuan KPR (e.g. WAWANCARA, OTS, VERIFIKASI, SP3K, DISETUJUI, DITOLAK, DIBATALKAN)
 * Creates PengajuanKPRLog and syncs Transaksi TahapDetail.
 */
export async function updateStatusPengajuanKPR(
  input: unknown
): Promise<ServerActionResponse> {
  try {
    const { adminId } = await requireActiveAdmin();

    const parsed = updateStatusPengajuanKPRSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Data status pengajuan KPR tidak valid.",
      };
    }

    const { pengajuanId, status, alasanPenolakan, catatan } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current pengajuan
      const existing = await tx.pengajuanKPR.findUnique({
        where: { id: pengajuanId },
        include: {
          bank: true,
          transaksi: true,
        },
      });

      if (!existing) {
        throw new Error("Data Pengajuan KPR tidak ditemukan.");
      }

      if (existing.status === "DITOLAK" || existing.status === "DIBATALKAN") {
        throw new Error("Pengajuan KPR yang sudah ditolak/dibatalkan tidak dapat diubah lagi.");
      }

      if (existing.status === status) {
        return existing;
      }

      // Enforce valid status transition lifecycle: DIAJUKAN -> WAWANCARA -> OTS -> VERIFIKASI -> SP3K -> DISETUJUI
      const allowedNext = ALLOWED_KPR_STATUS_TRANSITIONS[existing.status] || [];
      if (!allowedNext.includes(status)) {
        throw new Error(
          `Perubahan status pengajuan KPR dari "${existing.status}" ke "${status}" tidak diizinkan. Status berikutnya yang valid: [${allowedNext.join(
            ", "
          )}].`
        );
      }

      if (status === "DITOLAK" && (!alasanPenolakan?.trim() || alasanPenolakan.trim().length < 3)) {
        throw new Error("Alasan penolakan bank wajib diisi (minimal 3 karakter).");
      }

      // 2. Insert PengajuanKPRLog
      await tx.pengajuanKPRLog.create({
        data: {
          pengajuan_id: existing.id,
          status_sebelum: existing.status,
          status_sesudah: status,
          admin_id: adminId,
          catatan:
            catatan?.trim() ||
            (status === "DITOLAK"
              ? `Ditolak oleh ${existing.bank.nama}: ${alasanPenolakan?.trim() ?? "-"}`
              : `Status pengajuan KPR diubah menjadi ${status}`),
        },
      });

      // 3. Update PengajuanKPR
      const isDecision = status === "SP3K" || status === "DISETUJUI" || status === "DITOLAK" || status === "DIBATALKAN";

      const updated = await tx.pengajuanKPR.update({
        where: { id: pengajuanId },
        data: {
          status,
          alasan_penolakan: status === "DITOLAK" ? alasanPenolakan?.trim() || null : existing.alasan_penolakan,
          tanggal_keputusan: isDecision ? new Date() : existing.tanggal_keputusan,
          catatan: catatan?.trim() || existing.catatan,
        },
        include: { bank: true },
      });

      // 4. Sync Transaksi TahapDetail
      // NOTE: Bank rejection or cancellation does NOT automatically regress the main transaction stage.
      // The rejection remains recorded in history, and the admin can either create a new bank application
      // or explicitly choose to regress the transaction stage in DynamicActionPanel.
      if (status !== "DITOLAK" && status !== "DIBATALKAN") {
        const trx = existing.transaksi;
        let mappedDetail: TahapDetail | null = null;
        if (status === "WAWANCARA") mappedDetail = "WAWANCARA";
        else if (status === "OTS") mappedDetail = "OTS";
        else if (status === "VERIFIKASI") mappedDetail = "VERIFIKASI";
        else if (status === "SP3K" || status === "DISETUJUI") mappedDetail = "SP3K";

        if (
          mappedDetail &&
          mappedDetail !== trx.tahap_detail &&
          trx.tahap_detail !== "AKAD_KREDIT" &&
          trx.tahap_detail !== "BAST" &&
          trx.status_transaksi !== "BATAL"
        ) {
          await tx.transaksi.update({
            where: { id: trx.id },
            data: {
              status_transaksi: "PROSES_BANK",
              tahap_detail: mappedDetail,
            },
          });

          await tx.transaksiTahapLog.create({
            data: {
              transaksi_id: trx.id,
              tahap_sebelum: trx.status_transaksi,
              tahap_sesudah: "PROSES_BANK",
              detail_sebelum: trx.tahap_detail,
              detail_sesudah: mappedDetail,
              admin_id: adminId,
              catatan: `Tahap diselaraskan ke ${mappedDetail} mengikuti progres KPR di ${existing.bank.nama} (${status})`,
            },
          });
        }
      }

      return updated;
    });

    revalidatePath(`/admin/transaksi/${result.transaksi_id}`);
    return {
      success: true,
      message: `Status pengajuan KPR di ${result.bank.nama} berhasil diubah ke ${result.status}.`,
      data: result,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Dedicated helper to mark a PengajuanKPR as DITOLAK
 */
export async function tolakPengajuanKPR(
  input: unknown
): Promise<ServerActionResponse> {
  try {
    const parsed = tolakPengajuanKPRSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Alasan penolakan tidak valid.",
      };
    }

    return await updateStatusPengajuanKPR({
      pengajuanId: parsed.data.pengajuanId,
      status: "DITOLAK",
      alasanPenolakan: parsed.data.alasanPenolakan,
      catatan: parsed.data.catatan,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
