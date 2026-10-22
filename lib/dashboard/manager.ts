// lib/dashboard/manager.ts
/**
 * ============================================================================
 * NPKR PORTAL - MANAGER DASHBOARD & REPORT METRICS (SINGLE SOURCE OF TRUTH)
 * ============================================================================
 * 
 * BUSINESS DEFINITIONS:
 * 1. Roles: MARKETING, ADMIN, MANAGER. Only MANAGER may access manager dashboard and report routes.
 * 2. Closing (Official Sale):
 *    - Official sales closing is ITJ submission, recorded in Transaksi.closing_at.
 *    - Closing counts strictly EXCLUDE status_transaksi = BATAL.
 *    - Transaksi.closed_at means "fully finished after BAST" and is NEVER the sales closing date.
 *    - Operational milestones tgl_akad and tgl_ajb are tracked separately.
 * 3. Monthly Metrics are EVENT-DATE BASED (Not cohort, except where explicitly noted):
 *    - Lead Masuk: Lead.created_at, owner Lead.marketing_id, timestamp range.
 *    - Survei Dijadwalkan: Lead.survei_jadwal_at, owner Lead.marketing_id, timestamp range.
 *    - Survei Selesai: Lead.survei_selesai_at, owner Lead.marketing_id, timestamp range.
 *    - ITJ Diajukan: Itj.diajukan_at, owner Itj.marketing_id, timestamp range.
 *    - ITJ Disetujui: Itj.diputuskan_at with status DISETUJUI, owner Itj.marketing_id, timestamp range.
 *    - Closing: Transaksi.closing_at, status_transaksi != BATAL, owner Transaksi.marketing_id, DATE-ONLY range.
 *    - Kas Masuk: Pembayaran.tgl_bayar with is_void = false, DATE-ONLY range.
 * 4. ITJ is counted PER ITJ ROW (not unique leads). ITJ ownership never changes when a lead is reassigned.
 * 5. Timezone: The business runs in Asia/Jakarta (WIB, UTC+7).
 *    - Timestamp columns use [start, end) where start = YYYY-MM-01T00:00:00+07:00.
 *    - Date-only columns (@db.Date) use UTC-midnight ranges: Date.UTC(year, month-1, 1).
 * 6. Macro Stage Order (Monotonic):
 *    PEMBERKASAN, PROSES_BANK, PEMBAYARAN, AKAD_AJB, PEMBANGUNAN, SERAH_TERIMA, BATAL.
 * 7. Pembayaran Aggregates:
 *    Always filter is_void = false and query tgl_bayar (never created_at).
 * ============================================================================
 */

import { prisma } from "@/lib/prisma";
import { TahapTransaksi, StatusItj, SumberLead, StatusUnit } from "@/generated/prisma";
import {
  monthRangeWIB,
  monthRangeDateOnly,
  shiftMonth,
  bulanLabel,
} from "@/lib/date/wib";

/**
 * Shared helper for closed deal queries across the portal.
 * Closing = closing_at in date range AND status_transaksi != BATAL.
 */
export function closedDealWhere(start: Date, end: Date) {
  return {
    closing_at: {
      gte: start,
      lt: end,
    },
    status_transaksi: {
      not: TahapTransaksi.BATAL,
    },
  };
}

export interface MetricComparison {
  current: number;
  previous: number;
  diff: number;
  pct: number | null;
  label: string;
  isPositive: boolean;
  hint?: string;
}

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  pctOfTotal: number;
  pctOfPrev: number;
}

export interface TrendMonthData {
  key: string;
  label: string;
  leadMasuk: number;
  itjDisetujui: number;
  closing: number;
}

export interface MarketingPerformanceSummary {
  marketingId: number;
  nama: string;
  username: string;
  noHp: string;
  leadMasuk: number;
  surveiJadwal: number;
  surveiSelesai: number;
  itjDiajukan: number;
  itjDisetujui: number;
  closing: number;
}

export interface PipelineStageSummary {
  stage: TahapTransaksi;
  label: string;
  count: number;
  totalHargaDeal: number;
}

export interface InventoryStatusSummary {
  status: StatusUnit;
  label: string;
  count: number;
}

