import React from "react";
import { Building2 } from "lucide-react";

export default function MarketingUnitPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle">
        <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight">
          Katalog Unit & Ketersediaan Blok
        </h1>
        <p className="text-sm text-slate mt-0.5">
          Cek ketersediaan kavling, tipe komersil, dan unit subsidi secara real-time.
        </p>
      </div>

      <div className="bg-white p-8 rounded-lg border border-mist shadow-subtle text-center">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
          <Building2 className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-carbon-ink">
          Siteplan & Status Blok Unit
        </h2>
        <p className="text-xs md:text-sm text-slate max-w-md mx-auto mt-1">
          Modul grid unit interaktif dengan status AVAILABLE, HOLD, dan SOLD.
        </p>
      </div>
    </div>
  );
}
