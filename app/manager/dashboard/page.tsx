// app/manager/dashboard/page.tsx
import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  Users,
  Calendar,
  FileCheck2,
  CheckCircle2,
  Banknote,
  ArrowRight,
  ArrowUpRight,
  Award,
} from "lucide-react";
import { requireManagerPage } from "@/lib/dashboard/guard";
import { parseMonthParam } from "@/lib/date/wib";
import { getManagerDashboardData } from "@/lib/dashboard/manager";
import {
  formatInt,
} from "@/lib/dashboard/format";
import { MonthPicker } from "@/components/manager/month-picker";
import { KpiCard } from "@/components/manager/kpi-card";
import { SectionCard } from "@/components/manager/section-card";
import { FunnelChart } from "@/components/manager/funnel-chart";
import { TrendChart } from "@/components/manager/trend-chart";

export const metadata: Metadata = {
  title: "Dashboard Penjualan Manajemen | NPKR Portal",
  description:
    "Ringkasan eksekutif penjualan perumahan: KPI prospek & survei, funnel kohort, tren closing tim marketing, dan inventori unit.",
};

interface DashboardPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ManagerDashboardPage({
  searchParams,
}: DashboardPageProps) {
  // Opt out of static rendering
  await connection();

  // Enforce MANAGER role server-side (redirects to /login or throws 404)
  await requireManagerPage();

  const resolvedParams = await searchParams;
  const rawBulan =
    typeof resolvedParams.bulan === "string" ? resolvedParams.bulan : undefined;

  const { year, month, key: currentMonthKey } = parseMonthParam(rawBulan);
  const data = await getManagerDashboardData(year, month);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ─── Page Header ─── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-mist shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-carbon-ink tracking-tight">
              Dashboard Manajemen
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-deep-teal border border-teal-200">
              Periode {data.bulanLabel}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate mt-1">
            Ringkasan metrik eksekutif prospek masuk, konversi survei, closing unit, persetujuan SP3K, pelaksanaan akad, dan ketersediaan inventori.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker currentMonth={currentMonthKey} />
          <Link
            href={`/manager/keuangan?bulan=${currentMonthKey}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-bone text-carbon-ink hover:bg-mist/80 transition-colors border border-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-teal"
          >
            <Banknote className="w-3.5 h-3.5 text-deep-teal" />
            <span>Laporan Keuangan</span>
          </Link>
          <Link
            href={`/manager/laporan?bulan=${currentMonthKey}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-deep-teal text-white hover:bg-teal-700 transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-teal"
          >
            <span>Buka Laporan</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ─── 1. Sales & Operational KPI Row (5 Cards) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard
          title="Lead Masuk"
          value={formatInt(data.kpis.leadMasuk.current)}
          comparison={data.kpis.leadMasuk}
          icon={<Users className="w-4 h-4" />}
        />
        <KpiCard
          title="Survei Selesai"
          value={formatInt(data.kpis.surveiSelesai.current)}
          comparison={data.kpis.surveiSelesai}
          icon={<Calendar className="w-4 h-4" />}
        />
        <KpiCard
          title="Closing Penjualan"
          value={formatInt(data.kpis.closing.current)}
          comparison={data.kpis.closing}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <KpiCard
          title="SP3K"
          value={formatInt(data.kpis.sp3k.current)}
          comparison={data.kpis.sp3k}
          icon={<FileCheck2 className="w-4 h-4" />}
        />
        <KpiCard
          title="Akad"
          value={formatInt(data.kpis.akad.current)}
          comparison={data.kpis.akad}
          icon={<Award className="w-4 h-4" />}
        />
      </div>

      {/* ─── 2 & 3. Funnel & Trend Charts Row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel (Cohort View) */}
        <SectionCard
          title="Funnel Konversi Prospek (Kohort Bulan Terpilih)"
          subtitle="Melacak konversi lead yang dibuat pada bulan terpilih sampai hari ini. Berbeda dengan metrik berbasis tanggal peristiwa (event-date)."
        >
          <FunnelChart
            steps={data.funnel.steps}
            totalLeads={data.funnel.totalLeads}
          />
        </SectionCard>

        {/* Trend Chart (6 Months) */}
        <SectionCard
          title="Tren Performa 6 Bulan Terakhir"
          subtitle="Grafik komparasi bulanan Lead Masuk, Survei Selesai, dan Closing Penjualan."
        >
          <TrendChart data={data.trend} />
        </SectionCard>
      </div>

      {/* ─── 4. Per-Marketing Performance Table ─── */}
      <SectionCard
        title="Kinerja Penjualan Tim Marketing"
        subtitle={`Performa bulanan berbasis tanggal aktivitas (event-date) pada periode ${data.bulanLabel}.`}
        action={
          <Link
            href={`/manager/laporan?tab=marketing&bulan=${currentMonthKey}`}
            className="text-xs font-semibold text-deep-teal hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-teal rounded-md"
          >
            <span>Lihat laporan lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-mist bg-white shadow-2xs">
          <table className="w-full text-xs text-carbon-ink divide-y divide-mist">
            <thead className="bg-bone/70 text-slate font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th scope="col" className="px-3.5 py-3 text-left">Marketing</th>
                <th scope="col" className="px-3.5 py-3 text-left">Username</th>
                <th scope="col" className="px-3.5 py-3 text-left">No. HP</th>
                <th scope="col" className="px-3.5 py-3 text-right">Lead Masuk</th>
                <th scope="col" className="px-3.5 py-3 text-right">Survei Jadwal</th>
                <th scope="col" className="px-3.5 py-3 text-right">Survei Selesai</th>
                <th scope="col" className="px-3.5 py-3 text-right font-bold text-deep-teal">Closing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist/60 bg-white">
              {data.marketingPerformance.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate bg-bone/20">
                    Tidak ada aktivitas marketing untuk periode ini.
                  </td>
                </tr>
              ) : (
                data.marketingPerformance.rows.map((row) => (
                  <tr key={row.marketingId} className="hover:bg-bone/40 transition-colors">
                    <td className="px-3.5 py-2.5 font-semibold text-carbon-ink whitespace-nowrap">
                      {row.nama}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate font-mono text-[11px]">
                      {row.username}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate whitespace-nowrap">
                      {row.noHp}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-medium">{formatInt(row.leadMasuk)}</td>
                    <td className="px-3.5 py-2.5 text-right font-medium">{formatInt(row.surveiJadwal)}</td>
                    <td className="px-3.5 py-2.5 text-right font-medium">{formatInt(row.surveiSelesai)}</td>
                    <td className="px-3.5 py-2.5 text-right font-bold text-deep-teal">
                      {formatInt(row.closing)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {data.marketingPerformance.rows.length > 0 && (
              <tfoot className="bg-bone/80 font-bold border-t-2 border-mist text-carbon-ink">
                <tr>
                  <td className="px-3.5 py-3 text-left">TOTAL</td>
                  <td className="px-3.5 py-3"></td>
                  <td className="px-3.5 py-3"></td>
                  <td className="px-3.5 py-3 text-right">{formatInt(data.marketingPerformance.totals.leadMasuk)}</td>
                  <td className="px-3.5 py-3 text-right">{formatInt(data.marketingPerformance.totals.surveiJadwal)}</td>
                  <td className="px-3.5 py-3 text-right">{formatInt(data.marketingPerformance.totals.surveiSelesai)}</td>
                  <td className="px-3.5 py-3 text-right text-deep-teal">{formatInt(data.marketingPerformance.totals.closing)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </SectionCard>

      {/* ─── 5, 6 & 7. Sumber Lead, Pipeline & Inventory Row ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Lead per Sumber (Cohort) */}
        <SectionCard
          title="Efektivitas Saluran Prospek"
          subtitle={`Lead yang dibuat pada ${data.bulanLabel} dan yang telah mencapai closing.`}
        >
          <div className="space-y-3">
            {data.leadSources.map((item) => (
              <div key={item.sumber} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-carbon-ink">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-carbon-ink">{formatInt(item.total)} lead</span>
                    <span className="text-[11px] text-deep-teal font-semibold">
                      ({formatInt(item.closing)} closing, {item.pctClosing.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-bone rounded-full overflow-hidden">
                  <div
                    className="h-full bg-deep-teal rounded-full"
                    style={{
                      width: `${data.kpis.leadMasuk.current > 0 ? (item.total / data.kpis.leadMasuk.current) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Active Pipeline (Snapshot) */}
        <SectionCard
          title="Pipeline Transaksi Berjalan"
          subtitle="Posisi saat ini untuk transaksi dalam proses (di luar Batal & Serah Terima)."
          action={
            <Link
              href={`/manager/keuangan?bulan=${currentMonthKey}`}
              className="text-xs font-semibold text-deep-teal hover:underline flex items-center gap-1"
            >
              <span>Finansial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          <div className="space-y-3">
            {data.pipeline.map((item) => (
              <div key={item.stage} className="p-3 rounded-xl bg-bone/30 border border-mist/80 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-carbon-ink">{item.label}</span>
                  <span className="font-bold text-deep-teal bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                    {formatInt(item.count)} unit
                  </span>
                </div>
                <div className="text-[11px] text-slate">
                  Status operasional berkas berjalan
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Unit Inventory (Snapshot) */}
        <SectionCard
          title="Status Inventori Unit"
          subtitle="Posisi ketersediaan fisik seluruh unit properti per hari ini."
        >
          <div className="space-y-3">
            {data.inventory.items.map((item) => {
              const pct = data.inventory.total > 0 ? (item.count / data.inventory.total) * 100 : 0;
              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-carbon-ink">{item.label}</span>
                    <span className="font-bold text-carbon-ink">
                      {formatInt(item.count)} unit ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-bone rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        item.status === "AVAILABLE"
                          ? "bg-emerald-600"
                          : item.status === "HOLD"
                          ? "bg-amber-500"
                          : item.status === "BOOKED"
                          ? "bg-sky-500"
                          : "bg-slate-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-mist flex justify-between text-xs font-bold text-carbon-ink">
              <span>Total Unit</span>
              <span>{formatInt(data.inventory.total)} unit</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
