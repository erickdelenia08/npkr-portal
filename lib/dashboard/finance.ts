// lib/dashboard/finance.ts
/**
 * ============================================================================
 * NPKR PORTAL - MANAGER FINANCE DASHBOARD & REPORT METRICS
 * ============================================================================
 * Dedicated executive financial metrics: Nilai Closing, Realisasi Kas Masuk,
 * Outstanding Piutang, Komposisi Penerimaan, dan Financial Pipeline.
 */

import { prisma } from "@/lib/prisma";
import { TahapTransaksi, MetodeBayar } from "@/generated/prisma";
import {
  monthRangeDateOnly,
  shiftMonth,
  bulanLabel,
  toWibDay,
} from "@/lib/date/wib";
import { humanizeEnum } from "@/lib/dashboard/format";
import { closedDealWhere, type MetricComparison } from "@/lib/dashboard/manager";

export interface FinancialPipelineStage {
  stage: TahapTransaksi;
  label: string;
  count: number;
  totalHargaDeal: number;
  totalTerbayar: number;
  sisaPiutang: number;
}

export interface PaymentBreakdownItem {
  key: string;
  label: string;
  count: number;
  totalNominal: number;
  pct: number;
}

export interface RecentPaymentItem {
  id: number;
  tglBayar: string;
  noKwitansi: string;
  konsumen: string;
  unit: string;
  jenis: string;
  cara: string;
  nominal: number;
  adminPenerima: string;
}

export interface ManagerFinanceData {
  selectedMonth: string;
  bulanLabel: string;
  kpis: {
    nilaiClosing: MetricComparison;
    kasMasuk: MetricComparison;
    closingCount: number;
    prevClosingCount: number;
    avgClosingValue: number;
    totalPiutangBerjalan: number;
    totalHargaDealAktif: number;
    totalTerbayarAktif: number;
    totalTransaksiAktif: number;
  };
  penerimaanPerJenis: PaymentBreakdownItem[];
  penerimaanPerCara: PaymentBreakdownItem[];
  financialPipeline: FinancialPipelineStage[];
  recentPayments: RecentPaymentItem[];
}

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

