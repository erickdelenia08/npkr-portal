"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageCircle,
  Calendar,
  Compass,
  Home,
  X,
  RefreshCw,
  ChevronRight,
  Clock,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { LeadCardData, getLeads, updateLeadTahap } from "@/actions/lead";
import { LeadTahap } from "@/lib/lead-utils";
import { CreateLeadForm } from "./CreateLeadForm";

interface MarketingLeadListProps {
  initialLeads: LeadCardData[];
  initialTotal: number;
  userId?: number;
}

interface FilterChip {
  label: string;
  value: string;
  tahapKey?: LeadTahap | string;
}

const FILTER_CHIPS: FilterChip[] = [
  { label: "Semua", value: "ALL" },
  { label: "Lead Masuk", value: "Lead Masuk", tahapKey: "Lead Masuk" },
  { label: "Survei Dijadwalkan", value: "Survei Dijadwalkan", tahapKey: "Survei Dijadwalkan" },
  { label: "Sudah Survei", value: "Sudah Survei", tahapKey: "Sudah Survei" },
  { label: "Closing", value: "Closing", tahapKey: "Closing" },
  { label: "Lost", value: "Lost", tahapKey: "Lost" },
];

export function MarketingLeadList({
  initialLeads,
  initialTotal,
  userId,
}: MarketingLeadListProps) {
  const [leads, setLeads] = useState<LeadCardData[]>(initialLeads);
  const [total, setTotal] = useState<number>(initialTotal);
  const [activeChip, setActiveChip] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Helper to format WhatsApp phone number (e.g. 08123... -> 628123...)
  const formatWaLink = (noHp: string, nama: string): string => {
    let clean = noHp.replace(/[\s-+]/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }
    const message = encodeURIComponent(
      `Halo Bpk/Ibu ${nama}, saya dari tim marketing NPKR Property. Terkait informasi perumahan yang Anda minati...`
    );
    return `https://wa.me/${clean}?text=${message}`;
  };

  // Refresh lead list from Server Action
  const refreshLeads = (query = search, chip = activeChip) => {
    startTransition(async () => {
      const res = await getLeads({
        search: query,
        tahap: chip === "ALL" ? undefined : (chip as LeadTahap),
        marketing_id: userId,
      });

      if (res.success && res.data) {
        setLeads(res.data.leads);
        setTotal(res.data.total);
      }
    });
  };

  const handleChipClick = (value: string) => {
    setActiveChip(value);
    refreshLeads(search, value);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    refreshLeads(value, activeChip);
  };

  // Quick change tahap for marketing
  const handleQuickChangeTahap = (leadId: number, newTahap: LeadTahap | string) => {
    startTransition(async () => {
      const res = await updateLeadTahap(leadId, newTahap);
      if (res.success) {
        toast.success(res.message);
        refreshLeads();
      } else {
        toast.error(res.message);
      }
    });
  };

  // Compute counts per chip from current dataset
  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: total };
    for (const lead of leads) {
      counts[lead.tahap] = (counts[lead.tahap] || 0) + 1;
    }
    return counts;
  }, [leads, total]);

  const getTahapBadge = (tahap: LeadTahap | string) => {
    switch (tahap) {
      case "Lead Masuk":
      case "BARU":
      case "FOLLOW_UP":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "Survei Dijadwalkan":
      case "SURVEI_DIJADWALKAN":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Sudah Survei":
      case "SUDAH_SURVEI":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Closing":
      case "ITJ":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Lost":
      case "LOST":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-bone text-graphite border-mist";
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      {/* Top Header Card */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-mist shadow-subtle flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-carbon-ink tracking-tight">
            Prospek Lead Saya
          </h1>
          <p className="text-xs text-slate mt-0.5">
            Daftar calon pembeli yang siap di-follow up dan diajak survei
          </p>
        </div>

        <button
          type="button"
          onClick={() => refreshLeads()}
          disabled={isPending}
          className="p-2 rounded-lg border border-mist bg-white text-slate hover:text-graphite hover:bg-bone transition-colors disabled:opacity-50 shrink-0"
          title="Muat ulang data"
        >
          <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Search Input Box */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Cari nama konsumen atau nomor WhatsApp..."
          className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal shadow-xs transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => handleSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-graphite p-1 text-xs"
          >
            ×
          </button>
        )}
      </div>

      {/* Horizontal Scrollable Filter Chips */}
      <div className="overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
        <div className="flex items-center gap-2 w-max">
          {FILTER_CHIPS.map((chip) => {
            const isActive = activeChip === chip.value;
            const count = chip.value === "ALL" ? total : chipCounts[chip.value] || 0;

            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => handleChipClick(chip.value)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-prism-teal text-white shadow-xs"
                    : "bg-white text-slate border border-mist hover:bg-bone hover:text-graphite"
                }`}
              >
                <span>{chip.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-bone text-graphite"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lead Cards List */}
      <div className="space-y-3 pt-1">
        {leads.length === 0 ? (
          <div className="bg-white rounded-xl border border-mist p-8 text-center shadow-subtle">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-prism-teal flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-carbon-ink">
              Tidak ada prospek lead
            </h3>
            <p className="text-xs text-slate mt-1 max-w-xs mx-auto leading-relaxed">
              {activeChip !== "ALL"
                ? `Tidak ada lead pada tahapan "${FILTER_CHIPS.find((c) => c.value === activeChip)?.label}".`
                : "Belum ada prospek terdaftar. Tekan tombol Tambah Lead untuk input prospek baru."}
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-prism-teal text-white text-xs font-semibold hover:bg-deep-teal transition-colors shadow-subtle"
            >
              <Plus className="w-4 h-4" />
              <span>Input Lead Pertama</span>
            </button>
          </div>
        ) : (
          leads.map((lead) => {
            const waHref = formatWaLink(lead.no_hp, lead.nama);
            const callHref = `tel:${lead.no_hp}`;

            return (
              <div
                key={lead.id}
                className="bg-white rounded-xl border border-mist p-4 sm:p-5 shadow-subtle hover:border-prism-teal/30 transition-all flex flex-col justify-between gap-3"
              >
                {/* Card Header: Nama & Tahap Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/marketing/lead/${lead.id}`}
                      className="text-sm sm:text-base font-bold text-carbon-ink tracking-tight leading-snug hover:text-prism-teal transition-colors inline-flex items-center gap-1 group"
                    >
                      <span>{lead.nama}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-steel opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Compass className="w-3.5 h-3.5 text-steel" />
                        {lead.sumber}
                      </span>

                      {lead.minat_tipe && (
                        <>
                          <span className="text-fog">•</span>
                          <span className="inline-flex items-center gap-1 text-deep-teal font-medium">
                            <Home className="w-3.5 h-3.5 text-prism-teal" />
                            {lead.minat_tipe}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tahap Badge */}
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${getTahapBadge(
                      lead.tahap
                    )}`}
                  >
                    {lead.tahap}
                  </span>
                </div>

                {/* Date & Follow-Up Info */}
                <div className="flex items-center flex-wrap gap-y-1 gap-x-4 pt-2 border-t border-mist/50 text-[11px] text-slate">
                  {lead.tgl_follow_up ? (
                    <div className="inline-flex items-center gap-1 text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        Follow-up:{" "}
                        {new Date(lead.tgl_follow_up).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 text-slate font-medium">
                      <Clock className="w-3 h-3 text-steel" />
                      <span>
                        Dibuat:{" "}
                        {new Date(lead.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  )}

                  {/* Stage changer dropdown */}
                  <div className="ml-auto flex items-center gap-1 text-[11px]">
                    <span className="text-fog">Tahap:</span>
                    <select
                      value={lead.tahap}
                      onChange={(e) =>
                        handleQuickChangeTahap(lead.id, e.target.value as LeadTahap)
                      }
                      className="text-[11px] py-0.5 px-1 rounded border border-mist bg-white text-graphite font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="Lead Masuk">Lead Masuk</option>
                      <option value="Survei Dijadwalkan">Survei Dijadwalkan</option>
                      <option value="Sudah Survei">Sudah Survei</option>
                      <option value="Closing" disabled>Closing (ITJ)</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                </div>

                {/* Quick Action Buttons for WhatsApp, Phone Call, and Detail */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {/* WhatsApp Action Button */}
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">WhatsApp</span>
                  </a>

                  {/* Phone Call Action Button */}
                  <a
                    href={callHref}
                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-lg bg-slate-50 text-graphite hover:bg-bone border border-mist text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-steel shrink-0" />
                    <span className="truncate">Telepon</span>
                  </a>

                  {/* Detail & Aktivitas Link */}
                  <Link
                    href={`/marketing/lead/${lead.id}`}
                    className="flex items-center justify-center gap-1 py-2 px-2 rounded-lg bg-teal-50 text-deep-teal hover:bg-teal-100 border border-teal-200 text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-prism-teal shrink-0" />
                    <span className="truncate">Aktivitas</span>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Button (FAB) for Mobile / Desktop */}
      <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 z-30">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-prism-teal hover:bg-deep-teal text-white font-semibold text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-prism-teal/30"
          aria-label="Tambah Lead Baru"
        >
          <Plus className="w-5 h-5 text-white" />
          <span>Tambah Lead</span>
        </button>
      </div>

      {/* Modal / Bottom Sheet for CreateLeadForm */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-mist shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 z-10 p-1.5 rounded-full text-slate hover:text-graphite hover:bg-bone transition-colors"
              aria-label="Tutup formulir"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Mobile Bottom Sheet Pull Indicator */}
            <div className="sm:hidden w-12 h-1 bg-slate-200 rounded-full mx-auto my-2 shrink-0" />

            <div className="overflow-y-auto flex-1">
              <CreateLeadForm
                onCancel={() => setIsModalOpen(false)}
                onSuccess={() => {
                  setIsModalOpen(false);
                  refreshLeads();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
