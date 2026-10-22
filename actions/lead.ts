// actions/lead.ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { leadSchema, LeadInput, LeadFilter } from "@/schemas/lead.schema";
import {
  FollowUpInfo,
  LeadTahap,
  getFollowUpInfo,
  sortLeadsByDefaultPriority,
  mapToSumberLead,
} from "@/lib/lead-utils";
import { Prisma, SumberLead } from "@/generated/prisma";

export interface CreateLeadResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    id: number;
    nama: string;
    no_hp: string;
    sumber: SumberLead;
    minat_tipe: string | null;
    tahap: string;
    survei_jadwal_at: Date | null;
    survei_selesai_at: Date | null;
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
  closing_at?: Date | null;
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
 * Helper: Computes the current stage of a Lead based on milestone date fields and relations.
 * Logic:
 * - If lost_at is not null -> return 'LOST'.
 * - If transaksi?.closed_at is not null -> return 'CLOSING'.
 * - If itj exists and status is 'DIAJUKAN' -> return 'ITJ DIAJUKAN'.
 * - If survei_selesai_at is not null -> return 'SUDAH SURVEI'.
 * - If survei_jadwal_at is not null -> return 'SURVEI DIJADWALKAN'.
 * - Else -> return 'LEAD MASUK'.
 */
export async function getLeadTahap(lead: unknown): Promise<LeadTahap> {
  return computeLeadTahap(lead);
}

function computeLeadTahap(lead: unknown): LeadTahap {
  if (!lead || typeof lead !== "object") return "LEAD MASUK";
  const l = lead as Record<string, unknown>;

  // 1. If lost_at is not null -> return 'LOST'
  if (l.lost_at != null) {
    return "LOST";
  }

  // 2. If transaksi?.closing_at is not null (excluding BATAL) -> return 'CLOSING'
  const directTrx = l.transaksi as Record<string, unknown> | undefined;
  if (directTrx?.closing_at != null && directTrx?.status_transaksi !== "BATAL") {
    return "CLOSING";
  }

  if (Array.isArray(l.itj)) {
    const hasClosed = l.itj.some((item) => {
      if (typeof item === "object" && item !== null) {
        const trx = (item as Record<string, unknown>).transaksi as
          | Record<string, unknown>
          | undefined;
        return trx?.closing_at != null && trx?.status_transaksi !== "BATAL";
      }
      return false;
    });
    if (hasClosed) return "CLOSING";
  } else if (l.itj && typeof l.itj === "object") {
    const singleItj = l.itj as Record<string, unknown>;
    const trx = singleItj.transaksi as Record<string, unknown> | undefined;
    if (trx?.closing_at != null && trx?.status_transaksi !== "BATAL") return "CLOSING";
  }

  if (l.customer && typeof l.customer === "object") {
    const cust = l.customer as Record<string, unknown>;
    if (Array.isArray(cust.transaksi)) {
      const hasClosed = cust.transaksi.some((trx) => {
        const t = trx as Record<string, unknown>;
        return t?.closing_at != null && t?.status_transaksi !== "BATAL";
      });
      if (hasClosed) return "CLOSING";
    }
  }

  // 3. If itj exists and status is 'DIAJUKAN' -> return 'ITJ DIAJUKAN'
  if (Array.isArray(l.itj)) {
    const hasDiajukan = l.itj.some((item) => {
      if (typeof item === "object" && item !== null) {
        return (item as Record<string, unknown>).status === "DIAJUKAN";
      }
      return false;
    });
    if (hasDiajukan) return "ITJ DIAJUKAN";
  } else if (l.itj && typeof l.itj === "object") {
    const singleItj = l.itj as Record<string, unknown>;
    if (singleItj.status === "DIAJUKAN") return "ITJ DIAJUKAN";
  }

  // 4. If survei_selesai_at is not null -> return 'SUDAH SURVEI'
  if (l.survei_selesai_at != null) {
    return "SUDAH SURVEI";
  }

  // 5. If survei_jadwal_at is not null -> return 'SURVEI DIJADWALKAN'
  if (l.survei_jadwal_at != null) {
    return "SURVEI DIJADWALKAN";
  }

  // Else -> return 'LEAD MASUK'
  return "LEAD MASUK";
}

