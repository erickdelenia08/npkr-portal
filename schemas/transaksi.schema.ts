import { z } from "zod";

export const createPembayaranSchema = z.object({
  transaksiId: z.number().int().positive("ID Transaksi tidak valid"),
  jenisBayar: z.enum(["ITJ", "DP", "CICILAN", "PELUNASAN"]),
  nominal: z.coerce
    .number()
    .positive("Nominal pembayaran harus lebih besar dari 0"),
  catatan: z.string().trim().optional(),
});

export type CreatePembayaranInput = z.infer<typeof createPembayaranSchema>;

export const updateTransactionStatusSchema = z.object({
  transaksiId: z.number().int().positive("ID Transaksi tidak valid"),
  leadId: z.number().int().positive("ID Lead tidak valid"),
  status: z.string().trim().min(1, "Status transaksi wajib dipilih"),
  namaBank: z.string().trim().optional().nullable(),
  namaNotaris: z.string().trim().optional().nullable(),
  tglAkad: z.string().trim().optional().nullable(),
  tglBast: z.string().trim().optional().nullable(),
  catatanAdmin: z.string().trim().optional().nullable(),
  berkas: z.array(z.string()).optional().nullable(),
  bast: z.array(z.string()).optional().nullable(),
});

export type UpdateTransactionStatusInput = z.infer<
  typeof updateTransactionStatusSchema
>;
