import React from "react";
import { FileCheck2, PlusCircle } from "lucide-react";

export default function MarketingItjPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-lg border border-mist shadow-subtle">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight">
            Pengajuan ITJ (Ikatan Tanda Jadi)
          </h1>
          <p className="text-sm text-slate mt-0.5">
            Ajukan pemesanan unit dan unggah bukti transfer tanda jadi konsumen.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-prism-teal text-white text-xs md:text-sm font-semibold hover:bg-deep-teal transition-colors shadow-subtle"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Formulir ITJ Baru</span>
        </button>
      </div>

      <div className="bg-white p-8 rounded-lg border border-mist shadow-subtle text-center">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
          <FileCheck2 className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-carbon-ink">
          Riwayat Pengajuan ITJ
        </h2>
        <p className="text-xs md:text-sm text-slate max-w-md mx-auto mt-1">
          Semua pengajuan ITJ Anda akan diproses dan divalidasi oleh Tim Admin.
        </p>
      </div>
    </div>
  );
}
