"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  activitySchema,
  ActivityInput,
  globalActivityFilterSchema,
  GlobalActivityFilterInput,
  activityFeedFilterSchema,
  ActivityFeedFilterInput,
} from "@/schemas/activity.schema";
import { getLeadTahap, LeadTahap } from "@/lib/lead-utils";
import { MAKRO_OF } from "@/lib/transaksi/stage-map";
import { JenisAktivitas, HasilAktivitas, ActivityEntity, Prisma } from "@/generated/prisma";
import { logActivity } from "@/lib/activity/log";
import { ActivityAction } from "@/lib/activity/actions";
import { dayRangeWIB, toWibDay, todayWIB } from "@/lib/date/wib";

export interface ActivityLogFeedItem {
  id: number;
  created_at: Date;
  entity_type: ActivityEntity;
  entity_id: number;
  action: string;
  lead_id: number | null;
  transaksi_id: number | null;
  tahap_detail: string | null;
  actor_id: number | null;
  summary: string;
  before: unknown;
  after: unknown;
  is_backfill: boolean;
  actor: {
    id: number;
    nama: string;
    role: string;
  } | null;
  lead: {
    id: number;
    nama: string;
    no_hp: string | null;
  } | null;
  transaksi: {
    id: number;
    tahap_detail: string;
    unit: {
      blok: string;
    } | null;
  } | null;
}

export interface ActivityFeedStats {
  totalActivities: number;
  breakdown: {
    lead: number;
    transaksi: number;
    pembayaran: number;
    kpr: number;
    lainnya: number;
  };
  mostActiveActor: {
    id: number;
    nama: string;
    role: string;
    count: number;
  } | null;
}

export interface ActivityFeedPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ActivityFeedResult {
  items: ActivityLogFeedItem[];
  stats: ActivityFeedStats;
  pagination: ActivityFeedPagination;
  dateRange: {
    from: string;
    to: string;
  };
}

/**
 * Server Action: Paginated Manager Activity Feed reading from the unified ActivityLog table.
 * Computes top summary cards directly via SQL GROUP BY aggregation.
 */
