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
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  Building2,
  ReceiptText,
  Contact,
  Eye,
} from "lucide-react";
import {
  getAdminDashboardData,
  AdminDashboardData,
} from "@/actions/dashboard.admin.action";
import { capitalizeWords, truncateText } from "@/lib/text-manipulate/text-manipulate";

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
      {/* <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Administrasi &amp; Keuangan</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Dashboard Administrasi &amp; Keuangan
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Pantau hambatan berkas, antrean validasi tanda jadi, dan progres KPR perbankan secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/admin/transaksi"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Pantauan Transaksi</span>
          </Link>
        </div>
      </div> */}

      {/* 2. TOP SECTION: 3 LARGE SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {/* Metric 1: Pending ITJ */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 flex flex-col justify-between transition-all hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-700 block truncate">
                ITJ & Booking Baru
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 block leading-snug line-clamp-2">
                Pemesanan unit yang baru masuk
              </span>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-4 sm:mt-5 flex items-end justify-between gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-slate-900 leading-none">
              {metrics.pendingItjCount}
            </span>
            <Link
              href="/admin/transaksi"
              className="text-[10px] sm:text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 group"
            >
              <span>Transaksi</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Metric 2: Pending Docs */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 flex flex-col justify-between transition-all hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-700 block truncate">
                Menunggu Cek
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 block leading-snug line-clamp-2">
                Berkas konsumen & legalitas
              </span>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Files className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-4 sm:mt-5 flex items-end justify-between gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-slate-900 leading-none">
              {metrics.pendingDocsCount}
            </span>
            <Link
              href="/admin/transaksi"
              className="text-[10px] sm:text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 group"
            >
              <span>Berkas</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Metric 3: Active KPR (Full width di Mobile, 1 Kolom di Desktop) */}
        <div className="col-span-2 sm:col-span-1 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 flex flex-col justify-between transition-all hover:border-slate-300 hover:shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-700 block truncate">
                Proses KPR Berjalan
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 block leading-snug line-clamp-2">
                Fase wawancara, OTS & verifikasi
              </span>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Landmark className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-4 sm:mt-5 flex items-end justify-between gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-slate-900 leading-none">
              {metrics.activeKprCount}
            </span>
            <Link
              href="/admin/transaksi"
              className="text-[10px] sm:text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 group"
            >
              <span>Pantau Bank</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT: 2X2 GRID OF MINI-TABLES & WIDGETS */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* WIDGET 1: Antrean Validasi ITJ */}
        <div className="bg-white rounded-lg border border-slate-200 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 text-nowrap">
                    ITJ Terkini
                  </h2>
                  <p className="text-xs text-slate-500">
                    5 booking unit terbaru yang aktif berjalan
                  </p>
                </div>
              </div>
              <Link
                href="/admin/transaksi"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 shrink-0"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mini Table 1 */}
            <div className="overflow-x-auto">
              {widgets.pendingItj.length === 0 ? (
                <div className="p-8 text-center text-slate space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                  <p className="text-sm font-medium text-slate-900">
                    Semua ITJ sudah tervalidasi!
                  </p>
                  <p className="text-[11px]">
                    Tidak ada antrean tanda jadi yang menunggu verifikasi saat ini.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium text-xs">
                      <th className="py-3 px-4">Konsumen</th>
                      <th className="py-3 px-3">Blok</th>
                      <th className="py-3 px-3 text-right">Nominal</th>
                      <th className="py-3 px-3">Diajukan</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {widgets.pendingItj.map((itj) => (
                      <tr
                        key={itj.id}
                        className="hover:bg-slate-50 transition-colors text-xs"
                      >
                        <td className="py-3 px-4">
                          <span className="text-slate-900 block text-nowrap">
                            {/* {itj.leadNama} */}
                            <span className="hidden md:block">
                              {capitalizeWords(itj.leadNama)}
                            </span>
                            <span className="block md:hidden">
                              {truncateText(capitalizeWords(itj.leadNama), 14)}
                            </span>
                          </span>
                          {/* <span className="text-xs text-slate-500">
                            {itj.leadNoHp}
                          </span> */}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex rounded bg-slate-100 px-2 py-1 font-mono text-[9px] sm:text-xs font-medium text-slate-700 text-nowrap">
                            {itj.unitBlok}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-slate-900">
                          {formatPrice(itj.nominal)}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500 text-nowrap">
                          {itj.diajukanAt}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            href="/admin/transaksi"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors"
                          >
                            {/* <span>Lihat</span> */}
                            <Eye className="w-3 h-3" />
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
        <div className="bg-white rounded-lg border border-slate-200 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Files className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Dokumen
                  </h2>
                  <p className="text-xs text-slate-500">
                    Berkas yang belum terkumpul
                  </p>
                </div>
              </div>
              <Link
                href="/admin/transaksi"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 shrink-0"
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
                  <p className="text-sm font-medium text-slate-900">
                    Semua dokumen terverifikasi!
                  </p>
                  <p className="text-[11px]">
                    Tidak ada berkas yang berstatus menunggu verifikasi saat ini.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium text-xs">
                      <th className="py-3 px-4">Konsumen</th>
                      <th className="py-3 px-3">Blok</th>
                      <th className="py-3 px-3">Jenis Dokumen</th>
                      <th className="py-3 px-3">Diperbarui</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {widgets.pendingDocs.map((doc) => (
                      <tr
                        key={doc.id}
                        className="hover:bg-slate-50 transition-colors text-xs"
                      >
                        <td className="py-3 px-4 text-carbon-ink text-nowrap">
                          <span className="hidden md:block">
                            {capitalizeWords(doc.customerNama)}
                          </span>
                          <span className="block md:hidden">
                            {truncateText(capitalizeWords(doc.customerNama), 12)}
                          </span>

                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex rounded bg-slate-100 px-2 py-1 font-mono text-[10px] md:text-xs font-medium text-slate-700 text-nowrap">
                            {doc.unitBlok}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-graphite">
                          <span className="">{doc.jenisLabel}</span>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500 text-nowrap">
                          {doc.uploadedAt}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            href={`/admin/transaksi/${doc.transaksiId}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors"
                          >
                            {/* <span>Periksa</span> */}
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
        <div className="bg-white rounded-lg border border-slate-200 flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Pantauan Bank (KPR)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Monitoring pengajuan KPR aktif konsumen ke perbankan
                  </p>
                </div>
              </div>
              <Link
                href="/admin/transaksi"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 shrink-0"
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
                  <p className="text-sm font-medium text-slate-900">
                    Tidak ada proses KPR aktif
                  </p>
                  <p className="text-[11px]">
                    Semua pengajuan KPR sudah tuntas disetujui atau belum ada pengajuan baru.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium text-xs">
                      <th className="py-3 px-4">Bank</th>
                      <th className="py-3 px-3">Konsumen</th>
                      <th className="py-3 px-3">Blok</th>
                      <th className="py-3 px-3">Tahap KPR</th>
                      <th className="py-3 px-4 text-center">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {widgets.activeKpr.map((kpr) => {
                      const badgeInfo = STATUS_KPR_BADGES[kpr.status] || {
                        label: kpr.status,
                        className: "bg-slate-100 text-slate-700 border-slate-200",
                      };

                      return (
                        <tr
                          key={kpr.id}
                          className="hover:bg-slate-50 transition-colors text-xs"
                        >
                          <td className="py-3 px-4 font-medium text-carbon-ink text-nowrap">
                            {kpr.bankNama}
                          </td>
                          <td className="py-3 px-3 text-graphite text-nowrap">
                            <span className="hidden md:block">
                              {capitalizeWords(kpr.customerNama)}
                            </span>
                            <span className="block md:hidden">
                              {truncateText(capitalizeWords(kpr.customerNama), 12)}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex rounded bg-slate-100 px-2 py-1 font-mono  text-[10px] md:text-xs font-medium text-slate-700 text-nowrap">
                              {kpr.unitBlok}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs border text-nowrap ${badgeInfo.className}`}
                            >
                              {badgeInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Link
                              href={`/admin/transaksi/${kpr.transaksiId}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors"
                            >
                              {/* <span>Buka</span> */}
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
        <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
              <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Pusat Kendali Administrasi
                </h2>
                <p className="text-xs text-slate-500">
                  Pintasan cepat modul data inti dan alur operasional
                </p>
              </div>
            </div>

            {/* Shortcut Cards Grid */}
            <div className="grid grid-cols-2 gap-3 pt-3">
              <Link
                href="/admin/transaksi"
                className="p-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <FileCheck2 className="w-4 h-4 text-slate-600" />
                  <span className="font-mono text-xs font-medium text-slate-600">
                    Buku Induk
                  </span>
                </div>
                <div className="mt-2">
                  <span className="font-bold text-xs text-carbon-ink block group-hover:text-deep-teal transition-colors">
                    Transaksi
                  </span>
                  <span className="text-xs text-slate-500">
                    Kelola data transaksi
                  </span>
                </div>
              </Link>

              <Link
                href="/admin/transaksi"
                className="p-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <ReceiptText className="w-4 h-4 text-blue-600" />
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-2">
                  <span className="font-bold text-xs text-carbon-ink block group-hover:text-deep-teal transition-colors">
                    Daftar Transaksi
                  </span>
                  <span className="text-xs text-slate-500">
                    Kelola berkas &amp; BAST
                  </span>
                </div>
              </Link>

              <Link
                href="/admin/customer"
                className="p-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <Contact className="w-4 h-4 text-purple-600" />
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-2">
                  <span className="font-bold text-xs text-carbon-ink block group-hover:text-deep-teal transition-colors">
                    Buku Induk
                  </span>
                  <span className="text-xs text-slate-500">
                    Direktori NIK pembeli
                  </span>
                </div>
              </Link>

              <Link
                href="/admin/master-unit"
                className="p-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="mt-2">
                  <span className="font-bold text-xs text-carbon-ink block group-hover:text-deep-teal transition-colors">
                    Master Unit
                  </span>
                  <span className="text-xs text-slate-500">
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
