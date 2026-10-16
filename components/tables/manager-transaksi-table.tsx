// components/tables/manager-transaksi-table.tsx
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Building2,
  Banknote,
  ReceiptText,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Phone,
  MessageCircle,
  Eye,
  X,
  AlertCircle,
  Briefcase,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export interface SerializedManagerTransaksi {
  id: number;
  metode_bayar: "KPR" | "CASH_KERAS" | "CASH_TEMPO";
  harga_deal: number;
  target_itj: number;
  target_dp: number;
  tenor_bulan: number | null;
  status_transaksi: string;
  nama_bank: string | null;
  nama_notaris: string | null;
  tgl_akad: string | null;
  tgl_bast: string | null;
  catatan_admin: string | null;
  created_at: string;
  tgl_itj: string;
  customer: {
    id: number;
    nama_ktp: string;
    no_hp: string;
    nik: string;
    alamat_ktp?: string;
  };
  unit: {
    id: number;
    blok: string;
    tipe: {
      nama_tipe: string;
      kategori: string;
    };
  };
  marketing: {
    id: number;
    nama: string;
    username: string;
    no_hp: string;
  };
  pembayaran: {
    id: number;
    nominal: number;
    jenis_pembayaran: string;
    catatan: string | null;
    created_at: string;
  }[];
}

interface ManagerTransaksiTableProps {
  data: SerializedManagerTransaksi[];
}

// ─── Formatters ───
const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

