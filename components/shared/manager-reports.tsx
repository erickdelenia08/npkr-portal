// components/shared/manager-reports.tsx
"use client";

import React, { useState, useTransition } from "react";
import {
  FileSpreadsheet,
  Download,
  Users,
  Building2,
  PieChart,
  Calendar,
  Loader2,
  CheckCircle2,
  Table,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMarketingPerformanceReport,
  getSalesReport,
  getLeadSourceReport,
  MarketingPerformanceRow,
  SalesReportRow,
  LeadSourceRow,
} from "@/actions/report.action";

// Month Options in Indonesian
const MONTH_OPTIONS = [
  { value: 0, label: "Sepanjang Tahun (Semua Bulan)" },
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

const YEAR_OPTIONS = [2024, 2025, 2026, 2027];

// Helper: Escape CSV string for proper Excel formatting
function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// Helper: Trigger browser file download with UTF-8 BOM
function downloadCsv(filename: string, csvContent: string) {
  // Prepend UTF-8 Byte Order Mark (\uFEFF) so Excel opens UTF-8 Indonesian text correctly
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ManagerReports() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // State for Report 1: Marketing Performance
  const [rep1Month, setRep1Month] = useState<number>(currentMonth);
  const [rep1Year, setRep1Year] = useState<number>(currentYear);
  const [rep1Preview, setRep1Preview] = useState<MarketingPerformanceRow[] | null>(null);
  const [isPending1, startTransition1] = useTransition();

  // State for Report 2: Sales Closing
  const [rep2Month, setRep2Month] = useState<number>(currentMonth);
  const [rep2Year, setRep2Year] = useState<number>(currentYear);
  const [rep2Preview, setRep2Preview] = useState<SalesReportRow[] | null>(null);
  const [isPending2, startTransition2] = useTransition();

  // State for Report 3: Lead Sources
  const [rep3Month, setRep3Month] = useState<number>(currentMonth);
  const [rep3Year, setRep3Year] = useState<number>(currentYear);
  const [rep3Preview, setRep3Preview] = useState<LeadSourceRow[] | null>(null);
  const [isPending3, startTransition3] = useTransition();

  // ─── 1. Export Handler: Performa Marketing ───
  const handleExportMarketing = (previewOnly: boolean = false) => {
    startTransition1(async () => {
      const res = await getMarketingPerformanceReport(rep1Month, rep1Year);

      if (!res.success || !res.data) {
        toast.error(res.error || "Gagal mengambil data laporan performa marketing");
        return;
      }

      setRep1Preview(res.data);

      if (!previewOnly) {
        if (res.data.length === 0) {
          toast.info("Tidak ada data transaksi marketing pada periode tersebut.");
          return;
        }

        // Build CSV: Nama Marketing, Total Lead Aktif, Total Survei, Total Closing (ITJ Disetujui)
        const headers = [
          "Nama Marketing",
          "Username",
          "No HP",
          "Total Lead Aktif",
          "Total Survei",
          "Total Closing (ITJ Disetujui)",
        ];

        const rows = res.data.map((r) => [
          escapeCsv(r.namaMarketing),
          escapeCsv(r.username),
          escapeCsv(r.noHp),
          escapeCsv(r.totalLeadAktif),
          escapeCsv(r.totalSurvei),
          escapeCsv(r.totalClosing),
        ]);

        const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
        const monthLabel = rep1Month === 0 ? "Tahunan" : `Bulan-${rep1Month}`;
        const filename = `Laporan_Performa_Marketing_${monthLabel}_${rep1Year}.csv`;

        downloadCsv(filename, csvString);
        toast.success(`Laporan Performa Marketing (${res.data.length} baris) berhasil diunduh!`);
      }
    });
  };

  // ─── 2. Export Handler: Penjualan Closing ───
  const handleExportSales = (previewOnly: boolean = false) => {
    startTransition2(async () => {
      const res = await getSalesReport(rep2Month, rep2Year);

      if (!res.success || !res.data) {
        toast.error(res.error || "Gagal mengambil data laporan penjualan");
        return;
      }

      setRep2Preview(res.data);

      if (!previewOnly) {
        if (res.data.length === 0) {
          toast.info("Tidak ada data closing penjualan pada periode tersebut.");
          return;
        }

        // Build CSV: Tanggal Closing, Nama Customer, Blok Unit, Metode Bayar, Harga Deal, Marketing PIC
        const headers = [
          "Tanggal Closing",
          "Nama Customer",
          "NIK Customer",
          "No HP Customer",
          "Blok Unit",
          "Tipe Unit",
          "Metode Bayar",
          "Harga Deal (Rp)",
          "Marketing PIC",
        ];

        const rows = res.data.map((r) => [
          escapeCsv(r.tanggalClosing),
          escapeCsv(r.namaCustomer),
          escapeCsv(r.nikCustomer),
          escapeCsv(r.noHpCustomer),
          escapeCsv(r.blokUnit),
          escapeCsv(r.tipeUnit),
          escapeCsv(r.metodeBayar),
          escapeCsv(r.hargaDeal),
          escapeCsv(r.marketingPic),
        ]);

        const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
        const monthLabel = rep2Month === 0 ? "Tahunan" : `Bulan-${rep2Month}`;
        const filename = `Laporan_Penjualan_Closing_${monthLabel}_${rep2Year}.csv`;

        downloadCsv(filename, csvString);
        toast.success(`Laporan Penjualan Closing (${res.data.length} transaksi) berhasil diunduh!`);
      }
    });
  };

  // ─── 3. Export Handler: Sumber Lead ───
  const handleExportSources = (previewOnly: boolean = false) => {
    startTransition3(async () => {
      const res = await getLeadSourceReport(rep3Month, rep3Year);

      if (!res.success || !res.data) {
        toast.error(res.error || "Gagal mengambil data laporan sumber lead");
        return;
      }

      setRep3Preview(res.data);

      if (!previewOnly) {
        if (res.data.length === 0) {
          toast.info("Tidak ada data sumber lead pada periode tersebut.");
          return;
        }

        // Build CSV: Sumber, Jumlah Lead Masuk, Jumlah Closing
        const headers = [
          "Sumber",
          "Jumlah Lead Masuk",
          "Jumlah Survei",
          "Jumlah Closing",
          "Tingkat Konversi Closing",
        ];

        const rows = res.data.map((r) => [
          escapeCsv(r.sumber),
          escapeCsv(r.jumlahLeadMasuk),
          escapeCsv(r.jumlahSurvei),
          escapeCsv(r.jumlahClosing),
          escapeCsv(r.persentaseClosing),
        ]);

        const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
        const monthLabel = rep3Month === 0 ? "Tahunan" : `Bulan-${rep3Month}`;
        const filename = `Laporan_Sumber_Lead_${monthLabel}_${rep3Year}.csv`;

        downloadCsv(filename, csvString);
        toast.success(`Laporan Sumber Lead (${res.data.length} saluran) berhasil diunduh!`);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* 3 Main Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ─── CARD 1: Laporan Performa Marketing ─── */}
        <div className="bg-white rounded-2xl border border-mist shadow-2xs overflow-hidden flex flex-col justify-between hover:border-prism-teal/40 transition-all">
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 text-prism-teal flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-bone text-slate border border-mist">
                Modul Sales
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-carbon-ink tracking-tight">
                Laporan Performa Marketing
              </h2>
              <p className="text-xs text-slate mt-1 leading-relaxed">
                Evaluasi produktivitas sales lapangan: total lead yang sedang ditangani, frekuensi survei lokasi, dan akumulasi closing ITJ disetujui.
              </p>
            </div>

            {/* Kolom yang Diekspor */}
            <div className="p-3 rounded-xl bg-bone/50 border border-mist text-slate text-[11px] space-y-1.5">
              <span className="font-bold text-carbon-ink block text-[10px] uppercase tracking-wider">
                Kolom File CSV/Excel:
              </span>
              <p className="font-mono text-graphite text-[10px] leading-relaxed">
                Nama Marketing • Total Lead Aktif • Total Survei • Total Closing (ITJ Disetujui)
              </p>
            </div>

            {/* Month / Year Picker */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-graphite mb-1">
                  Bulan
                </label>
                <select
                  value={rep1Month}
                  onChange={(e) => setRep1Month(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-mist bg-white text-carbon-ink focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-graphite mb-1">
                  Tahun
                </label>
                <select
                  value={rep1Year}
                  onChange={(e) => setRep1Year(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-mist bg-white text-carbon-ink focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-5 border-t border-mist bg-bone/30 space-y-2">
            <button
              type="button"
              onClick={() => handleExportMarketing(false)}
              disabled={isPending1}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-prism-teal hover:bg-deep-teal active:bg-deep-teal text-white text-xs font-bold shadow-subtle transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending1 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengekspor Data...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export to CSV / Excel</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (rep1Preview) {
                  setRep1Preview(null);
                } else {
                  handleExportMarketing(true);
                }
              }}
              className="w-full text-center py-1.5 text-[11px] font-bold text-slate hover:text-carbon-ink flex items-center justify-center gap-1 cursor-pointer"
            >
              <Table className="w-3.5 h-3.5 text-prism-teal" />
              <span>{rep1Preview ? "Sembunyikan Preview" : "Preview Tabel Data"}</span>
              {rep1Preview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Expandable Table Preview */}
          {rep1Preview && (
            <div className="p-4 border-t border-mist bg-white text-xs space-y-2 animate-in fade-in duration-200">
              <p className="font-bold text-carbon-ink text-[11px]">
                Pratinjau: {rep1Preview.length} Anggota Marketing
              </p>
              <div className="max-h-48 overflow-y-auto overflow-x-auto border border-mist rounded-lg">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-bone text-slate font-bold">
                    <tr>
                      <th className="p-2">Nama</th>
                      <th className="p-2 text-center">Aktif</th>
                      <th className="p-2 text-center">Survei</th>
                      <th className="p-2 text-center">Closing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist">
                    {rep1Preview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-bone/30">
                        <td className="p-2 font-medium">{item.namaMarketing}</td>
                        <td className="p-2 text-center tabular-nums">{item.totalLeadAktif}</td>
                        <td className="p-2 text-center tabular-nums">{item.totalSurvei}</td>
                        <td className="p-2 text-center tabular-nums font-bold text-emerald-700">
                          {item.totalClosing}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ─── CARD 2: Laporan Penjualan (Closing) ─── */}
        <div className="bg-white rounded-2xl border border-mist shadow-2xs overflow-hidden flex flex-col justify-between hover:border-prism-teal/40 transition-all">
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-bone text-slate border border-mist">
                Finansial &amp; Unit
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-carbon-ink tracking-tight">
                Laporan Penjualan (Closing)
              </h2>
              <p className="text-xs text-slate mt-1 leading-relaxed">
                Rekapitulasi transaksi unit properti: tanggal closing, identitas pembeli, blok unit hunian, skema pembayaran, dan harga kesepakatan deal.
              </p>
            </div>

            {/* Kolom yang Diekspor */}
            <div className="p-3 rounded-xl bg-bone/50 border border-mist text-slate text-[11px] space-y-1.5">
              <span className="font-bold text-carbon-ink block text-[10px] uppercase tracking-wider">
                Kolom File CSV/Excel:
              </span>
              <p className="font-mono text-graphite text-[10px] leading-relaxed">
                Tanggal Closing • Nama Customer • Blok Unit • Metode Bayar • Harga Deal • Marketing PIC
              </p>
            </div>

            {/* Month / Year Picker */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-graphite mb-1">
                  Bulan
                </label>
                <select
                  value={rep2Month}
                  onChange={(e) => setRep2Month(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-mist bg-white text-carbon-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-graphite mb-1">
                  Tahun
                </label>
                <select
                  value={rep2Year}
                  onChange={(e) => setRep2Year(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-mist bg-white text-carbon-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-5 border-t border-mist bg-bone/30 space-y-2">
            <button
              type="button"
              onClick={() => handleExportSales(false)}
              disabled={isPending2}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-subtle transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending2 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengekspor Data...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export to CSV / Excel</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (rep2Preview) {
                  setRep2Preview(null);
                } else {
                  handleExportSales(true);
                }
              }}
              className="w-full text-center py-1.5 text-[11px] font-bold text-slate hover:text-carbon-ink flex items-center justify-center gap-1 cursor-pointer"
            >
              <Table className="w-3.5 h-3.5 text-emerald-600" />
              <span>{rep2Preview ? "Sembunyikan Preview" : "Preview Tabel Data"}</span>
              {rep2Preview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Expandable Table Preview */}
          {rep2Preview && (
            <div className="p-4 border-t border-mist bg-white text-xs space-y-2 animate-in fade-in duration-200">
              <p className="font-bold text-carbon-ink text-[11px]">
                Pratinjau: {rep2Preview.length} Transaksi Closing
              </p>
              <div className="max-h-48 overflow-y-auto overflow-x-auto border border-mist rounded-lg">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-bone text-slate font-bold">
                    <tr>
                      <th className="p-2">Customer</th>
                      <th className="p-2">Unit</th>
                      <th className="p-2">Metode</th>
                      <th className="p-2 text-right">Harga Deal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist">
                    {rep2Preview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-bone/30">
                        <td className="p-2 font-medium">{item.namaCustomer}</td>
                        <td className="p-2 font-mono">{item.blokUnit}</td>
                        <td className="p-2">{item.metodeBayar}</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-700">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            maximumFractionDigits: 0,
                          }).format(item.hargaDeal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ─── CARD 3: Laporan Sumber Lead ─── */}
        <div className="bg-white rounded-2xl border border-mist shadow-2xs overflow-hidden flex flex-col justify-between hover:border-prism-teal/40 transition-all">
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                <PieChart className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-bone text-slate border border-mist">
                Saluran Promosi
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-carbon-ink tracking-tight">
                Laporan Sumber Lead
              </h2>
              <p className="text-xs text-slate mt-1 leading-relaxed">
                Efektivitas channel pemasaran: kalkulasi jumlah prospek baru masuk dari setiap sumber, jumlah survei lokasi, dan tingkat konversi closing.
              </p>
            </div>

            {/* Kolom yang Diekspor */}
            <div className="p-3 rounded-xl bg-bone/50 border border-mist text-slate text-[11px] space-y-1.5">
              <span className="font-bold text-carbon-ink block text-[10px] uppercase tracking-wider">
                Kolom File CSV/Excel:
              </span>
              <p className="font-mono text-graphite text-[10px] leading-relaxed">
                Sumber (Walk-in, FB Ads, etc.) • Jumlah Lead Masuk • Jumlah Closing
              </p>
            </div>

            {/* Month / Year Picker */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-graphite mb-1">
                  Bulan
                </label>
                <select
                  value={rep3Month}
                  onChange={(e) => setRep3Month(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-mist bg-white text-carbon-ink focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  {MONTH_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-graphite mb-1">
                  Tahun
                </label>
                <select
                  value={rep3Year}
                  onChange={(e) => setRep3Year(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-mist bg-white text-carbon-ink focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-5 border-t border-mist bg-bone/30 space-y-2">
            <button
              type="button"
              onClick={() => handleExportSources(false)}
              disabled={isPending3}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-subtle transition-all cursor-pointer disabled:opacity-50"
            >
              {isPending3 ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengekspor Data...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export to CSV / Excel</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (rep3Preview) {
                  setRep3Preview(null);
                } else {
                  handleExportSources(true);
                }
              }}
              className="w-full text-center py-1.5 text-[11px] font-bold text-slate hover:text-carbon-ink flex items-center justify-center gap-1 cursor-pointer"
            >
              <Table className="w-3.5 h-3.5 text-blue-600" />
              <span>{rep3Preview ? "Sembunyikan Preview" : "Preview Tabel Data"}</span>
              {rep3Preview ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Expandable Table Preview */}
          {rep3Preview && (
            <div className="p-4 border-t border-mist bg-white text-xs space-y-2 animate-in fade-in duration-200">
              <p className="font-bold text-carbon-ink text-[11px]">
                Pratinjau: {rep3Preview.length} Saluran Promosi
              </p>
              <div className="max-h-48 overflow-y-auto overflow-x-auto border border-mist rounded-lg">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-bone text-slate font-bold">
                    <tr>
                      <th className="p-2">Sumber</th>
                      <th className="p-2 text-center">Masuk</th>
                      <th className="p-2 text-center">Closing</th>
                      <th className="p-2 text-right">Konversi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist">
                    {rep3Preview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-bone/30">
                        <td className="p-2 font-medium">{item.sumber}</td>
                        <td className="p-2 text-center tabular-nums">{item.jumlahLeadMasuk}</td>
                        <td className="p-2 text-center tabular-nums font-bold text-emerald-700">
                          {item.jumlahClosing}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-blue-700">
                          {item.persentaseClosing}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
