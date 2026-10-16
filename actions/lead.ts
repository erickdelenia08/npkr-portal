"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { leadSchema, LeadInput, LeadFilter } from "@/schemas/lead.schema";
import {
  getLeadTahap,
  LeadTahap,
  FollowUpInfo,
  getFollowUpInfo,
  sortLeadsByDefaultPriority,
} from "@/lib/lead-utils";
import { Prisma } from "@/generated/prisma";

export interface CreateLeadResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    id: number;
    nama: string;
    no_hp: string;
    sumber: string;
    minat_tipe: string | null;
    tahap: LeadTahap;
    survei_jadwal_at: Date | null;
    survei_selesai_at: Date | null;
    closing_at: Date | null;
    lost_at: Date | null;
    lost_reason: string | null;
    marketing_id: number | null;
    created_at: Date;
  };
}

export interface LeadCardData {
  id: number;
  nama: string;
  no_hp: string;
  sumber: string;
  minat_tipe: string | null;
  tahap: LeadTahap;
  survei_jadwal_at: Date | null;
  survei_selesai_at: Date | null;
  closing_at: Date | null;
  lost_at: Date | null;
  lost_reason: string | null;
  marketing_id: number | null;
  created_at: Date;
  tgl_follow_up: Date | null;
  tgl_aktivitas_terakhir?: Date | null;
  jenis_aktivitas_terakhir?: string | null;
  catatan_terakhir?: string | null;
  marketing: {
    id: number;
    nama: string;
    no_hp: string;
  } | null;
  followUpInfo: FollowUpInfo;
}

export interface GetLeadsResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    leads: LeadCardData[];
    total: number;
  };
}

/**
 * Clean & normalize phone number string (remove spaces, hyphens)
 */
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[\s-]/g, "").trim();
}

/**
 * Server Action: Create a new Lead with mandatory duplicate check for no_hp.
 * Accepts Name, WA (no_hp), Sumber, Notes (optional), Next Follow-up (optional).
 */
export async function createLead(input: LeadInput): Promise<CreateLeadResponse> {
  try {
    const session = await auth();

    // Validate payload with Zod
    const parsed = leadSchema.safeParse(input);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Data input tidak valid";
      return {
        success: false,
        error: errorMsg,
      };
    }

    const {
      nama,
      no_hp,
      sumber,
      minat_tipe,
      notes,
      catatan,
      next_follow_up,
      tgl_follow_up,
    } = parsed.data;
    const cleanNoHp = normalizePhoneNumber(no_hp);

    // CRITICAL VALIDATION: Duplicate check for no_hp in Lead table
    const existingLead = await prisma.lead.findUnique({
      where: { no_hp: cleanNoHp },
      select: { id: true, nama: true, no_hp: true },
    });

    if (existingLead) {
      return {
        success: false,
        error: "Nomor HP sudah terdaftar!",
      };
    }

    // Determine assigned marketing_id
    let assignedMarketingId: number | null = parsed.data.marketing_id ? Number(parsed.data.marketing_id) : null;

    // If logged-in user is MARKETING and no marketing_id specified, auto-assign to self
    if (!assignedMarketingId && session?.user) {
      const sessionRole = session.user.role;
      const sessionUserId = Number(session.user.id);
      if (sessionRole === "MARKETING" && !isNaN(sessionUserId)) {
        assignedMarketingId = sessionUserId;
      }
    }

    // Handle initial note and follow-up date
    const effectiveNotes = (notes || catatan || "").trim();
    const rawFollowUp = next_follow_up || tgl_follow_up || null;
    const parsedFollowUpDate = rawFollowUp ? new Date(rawFollowUp) : null;
    const isValidFollowUp = parsedFollowUpDate && !isNaN(parsedFollowUpDate.getTime());
    const hasInitialActivity = Boolean(effectiveNotes || isValidFollowUp);

    const newLead = await prisma.lead.create({
      data: {
        nama,
        no_hp: cleanNoHp,
        sumber,
        minat_tipe: minat_tipe || null,
        marketing_id: assignedMarketingId,
        survei_jadwal_at: null,
        survei_selesai_at: null,
        closing_at: null,
        lost_at: null,
        lost_reason: null,
        ...(hasInitialActivity && {
          aktivitas: {
            create: {
              jenis: "WHATSAPP",
              hasil: "TERTARIK",
              catatan: effectiveNotes || null,
              tgl_follow_up: isValidFollowUp ? parsedFollowUpDate : null,
            },
          },
        }),
      },
    });

    // Revalidate relevant routes
    revalidatePath("/marketing/lead");
    revalidatePath("/marketing/dashboard");
    revalidatePath("/admin/lead");
    revalidatePath("/manager/lead");

    const dynamicTahap = getLeadTahap(newLead);

    return {
      success: true,
      message: `Lead '${newLead.nama}' berhasil ditambahkan`,
      data: {
        id: newLead.id,
        nama: newLead.nama,
        no_hp: newLead.no_hp,
        sumber: newLead.sumber,
        minat_tipe: newLead.minat_tipe,
        tahap: dynamicTahap,
        survei_jadwal_at: newLead.survei_jadwal_at,
        survei_selesai_at: newLead.survei_selesai_at,
        closing_at: newLead.closing_at,
        lost_at: newLead.lost_at,
        lost_reason: newLead.lost_reason,
        marketing_id: newLead.marketing_id,
        created_at: newLead.created_at,
      },
    };
  } catch (error: unknown) {
    // Catch database-level unique constraint violation (P2002) as fallback
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "Nomor HP sudah terdaftar!",
      };
    }

    const errorMsg = error instanceof Error ? error.message : "Gagal menambahkan lead baru";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Server Action: Retrieve list of leads with optional filters
 * (marketing_id, status/tahap milestone, search query)
 */
