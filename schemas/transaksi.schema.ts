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
  "FORM_APLIKASI_KPR",
  "FORM_FPPA",
  "PAS_FOTO",
  "FOTO_TEMPAT_USAHA",
  "DENAH_LOKASI_USAHA",
  "FOTO_LOKASI_KERJA",
  "DENAH_LOKASI_KERJA",
  "BUKU_TABUNGAN_BTN",
  "REKENING_KORAN_USAHA_6BLN",
  "SPT_TAHUNAN",
  "SURAT_PENAWARAN_RUMAH",
  "SURAT_LUNAS_UANG_MUKA",
  "BROSUR_SITEPLAN",
  "SERTIFIKAT_IMB",
]);

export const StatusDokumenEnum = z.enum([
  "BELUM_LENGKAP",
  "LENGKAP",
]);

export const verifyDokumenSchema = z.object({
  transaksiId: z.number().int().positive("ID Transaksi tidak valid"),
  jenis: JenisDokumenEnum,
  status: StatusDokumenEnum.optional(),
  verified: z.boolean().optional(),
  catatan: z.string().trim().optional().nullable(),
  diterimaAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal diterima harus YYYY-MM-DD")
    .optional()
    .nullable(),
});

export type VerifyDokumenInput = z.infer<typeof verifyDokumenSchema>;

export const TahapDetailEnum = z.enum([
  "PENGUMPULAN_DOKUMEN",
  "PROSES_BANK",
  // KPR
  "AKAD_KREDIT",
  // Cash Keras
  "PEMBERKASAN_LEGALITAS",
  "MENUNGGU_PELUNASAN",
  // Cash Tempo
  "PEMBERKASAN_PPJB",
  "PEMBAYARAN_DP",
  "CICILAN_BERJALAN",
  "PELUNASAN",
  // Bersama
  "AJB",
  "BAST",
  "BATAL",
]);

export const TahapTransaksiEnum = z.enum([
  "PEMBERKASAN",
  "PROSES_BANK",
  "PEMBAYARAN",
  "AKAD_AJB",
  "SERAH_TERIMA",
  "BATAL",
]);

export const updateTransactionStatusSchema = z.object({
  transaksiId: z.number().int().positive("ID Transaksi tidak valid"),
  leadId: z.number().int().positive("ID Lead tidak valid"),
  tahapDetail: TahapDetailEnum,
  fromDetail: TahapDetailEnum.optional(),
  version: z.number().int().nonnegative().optional(),
  status: z.string().trim().optional(),
  namaNotaris: z.string().trim().optional().nullable(),
  tglAkad: z.string().trim().optional().nullable(),
  tglAjb: z.string().trim().optional().nullable(),
  tglBast: z.string().trim().optional().nullable(),
  lunasAt: z.string().trim().optional().nullable(),
  rencanaAkadAt: z.string().trim().optional().nullable(),
  rencanaBastAt: z.string().trim().optional().nullable(),
  pengajuanTerpilihId: z.number().int().positive().optional().nullable(),
  catatanAdmin: z.string().trim().optional().nullable(),
  documents: z.array(z.string()).optional().nullable(),
  lahanConfirmed: z.boolean().optional().nullable(),
});

export type UpdateTransactionStatusInput = z.infer<
  typeof updateTransactionStatusSchema
>;

export const simpanJadwalTransaksiSchema = z.object({
  transaksiId: z.number().int().positive("ID Transaksi tidak valid"),
  version: z.number().int().nonnegative("Versi transaksi tidak valid"),
  namaNotaris: z.string().trim().optional().nullable(),
  rencanaAkadAt: z.string().trim().optional().nullable(),
  rencanaBastAt: z.string().trim().optional().nullable(),
});

export type SimpanJadwalTransaksiInput = z.infer<
  typeof simpanJadwalTransaksiSchema
>;
