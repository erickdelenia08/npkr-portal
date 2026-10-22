"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { activitySchema, ActivityInput } from "@/schemas/activity.schema";
import { getLeadTahap, LeadTahap } from "@/lib/lead-utils";
import { JenisAktivitas, HasilAktivitas, StatusItj, Prisma } from "@/generated/prisma";

export interface SerializedAktivitas {
  id: number;
  lead_id: number;
  jenis: JenisAktivitas;
  hasil: HasilAktivitas;
  catatan: string | null;
  tgl_follow_up: Date | null;
  created_at: Date;
}

export interface SerializedItjSummary {
  id: number;
  status: StatusItj;
  nominal: number;
  target_dp: number;
  metode_bayar: string;
  tenor: number | null;
  diajukan_at: Date;
  diputuskan_at: Date | null;
  unit: {
    blok: string;
  } | null;
  latestReview: {
    keputusan: StatusItj;
    catatan: string | null;
    created_at: Date;
  } | null;
}

export interface SerializedLeadDetail {
  id: number;
  nama: string;
  no_hp: string;
  sumber: string;
  minat_tipe: string | null;
  tahap: LeadTahap;
  survei_jadwal_at: Date | null;
  survei_selesai_at: Date | null;
  closing_at?: Date | null;
  lost_at: Date | null;
  lost_reason: string | null;
  marketing_id: number | null;
  created_at: Date;
  updated_at: Date;
  marketing: {
    id: number;
    nama: string;
    no_hp: string;
  } | null;
  aktivitas: SerializedAktivitas[];
  itj?: SerializedItjSummary | null;
}

export interface CreateActivityResponse {
  success: boolean;
  message: string;
  error?: string;
  data?: SerializedAktivitas;
}

/**
 * Server Action: Retrieve full details, timeline, and latest ITJ status of a single Lead.
 */
export async function getLeadDetail(
  id: number
): Promise<{ success: boolean; data?: SerializedLeadDetail; error?: string }> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        marketing: {
          select: {
            id: true,
            nama: true,
            no_hp: true,
          },
        },
        aktivitas: {
          orderBy: { created_at: "desc" },
        },
        itj: {
          include: {
            unit: {
              select: { blok: true },
            },
            reviews: {
              orderBy: { created_at: "desc" },
              take: 1,
            },
          },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    });

    if (!lead) {
      return { success: false, error: "Lead tidak ditemukan" };
    }

    const computedTahap = getLeadTahap(lead);

    let itjSummary: SerializedItjSummary | null = null;
    if (lead.itj && lead.itj.length > 0) {
      const latest = lead.itj[0];
      itjSummary = {
        id: latest.id,
        status: latest.status,
        nominal: Number(latest.nominal),
        target_dp: Number(latest.target_dp),
        metode_bayar: latest.metode_bayar,
        tenor: latest.tenor,
        diajukan_at: latest.diajukan_at,
        diputuskan_at: latest.diputuskan_at,
        unit: latest.unit ? { blok: latest.unit.blok } : null,
        latestReview:
          latest.reviews && latest.reviews.length > 0
            ? {
                keputusan: latest.reviews[0].keputusan,
                catatan: latest.reviews[0].catatan,
                created_at: latest.reviews[0].created_at,
              }
            : null,
      };
    }

    return {
      success: true,
      data: {
        ...lead,
        tahap: computedTahap,
        itj: itjSummary,
      },
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memuat detail lead";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Create a follow-up activity entry.
 * Per Phase 3 rule: Does NOT alter lead milestones, only records activity.
 */
export async function createActivity(
  input: ActivityInput
): Promise<CreateActivityResponse> {
  try {
    const parsed = activitySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Validasi gagal",
      };
    }

    const session = await auth();
    const userId = Number(session?.user?.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return {
        success: false,
        message: "Silakan login kembali",
      };
    }

    const { lead_id, jenis, hasil, catatan, tgl_follow_up } = parsed.data;

    // Check if parent lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: lead_id },
      select: { id: true },
    });

    if (!lead) {
      return {
        success: false,
        message: "Data prospek lead tidak ditemukan",
      };
    }

    const now = new Date();
    const followUpDate = new Date(tgl_follow_up);

    if (isNaN(followUpDate.getTime())) {
      return {
        success: false,
        message: "Format tanggal follow-up tidak valid",
      };
    }

    // Maintain last_activity_at and next_follow_up_at on Lead atomically
    const [createdActivity] = await prisma.$transaction([
      prisma.aktivitas.create({
        data: {
          lead_id,
          user_id: userId,
          jenis,
          hasil,
          catatan: catatan || null,
          tgl_follow_up: followUpDate,
          created_at: now,
        },
      }),
      prisma.lead.update({
        where: { id: lead_id },
        data: {
          last_activity_at: now,
          next_follow_up_at: followUpDate,
          updated_at: now,
        },
      }),
    ]);

    // Revalidate paths
    revalidatePath(`/marketing/lead/${lead_id}`);
    revalidatePath("/marketing/lead");
    revalidatePath("/marketing/dashboard");
    revalidatePath("/admin/lead");
    revalidatePath("/manager/lead");

    return {
      success: true,
      message: "Aktivitas follow-up berhasil dicatat",
      data: createdActivity,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menyimpan aktivitas";
    return {
      success: false,
      message: msg,
      error: msg,
    };
  }
}