/**
 * Server Action: Create a new Lead with mapped SumberLead Enum.
 * Note: no_hp is NO LONGER @unique, so creation is allowed even if existing number is found.
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
    const mappedSumber: SumberLead = mapToSumberLead(sumber);

    // Determine assigned marketing_id
    let assignedMarketingId: number | null = parsed.data.marketing_id
      ? Number(parsed.data.marketing_id)
      : null;

    // If logged-in user is MARKETING and no marketing_id specified, auto-assign to self
    let sessionUserId: number | null = null;
    if (session?.user) {
      const sessionRole = session.user.role;
      sessionUserId = Number(session.user.id);
      if (sessionRole === "MARKETING" && !isNaN(sessionUserId) && !assignedMarketingId) {
        assignedMarketingId = sessionUserId;
      }
    }

    // Determine actor user_id for initial Aktivitas
    const actorUserId =
      (sessionUserId && !isNaN(sessionUserId) ? sessionUserId : null) ||
      assignedMarketingId;

    // Handle initial note and follow-up date
    const effectiveNotes = (notes || catatan || "").trim();
    const rawFollowUp = next_follow_up || tgl_follow_up || null;
    const parsedFollowUpDate = rawFollowUp ? new Date(rawFollowUp) : null;
    const isValidFollowUp = parsedFollowUpDate && !isNaN(parsedFollowUpDate.getTime());
    const hasInitialActivity = Boolean(effectiveNotes || isValidFollowUp);

    const newLead = await prisma.lead.create({
      data: {
        nama: nama.trim(),
        no_hp: cleanNoHp,
        sumber: mappedSumber,
        minat_tipe: minat_tipe ? minat_tipe.trim() : null,
        marketing_id: assignedMarketingId,
        last_activity_at: hasInitialActivity ? new Date() : null,
        next_follow_up_at: isValidFollowUp ? parsedFollowUpDate : null,
        survei_jadwal_at: null,
        survei_selesai_at: null,
        lost_at: null,
        lost_reason: null,
        ...(hasInitialActivity &&
          actorUserId && {
            aktivitas: {
              create: {
                user_id: actorUserId,
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
    revalidatePath("/manager");

    const dynamicTahap = computeLeadTahap(newLead);

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
        lost_at: newLead.lost_at,
        lost_reason: newLead.lost_reason,
        marketing_id: newLead.marketing_id,
        created_at: newLead.created_at,
      },
    };
  } catch (error: unknown) {
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
      const norm = tahapFilter.toUpperCase().trim();
      if (norm === "LOST") {
        where.lost_at = { not: null };
      } else if (norm === "CLOSING" || norm === "ITJ") {
        where.lost_at = null;
        where.OR = [
          { itj: { some: { transaksi: { closing_at: { not: null }, status_transaksi: { not: "BATAL" } } } } },
          { customer: { transaksi: { some: { closing_at: { not: null }, status_transaksi: { not: "BATAL" } } } } },
        ];
      } else if (norm === "ITJ DIAJUKAN" || norm === "ITJ_DIAJUKAN") {
        where.lost_at = null;
        where.itj = { some: { status: "DIAJUKAN" } };
      } else if (norm === "SUDAH SURVEI" || norm === "SUDAH_SURVEI") {
        where.survei_selesai_at = { not: null };
        where.lost_at = null;
      } else if (norm === "SURVEI DIJADWALKAN" || norm === "SURVEI_DIJADWALKAN") {
        where.survei_jadwal_at = { not: null };
        where.survei_selesai_at = null;
        where.lost_at = null;
      } else if (norm === "LEAD MASUK" || norm === "BARU" || norm === "FOLLOW_UP") {
        where.survei_jadwal_at = null;
        where.survei_selesai_at = null;
        where.lost_at = null;
      }
    }

    // Filter by sumber
    if (filters.sumber && typeof filters.sumber === "string" && filters.sumber !== "ALL") {
      where.sumber = mapToSumberLead(filters.sumber);
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
          itj: {
            select: {
              id: true,
              status: true,
              transaksi: {
                select: {
                  closing_at: true,
                  status_transaksi: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              transaksi: {
                select: {
                  closing_at: true,
                  status_transaksi: true,
                },
              },
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
      const followUp = l.next_follow_up_at || l.aktivitas[0]?.tgl_follow_up || null;
      const dynamicTahap = computeLeadTahap(l);

      // Check for closing date from itj.transaksi or customer.transaksi
      const itjTrx = l.itj?.[0]?.transaksi;
      const custTrx = l.customer?.transaksi?.[0];
      const closingAtDate =
        (itjTrx?.status_transaksi !== "BATAL" ? itjTrx?.closing_at : null) ||
        (custTrx?.status_transaksi !== "BATAL" ? custTrx?.closing_at : null) ||
        null;

      return {
        id: l.id,
        nama: l.nama,
        no_hp: l.no_hp,
        sumber: l.sumber,
        minat_tipe: l.minat_tipe,
        tahap: dynamicTahap,
        survei_jadwal_at: l.survei_jadwal_at,
        survei_selesai_at: l.survei_selesai_at,
        closing_at: closingAtDate,
        lost_at: l.lost_at,
        lost_reason: l.lost_reason,
        marketing_id: l.marketing_id,
        created_at: l.created_at,
        tgl_follow_up: followUp,
        tgl_aktivitas_terakhir: l.last_activity_at || l.aktivitas[0]?.created_at || null,
        jenis_aktivitas_terakhir: l.aktivitas[0]?.jenis || null,
        catatan_terakhir: l.aktivitas[0]?.catatan || null,
        marketing: l.marketing,
        followUpInfo: getFollowUpInfo(followUp),
      };
    });

    // Optional filter by follow_up status
    if (
      filters.follow_up &&
      typeof filters.follow_up === "string" &&
      filters.follow_up !== "ALL"
    ) {
      const fuFilter = filters.follow_up.toLowerCase();
      leads = leads.filter((item) => {
        if (fuFilter === "terlambat") return item.followUpInfo.status === "TERLAMBAT";
        if (fuFilter === "hari_ini") return item.followUpInfo.status === "HARI_INI";
        if (fuFilter === "mendatang") {
          return (
            item.followUpInfo.status === "MENDATANG" ||
            item.followUpInfo.status === "HARI_INI"
          );
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
 * Updates respective Date field in Prisma Lead model instead of string status.
 */
