import { z } from "zod";
import { JenisAktivitas, HasilAktivitas } from "@/generated/prisma";

export const JenisAktivitasEnum = z.enum([
  "TELEPON",
  "WHATSAPP",
  "BERTEMU",
  "SURVEI_LOKASI",
  "UPDATE_ADMIN",
  "SISTEM",
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