export async function getLeads(filters: LeadFilter = {}): Promise<GetLeadsResponse> {
  try {
    const where: Prisma.LeadWhereInput = {};

    // Filter by marketing_id or unassigned_only
    if (filters.unassigned_only) {
      where.marketing_id = null;
    } else if (filters.marketing_id !== undefined && filters.marketing_id !== null) {
      where.marketing_id = Number(filters.marketing_id);
    }

    // Filter by status / milestone tahap
    const tahapFilter = filters.tahap;
    if (tahapFilter && typeof tahapFilter === "string" && tahapFilter !== "ALL") {
      switch (tahapFilter) {
        case "Lost":
        case "LOST":
          where.lost_at = { not: null };
          break;
        case "Closing":
        case "ITJ":
          where.closing_at = { not: null };
          where.lost_at = null;
          break;
        case "Sudah Survei":
        case "SUDAH_SURVEI":
          where.survei_selesai_at = { not: null };
          where.closing_at = null;
          where.lost_at = null;
          break;
        case "Survei Dijadwalkan":
        case "SURVEI_DIJADWALKAN":
          where.survei_jadwal_at = { not: null };
          where.survei_selesai_at = null;
          where.closing_at = null;
          where.lost_at = null;
          break;
        case "Lead Masuk":
        case "BARU":
        case "FOLLOW_UP":
        case "TERTUNDA":
          where.survei_jadwal_at = null;
          where.survei_selesai_at = null;
          where.closing_at = null;
          where.lost_at = null;
          break;
      }
    }

    // Filter by sumber
    if (filters.sumber && typeof filters.sumber === "string" && filters.sumber !== "ALL") {
      where.sumber = filters.sumber;
    }

    // Search by nama or no_hp
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { nama: { contains: q } },
        { no_hp: { contains: q } },
      ];
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(100, filters.limit || 50));
    const skip = (page - 1) * limit;

    const [total, rawLeads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        include: {
          marketing: {
            select: {
              id: true,
              nama: true,
              no_hp: true,
            },
          },
          aktivitas: {
            select: {
              tgl_follow_up: true,
              catatan: true,
              jenis: true,
              hasil: true,
              created_at: true,
            },
            orderBy: { created_at: "desc" },
            take: 1,
          },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
    ]);

    let leads: LeadCardData[] = rawLeads.map((l) => {
      const followUp = l.aktivitas[0]?.tgl_follow_up || null;
      return {
        id: l.id,
        nama: l.nama,
        no_hp: l.no_hp,
        sumber: l.sumber,
        minat_tipe: l.minat_tipe,
        tahap: getLeadTahap(l),
        survei_jadwal_at: l.survei_jadwal_at,
        survei_selesai_at: l.survei_selesai_at,
        closing_at: l.closing_at,
        lost_at: l.lost_at,
        lost_reason: l.lost_reason,
        marketing_id: l.marketing_id,
        created_at: l.created_at,
        tgl_follow_up: followUp,
        tgl_aktivitas_terakhir: l.aktivitas[0]?.created_at || null,
        jenis_aktivitas_terakhir: l.aktivitas[0]?.jenis || null,
        catatan_terakhir: l.aktivitas[0]?.catatan || null,
        marketing: l.marketing,
        followUpInfo: getFollowUpInfo(followUp),
      };
    });

    // Optional filter by follow_up status
    if (filters.follow_up && typeof filters.follow_up === "string" && filters.follow_up !== "ALL") {
      const fuFilter = filters.follow_up.toLowerCase();
      leads = leads.filter((item) => {
        if (fuFilter === "terlambat") return item.followUpInfo.status === "TERLAMBAT";
        if (fuFilter === "hari_ini") return item.followUpInfo.status === "HARI_INI";
        if (fuFilter === "mendatang") {
          return item.followUpInfo.status === "MENDATANG" || item.followUpInfo.status === "HARI_INI";
        }
        if (fuFilter === "belum_dijadwal" || fuFilter === "belum_dijadwalkan") {
          return item.followUpInfo.status === "BELUM_DIJADWAL";
        }
        return true;
      });
    }

    // Default sorting: Overdue first -> upcoming -> unscheduled -> Closing/Lost at bottom
    leads = sortLeadsByDefaultPriority(leads);

    return {
      success: true,
      message: "Data lead berhasil dimuat",
      data: {
        leads,
        total,
      },
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memuat data lead";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Server Action: Update milestone dates for a Lead
 */
export async function updateLeadMilestone(
  leadId: number,
  milestones: {
    survei_jadwal_at?: Date | null;
    survei_selesai_at?: Date | null;
    closing_at?: Date | null;
    lost_at?: Date | null;
    lost_reason?: string | null;
  }
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        ...(milestones.survei_jadwal_at !== undefined && {
          survei_jadwal_at: milestones.survei_jadwal_at,
        }),
        ...(milestones.survei_selesai_at !== undefined && {
          survei_selesai_at: milestones.survei_selesai_at,
        }),
        ...(milestones.closing_at !== undefined && {
          closing_at: milestones.closing_at,
        }),
        ...(milestones.lost_at !== undefined && {
          lost_at: milestones.lost_at,
        }),
        ...(milestones.lost_reason !== undefined && {
          lost_reason: milestones.lost_reason,
        }),
        updated_at: new Date(),
      },
    });

    revalidatePath("/marketing/lead");
    revalidatePath("/admin/lead");
    revalidatePath("/manager/lead");
    revalidatePath(`/marketing/lead/${leadId}`);

    return {
      success: true,
      message: "Milestone lead berhasil diperbarui",
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memperbarui milestone lead";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Server Action: Quick update Tahap for a Lead by updating milestone dates
 */
export async function updateLeadTahap(
  leadId: number,
  tahap: LeadTahap | string
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const now = new Date();
    const updateData: Prisma.LeadUpdateInput = {
      updated_at: now,
    };

    switch (tahap) {
      case "Lost":
      case "LOST":
        updateData.lost_at = now;
        updateData.lost_reason = "Diubah ke status Lost";
        break;
      case "Closing":
      case "ITJ":
        updateData.closing_at = now;
        updateData.lost_at = null;
        updateData.lost_reason = null;
        break;
      case "Sudah Survei":
      case "SUDAH_SURVEI":
        updateData.survei_selesai_at = now;
        updateData.closing_at = null;
        updateData.lost_at = null;
        updateData.lost_reason = null;
        break;
      case "Survei Dijadwalkan":
      case "SURVEI_DIJADWALKAN":
        updateData.survei_jadwal_at = now;
        updateData.survei_selesai_at = null;
        updateData.closing_at = null;
        updateData.lost_at = null;
        updateData.lost_reason = null;
        break;
      case "Lead Masuk":
      case "BARU":
      case "FOLLOW_UP":
      default:
        updateData.survei_jadwal_at = null;
        updateData.survei_selesai_at = null;
        updateData.closing_at = null;
        updateData.lost_at = null;
        updateData.lost_reason = null;
        break;
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    revalidatePath("/marketing/lead");
    revalidatePath("/admin/lead");
    revalidatePath("/manager/lead");
    revalidatePath(`/marketing/lead/${leadId}`);

    return {
      success: true,
      message: `Tahap lead berhasil diubah ke ${tahap}`,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memperbarui status lead";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Server Action: Retrieve list of Marketing team members for dropdown assignments
 */
export async function getMarketingUsers(): Promise<{ id: number; nama: string; no_hp: string }[]> {
  try {
    const users = await prisma.user.findMany({
      where: { role: "MARKETING" },
      select: {
        id: true,
        nama: true,
        no_hp: true,
      },
      orderBy: { nama: "asc" },
    });
    return users;
  } catch {
    return [];
  }
}

/**
 * Server Action: Re-assign Lead to a new Marketing User (Strict RBAC: Manager & Admin only)
 */
export async function reassignLead(
  leadId: number,
  newMarketingId: number
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const session = await auth();

    // STRICT RBAC: Only MANAGER or ADMIN can re-assign leads
    if (!session?.user) {
      return {
        success: false,
        message: "Unauthorized",
        error: "Sesi login tidak valid. Silakan login kembali.",
      };
    }

    const role = session.user.role;
    if (role !== "MANAGER" && role !== "ADMIN") {
      return {
        success: false,
        message: "Akses Ditolak",
        error: "Hanya Manager atau Admin yang memiliki otorisasi untuk memindahkan prospek lead.",
      };
    }

    const parsedLeadId = Number(leadId);
    const parsedMarketingId = Number(newMarketingId);

    if (isNaN(parsedLeadId) || parsedLeadId <= 0) {
      return {
        success: false,
        message: "ID Lead tidak valid",
        error: "ID Lead tidak valid",
      };
    }

    if (isNaN(parsedMarketingId) || parsedMarketingId <= 0) {
      return {
        success: false,
        message: "Pilih marketing tujuan yang valid",
        error: "Pilih marketing tujuan yang valid",
      };
    }

    // Verify target marketing user exists and has role MARKETING
    const targetMarketing = await prisma.user.findFirst({
      where: {
        id: parsedMarketingId,
        role: "MARKETING",
      },
      select: {
        id: true,
        nama: true,
      },
    });

    if (!targetMarketing) {
      return {
        success: false,
        message: "Marketing tujuan tidak ditemukan atau tidak aktif",
        error: "Marketing tujuan tidak valid",
      };
    }

    // Verify lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: parsedLeadId },
      select: { id: true, nama: true, marketing_id: true },
    });

    if (!lead) {
      return {
        success: false,
        message: "Data prospek lead tidak ditemukan",
        error: "Data lead tidak ditemukan",
      };
    }

    // Update lead with new marketing PIC
    const updated = await prisma.lead.update({
      where: { id: parsedLeadId },
      data: {
        marketing_id: targetMarketing.id,
        updated_at: new Date(),
      },
    });

    // Revalidate relevant pages
    revalidatePath("/manager/lead");
    revalidatePath("/admin/lead");
    revalidatePath("/marketing/lead");
    revalidatePath(`/marketing/lead/${parsedLeadId}`);

    return {
      success: true,
      message: `Lead '${updated.nama}' berhasil dialihkan ke marketing '${targetMarketing.nama}'`,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memindahkan lead";
    return {
      success: false,
      message: errorMsg,
      error: errorMsg,
    };
  }
}

/**
 * Server Action: Schedule a Survey for a Lead
 */
export async function scheduleSurvey(
  leadId: number,
  surveyDate: string | Date
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const parsedDate = new Date(surveyDate);
    if (isNaN(parsedDate.getTime())) {
      return { success: false, message: "Tanggal survei tidak valid" };
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: {
          survei_jadwal_at: parsedDate,
          updated_at: now,
        },
      }),
      prisma.aktivitas.create({
        data: {
          lead_id: leadId,
          jenis: "SURVEI_LOKASI",
          hasil: "TERTARIK",
          catatan: `Survei lokasi dijadwalkan pada ${parsedDate.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          tgl_follow_up: parsedDate,
        },
      }),
    ]);

    revalidatePath(`/marketing/lead/${leadId}`);
    revalidatePath("/marketing/lead");
    return { success: true, message: "Jadwal survei berhasil disimpan" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menjadwalkan survei";
    return { success: false, message: msg, error: msg };
  }
}

/**
 * Server Action: Mark Survey as Completed for a Lead
 */
export async function completeSurvey(
  leadId: number,
  completedDate?: string | Date
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const now = new Date();
    const finalDate = completedDate ? new Date(completedDate) : now;

    await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: {
          survei_selesai_at: finalDate,
          updated_at: now,
        },
      }),
      prisma.aktivitas.create({
        data: {
          lead_id: leadId,
          jenis: "SURVEI_LOKASI",
          hasil: "TERTARIK",
          catatan: `Survei lokasi selesai dilaksanakan pada ${finalDate.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}`,
        },
      }),
    ]);

    revalidatePath(`/marketing/lead/${leadId}`);
    revalidatePath("/marketing/lead");
    return { success: true, message: "Survei berhasil ditandai selesai" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menyelesaikan survei";
    return { success: false, message: msg, error: msg };
  }
}

/**
 * Server Action: Mark Lead as Lost with mandatory reason
 */
export async function markLeadLost(
  leadId: number,
  reason: string
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    if (!reason || !reason.trim()) {
      return { success: false, message: "Alasan pembatalan/lost wajib diisi" };
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: {
          lost_at: now,
          lost_reason: reason.trim(),
          updated_at: now,
        },
      }),
      prisma.aktivitas.create({
        data: {
          lead_id: leadId,
          jenis: "LAINNYA",
          hasil: "TIDAK_JADI",
          catatan: `[LEAD LOST] ${reason.trim()}`,
        },
      }),
    ]);

    revalidatePath(`/marketing/lead/${leadId}`);
    revalidatePath("/marketing/lead");
    return { success: true, message: "Lead berhasil ditandai Tidak Jadi (Lost)" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menandai lead lost";
    return { success: false, message: msg, error: msg };
  }
}