export async function updateLeadMilestone(
  leadId: number,
  milestone: "SURVEI_JADWAL" | "SURVEI_SELESAI" | "LOST",
  lostReason?: string,
  date?: Date
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const targetDate = date || new Date();
    const now = new Date();
    const updateData: Prisma.LeadUpdateInput = {
      updated_at: now,
      last_activity_at: now,
    };

    switch (milestone) {
      case "SURVEI_JADWAL":
        updateData.survei_jadwal_at = targetDate;
        updateData.next_follow_up_at = targetDate;
        updateData.lost_at = null;
        updateData.lost_reason = null;
        break;

      case "SURVEI_SELESAI":
        updateData.survei_selesai_at = targetDate;
        updateData.next_follow_up_at = null;
        updateData.lost_at = null;
        updateData.lost_reason = null;
        break;

      case "LOST":
        updateData.lost_at = targetDate;
        updateData.lost_reason = lostReason || "Lead dibatalkan / lost";
        updateData.next_follow_up_at = null;
        break;
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    revalidatePath("/marketing/lead");
    revalidatePath("/admin/lead");
    revalidatePath("/manager/lead");
    revalidatePath("/manager");
    revalidatePath(`/marketing/lead/${leadId}`);

    return {
      success: true,
      message: `Milestone lead berhasil diperbarui ke ${milestone}`,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memperbarui milestone lead";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Backward-compatible wrapper for components calling updateLeadTahap
 */
export async function updateLeadTahap(
  leadId: number,
  tahap: string
): Promise<{ success: boolean; message: string; error?: string }> {
  const norm = tahap.toUpperCase().trim();
  if (norm === "LOST" || norm.includes("LOST")) {
    return updateLeadMilestone(leadId, "LOST", "Diubah ke status Lost");
  }
  if (norm === "SUDAH SURVEI" || norm === "SUDAH_SURVEI") {
    return updateLeadMilestone(leadId, "SURVEI_SELESAI");
  }
  if (norm === "SURVEI DIJADWALKAN" || norm === "SURVEI_DIJADWALKAN") {
    return updateLeadMilestone(leadId, "SURVEI_JADWAL");
  }
  if (norm === "LEAD MASUK" || norm === "BARU") {
    try {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          survei_jadwal_at: null,
          survei_selesai_at: null,
          lost_at: null,
          lost_reason: null,
          updated_at: new Date(),
        },
      });
      revalidatePath("/marketing/lead");
      revalidatePath(`/marketing/lead/${leadId}`);
      return { success: true, message: "Status lead direset ke Lead Masuk" };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Gagal mereset status lead";
      return { success: false, message: errorMsg, error: errorMsg };
    }
  }

  return { success: false, message: `Tahap '${tahap}' tidak didukung untuk update langsung` };
}

