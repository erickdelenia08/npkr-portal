// lib/transaksi/stage-map.ts

import type { TahapDetail, MetodeBayar, KategoriUnit } from "@/generated/prisma";

export type TahapMakro =
  | "PEMBERKASAN"
  | "PROSES_BANK"
  | "PEMBAYARAN"
  | "AKAD_AJB"
  | "SERAH_TERIMA"
  | "BATAL";

export interface StageOption {
  detail: TahapDetail;
  macro: TahapMakro;
  label: string;
}

/**
 * Determines the initial TahapDetail upon transaction creation based on payment method and unit category.
 * - KPR: PENGUMPULAN_DOKUMEN
 * - CASH_KERAS: PEMBERKASAN_LEGALITAS
 * - CASH_TEMPO: PEMBERKASAN_PPJB
 */
export function getInitialTahapDetail(
  metode: MetodeBayar,
  _kategori?: KategoriUnit | string | null
): TahapDetail {
  switch (metode) {
    case "KPR":
      return "PENGUMPULAN_DOKUMEN";
    case "CASH_KERAS":
      return "PEMBERKASAN_LEGALITAS";
    case "CASH_TEMPO":
      return "PEMBERKASAN_PPJB";
    default:
      return "PENGUMPULAN_DOKUMEN";
  }
}

/**
 * Single Source of Truth (SSOT): Canonical detail -> macro mapping.
 */
export const MAKRO_OF: Record<TahapDetail, TahapMakro> = {
  PENGUMPULAN_DOKUMEN: "PEMBERKASAN",
  PROSES_BANK: "PROSES_BANK",
  AKAD_KREDIT: "AKAD_AJB",
  PEMBERKASAN_LEGALITAS: "PEMBERKASAN",
  MENUNGGU_PELUNASAN: "PEMBAYARAN",
  PEMBERKASAN_PPJB: "PEMBERKASAN",
  PEMBAYARAN_DP: "PEMBAYARAN",
  CICILAN_BERJALAN: "PEMBAYARAN",
  PELUNASAN: "PEMBAYARAN",
  AJB: "AKAD_AJB",
  BAST: "SERAH_TERIMA",
  BATAL: "BATAL",
};

/**
 * Returns all detail stages that map to a given macro stage.
 */
export function detailsOf(makro: TahapMakro): TahapDetail[] {
  return (Object.keys(MAKRO_OF) as TahapDetail[]).filter((k) => MAKRO_OF[k] === makro);
}

/**
 * Single Source of Truth (SSOT): Canonical detail -> macro getter.
 */
export function getMacroTahap(detail: TahapDetail): TahapMakro {
  return MAKRO_OF[detail] ?? "PEMBERKASAN";
}

/**
 * Returns allowed micro stages for each payment method in sequential workflow.
 */
export function getAllowedDetailsForMetode(metode: MetodeBayar): TahapDetail[] {
  switch (metode) {
    case "KPR":
      return [
        "PENGUMPULAN_DOKUMEN",
        "PROSES_BANK",
        "AKAD_KREDIT",
        "BAST",
        "BATAL",
      ];
    case "CASH_KERAS":
      return [
        "PEMBERKASAN_LEGALITAS",
        "MENUNGGU_PELUNASAN",
        "PELUNASAN",
        "AJB",
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
        "PROSES_BANK",
        "AKAD_KREDIT",
        "BAST",
        "BATAL",
      ];
  }
}

/**
 * Macro stages Indonesian labels and display order.
 */
export const MACRO_STAGES: { key: TahapMakro; label: string }[] = [
  { key: "PEMBERKASAN", label: "Pemberkasan" },
  { key: "PROSES_BANK", label: "Proses Bank" },
  { key: "PEMBAYARAN", label: "Pembayaran" },
  { key: "AKAD_AJB", label: "Akad" },
  { key: "SERAH_TERIMA", label: "Serah Terima" },
  { key: "BATAL", label: "Batal" },
];

/**
 * Dynamic Action Panel Stage Options per Payment Method.
 */
export const STAGES_KPR: StageOption[] = [
  { detail: "PENGUMPULAN_DOKUMEN", macro: "PEMBERKASAN", label: "Pengumpulan dokumen" },
  { detail: "PROSES_BANK", macro: "PROSES_BANK", label: "Proses bank" },
  { detail: "AKAD_KREDIT", macro: "AKAD_AJB", label: "Akad kredit" },
  { detail: "BAST", macro: "SERAH_TERIMA", label: "Serah terima (BAST)" },
  { detail: "BATAL", macro: "BATAL", label: "Pembatalan transaksi" },
];

export const STAGES_CASH_KERAS: StageOption[] = [
  { detail: "PEMBERKASAN_LEGALITAS", macro: "PEMBERKASAN", label: "Pemberkasan legalitas" },
  { detail: "MENUNGGU_PELUNASAN", macro: "PEMBAYARAN", label: "Menunggu pelunasan" },
  { detail: "PELUNASAN", macro: "PEMBAYARAN", label: "Pelunasan" },
  { detail: "AJB", macro: "AKAD_AJB", label: "Akad" },
  { detail: "BAST", macro: "SERAH_TERIMA", label: "Serah terima (BAST)" },
  { detail: "BATAL", macro: "BATAL", label: "Pembatalan transaksi" },
];

export const STAGES_CASH_TEMPO: StageOption[] = [
  { detail: "PEMBERKASAN_PPJB", macro: "PEMBERKASAN", label: "Pemberkasan PPJB" },
  { detail: "PEMBAYARAN_DP", macro: "PEMBAYARAN", label: "Pembayaran DP" },
  { detail: "CICILAN_BERJALAN", macro: "PEMBAYARAN", label: "Cicilan berjalan" },
  { detail: "PELUNASAN", macro: "PEMBAYARAN", label: "Pelunasan" },
  { detail: "AJB", macro: "AKAD_AJB", label: "Akad" },
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
 * Returns stage option matching current detail.
 */
export function getFallbackStage(
  stages: StageOption[],
  currentStatus: string,
  _metode?: MetodeBayar
): { stage: StageOption; isUnknown: boolean } {
  const exactDetail = stages.find((stage) => stage.detail === currentStatus);
  if (exactDetail) return { stage: exactDetail, isUnknown: false };

  return { stage: stages[0], isUnknown: true };
}

/**
 * Single Source of Truth for determining if a transaction has closed sales.
 * Closing = closing_at is not null AND transaction is NOT BATAL.
 */
export function isTransaksiClosing(trx: {
  closing_at?: Date | string | null;
  tahap_detail?: TahapDetail | string | null;
  status_transaksi?: string | null;
}): boolean {
  if (!trx.closing_at) return false;
  if (trx.tahap_detail) return trx.tahap_detail !== "BATAL";
  return trx.status_transaksi !== "BATAL";
}

export const MACRO_STAGE_LABELS: Record<TahapMakro, string> = {
  PEMBERKASAN: "Pemberkasan",
  PROSES_BANK: "Proses KPR",
  PEMBAYARAN: "Pembayaran",
  AKAD_AJB: "Akad",
  SERAH_TERIMA: "Serah Terima (BAST)",
  BATAL: "Dibatalkan",
};
