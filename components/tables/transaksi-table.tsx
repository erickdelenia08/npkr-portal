"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ChevronRight, Check } from "lucide-react";

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

  if (norm.includes("LUNAS") || norm.includes("SELESAI") || norm.includes("BAST")) {
    style = "bg-emerald-50 text-emerald-800 border-emerald-200";
  } else if (norm.includes("AKAD") || norm.includes("AJB")) {
    style = "bg-teal-50 text-teal-800 border-teal-200";
  } else if (norm.includes("SP3K") || norm.includes("BANK")) {
    style = "bg-blue-50 text-blue-800 border-blue-200";
  } else if (norm.includes("BERKAS") || norm.includes("PEMBERKASAN")) {
    style = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (norm.includes("BATAL") || norm.includes("TOLAK")) {
    style = "bg-zinc-100 text-zinc-500 border-zinc-200";
  }

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
};

export function TransaksiTable({ data }: TransaksiTableProps) {
  const [selectedMetode, setSelectedMetode] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const counts = useMemo(
    () => ({
      all: data.length,
      kpr: data.filter((trx) => trx.metode_bayar === "KPR").length,
      cashKeras: data.filter((trx) => trx.metode_bayar === "CASH_KERAS").length,
      cashTempo: data.filter((trx) => trx.metode_bayar === "CASH_TEMPO").length,
    }),
    [data]
  );

  const filteredData = useMemo(() => {
    return data.filter((trx) => {
      if (selectedMetode !== "ALL" && trx.metode_bayar !== selectedMetode) {
        return false;
      }

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        trx.customer.nama_ktp.toLowerCase().includes(q) ||
        trx.customer.nik.toLowerCase().includes(q) ||
        trx.unit.blok.toLowerCase().includes(q) ||
        trx.unit.tipe.nama_tipe.toLowerCase().includes(q) ||
        trx.marketing.nama.toLowerCase().includes(q) ||
        trx.status_transaksi.toLowerCase().includes(q)
      );
    });
  }, [data, selectedMetode, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-zinc-50/60 p-2.5 rounded-lg border border-zinc-200">
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

        <select
          value={selectedMetode}
          onChange={(e) => setSelectedMetode(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="ALL">Semua Skema ({counts.all})</option>
          <option value="KPR">KPR ({counts.kpr})</option>
          <option value="CASH_KERAS">Cash Keras ({counts.cashKeras})</option>
          <option value="CASH_TEMPO">Cash Tempo ({counts.cashTempo})</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/75 text-zinc-500 font-medium">
                <th className="px-4 py-3 whitespace-nowrap">Tanggal ITJ</th>
                <th className="px-4 py-3 whitespace-nowrap">Konsumen</th>
                <th className="px-4 py-3 whitespace-nowrap">Unit</th>
                <th className="px-4 py-3 whitespace-nowrap">Harga Deal</th>
                <th className="px-4 py-3 whitespace-nowrap">Kewajiban ITJ / DP</th>
                <th className="px-4 py-3 whitespace-nowrap">Status Transaksi</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    <p className="text-sm font-medium text-zinc-900">Tidak ada transaksi yang cocok</p>
                    <p className="text-xs text-zinc-500 mt-1">Ubah kata kunci atau pilih skema pembayaran lain.</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((trx) => {
                  const itjPaid = trx.pembayaran
                    .filter((p) => !p.is_void && p.jenis_pembayaran === "ITJ")
                    .reduce((sum, p) => sum + p.nominal, 0);

                  const dpPaid = trx.pembayaran
                    .filter((p) => !p.is_void && p.jenis_pembayaran === "DP")
                    .reduce((sum, p) => sum + p.nominal, 0);

                  const sisaItj = Math.max(0, trx.target_itj - itjPaid);
                  const sisaDp = Math.max(0, trx.target_dp - dpPaid);

                  return (
                    <tr key={trx.id} className="hover:bg-zinc-50/70 transition-colors">
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
                          <span className="font-semibold text-zinc-900 text-[13px]">
                            {trx.customer.nama_ktp}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400 mt-0.5">
                            {trx.customer.no_hp || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-900">Blok {trx.unit.blok}</span>
                          <span className="text-[11px] text-zinc-500">
                            {trx.unit.tipe.nama_tipe} ({trx.unit.tipe.kategori})
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
        <div className="px-4 py-2.5 border-t border-zinc-200 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-500">
          <span>
            Menampilkan <span className="font-medium text-zinc-800">{filteredData.length}</span> dari{" "}
            <span className="font-medium text-zinc-800">{data.length}</span> total transaksi
          </span>
        </div>
      </div>
    </div>
  );
}