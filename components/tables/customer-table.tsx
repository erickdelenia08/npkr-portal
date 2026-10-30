"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ChevronRight, Phone, MapPin } from "lucide-react";
import { SerializedCustomerListItem } from "@/actions/customer.action";

interface CustomerTableProps {
  initialCustomers: SerializedCustomerListItem[];
  basePath: "/admin" | "/manager";
}

const formatDate = (val: string | null | undefined): string => {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export function CustomerTable({
  initialCustomers,
  basePath,
}: CustomerTableProps) {
  const [search, setSearch] = useState<string>("");
  const [segmentFilter, setSegmentFilter] = useState<"ALL" | "REPEAT" | "SINGLE">("ALL");

  const totalCustomers = initialCustomers.length;
  const repeatBuyersCount = useMemo(
    () => initialCustomers.filter((c) => c.jumlah_unit > 1).length,
    [initialCustomers]
  );
  const totalUnitsPurchased = useMemo(
    () => initialCustomers.reduce((acc, curr) => acc + curr.jumlah_unit, 0),
    [initialCustomers]
  );

  const filteredCustomers = useMemo(() => {
    return initialCustomers.filter((c) => {
      if (segmentFilter === "REPEAT" && c.jumlah_unit <= 1) return false;
      if (segmentFilter === "SINGLE" && c.jumlah_unit !== 1) return false;

      if (!search.trim()) return true;
      const term = search.toLowerCase().trim();

      return (
        c.nama_ktp.toLowerCase().includes(term) ||
        c.nik.toLowerCase().includes(term) ||
        (c.no_hp ? c.no_hp.toLowerCase().includes(term) : false) ||
        (c.alamat_ktp && c.alamat_ktp.toLowerCase().includes(term))
      );
    });
  }, [initialCustomers, search, segmentFilter]);

  return (
    <div className="space-y-4">
      {/* Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Total Customer</span>
          <span className="text-xl font-semibold text-zinc-900 mt-1 block tabular-nums">
            {totalCustomers}
          </span>
        </div>

        {/* <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Repeat Buyer (&gt; 1 Unit)</span>
          <span className="text-xl font-semibold text-zinc-900 mt-1 block tabular-nums">
            {repeatBuyersCount}
          </span>
        </div> */}

        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Total Unit Terikat</span>
          <span className="text-xl font-semibold text-zinc-900 mt-1 block tabular-nums">
            {totalUnitsPurchased}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-zinc-50/60 p-2.5 rounded-lg border border-zinc-200">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, NIK, atau no. HP..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-zinc-200 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
          />
        </div>

        <select
          value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value as "ALL" | "REPEAT" | "SINGLE")}
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="ALL">Semua Kepemilikan</option>
          <option value="REPEAT">Repeat Buyer (&gt; 1 Unit)</option>
          <option value="SINGLE">Satu Unit</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/75 text-zinc-500 font-medium">
                <th className="px-4 py-3 whitespace-nowrap">Nama &amp; Identitas</th>
                <th className="px-4 py-3 whitespace-nowrap">NIK</th>
                <th className="px-4 py-3 whitespace-nowrap">Kontak</th>
                <th className="px-4 py-3 whitespace-nowrap">Alamat Domisili</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Aset Unit</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                    <p className="text-sm font-medium text-zinc-900">Tidak ada customer yang sesuai</p>
                    <p className="text-xs text-zinc-500 mt-1">Ubah kata kunci pencarian atau sesuaikan filter kepemilikan.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const isRepeatBuyer = cust.jumlah_unit > 1;

                  return (
                    <tr key={cust.id} className="hover:bg-zinc-50/70 transition-colors">
                      {/* Nama & TTL */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <Link
                            href={`${basePath}/customer/${cust.id}`}
                            className="font-semibold text-zinc-900 hover:underline text-[13px]"
                          >
                            {cust.nama_ktp}
                          </Link>
                          {(cust.tempat_lahir || cust.tgl_lahir) && (
                            <span className="text-[11px] text-zinc-400 mt-0.5">
                              {cust.tempat_lahir ? `${cust.tempat_lahir}, ` : ""}
                              {formatDate(cust.tgl_lahir)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* NIK */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-zinc-600">
                        {cust.nik}
                      </td>

                      {/* No HP */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-zinc-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{cust.no_hp || "—"}</span>
                        </span>
                      </td>

                      {/* Alamat */}
                      <td className="px-4 py-3 max-w-xs text-zinc-600">
                        <div className="flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2" title={cust.alamat_ktp}>
                            {cust.alamat_ktp || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Jumlah Unit */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {isRepeatBuyer ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border border-zinc-300 bg-zinc-100 text-zinc-900">
                            {cust.jumlah_unit} Unit
                          </span>
                        ) : cust.jumlah_unit === 1 ? (
                          <span className="text-zinc-700 text-xs font-mono font-medium">
                            1 Unit
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs">0 Unit</span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`${basePath}/customer/${cust.id}`}
                          className="px-2.5 py-1 rounded text-xs font-medium border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors inline-flex items-center gap-1"
                        >
                          <span>Detail</span>
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
            Menampilkan <span className="font-medium text-zinc-800">{filteredCustomers.length}</span> dari{" "}
            <span className="font-medium text-zinc-800">{totalCustomers}</span> customer
          </span>
        </div>
      </div>
    </div>
  );
}