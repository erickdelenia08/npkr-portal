import React from "react";
import { BarChart3 } from "lucide-react";

export default function MarketingLaporanPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle">
        <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight">
          Laporan Penjualan Marketing
        </h1>
        <p className="text-sm text-slate mt-0.5">
          Rekapitulasi aktivitas harian, pencapaian target, dan komisi closing.
        </p>
      </div>

      <div className="bg-white p-8 rounded-lg border border-mist shadow-subtle text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-carbon-ink">
          Laporan & Analitik Kinerja
        </h2>
        <p className="text-xs md:text-sm text-slate max-w-md mx-auto mt-1">
          Grafik performa sales dan status pencairan komisi penjualan unit Anda.
        </p>
      </div>
    </div>
  );
}