const formatDate = (isoString: string): string => {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getWhatsAppUrl = (phone: string, text?: string): string => {
  let clean = phone.replace(/[\s-+]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  }
  const base = `https://wa.me/${clean}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
};

// ─── Status Badge Visualizer ───
// Orange for Pemberkasan, Blue for BI Checking/SP3K, Green for Akad/BAST
export const getStatusBadgeStyle = (status: string) => {
  const s = status.toUpperCase();

  // Green: Akad / BAST / Lunas / Selesai
  if (
    s.includes("AKAD") ||
    s.includes("BAST") ||
    s.includes("LUNAS") ||
    s.includes("SERAH TERIMA") ||
    s.includes("SELESAI")
  ) {
    return {
      label: status,
      bgClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
      dotClass: "bg-emerald-500",
      icon: CheckCircle2,
      category: "AKAD_BAST",
    };
  }

  // Blue: BI Checking / SP3K / Wawancara / Analisa Bank
  if (
    s.includes("BI CHECKING") ||
    s.includes("SLIK") ||
    s.includes("SP3K") ||
    s.includes("WAWANCARA") ||
    s.includes("ANALISA BANK") ||
    s.includes("BANK")
  ) {
    return {
      label: status,
      bgClass: "bg-blue-50 text-blue-800 border-blue-300",
      dotClass: "bg-blue-500",
      icon: Building2,
      category: "BANK",
    };
  }

  // Purple: Notaris / AJB / Pajak
  if (s.includes("NOTARIS") || s.includes("AJB") || s.includes("PAJAK")) {
    return {
      label: status,
      bgClass: "bg-purple-50 text-purple-800 border-purple-300",
      dotClass: "bg-purple-500",
      icon: Briefcase,
      category: "NOTARIS",
    };
  }

  // Orange / Amber: Pemberkasan / Kelengkapan Dokumen / Verifikasi Awal
  if (
    s.includes("BERKAS") ||
    s.includes("PEMBERKASAN") ||
    s.includes("DOKUMEN") ||
    s.includes("ITJ") ||
    s.includes("AWAL")
  ) {
    return {
      label: status,
      bgClass: "bg-amber-50 text-amber-900 border-amber-300",
      dotClass: "bg-amber-500",
      icon: FileText,
      category: "PEMBERKASAN",
    };
  }

  // Red: Batal / Tolak / Gagal
  if (s.includes("BATAL") || s.includes("TOLAK") || s.includes("REJECT") || s.includes("GAGAL")) {
    return {
      label: status,
      bgClass: "bg-rose-50 text-rose-800 border-rose-300",
      dotClass: "bg-rose-500",
      icon: AlertCircle,
      category: "BATAL",
    };
  }

  // Default Neutral
  return {
    label: status,
    bgClass: "bg-bone text-graphite border-mist",
    dotClass: "bg-slate-400",
    icon: Clock,
    category: "OTHER",
  };
};

export function ManagerTransaksiTable({ data }: ManagerTransaksiTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [metodeFilter, setMetodeFilter] = useState<"ALL" | "KPR" | "CASH_KERAS" | "CASH_TEMPO">("ALL");
  const [statusFilterGroup, setStatusFilterGroup] = useState<"ALL" | "PEMBERKASAN" | "BANK" | "AKAD_BAST">("ALL");

  // Read-only modal state
  const [selectedTransaksi, setSelectedTransaksi] = useState<SerializedManagerTransaksi | null>(null);

  // Filtered Transaksi
  const filteredData = useMemo(() => {
    return data.filter((trx) => {
      // Metode Bayar filter
      if (metodeFilter !== "ALL" && trx.metode_bayar !== metodeFilter) {
        return false;
      }

      // Status Group filter
      if (statusFilterGroup !== "ALL") {
        const badge = getStatusBadgeStyle(trx.status_transaksi);
        if (badge.category !== statusFilterGroup) {
          return false;
        }
      }

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const customerName = trx.customer.nama_ktp.toLowerCase();
      const customerNik = trx.customer.nik.toLowerCase();
      const unitBlok = trx.unit.blok.toLowerCase();
      const unitTipe = trx.unit.tipe.nama_tipe.toLowerCase();
      const marketingName = trx.marketing.nama.toLowerCase();
      const statusText = trx.status_transaksi.toLowerCase();

      return (
        customerName.includes(q) ||
        customerNik.includes(q) ||
        unitBlok.includes(q) ||
        unitTipe.includes(q) ||
        marketingName.includes(q) ||
        statusText.includes(q)
      );
    });
  }, [data, metodeFilter, statusFilterGroup, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ─── 1. Filter & Search Toolbar ─── */}
      <div className="flex flex-col gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-mist shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Metode Bayar Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-bold text-slate uppercase tracking-wider mr-1">
              Skema:
            </span>
            <button
              type="button"
              onClick={() => setMetodeFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                metodeFilter === "ALL"
                  ? "bg-carbon-ink text-white shadow-2xs"
                  : "bg-bone text-slate hover:bg-slate-200 hover:text-carbon-ink"
              }`}
            >
              Semua ({data.length})
            </button>
            <button
              type="button"
              onClick={() => setMetodeFilter("KPR")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                metodeFilter === "KPR"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
              }`}
            >
              KPR ({data.filter((t) => t.metode_bayar === "KPR").length})
            </button>
            <button
              type="button"
              onClick={() => setMetodeFilter("CASH_KERAS")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                metodeFilter === "CASH_KERAS"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              Cash Keras ({data.filter((t) => t.metode_bayar === "CASH_KERAS").length})
            </button>
            <button
              type="button"
              onClick={() => setMetodeFilter("CASH_TEMPO")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                metodeFilter === "CASH_TEMPO"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              Cash Tempo ({data.filter((t) => t.metode_bayar === "CASH_TEMPO").length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-fog" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari customer, NIK, blok, sales..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
            />
          </div>
        </div>

        {/* Status Group Quick Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-mist/80">
          <span className="text-[11px] font-bold text-slate uppercase tracking-wider mr-1">
            Status:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilterGroup("ALL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilterGroup === "ALL"
                ? "bg-carbon-ink text-white"
                : "bg-bone text-slate hover:bg-slate-200 hover:text-carbon-ink"
            }`}
          >
            Semua Tahap
          </button>
          <button
            type="button"
            onClick={() => setStatusFilterGroup("PEMBERKASAN")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilterGroup === "PEMBERKASAN"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            Pemberkasan (Orange)
          </button>
          <button
            type="button"
            onClick={() => setStatusFilterGroup("BANK")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilterGroup === "BANK"
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
            }`}
          >
            BI Checking &amp; SP3K (Blue)
          </button>
          <button
            type="button"
            onClick={() => setStatusFilterGroup("AKAD_BAST")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              statusFilterGroup === "AKAD_BAST"
                ? "bg-emerald-600 text-white"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            }`}
          >
            Akad &amp; BAST (Green)
          </button>
        </div>
      </div>

      {/* ─── 2. Data Table (Strictly Read-Only) ─── */}
      <div className="bg-white rounded-2xl border border-mist shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-bone/80 border-b border-mist text-slate font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Tanggal ITJ</th>
                <th className="py-3.5 px-4">Nama Customer</th>
                <th className="py-3.5 px-4">Blok Unit</th>
                <th className="py-3.5 px-4">Marketing PIC</th>
                <th className="py-3.5 px-4 text-center">Metode Bayar</th>
                <th className="py-3.5 px-4">Status Transaksi</th>
                <th className="py-3.5 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ReceiptText className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      <p className="font-semibold text-graphite">Tidak ada transaksi yang cocok</p>
                      <p className="text-[11px] text-slate-400">
                        {searchQuery
                          ? "Coba periksa kembali kata kunci pencarian atau reset filter."
                          : "Belum ada transaksi properti yang tercatat di database."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((trx) => {
                  const badge = getStatusBadgeStyle(trx.status_transaksi);
                  const BadgeIcon = badge.icon;

                  return (
                    <tr
                      key={trx.id}
                      className="hover:bg-bone/35 transition-colors group"
                    >
                      {/* Tanggal ITJ */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate">
                          <Calendar className="w-3.5 h-3.5 text-fog shrink-0" />
                          <span>{formatDate(trx.tgl_itj)}</span>
                        </div>
                      </td>

                      {/* Nama Customer */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-carbon-ink text-xs group-hover:text-prism-teal transition-colors">
                            {trx.customer.nama_ktp}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate font-mono">
                            <span>NIK: {trx.customer.nik}</span>
                            <span>•</span>
                            <span>{trx.customer.no_hp}</span>
                          </div>
                        </div>
                      </td>

                      {/* Blok Unit */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-bone text-carbon-ink border border-mist">
                            <Building2 className="w-3 h-3 text-prism-teal" />
                            {trx.unit.blok}
                          </span>
                          <p className="text-[10px] text-slate">
                            {trx.unit.tipe.nama_tipe} ({trx.unit.tipe.kategori})
                          </p>
                        </div>
                      </td>

                      {/* Marketing PIC */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-carbon-ink text-xs">
                            {trx.marketing.nama}
                          </p>
                          <p className="text-[10px] text-slate font-mono">
                            @{trx.marketing.username}
                          </p>
                        </div>
                      </td>

                      {/* Metode Bayar */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {trx.metode_bayar === "KPR" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <span>KPR</span>
                            {trx.tenor_bulan && (
                              <span className="font-mono">({trx.tenor_bulan} bln)</span>
                            )}
                          </span>
                        ) : trx.metode_bayar === "CASH_KERAS" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Cash Keras
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Cash Tempo
                          </span>
                        )}
                      </td>

                      {/* Status Transaksi (Prominent Badge) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${badge.bgClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                            <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{badge.label}</span>
                          </span>

                          {/* Bank / Notaris preview if available */}
                          {trx.nama_bank && (
                            <p className="text-[10px] text-slate font-medium pl-1">
                              Bank: <span className="text-carbon-ink font-semibold">{trx.nama_bank}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Read-Only Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedTransaksi(trx)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-mist bg-white text-slate hover:text-carbon-ink hover:border-slate-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          title="Lihat Detail Transaksi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 3. Modal: Read-Only Transaction Detail Drawer ─── */}
      {selectedTransaksi && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-mist shadow-2xl overflow-hidden p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-mist">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-prism-teal flex items-center justify-center shrink-0">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-carbon-ink">
                    Detail Transaksi Unit #{selectedTransaksi.unit.blok}
                  </h3>
                  <p className="text-xs text-slate">
                    Tanggal ITJ: {formatDate(selectedTransaksi.tgl_itj)} • Konsumen:{" "}
                    <strong>{selectedTransaksi.customer.nama_ktp}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaksi(null)}
                className="p-1 rounded-full text-slate hover:text-graphite hover:bg-bone cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Read-Only Notice for Manager */}
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Mode Pengawasan Manager (Read-Only)</p>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Anda sedang mengamati progres operasional Admin. Halaman ini hanya untuk pemantauan dan evaluasi tanpa hak edit/mutasi status.
                </p>
              </div>
            </div>

            {/* Grid Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Konsumen Info */}
              <div className="p-4 rounded-xl border border-mist bg-bone/40 space-y-2">
                <p className="font-bold text-slate uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-prism-teal" />
                  <span>Data Konsumen</span>
                </p>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-carbon-ink">
                    {selectedTransaksi.customer.nama_ktp}
                  </p>
                  <p className="text-slate font-mono">
                    NIK: {selectedTransaksi.customer.nik}
                  </p>
                  <p className="text-slate font-mono">
                    No. HP: {selectedTransaksi.customer.no_hp}
                  </p>
                  {selectedTransaksi.customer.alamat_ktp && (
                    <p className="text-slate text-[11px]">
                      Alamat: {selectedTransaksi.customer.alamat_ktp}
                    </p>
                  )}
                </div>
              </div>

              {/* Unit & Finansial */}
              <div className="p-4 rounded-xl border border-mist bg-bone/40 space-y-2">
                <p className="font-bold text-slate uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-prism-teal" />
                  <span>Unit &amp; Skema Finansial</span>
                </p>
                <div className="space-y-1">
                  <p className="font-bold text-carbon-ink">
                    Blok {selectedTransaksi.unit.blok} – {selectedTransaksi.unit.tipe.nama_tipe}
                  </p>
                  <p className="text-slate">
                    Metode: <strong className="text-carbon-ink">{selectedTransaksi.metode_bayar}</strong>
                  </p>
                  <p className="text-slate">
                    Harga Deal: <strong className="text-emerald-700 font-mono">{formatCurrency(selectedTransaksi.harga_deal)}</strong>
                  </p>
                  <p className="text-slate">
                    Target ITJ: <span className="font-mono">{formatCurrency(selectedTransaksi.target_itj)}</span> | DP: <span className="font-mono">{formatCurrency(selectedTransaksi.target_dp)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Status Progres & Data Admin */}
            <div className="p-4 rounded-xl border border-mist bg-white space-y-3">
              <p className="font-bold text-slate uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-prism-teal" />
                <span>Status &amp; Progres Proses Admin</span>
              </p>

              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeStyle(selectedTransaksi.status_transaksi).bgClass}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${getStatusBadgeStyle(selectedTransaksi.status_transaksi).dotClass}`}
                  />
                  <span>{selectedTransaksi.status_transaksi}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-mist/80">
                <div>
                  <span className="text-[10px] text-slate block">Bank Penyalur</span>
                  <span className="font-semibold text-carbon-ink">
                    {selectedTransaksi.nama_bank || "Belum ditentukan"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate block">Notaris Rekanan</span>
                  <span className="font-semibold text-carbon-ink">
                    {selectedTransaksi.nama_notaris || "Belum ditentukan"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate block">Tanggal Akad Kredit</span>
                  <span className="font-mono text-carbon-ink">
                    {selectedTransaksi.tgl_akad ? formatDate(selectedTransaksi.tgl_akad) : "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate block">Tanggal Serah Terima (BAST)</span>
                  <span className="font-mono text-carbon-ink">
                    {selectedTransaksi.tgl_bast ? formatDate(selectedTransaksi.tgl_bast) : "-"}
                  </span>
                </div>
              </div>

              {selectedTransaksi.catatan_admin && (
                <div className="p-3 rounded-lg bg-bone/70 border border-mist text-slate text-xs space-y-1">
                  <span className="text-[10px] font-bold text-graphite uppercase tracking-wider block">
                    Catatan Khusus Admin:
                  </span>
                  <p>{selectedTransaksi.catatan_admin}</p>
                </div>
              )}
            </div>

            {/* Riwayat Pembayaran Masuk */}
            <div className="space-y-2">
              <p className="font-bold text-slate uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-prism-teal" />
                <span>Riwayat Kwitansi &amp; Pembayaran Masuk ({selectedTransaksi.pembayaran.length})</span>
              </p>

              {selectedTransaksi.pembayaran.length === 0 ? (
                <p className="text-xs text-slate italic p-3 bg-bone/40 rounded-lg">
                  Belum ada catatan kwitansi pembayaran dari Admin.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {selectedTransaksi.pembayaran.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-mist bg-bone/30 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-carbon-ink">
                            {p.jenis_pembayaran}
                          </span>
                          <span className="text-slate font-mono text-[10px]">
                            {formatDate(p.created_at)}
                          </span>
                        </div>
                        {p.catatan && (
                          <p className="text-[11px] text-slate">{p.catatan}</p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatCurrency(p.nominal)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-mist">
              <div className="flex items-center gap-2 text-xs text-slate">
                <span>PIC Sales:</span>
                <strong className="text-carbon-ink">{selectedTransaksi.marketing.nama}</strong>
                {selectedTransaksi.marketing.no_hp && (
                  <Link
                    href={getWhatsAppUrl(
                      selectedTransaksi.marketing.no_hp,
                      `Halo ${selectedTransaksi.marketing.nama}, terkait transaksi unit ${selectedTransaksi.unit.blok} (${selectedTransaksi.customer.nama_ktp}).`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-teal-700 hover:underline"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </Link>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedTransaksi(null)}
                className="px-4 py-2 text-xs font-semibold text-slate hover:text-carbon-ink rounded-lg bg-bone hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
