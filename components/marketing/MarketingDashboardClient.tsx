"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  UserPlus,
  Building2,
  Search,
  ChevronRight,
  Phone,
  CheckCircle2,
  ClockAlert,
  CalendarClock,
  MapPin,
} from "lucide-react";
import {
  MarketingDashboardData,
  MarketingTaskItem,
  TaskCategory,
} from "@/actions/dashboard.action";

interface MarketingDashboardClientProps {
  data: MarketingDashboardData;
}

export function MarketingDashboardClient({ data }: MarketingDashboardClientProps) {
  const { marketingUser, metrics, tasks } = data;

  const [activeCategory, setActiveCategory] = useState<"ALL" | TaskCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredTasks = useMemo(() => {
    const list: MarketingTaskItem[] = [];

    if (activeCategory === "ALL" || activeCategory === "OVERDUE") {
      list.push(...tasks.overdueFollowUps);
    }
    if (activeCategory === "ALL" || activeCategory === "TODAY") {
      list.push(...tasks.todayFollowUps);
    }
    if (activeCategory === "ALL" || activeCategory === "SURVEY") {
      list.push(...tasks.upcomingSurveys);
    }

    if (!searchQuery.trim()) {
      return list;
    }

    const q = searchQuery.toLowerCase().trim();
    return list.filter((t) => {
      const matchName = t.nama.toLowerCase().includes(q);
      const matchPhone = t.no_hp.toLowerCase().includes(q);
      const matchBlok = t.unitBlok?.toLowerCase().includes(q) ?? false;
      const matchTipe = t.minat_tipe?.toLowerCase().includes(q) ?? false;
      return matchName || matchPhone || matchBlok || matchTipe;
    });
  }, [tasks, activeCategory, searchQuery]);

  const renderBadge = (task: MarketingTaskItem) => {
    if (task.category === "OVERDUE") {
      return (
        <span className="inline-flex px-1.5 py-0.2 rounded text-[10px] font-medium border border-rose-200 bg-rose-50 text-rose-700">
          {task.badgeText}
        </span>
      );
    }
    if (task.category === "TODAY") {
      return (
        <span className="inline-flex px-1.5 py-0.2 rounded text-[10px] font-medium border border-amber-200 bg-amber-50 text-amber-800">
          Hari Ini
        </span>
      );
    }
    return (
      <span className="inline-flex px-1.5 py-0.2 rounded text-[10px] font-medium border border-zinc-200 bg-zinc-100 text-zinc-700">
        {task.badgeText}
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-5xl mx-auto font-sans text-zinc-900 pb-12">
      {/* 1. Header & Greeting Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 pb-3 sm:pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-900">
              Halo, {marketingUser.nama}
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
              {metrics.monthLabel}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">
            Ringkasan capaian bulanan dan daftar prioritas tindak lanjut konsumen.
          </p>
        </div>

        {/* Shortcuts */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/marketing/unit"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white text-zinc-700 text-xs font-medium hover:bg-zinc-50 active:bg-zinc-100 transition-colors h-8"
          >
            <Building2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Katalog Unit</span>
          </Link>
          <Link
            href="/marketing/lead"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors h-8"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah Lead</span>
          </Link>
        </div>
      </div>

      {/* 2. Ringkasan Metrik Bulanan (Clean Grid) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 block truncate">
            Lead Masuk
          </span>
          <span className="text-lg sm:text-2xl font-semibold text-zinc-900 font-mono mt-1 block tabular-nums">
            {metrics.newLeadsThisMonth}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5 truncate">
            Bulan berjalan
          </span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 block truncate">
            Kunjungan Survei
          </span>
          <span className="text-lg sm:text-2xl font-semibold text-zinc-900 font-mono mt-1 block tabular-nums">
            {metrics.surveysThisMonth}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5 truncate">
            Terjadwal &amp; tuntas
          </span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[10px] sm:text-[11px] font-medium text-zinc-500 block truncate">
            Closing Deal
          </span>
          <span className="text-lg sm:text-2xl font-semibold text-emerald-700 font-mono mt-1 block tabular-nums">
            {metrics.closingsThisMonth}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5 truncate">
            ITJ tervalidasi
          </span>
        </div>
      </div>

      {/* 3. Section To-Do List */}
      <div className="rounded-lg border border-zinc-200 bg-white p-3.5 sm:p-4 space-y-3.5 shadow-2xs">
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">
              Agenda &amp; Prioritas
            </h2>
            <span className="text-[11px] font-mono font-medium px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600">
              {tasks.totalTasks} Tugas
            </span>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari prospek atau nomor HP..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-zinc-200 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
            />
          </div>
        </div>

        {/* Filter Bar (Scrollable on small screens) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-3.5 px-3.5 sm:mx-0 sm:px-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveCategory("ALL")}
            className={`px-2.5 py-1 rounded-md font-medium shrink-0 transition-colors ${activeCategory === "ALL"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
          >
            Semua ({tasks.totalTasks})
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("OVERDUE")}
            className={`px-2.5 py-1 rounded-md font-medium shrink-0 transition-colors inline-flex items-center gap-1.5 ${activeCategory === "OVERDUE"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
          >
            <ClockAlert className={`w-3.5 h-3.5 ${activeCategory === "OVERDUE" ? "text-white" : "text-rose-600"}`} />
            <span>Terlewat ({tasks.overdueFollowUps.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("TODAY")}
            className={`px-2.5 py-1 rounded-md font-medium shrink-0 transition-colors inline-flex items-center gap-1.5 ${activeCategory === "TODAY"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
          >
            <CalendarClock className={`w-3.5 h-3.5 ${activeCategory === "TODAY" ? "text-white" : "text-amber-600"}`} />
            <span>Hari Ini ({tasks.todayFollowUps.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory("SURVEY")}
            className={`px-2.5 py-1 rounded-md font-medium shrink-0 transition-colors inline-flex items-center gap-1.5 ${activeCategory === "SURVEY"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
          >
            <MapPin className={`w-3.5 h-3.5 ${activeCategory === "SURVEY" ? "text-white" : "text-zinc-600"}`} />
            <span>Survei ({tasks.upcomingSurveys.length})</span>
          </button>
        </div>

        {/* Task Cards List */}
        {filteredTasks.length === 0 ? (
          <div className="py-10 text-center text-xs text-zinc-500 rounded border border-zinc-100 bg-zinc-50/50">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5 opacity-80" />
            <p className="font-medium text-zinc-900">Tidak ada agenda tertunda</p>
            <p className="text-zinc-400 mt-0.5">
              {searchQuery
                ? `Tidak ada hasil pencarian untuk "${searchQuery}".`
                : "Semua agenda follow-up dalam kategori ini telah diselesaikan."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-md overflow-hidden">
            {filteredTasks.map((task) => (
              <Link
                key={task.id}
                href={`/marketing/lead/${task.leadId}`}
                className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-50/70 transition-colors group block bg-white"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs sm:text-[13px] text-zinc-900 group-hover:underline truncate">
                      {task.nama}
                    </span>
                    {renderBadge(task)}
                    {task.unitBlok && (
                      <span className="font-mono text-[10px] text-zinc-500 px-1 py-0.2 rounded bg-zinc-100 border border-zinc-200">
                        Blok {task.unitBlok}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-700 font-medium truncate">
                    {task.title}
                  </p>

                  {task.description && (
                    <p className="text-[11px] text-zinc-500 line-clamp-1 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-0.5 text-[11px] text-zinc-400 font-mono">
                    <span className="inline-flex items-center gap-1 text-zinc-600">
                      <Phone className="w-3 h-3 text-zinc-400" />
                      {task.no_hp}
                    </span>
                    <span>•</span>
                    <span className="text-zinc-700 font-medium">
                      {task.datetimeFormatted}
                    </span>
                    {task.minat_tipe && (
                      <>
                        <span>•</span>
                        <span className="text-zinc-500 truncate">
                          Tipe {task.minat_tipe}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}