export async function getActivityFeed(
  filters?: ActivityFeedFilterInput
): Promise<{
  success: boolean;
  data?: ActivityFeedResult;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Silakan login kembali." };
    }

    const role = session.user.role;
    if (role !== "MANAGER" && role !== "ADMIN") {
      return {
        success: false,
        error: "Unauthorized: Hanya Manager dan Admin yang dapat mengakses activity feed.",
      };
    }

    const parsed = activityFeedFilterSchema.safeParse(filters || {});
    if (!parsed.success) {
      return { success: false, error: "Filter aktivitas tidak valid." };
    }

    const filterData = parsed.data;
    const page = filterData.page || 1;
    const pageSize = filterData.pageSize || 25;

    // Date range filter: default to last 30 days in WIB
    const defaultDateTo = todayWIB();
    const past30Ms = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const defaultDateFrom = toWibDay(new Date(past30Ms));

    const fromStr = filterData.dateFrom || defaultDateFrom;
    const toStr = filterData.dateTo || defaultDateTo;

    const startDate = dayRangeWIB(fromStr).start;
    const endDate = dayRangeWIB(toStr).end;

    const where: Prisma.ActivityLogWhereInput = {
      created_at: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (filterData.actorId) {
      where.actor_id = filterData.actorId;
    }

    if (filterData.leadId) {
      where.lead_id = filterData.leadId;
    }

    if (filterData.transaksiId) {
      where.transaksi_id = filterData.transaksiId;
    }

    if (filterData.entityType) {
      where.entity_type = filterData.entityType;
    } else if (filterData.actionCategory && filterData.actionCategory !== "SEMUA") {
      switch (filterData.actionCategory) {
        case "LEAD":
          where.entity_type = "LEAD";
          break;
        case "TRANSAKSI":
          where.entity_type = "TRANSAKSI";
          break;
        case "PEMBAYARAN":
          where.entity_type = "PEMBAYARAN";
          break;
        case "KPR":
          where.entity_type = "PENGAJUAN_KPR";
          break;
        case "DOKUMEN":
          where.entity_type = { in: ["DOKUMEN", "BAST_ITEM"] };
          break;
        case "MASTER":
          where.entity_type = "UNIT";
          break;
      }
    }

    if (filterData.search?.trim()) {
      where.summary = {
        contains: filterData.search.trim(),
      };
    }

    // Top Card Metrics: aggregated by SQL (GROUP BY)
    const statsWhere: Prisma.ActivityLogWhereInput = {
      created_at: where.created_at,
      ...(where.actor_id ? { actor_id: where.actor_id } : {}),
      ...(where.summary ? { summary: where.summary } : {}),
    };

    const [totalActivities, categoryGroups, actorGroups] = await Promise.all([
      prisma.activityLog.count({ where: statsWhere }),
      prisma.activityLog.groupBy({
        by: ["entity_type"],
        where: statsWhere,
        _count: { _all: true },
      }),
      prisma.activityLog.groupBy({
        by: ["actor_id"],
        where: {
          ...statsWhere,
          actor_id: { not: null },
        },
        _count: { _all: true },
        orderBy: {
          _count: {
            actor_id: "desc",
          },
        },
        take: 1,
      }),
    ]);

    const catMap = new Map<string, number>();
    for (const g of categoryGroups) {
      catMap.set(g.entity_type, g._count._all);
    }

    let topActorData: ActivityFeedStats["mostActiveActor"] = null;
    if (actorGroups.length > 0 && actorGroups[0].actor_id) {
      const topUser = await prisma.user.findUnique({
        where: { id: actorGroups[0].actor_id },
        select: { id: true, nama: true, role: true },
      });
      if (topUser) {
        topActorData = {
          id: topUser.id,
          nama: topUser.nama,
          role: topUser.role,
          count: actorGroups[0]._count._all,
        };
      }
    }

    const stats: ActivityFeedStats = {
      totalActivities,
      breakdown: {
        lead: catMap.get("LEAD") || 0,
        transaksi: catMap.get("TRANSAKSI") || 0,
        pembayaran: catMap.get("PEMBAYARAN") || 0,
        kpr: catMap.get("PENGAJUAN_KPR") || 0,
        lainnya:
          (catMap.get("DOKUMEN") || 0) +
          (catMap.get("BAST_ITEM") || 0) +
          (catMap.get("UNIT") || 0),
      },
      mostActiveActor: topActorData,
    };

    // Feed Items Pagination
    const total = await prisma.activityLog.count({ where });
    const totalPages = Math.ceil(total / pageSize) || 1;
    const skip = (page - 1) * pageSize;

    const rawItems = await prisma.activityLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: pageSize,
      include: {
        actor: {
          select: {
            id: true,
            nama: true,
            role: true,
          },
        },
        lead: {
          select: {
            id: true,
            nama: true,
            no_hp: true,
          },
        },
        transaksi: {
          select: {
            id: true,
            tahap_detail: true,
            unit: {
              select: {
                blok: true,
              },
            },
          },
        },
      },
    });

    const items: ActivityLogFeedItem[] = rawItems.map((item) => ({
      id: item.id,
      created_at: item.created_at,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      action: item.action,
      lead_id: item.lead_id,
      transaksi_id: item.transaksi_id,
      tahap_detail: item.tahap_detail,
      actor_id: item.actor_id,
      summary: item.summary,
      before: item.before,
      after: item.after,
      is_backfill: item.is_backfill,
      actor: item.actor,
      lead: item.lead,
      transaksi: item.transaksi,
    }));

    return {
      success: true,
      data: {
        items,
        stats,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
        dateRange: {
          from: fromStr,
          to: toStr,
        },
      },
    };
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Gagal memuat activity feed.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Get all ActivityLog records related to a transaction.
 * Includes logs tied to the lead prior to transaction creation.
 */
