// app/manager/error.tsx
"use client";

import React, { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface ManagerErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ManagerError({ error, reset }: ManagerErrorProps) {
  useEffect(() => {
    // Log unexpected errors for operational tracking
    console.error("Manager Portal Error:", error);
  }, [error]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto my-12">
      <div className="bg-white border border-rose-200 p-6 sm:p-8 rounded-2xl shadow-subtle text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-carbon-ink tracking-tight">
            Gagal Memuat Data Manajerial
          </h2>
          <p className="text-xs sm:text-sm text-slate max-w-md mx-auto">
            Terjadi kendala saat mengambil ringkasan dashboard atau data laporan. Silakan coba kembali beberapa saat lagi.
          </p>
        </div>

        {error.message && (
          <div className="p-3 bg-bone rounded-xl text-left text-xs font-mono text-slate border border-mist overflow-x-auto">
            {error.message}
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-deep-teal text-white hover:bg-teal-700 transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-teal cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Coba Muat Ulang</span>
          </button>
        </div>
      </div>
    </div>
  );
}