export interface ManagerDashboardData {
  selectedMonth: string;
  bulanLabel: string;
  kpis: {
    leadMasuk: MetricComparison;
    surveiSelesai: MetricComparison;
    itjDisetujui: MetricComparison;
    closing: MetricComparison;
    nilaiClosing: MetricComparison;
    kasMasuk: MetricComparison;
  };
  funnel: {
    totalLeads: number;
    steps: FunnelStep[];
  };
  trend: TrendMonthData[];
  marketingPerformance: {
    rows: MarketingPerformanceSummary[];
    totals: {
      leadMasuk: number;
      surveiJadwal: number;
      surveiSelesai: number;
      itjDiajukan: number;
      itjDisetujui: number;
      closing: number;
    };
  };
  leadSources: Array<{
    sumber: SumberLead;
    label: string;
    total: number;
    closing: number;
    pctClosing: number;
  }>;
  pipeline: PipelineStageSummary[];
  inventory: {
    items: InventoryStatusSummary[];
    total: number;
  };
}

/**
 * Helper to compute change vs previous month with proper Indonesian formatting text.
 */
function computeComparison(
  curr: number,
  prev: number,
  hint?: string
): MetricComparison {
  const diff = curr - prev;
  let pct: number | null = null;
  let label = "";
  let isPositive = true;

  if (prev === 0) {
    if (curr > 0) {
      label = "Naik dari 0 bulan lalu";
      isPositive = true;
    } else {
      label = "Sama dengan bulan lalu (0)";
      isPositive = true;
    }
  } else {
    pct = (diff / prev) * 100;
    const absPct = Math.abs(pct).toLocaleString("id-ID", {
      maximumFractionDigits: 1,
    });
    if (diff > 0) {
      label = `Naik ${absPct}% dari bulan lalu`;
      isPositive = true;
    } else if (diff < 0) {
      label = `Turun ${absPct}% dari bulan lalu`;
      isPositive = false;
    } else {
      label = "Sama dengan bulan lalu";
      isPositive = true;
    }
  }

  return {
    current: curr,
    previous: prev,
    diff,
    pct,
    label,
    isPositive,
    hint,
  };
}

/**
 * Primary dashboard query aggregator.
 * Fetches all necessary KPIs, funnel, trend, pipeline, and inventory in parallel.
 */
