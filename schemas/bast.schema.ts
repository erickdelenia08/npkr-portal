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

export const StatusBASTEnum = z.enum([
  "BELUM_LENGKAP",
  "LENGKAP",
]);

export const updateChecklistBASTSchema = z.object({
  transaksiId: z.number().int().positive("ID Transaksi tidak valid"),
  item: ItemBASTEnum,
  status: StatusBASTEnum,
});

export type UpdateChecklistBASTInput = z.infer<typeof updateChecklistBASTSchema>;

// Backwards compatibility aliases
export const StatusInspeksiEnum = StatusBASTEnum;
export const updateInspeksiBASTSchema = z.object({
  transaksiId: z.number().int().positive("ID Transaksi tidak valid"),
  itemId: z.union([ItemBASTEnum, z.number().int().positive()]),
  newStatus: z.union([StatusBASTEnum, z.string()]),
  note: z.string().trim().optional().nullable(),
});
export type UpdateInspeksiBASTInput = z.infer<typeof updateInspeksiBASTSchema>;
