"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  todayWIB,
  monthRangeWIB,
  bulanLabel,
  formatTimestampWIB,
} from "@/lib/date/wib";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export type TaskCategory = "ITJ_REVISION" | "OVERDUE" | "TODAY" | "SURVEY";

export interface MarketingTaskItem {
  id: string; // unique task key (e.g. `itj-12`, `followup-34`)
  leadId: number;
  nama: string;
  no_hp: string;
  minat_tipe?: string | null;
  category: TaskCategory;
  title: string;
  description?: string | null;
  datetimeFormatted: string;
  rawDate: string | null;
  badgeText: string;
  badgeVariant: "red" | "amber" | "yellow" | "purple";
  unitBlok?: string | null;
}

export interface MarketingDashboardMetrics {
  newLeadsThisMonth: number;
  surveysThisMonth: number;
  closingsThisMonth: number;
  monthLabel: string;
}

export interface MarketingDashboardData {
  marketingUser: {
    id: number;
    nama: string;
    role: string;
  };
  metrics: MarketingDashboardMetrics;
  tasks: {
    itjActionNeeded: MarketingTaskItem[];
    overdueFollowUps: MarketingTaskItem[];
    todayFollowUps: MarketingTaskItem[];
    upcomingSurveys: MarketingTaskItem[];
    totalTasks: number;
  };
}

/**
 * Server Action to fetch Marketing Dashboard Data (Mobile-First To-Do List)
 * - Metric 1 (New Leads): Count Lead where marketing_id = userId & created_at in current month
 * - Metric 2 (Surveys): Count Lead where marketing_id = userId & survei_selesai_at in current month
 * - Metric 3 (Closing): Count Transaksi where marketing_id = userId & closed_at/closing_at in current month
 * - Task List: Active Leads grouped by ITJ Action Needed, Overdue Follow-ups, Today's Follow-ups, and Upcoming Surveys
 */
