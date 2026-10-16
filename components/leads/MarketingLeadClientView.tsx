"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  AlertCircle,
  Calendar,
  CheckCircle2,
  X,
  SearchX,
  RotateCcw,
} from "lucide-react";
import { LeadCardData } from "@/actions/lead";
import { MarketingLeadTable } from "@/components/tables/marketing-lead-table";
import { MarketingLeadCard } from "./MarketingLeadCard";
import { MarketingLeadFilters } from "./MarketingLeadFilters";
import { CreateLeadForm } from "./CreateLeadForm";

interface MarketingLeadClientViewProps {
  leads: LeadCardData[];
  total: number;
  userId?: number;
}

export function MarketingLeadClientView({
  leads,
  total,
  userId,
}: MarketingLeadClientViewProps) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Compute stat counts for top quick badges
  const overdueCount = leads.filter(
    (l) => l.followUpInfo?.status === "TERLAMBAT"
  ).length;
  const todayCount = leads.filter(
    (l) => l.followUpInfo?.status === "HARI_INI"
  ).length;

  const handleLeadCreated = () => {
    setIsCreateModalOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 md:p-5 rounded-lg border border-mist shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold text-carbon-ink tracking-tight">
              Daftar Lead &amp; Prospek
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-bone border border-mist text-xs font-semibold text-graphite">
              {total} Total
            </span>
          </div>
          <p className="text-xs text-slate mt-0.5">
            Kelola prospek konsumen, jadwalkan survei, dan pantau tenggat tindak lanjut
          </p>

          {/* Quick Urgency Indicator Badges */}
          <div className="flex items-center flex-wrap gap-2 mt-2 pt-2 border-t border-mist/50">
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                {overdueCount} Perlu Ditindaklanjuti (Terlambat)
              </span>
            )}
            {todayCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-semibold">
                <Calendar className="w-3 h-3 text-prism-teal" />
                {todayCount} Jadwal Hari Ini
              </span>
            )}
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-prism-teal hover:bg-deep-teal text-white text-xs md:text-sm font-semibold shadow-subtle transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Lead Baru</span>
        </button>
      </div>

      {/* URL Query State Filters (Desktop & Mobile Bottom Sheet) */}
      <MarketingLeadFilters />

      {/* Lead Display Views: Desktop Table & Mobile Cards */}
      {leads.length === 0 ? (
        <div className="bg-white rounded-lg border border-mist p-10 md:p-14 text-center shadow-subtle space-y-3">
          <div className="w-12 h-12 rounded-full bg-bone text-slate flex items-center justify-center mx-auto">
            <SearchX className="w-6 h-6 text-steel" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-carbon-ink">
              Tidak Ada Data Lead yang Cocok
            </h3>
            <p className="text-xs text-slate mt-1 max-w-sm mx-auto">
              Tidak ditemukan data prospek yang sesuai dengan kriteria filter saat ini.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/marketing/lead")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-mist bg-white hover:bg-bone text-xs font-semibold text-graphite transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-steel" />
            <span>Reset Filter Pencarian</span>
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Data Table */}
          <div className="hidden md:block">
            <MarketingLeadTable leads={leads} />
          </div>

          {/* Mobile Vertical List of Cards */}
          <div className="md:hidden space-y-3">
            {leads.map((lead) => (
              <MarketingLeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        </>
      )}

      {/* Modal: Tambah Lead Baru */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-carbon-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-mist p-1 animate-in zoom-in-95 duration-200">
            <div className="absolute right-4 top-4 z-10">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-bone hover:bg-mist text-slate hover:text-carbon-ink flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <CreateLeadForm
              onSuccess={handleLeadCreated}
              onCancel={() => setIsCreateModalOpen(false)}
              showTitle={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