export async function getManagerFinanceData(
  year: number,
  month: number
): Promise<ManagerFinanceData> {
  const currDateOnly = monthRangeDateOnly(year, month);
  const currentKey = `${year}-${String(month).padStart(2, "0")}`;
  const prevKey = shiftMonth(currentKey, -1);
  const [prevYearStr, prevMonthStr] = prevKey.split("-");
  const prevYear = parseInt(prevYearStr, 10);
  const prevMonth = parseInt(prevMonthStr, 10);
  const prevDateOnly = monthRangeDateOnly(prevYear, prevMonth);

  const [
    currNilaiClosingAgg,
    currClosingCount,
    currKasMasukAgg,
    prevNilaiClosingAgg,
    prevClosingCount,
    prevKasMasukAgg,
    monthPayments,
    activeTransactions,
  ] = await Promise.all([
    // 1. Current Nilai Closing
    prisma.transaksi.aggregate({
      _sum: { harga_deal: true },
      where: closedDealWhere(currDateOnly.start, currDateOnly.end),
    }),
    // 2. Current Closing Count
    prisma.transaksi.count({
      where: closedDealWhere(currDateOnly.start, currDateOnly.end),
    }),
    // 3. Current Kas Masuk
    prisma.pembayaran.aggregate({
      _sum: { nominal: true },
      where: {
        is_void: false,
        tgl_bayar: { gte: currDateOnly.start, lt: currDateOnly.end },
      },
    }),
    // 4. Previous Nilai Closing
    prisma.transaksi.aggregate({
      _sum: { harga_deal: true },
      where: closedDealWhere(prevDateOnly.start, prevDateOnly.end),
    }),
    // 5. Previous Closing Count
    prisma.transaksi.count({
      where: closedDealWhere(prevDateOnly.start, prevDateOnly.end),
    }),
    // 6. Previous Kas Masuk
    prisma.pembayaran.aggregate({
      _sum: { nominal: true },
      where: {
        is_void: false,
        tgl_bayar: { gte: prevDateOnly.start, lt: prevDateOnly.end },
      },
    }),
    // 7. Detail payments for the selected month
    prisma.pembayaran.findMany({
      where: {
        is_void: false,
        tgl_bayar: { gte: currDateOnly.start, lt: currDateOnly.end },
      },
      include: {
        transaksi: {
          include: {
            customer: true,
            unit: true,
          },
        },
        penerima: true,
      },
      orderBy: { tgl_bayar: "desc" },
    }),
    // 8. Active transactions for piutang & financial pipeline
    prisma.transaksi.findMany({
      where: {
        status_transaksi: {
          notIn: [TahapTransaksi.BATAL, TahapTransaksi.SERAH_TERIMA],
        },
      },
      include: {
        customer: true,
        unit: true,
        pembayaran: {
          where: { is_void: false },
          select: { nominal: true },
        },
      },
    }),
  ]);

  const currNilaiClosingVal = Number(currNilaiClosingAgg._sum.harga_deal || 0);
  const prevNilaiClosingVal = Number(prevNilaiClosingAgg._sum.harga_deal || 0);

  const currKasMasukVal = Number(currKasMasukAgg._sum.nominal || 0);
  const prevKasMasukVal = Number(prevKasMasukAgg._sum.nominal || 0);

  const nilaiClosingComp = computeComparison(
    currNilaiClosingVal,
    prevNilaiClosingVal,
    "Total nilai deal dari closing yang tercatat pada bulan ini."
  );

  const kasMasukComp = computeComparison(
    currKasMasukVal,
    prevKasMasukVal,
    "Total kas masuk dari seluruh setoran valid bulan ini."
  );

  const avgClosingValue =
    currClosingCount > 0 ? currNilaiClosingVal / currClosingCount : 0;

  // Breakdown Penerimaan Kas Bulan Ini
  const jenisMap = new Map<string, { count: number; total: number }>();
  const caraMap = new Map<string, { count: number; total: number }>();
  const recentPayments: RecentPaymentItem[] = [];

  for (const p of monthPayments) {
    const nom = Number(p.nominal);

    // Jenis
    const jKey = p.jenis_pembayaran;
    const jCurr = jenisMap.get(jKey) || { count: 0, total: 0 };
    jenisMap.set(jKey, { count: jCurr.count + 1, total: jCurr.total + nom });

    // Cara Bayar
    const cKey = p.cara_bayar;
    const cCurr = caraMap.get(cKey) || { count: 0, total: 0 };
    caraMap.set(cKey, { count: cCurr.count + 1, total: cCurr.total + nom });

    if (recentPayments.length < 15) {
      recentPayments.push({
        id: p.id,
        tglBayar: toWibDay(p.tgl_bayar),
        noKwitansi: p.no_kwitansi,
        konsumen: p.transaksi.customer.nama_ktp,
        unit: p.transaksi.unit.blok,
        jenis: humanizeEnum(p.jenis_pembayaran),
        cara: humanizeEnum(p.cara_bayar),
        nominal: nom,
        adminPenerima: p.penerima.nama,
      });
    }
  }

  const penerimaanPerJenis: PaymentBreakdownItem[] = Array.from(jenisMap.entries())
    .map(([key, item]) => ({
      key,
      label: humanizeEnum(key),
      count: item.count,
      totalNominal: item.total,
      pct: currKasMasukVal > 0 ? (item.total / currKasMasukVal) * 100 : 0,
    }))
    .sort((a, b) => b.totalNominal - a.totalNominal);

  const penerimaanPerCara: PaymentBreakdownItem[] = Array.from(caraMap.entries())
    .map(([key, item]) => ({
      key,
      label: humanizeEnum(key),
      count: item.count,
      totalNominal: item.total,
      pct: currKasMasukVal > 0 ? (item.total / currKasMasukVal) * 100 : 0,
    }))
    .sort((a, b) => b.totalNominal - a.totalNominal);

  // Financial Pipeline & Piutang Berjalan
  const pipelineOrder: TahapTransaksi[] = [
    TahapTransaksi.PEMBERKASAN,
    TahapTransaksi.PROSES_BANK,
    TahapTransaksi.PEMBAYARAN,
    TahapTransaksi.AKAD_AJB,
    TahapTransaksi.PEMBANGUNAN,
  ];

  const pipelineMap = new Map<
    TahapTransaksi,
    { count: number; totalDeal: number; totalPaid: number }
  >();

  for (const st of pipelineOrder) {
    pipelineMap.set(st, { count: 0, totalDeal: 0, totalPaid: 0 });
  }

  let totalHargaDealAktif = 0;
  let totalTerbayarAktif = 0;

  for (const tx of activeTransactions) {
    const deal = Number(tx.harga_deal);
    const paid = tx.pembayaran.reduce((sum, p) => sum + Number(p.nominal), 0);

    totalHargaDealAktif += deal;
    totalTerbayarAktif += paid;

    if (pipelineMap.has(tx.status_transaksi)) {
      const entry = pipelineMap.get(tx.status_transaksi)!;
      entry.count += 1;
      entry.totalDeal += deal;
      entry.totalPaid += paid;
    }
  }

  const totalPiutangBerjalan = Math.max(0, totalHargaDealAktif - totalTerbayarAktif);

  const financialPipeline: FinancialPipelineStage[] = pipelineOrder.map((st) => {
    const entry = pipelineMap.get(st)!;
    return {
      stage: st,
      label: humanizeEnum(st),
      count: entry.count,
      totalHargaDeal: entry.totalDeal,
      totalTerbayar: entry.totalPaid,
      sisaPiutang: Math.max(0, entry.totalDeal - entry.totalPaid),
    };
  });

  const selectedMonthKey = `${year}-${String(month).padStart(2, "0")}`;

  return {
    selectedMonth: selectedMonthKey,
    bulanLabel: bulanLabel(year, month),
    kpis: {
      nilaiClosing: nilaiClosingComp,
      kasMasuk: kasMasukComp,
      closingCount: currClosingCount,
      prevClosingCount,
      avgClosingValue,
      totalPiutangBerjalan,
      totalHargaDealAktif,
      totalTerbayarAktif,
      totalTransaksiAktif: activeTransactions.length,
    },
    penerimaanPerJenis,
    penerimaanPerCara,
    financialPipeline,
    recentPayments,
  };
}
