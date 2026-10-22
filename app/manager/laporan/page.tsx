// app/manager/laporan/page.tsx
import React from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import {
  FileSpreadsheet,
  Download,
  Info,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { requireManagerPage } from "@/lib/dashboard/guard";
import { parseMonthParam } from "@/lib/date/wib";
import {
  isValidReportTab,
  getReportByKey,
  ReportTabKey,
} from "@/lib/dashboard/reports";
import { MonthPicker } from "@/components/manager/month-picker";
import { ReportTabs } from "@/components/manager/report-tabs";
import { ReportTable } from "@/components/manager/report-table";

export const metadata: Metadata = {
  title: "Pusat Laporan Manajemen | NPKR Portal",
  description:
    "Pusat 9 laporan eksekutif: Kinerja marketing, Penjualan, Kas masuk, Piutang, Pembatalan, Bank KPR, Durasi SLA, Inventori, dan Sumber Lead.",
};

interface LaporanPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ManagerLaporanPage({
  searchParams,
}: LaporanPageProps) {
  // Opt out of static rendering
  await connection();

  // Enforce MANAGER role server-side (redirects to /login or throws 404)
  await requireManagerPage();

  const resolvedParams = await searchParams;
  const rawTab =
    typeof resolvedParams.tab === "string" ? resolvedParams.tab : undefined;
  const rawBulan =
    typeof resolvedParams.bulan === "string" ? resolvedParams.bulan : undefined;

  const tab: ReportTabKey = isValidReportTab(rawTab) ? rawTab : "marketing";
  const { year, month, key: currentMonthKey } = parseMonthParam(rawBulan);

  // Fetch report data based on active tab and period
  const report = await getReportByKey(tab, year, month);

  const exportUrl = `/manager/laporan/export?tab=${tab}&bulan=${currentMonthKey}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─── Page Header & Description ─── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-mist shadow-subtle">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 text-deep-teal flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-carbon-ink tracking-tight">
                  {report.title}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate mt-0.5 max-w-3xl">
                {report.description}
              </p>
            </div>
          </div>

          {/* Action buttons (Month picker & CSV Export) */}
          <div className="flex flex-wrap items-center gap-3">
            {report.isSnapshot ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-bone border border-mist text-xs font-semibold text-slate">
                <Clock className="w-4 h-4 text-deep-teal shrink-0" />
                <span>Posisi per hari ini</span>
              </div>
            ) : (
              <MonthPicker currentMonth={currentMonthKey} />
            )}

            <a
              href={exportUrl}
              download
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-mist text-carbon-ink hover:bg-bone hover:border-slate/30 transition-all shadow-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-teal"
            >
              <Download className="w-4 h-4 text-deep-teal shrink-0" />
              <span>Ekspor CSV</span>
            </a>
          </div>
        </div>
      </div>

      {/* ─── 9 Report Tabs Navigation ─── */}
      <ReportTabs activeTab={tab} currentMonth={currentMonthKey} />

      {/* ─── Report Content Tables ─── */}
      <div className="space-y-6">
        {report.tables.map((table, idx) => (
          <ReportTable key={idx} table={table} />
        ))}
      </div>

      {/* ─── Catatan Definisi Section ─── */}
      {report.notes && report.notes.length > 0 && (
        <div className="bg-bone/40 border border-mist p-5 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-carbon-ink">
            <Info className="w-4 h-4 text-deep-teal shrink-0" />
            <span>Catatan Definisi &amp; Aturan Perhitungan:</span>
          </div>
          <ul className="space-y-1.5 pl-6 text-xs text-slate list-disc">
            {report.notes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
