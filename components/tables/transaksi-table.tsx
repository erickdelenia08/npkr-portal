"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  ChevronRight,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react";

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
    no_hp: string | null;
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

export type SortColumn = "created_at" | "customer" | "unit";
export type SortDirection = "asc" | "desc";

export const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua Status" },
  { value: "PEMBERKASAN", label: "Pemberkasan" },
  { value: "PROSES_BANK", label: "Proses Bank" },
  { value: "PEMBAYARAN", label: "Pembayaran" },
  { value: "AKAD_AJB", label: "Akad / AJB" },
  { value: "PEMBANGUNAN", label: "Pembangunan" },
  { value: "SERAH_TERIMA", label: "Serah Terima (BAST)" },
  { value: "BATAL", label: "Batal" },
] as const;

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val);

const formatDate = (isoString: string): string => {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const renderStatusBadge = (status: string) => {
  const norm = status.toUpperCase();
  let style = "bg-zinc-100 text-zinc-700 border-zinc-200";

  if (
    norm.includes("LUNAS") ||
    norm.includes("SELESAI") ||
    norm.includes("BAST") ||
    norm.includes("SERAH_TERIMA")
  ) {
    style = "bg-emerald-50 text-emerald-800 border-emerald-200";
  } else if (norm.includes("AKAD") || norm.includes("AJB")) {
    style = "bg-teal-50 text-teal-800 border-teal-200";
  } else if (norm.includes("SP3K") || norm.includes("BANK") || norm.includes("PROSES_BANK")) {
    style = "bg-blue-50 text-blue-800 border-blue-200";
  } else if (norm.includes("BERKAS") || norm.includes("PEMBERKASAN")) {
    style = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (norm.includes("PEMBANGUNAN")) {
    style = "bg-indigo-50 text-indigo-800 border-indigo-200";
  } else if (norm.includes("PEMBAYARAN")) {
    style = "bg-purple-50 text-purple-800 border-purple-200";
  } else if (norm.includes("BATAL") || norm.includes("TOLAK")) {
    style = "bg-rose-50 text-rose-700 border-rose-200";
  }

  const labelMap: Record<string, string> = {
    PEMBERKASAN: "Pemberkasan",
    PROSES_BANK: "Proses Bank",
    PEMBAYARAN: "Pembayaran",
    AKAD_AJB: "Akad / AJB",
    PEMBANGUNAN: "Pembangunan",
    SERAH_TERIMA: "Serah Terima",
    BATAL: "Batal",
  };

  const displayLabel = labelMap[norm] || status.replace(/_/g, " ");

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {displayLabel}
    </span>
  );
};

export function TransaksiTable({ data }: TransaksiTableProps) {
  // Filter states
  const [selectedMetode, setSelectedMetode] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sort states: default to newest ITJ first
  const [sortColumn, setSortColumn] = useState<SortColumn>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Summary counts for payment methods
  const counts = useMemo(
    () => ({
      all: data.length,
      kpr: data.filter((trx) => trx.metode_bayar === "KPR").length,
      cashKeras: data.filter((trx) => trx.metode_bayar === "CASH_KERAS").length,
      cashTempo: data.filter((trx) => trx.metode_bayar === "CASH_TEMPO").length,
    }),
    [data]
  );

  // Sorting click handler:
  // - First click on a new column: sort ascending
  // - Click on already active column: toggle ascending <-> descending
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const isFiltered =
    selectedMetode !== "ALL" ||
    selectedStatus !== "ALL" ||
    searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setSelectedMetode("ALL");
    setSelectedStatus("ALL");
    setSearchQuery("");
  };

  // Pipeline pemrosesan data (sesuai urutan mandat):
  // 1. Filter berdasarkan skema pembayaran
  // 2. Filter berdasarkan status transaksi
  // 3. Filter berdasarkan pencarian
  // 4. Sorting berdasarkan kolom aktif
  const processedData = useMemo(() => {
    // 1. Filter berdasarkan skema pembayaran
    const afterMetode = data.filter((trx) => {
      if (selectedMetode === "ALL") return true;
      return trx.metode_bayar === selectedMetode;
    });

    // 2. Filter berdasarkan status transaksi (exact matching)
    const afterStatus = afterMetode.filter((trx) => {
      if (selectedStatus === "ALL") return true;
      return trx.status_transaksi === selectedStatus;
    });

    // 3. Filter berdasarkan pencarian
    const q = searchQuery.trim().toLowerCase();
    const afterSearch = q
      ? afterStatus.filter((trx) => {
          return (
            trx.customer.nama_ktp.toLowerCase().includes(q) ||
            trx.customer.nik.toLowerCase().includes(q) ||
            trx.unit.blok.toLowerCase().includes(q) ||
            trx.unit.tipe.nama_tipe.toLowerCase().includes(q) ||
            trx.marketing.nama.toLowerCase().includes(q) ||
            trx.status_transaksi.toLowerCase().includes(q)
          );
        })
      : afterStatus;

    // 4. Sorting berdasarkan kolom aktif (tanpa memutasi array asal)
    return [...afterSearch].sort((a, b) => {
      let cmp = 0;
      if (sortColumn === "created_at") {
        const timeA = new Date(a.created_at).getTime() || 0;
        const timeB = new Date(b.created_at).getTime() || 0;
        cmp = timeA - timeB;
      } else if (sortColumn === "customer") {
        cmp = a.customer.nama_ktp.localeCompare(b.customer.nama_ktp, "id", {
          sensitivity: "base",
        });
      } else if (sortColumn === "unit") {
        // Natural sort agar Blok A-2 berada sebelum A-10
        cmp = a.unit.blok.localeCompare(b.unit.blok, "id", {
          numeric: true,
          sensitivity: "base",
        });
      }

      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [
    data,
    selectedMetode,
    selectedStatus,
    searchQuery,
    sortColumn,
    sortDirection,
  ]);

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return (
        <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
      );
    }

    return sortDirection === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-teal-700 shrink-0" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-teal-700 shrink-0" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-zinc-50/60 p-2.5 rounded-lg border border-zinc-200">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari customer, NIK, blok, sales..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-zinc-200 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
          />
        </div>

        {/* Filter Skema Pembayaran */}
        <select
          value={selectedMetode}
          onChange={(e) => setSelectedMetode(e.target.value)}
          aria-label="Filter skema pembayaran"
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
        >
          <option value="ALL">Semua Skema ({counts.all})</option>
          <option value="KPR">KPR ({counts.kpr})</option>
          <option value="CASH_KERAS">Cash Keras ({counts.cashKeras})</option>
          <option value="CASH_TEMPO">Cash Tempo ({counts.cashTempo})</option>
        </select>

        {/* Filter Status Transaksi */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          aria-label="Filter status transaksi"
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Reset Filter Button */}
        {isFiltered && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="h-8 px-2.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
            title="Reset semua filter pencarian dan status"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Main Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/75 text-zinc-500 font-medium">
                {/* 1. Sortable: Tanggal ITJ */}
                <th
                  scope="col"
                  onClick={() => handleSort("created_at")}
                  aria-sort={
                    sortColumn === "created_at"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:bg-zinc-100/80 transition-colors group"
                  title="Klik untuk mengubah urutan tanggal ITJ"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={
                        sortColumn === "created_at"
                          ? "font-semibold text-zinc-900"
                          : ""
                      }
                    >
                      Tanggal ITJ
                    </span>
                    {renderSortIcon("created_at")}
                  </div>
                </th>

                {/* 2. Sortable: Konsumen */}
                <th
                  scope="col"
                  onClick={() => handleSort("customer")}
                  aria-sort={
                    sortColumn === "customer"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:bg-zinc-100/80 transition-colors group"
                  title="Klik untuk mengubah urutan nama konsumen"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={
                        sortColumn === "customer"
                          ? "font-semibold text-zinc-900"
                          : ""
                      }
                    >
                      Konsumen
                    </span>
                    {renderSortIcon("customer")}
                  </div>
                </th>

                {/* 3. Sortable: Unit */}
                <th
                  scope="col"
                  onClick={() => handleSort("unit")}
                  aria-sort={
                    sortColumn === "unit"
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="px-4 py-3 whitespace-nowrap cursor-pointer select-none hover:bg-zinc-100/80 transition-colors group"
                  title="Klik untuk mengubah urutan blok unit secara natural"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={
                        sortColumn === "unit"
                          ? "font-semibold text-zinc-900"
                          : ""
                      }
                    >
                      Unit
                    </span>
                    {renderSortIcon("unit")}
                  </div>
                </th>

                <th className="px-4 py-3 whitespace-nowrap">Harga Deal</th>
                <th className="px-4 py-3 whitespace-nowrap">Kewajiban ITJ / DP</th>
                <th className="px-4 py-3 whitespace-nowrap">Status Transaksi</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {processedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    <p className="text-sm font-medium text-zinc-900">
                      Tidak ada transaksi yang cocok
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {isFiltered
                        ? "Ubah kata kunci, filter status, atau skema pembayaran untuk menemukan data."
                        : "Belum ada transaksi yang tercatat dalam sistem."}
                    </p>
                    {isFiltered && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-md transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Filter</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                processedData.map((trx) => {
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
                      className="hover:bg-zinc-50/70 transition-colors"
                    >
                      {/* Tanggal & Marketing */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-zinc-500">
                        <div>{formatDate(trx.created_at)}</div>
                        <div className="text-[10px] text-zinc-400 font-sans mt-0.5">
                          PIC: {trx.marketing.nama}
                        </div>
                      </td>

                      {/* Konsumen */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="md:font-semibold text-zinc-900 text-[13px] text-nowrap">
                            {trx.customer.nama_ktp}
                          </span>
                          <span className="hidden md:block text-[11px] font-mono text-zinc-400 mt-0.5">
                            {trx.customer.no_hp || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-900">
                            {trx.unit.blok}
                          </span>
                        </div>
                      </td>

                      {/* Harga Deal & Skema */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono font-medium text-zinc-900 text-xs">
                            {formatCurrency(trx.harga_deal)}
                          </span>
                          <span className="text-[11px] text-zinc-500 mt-0.5">
                            {trx.metode_bayar === "CASH_KERAS"
                              ? "Cash Keras"
                              : trx.metode_bayar === "CASH_TEMPO"
                                ? "Cash Tempo"
                                : "KPR"}
                            {trx.tenor_bulan ? ` (${trx.tenor_bulan} bln)` : ""}
                          </span>
                        </div>
                      </td>

                      {/* Sisa ITJ / DP */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-400">ITJ:</span>
                            {sisaItj <= 0 ? (
                              <span className="text-emerald-700 font-medium inline-flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Lunas
                              </span>
                            ) : (
                              <span className="font-mono font-medium text-amber-700">
                                {formatCurrency(sisaItj)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-400">DP:</span>
                            {sisaDp <= 0 ? (
                              <span className="text-emerald-700 font-medium inline-flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Lunas
                              </span>
                            ) : (
                              <span className="font-mono text-zinc-700">
                                {formatCurrency(sisaDp)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderStatusBadge(trx.status_transaksi)}
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/admin/transaksi/${trx.id}`}
                          className="px-2.5 py-1 rounded text-xs font-medium border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors inline-flex items-center gap-1"
                        >
                          <span>Kelola</span>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 border-t border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-zinc-500">
          <span>
            Menampilkan{" "}
            <span className="font-medium text-zinc-800">
              {processedData.length}
            </span>{" "}
            dari{" "}
            <span className="font-medium text-zinc-800">{data.length}</span>{" "}
            total transaksi
          </span>
          {isFiltered && (
            <span className="text-[11px] text-zinc-400">
              (Filter aktif diterapkan)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