export async function getTransactionHistory(
  transaksiId: number
): Promise<{ success: boolean; data?: ActivityLogFeedItem[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Silakan login kembali." };
    }

    if (!Number.isSafeInteger(transaksiId) || transaksiId <= 0) {
      return { success: false, error: "ID Transaksi tidak valid." };
    }

    const trx = await prisma.transaksi.findUnique({
      where: { id: transaksiId },
      select: {
        id: true,
        pic_id: true,
        itj: {
          select: {
            lead_id: true,
            closer_id: true,
          },
        },
      },
    });

    if (!trx) {
      return { success: false, error: "Transaksi tidak ditemukan." };
    }

    const role = session.user.role;
    const userId = Number(session.user.id);
    const isAuthorized =
      role === "MANAGER" ||
      role === "ADMIN" ||
      userId === trx.pic_id ||
      userId === trx.itj?.closer_id;

    if (!isAuthorized) {
      return {
        success: false,
        error: "Akses ditolak: Anda tidak memiliki akses ke transaksi ini.",
      };
    }

    const leadId = trx.itj?.lead_id;

    const rawItems = await prisma.activityLog.findMany({
      where: {
        OR: [
          { transaksi_id: transaksiId },
          ...(leadId ? [{ lead_id: leadId }] : []),
        ],
      },
      orderBy: { created_at: "desc" },
      include: {
        actor: {
          select: {
            id: true,
            nama: true,
            role: true,
          },
        },
        lead: {
          select: {
            id: true,
            nama: true,
            no_hp: true,
          },
        },
        transaksi: {
          select: {
            id: true,
            tahap_detail: true,
            unit: {
              select: {
                blok: true,
              },
            },
          },
        },
      },
    });

    const items: ActivityLogFeedItem[] = rawItems.map((item) => ({
      id: item.id,
      created_at: item.created_at,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      action: item.action,
      lead_id: item.lead_id,
      transaksi_id: item.transaksi_id,
      tahap_detail: item.tahap_detail,
      actor_id: item.actor_id,
      summary: item.summary,
      before: item.before,
      after: item.after,
      is_backfill: item.is_backfill,
      actor: item.actor,
      lead: item.lead,
      transaksi: item.transaksi,
    }));

    return { success: true, data: items };
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Gagal memuat riwayat transaksi.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Get all ActivityLog records related to a single Lead.
 */
export async function getLeadHistory(
  leadId: number
): Promise<{ success: boolean; data?: ActivityLogFeedItem[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Silakan login kembali." };
    }

    if (!Number.isSafeInteger(leadId) || leadId <= 0) {
      return { success: false, error: "ID Lead tidak valid." };
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, marketing_id: true },
    });

    if (!lead) {
      return { success: false, error: "Lead tidak ditemukan." };
    }

    const role = session.user.role;
    const userId = Number(session.user.id);
    const isAuthorized =
      role === "MANAGER" ||
      role === "ADMIN" ||
      userId === lead.marketing_id;

    if (!isAuthorized) {
      return { success: false, error: "Akses ditolak." };
    }

    const rawItems = await prisma.activityLog.findMany({
      where: { lead_id: leadId },
      orderBy: { created_at: "desc" },
      include: {
        actor: {
          select: {
            id: true,
            nama: true,
            role: true,
          },
        },
        lead: {
          select: {
            id: true,
            nama: true,
            no_hp: true,
          },
        },
        transaksi: {
          select: {
            id: true,
            tahap_detail: true,
            unit: {
              select: {
                blok: true,
              },
            },
          },
        },
      },
    });

    const items: ActivityLogFeedItem[] = rawItems.map((item) => ({
      id: item.id,
      created_at: item.created_at,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      action: item.action,
      lead_id: item.lead_id,
      transaksi_id: item.transaksi_id,
      tahap_detail: item.tahap_detail,
      actor_id: item.actor_id,
      summary: item.summary,
      before: item.before,
      after: item.after,
      is_backfill: item.is_backfill,
      actor: item.actor,
      lead: item.lead,
      transaksi: item.transaksi,
    }));

    return { success: true, data: items };
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Gagal memuat riwayat lead.";
    return { success: false, error: msg };
  }
}

export interface GlobalActivityItem {
  id: number;
  lead_id: number;
user_id: number;
jenis: JenisAktivitas;
hasil: HasilAktivitas;
catatan: string | null;
tgl_follow_up: Date | null;
created_at: Date;
user: {
  id: number;
  nama: string;
  role: string;
};
lead: {
  id: number;
  nama: string;
  no_hp: string | null;
  marketing_id: number | null;
};
}

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
  nominal: number;
  target_dp: number;
  metode_bayar: string;
  tenor: number | null;
  diajukan_at: Date;
  unit: {
    blok: string;
  } | null;
  transaksi?: {
    id: number;
    status_transaksi: string;
    closing_at: Date | null;
  } | null;
}

