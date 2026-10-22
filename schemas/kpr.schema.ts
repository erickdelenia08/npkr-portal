import { z } from "zod";

export const StatusPengajuanKPREnum = z.enum([
  "DIAJUKAN",
  "WAWANCARA",
  "OTS",
  "VERIFIKASI",
  "SP3K",
  "DISETUJUI",
  "DITOLAK",
  "DIBATALKAN",
]);

export type StatusPengajuanKPRType = z.infer<typeof StatusPengajuanKPREnum>;

export const ALLOWED_KPR_STATUS_TRANSITIONS: Record<
  StatusPengajuanKPRType,
  StatusPengajuanKPRType[]
> = {
  DIAJUKAN: ["WAWANCARA", "DITOLAK", "DIBATALKAN"],
  WAWANCARA: ["OTS", "VERIFIKASI", "DITOLAK", "DIBATALKAN"],
  OTS: ["VERIFIKASI", "SP3K", "DITOLAK", "DIBATALKAN"],
  VERIFIKASI: ["SP3K", "DISETUJUI", "DITOLAK", "DIBATALKAN"],
  SP3K: ["DISETUJUI", "DITOLAK", "DIBATALKAN"],
  DISETUJUI: ["DIBATALKAN"],
  DITOLAK: [],
  DIBATALKAN: [],
};

export const ajukanKPRSchema = z.object({
  transaksiId: z.number().int().positive("ID Transaksi tidak valid"),
  bankId: z.number().int().positive("Pilih bank penyalur KPR"),
  catatan: z.string().trim().optional().nullable(),
});

export type AjukanKPRInput = z.infer<typeof ajukanKPRSchema>;

export const updateStatusPengajuanKPRSchema = z.object({
  pengajuanId: z.number().int().positive("ID Pengajuan KPR tidak valid"),
  status: StatusPengajuanKPREnum,
  alasanPenolakan: z.string().trim().optional().nullable(),
  catatan: z.string().trim().optional().nullable(),
});

export type UpdateStatusPengajuanKPRInput = z.infer<
  typeof updateStatusPengajuanKPRSchema
>;

export const tolakPengajuanKPRSchema = z.object({
  pengajuanId: z.number().int().positive("ID Pengajuan KPR tidak valid"),
  alasanPenolakan: z
    .string()
    .trim()
    .min(3, "Alasan penolakan bank wajib diisi (minimal 3 karakter)"),
  catatan: z.string().trim().optional().nullable(),
});

export type TolakPengajuanKPRInput = z.infer<typeof tolakPengajuanKPRSchema>;
