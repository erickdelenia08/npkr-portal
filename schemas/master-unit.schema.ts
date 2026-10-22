import { z } from "zod";

export const KategoriUnitEnum = z.enum(["SUBSIDI", "KOMERSIL", "KAVLING"]);
export type KategoriUnitType = z.infer<typeof KategoriUnitEnum>;

export const StatusUnitEnum = z.enum(["AVAILABLE", "HOLD", "BOOKED", "SOLD"]);
export type StatusUnitType = z.infer<typeof StatusUnitEnum>;

/**
 * Validation schema for creating / updating Master Tipe.
 * Note: nama_tipe is ALWAYS derived on server and previewed in UI via buildNamaTipe().
 */
export const masterTipeSchema = z
  .object({
    id: z.number().optional(),
    kategori: KategoriUnitEnum,
    luas_bangunan: z.number().min(0, "Luas bangunan tidak boleh negatif"),
    luas_tanah: z.number().min(1, "Luas tanah harus lebih dari 0"),
    harga_dasar: z.number().min(1000000, "Harga dasar minimal Rp 1.000.000"),
  })
  .refine(
    (data) => {
      // If kategori is KAVLING, luas_bangunan can be 0
      if (data.kategori === "KAVLING") {
        return true;
      }
      // For SUBSIDI & KOMERSIL, luas_bangunan must be > 0
      return (data.luas_bangunan ?? 0) > 0;
    },
    {
      message: "Luas bangunan wajib diisi lebih dari 0 untuk kategori SUBSIDI dan KOMERSIL",
      path: ["luas_bangunan"],
    }
  );

export type MasterTipeInput = z.infer<typeof masterTipeSchema>;

/**
 * Validation schema for creating a single Master Unit (Siteplan setup)
 * Status is always AVAILABLE on creation.
 */
export const singleUnitSchema = z.object({
  id: z.number().optional(),
  blok: z.string().trim().min(1, "Nama blok unit wajib diisi"),
  tipe_id: z.number().min(1, "Pilih tipe unit"),
  harga_khusus: z.number().min(0, "Harga khusus minimal Rp 0").nullable().optional(),
});

export type SingleUnitInput = z.infer<typeof singleUnitSchema>;

/**
 * Validation schema for bulk creating Master Units (Siteplan setup)
 */
export const bulkUnitSchema = z
  .object({
    prefix_blok: z
      .string()
      .trim()
      .min(1, "Prefix blok wajib diisi (misal: 'A')")
      .max(4, "Prefix blok maksimal 4 karakter")
      .regex(/^[A-Za-z0-9-]+$/, "Prefix blok hanya boleh huruf atau angka"),
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

/**
 * Validation schema for changing unit tipe (single unit)
 */
export const changeTipeSchema = z.object({
  newTipeId: z.number().min(1, "Pilih tipe baru"),
  alasan: z.string().trim().min(5, "Alasan perubahan minimal 5 karakter"),
  resetHargaKhusus: z.boolean(),
});

export type ChangeTipeInput = z.infer<typeof changeTipeSchema>;

/**
 * Validation schema for bulk changing unit tipe
 */
export const changeTipeBulkSchema = z.object({
  unitIds: z.array(z.number().int()).min(1, "Pilih minimal satu unit"),
  newTipeId: z.number().min(1, "Pilih tipe baru"),
  alasan: z.string().trim().min(5, "Alasan perubahan minimal 5 karakter"),
});

export type ChangeTipeBulkInput = z.infer<typeof changeTipeBulkSchema>;

/**
 * Validation schema for adjusting unit harga khusus
 */
export const updateHargaKhususSchema = z.object({
  unitId: z.number().min(1),
  harga_khusus: z.number().min(0).nullable().optional(),
});

export type UpdateHargaKhususInput = z.infer<typeof updateHargaKhususSchema>;
