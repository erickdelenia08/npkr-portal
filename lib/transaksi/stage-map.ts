// lib/transaksi/stage-map.ts

import type { TahapDetail, TahapTransaksi, MetodeBayar } from "@/generated/prisma";

export interface StageOption {
  detail: TahapDetail;
  macro: TahapTransaksi;
  label: string;
}

/**
 * Single Source of Truth (SSOT): Canonical detail -> macro mapping.
 */
export function getMacroTahap(detail: TahapDetail): TahapTransaksi {
  switch (detail) {
    case "PENGUMPULAN_DOKUMEN":
    case "PEMBERKASAN_LEGALITAS":
    case "PEMBERKASAN_PPJB":
      return "PEMBERKASAN";
    case "WAWANCARA":
    case "OTS":
    case "VERIFIKASI":
    case "SP3K":
      return "PROSES_BANK";
    case "MENUNGGU_PELUNASAN":
    case "PEMBAYARAN_DP":
    case "CICILAN_BERJALAN":
    case "PELUNASAN":
      return "PEMBAYARAN";
    case "AKAD_KREDIT":
    case "AJB":
      return "AKAD_AJB";
    case "BAST":
      return "SERAH_TERIMA";
    case "BATAL":
      return "BATAL";
    default:
      return "SERAH_TERIMA";
  }
}

/**
 * Returns allowed micro stages for each payment method in sequential workflow.
 */
export function getAllowedDetailsForMetode(metode: MetodeBayar): TahapDetail[] {
  switch (metode) {
    case "KPR":
      return [
        "PENGUMPULAN_DOKUMEN",
        "WAWANCARA",
        "OTS",
        "VERIFIKASI",
        "SP3K",
        "AKAD_KREDIT",
        // "PEMBANGUNAN",
        "BAST",
        "BATAL",
      ];
    case "CASH_KERAS":
      return [
        "PEMBERKASAN_LEGALITAS",
        "MENUNGGU_PELUNASAN",
        "PELUNASAN",
        "AJB",
        // "PEMBANGUNAN",
        "BAST",
        "BATAL",
      ];
    case "CASH_TEMPO":
      return [
        "PEMBERKASAN_PPJB",
        "PEMBAYARAN_DP",
        "CICILAN_BERJALAN",
        "PELUNASAN",
        "AJB",
        "BAST",
        "BATAL",
      ];
    default:
      return [
        "PENGUMPULAN_DOKUMEN",
        "WAWANCARA",
        "OTS",
        "VERIFIKASI",
        "SP3K",
        "AKAD_KREDIT",
        // "PEMBANGUNAN",
        "BAST",
        "BATAL",
      ];
  }
}

/**
 * Macro stages Indonesian labels and display order.
 */
export const MACRO_STAGES: { key: TahapTransaksi; label: string }[] = [
  { key: "PEMBERKASAN", label: "Pemberkasan" },
  { key: "PROSES_BANK", label: "Proses Bank" },
  { key: "PEMBAYARAN", label: "Pembayaran" },
  { key: "AKAD_AJB", label: "Akad / AJB" },
  { key: "SERAH_TERIMA", label: "Serah Terima" },
  { key: "BATAL", label: "Batal" },
];

/**
 * Dynamic Action Panel Stage Options per Payment Method.
 */
export const STAGES_KPR: StageOption[] = [
  { detail: "PENGUMPULAN_DOKUMEN", macro: "PEMBERKASAN", label: "Pengumpulan dokumen" },
  { detail: "WAWANCARA", macro: "PROSES_BANK", label: "Wawancara bank" },
  { detail: "OTS", macro: "PROSES_BANK", label: "OTS" },
  { detail: "VERIFIKASI", macro: "PROSES_BANK", label: "Verifikasi bank" },
  { detail: "SP3K", macro: "PROSES_BANK", label: "Penerbitan SP3K" },
  { detail: "AKAD_KREDIT", macro: "AKAD_AJB", label: "Akad kredit" },
  { detail: "BAST", macro: "SERAH_TERIMA", label: "Serah terima (BAST)" },
  { detail: "BATAL", macro: "BATAL", label: "Pembatalan transaksi" },
];

