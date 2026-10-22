"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  ArrowRight,
  Home,
  Sparkles,
  Phone,
  MapPin,
  Users,
} from "lucide-react";
import { SerializedCustomerListItem } from "@/actions/customer.action";

interface CustomerTableProps {
  initialCustomers: SerializedCustomerListItem[];
  basePath: "/admin" | "/manager";
}

export function CustomerTable({
  initialCustomers,
  basePath,
}: CustomerTableProps) {
  const [search, setSearch] = useState<string>("");

  // Client-side search filtering by Name, NIK, or Phone
  const filteredCustomers = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return initialCustomers;

    return initialCustomers.filter(
      (c) =>
        c.nama_ktp.toLowerCase().includes(term) ||
        c.nik.toLowerCase().includes(term) ||
        c.no_hp.toLowerCase().includes(term) ||
        c.alamat_ktp.toLowerCase().includes(term)
    );
  }, [initialCustomers, search]);

  // Metric counts
  const totalCustomers = initialCustomers.length;
  const repeatBuyersCount = initialCustomers.filter((c) => c.jumlah_unit > 1).length;
  const totalUnitsPurchased = initialCustomers.reduce(
    (acc, curr) => acc + curr.jumlah_unit,
    0
  );

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle">
          <span className="text-[11px] font-semibold text-slate uppercase tracking-wider">
            Total Customer Terdaftar
          </span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-carbon-ink font-mono">
              {totalCustomers}
            </span>
            <div className="w-8 h-8 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle">
          <span className="text-[11px] font-semibold text-slate uppercase tracking-wider">
            Repeat Buyer (Beli &gt; 1 Unit)
          </span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-purple-700 font-mono">
              {repeatBuyersCount}
            </span>
            <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle">
          <span className="text-[11px] font-semibold text-slate uppercase tracking-wider">
            Total Unit Dimiliki
          </span>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-carbon-ink font-mono">
              {totalUnitsPurchased}
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan Nama KTP, NIK, atau No HP..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
          />
        </div>

        <div className="text-xs text-slate font-medium">
          Menampilkan <strong className="text-carbon-ink">{filteredCustomers.length}</strong> dari{" "}
          {totalCustomers} customer
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="bg-white rounded-lg border border-mist shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bone/60 border-b border-mist text-slate font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">NIK Customer</th>
                <th className="px-5 py-3.5">Nama Sesuai KTP</th>
                <th className="px-5 py-3.5">No. Handphone</th>
                <th className="px-5 py-3.5">Alamat KTP</th>
                <th className="px-5 py-3.5 text-center">Jumlah Unit</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-mist">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate">
                    Tidak ditemukan data customer yang cocok dengan pencarian &quot;{search}&quot;.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const isRepeatBuyer = cust.jumlah_unit > 1;

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-bone/40 transition-colors"
                    >
                      {/* NIK */}
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-medium text-carbon-ink">
                          {cust.nik}
                        </span>
                      </td>

                      {/* Nama KTP */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-carbon-ink text-sm">
                            {cust.nama_ktp}
                          </span>
                          <span className="text-[11px] text-slate">
                            TTL: {cust.tempat_lahir}, {cust.tgl_lahir}
                          </span>
                        </div>
                      </td>

                      {/* No HP */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-graphite">
                          <Phone className="w-3.5 h-3.5 text-slate" />
                          <span>{cust.no_hp}</span>
                        </div>
                      </td>

                      {/* Alamat */}
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="flex items-start gap-1 text-slate">
                          <MapPin className="w-3.5 h-3.5 text-slate shrink-0 mt-0.5" />
                          <span className="line-clamp-2" title={cust.alamat_ktp}>
                            {cust.alamat_ktp}
                          </span>
                        </div>
                      </td>

                      {/* Jumlah Unit */}
                      <td className="px-5 py-3.5 text-center">
                        {isRepeatBuyer ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span>{cust.jumlah_unit} Unit (Repeat Buyer)</span>
                          </span>
                        ) : cust.jumlah_unit === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
                            <Home className="w-3 h-3 text-teal-600" />
                            <span>1 Unit</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate">0 Unit</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`${basePath}/customer/${cust.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-mist text-xs font-semibold text-graphite hover:text-prism-teal hover:border-prism-teal transition-all shadow-2xs"
                        >
                          <span>Lihat Detail</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
