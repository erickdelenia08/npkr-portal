import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { getMarketingDashboardData } from "@/actions/dashboard.action";
import { MarketingDashboardClient } from "@/components/marketing/MarketingDashboardClient";

export const metadata: Metadata = {
  title: "Dashboard Marketing (To-Do List) | NPKR Portal",
  description:
    "Asisten harian marketing: pantau metrik bulanan dan to-do list prioritas follow-up konsumen.",
};

export default async function MarketingDashboardPage() {
  const res = await getMarketingDashboardData();

  if (!res.success || !res.data) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-xl border border-rose-200 shadow-subtle text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-carbon-ink">
            Gagal Memuat Dashboard
          </h2>
          <p className="text-xs text-slate mt-1">
            {res.message || "Terjadi kesalahan saat memuat data agenda Anda."}
          </p>
        </div>
        <Link
          href="/marketing/lead"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-prism-teal text-white text-xs font-semibold hover:bg-deep-teal transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Lead</span>
        </Link>
      </div>
    );
  }

  return <MarketingDashboardClient data={res.data} />;
}
