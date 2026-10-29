import React from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getCustomers } from "@/actions/customer.action";
import { CustomerTable } from "@/components/tables/customer-table";
import { AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Buku Induk Customer | Admin Portal NPKR",
  description:
    "Direktori lengkap data customer, verifikasi identitas NIK, dan riwayat aset unit properti.",
};

export default async function AdminCustomerPage() {
  await connection();
  const res = await getCustomers();

  return (
    <div className="space-y-6 font-sans text-zinc-900">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Buku Induk Customer
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
              Master Data
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Database profil tunggal berbasis NIK, riwayat kepemilikan unit, dan pantauan repeat buyer.
          </p>
        </div>
      </div>

      {/* Error State or Table */}
      {!res.success || !res.data ? (
        <div className="p-8 rounded-lg border border-red-200 bg-red-50/30 text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-red-600 mx-auto" />
          <h2 className="text-sm font-semibold text-zinc-900">
            Gagal Memuat Data Customer
          </h2>
          <p className="text-xs text-zinc-500">{res.message || "Terjadi kendala saat mengambil data dari database."}</p>
        </div>
      ) : (
        <CustomerTable initialCustomers={res.data} basePath="/admin" />
      )}
    </div>
  );
}