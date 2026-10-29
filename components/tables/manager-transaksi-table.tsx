// components/tables/manager-transaksi-table.tsx
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  MessageCircle,
  Eye,
  X,
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
    no_hp: string | null;
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
    is_void?: boolean;
    created_at: string;
  }[];
}

interface ManagerTransaksiTableProps {
  data: SerializedManagerTransaksi[];
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

const getWhatsAppUrl = (phone: string, text?: string): string => {
  let clean = phone.replace(/[\s-+]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  }
  const base = `https://wa.me/${clean}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
};

export const getStatusCategory = (status: string) => {
  const s = status.toUpperCase();

  if (s.includes("AKAD") || s.includes("BAST") || s.includes("LUNAS") || s.includes("SELESAI")) {
    return {
      category: "AKAD_BAST",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (s.includes("BI CHECKING") || s.includes("SLIK") || s.includes("SP3K") || s.includes("BANK")) {
    return {
      category: "BANK",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }
  if (s.includes("PEMBAYARAN")) {
    return {
      category: "PEMBAYARAN",
      className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    };
  }
  if (s.includes("BERKAS") || s.includes("PEMBERKASAN") || s.includes("DOKUMEN") || s.includes("ITJ")) {
    return {
      category: "PEMBERKASAN",
      className: "bg-amber-50 text-amber-800 border-amber-200",
    };
  }
  if (s.includes("BATAL") || s.includes("TOLAK") || s.includes("REJECT") || s.includes("GAGAL")) {
    return {
      category: "BATAL",
      className: "bg-rose-50 text-rose-700 border-rose-200",
    };
  }
  return {
    category: "OTHER",
    className: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };
};

export function ManagerTransaksiTable({ data }: ManagerTransaksiTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [metodeFilter, setMetodeFilter] = useState<string>("ALL");
  const [statusFilterGroup, setStatusFilterGroup] = useState<string>("ALL");
  const [selectedTransaksi, setSelectedTransaksi] = useState<SerializedManagerTransaksi | null>(null);

  const filteredData = useMemo(() => {
    return data.filter((trx) => {
      if (metodeFilter !== "ALL" && trx.metode_bayar !== metodeFilter) {
        return false;
      }

      if (statusFilterGroup !== "ALL") {
        const { category } = getStatusCategory(trx.status_transaksi);
        if (category !== statusFilterGroup) {
          return false;
        }
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
  }, [data, metodeFilter, statusFilterGroup, searchQuery]);

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
            placeholder="Cari konsumen, NIK, blok, sales..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-zinc-200 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
          />
        </div>

        <select
          value={metodeFilter}
          onChange={(e) => setMetodeFilter(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="ALL">Semua Skema</option>
          <option value="KPR">KPR</option>
          <option value="CASH_KERAS">Cash Keras</option>
          <option value="CASH_TEMPO">Cash Tempo</option>
        </select>

        <select
          value={statusFilterGroup}
          onChange={(e) => setStatusFilterGroup(e.target.value)}
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="ALL">Semua Tahapan</option>
          <option value="PEMBERKASAN">Pemberkasan</option>
          <option value="BANK">BI Checking &amp; SP3K</option>
          <option value="PEMBAYARAN">Pembayaran</option>
          <option value="AKAD_BAST">Akad &amp; BAST</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/75 text-zinc-500 font-medium">
                <th className="px-4 py-3 whitespace-nowrap">Tgl ITJ</th>
                <th className="px-4 py-3 whitespace-nowrap">Konsumen</th>
                <th className="px-4 py-3 whitespace-nowrap">Unit</th>
                <th className="px-4 py-3 whitespace-nowrap">Marketing PIC</th>
                <th className="px-4 py-3 whitespace-nowrap">Skema Bayar</th>
                <th className="px-4 py-3 whitespace-nowrap">Status Transaksi</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    <p className="text-sm font-medium text-zinc-900">Tidak ada transaksi yang cocok</p>
                    <p className="text-xs text-zinc-500 mt-1">Ubah kata kunci pencarian atau sesuaikan filter Anda.</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((trx) => {
                  const { className: badgeStyle } = getStatusCategory(trx.status_transaksi);

                  return (
                    <tr key={trx.id} className="hover:bg-zinc-50/70 transition-colors">
                      {/* Tanggal ITJ */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-zinc-500 text-[11px]">
                        {formatDate(trx.tgl_itj)}
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
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-900">Blok {trx.unit.blok}</span>
                          <span className="text-[11px] text-zinc-500">
                            {trx.unit.tipe.nama_tipe} ({trx.unit.tipe.kategori})
                          </span>
                        </div>
                      </td>

                      {/* PIC */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-zinc-800">{trx.marketing.nama}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">@{trx.marketing.username}</span>
                        </div>
                      </td>

                      {/* Skema */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-zinc-800 text-[11px]">
                            {trx.metode_bayar === "CASH_KERAS"
                              ? "Cash Keras"
                              : trx.metode_bayar === "CASH_TEMPO"
                                ? "Cash Tempo"
                                : "KPR"}
                            {trx.tenor_bulan ? ` (${trx.tenor_bulan} bln)` : ""}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {formatCurrency(trx.harga_deal)}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${badgeStyle}`}>
                            {trx.status_transaksi}
                          </span>
                          {trx.nama_bank && (
                            <span className="text-[11px] text-zinc-500">
                              Bank: <strong className="font-medium text-zinc-700">{trx.nama_bank}</strong>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedTransaksi(trx)}
                          className="px-2.5 py-1 rounded text-xs font-medium border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-zinc-400" />
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

        {/* Footer info */}
        <div className="px-4 py-2.5 border-t border-zinc-200 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-500">
          <span>
            Menampilkan <span className="font-medium text-zinc-800">{filteredData.length}</span> dari{" "}
            <span className="font-medium text-zinc-800">{data.length}</span> total transaksi
          </span>
        </div>
      </div>

      {/* Modal Detail (Read-Only) */}
      {selectedTransaksi && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-xl bg-white rounded-lg border border-zinc-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 bg-zinc-50/50">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Unit #{selectedTransaksi.unit.blok} — {selectedTransaksi.customer.nama_ktp}
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Tgl ITJ: {formatDate(selectedTransaksi.tgl_itj)} • NIK: {selectedTransaksi.customer.nik}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaksi(null)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs text-zinc-700">
              {/* Status Ringkas */}
              <div className="flex items-center justify-between p-3 rounded-md border border-zinc-200 bg-zinc-50/60">
                <div>
                  <span className="text-[11px] text-zinc-500 block">Status Saat Ini</span>
                  <span className="font-semibold text-zinc-900 text-sm mt-0.5 block">
                    {selectedTransaksi.status_transaksi}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-500 block">Harga Deal</span>
                  <span className="font-semibold text-zinc-900 font-mono text-sm mt-0.5 block">
                    {formatCurrency(selectedTransaksi.harga_deal)}
                  </span>
                </div>
              </div>

              {/* Data Detail Dua Kolom */}
              <div className="grid grid-cols-2 gap-4 border-b border-zinc-100 pb-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-zinc-400 text-[11px] block">Tipe Properti</span>
                    <span className="font-medium text-zinc-800">
                      {selectedTransaksi.unit.tipe.nama_tipe} ({selectedTransaksi.unit.tipe.kategori})
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[11px] block">Skema Pembayaran</span>
                    <span className="font-medium text-zinc-800">
                      {selectedTransaksi.metode_bayar}
                      {selectedTransaksi.tenor_bulan ? ` • Tenor ${selectedTransaksi.tenor_bulan} bln` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[11px] block">Komitmen Finansial</span>
                    <span className="font-mono text-zinc-700">
                      ITJ: {formatCurrency(selectedTransaksi.target_itj)} | DP: {formatCurrency(selectedTransaksi.target_dp)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-zinc-400 text-[11px] block">Bank Rekanan</span>
                    <span className="font-medium text-zinc-800">
                      {selectedTransaksi.nama_bank || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[11px] block">Notaris</span>
                    <span className="font-medium text-zinc-800">
                      {selectedTransaksi.nama_notaris || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[11px] block">Jadwal Akad / BAST</span>
                    <span className="font-mono text-zinc-700">
                      Akad: {selectedTransaksi.tgl_akad ? formatDate(selectedTransaksi.tgl_akad) : "—"} | BAST: {selectedTransaksi.tgl_bast ? formatDate(selectedTransaksi.tgl_bast) : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Catatan Admin */}
              {selectedTransaksi.catatan_admin && (
                <div className="p-3 rounded-md bg-zinc-50 border border-zinc-200">
                  <span className="text-[11px] font-medium text-zinc-500 block mb-1">
                    Catatan Internal Admin
                  </span>
                  <p className="text-zinc-700 leading-relaxed">
                    {selectedTransaksi.catatan_admin}
                  </p>
                </div>
              )}

              {/* Riwayat Pembayaran */}
              <div className="space-y-2">
                <span className="text-[11px] font-medium text-zinc-500 block">
                  Riwayat Pembayaran Masuk ({selectedTransaksi.pembayaran.length})
                </span>
                {selectedTransaksi.pembayaran.length === 0 ? (
                  <p className="text-zinc-400 italic py-2">Belum ada mutasi kwitansi pembayaran.</p>
                ) : (
                  <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-md">
                    {selectedTransaksi.pembayaran.map((p) => (
                      <div key={p.id} className="p-2.5 flex items-center justify-between bg-white text-xs">
                        <div>
                          <span className="font-medium text-zinc-900 block">{p.jenis_pembayaran}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {formatDate(p.created_at)}
                            {p.catatan ? ` • ${p.catatan}` : ""}
                          </span>
                        </div>
                        <span className="font-mono font-medium text-zinc-800">
                          {formatCurrency(p.nominal)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50/50 flex items-center justify-between text-xs">
              <div className="hidden md:flex items-center gap-2 text-zinc-500">
                <span>PIC:</span>
                <span className="font-medium text-zinc-800">{selectedTransaksi.marketing.nama}</span>
                {selectedTransaksi.marketing.no_hp && (
                  <a
                    href={getWhatsAppUrl(
                      selectedTransaksi.marketing.no_hp,
                      `Halo ${selectedTransaksi.marketing.nama}, terkait transaksi unit ${selectedTransaksi.unit.blok} (${selectedTransaksi.customer.nama_ktp}).`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-medium ml-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/manager/transaksi/${selectedTransaksi.id}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white transition-colors"
                >
                  <span>Detail</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedTransaksi(null)}
                  className="px-3 py-1.5 rounded text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}