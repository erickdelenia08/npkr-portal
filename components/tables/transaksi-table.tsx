"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Building,
  Banknote,
  CalendarClock,
  Clock,
  User,
  Home,
  CheckCircle2,
  FileText,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export interface SerializedPembayaran {
  id: number;
  nominal: number;
  jenis_pembayaran: "ITJ" | "DP" | "CICILAN" | "PELUNASAN";
  catatan: string | null;
  is_void?: boolean;
  created_at: string;
}

export interface SerializedTransaksi {
  id: number;
  customer_id: number;
  unit_id: number;
  marketing_id: number;
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
  updated_at: string;
  customer: {
    id: number;
    nama_ktp: string;
    no_hp: string;
    nik: string;
  };
  unit: {
    id: number;
    blok: string;
    tipe: {
      id: number;
      nama_tipe: string;
      kategori: string;
    };
  };
  marketing: {
    id: number;
    nama: string;
    no_hp: string;
  };
  pembayaran: SerializedPembayaran[];
}

interface TransaksiTableProps {
  data: SerializedTransaksi[];
}

// ── Helpers ──

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

const formatDate = (isoString: string): string =>
  new Date(isoString).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getStatusBadge = (status: string) => {
  const norm = status.toUpperCase();

  if (norm.includes("ITJ_DIAJUKAN") || norm.includes("PENGAJUAN")) {
    return {
      label: "ITJ Diajukan",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }
  if (norm.includes("ITJ_DITERIMA") || norm.includes("DITERIMA")) {
    return {
      label: "ITJ Diterima",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (norm.includes("PEMBERKASAN")) {
    return {
      label: status,
      className: "bg-sky-50 text-sky-700 border-sky-200",
    };
  }
  if (norm.includes("PEMBAYARAN")) {
    return {
      label: "Pembayaran",
      className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    };
  }
  if (norm.includes("SP3K")) {
    return {
      label: status,
      className: "bg-purple-50 text-purple-700 border-purple-200",
    };
  }
  if (norm.includes("AKAD")) {
    return {
      label: status,
      className: "bg-teal-50 text-teal-700 border-teal-200",
    };
  }
  if (norm.includes("AJB")) {
    return {
      label: status,
      className: "bg-cyan-50 text-cyan-700 border-cyan-200",
    };
  }
  if (norm.includes("LUNAS") || norm.includes("SELESAI")) {
    return {
      label: status,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (norm.includes("BATAL") || norm.includes("TOLAK")) {
    return {
      label: status,
      className: "bg-rose-50 text-rose-700 border-rose-200",
    };
  }

  return {
    label: status.replace(/_/g, " "),
    className: "bg-bone text-graphite border-mist",
  };
};

export function TransaksiTable({ data }: TransaksiTableProps) {
  const [activeTab, setActiveTab] = useState<string>("KPR");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Counts for each payment method
  const countKpr = useMemo(
    () => data.filter((trx) => trx.metode_bayar === "KPR").length,
    [data]
  );
  const countCashKeras = useMemo(
    () => data.filter((trx) => trx.metode_bayar === "CASH_KERAS").length,
    [data]
  );
  const countCashTempo = useMemo(
    () => data.filter((trx) => trx.metode_bayar === "CASH_TEMPO").length,
    [data]
  );

  const filterByTabAndSearch = (tab: string) => {
    return data.filter((trx) => {
      const matchesTab = trx.metode_bayar === tab;
      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const namaMatch = trx.customer.nama_ktp.toLowerCase().includes(q);
      const blokMatch = trx.unit.blok.toLowerCase().includes(q);
      const tipeMatch = trx.unit.tipe.nama_tipe.toLowerCase().includes(q);
      const marketingMatch = trx.marketing.nama.toLowerCase().includes(q);
      const statusMatch = trx.status_transaksi.toLowerCase().includes(q);

      return (
        namaMatch ||
        blokMatch ||
        tipeMatch ||
        marketingMatch ||
        statusMatch
      );
    });
  };

  const renderTable = (items: SerializedTransaksi[], tabLabel: string) => {
    if (items.length === 0) {
      return (
        <div className="bg-white rounded-lg border border-mist p-16 text-center shadow-subtle">
          <div className="w-14 h-14 rounded-full bg-bone text-slate flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-steel" />
          </div>
          <h3 className="text-sm font-semibold text-carbon-ink">
            Belum ada transaksi metode {tabLabel}
          </h3>
          <p className="text-xs text-slate mt-1.5 max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? `Tidak ditemukan transaksi yang cocok dengan kata kunci "${searchQuery}".`
              : `Transaksi baru dengan skema ${tabLabel} akan muncul otomatis pada tabel ini.`}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-3 text-xs font-semibold text-prism-teal hover:underline"
            >
              Reset Pencarian
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border border-mist shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            {/* Header */}
            <thead className="bg-bone/60 border-b border-mist text-slate font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Tanggal ITJ
                  </span>
                </th>
                <th className="px-5 py-3.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Nama Customer
                  </span>
                </th>
                <th className="px-5 py-3.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5" />
                    Unit (Blok)
                  </span>
                </th>
                <th className="px-5 py-3.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Harga Deal
                  </span>
                </th>
                <th className="px-5 py-3.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5" />
                    Sisa ITJ / DP
                  </span>
                </th>
                <th className="px-5 py-3.5 whitespace-nowrap">Status Transaksi</th>
                <th className="px-5 py-3.5 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-mist">
              {items.map((trx) => {
                const statusBadge = getStatusBadge(trx.status_transaksi);

                // Calculate paid & remaining ITJ and DP (excluding voided payments)
                const itjPaid = trx.pembayaran
                  .filter((p) => !p.is_void && p.jenis_pembayaran === "ITJ")
                  .reduce((sum, p) => sum + p.nominal, 0);

                const dpPaid = trx.pembayaran
                  .filter((p) => !p.is_void && p.jenis_pembayaran === "DP")
                  .reduce((sum, p) => sum + p.nominal, 0);

                const sisaItj = Math.max(0, trx.target_itj - itjPaid);
                const sisaDp = Math.max(0, trx.target_dp - dpPaid);

                return (
                  <tr
                    key={trx.id}
                    className="hover:bg-bone/40 transition-colors group"
                  >
                    {/* Tanggal ITJ */}
                    <td className="px-5 py-3.5 text-slate font-medium whitespace-nowrap">
                      <div>{formatDate(trx.created_at)}</div>
                      <div className="text-[10px] text-fog mt-0.5">
                        Mkt: {trx.marketing.nama}
                      </div>
                    </td>

                    {/* Nama Customer */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-carbon-ink text-sm">
                        {trx.customer.nama_ktp}
                      </div>
                      <div className="text-[11px] text-slate font-mono mt-0.5">
                        {trx.customer.no_hp}
                      </div>
                    </td>

                    {/* Unit (Blok) */}
                    <td className="px-5 py-3.5">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-bone text-graphite text-[11px] font-mono font-semibold border border-mist">
                        {trx.unit.blok}
                      </div>
                      <div className="text-[11px] text-slate mt-0.5 font-medium truncate max-w-[140px]">
                        {trx.unit.tipe.nama_tipe}
                      </div>
                    </td>

                    {/* Harga Deal */}
                    <td className="px-5 py-3.5 font-mono font-semibold text-deep-teal whitespace-nowrap">
                      <div>{formatCurrency(trx.harga_deal)}</div>
                      {trx.metode_bayar === "KPR" && trx.tenor_bulan && (
                        <div className="text-[10px] font-sans text-slate mt-0.5">
                          Tenor: {trx.tenor_bulan} Bulan
                        </div>
                      )}
                    </td>

                    {/* Sisa ITJ / DP */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex flex-col gap-1 min-w-[140px]">
                        {/* ITJ Status */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate">Sisa ITJ:</span>
                          {sisaItj <= 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" />
                              Lunas
                            </span>
                          ) : (
                            <span className="font-mono font-semibold text-amber-600">
                              {formatCurrency(sisaItj)}
                            </span>
                          )}
                        </div>

                        {/* DP Status */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate">Sisa DP:</span>
                          {sisaDp <= 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" />
                              Lunas
                            </span>
                          ) : (
                            <span className="font-mono font-semibold text-carbon-ink">
                              {formatCurrency(sisaDp)}
                            </span>
                          )}
                        </div>

                        {/* Target Summary Helper */}
                        <div className="text-[10px] text-fog font-mono border-t border-mist/60 pt-0.5">
                          Tgt: ITJ {formatCurrency(trx.target_itj)} | DP{" "}
                          {formatCurrency(trx.target_dp)}
                        </div>
                      </div>
                    </td>

                    {/* Status Transaksi */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold border ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="px-5 py-3.5 text-center">
                      <Link
                        href={`/admin/transaksi/${trx.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold
                          bg-carbon-ink text-white
                          hover:bg-carbon-ink/90 active:scale-95
                          shadow-subtle transition-all"
                      >
                        <span>Detail & Kelola</span>
                        <ArrowRight className="w-3 h-3 text-prism-teal" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ─── Tabs & Search Bar ─── */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          if (typeof val === "string") {
            setActiveTab(val);
          }
        }}
        className="w-full space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* 3 Tabs: KPR, Cash Keras, Cash Tempo */}
          <TabsList className="bg-bone/80 border border-mist p-1 h-auto rounded-lg">
            <TabsTrigger
              value="KPR"
              className="px-4 py-2 text-xs font-semibold data-active:bg-white data-active:text-carbon-ink data-active:shadow-subtle rounded-md transition-all"
            >
              <Building className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              KPR
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-bone text-slate font-mono font-semibold">
                {countKpr}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="CASH_KERAS"
              className="px-4 py-2 text-xs font-semibold data-active:bg-white data-active:text-carbon-ink data-active:shadow-subtle rounded-md transition-all"
            >
              <Banknote className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Cash Keras
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-bone text-slate font-mono font-semibold">
                {countCashKeras}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="CASH_TEMPO"
              className="px-4 py-2 text-xs font-semibold data-active:bg-white data-active:text-carbon-ink data-active:shadow-subtle rounded-md transition-all"
            >
              <CalendarClock className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
              Cash Tempo
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-bone text-slate font-mono font-semibold">
                {countCashTempo}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Quick Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari customer, blok, marketing..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-mist rounded-md text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
            />
          </div>
        </div>

        {/* Tab Panels */}
        <TabsContent value="KPR" className="mt-0">
          {renderTable(filterByTabAndSearch("KPR"), "KPR")}
        </TabsContent>
        <TabsContent value="CASH_KERAS" className="mt-0">
          {renderTable(filterByTabAndSearch("CASH_KERAS"), "Cash Keras")}
        </TabsContent>
        <TabsContent value="CASH_TEMPO" className="mt-0">
          {renderTable(filterByTabAndSearch("CASH_TEMPO"), "Cash Tempo")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
