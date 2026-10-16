// app/manager/laporan/page.tsx
import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FileSpreadsheet, ShieldCheck, Download } from "lucide-react";
import { ManagerReports } from "@/components/shared/manager-reports";

export const metadata: Metadata = {
  title: "Pusat Laporan & Ekspor Data | Manager Portal",
  description:
    "Ekspor laporan kinerja tim marketing, rekap transaksi penjualan closing, dan efektivitas sumber prospek ke format CSV/Excel.",
};

export default async function ManagerLaporanPage() {
  const session = await auth();

  // Strict RBAC Enforcement
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    redirect("/marketing/dashboard");
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ─── Page Header ─── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-mist shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 text-prism-teal flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-carbon-ink tracking-tight">
                  Pusat Laporan &amp; Ekspor Data
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-prism-teal border border-teal-200">
                  CSV / Excel Ready
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate mt-0.5 max-w-2xl">
                Unduh rekapitulasi data penjualan properti dalam format CSV ber-encoding UTF-8 untuk dibuka langsung di Microsoft Excel, Google Sheets, atau aplikasi analitik spreadsheet lainnya.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3 Main Report Cards & Export Section ─── */}
      <ManagerReports />
    </div>
  );
}
