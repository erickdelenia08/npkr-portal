import { z } from "zod";

export const JenisBayarEnum = z.enum(["ITJ", "DP", "CICILAN", "PELUNASAN"]);

export const createPembayaranSchema = z.object({
  transaksiId: z.number().int().positive("ID Transaksi tidak valid"),
  jenisBayar: JenisBayarEnum,
  nominal: z.coerce
    .number()
    .positive("Nominal pembayaran harus lebih besar dari 0"),
  catatan: z.string().trim().optional(),
});

export type CreatePembayaranInput = z.infer<typeof createPembayaranSchema>;

export const voidPembayaranSchema = z.object({
  pembayaranId: z.number().int().positive("ID Pembayaran tidak valid"),
  voidReason: z
    .string()
    .trim()
    .min(3, "Alasan pembatalan/void pembayaran wajib diisi (minimal 3 karakter)"),
});

export type VoidPembayaranInput = z.infer<typeof voidPembayaranSchema>;

export const StatusPernikahanEnum = z.enum([
  "MENIKAH",
  "BELUM_MENIKAH",
  "CERAI",
]);
export type StatusPernikahanType = z.infer<typeof StatusPernikahanEnum>;

export const StatusPekerjaanEnum = z.enum(["TETAP", "TIDAK_TETAP"]);
export type StatusPekerjaanType = z.infer<typeof StatusPekerjaanEnum>;

export const updateProfilPemberkasanSchema = z.object({
  transaksiId: z.number().int().positive("ID Transaksi tidak valid"),
  statusPernikahan: StatusPernikahanEnum.optional().nullable(),
  statusPekerjaan: StatusPekerjaanEnum.optional().nullable(),
});
export type UpdateProfilPemberkasanInput = z.infer<
  typeof updateProfilPemberkasanSchema
>;

export const JenisDokumenEnum = z.enum([
  "KTP_SUAMI_ISTRI",
  "KTP_PEMOHON",
  "KTP_PASANGAN",
  "KARTU_KELUARGA",
  "NPWP",
  "BUKU_NIKAH",
  "SURAT_PERNYATAAN_BELUM_MENIKAH",
  "AKTA_CERAI",
  "SLIP_GAJI",
  "SURAT_KET_KERJA",
  "REKENING_KORAN",
  "SURAT_KET_BELUM_PUNYA_RUMAH",
  "SKU_WIRAUSAHA",
  "LAPORAN_KEUANGAN",
  "LEGALITAS_LAINNYA",
]);

export const StatusDokumenEnum = z.enum([
  "BELUM_DIUNGGAH",
  "MENUNGGU_VERIFIKASI",
  "PERLU_REVISI",
  "TERVERIFIKASI",
]);

export const verifyDokumenSchema = z.object({
  transaksiId: z.number().int().positive("ID Transaksi tidak valid"),
  jenis: JenisDokumenEnum,
  status: StatusDokumenEnum.optional(),
  verified: z.boolean().optional(),
  catatan: z.string().trim().optional().nullable(),
});

export type VerifyDokumenInput = z.infer<typeof verifyDokumenSchema>;

export const TahapDetailEnum = z.enum([
  "PENGUMPULAN_DOKUMEN",
  "WAWANCARA",
  "OTS",
  "VERIFIKASI",
  "SP3K",
  "AKAD_KREDIT",
  "PEMBERKASAN_LEGALITAS",
  "MENUNGGU_PELUNASAN",
  "PEMBERKASAN_PPJB",
  "PEMBAYARAN_DP",
  "CICILAN_BERJALAN",
  "PELUNASAN",
  "AJB",
  "BAST",
  "BATAL",
]);

export const TahapTransaksiEnum = z.enum([
  "PEMBERKASAN",
  "PROSES_BANK",
  "PEMBAYARAN",
  "AKAD_AJB",
  "PEMBANGUNAN",
  "SERAH_TERIMA",
  "BATAL",
]);

export const updateTransactionStatusSchema = z.object({
  transaksiId: z.number().int().positive("ID Transaksi tidak valid"),
  leadId: z.number().int().positive("ID Lead tidak valid"),
  tahapDetail: TahapDetailEnum,
  status: z.string().trim().optional(),
  namaBank: z.string().trim().optional().nullable(),
  namaNotaris: z.string().trim().optional().nullable(),
  tglAkad: z.string().trim().optional().nullable(),
  tglAjb: z.string().trim().optional().nullable(),
  tglBast: z.string().trim().optional().nullable(),
  lunasAt: z.string().trim().optional().nullable(),
  catatanAdmin: z.string().trim().optional().nullable(),
  documents: z.array(z.string()).optional().nullable(),
  lahanConfirmed: z.boolean().optional().nullable(),
});

export type UpdateTransactionStatusInput = z.infer<
  typeof updateTransactionStatusSchema
>;
