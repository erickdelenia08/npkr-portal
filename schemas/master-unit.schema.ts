import { z } from "zod";

export const KategoriUnitEnum = z.enum(["SUBSIDI", "KOMERSIL", "KAVLING"]);
export type KategoriUnitType = z.infer<typeof KategoriUnitEnum>;

export const StatusUnitEnum = z.enum(["AVAILABLE", "HOLD", "SOLD"]);
export type StatusUnitType = z.infer<typeof StatusUnitEnum>;

/**
 * Validation schema for creating / updating Master Tipe
 */
export const masterTipeSchema = z
  .object({
    id: z.number().optional(),
    nama_tipe: z.string().min(2, "Nama tipe minimal 2 karakter"),
    kategori: KategoriUnitEnum,
    luas_bangunan: z.number().min(0, "Luas bangunan tidak boleh negatif").nullable().optional(),
    luas_tanah: z.number().min(1, "Luas tanah harus lebih dari 0"),
    harga_dasar: z.number().min(1000000, "Harga dasar minimal Rp 1.000.000"),
  })
  .refine(
    (data) => {
      // If kategori is KAVLING, luas_bangunan can be 0 or null
      if (data.kategori === "KAVLING") {
        return true;
      }
      // For SUBSIDI & KOMERSIL, luas_bangunan must be > 0
      return (data.luas_bangunan ?? 0) > 0;
    },
    {
      message: "Luas bangunan wajib diisi untuk kategori SUBSIDI dan KOMERSIL",
      path: ["luas_bangunan"],
    }
  );

export type MasterTipeInput = z.infer<typeof masterTipeSchema>;

/**
 * Validation schema for creating a single Master Unit
 */
export const singleUnitSchema = z.object({
  id: z.number().optional(),
  blok: z.string().trim().min(1, "Nama blok unit wajib diisi"),
  tipe_id: z.number().min(1, "Pilih tipe unit"),
  status_unit: StatusUnitEnum,
  harga_khusus: z.number().min(0, "Harga khusus minimal Rp 0").nullable().optional(),
});

export type SingleUnitInput = z.infer<typeof singleUnitSchema>;

/**
 * Validation schema for bulk creating Master Units
 */
export const bulkUnitSchema = z
  .object({
    prefix_blok: z
      .string()
      .trim()
      .min(1, "Prefix blok wajib diisi (misal: 'F-')"),
    nomor_mulai: z
      .number()
      .int("Nomor mulai harus berupa bilangan bulat")
      .min(1, "Nomor mulai minimal 1"),
    nomor_akhir: z
      .number()
      .int("Nomor akhir harus berupa bilangan bulat")
      .min(1, "Nomor akhir minimal 1"),
    tipe_id: z.number().min(1, "Pilih tipe unit"),
    harga_khusus: z.number().min(0).nullable().optional(),
  })
  .refine((data) => data.nomor_akhir >= data.nomor_mulai, {
    message: "Nomor akhir harus lebih besar atau sama dengan nomor mulai",
    path: ["nomor_akhir"],
  })
  .refine((data) => data.nomor_akhir - data.nomor_mulai <= 200, {
    message: "Maksimal pembuatan sekaligus adalah 200 unit",
    path: ["nomor_akhir"],
  });

export type BulkUnitInput = z.infer<typeof bulkUnitSchema>;