export async function getManagerDashboardData(
  year: number,
  month: number
): Promise<ManagerDashboardData> {
  const currentKey = `${year}-${String(month).padStart(2, "0")}`;
  const prevKey = shiftMonth(currentKey, -1);
  const [prevYearStr, prevMonthStr] = prevKey.split("-");
  const prevYear = parseInt(prevYearStr, 10);
  const prevMonth = parseInt(prevMonthStr, 10);

  // Time boundaries for selected month and previous month
  const currWib = monthRangeWIB(year, month);
  const currDateOnly = monthRangeDateOnly(year, month);
  const prevWib = monthRangeWIB(prevYear, prevMonth);
  const prevDateOnly = monthRangeDateOnly(prevYear, prevMonth);

  // Trend months: last 6 months ending at current
  const trendMonths: Array<{ year: number; month: number; key: string }> = [];
  for (let i = 5; i >= 0; i--) {
    const key = shiftMonth(currentKey, -i);
    const [yStr, mStr] = key.split("-");
    trendMonths.push({
      year: parseInt(yStr, 10),
      month: parseInt(mStr, 10),
      key,
    });
  }

  // ─── PARALLEL DATA QUERIES ───
  const [
    // Current month KPIs
    currLeadMasuk,
    currSurveiSelesai,
    currSurveiJadwal,
    currItjDisetujui,
    currItjDiajukan,
    currClosingCount,
    currClosingSum,
    currKasMasukSum,

    // Previous month KPIs
    prevLeadMasuk,
    prevSurveiSelesai,
    prevItjDisetujui,
    prevClosingCount,
    prevClosingSum,
    prevKasMasukSum,

    // Funnel (Cohort of leads created in selected month)
    funnelTotalLeads,
    funnelSurveiSelesai,
    funnelAnyItj,
    funnelItjDisetujui,
    funnelClosing,

    // Trend last 6 months
    trendDataResults,

    // Marketing Performance (one groupBy per metric)
    marketingUsers,
    leadMasukGroups,
    surveiJadwalGroups,
    surveiSelesaiGroups,
    itjDiajukanGroups,
    itjDisetujuiGroups,
    closingGroups,

    // Lead per Sumber (Cohort of the month)
    sumberTotalGroups,
    sumberClosingGroups,

    // Active Pipeline (Snapshot)
    pipelineGroups,

    // Unit Inventory (Snapshot)
    inventoryGroups,
  ] = await Promise.all([
    // Current month KPIs
    prisma.lead.count({
      where: { created_at: { gte: currWib.start, lt: currWib.end } },
    }),
    prisma.lead.count({
      where: { survei_selesai_at: { gte: currWib.start, lt: currWib.end } },
    }),
    prisma.lead.count({
      where: { survei_jadwal_at: { gte: currWib.start, lt: currWib.end } },
    }),
    prisma.itj.count({
      where: {
        status: StatusItj.DISETUJUI,
        diputuskan_at: { gte: currWib.start, lt: currWib.end },
      },
    }),
    prisma.itj.count({
      where: { diajukan_at: { gte: currWib.start, lt: currWib.end } },
    }),
    prisma.transaksi.count({
      where: closedDealWhere(currDateOnly.start, currDateOnly.end),
    }),
    prisma.transaksi.aggregate({
      _sum: { harga_deal: true },
      where: closedDealWhere(currDateOnly.start, currDateOnly.end),
    }),
    prisma.pembayaran.aggregate({
      _sum: { nominal: true },
      where: {
        is_void: false,
        tgl_bayar: { gte: currDateOnly.start, lt: currDateOnly.end },
      },
    }),

    // Previous month KPIs
    prisma.lead.count({
      where: { created_at: { gte: prevWib.start, lt: prevWib.end } },
    }),
    prisma.lead.count({
      where: { survei_selesai_at: { gte: prevWib.start, lt: prevWib.end } },
    }),
    prisma.itj.count({
      where: {
        status: StatusItj.DISETUJUI,
        diputuskan_at: { gte: prevWib.start, lt: prevWib.end },
      },
    }),
    prisma.transaksi.count({
      where: closedDealWhere(prevDateOnly.start, prevDateOnly.end),
    }),
    prisma.transaksi.aggregate({
      _sum: { harga_deal: true },
      where: closedDealWhere(prevDateOnly.start, prevDateOnly.end),
    }),
    prisma.pembayaran.aggregate({
      _sum: { nominal: true },
      where: {
        is_void: false,
        tgl_bayar: { gte: prevDateOnly.start, lt: prevDateOnly.end },
      },
    }),

    // Funnel (Cohort of leads created in selected month)
    prisma.lead.count({
      where: { created_at: { gte: currWib.start, lt: currWib.end } },
    }),
    prisma.lead.count({
      where: {
        created_at: { gte: currWib.start, lt: currWib.end },
        survei_selesai_at: { not: null },
      },
    }),
    prisma.lead.count({
      where: {
        created_at: { gte: currWib.start, lt: currWib.end },
        itj: { some: {} },
      },
    }),
    prisma.lead.count({
      where: {
        created_at: { gte: currWib.start, lt: currWib.end },
        itj: { some: { status: StatusItj.DISETUJUI } },
      },
    }),
    prisma.lead.count({
      where: {
        created_at: { gte: currWib.start, lt: currWib.end },
        itj: {
          some: {
            status: StatusItj.DISETUJUI,
            transaksi: {
              is: {
                closing_at: { not: null },
                status_transaksi: { not: TahapTransaksi.BATAL },
              },
            },
          },
        },
      },
    }),

    // Trend last 6 months
    Promise.all(
      trendMonths.map(async (tm) => {
        const tw = monthRangeWIB(tm.year, tm.month);
        const td = monthRangeDateOnly(tm.year, tm.month);
        const [lm, id, cl] = await Promise.all([
          prisma.lead.count({
            where: { created_at: { gte: tw.start, lt: tw.end } },
          }),
          prisma.itj.count({
            where: {
              status: StatusItj.DISETUJUI,
              diputuskan_at: { gte: tw.start, lt: tw.end },
            },
          }),
          prisma.transaksi.count({
            where: closedDealWhere(td.start, td.end),
          }),
        ]);
        return {
          key: tm.key,
          label: bulanLabel(tm.year, tm.month),
          leadMasuk: lm,
          itjDisetujui: id,
          closing: cl,
        };
      })
    ),

    // Marketing Performance queries
    prisma.user.findMany({
      where: { role: "MARKETING" },
      select: {
        id: true,
        nama: true,
        username: true,
        no_hp: true,
        isActive: true,
      },
    }),
    prisma.lead.groupBy({
      by: ["marketing_id"],
      where: {
        marketing_id: { not: null },
        created_at: { gte: currWib.start, lt: currWib.end },
      },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["marketing_id"],
      where: {
        marketing_id: { not: null },
        survei_jadwal_at: { gte: currWib.start, lt: currWib.end },
      },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["marketing_id"],
      where: {
        marketing_id: { not: null },
        survei_selesai_at: { gte: currWib.start, lt: currWib.end },
      },
      _count: { _all: true },
    }),
    prisma.itj.groupBy({
      by: ["marketing_id"],
      where: {
        marketing_id: { not: null },
        diajukan_at: { gte: currWib.start, lt: currWib.end },
      },
      _count: { _all: true },
    }),
    prisma.itj.groupBy({
      by: ["marketing_id"],
      where: {
        marketing_id: { not: null },
        status: StatusItj.DISETUJUI,
        diputuskan_at: { gte: currWib.start, lt: currWib.end },
      },
      _count: { _all: true },
    }),
    prisma.transaksi.groupBy({
      by: ["marketing_id"],
      where: closedDealWhere(currDateOnly.start, currDateOnly.end),
      _count: { _all: true },
    }),

    // Lead per Sumber (Cohort of the month)
    prisma.lead.groupBy({
      by: ["sumber"],
      where: { created_at: { gte: currWib.start, lt: currWib.end } },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["sumber"],
      where: {
        created_at: { gte: currWib.start, lt: currWib.end },
        itj: {
          some: {
            status: StatusItj.DISETUJUI,
            transaksi: {
              is: {
                closing_at: { not: null },
                status_transaksi: { not: TahapTransaksi.BATAL },
              },
            },
          },
        },
      },
      _count: { _all: true },
    }),

    // Pipeline (Snapshot)
    prisma.transaksi.groupBy({
      by: ["status_transaksi"],
      where: {
        status_transaksi: {
          in: [
            TahapTransaksi.PEMBERKASAN,
            TahapTransaksi.PROSES_BANK,
            TahapTransaksi.PEMBAYARAN,
            TahapTransaksi.AKAD_AJB,
            TahapTransaksi.PEMBANGUNAN,
          ],
        },
      },
      _count: { _all: true },
      _sum: { harga_deal: true },
    }),

    // Inventory (Snapshot)
    prisma.masterUnit.groupBy({
      by: ["status_unit"],
      _count: { _all: true },
    }),
  ]);

  // ─── 1. ASSEMBLE KPI ROW ───
  const currClosingNilai = Number(currClosingSum._sum.harga_deal || 0);
  const prevClosingNilai = Number(prevClosingSum._sum.harga_deal || 0);
  const currKasMasukNominal = Number(currKasMasukSum._sum.nominal || 0);
  const prevKasMasukNominal = Number(prevKasMasukSum._sum.nominal || 0);

  const kpis = {
    leadMasuk: computeComparison(currLeadMasuk, prevLeadMasuk),
    surveiSelesai: computeComparison(
      currSurveiSelesai,
      prevSurveiSelesai,
      `${currSurveiJadwal} dijadwalkan`
    ),
    itjDisetujui: computeComparison(
      currItjDisetujui,
      prevItjDisetujui,
      `${currItjDiajukan} diajukan`
    ),
    closing: computeComparison(currClosingCount, prevClosingCount),
    nilaiClosing: computeComparison(currClosingNilai, prevClosingNilai),
    kasMasuk: computeComparison(
      currKasMasukNominal,
      prevKasMasukNominal,
      "Tanggal bayar, tanpa void"
    ),
  };

  // ─── 2. ASSEMBLE FUNNEL ───
  const funnelSteps: FunnelStep[] = [
    {
      key: "lead_masuk",
      label: "Lead Masuk",
      count: funnelTotalLeads,
      pctOfTotal: funnelTotalLeads > 0 ? 100 : 0,
      pctOfPrev: funnelTotalLeads > 0 ? 100 : 0,
    },
    {
      key: "survei_selesai",
      label: "Survei Selesai",
      count: funnelSurveiSelesai,
      pctOfTotal:
        funnelTotalLeads > 0 ? (funnelSurveiSelesai / funnelTotalLeads) * 100 : 0,
      pctOfPrev:
        funnelTotalLeads > 0 ? (funnelSurveiSelesai / funnelTotalLeads) * 100 : 0,
    },
    {
      key: "itj_diajukan",
      label: "ITJ Diajukan",
      count: funnelAnyItj,
      pctOfTotal:
        funnelTotalLeads > 0 ? (funnelAnyItj / funnelTotalLeads) * 100 : 0,
      pctOfPrev:
        funnelSurveiSelesai > 0
          ? (funnelAnyItj / funnelSurveiSelesai) * 100
          : 0,
    },
    {
      key: "itj_disetujui",
      label: "ITJ Disetujui",
      count: funnelItjDisetujui,
      pctOfTotal:
        funnelTotalLeads > 0 ? (funnelItjDisetujui / funnelTotalLeads) * 100 : 0,
      pctOfPrev:
        funnelAnyItj > 0 ? (funnelItjDisetujui / funnelAnyItj) * 100 : 0,
    },
    {
      key: "closing",
      label: "Closing Terjual",
      count: funnelClosing,
      pctOfTotal:
        funnelTotalLeads > 0 ? (funnelClosing / funnelTotalLeads) * 100 : 0,
      pctOfPrev:
        funnelItjDisetujui > 0 ? (funnelClosing / funnelItjDisetujui) * 100 : 0,
    },
  ];

  // ─── 3. ASSEMBLE PER-MARKETING PERFORMANCE ───
  const leadMasukMap = new Map<number, number>();
  for (const g of leadMasukGroups) {
    if (g.marketing_id) leadMasukMap.set(g.marketing_id, g._count._all);
  }

  const surveiJadwalMap = new Map<number, number>();
  for (const g of surveiJadwalGroups) {
    if (g.marketing_id) surveiJadwalMap.set(g.marketing_id, g._count._all);
  }

  const surveiSelesaiMap = new Map<number, number>();
  for (const g of surveiSelesaiGroups) {
    if (g.marketing_id) surveiSelesaiMap.set(g.marketing_id, g._count._all);
  }

  const itjDiajukanMap = new Map<number, number>();
  for (const g of itjDiajukanGroups) {
    if (g.marketing_id) itjDiajukanMap.set(g.marketing_id, g._count._all);
  }

  const itjDisetujuiMap = new Map<number, number>();
  for (const g of itjDisetujuiGroups) {
    if (g.marketing_id) itjDisetujuiMap.set(g.marketing_id, g._count._all);
  }

  const closingMap = new Map<number, number>();
  for (const g of closingGroups) {
    if (g.marketing_id) closingMap.set(g.marketing_id, g._count._all);
  }

  const marketingPerformanceRows: MarketingPerformanceSummary[] = [];

  for (const user of marketingUsers) {
    const lm = leadMasukMap.get(user.id) || 0;
    const sj = surveiJadwalMap.get(user.id) || 0;
    const ss = surveiSelesaiMap.get(user.id) || 0;
    const id = itjDiajukanMap.get(user.id) || 0;
    const is = itjDisetujuiMap.get(user.id) || 0;
    const cl = closingMap.get(user.id) || 0;

    const totalActivity = lm + sj + ss + id + is + cl;

    // Active users always shown; inactive users only shown if any non-zero metric
    if (user.isActive || totalActivity > 0) {
      marketingPerformanceRows.push({
        marketingId: user.id,
        nama: user.nama,
        username: user.username,
        noHp: user.no_hp,
        leadMasuk: lm,
        surveiJadwal: sj,
        surveiSelesai: ss,
        itjDiajukan: id,
        itjDisetujui: is,
        closing: cl,
      });
    }
  }

  // Sort by closing desc, then name asc
  marketingPerformanceRows.sort((a, b) => {
    if (b.closing !== a.closing) {
      return b.closing - a.closing;
    }
    return a.nama.localeCompare(b.nama, "id-ID");
  });

  const marketingTotals = marketingPerformanceRows.reduce(
    (acc, row) => {
      acc.leadMasuk += row.leadMasuk;
      acc.surveiJadwal += row.surveiJadwal;
      acc.surveiSelesai += row.surveiSelesai;
      acc.itjDiajukan += row.itjDiajukan;
      acc.itjDisetujui += row.itjDisetujui;
      acc.closing += row.closing;
      return acc;
    },
    {
      leadMasuk: 0,
      surveiJadwal: 0,
      surveiSelesai: 0,
      itjDiajukan: 0,
      itjDisetujui: 0,
      closing: 0,
    }
  );

  // ─── 4. ASSEMBLE LEAD PER SUMBER ───
  const sumberLabels: Record<SumberLead, string> = {
    [SumberLead.WALK_IN]: "Walk-in Kantor",
    [SumberLead.FACEBOOK_ADS]: "Facebook Ads",
    [SumberLead.TIKTOK]: "TikTok",
    [SumberLead.INSTAGRAM]: "Instagram",
    [SumberLead.WA_KANTOR]: "WhatsApp Kantor",
    [SumberLead.REFERRAL]: "Referral / Agen",
    [SumberLead.LAINNYA]: "Lainnya",
  };

  const closingSumberMap = new Map<SumberLead, number>();
  for (const g of sumberClosingGroups) {
    closingSumberMap.set(g.sumber, g._count._all);
  }

  const allSumberTypes = Object.values(SumberLead);
  const leadSources = allSumberTypes.map((sumber) => {
    const totalMatch = sumberTotalGroups.find((g) => g.sumber === sumber);
    const total = totalMatch ? totalMatch._count._all : 0;
    const closing = closingSumberMap.get(sumber) || 0;
    const pctClosing = total > 0 ? (closing / total) * 100 : 0;
    return {
      sumber,
      label: sumberLabels[sumber] || sumber,
      total,
      closing,
      pctClosing,
    };
  });

  leadSources.sort((a, b) => b.total - a.total);

  // ─── 5. ASSEMBLE ACTIVE PIPELINE (SNAPSHOT) ───
  const pipelineOrder: TahapTransaksi[] = [
    TahapTransaksi.PEMBERKASAN,
    TahapTransaksi.PROSES_BANK,
    TahapTransaksi.PEMBAYARAN,
    TahapTransaksi.AKAD_AJB,
    TahapTransaksi.PEMBANGUNAN,
  ];

  const pipelineLabels: Record<TahapTransaksi, string> = {
    [TahapTransaksi.PEMBERKASAN]: "Pemberkasan",
    [TahapTransaksi.PROSES_BANK]: "Proses bank",
    [TahapTransaksi.PEMBAYARAN]: "Pembayaran",
    [TahapTransaksi.AKAD_AJB]: "Akad / AJB",
    [TahapTransaksi.PEMBANGUNAN]: "Pembangunan",
    [TahapTransaksi.SERAH_TERIMA]: "Serah terima",
    [TahapTransaksi.BATAL]: "Batal",
  };

  const pipeline: PipelineStageSummary[] = pipelineOrder.map((stage) => {
    const found = pipelineGroups.find((g) => g.status_transaksi === stage);
    return {
      stage,
      label: pipelineLabels[stage] || stage,
      count: found ? found._count._all : 0,
      totalHargaDeal: Number(found?._sum.harga_deal || 0),
    };
  });

  // ─── 6. ASSEMBLE INVENTORY BY STATUS (SNAPSHOT) ───
  const inventoryLabels: Record<StatusUnit, string> = {
    [StatusUnit.AVAILABLE]: "Tersedia",
    [StatusUnit.HOLD]: "Hold",
    [StatusUnit.BOOKED]: "Booked",
    [StatusUnit.SOLD]: "Terjual",
  };

  const inventoryOrder: StatusUnit[] = [
    StatusUnit.AVAILABLE,
    StatusUnit.HOLD,
    StatusUnit.BOOKED,
    StatusUnit.SOLD,
  ];

  let totalUnits = 0;
  const inventoryItems: InventoryStatusSummary[] = inventoryOrder.map((status) => {
    const found = inventoryGroups.find((g) => g.status_unit === status);
    const count = found ? found._count._all : 0;
    totalUnits += count;
    return {
      status,
      label: inventoryLabels[status] || status,
      count,
    };
  });

  return {
    selectedMonth: currentKey,
    bulanLabel: bulanLabel(year, month),
    kpis,
    funnel: {
      totalLeads: funnelTotalLeads,
      steps: funnelSteps,
    },
    trend: trendDataResults,
    marketingPerformance: {
      rows: marketingPerformanceRows,
      totals: marketingTotals,
    },
    leadSources,
    pipeline,
    inventory: {
      items: inventoryItems,
      total: totalUnits,
    },
  };
}