/**
 * Server Action: Retrieve list of Marketing team members for dropdown assignments
 */
export async function getMarketingUsers(): Promise<{ id: number; nama: string; no_hp: string }[]> {
  try {
    const users = await prisma.user.findMany({
      where: { role: "MARKETING", isActive: true },
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
        isActive: true,
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
    const session = await auth();
    const parsedDate = new Date(surveyDate);
    if (isNaN(parsedDate.getTime())) {
      return { success: false, message: "Tanggal survei tidak valid" };
    }

    // Fetch lead to get marketing_id if session user_id is missing
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, marketing_id: true },
    });

    if (!lead) {
      return { success: false, message: "Data lead tidak ditemukan" };
    }

    const userId =
      (session?.user?.id ? Number(session.user.id) : null) ||
      lead.marketing_id;

    if (!userId) {
      return { success: false, message: "Pengguna penanggung jawab tidak teridentifikasi" };
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: {
          survei_jadwal_at: parsedDate,
          last_activity_at: now,
          next_follow_up_at: parsedDate,
          lost_at: null,
          lost_reason: null,
          updated_at: now,
        },
      }),
      prisma.aktivitas.create({
        data: {
          lead_id: leadId,
          user_id: userId,
          jenis: "BERTEMU",
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
    revalidatePath("/manager");
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
    const session = await auth();
    const now = new Date();
    const finalDate = completedDate ? new Date(completedDate) : now;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, marketing_id: true },
    });

    if (!lead) {
      return { success: false, message: "Data lead tidak ditemukan" };
    }

    const userId =
      (session?.user?.id ? Number(session.user.id) : null) ||
      lead.marketing_id;

    if (!userId) {
      return { success: false, message: "Pengguna penanggung jawab tidak teridentifikasi" };
    }

    await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: {
          survei_selesai_at: finalDate,
          last_activity_at: now,
          next_follow_up_at: null,
          lost_at: null,
          lost_reason: null,
          updated_at: now,
        },
      }),
      prisma.aktivitas.create({
        data: {
          lead_id: leadId,
          user_id: userId,
          jenis: "BERTEMU",
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
    revalidatePath("/manager");
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

    const session = await auth();
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, marketing_id: true },
    });

    if (!lead) {
      return { success: false, message: "Data lead tidak ditemukan" };
    }

    const userId =
      (session?.user?.id ? Number(session.user.id) : null) ||
      lead.marketing_id;

    if (!userId) {
      return { success: false, message: "Pengguna penanggung jawab tidak teridentifikasi" };
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.lead.update({
        where: { id: leadId },
        data: {
          lost_at: now,
          lost_reason: reason.trim(),
          last_activity_at: now,
          next_follow_up_at: null,
          updated_at: now,
        },
      }),
      prisma.aktivitas.create({
        data: {
          lead_id: leadId,
          user_id: userId,
          jenis: "LAINNYA",
          hasil: "TIDAK_JADI",
          catatan: `[LEAD LOST] ${reason.trim()}`,
        },
      }),
    ]);

    revalidatePath(`/marketing/lead/${leadId}`);
    revalidatePath("/marketing/lead");
    revalidatePath("/manager");
    return { success: true, message: "Lead berhasil ditandai Tidak Jadi (Lost)" };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menandai lead lost";
    return { success: false, message: msg, error: msg };
  }
}
