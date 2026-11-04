// lib/activity/summary.ts

import { ActivityAction } from "./actions";

export interface SummaryContext {
  actorName?: string | null;
  leadName?: string | null;
  blok?: string | null;
  bankName?: string | null;
  nomorPengajuan?: number | null;
  statusKpr?: string | null;
  stageName?: string | null;
  prevStageName?: string | null;
  docLabel?: string | null;
  bastItemLabel?: string | null;
  jenisBayar?: string | null;
  noKwitansi?: string | null;
  nominal?: number | null;
  oldPicName?: string | null;
  newPicName?: string | null;
  oldTipe?: string | null;
  newTipe?: string | null;
  oldDate?: string | null;
  newDate?: string | null;
  scheduleType?: string | null;
  alasan?: string | null;
  sumber?: string | null;
  hasil?: string | null;
  cancelledCount?: number | null;
  isKavling?: boolean | null;
  customText?: string | null;
}

function formatNominal(amount: number | null | undefined): string {
  if (amount == null) return "Rp 0";
  return `Rp ${Number(amount).toLocaleString("id-ID")}`;
}

/**
 * Creates standardized Indonesian summary string for ActivityLog based on action and context.
 * Strict privacy rule: NEVER includes NIK, address, phone numbers, passwords.
 */
export function buildActivitySummary(
  action: ActivityAction,
  ctx: SummaryContext
): string {
  const actor = ctx.actorName?.trim() || "Sistem";
  const blokStr = ctx.blok ? `unit ${ctx.blok}` : "unit";

  switch (action) {
    case "LEAD_CREATED":
      return `${actor} membuat prospek lead baru "${ctx.leadName || "-"}"${
        ctx.sumber ? ` (sumber: ${ctx.sumber})` : ""
      }`;

    case "LEAD_FOLLOWUP_WHATSAPP":
      return `${actor} melakukan follow-up WhatsApp kepada "${ctx.leadName || "-"}"${
        ctx.hasil ? ` (hasil: ${ctx.hasil})` : ""
      }`;

    case "LEAD_FOLLOWUP_TELEPON":
      return `${actor} menelepon prospek lead "${ctx.leadName || "-"}"${
        ctx.hasil ? ` (hasil: ${ctx.hasil})` : ""
      }`;

    case "LEAD_FOLLOWUP_BERTEMU":
      return `${actor} melakukan pertemuan tatap muka dengan "${ctx.leadName || "-"}"${
        ctx.hasil ? ` (hasil: ${ctx.hasil})` : ""
      }`;

    case "LEAD_FOLLOWUP_LAINNYA":
      return `${actor} mencatat interaksi follow-up untuk "${ctx.leadName || "-"}"${
        ctx.hasil ? ` (hasil: ${ctx.hasil})` : ""
      }`;

    case "LEAD_HANDOVER":
      return `${actor} mengalihkan PIC lead "${ctx.leadName || "-"}" dari ${
        ctx.oldPicName || "-"
      } ke ${ctx.newPicName || "-"}`;

    case "LEAD_SURVEY_SCHEDULED":
      return `${actor} menjadwalkan survei lokasi untuk "${ctx.leadName || "-"}"${
        ctx.newDate ? ` pada ${ctx.newDate}` : ""
      }`;

    case "LEAD_SURVEY_COMPLETED":
      return `${actor} menyelesaikan survei lokasi untuk "${ctx.leadName || "-"}"`;

    case "LEAD_LOST":
      return `${actor} menandai prospek lead "${ctx.leadName || "-"}" sebagai Lost${
        ctx.alasan ? ` (alasan: ${ctx.alasan})` : ""
      }`;

    case "ITJ_SUBMITTED":
      return `${actor} mengajukan ITJ untuk ${blokStr} sebesar ${formatNominal(
        ctx.nominal
      )}`;

    case "STAGE_ADVANCED":
      return `${actor} memajukan tahap transaksi ${blokStr} ke ${
        ctx.stageName || "tahap berikutnya"
      }`;

    case "STAGE_REVERTED":
      return `${actor} mengembalikan tahap transaksi ${blokStr} ke ${
        ctx.stageName || "tahap sebelumnya"
      }${ctx.alasan ? ` (alasan: ${ctx.alasan})` : ""}`;

    case "TRANSAKSI_CANCELLED":
      return `${actor} membatalkan transaksi ${blokStr}${
        ctx.alasan ? ` (alasan: ${ctx.alasan})` : ""
      }`;

    case "TRANSAKSI_HANDOVER":
      return `${actor} mengalihkan PIC transaksi ${blokStr} dari ${
        ctx.oldPicName || "-"
      } ke ${ctx.newPicName || "-"}`;

    case "SCHEDULE_UPDATED":
      if (ctx.oldDate && ctx.newDate) {
        return `${actor} mengubah ${ctx.scheduleType || "jadwal"} ${blokStr} dari ${
          ctx.oldDate
        } ke ${ctx.newDate}`;
      }
      return `${actor} memperbarui ${ctx.scheduleType || "jadwal"} ${blokStr}${
        ctx.newDate ? ` menjadi ${ctx.newDate}` : ""
      }`;

    case "AKAD_CONFIRMED":
      return `${actor} mengonfirmasi pelaksanaan Akad untuk ${blokStr}`;

    case "BAST_CONFIRMED":
      if (ctx.isKavling) {
        return `${actor} mengonfirmasi Serah Terima Lahan (BAST) ${blokStr}: verifikasi fisik batas kavling`;
      }
      return `${actor} mengonfirmasi Serah Terima Bangunan (BAST) untuk ${blokStr}`;

    case "PROFILE_UPDATED":
      return `${actor} memperbarui data profil pemberkasan konsumen ${blokStr}`;

    case "DOC_CHECKED":
      return `${actor} menandai dokumen ${ctx.docLabel || "pemberkasan"} lengkap untuk ${blokStr}`;

    case "DOC_UNCHECKED":
      return `${actor} menandai dokumen ${
        ctx.docLabel || "pemberkasan"
      } belum lengkap untuk ${blokStr}`;

    case "BAST_ITEM_CHECKED":
      return `${actor} menandai item BAST "${ctx.bastItemLabel || "-"}" lengkap untuk ${blokStr}`;

    case "BAST_ITEM_UNCHECKED":
      return `${actor} menandai item BAST "${
        ctx.bastItemLabel || "-"
      }" belum lengkap untuk ${blokStr}`;

    case "PAYMENT_RECORDED":
      return `${actor} mencatat pembayaran ${ctx.jenisBayar || ""} sebesar ${formatNominal(
        ctx.nominal
      )}${ctx.noKwitansi ? ` (Kwitansi: ${ctx.noKwitansi})` : ""}`;

    case "PAYMENT_VOIDED":
      return `${actor} membatalkan (void) pembayaran ${ctx.jenisBayar || ""}${
        ctx.noKwitansi ? ` Kwitansi ${ctx.noKwitansi}` : ""
      }${ctx.alasan ? ` (alasan: ${ctx.alasan})` : ""}`;

    case "KPR_SUBMITTED":
      return `${actor} mengajukan KPR${
        ctx.nomorPengajuan ? ` #${ctx.nomorPengajuan}` : ""
      } ke ${ctx.bankName || "Bank"} untuk ${blokStr}`;

    case "KPR_STATUS_CHANGED":
      return `${actor} mengubah status KPR ${ctx.bankName || "Bank"}${
        ctx.nomorPengajuan ? ` #${ctx.nomorPengajuan}` : ""
      } menjadi ${ctx.statusKpr || "-"}`;

    case "KPR_REJECTED":
      return `${actor} mencatat penolakan KPR ${ctx.bankName || "Bank"}${
        ctx.nomorPengajuan ? ` #${ctx.nomorPengajuan}` : ""
      }${ctx.alasan ? ` (alasan: ${ctx.alasan})` : ""}`;

    case "KPR_BANK_SELECTED":
      const count = ctx.cancelledCount ?? 0;
      return `${ctx.bankName || "Bank"} dipilih sebagai bank pembiaya${
        count > 0 ? `; ${count} pengajuan lain dibatalkan` : ""
      }`;

    case "UNIT_TYPE_CHANGED":
      return `${actor} mengubah tipe ${blokStr} dari ${ctx.oldTipe || "-"} ke ${
        ctx.newTipe || "-"
      }${ctx.alasan ? ` (alasan: ${ctx.alasan})` : ""}`;

    default:
      return ctx.customText || `${actor} melakukan aksi ${action} pada ${blokStr}`;
  }
}