export interface SerializedLeadDetail {
  id: number;
  nama: string;
  no_hp: string | null;
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
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Silakan login kembali." };
    }

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
            transaksi: {
              select: {
                id: true,
                tahap_detail: true,
                target_dp: true,
                closing_at: true,
              },
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
        nominal: Number(latest.nominal),
        target_dp: Number(latest.transaksi?.target_dp ?? 0),
        metode_bayar: latest.metode_bayar,
        tenor: latest.tenor,
        diajukan_at: latest.diajukan_at,
        unit: latest.unit ? { blok: latest.unit.blok } : null,
        transaksi: latest.transaksi
          ? {
            id: latest.transaksi.id,
            status_transaksi: MAKRO_OF[latest.transaksi.tahap_detail],
            closing_at: latest.transaksi.closing_at,
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
      select: { id: true, nama: true },
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
    const createdActivity = await prisma.$transaction(async (tx) => {
      const act = await tx.aktivitas.create({
        data: {
          lead_id,
          user_id: userId,
          jenis,
          hasil,
          catatan: catatan || null,
          tgl_follow_up: followUpDate,
          created_at: now,
        },
      });

      await tx.lead.update({
        where: { id: lead_id },
        data: {
          last_activity_at: now,
          next_follow_up_at: followUpDate,
          updated_at: now,
        },
      });

      const actionName: ActivityAction =
        jenis === "WHATSAPP"
          ? "LEAD_FOLLOWUP_WHATSAPP"
          : jenis === "TELEPON"
            ? "LEAD_FOLLOWUP_TELEPON"
            : jenis === "BERTEMU"
              ? "LEAD_FOLLOWUP_BERTEMU"
              : "LEAD_FOLLOWUP_LAINNYA";

      await logActivity(tx, {
        entityType: "LEAD",
        entityId: lead_id,
        action: actionName,
        leadId: lead_id,
        actorId: userId,
        summaryContext: {
          actorName: session?.user?.name,
          leadName: lead.nama,
          hasil,
        },
        after: {
          jenis,
          hasil,
          tgl_follow_up: followUpDate.toISOString(),
        },
      });

      return act;
    });

    // Revalidate paths
    revalidatePath(`/marketing/lead/${lead_id}`);
    revalidatePath("/marketing/lead");
    revalidatePath("/admin/lead");
    revalidatePath("/manager/lead");
    revalidatePath("/manager/aktivitas");

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

/**
 * Server Action: Retrieve global activities audit log for Manager & Admin.
 * Supports filters: userId, jenis, startDate, endDate.
 * Relations: user (actor) and lead.
 * Order: created_at DESC.
 */
export async function getGlobalActivities(
  filters?: GlobalActivityFilterInput
): Promise<{
  success: boolean;
  data?: GlobalActivityItem[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Silakan login kembali." };
    }

    const currentUserRole = session.user.role;
    if (currentUserRole !== "MANAGER" && currentUserRole !== "ADMIN") {
      return {
        success: false,
        error: "Unauthorized: Hanya Manager dan Admin yang dapat mengakses audit aktivitas.",
      };
    }

    const parsedFilters = filters ? globalActivityFilterSchema.safeParse(filters) : null;
    const filterData = parsedFilters && parsedFilters.success ? parsedFilters.data : filters;

    const where: Prisma.AktivitasWhereInput = {};

    if (filterData?.userId) {
      where.user_id = filterData.userId;
    }

    if (filterData?.jenis) {
      where.jenis = filterData.jenis;
    }

    if (filterData?.startDate || filterData?.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (filterData.startDate) {
        try {
          dateFilter.gte = dayRangeWIB(filterData.startDate).start;
        } catch {
          // ignore invalid date
        }
      }
      if (filterData.endDate) {
        try {
          dateFilter.lte = dayRangeWIB(filterData.endDate).end;
        } catch {
          // ignore invalid date
        }
      }
      if (dateFilter.gte || dateFilter.lte) {
        where.created_at = dateFilter;
      }
    }

    const activities = await prisma.aktivitas.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            role: true,
          },
        },
        lead: {
          select: {
            id: true,
            nama: true,
            no_hp: true,
            marketing_id: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: 200,
    });

    return {
      success: true,
      data: activities,
    };
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Gagal memuat log aktivitas global.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Get active actors (users) for activity filter dropdowns.
 */
export async function getActivityActors(): Promise<{
  success: boolean;
  data?: { id: number; nama: string; role: string }[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Silakan login kembali." };
    }

    const role = session.user.role;
    if (role !== "MANAGER" && role !== "ADMIN") {
      return {
        success: false,
        error: "Unauthorized: Hanya Manager dan Admin yang dapat mengakses daftar personel.",
      };
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, nama: true, role: true },
      orderBy: [{ role: "asc" }, { nama: "asc" }],
    });

    return {
      success: true,
      data: users,
    };
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Gagal memuat daftar personel.";
    return { success: false, error: msg };
  }
}
