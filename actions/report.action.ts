// actions/report.action.ts
"use server";

import { auth } from "@/auth";
import {
  getMarketingReport,
  getPenjualanReport,
} from "@/lib/dashboard/reports";
import { getManagerDashboardData } from "@/lib/dashboard/manager";
import { formatDateOnly } from "@/lib/date/wib";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// ─── 1. Performa Marketing Data Types ───
export interface MarketingPerformanceRow {
  marketingId: number;
  namaMarketing: string;
  username: string;
  noHp: string;
  totalLeadMasuk: number;
  totalSurveiDijadwalkan: number;
  totalSurveiSelesai: number;
  totalItjDiajukan: number;
  totalItjDisetujui: number;
  totalClosing: number;
}

// ─── 2. Penjualan Closing Data Types ───
export interface SalesReportRow {
  tanggalClosing: string;
  namaCustomer: string;
  nikCustomer: string;
  noHpCustomer: string;
  blokUnit: string;
  tipeUnit: string;
  metodeBayar: string;
  hargaDeal: number;
  marketingPic: string;
}

// ─── 3. Sumber Lead Data Types ───
export interface LeadSourceRow {
  sumber: string;
  jumlahLeadMasuk: number;
  jumlahSurvei: number;
  jumlahClosing: number;
  persentaseClosing: string;
}

/**
 * Report 1: Laporan Performa Marketing (Delegates to lib/dashboard/reports.ts)
 */
export async function getMarketingPerformanceReport(
  month: number,
  year: number
): Promise<ActionResponse<MarketingPerformanceRow[]>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return {
      success: false,
      error: "Hanya Branch Manager atau Admin yang dapat mengekspor laporan.",
    };
  }

  try {
    const report = await getMarketingReport(year, month);
    const table = report.tables[0];
    const rows: MarketingPerformanceRow[] = table.rows.map((r) => ({
      marketingId: Number(r.marketing_id),
      namaMarketing: String(r.marketing),
      username: String(r.username),
      noHp: String(r.no_hp),
      totalLeadMasuk: Number(r.lead_masuk),
      totalSurveiDijadwalkan: Number(r.survei_jadwal),
      totalSurveiSelesai: Number(r.survei_selesai),
      totalItjDiajukan: Number(r.itj_diajukan),
      totalItjDisetujui: Number(r.itj_disetujui),
      totalClosing: Number(r.closing),
    }));

    return {
      success: true,
      data: rows,
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal memproses laporan performa marketing.";
    return { success: false, error: errorMsg };
  }
}

/**
 * Report 2: Laporan Penjualan (Delegates to lib/dashboard/reports.ts)
 */
export async function getSalesReport(
  month: number,
  year: number
): Promise<ActionResponse<SalesReportRow[]>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return {
      success: false,
      error: "Hanya Branch Manager atau Admin yang dapat mengekspor laporan.",
    };
  }

  try {
    const report = await getPenjualanReport(year, month);
    const detailTable = report.tables[1]; // Detail Transaksi Closing
    const rows: SalesReportRow[] = detailTable.rows.map((r) => ({
      tanggalClosing: formatDateOnly(r.tgl_closing as string),
      namaCustomer: String(r.konsumen),
      nikCustomer: "",
      noHpCustomer: "",
      blokUnit: String(r.unit),
      tipeUnit: String(r.tipe),
      metodeBayar: String(r.skema),
      hargaDeal: Number(r.harga_deal),
      marketingPic: String(r.marketing),
    }));

    return {
      success: true,
      data: rows,
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal memproses laporan penjualan.";
    return { success: false, error: errorMsg };
  }
}

/**
 * Report 3: Laporan Sumber Lead (Delegates to lib/dashboard/manager.ts)
 */
export async function getLeadSourceReport(
  month: number,
  year: number
): Promise<ActionResponse<LeadSourceRow[]>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return {
      success: false,
      error: "Hanya Branch Manager atau Admin yang dapat mengekspor laporan.",
    };
  }

  try {
    const data = await getManagerDashboardData(year, month);
    const rows: LeadSourceRow[] = data.leadSources.map((ls) => ({
      sumber: ls.label,
      jumlahLeadMasuk: ls.total,
      jumlahSurvei: 0,
      jumlahClosing: ls.closing,
      persentaseClosing: `${ls.pctClosing.toFixed(1)}%`,
    }));

    return {
      success: true,
      data: rows,
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal memproses laporan sumber lead.";
    return { success: false, error: errorMsg };
  }
}