export async function getMarketingDashboardData(
  targetUserId?: number
): Promise<ActionResponse<MarketingDashboardData>> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        message: "Akses ditolak: Silakan login terlebih dahulu.",
      };
    }

    const currentUserId = Number(session.user.id);
    const currentUserRole = session.user.role;

    // RBAC: Marketing can only view their own dashboard; Admin or Manager can specify targetUserId
    let effectiveUserId = currentUserId;
    if (
      targetUserId &&
      (currentUserRole === "ADMIN" || currentUserRole === "MANAGER")
    ) {
      effectiveUserId = targetUserId;
    }

    // Retrieve marketing user profile
    const marketingUserRecord = await prisma.user.findUnique({
      where: { id: effectiveUserId },
      select: { id: true, nama: true, role: true },
    });

    if (!marketingUserRecord) {
      return {
        success: false,
        message: "Pengguna marketing tidak ditemukan.",
      };
    }

    // Compute Date Boundaries in WIB
    const todayStr = todayWIB(); // "YYYY-MM-DD"
    const currentYear = parseInt(todayStr.slice(0, 4), 10);
    const currentMonth = parseInt(todayStr.slice(5, 7), 10);

    const { start: startOfMonth, end: endOfMonth } = monthRangeWIB(
      currentYear,
      currentMonth
    );

    const startOfToday = new Date(`${todayStr}T00:00:00+07:00`);
    const endOfToday = new Date(`${todayStr}T23:59:59.999+07:00`);
    const currentMonthLabel = bulanLabel(currentYear, currentMonth);

    // 1. Metric 1 (New Leads): Count Lead where marketing_id = userId AND created_at is within current month
    const newLeadsCount = await prisma.lead.count({
      where: {
        marketing_id: effectiveUserId,
        created_at: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    });

    // 2. Metric 2 (Surveys): Count Lead where marketing_id = userId AND survei_selesai_at is within current month
    const surveysCount = await prisma.lead.count({
      where: {
        marketing_id: effectiveUserId,
        survei_selesai_at: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    });

    // 3. Metric 3 (Closing): Count Transaksi where marketing_id = userId AND closing_at is within current month (ITJ = Closing)
    const closingsCount = await prisma.transaksi.count({
      where: {
        marketing_id: effectiveUserId,
        status_transaksi: { not: "BATAL" },
        cancelled_at: null,
        closing_at: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
    });

    // 4. Task List (Active Leads only - exclude LOST or CLOSED)
    const activeLeads = await prisma.lead.findMany({
      where: {
        marketing_id: effectiveUserId,
        lost_at: null,
        // Exclude leads that already closed via their ITJ transaction
        itj: {
          none: {
            transaksi: {
              closing_at: { not: null },
              status_transaksi: { not: "BATAL" },
            },
          },
        },
        // Exclude leads that already closed via customer relation
        customer: {
          is: {
            transaksi: {
              none: {
                closing_at: { not: null },
                status_transaksi: { not: "BATAL" },
              },
            },
          },
        },
      },
      include: {
        itj: {
          orderBy: { diajukan_at: "desc" },
          take: 1,
          include: {
            unit: {
              select: { blok: true },
            },
            reviews: {
              orderBy: { created_at: "desc" },
              take: 1,
            },
          },
        },
        aktivitas: {
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
      orderBy: { updated_at: "desc" },
    });

    const itjActionNeeded: MarketingTaskItem[] = [];
    const overdueFollowUps: MarketingTaskItem[] = [];
    const todayFollowUps: MarketingTaskItem[] = [];
    const upcomingSurveys: MarketingTaskItem[] = [];

    activeLeads.forEach((lead) => {
      const latestItj = lead.itj[0];

      // a. ITJ Action Needed: latest ITJ status is 'PERLU_REVISI' or 'DITOLAK'
      if (
        latestItj &&
        (latestItj.status === "PERLU_REVISI" || latestItj.status === "DITOLAK")
      ) {
        const isRevisi = latestItj.status === "PERLU_REVISI";
        const latestCatatan =
          latestItj.reviews[0]?.catatan ||
          (isRevisi
            ? "Perbaiki data atau dokumen pengajuan ITJ konsumen"
            : "Pengajuan ITJ tidak disetujui oleh manager");

        itjActionNeeded.push({
          id: `itj-${latestItj.id}`,
          leadId: lead.id,
          nama: lead.nama,
          no_hp: lead.no_hp,
          minat_tipe: lead.minat_tipe,
          category: "ITJ_REVISION",
          title: isRevisi
            ? "Revisi Pengajuan ITJ Diperlukan"
            : "Pengajuan ITJ Ditolak",
          description: latestCatatan,
          datetimeFormatted: formatTimestampWIB(
            latestItj.diputuskan_at || latestItj.updated_at
          ),
          rawDate: (latestItj.diputuskan_at || latestItj.updated_at).toISOString(),
          badgeText: isRevisi ? "PERLU REVISI" : "DITOLAK",
          badgeVariant: isRevisi ? "amber" : "red",
          unitBlok: latestItj.unit?.blok,
        });
      }

      // b. Overdue Follow-ups: next_follow_up_at < start of today
      if (lead.next_follow_up_at && lead.next_follow_up_at < startOfToday) {
        overdueFollowUps.push({
          id: `overdue-${lead.id}`,
          leadId: lead.id,
          nama: lead.nama,
          no_hp: lead.no_hp,
          minat_tipe: lead.minat_tipe,
          category: "OVERDUE",
          title: "Jadwal Follow-up Terlewat",
          description:
            lead.aktivitas[0]?.catatan ||
            "Batas waktu follow-up sudah lewat. Segera hubungi prospek.",
          datetimeFormatted: formatTimestampWIB(lead.next_follow_up_at),
          rawDate: lead.next_follow_up_at.toISOString(),
          badgeText: "TERLEWAT",
          badgeVariant: "red",
        });
      }

      // c. Today's Follow-ups: next_follow_up_at is today
      if (
        lead.next_follow_up_at &&
        lead.next_follow_up_at >= startOfToday &&
        lead.next_follow_up_at <= endOfToday
      ) {
        todayFollowUps.push({
          id: `today-${lead.id}`,
          leadId: lead.id,
          nama: lead.nama,
          no_hp: lead.no_hp,
          minat_tipe: lead.minat_tipe,
          category: "TODAY",
          title: "Jadwal Follow-up Hari Ini",
          description:
            lead.aktivitas[0]?.catatan ||
            "Agenda follow-up dijadwalkan hari ini.",
          datetimeFormatted: formatTimestampWIB(lead.next_follow_up_at),
          rawDate: lead.next_follow_up_at.toISOString(),
          badgeText: "HARI INI",
          badgeVariant: "yellow",
        });
      }

      // d. Upcoming Surveys: survei_jadwal_at >= start of today and survey not finished
      if (
        lead.survei_jadwal_at &&
        lead.survei_jadwal_at >= startOfToday &&
        !lead.survei_selesai_at
      ) {
        upcomingSurveys.push({
          id: `survey-${lead.id}`,
          leadId: lead.id,
          nama: lead.nama,
          no_hp: lead.no_hp,
          minat_tipe: lead.minat_tipe,
          category: "SURVEY",
          title: "Jadwal Survei Lokasi",
          description: lead.minat_tipe
            ? `Peminat Tipe: ${lead.minat_tipe}. Persiapkan lokasi survei.`
            : "Persiapkan unit dan dampingi konsumen ke lokasi proyek.",
          datetimeFormatted: formatTimestampWIB(lead.survei_jadwal_at),
          rawDate: lead.survei_jadwal_at.toISOString(),
          badgeText: "JADWAL SURVEI",
          badgeVariant: "purple",
        });
      }
    });

    // Sort tasks in each bucket
    itjActionNeeded.sort((a, b) => (b.rawDate || "").localeCompare(a.rawDate || ""));
    overdueFollowUps.sort((a, b) => (a.rawDate || "").localeCompare(b.rawDate || ""));
    todayFollowUps.sort((a, b) => (a.rawDate || "").localeCompare(b.rawDate || ""));
    upcomingSurveys.sort((a, b) => (a.rawDate || "").localeCompare(b.rawDate || ""));

    const totalTasks =
      itjActionNeeded.length +
      overdueFollowUps.length +
      todayFollowUps.length +
      upcomingSurveys.length;

    return {
      success: true,
      message: "Data dashboard marketing berhasil dimuat",
      data: {
        marketingUser: {
          id: marketingUserRecord.id,
          nama: marketingUserRecord.nama,
          role: marketingUserRecord.role,
        },
        metrics: {
          newLeadsThisMonth: newLeadsCount,
          surveysThisMonth: surveysCount,
          closingsThisMonth: closingsCount,
          monthLabel: currentMonthLabel,
        },
        tasks: {
          itjActionNeeded,
          overdueFollowUps,
          todayFollowUps,
          upcomingSurveys,
          totalTasks,
        },
      },
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal memuat data dashboard marketing";
    return {
      success: false,
      message: errorMsg,
      error: errorMsg,
    };
  }
}
