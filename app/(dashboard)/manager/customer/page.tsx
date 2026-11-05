import React from "react";
import type { Metadata } from "next";
import { getCustomers } from "@/actions/customer.action";
import { CustomerTable } from "@/components/tables/customer-table";
import { Contact, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Buku Induk Customer | Manager Portal NPKR",
  description: "Pantauan database seluruh customer dan aset unit perumahan New Puri Kencana",
};

export default async function ManagerCustomerPage() {
  const res = await getCustomers();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-deep-teal text-xs font-semibold uppercase tracking-wider mb-1">
            <Contact className="w-4 h-4" />
            <span>Master Data Customer</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight font-heading">
            Buku Induk Customer
          </h1>
          <p className="text-xs md:text-sm text-slate mt-0.5">
            Direktori profil customer terpadu, riwayat transaksi unit, dan analisis repeat buyer
          </p>
        </div>
      </div>

      {/* Error State or Table */}
      {!res.success || !res.data ? (
        <div className="bg-white p-8 rounded-lg border border-rose-200 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-carbon-ink font-heading">
            Gagal Memuat Data Customer
          </h2>
          <p className="text-xs text-slate">{res.message}</p>
        </div>
      ) : (
        <CustomerTable initialCustomers={res.data} basePath="/manager" />
      )}
    </div>
  );
}