export const STAGES_CASH_KERAS: StageOption[] = [
  { detail: "PEMBERKASAN_LEGALITAS", macro: "PEMBERKASAN", label: "Pemberkasan legalitas" },
  { detail: "MENUNGGU_PELUNASAN", macro: "PEMBAYARAN", label: "Menunggu pelunasan" },
  { detail: "PELUNASAN", macro: "PEMBAYARAN", label: "Pelunasan" },
  { detail: "AJB", macro: "AKAD_AJB", label: "Akta jual beli (AJB)" },
  { detail: "BAST", macro: "SERAH_TERIMA", label: "Serah terima (BAST)" },
  { detail: "BATAL", macro: "BATAL", label: "Pembatalan transaksi" },
];

export const STAGES_CASH_TEMPO: StageOption[] = [
  { detail: "PEMBERKASAN_PPJB", macro: "PEMBERKASAN", label: "Pemberkasan PPJB" },
  { detail: "PEMBAYARAN_DP", macro: "PEMBAYARAN", label: "Pembayaran DP" },
  { detail: "CICILAN_BERJALAN", macro: "PEMBAYARAN", label: "Cicilan berjalan" },
  { detail: "PELUNASAN", macro: "PEMBAYARAN", label: "Pelunasan" },
  { detail: "AJB", macro: "AKAD_AJB", label: "Akta jual beli (AJB)" },
  { detail: "BAST", macro: "SERAH_TERIMA", label: "Serah terima (BAST)" },
  { detail: "BATAL", macro: "BATAL", label: "Pembatalan transaksi" },
];

export function getStagesByMetode(metode: MetodeBayar): StageOption[] {
  switch (metode) {
    case "KPR":
      return STAGES_KPR;
    case "CASH_KERAS":
      return STAGES_CASH_KERAS;
    case "CASH_TEMPO":
      return STAGES_CASH_TEMPO;
    default:
      return STAGES_KPR;
  }
}

/**
 * Returns fallback micro stage for a macro status when navigating/recovering.
 */
export function getFallbackStage(
  stages: StageOption[],
  currentStatus: string,
  metode: MetodeBayar
): { stage: StageOption; isUnknown: boolean } {
  const exactDetail = stages.find((stage) => stage.detail === currentStatus);
  if (exactDetail) return { stage: exactDetail, isUnknown: false };

  const preferredDetail: Partial<Record<TahapTransaksi, TahapDetail>> = {
    PEMBERKASAN:
      metode === "KPR"
        ? "PENGUMPULAN_DOKUMEN"
        : metode === "CASH_KERAS"
          ? "PEMBERKASAN_LEGALITAS"
          : "PEMBERKASAN_PPJB",
    PROSES_BANK: "WAWANCARA",
    PEMBAYARAN:
      metode === "CASH_KERAS" ? "MENUNGGU_PELUNASAN" : "PEMBAYARAN_DP",
    AKAD_AJB: metode === "KPR" ? "AKAD_KREDIT" : "AJB",
    PEMBANGUNAN: "BAST",
    SERAH_TERIMA: "BAST",
    BATAL: "BATAL",
  };

  const preferred = preferredDetail[currentStatus as TahapTransaksi];
  if (preferred) {
    const found = stages.find((stage) => stage.detail === preferred);
    if (found) return { stage: found, isUnknown: false };
  }

  return { stage: stages[0], isUnknown: true };
}

/**
 * Single Source of Truth for determining if a transaction has closed sales.
 * Closing = closing_at is not null AND status_transaksi is NOT BATAL.
 */
export function isTransaksiClosing(trx: {
  closing_at?: Date | string | null;
  status_transaksi?: string | null;
}): boolean {
  return trx.closing_at != null && trx.status_transaksi !== "BATAL";
}
