import { z } from "zod";
import { getLeadTahap, LeadTahap, LeadMilestoneFields } from "@/lib/lead-utils";

export { getLeadTahap };
export type { LeadTahap, LeadMilestoneFields };

export const LeadTahapEnum = z.enum([
  "LEAD MASUK",
  "SURVEI DIJADWALKAN",
  "SUDAH SURVEI",
  "CLOSING",
  "LOST",
  "Lead Masuk",
  "Survei Dijadwalkan",
  "Sudah Survei",
  "Closing",
  "Lost",
]);

export const leadSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter"),
  no_hp: z
    .string()
    .trim()
    .min(9, "Nomor HP minimal 9 digit")
    .max(16, "Nomor HP maksimal 16 digit")
    .regex(/^[0-9+\s-]+$/, "Format nomor HP tidak valid (hanya angka, +, dan spasi)"),
  sumber: z.string().trim().min(1, "Sumber prospek wajib dipilih"),
  minat_tipe: z.string().trim().optional().nullable(),
  marketing_id: z.number().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  catatan: z.string().trim().optional().nullable(),
  next_follow_up: z.union([z.string(), z.date()]).optional().nullable(),
  tgl_follow_up: z.union([z.string(), z.date()]).optional().nullable(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const reassignLeadSchema = z.object({
  lead_id: z.number().int().min(1, "ID Lead tidak valid"),
  new_marketing_id: z.number().int().min(1, "Pilih marketing tujuan yang valid"),
});

export type ReassignLeadInput = z.infer<typeof reassignLeadSchema>;

export interface LeadFilter {
  marketing_id?: number | null;
  tahap?: LeadTahap | string;
  sumber?: string;
  follow_up?: "terlambat" | "hari_ini" | "mendatang" | "belum_dijadwal" | string;
  search?: string;
  unassigned_only?: boolean;
  page?: number;
  limit?: number;
}
