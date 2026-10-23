import { z } from "zod";
import { JenisAktivitas, HasilAktivitas } from "@/generated/prisma";

export const JenisAktivitasEnum = z.enum([
  "TELEPON",
  "WHATSAPP",
  "BERTEMU",
  "LAINNYA",
]);

export const HasilAktivitasEnum = z.enum([
  "TERTARIK",
  "MASIH_MIKIR",
  "TIDAK_DIJAWAB",
  "MINTA_INFO_LAGI",
  "TIDAK_JADI",
]);

export const activitySchema = z.object({
  lead_id: z.number().int().min(1, "ID Lead tidak valid"),
  jenis: JenisAktivitasEnum,
  hasil: HasilAktivitasEnum,
  catatan: z.string().trim().optional().nullable(),
  tgl_follow_up: z
    .string()
    .min(1, "Tanggal follow-up berikutnya wajib diisi"),
});

export type ActivityInput = z.infer<typeof activitySchema>;

export const globalActivityFilterSchema = z.object({
  userId: z.coerce.number().int().positive().optional().nullable(),
  jenis: JenisAktivitasEnum.optional().nullable(),
  startDate: z.string().trim().optional().nullable(),
  endDate: z.string().trim().optional().nullable(),
});

export type GlobalActivityFilterInput = z.infer<typeof globalActivityFilterSchema>;

