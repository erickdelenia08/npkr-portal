import { z } from "zod";

/**
 * Validation schema for updating customer identity (Buku Induk Customer)
 */
export const updateCustomerIdentitySchema = z.object({
  nama_ktp: z.string().trim().min(2, "Nama sesuai KTP minimal 2 karakter"),
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "NIK harus terdiri tepat 16 digit angka"),
  tempat_lahir: z.string().trim().min(2, "Tempat lahir minimal 2 karakter"),
  tgl_lahir: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal lahir harus YYYY-MM-DD"),
  alamat_ktp: z.string().trim().min(5, "Alamat KTP minimal 5 karakter"),
  no_hp: z
    .string()
    .trim()
    .min(8, "Nomor HP minimal 8 karakter")
    .max(20, "Nomor HP maksimal 20 karakter"),
});

export type UpdateCustomerIdentityInput = z.infer<typeof updateCustomerIdentitySchema>;
