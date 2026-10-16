"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  X,
  RotateCcw,
  Check,
  Compass,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

export const SUMBER_OPTIONS = [
  "Walk-in",
  "Facebook Ads",
  "WA Kantor",
  "Instagram Organik",
  "Brosur / Pameran",
  "Teman / Kerabat",
  "Lainnya",
];

export const TAHAP_OPTIONS = [
  "Lead Masuk",
  "Survei Dijadwalkan",
  "Sudah Survei",
  "Closing",
  "Lost",
];

export const FOLLOW_UP_OPTIONS = [
  { value: "terlambat", label: "Terlambat" },
  { value: "hari_ini", label: "Hari Ini" },
  { value: "mendatang", label: "Mendatang" },
  { value: "belum_dijadwal", label: "Belum Dijadwalkan" },
];

export function MarketingLeadFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Mobile Bottom Sheet open state (UI only, filter values are in URL)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Read current active values from URL searchParams
  const currentTahap = searchParams.get("tahap") || "ALL";
  const currentSumber = searchParams.get("sumber") || "ALL";
  const currentFollowUp = searchParams.get("follow_up") || "ALL";
  const currentQuery = searchParams.get("q") || "";

  // Temporary state for Mobile Drawer prior to clicking "Terapkan"
  const [draftTahap, setDraftTahap] = useState<string>(currentTahap);
  const [draftSumber, setDraftSumber] = useState<string>(currentSumber);
  const [draftFollowUp, setDraftFollowUp] = useState<string>(currentFollowUp);

  // Calculate active filter count (excluding default 'ALL' or empty)
  let activeFilterCount = 0;
  if (currentTahap && currentTahap !== "ALL") activeFilterCount++;
  if (currentSumber && currentSumber !== "ALL") activeFilterCount++;
  if (currentFollowUp && currentFollowUp !== "ALL") activeFilterCount++;
  if (currentQuery.trim()) activeFilterCount++;

  // Helper to update URL searchParams
  const setQueryParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "ALL" || value.trim() === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page"); // reset pagination on filter change
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleResetFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
    setDraftTahap("ALL");
    setDraftSumber("ALL");
    setDraftFollowUp("ALL");
    setIsMobileDrawerOpen(false);
  };

  const handleApplyMobileFilters = () => {
    const params = new URLSearchParams(searchParams.toString());

    if (!draftTahap || draftTahap === "ALL") params.delete("tahap");
    else params.set("tahap", draftTahap);

    if (!draftSumber || draftSumber === "ALL") params.delete("sumber");
    else params.set("sumber", draftSumber);

    if (!draftFollowUp || draftFollowUp === "ALL") params.delete("follow_up");
    else params.set("follow_up", draftFollowUp);

    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
    setIsMobileDrawerOpen(false);
  };

  const handleOpenMobileDrawer = () => {
    setDraftTahap(currentTahap);
    setDraftSumber(currentSumber);
    setDraftFollowUp(currentFollowUp);
    setIsMobileDrawerOpen(true);
  };

  return (
    <div className="space-y-3">
      {/* Search & Mobile Action Row */}
      <div className="flex items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate">
            <Search className="w-4 h-4 text-steel" />
          </div>
          <input
            type="text"
            placeholder="Cari nama konsumen atau nomor HP..."
            defaultValue={currentQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setQueryParam("q", (e.target as HTMLInputElement).value);
              }
            }}
            onBlur={(e) => {
              if (e.target.value !== currentQuery) {
                setQueryParam("q", e.target.value);
              }
            }}
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm rounded-md border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all shadow-subtle"
          />
          {currentQuery && (
            <button
              type="button"
              onClick={() => setQueryParam("q", null)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate hover:text-carbon-ink"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mobile Filter Trigger Button (with Active Badge Count) */}
        <button
          type="button"
          onClick={handleOpenMobileDrawer}
          className={`md:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-semibold shadow-subtle transition-colors shrink-0 ${
            activeFilterCount > 0
              ? "bg-teal-50 border-teal-200 text-teal-800"
              : "bg-white border-mist text-graphite hover:bg-bone"
          }`}
        >
          <Filter className="w-4 h-4 text-prism-teal" />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-prism-teal text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Reset Filter Button (Desktop) */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-mist text-slate hover:text-carbon-ink bg-white hover:bg-bone text-xs font-medium transition-colors shrink-0 shadow-subtle"
            title="Hapus semua filter"
          >
            <RotateCcw className="w-3.5 h-3.5 text-steel" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Desktop Filter Bar (URL Query String State) */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Tahap Quick Filter Chips */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-slate uppercase tracking-wider mr-1">
            Tahap:
          </span>
          <button
            type="button"
            onClick={() => setQueryParam("tahap", "ALL")}
            className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
              currentTahap === "ALL"
                ? "bg-carbon-ink text-white border-carbon-ink font-semibold"
                : "bg-white border-mist text-slate hover:text-graphite hover:bg-bone"
            }`}
          >
            Semua
          </button>
          {TAHAP_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setQueryParam("tahap", opt)}
              className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                currentTahap === opt
                  ? "bg-carbon-ink text-white border-carbon-ink font-semibold shadow-xs"
                  : "bg-white border-mist text-slate hover:text-graphite hover:bg-bone"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Secondary Dropdown Filters: Sumber & Follow-Up */}
        <div className="flex items-center gap-2">
          {/* Sumber Dropdown */}
          <div className="relative">
            <select
              value={currentSumber}
              onChange={(e) => setQueryParam("sumber", e.target.value)}
              className={`text-xs py-1.5 pl-2.5 pr-8 rounded-md border font-medium focus:outline-none focus:ring-1 focus:ring-prism-teal cursor-pointer shadow-subtle ${
                currentSumber !== "ALL"
                  ? "bg-teal-50 border-teal-200 text-teal-800 font-semibold"
                  : "bg-white border-mist text-graphite"
              }`}
            >
              <option value="ALL">Semua Sumber</option>
              {SUMBER_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Follow-up Dropdown */}
          <div className="relative">
            <select
              value={currentFollowUp}
              onChange={(e) => setQueryParam("follow_up", e.target.value)}
              className={`text-xs py-1.5 pl-2.5 pr-8 rounded-md border font-medium focus:outline-none focus:ring-1 focus:ring-prism-teal cursor-pointer shadow-subtle ${
                currentFollowUp !== "ALL"
                  ? "bg-amber-50 border-amber-200 text-amber-800 font-semibold"
                  : "bg-white border-mist text-graphite"
              }`}
            >
              <option value="ALL">Semua Follow-Up</option>
              {FOLLOW_UP_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Up Bottom Sheet / Drawer */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-carbon-ink/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Slide-up Container */}
          <div className="relative bg-white rounded-t-2xl border-t border-mist shadow-2xl p-5 space-y-5 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-250 z-10">
            {/* Drawer Handle */}
            <div className="w-10 h-1 bg-mist rounded-full mx-auto" />

            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-mist">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-carbon-ink">
                    Filter Prospek Lead
                  </h3>
                  <p className="text-[11px] text-slate">
                    Sesuaikan kriteria filter data lead
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-md text-slate hover:text-carbon-ink hover:bg-bone"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Section 1: Tahap */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-carbon-ink flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-prism-teal" />
                Tahapan Prospek
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDraftTahap("ALL")}
                  className={`py-2 px-3 rounded-md text-xs font-medium border text-left flex items-center justify-between ${
                    draftTahap === "ALL"
                      ? "bg-teal-50 border-teal-300 text-teal-800 font-semibold"
                      : "bg-white border-mist text-slate"
                  }`}
                >
                  <span>Semua Tahap</span>
                  {draftTahap === "ALL" && (
                    <Check className="w-3.5 h-3.5 text-prism-teal" />
                  )}
                </button>
                {TAHAP_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDraftTahap(t)}
                    className={`py-2 px-3 rounded-md text-xs font-medium border text-left flex items-center justify-between ${
                      draftTahap === t
                        ? "bg-teal-50 border-teal-300 text-teal-800 font-semibold"
                        : "bg-white border-mist text-slate"
                    }`}
                  >
                    <span>{t}</span>
                    {draftTahap === t && (
                      <Check className="w-3.5 h-3.5 text-prism-teal" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Section 2: Sumber */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-carbon-ink flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-prism-teal" />
                Sumber Prospek
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDraftSumber("ALL")}
                  className={`py-2 px-3 rounded-md text-xs font-medium border text-left flex items-center justify-between ${
                    draftSumber === "ALL"
                      ? "bg-teal-50 border-teal-300 text-teal-800 font-semibold"
                      : "bg-white border-mist text-slate"
                  }`}
                >
                  <span>Semua Sumber</span>
                  {draftSumber === "ALL" && (
                    <Check className="w-3.5 h-3.5 text-prism-teal" />
                  )}
                </button>
                {SUMBER_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraftSumber(s)}
                    className={`py-2 px-3 rounded-md text-xs font-medium border text-left flex items-center justify-between ${
                      draftSumber === s
                        ? "bg-teal-50 border-teal-300 text-teal-800 font-semibold"
                        : "bg-white border-mist text-slate"
                    }`}
                  >
                    <span className="truncate">{s}</span>
                    {draftSumber === s && (
                      <Check className="w-3.5 h-3.5 text-prism-teal shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Section 3: Status Follow-Up */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-carbon-ink flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-prism-teal" />
                Status Follow-Up
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDraftFollowUp("ALL")}
                  className={`py-2 px-3 rounded-md text-xs font-medium border text-left flex items-center justify-between ${
                    draftFollowUp === "ALL"
                      ? "bg-amber-50 border-amber-300 text-amber-800 font-semibold"
                      : "bg-white border-mist text-slate"
                  }`}
                >
                  <span>Semua Jadwal</span>
                  {draftFollowUp === "ALL" && (
                    <Check className="w-3.5 h-3.5 text-amber-600" />
                  )}
                </button>
                {FOLLOW_UP_OPTIONS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setDraftFollowUp(f.value)}
                    className={`py-2 px-3 rounded-md text-xs font-medium border text-left flex items-center justify-between ${
                      draftFollowUp === f.value
                        ? "bg-amber-50 border-amber-300 text-amber-800 font-semibold"
                        : "bg-white border-mist text-slate"
                    }`}
                  >
                    <span>{f.label}</span>
                    {draftFollowUp === f.value && (
                      <Check className="w-3.5 h-3.5 text-amber-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawer Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-mist">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex-1 py-2.5 px-3 rounded-md border border-mist bg-white hover:bg-bone text-xs font-semibold text-slate transition-colors text-center"
              >
                Reset Filter
              </button>
              <button
                type="button"
                onClick={handleApplyMobileFilters}
                className="flex-2 py-2.5 px-3 rounded-md bg-prism-teal hover:bg-deep-teal active:bg-deep-teal text-white text-xs font-bold shadow-subtle transition-colors text-center"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
