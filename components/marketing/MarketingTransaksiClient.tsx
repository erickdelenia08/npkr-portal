"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ReceiptText,
  Search,
  Building2,
  Home,
  User,
  Phone,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  Banknote,
  Sparkles,
  AlertCircle,
  FileCheck2,
  Calendar,
} from "lucide-react";
import type { MarketingTransaksiItem } from "@/actions/transaksi.action";
import type { TahapTransaksi, TahapDetail, MetodeBayar } from "@/generated/prisma";

interface MarketingTransaksiClientProps {
  initialData: MarketingTransaksiItem[];
  marketingName?: string;
}

type FilterType = "ALL" | "AKTIF" | "SELESAI";

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getMacroBadgeStyle(status: TahapTransaksi): string {
  switch (status) {
    case "PEMBERKASAN":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "PROSES_BANK":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "PEMBAYARAN":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "AKAD_AJB":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "PEMBANGUNAN":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "SERAH_TERIMA":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "BATAL":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

function getMacroLabel(status: TahapTransaksi): string {
  switch (status) {
    case "PEMBERKASAN":
      return "Pemberkasan";
    case "PROSES_BANK":
      return "Proses Bank";
    case "PEMBAYARAN":
      return "Pembayaran";
    case "AKAD_AJB":
      return "Akad / AJB";
    case "PEMBANGUNAN":
      return "Pembangunan";
    case "SERAH_TERIMA":
      return "Serah Terima (BAST)";
    case "BATAL":
      return "Batal";
    default:
      return status;
  }
}

function formatTahapDetail(detail: TahapDetail): string {
  switch (detail) {
    case "PENGUMPULAN_DOKUMEN":
      return "Pengumpulan Dokumen";
    case "WAWANCARA":
      return "Wawancara Bank";
    case "OTS":
      return "On The Spot (OTS)";
    case "VERIFIKASI":
      return "Verifikasi Bank";
    case "SP3K":
      return "Penerbitan SP3K";
    case "AKAD_KREDIT":
      return "Akad Kredit";
    case "PEMBERKASAN_LEGALITAS":
      return "Pemberkasan Legalitas";
    case "MENUNGGU_PELUNASAN":
      return "Menunggu Pelunasan";
    case "PEMBERKASAN_PPJB":
      return "Pemberkasan PPJB";
    case "PEMBAYARAN_DP":
      return "Pembayaran DP";
    case "CICILAN_BERJALAN":
      return "Cicilan Berjalan";
    case "PELUNASAN":
      return "Pelunasan";
    case "AJB":
      return "Akta Jual Beli (AJB)";
    case "BAST":
      return "Serah Terima Kunci (BAST)";
    case "BATAL":
      return "Pembatalan";
    default: {
      const s = String(detail);
      return s
        .toLowerCase()
        .split("_")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }
}

function getMetodeBadge(metode: MetodeBayar) {
  switch (metode) {
    case "KPR":
      return {
        label: "KPR",
        className: "bg-purple-50 text-purple-700 border-purple-200",
      };
    case "CASH_KERAS":
      return {
        label: "Cash Keras",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "CASH_TEMPO":
      return {
        label: "Cash Bertahap",
        className: "bg-blue-50 text-blue-700 border-blue-200",
      };
    default:
      return {
        label: metode,
        className: "bg-slate-50 text-slate-700 border-slate-200",
      };
  }
}

export function MarketingTransaksiClient({
  initialData,
  marketingName,
}: MarketingTransaksiClientProps) {
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Helper check for finished status
  const isFinished = (trx: MarketingTransaksiItem): boolean =>
    trx.status_transaksi === "BATAL" ||
    trx.status_transaksi === "SERAH_TERIMA" ||
    trx.tahap_detail === "BAST" ||
    trx.tahap_detail === "BATAL";

  // Counts for pills
  const counts = useMemo(() => {
    let aktifCount = 0;
    let selesaiCount = 0;
    let totalNominal = 0;

    for (const trx of initialData) {
      if (isFinished(trx)) {
        selesaiCount++;
      } else {
        aktifCount++;
      }
      totalNominal += trx.harga_deal;
    }

    return {
      all: initialData.length,
      aktif: aktifCount,
      selesai: selesaiCount,
      totalNominal,
    };
  }, [initialData]);

  // Filtered list
  const filteredList = useMemo(() => {
    return initialData.filter((trx) => {
      // 1. Filter Chip
      if (filter === "AKTIF" && isFinished(trx)) return false;
      if (filter === "SELESAI" && !isFinished(trx)) return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCustomer = trx.customer.nama_ktp.toLowerCase().includes(q);
        const matchPhone = trx.customer.no_hp.toLowerCase().includes(q);
        const matchNik = trx.customer.nik.toLowerCase().includes(q);
        const matchBlok = trx.unit.blok.toLowerCase().includes(q);
        const matchTipe = trx.unit.tipe?.nama_tipe.toLowerCase().includes(q) ?? false;
        if (!matchCustomer && !matchPhone && !matchNik && !matchBlok && !matchTipe) {
          return false;
        }
      }

      return true;
    });
  }, [initialData, filter, searchQuery]);

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-24 sm:pb-16">
      {/* 1. Header (Mobile-First) */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-mist shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-prism-teal/10 text-deep-teal">
                Portofolio Penjualan
              </span>
              <span className="text-xs text-slate font-medium">
                {counts.all} Total Transaksi
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-carbon-ink tracking-tight font-heading mt-1">
              Daftar Transaksi / Closing Saya
            </h1>
            <p className="text-xs sm:text-sm text-slate mt-0.5">
              Pantau progres berkas, pembayaran, akad, hingga serah terima kunci konsumen Anda.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/marketing/lead"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-prism-teal hover:bg-deep-teal text-white text-xs font-semibold transition-all shadow-subtle cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Manajemen Lead</span>
            </Link>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-mist/80">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate uppercase tracking-wider">
              Total Closing
            </span>
            <span className="font-mono text-lg sm:text-2xl font-bold text-carbon-ink mt-1">
              {counts.all}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Transaksi Aktif
            </span>
            <span className="font-mono text-lg sm:text-2xl font-bold text-emerald-700 mt-1">
              {counts.aktif}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex flex-col justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-blue-800 uppercase tracking-wider">
              Selesai / BAST
            </span>
            <span className="font-mono text-lg sm:text-2xl font-bold text-blue-700 mt-1">
              {counts.selesai}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filter Tabs & Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-mist shadow-subtle space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`px-3.5 py-1.5 rounded-lg font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              }`}
            >
              <span>Semua</span>
              <span className="font-mono text-[10px] opacity-80">({counts.all})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("AKTIF")}
              className={`px-3.5 py-1.5 rounded-lg font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === "AKTIF"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Aktif</span>
              <span className="font-mono text-[10px] opacity-80">({counts.aktif})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("SELESAI")}
              className={`px-3.5 py-1.5 rounded-lg font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                filter === "SELESAI"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Selesai</span>
              <span className="font-mono text-[10px] opacity-80">({counts.selesai})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari konsumen, unit, atau NIK..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
            />
          </div>
        </div>
      </div>

      {/* 3. Transaction Card List (Vertical Mobile-First Layout) */}
      {filteredList.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-mist p-8 sm:p-12 text-center shadow-subtle space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
            <ReceiptText className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-carbon-ink font-heading">
              {initialData.length === 0
                ? "Belum Ada Transaksi Closing"
                : "Tidak Ada Transaksi yang Cocok"}
            </h3>
            <p className="text-xs sm:text-sm text-slate">
              {initialData.length === 0
                ? "Anda belum memiliki transaksi aktif. Ajak konsumen survei lokasi dan ajukan Ikatan Tanda Jadi (ITJ) untuk membuat transaksi baru."
                : "Coba sesuaikan kata kunci pencarian atau ubah tab filter untuk melihat transaksi lainnya."}
            </p>
          </div>
          {initialData.length === 0 && (
            <div className="pt-2">
              <Link
                href="/marketing/lead"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-prism-teal hover:bg-deep-teal text-white text-xs font-bold transition-all shadow-subtle cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Buka Manajemen Lead &amp; Prospek</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((trx) => {
            const metodeInfo = getMetodeBadge(trx.metode_bayar);
            const macroClass = getMacroBadgeStyle(trx.status_transaksi);
            const macroLabel = getMacroLabel(trx.status_transaksi);
            const microLabel = formatTahapDetail(trx.tahap_detail);

            return (
              <Link
                key={trx.id}
                href={`/marketing/transaksi/${trx.id}`}
                className="block bg-white rounded-2xl border border-mist hover:border-prism-teal/60 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="space-y-3.5">
                  {/* Top Bar: Unit & Date & Payment Method */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold font-mono">
                        <Home className="w-3.5 h-3.5 text-teal-600" />
                        <span>Blok {trx.unit.blok}</span>
                      </div>
                      {trx.unit.tipe?.nama_tipe && (
                        <span className="text-[11px] text-slate font-medium truncate max-w-[140px] sm:max-w-none">
                          {trx.unit.tipe.nama_tipe}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${metodeInfo.className}`}
                      >
                        {metodeInfo.label}
                      </span>
                      <span className="text-[11px] text-slate flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate/70" />
                        {formatDate(trx.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-bone border border-mist text-graphite flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                        {trx.customer.nama_ktp.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-bold text-carbon-ink tracking-tight truncate group-hover:text-prism-teal transition-colors">
                          {trx.customer.nama_ktp}
                        </h2>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate mt-0.5 font-mono">
                          <span>NIK: {trx.customer.nik || "-"}</span>
                          <span className="inline-flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate/70" />
                            {trx.customer.no_hp}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 p-1 rounded-lg text-slate group-hover:text-prism-teal group-hover:translate-x-0.5 transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Financial & Status Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-mist/80">
                    {/* Left: Pricing */}
                    <div className="flex items-center justify-between sm:justify-start gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate block tracking-wider">
                          Harga Deal
                        </span>
                        <span className="font-mono text-sm sm:text-base font-bold text-carbon-ink">
                          {formatRupiah(trx.harga_deal)}
                        </span>
                      </div>
                      {trx.itj?.nominal ? (
                        <div className="border-l border-mist pl-4">
                          <span className="text-[10px] uppercase font-semibold text-slate block tracking-wider">
                            ITJ Masuk
                          </span>
                          <span className="font-mono text-xs font-semibold text-deep-teal">
                            {formatRupiah(trx.itj.nominal)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Right: Badges for Macro & Micro Stages */}
                    <div className="flex items-center justify-start sm:justify-end gap-1.5 flex-wrap">
                      {/* Macro Badge */}
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${macroClass}`}
                        title="Status Makro Transaksi"
                      >
                        {macroLabel}
                      </span>

                      {/* Micro Badge */}
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bone text-graphite border border-mist"
                        title="Tahap Detail Transaksi"
                      >
                        {microLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
