// app/manager/keuangan/page.tsx
import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  Banknote,
  Trophy,
  Receipt,
  Wallet,
  ArrowRight,
  ArrowUpRight,
  LayoutDashboard,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Layers,
  Building2,
} from "lucide-react";
import { requireManagerPage } from "@/lib/dashboard/guard";
import { parseMonthParam } from "@/lib/date/wib";
import { getManagerFinanceData } from "@/lib/dashboard/finance";
import {
  formatInt,
  formatIdr,
  formatCompactIdr,
} from "@/lib/dashboard/format";
import { MonthPicker } from "@/components/manager/month-picker";
import { KpiCard } from "@/components/manager/kpi-card";
import { SectionCard } from "@/components/manager/section-card";

export const metadata: Metadata = {
  title: "Laporan Keuangan Eksekutif | NPKR Portal",
  description:
    "Ringkasan eksekutif keuangan: Nilai transaksi closing, realisasi kas masuk, outstanding piutang, dan pipeline finansial.",
};

interface FinancePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ManagerFinancePage({
  searchParams,
}: FinancePageProps) {
  // Opt out of static rendering
  await connection();

  // Enforce MANAGER role server-side
  await requireManagerPage();

  const resolvedParams = await searchParams;
  const rawBulan =
    typeof resolvedParams.bulan === "string" ? resolvedParams.bulan : undefined;

  const { year, month, key: currentMonthKey } = parseMonthParam(rawBulan);
  const data = await getManagerFinanceData(year, month);

  // Static mock comparison for metrics that represent static snapshots
  const piutangComparison = {
    current: data.kpis.totalPiutangBerjalan,
    previous: data.kpis.totalPiutangBerjalan,
    diff: 0,
    pct: 0,
    label: `Dari ${formatInt(data.kpis.totalTransaksiAktif)} transaksi aktif`,
    isPositive: true,
  };

  const avgTicketComparison = {
    current: data.kpis.avgClosingValue,
    previous: data.kpis.avgClosingValue,
    diff: 0,
    pct: 0,
    label: `${formatInt(data.kpis.closingCount)} unit closing bulan ini`,
    isPositive: true,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ─── Page Header ─── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-mist shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-carbon-ink tracking-tight">
              Laporan Keuangan Eksekutif
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-deep-teal border border-teal-200">
              Periode {data.bulanLabel}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate mt-1">
            Analisis arus kas masuk riil, komitmen omzet transaksi closing, outstanding piutang berjalan, dan financial pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker currentMonth={currentMonthKey} />
          <Link
            href={`/manager/dashboard?bulan=${currentMonthKey}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-bone text-carbon-ink hover:bg-mist/80 transition-colors border border-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-teal"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-deep-teal" />
            <span>Dashboard Penjualan</span>
          </Link>
          <Link
            href={`/manager/laporan?tab=kas&bulan=${currentMonthKey}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-deep-teal text-white hover:bg-teal-700 transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-teal"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Buku Kas Lengkap</span>
          </Link>
        </div>
      </div>

      {/* ─── 1. Finance KPI Cards (4 Cards) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Nilai Closing (Omzet)"
          value={formatCompactIdr(data.kpis.nilaiClosing.current)}
          comparison={data.kpis.nilaiClosing}
          icon={<Trophy className="w-4 h-4" />}
        />
        <KpiCard
          title="Kas Masuk Riil"
          value={formatCompactIdr(data.kpis.kasMasuk.current)}
          comparison={data.kpis.kasMasuk}
          icon={<Banknote className="w-4 h-4" />}
        />
        <KpiCard
          title="Rata-rata Nilai Deal"
          value={formatCompactIdr(data.kpis.avgClosingValue)}
          comparison={avgTicketComparison}
          icon={<Receipt className="w-4 h-4" />}
        />
        <KpiCard
          title="Piutang Berjalan"
          value={formatCompactIdr(data.kpis.totalPiutangBerjalan)}
          comparison={piutangComparison}
          icon={<Wallet className="w-4 h-4" />}
        />
      </div>

      {/* ─── 2. Breakdown Penerimaan Kas: Jenis & Cara Bayar ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Komposisi per Jenis Pembayaran */}
        <SectionCard
          title="Komposisi Kas per Jenis Setoran"
          subtitle={`Rincian nominal penerimaan kas masuk pada periode ${data.bulanLabel}.`}
          action={
            <Link
              href={`/manager/laporan?tab=kas&bulan=${currentMonthKey}`}
              className="text-xs font-semibold text-deep-teal hover:underline flex items-center gap-1"
            >
              <span>Detail kas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {data.penerimaanPerJenis.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate bg-bone/20 rounded-xl">
              Belum ada setoran kas yang tercatat pada periode ini.
            </div>
          ) : (
            <div className="space-y-3.5">
              {data.penerimaanPerJenis.map((item) => (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-carbon-ink">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate font-medium">
                        {formatInt(item.count)}x
                      </span>
                      <span className="font-bold text-carbon-ink">
                        {formatIdr(item.totalNominal)}
                      </span>
                      <span className="text-[11px] font-semibold text-deep-teal">
                        ({item.pct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-bone rounded-full overflow-hidden">
                    <div
                      className="h-full bg-deep-teal rounded-full transition-all"
                      style={{ width: `${Math.min(100, item.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Komposisi per Cara Bayar & Ringkasan Likuiditas */}
        <SectionCard
          title="Metode Penerimaan & Likuiditas"
          subtitle="Distribusi pembayaran via transfer bank vs tunai dan ringkasan penagihan."
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {data.penerimaanPerCara.map((item) => (
                <div
                  key={item.key}
                  className="p-3.5 rounded-xl border border-mist bg-bone/30 space-y-1"
                >
                  <span className="text-[11px] font-semibold text-slate uppercase tracking-wider">
                    {item.label}
                  </span>
                  <div className="text-base sm:text-lg font-bold text-carbon-ink">
                    {formatIdr(item.totalNominal)}
                  </div>
                  <div className="text-[11px] text-deep-teal font-medium">
                    {formatInt(item.count)} transaksi ({item.pct.toFixed(1)}%)
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-mist/80 bg-white p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate">Total Nilai Transaksi Aktif</span>
                <span className="font-bold text-carbon-ink">
                  {formatIdr(data.kpis.totalHargaDealAktif)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate">Total Dana yang Sudah Diterima</span>
                <span className="font-bold text-emerald-700">
                  {formatIdr(data.kpis.totalTerbayarAktif)}
                </span>
              </div>
              <div className="pt-2 border-t border-mist flex items-center justify-between font-semibold">
                <span className="text-carbon-ink">Outstanding Piutang (Kolektibilitas)</span>
                <span className="font-extrabold text-rose-700">
                  {formatIdr(data.kpis.totalPiutangBerjalan)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                href={`/manager/laporan?tab=piutang`}
                className="text-xs font-semibold text-deep-teal hover:underline flex items-center gap-1"
              >
                <span>Buka Jadwal Penagihan &amp; Aging Piutang</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ─── 3. Financial Pipeline (Nilai Finansial per Tahap) ─── */}
      <SectionCard
        title="Pipeline Nilai Finansial Berjalan"
        subtitle="Distribusi total nilai transaksi deal, dana terbayar, dan sisa piutang pada setiap tahapan operasional."
      >
        <div className="overflow-x-auto rounded-xl border border-mist bg-white shadow-2xs">
          <table className="w-full text-xs text-carbon-ink divide-y divide-mist">
            <thead className="bg-bone/70 text-slate font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th scope="col" className="px-4 py-3 text-left">Tahap Transaksi</th>
                <th scope="col" className="px-4 py-3 text-right">Unit Aktif</th>
                <th scope="col" className="px-4 py-3 text-right">Total Nilai Deal</th>
                <th scope="col" className="px-4 py-3 text-right">Total Kas Terbayar</th>
                <th scope="col" className="px-4 py-3 text-right">Sisa Piutang</th>
                <th scope="col" className="px-4 py-3 text-right">% Realisasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist/60 bg-white">
              {data.financialPipeline.map((st) => {
                const pct =
                  st.totalHargaDeal > 0
                    ? (st.totalTerbayar / st.totalHargaDeal) * 100
                    : 0;

                return (
                  <tr key={st.stage} className="hover:bg-bone/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-carbon-ink whitespace-nowrap">
                      {st.label}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <span className="inline-block px-2 py-0.5 rounded bg-teal-50 text-deep-teal font-bold border border-teal-200 text-[11px]">
                        {formatInt(st.count)} unit
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-carbon-ink whitespace-nowrap">
                      {formatIdr(st.totalHargaDeal)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                      {formatIdr(st.totalTerbayar)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-700 whitespace-nowrap">
                      {formatIdr(st.sisaPiutang)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate">
                      {pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-bone/80 font-bold border-t-2 border-mist text-carbon-ink">
              <tr>
                <td className="px-4 py-3 text-left">TOTAL PIPELINE</td>
                <td className="px-4 py-3 text-right font-extrabold text-deep-teal">
                  {formatInt(data.kpis.totalTransaksiAktif)} unit
                </td>
                <td className="px-4 py-3 text-right font-extrabold">
                  {formatIdr(data.kpis.totalHargaDealAktif)}
                </td>
                <td className="px-4 py-3 text-right font-extrabold text-emerald-700">
                  {formatIdr(data.kpis.totalTerbayarAktif)}
                </td>
                <td className="px-4 py-3 text-right font-extrabold text-rose-700">
                  {formatIdr(data.kpis.totalPiutangBerjalan)}
                </td>
                <td className="px-4 py-3 text-right">
                  {data.kpis.totalHargaDealAktif > 0
                    ? `${((data.kpis.totalTerbayarAktif / data.kpis.totalHargaDealAktif) * 100).toFixed(1)}%`
                    : "0%"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>

      {/* ─── 4. Setoran Kas Masuk Terbaru Bulan Ini ─── */}
      <SectionCard
        title="Mutasi Kas Masuk Terbaru"
        subtitle={`Daftar kwitansi pembayaran masuk yang berhasil diverifikasi pada bulan ${data.bulanLabel}.`}
        action={
          <Link
            href={`/manager/laporan?tab=kas&bulan=${currentMonthKey}`}
            className="text-xs font-semibold text-deep-teal hover:underline flex items-center gap-1"
          >
            <span>Buka seluruh kwitansi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-mist bg-white shadow-2xs">
          <table className="w-full text-xs text-carbon-ink divide-y divide-mist">
            <thead className="bg-bone/70 text-slate font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th scope="col" className="px-3.5 py-3 text-left">Tanggal</th>
                <th scope="col" className="px-3.5 py-3 text-left">No. Kwitansi</th>
                <th scope="col" className="px-3.5 py-3 text-left">Konsumen</th>
                <th scope="col" className="px-3.5 py-3 text-left">Unit</th>
                <th scope="col" className="px-3.5 py-3 text-left">Jenis Bayar</th>
                <th scope="col" className="px-3.5 py-3 text-left">Cara Bayar</th>
                <th scope="col" className="px-3.5 py-3 text-right">Nominal</th>
                <th scope="col" className="px-3.5 py-3 text-left">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist/60 bg-white">
              {data.recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate bg-bone/20">
                    Tidak ada transaksi pembayaran pada periode ini.
                  </td>
                </tr>
              ) : (
                data.recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-bone/40 transition-colors">
                    <td className="px-3.5 py-2.5 font-medium whitespace-nowrap text-slate">
                      {p.tglBayar}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] font-semibold text-carbon-ink whitespace-nowrap">
                      {p.noKwitansi}
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-carbon-ink whitespace-nowrap">
                      {p.konsumen}
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-deep-teal whitespace-nowrap">
                      {p.unit}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-bone border border-mist text-[11px] font-medium text-slate">
                        {p.jenis}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate whitespace-nowrap font-medium">
                      {p.cara}
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                      {formatIdr(p.nominal)}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate text-[11px] whitespace-nowrap">
                      {p.adminPenerima}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
