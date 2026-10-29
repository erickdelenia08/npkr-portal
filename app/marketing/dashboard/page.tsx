import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { getMarketingDashboardData } from "@/actions/dashboard.action";
import { MarketingDashboardClient } from "@/components/marketing/MarketingDashboardClient";

export const metadata: Metadata = {
  title: "Dashboard Marketing | NPKR Portal",
  description:
    "Asisten agenda harian sales: target bulanan dan prioritas follow-up konsumen.",
};

export default async function MarketingDashboardPage() {
  await connection();
  const res = await getMarketingDashboardData();

  if (!res.success || !res.data) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-lg border border-red-200 text-center space-y-3 font-sans">
        <AlertCircle className="w-6 h-6 text-red-600 mx-auto" />
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Gagal Memuat Agenda Harian
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {res.message || "Terjadi kendala saat mengambil data tugas prioritas Anda."}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/marketing/lead"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Daftar Lead</span>
          </Link>
        </div>
      </div>
    );
  }

  return <MarketingDashboardClient data={res.data} />;
}