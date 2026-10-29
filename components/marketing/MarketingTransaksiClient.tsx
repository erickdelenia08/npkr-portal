"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ReceiptText,
  Search,
  Phone,
  ChevronRight,
  Sparkles,
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
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
      return "BAST Selesai";
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
      return "Serah Terima (BAST)";
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

function getMetodeLabel(metode: MetodeBayar): string {
  switch (metode) {
    case "KPR":
      return "KPR";
    case "CASH_KERAS":
      return "Cash Keras";
    case "CASH_TEMPO":
      return "Cash Tempo";
    default:
      return metode;
  }
}

export function MarketingTransaksiClient({
  initialData,
}: MarketingTransaksiClientProps) {
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const isFinished = (trx: MarketingTransaksiItem): boolean =>
    trx.status_transaksi === "BATAL" ||
    trx.status_transaksi === "SERAH_TERIMA" ||
    trx.tahap_detail === "BAST" ||
    trx.tahap_detail === "BATAL";

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

  const filteredList = useMemo(() => {
    return initialData.filter((trx) => {
      if (filter === "AKTIF" && isFinished(trx)) return false;
      if (filter === "SELESAI" && !isFinished(trx)) return false;

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
    <div className="space-y-4 max-w-4xl mx-auto font-sans text-zinc-900 pb-20 sm:pb-12">
      {/* ─── 1. Header & Summary Bar ─── */}
      <div className="bg-white p-4 sm:p-5 rounded-lg border border-zinc-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900">
                Transaksi &amp; Closing Saya
              </h1>
              {/* <span className="text-[11px] px-2 py-0.5 rounded-lg bg-zinc-100 text-zinc-600 font-medium font-mono">
                {counts.all} Closing
              </span> */}
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">
              Pantau alur pemberkasan, approval bank, hingga serah terima unit konsumen.
            </p>
          </div>

          <div className="self-start sm:self-auto">
            <Link
              href="/marketing/lead"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors"
            >
              {/* <Sparkles className="w-3.5 h-3.5" /> */}
              <span>Kelola Lead</span>
            </Link>
          </div>
        </div>

        {/* Quick Metrics (3 Kolom Ringkas) */}
        <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-zinc-100">
          <div className="p-2.5 sm:p-3 rounded-md bg-zinc-50 border border-zinc-200/70">
            <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 block truncate">
              Total Closing
            </span>
            <span className="font-mono text-base sm:text-xl font-semibold text-zinc-900 mt-0.5 block tabular-nums">
              {counts.all}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-md bg-zinc-50 border border-zinc-200/70">
            <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 block truncate">
              Sedang Berjalan
            </span>
            <span className="font-mono text-base sm:text-xl font-semibold text-zinc-900 mt-0.5 block tabular-nums">
              {counts.aktif}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 rounded-md bg-zinc-50 border border-zinc-200/70">
            <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 block truncate">
              BAST Selesai
            </span>
            <span className="font-mono text-base sm:text-xl font-semibold text-emerald-700 mt-0.5 block tabular-nums">
              {counts.selesai}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 2. Filter Tabs & Search Bar ─── */}
      <div className="bg-white p-3 sm:p-3.5 rounded-lg border border-zinc-200 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`px-3 py-1.5 rounded-md font-medium shrink-0 transition-colors ${filter === "ALL"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
            >
              Semua ({counts.all})
            </button>

            <button
              type="button"
              onClick={() => setFilter("AKTIF")}
              className={`px-3 py-1.5 rounded-md font-medium shrink-0 transition-colors ${filter === "AKTIF"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
            >
              Aktif ({counts.aktif})
            </button>

            <button
              type="button"
              onClick={() => setFilter("SELESAI")}
              className={`px-3 py-1.5 rounded-md font-medium shrink-0 transition-colors ${filter === "SELESAI"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
            >
              Selesai ({counts.selesai})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari konsumen, blok, NIK..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-zinc-200 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
            />
          </div>
        </div>
      </div>

      {/* ─── 3. Transaction Card List ─── */}
      {filteredList.length === 0 ? (
        <div className="bg-white rounded-lg border border-zinc-200 p-8 sm:p-12 text-center text-xs text-zinc-500 space-y-2">
          <ReceiptText className="w-8 h-8 text-zinc-300 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-900">
            {initialData.length === 0
              ? "Belum ada transaksi closing"
              : "Tidak ada transaksi yang cocok"}
          </h3>
          <p className="text-zinc-400 max-w-sm mx-auto">
            {initialData.length === 0
              ? "Transaksi akan otomatis muncul setelah pengajuan tanda jadi (ITJ) disetujui."
              : "Coba sesuaikan kata kunci pencarian atau ganti filter status."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredList.map((trx) => {
            const macroLabel = getMacroLabel(trx.status_transaksi);
            const microLabel = formatTahapDetail(trx.tahap_detail);
            const isDone = trx.status_transaksi === "SERAH_TERIMA" || trx.tahap_detail === "BAST";
            const isBatal = trx.status_transaksi === "BATAL" || trx.tahap_detail === "BATAL";

            return (
              <Link
                key={trx.id}
                href={`/marketing/transaksi/${trx.id}`}
                className="block bg-white rounded-lg border border-zinc-200 hover:border-zinc-300 p-3.5 sm:p-4 transition-colors group"
              >
                <div className="space-y-2.5">
                  {/* Top: Blok, Unit, Skema & Tanggal */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-900 shrink-0">
                        Blok {trx.unit.blok}
                      </span>
                      {trx.unit.tipe?.nama_tipe && (
                        <span className="text-[11px] text-zinc-500 truncate">
                          {trx.unit.tipe.nama_tipe}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono text-zinc-400">
                      <span className="px-1.5 py-0.2 rounded border border-zinc-200 text-zinc-700 font-sans">
                        {getMetodeLabel(trx.metode_bayar)}
                      </span>
                      <span>•</span>
                      <span>{formatDate(trx.created_at)}</span>
                    </div>
                  </div>

                  {/* Mid: Nama Customer & Kontak */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-zinc-900 group-hover:underline truncate">
                        {trx.customer.nama_ktp}
                      </h2>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-0.5">
                        <span>NIK: {trx.customer.nik || "—"}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-zinc-700">
                          <Phone className="w-3 h-3 text-zinc-400" />
                          {trx.customer.no_hp}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-800 shrink-0 mt-1 transition-colors" />
                  </div>

                  {/* Bottom: Harga Deal & Status Tahap */}
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[11px] text-zinc-400 font-sans">Deal:</span>
                      <span className="font-semibold text-zinc-900">
                        {formatRupiah(trx.harga_deal)}
                      </span>
                      {trx.itj?.nominal ? (
                        <span className="text-[10px] text-zinc-500 hidden sm:inline">
                          (ITJ: {formatRupiah(trx.itj.nominal)})
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${isDone
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : isBatal
                            ? "bg-zinc-100 text-zinc-500 border-zinc-200"
                            : "bg-zinc-50 text-zinc-800 border-zinc-200"
                          }`}
                      >
                        {macroLabel}
                      </span>
                      <span className="text-[10px] text-zinc-400 hidden xs:inline">
                        • {microLabel}
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