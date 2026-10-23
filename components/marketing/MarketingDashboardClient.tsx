"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  UserPlus,
  CalendarCheck2,
  Award,
  ClockAlert,
  CalendarClock,
  MapPin,
  ChevronRight,
  Phone,
  Search,
  CheckCircle2,
  Building2,
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

  // Active Category Filter: "ALL" | TaskCategory
  const [activeCategory, setActiveCategory] = useState<"ALL" | TaskCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Filter tasks based on selected category & search query
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

  // Helper for badge colors
  const getBadgeStyle = (variant: MarketingTaskItem["badgeVariant"]) => {
    switch (variant) {
      case "red":
        return "bg-rose-50 border-rose-200 text-rose-700";
      case "amber":
        return "bg-amber-50 border-amber-200 text-amber-700";
      case "yellow":
        return "bg-amber-50 border-amber-300 text-amber-800";
      case "purple":
        return "bg-purple-50 border-purple-200 text-purple-700";
      default:
        return "bg-slate-50 border-slate-200 text-slate-700";
    }
  };

  const getCategoryIcon = (category: TaskCategory) => {
    switch (category) {
      case "OVERDUE":
        return <ClockAlert className="w-4 h-4 text-rose-600 shrink-0" />;
      case "TODAY":
        return <CalendarClock className="w-4 h-4 text-emerald-600 shrink-0" />;
      case "SURVEY":
        return <MapPin className="w-4 h-4 text-purple-600 shrink-0" />;
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* 1. Header & Greeting Bar (Mobile-Optimized) */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-mist shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-prism-teal/10 text-deep-teal">
              Marketing Assistant
            </span>
            <span className="text-xs text-slate font-medium">
              Periode {metrics.monthLabel}
            </span>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-carbon-ink tracking-tight font-heading mt-1">
            Halo, {marketingUser.nama} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate mt-0.5">
            Berikut ringkasan performa dan daftar tugas prioritas harian Anda.
          </p>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/marketing/unit"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-bone hover:bg-slate-200 text-graphite text-xs font-semibold transition-colors border border-mist"
          >
            <Building2 className="w-3.5 h-3.5 text-prism-teal" />
            <span>Katalog Unit</span>
          </Link>
          <Link
            href="/marketing/lead"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-prism-teal hover:bg-deep-teal text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Lead Baru</span>
          </Link>
        </div>
      </div>

      {/* 2. TOP SECTION: 3 METRICS (Horizontal scrollable on mobile / 3-column grid) */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {/* Metric 1: New Leads */}
        <div className="bg-gradient-to-br from-white to-teal-50/40 p-3 sm:p-4 rounded-xl border border-teal-100/80 shadow-subtle flex flex-col justify-between min-w-[105px] transition-all hover:border-teal-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate uppercase tracking-wider line-clamp-1">
              Lead Baru
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-100/70 text-prism-teal flex items-center justify-center shrink-0">
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="font-mono text-xl sm:text-3xl font-extrabold text-carbon-ink tracking-tight block">
              {metrics.newLeadsThisMonth}
            </span>
            <span className="text-[10px] sm:text-xs text-slate block mt-0.5 truncate">
              Bulan {metrics.monthLabel.split(" ")[0]}
            </span>
          </div>
        </div>

        {/* Metric 2: Surveys */}
        <div className="bg-gradient-to-br from-white to-indigo-50/40 p-3 sm:p-4 rounded-xl border border-indigo-100/80 shadow-subtle flex flex-col justify-between min-w-[105px] transition-all hover:border-indigo-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate uppercase tracking-wider line-clamp-1">
              Survei
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0">
              <CalendarCheck2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="font-mono text-xl sm:text-3xl font-extrabold text-carbon-ink tracking-tight block">
              {metrics.surveysThisMonth}
            </span>
            <span className="text-[10px] sm:text-xs text-slate block mt-0.5 truncate">
              Kunjungan tuntas
            </span>
          </div>
        </div>

        {/* Metric 3: Closing */}
        <div className="bg-gradient-to-br from-white to-emerald-50/40 p-3 sm:p-4 rounded-xl border border-emerald-100/80 shadow-subtle flex flex-col justify-between min-w-[105px] transition-all hover:border-emerald-300">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-semibold text-slate uppercase tracking-wider line-clamp-1">
              Closing Deal
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="font-mono text-xl sm:text-3xl font-extrabold text-carbon-ink tracking-tight block">
              {metrics.closingsThisMonth}
            </span>
            <span className="text-[10px] sm:text-xs text-slate block mt-0.5 truncate">
              ITJ Closing Deal
            </span>
          </div>
        </div>
      </div>

      {/* 3. TASK LIST SECTION (Mobile-First To-Do List) */}
      <div className="bg-white rounded-xl border border-mist shadow-subtle p-4 sm:p-5 space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-mist">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-carbon-ink tracking-tight font-heading">
                Agenda &amp; To-Do List
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-carbon-ink border border-slate-200">
                {tasks.totalTasks} Tugas
              </span>
            </div>
            <p className="text-xs text-slate mt-0.5">
              Fokuskan perhatian pada tugas paling mendesak hari ini.
            </p>
          </div>

          {/* Search Input for Mobile & Desktop */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau telepon..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
            />
          </div>
        </div>

        {/* Category Filter Pills (Order of Importance) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setActiveCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
              activeCategory === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
          >
            <span>Semua</span>
            <span className="font-mono text-[10px] opacity-80">
              ({tasks.totalTasks})
            </span>
          </button>

          {/* 2. Overdue Follow-ups (Red) */}
          <button
            type="button"
            onClick={() => setActiveCategory("OVERDUE")}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
              activeCategory === "OVERDUE"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200"
            }`}
          >
            <ClockAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Terlewat</span>
            <span className="font-mono text-[10px] font-bold">
              ({tasks.overdueFollowUps.length})
            </span>
          </button>

          {/* 3. Today's Follow-up (Yellow/Green) */}
          <button
            type="button"
            onClick={() => setActiveCategory("TODAY")}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
              activeCategory === "TODAY"
                ? "bg-emerald-700 text-white shadow-xs"
                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5 shrink-0" />
            <span>Hari Ini</span>
            <span className="font-mono text-[10px] font-bold">
              ({tasks.todayFollowUps.length})
            </span>
          </button>

          {/* 4. Upcoming Surveys (Purple) */}
          <button
            type="button"
            onClick={() => setActiveCategory("SURVEY")}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all flex items-center gap-1.5 ${
              activeCategory === "SURVEY"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>Survei</span>
            <span className="font-mono text-[10px] font-bold">
              ({tasks.upcomingSurveys.length})
            </span>
          </button>
        </div>

        {/* Task Cards List (Order of Importance) */}
        {filteredTasks.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-xl border border-dashed border-mist bg-slate-50/50">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <h3 className="text-sm font-bold text-carbon-ink">
              Semua tugas telah diselesaikan!
            </h3>
            <p className="text-xs text-slate mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `Tidak ada tugas yang sesuai dengan kata kunci "${searchQuery}".`
                : "Tidak ada to-do mendesak dalam kategori ini saat ini. Manfaatkan waktu untuk menjaring prospek baru!"}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTasks.map((task) => {
              const badgeStyle = getBadgeStyle(task.badgeVariant);

              return (
                <Link
                  key={task.id}
                  href={`/marketing/lead/${task.leadId}`}
                  className="block bg-white hover:bg-slate-50/80 rounded-xl border border-mist hover:border-prism-teal/60 shadow-xs hover:shadow-subtle transition-all p-3.5 sm:p-4 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Lead Identity & Action Title */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Category Icon */}
                        {getCategoryIcon(task.category)}

                        {/* Lead Name */}
                        <span className="font-bold text-sm sm:text-base text-carbon-ink group-hover:text-deep-teal transition-colors truncate">
                          {task.nama}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle}`}
                        >
                          {task.badgeText}
                        </span>

                        {/* Unit Blok if available */}
                        {task.unitBlok && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-bone text-graphite border border-mist">
                            Blok {task.unitBlok}
                          </span>
                        )}
                      </div>

                      {/* Action Title & Notes */}
                      <div className="text-xs text-slate space-y-0.5">
                        <p className="font-semibold text-graphite">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-slate line-clamp-2 text-[11px] sm:text-xs leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>

                      {/* Phone & Date Info Bar */}
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-slate flex-wrap font-mono">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate" />
                          <span>{task.no_hp}</span>
                        </span>

                        <span>•</span>

                        <span className="font-semibold text-carbon-ink">
                          {task.datetimeFormatted}
                        </span>

                        {task.minat_tipe && (
                          <>
                            <span>•</span>
                            <span className="text-prism-teal font-medium">
                              Tipe: {task.minat_tipe}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Chevron Arrow */}
                    <div className="self-center shrink-0 w-8 h-8 rounded-lg bg-bone/70 group-hover:bg-prism-teal group-hover:text-white flex items-center justify-center transition-all">
                      <ChevronRight className="w-4 h-4 text-slate group-hover:text-white transition-colors" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
