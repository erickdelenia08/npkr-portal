import { z } from "zod";

export const ItemBASTEnum = z.enum([
  "PONDASI_STRUKTUR",
  "DINDING_PLESTER_CAT",
  "ATAP_PLAFON",
  "LANTAI_KERAMIK",
  "KUSEN_PINTU_JENDELA",
  "KELISTRIKAN",
  "SANITASI_AIR_POMPA",
  "FASAD_KEBERSIHAN",
]);

export const StatusInspeksiEnum = z.enum([
  "BELUM_DICEK",
  "SESUAI",
  "PERLU_PERBAIKAN",
  "SELESAI_DIPERBAIKI",
]);

export const updateInspeksiBASTSchema = z
  .object({
    transaksiId: z.number().int().positive("ID Transaksi tidak valid"),
    itemId: z.union([ItemBASTEnum, z.number().int().positive()]),
    newStatus: StatusInspeksiEnum,
    note: z.string().trim().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.newStatus === "PERLU_PERBAIKAN") {
        return typeof data.note === "string" && data.note.trim().length >= 3;
      }
      return true;
    },
    {
      message: "Catatan perbaikan wajib diisi minimal 3 karakter.",
      path: ["note"],
    }
  );

export type UpdateInspeksiBASTInput = z.infer<typeof updateInspeksiBASTSchema>;
