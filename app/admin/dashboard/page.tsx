import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  FileCheck2,
  Files,
  Landmark,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Clock,
  Building2,
  ReceiptText,
  Contact,
  Sparkles,
} from "lucide-react";
import {
  getAdminDashboardData,
  AdminDashboardData,
} from "@/actions/dashboard.admin.action";

export const metadata: Metadata = {
  title: "Dashboard Admin (Command Center) | NPKR Portal",
  description:
    "Pusat komando administrasi: pantau antrean validasi ITJ, verifikasi dokumen, dan proses KPR perbankan.",
};

const STATUS_KPR_BADGES: Record<string, { label: string; className: string }> = {
  DIAJUKAN: {
    label: "Diajukan",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  WAWANCARA: {
    label: "Wawancara",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  OTS: {
    label: "OTS (Survei)",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  VERIFIKASI: {
    label: "Verifikasi",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  SP3K: {
    label: "SP3K Terbit",
    className: "bg-teal-50 text-teal-700 border-teal-200",
  },
  DISETUJUI: {
    label: "Disetujui",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  DITOLAK: {
    label: "Ditolak",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  DIBATALKAN: {
    label: "Batal",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export default async function AdminDashboardPage() {
  const res = await getAdminDashboardData();

  if (!res.success || !res.data) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-xl border border-rose-200 shadow-subtle text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-carbon-ink">
            Gagal Memuat Dashboard
          </h2>
          <p className="text-xs text-slate mt-1">
            {res.message || "Terjadi kesalahan saat memuat data command center."}
          </p>
        </div>
        <Link
          href="/admin/transaksi"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-carbon-ink text-white text-xs font-semibold hover:bg-carbon-ink/90 transition-colors"
        >
          <span>Buka Transaksi</span>
        </Link>
      </div>
    );
  }

  const { metrics, widgets } = res.data;

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. TOP WELCOME & COMMAND CENTER HEADER */}
      <div className="bg-white p-5 rounded-xl border border-mist shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-carbon-ink text-white">
              Command Center
            </span>
            <span className="text-xs text-slate font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Monitoring Administrasi &amp; Berkas</span>
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight font-heading mt-1.5">
            Dashboard Administrasi &amp; Keuangan
          </h1>
          <p className="text-xs md:text-sm text-slate mt-0.5">
            Pantau hambatan berkas, antrean validasi tanda jadi, dan progres KPR perbankan secara real-time.
          </p>
        </div>

        {/* Quick Action Link */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/admin/transaksi"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-carbon-ink hover:bg-slate-800 text-white text-xs font-semibold transition-colors shadow-subtle"
          >
            <ShieldCheck className="w-4 h-4 text-prism-teal" />
            <span>Pantauan Transaksi</span>
          </Link>
        </div>
      </div>

      {/* 2. TOP SECTION: 3 LARGE SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Pending ITJ */}
        <div className="bg-gradient-to-br from-white to-amber-50/50 p-5 rounded-xl border border-amber-200 shadow-subtle flex flex-col justify-between transition-all hover:border-amber-300">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                ITJ &amp; Booking Baru
              </span>
              <span className="text-[11px] text-slate mt-0.5 block">
                Pemesanan unit yang baru masuk
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-extrabold text-carbon-ink tracking-tight">
              {metrics.pendingItjCount}
            </span>
            <Link
              href="/admin/transaksi"
              className="text-xs font-semibold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1 group"
            >
              <span>Transaksi</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Metric 2: Pending Docs */}
        <div className="bg-gradient-to-br from-white to-blue-50/50 p-5 rounded-xl border border-blue-200 shadow-subtle flex flex-col justify-between transition-all hover:border-blue-300">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                Dokumen Menunggu Cek
              </span>
              <span className="text-[11px] text-slate mt-0.5 block">
                Berkas konsumen &amp; legalitas
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
              <Files className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-extrabold text-carbon-ink tracking-tight">
              {metrics.pendingDocsCount}
            </span>
            <Link
              href="/admin/transaksi"
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 group"
            >
              <span>Periksa Berkas</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Metric 3: Active KPR */}
        <div className="bg-gradient-to-br from-white to-purple-50/50 p-5 rounded-xl border border-purple-200 shadow-subtle flex flex-col justify-between transition-all hover:border-purple-300">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block">
                Proses KPR Berjalan
              </span>
              <span className="text-[11px] text-slate mt-0.5 block">
                Fase wawancara, OTS &amp; verifikasi
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-mono text-3xl font-extrabold text-carbon-ink tracking-tight">
              {metrics.activeKprCount}
            </span>
            <Link
              href="/admin/transaksi"
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1 group"
            >
              <span>Pantau Bank</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT: 2X2 GRID OF MINI-TABLES & WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* WIDGET 1: Antrean Validasi ITJ */}
        <div className="bg-white rounded-xl border border-mist shadow-subtle flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-4 sm:p-5 border-b border-mist flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-carbon-ink font-heading">
                    ITJ &amp; Booking Terkini
                  </h2>
                  <p className="text-[11px] text-slate">
                    5 pemesanan unit terbaru yang aktif berjalan
                  </p>
                </div>
              </div>
              <Link
                href="/admin/transaksi"
                className="text-xs font-semibold text-deep-teal hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <span>Lihat Semua Transaksi</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mini Table 1 */}
            <div className="overflow-x-auto">
              {widgets.pendingItj.length === 0 ? (
                <div className="p-8 text-center text-slate space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                  <p className="text-xs font-semibold text-carbon-ink">
                    Semua ITJ sudah tervalidasi!
                  </p>
                  <p className="text-[11px]">
                    Tidak ada antrean tanda jadi yang menunggu verifikasi saat ini.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-mist text-slate font-semibold text-[11px]">
                      <th className="py-2.5 px-4">Konsumen</th>
                      <th className="py-2.5 px-3">Blok</th>
                      <th className="py-2.5 px-3 text-right">Nominal</th>
                      <th className="py-2.5 px-3">Diajukan</th>
                      <th className="py-2.5 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist">
                    {widgets.pendingItj.map((itj) => (
                      <tr
                        key={itj.id}
                        className="hover:bg-bone/40 transition-colors"
                      >
                        <td className="py-2.5 px-4">
                          <span className="font-semibold text-carbon-ink block">
                            {itj.leadNama}
                          </span>
                          <span className="text-[10px] text-slate font-mono">
                            {itj.leadNoHp}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[11px] bg-bone text-graphite border border-mist">
                            {itj.unitBlok}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-deep-teal">
                          {formatPrice(itj.nominal)}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate">
                          {itj.diajukanAt}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <Link
                            href="/admin/transaksi"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-carbon-ink hover:bg-slate-800 text-white text-[10px] font-semibold transition-colors"
                          >
                            <span>Lihat</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* WIDGET 2: Dokumen Menunggu Cek */}
        <div className="bg-white rounded-xl border border-mist shadow-subtle flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-4 sm:p-5 border-b border-mist flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Files className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-carbon-ink font-heading">
                    Dokumen Menunggu Cek
                  </h2>
                  <p className="text-[11px] text-slate">
                    Berkas konsumen yang perlu verifikasi keabsahan
                  </p>
                </div>
              </div>
              <Link
                href="/admin/transaksi"
                className="text-xs font-semibold text-deep-teal hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <span>Lihat Transaksi</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mini Table 2 */}
            <div className="overflow-x-auto">
              {widgets.pendingDocs.length === 0 ? (
                <div className="p-8 text-center text-slate space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                  <p className="text-xs font-semibold text-carbon-ink">
                    Semua dokumen terverifikasi!
                  </p>
                  <p className="text-[11px]">
                    Tidak ada berkas yang berstatus menunggu verifikasi saat ini.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-mist text-slate font-semibold text-[11px]">
                      <th className="py-2.5 px-4">Konsumen</th>
                      <th className="py-2.5 px-3">Blok</th>
                      <th className="py-2.5 px-3">Jenis Dokumen</th>
                      <th className="py-2.5 px-3">Diperbarui</th>
                      <th className="py-2.5 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist">
                    {widgets.pendingDocs.map((doc) => (
                      <tr
                        key={doc.id}
                        className="hover:bg-bone/40 transition-colors"
                      >
                        <td className="py-2.5 px-4 font-semibold text-carbon-ink">
                          {doc.customerNama}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[11px] bg-bone text-graphite border border-mist">
                            {doc.unitBlok}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-graphite">
                          <span className="font-medium">{doc.jenisLabel}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate">
                          {doc.uploadedAt}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <Link
                            href={`/admin/transaksi/${doc.transaksiId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold transition-colors"
                          >
                            <span>Periksa</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* WIDGET 3: Pantauan Bank (KPR) */}
        <div className="bg-white rounded-xl border border-mist shadow-subtle flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-4 sm:p-5 border-b border-mist flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-carbon-ink font-heading">
                    Pantauan Bank (KPR)
                  </h2>
                  <p className="text-[11px] text-slate">
                    Monitoring pengajuan KPR aktif konsumen ke perbankan
                  </p>
                </div>
              </div>
              <Link
                href="/admin/transaksi"
                className="text-xs font-semibold text-deep-teal hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mini Table 3 */}
            <div className="overflow-x-auto">
              {widgets.activeKpr.length === 0 ? (
                <div className="p-8 text-center text-slate space-y-1">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto opacity-70" />
                  <p className="text-xs font-semibold text-carbon-ink">
                    Tidak ada proses KPR aktif
                  </p>
                  <p className="text-[11px]">
                    Semua pengajuan KPR sudah tuntas disetujui atau belum ada pengajuan baru.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-mist text-slate font-semibold text-[11px]">
                      <th className="py-2.5 px-4">Bank</th>
                      <th className="py-2.5 px-3">Konsumen</th>
                      <th className="py-2.5 px-3">Blok</th>
                      <th className="py-2.5 px-3">Tahap KPR</th>
                      <th className="py-2.5 px-4 text-center">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist">
                    {widgets.activeKpr.map((kpr) => {
                      const badgeInfo = STATUS_KPR_BADGES[kpr.status] || {
                        label: kpr.status,
                        className: "bg-slate-100 text-slate-700 border-slate-200",
                      };

                      return (
                        <tr
                          key={kpr.id}
                          className="hover:bg-bone/40 transition-colors"
                        >
                          <td className="py-2.5 px-4 font-bold text-carbon-ink">
                            {kpr.bankNama}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-graphite">
                            {kpr.customerNama}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[11px] bg-bone text-graphite border border-mist">
                              {kpr.unitBlok}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeInfo.className}`}
                            >
                              {badgeInfo.label}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <Link
                              href={`/admin/transaksi/${kpr.transaksiId}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-700 hover:bg-purple-800 text-white text-[10px] font-semibold transition-colors"
                            >
                              <span>Buka</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* WIDGET 4: Pintasan Kerja & Navigasi Operasional Admin */}
        <div className="bg-white rounded-xl border border-mist shadow-subtle p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-mist">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-prism-teal flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-carbon-ink font-heading">
                  Pusat Kendali Administrasi
                </h2>
                <p className="text-[11px] text-slate">
                  Pintasan cepat modul data inti dan alur operasional
                </p>
              </div>
            </div>

            {/* Shortcut Cards Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-3">
              <Link
                href="/admin/transaksi"
                className="p-3 rounded-lg border border-mist bg-bone/40 hover:bg-bone hover:border-prism-teal/60 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <FileCheck2 className="w-4 h-4 text-deep-teal" />
                  <span className="font-mono text-xs font-bold text-deep-teal">
                    Buku Induk
                  </span>
                </div>
                <div className="mt-2">
                  <span className="font-bold text-xs text-carbon-ink block group-hover:text-deep-teal transition-colors">
                    Transaksi
                  </span>
                  <span className="text-[10px] text-slate">
                    Kelola data transaksi
                  </span>
                </div>
              </Link>

              <Link
                href="/admin/transaksi"
                className="p-3 rounded-lg border border-mist bg-bone/40 hover:bg-bone hover:border-prism-teal/60 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <ReceiptText className="w-4 h-4 text-blue-600" />
                  <ArrowRight className="w-3.5 h-3.5 text-slate group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-2">
                  <span className="font-bold text-xs text-carbon-ink block group-hover:text-deep-teal transition-colors">
                    Daftar Transaksi
                  </span>
                  <span className="text-[10px] text-slate">
                    Kelola berkas &amp; BAST
                  </span>
                </div>
              </Link>

              <Link
                href="/admin/customer"
                className="p-3 rounded-lg border border-mist bg-bone/40 hover:bg-bone hover:border-prism-teal/60 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <Contact className="w-4 h-4 text-purple-600" />
                  <ArrowRight className="w-3.5 h-3.5 text-slate group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-2">
                  <span className="font-bold text-xs text-carbon-ink block group-hover:text-deep-teal transition-colors">
                    Buku Induk
                  </span>
                  <span className="text-[10px] text-slate">
                    Direktori NIK pembeli
                  </span>
                </div>
              </Link>

              <Link
                href="/admin/master-unit"
                className="p-3 rounded-lg border border-mist bg-bone/40 hover:bg-bone hover:border-prism-teal/60 transition-all flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <ArrowRight className="w-3.5 h-3.5 text-slate group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-2">
                  <span className="font-bold text-xs text-carbon-ink block group-hover:text-deep-teal transition-colors">
                    Master Unit
                  </span>
                  <span className="text-[10px] text-slate">
                    Smart lock &amp; status kavling
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
