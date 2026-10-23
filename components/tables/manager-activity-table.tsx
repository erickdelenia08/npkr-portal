// components/tables/manager-activity-table.tsx
"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  Clock,
  User,
  Phone,
  MessageCircle,
  Users,
  CalendarCheck,
  FileText,
  ExternalLink,
  RotateCcw,
  Tag,
  ArrowRight,
  Shield,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  GlobalActivityItem,
  getGlobalActivities,
} from "@/actions/activity";
import { JenisAktivitas, HasilAktivitas } from "@/generated/prisma";

export interface ActorOption {
  id: number;
  nama: string;
  role: string;
}

interface ManagerActivityTableProps {
  initialActivities: GlobalActivityItem[];
  actors: ActorOption[];
  basePath?: string;
}

export function ManagerActivityTable({
  initialActivities,
  actors,
  basePath = "/manager",
}: ManagerActivityTableProps) {
  const [activities, setActivities] = useState<GlobalActivityItem[]>(initialActivities);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedJenis, setSelectedJenis] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Helper date formatter (WIB / id-ID)
  const formatDateTime = (dateVal: Date | string | null | undefined): string => {
    if (!dateVal) return "-";
    const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (dateVal: Date | string | null | undefined): string => {
    if (!dateVal) return "-";
    const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Helper badge for Jenis Aktivitas
  const getJenisBadge = (jenis: JenisAktivitas) => {
    switch (jenis) {
      case "WHATSAPP":
        return {
          label: "WhatsApp",
          icon: MessageCircle,
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "TELEPON":
        return {
          label: "Telepon",
          icon: Phone,
          className: "bg-blue-50 text-blue-700 border-blue-200",
        };
      case "BERTEMU":
        return {
          label: "Bertemu Langsung",
          icon: Users,
          className: "bg-purple-50 text-purple-700 border-purple-200",
        };
      case "LAINNYA":
      default:
        return {
          label: "Lainnya",
          icon: Tag,
          className: "bg-bone text-graphite border-mist",
        };
    }
  };

  // Helper badge for Hasil Aktivitas
  const getHasilBadge = (hasil: HasilAktivitas) => {
    switch (hasil) {
      case "TERTARIK":
        return "bg-teal-50 text-deep-teal border-teal-200";
      case "MINTA_INFO_LAGI":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "MASIH_MIKIR":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "TIDAK_DIJAWAB":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "TIDAK_JADI":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-bone text-graphite border-mist";
    }
  };

  const formatHasilLabel = (hasil: string): string => {
    return hasil.replace(/_/g, " ");
  };

  // Server-side filter fetch trigger
  const applyFilters = (
    userIdVal: string,
    jenisVal: string,
    startVal: string,
    endVal: string
  ) => {
    startTransition(async () => {
      try {
        const res = await getGlobalActivities({
          userId: userIdVal ? Number(userIdVal) : undefined,
          jenis: jenisVal ? (jenisVal as JenisAktivitas) : undefined,
          startDate: startVal || undefined,
          endDate: endVal || undefined,
        });

        if (res.success && res.data) {
          setActivities(res.data);
        } else {
          toast.error(res.error || "Gagal memuat log aktivitas.");
        }
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "Terjadi kesalahan saat memuat aktivitas.";
        toast.error(errorMsg);
      }
    });
  };

  const handleUserChange = (val: string) => {
    setSelectedUserId(val);
    applyFilters(val, selectedJenis, startDate, endDate);
  };

  const handleJenisChange = (val: string) => {
    setSelectedJenis(val);
    applyFilters(selectedUserId, val, startDate, endDate);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    applyFilters(selectedUserId, selectedJenis, val, endDate);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    applyFilters(selectedUserId, selectedJenis, startDate, val);
  };

  const handleResetFilters = () => {
    setSelectedUserId("");
    setSelectedJenis("");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    applyFilters("", "", "", "");
  };

  const handleRefresh = () => {
    applyFilters(selectedUserId, selectedJenis, startDate, endDate);
  };

  // Client-side quick search over filtered records
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const q = searchQuery.toLowerCase().trim();
    return activities.filter((item) => {
      const actorMatch = item.user.nama.toLowerCase().includes(q);
      const leadMatch = item.lead.nama.toLowerCase().includes(q);
      const noteMatch = (item.catatan || "").toLowerCase().includes(q);
      const phoneMatch = (item.lead.no_hp || "").includes(q);
      return actorMatch || leadMatch || noteMatch || phoneMatch;
    });
  }, [activities, searchQuery]);

  // Aggregate statistics for Executive Glance
  const stats = useMemo(() => {
    const total = filteredActivities.length;
    const whatsapp = filteredActivities.filter((a) => a.jenis === "WHATSAPP").length;
    const telepon = filteredActivities.filter((a) => a.jenis === "TELEPON").length;
    const bertemu = filteredActivities.filter((a) => a.jenis === "BERTEMU").length;
    const handovers = filteredActivities.filter((a) =>
      (a.catatan || "").includes("[HANDOVER PIC]")
    ).length;

    return { total, whatsapp, telepon, bertemu, handovers };
  }, [filteredActivities]);

  return (
    <div className="space-y-6">
      {/* ─── 1. EXECUTIVE KPI SUMMARY TILES ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-mist shadow-subtle">
          <div className="flex items-center justify-between text-slate text-xs mb-1">
            <span className="font-semibold">Total Log</span>
            <Activity className="w-4 h-4 text-prism-teal" />
          </div>
          <p className="text-2xl font-bold text-carbon-ink font-mono">{stats.total}</p>
          <span className="text-[11px] text-slate mt-0.5 block">Semua aktivitas tercatat</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-mist shadow-subtle">
          <div className="flex items-center justify-between text-slate text-xs mb-1">
            <span className="font-semibold">WhatsApp</span>
            <MessageCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 font-mono">{stats.whatsapp}</p>
          <span className="text-[11px] text-slate mt-0.5 block">Pesan &amp; follow-up</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-mist shadow-subtle">
          <div className="flex items-center justify-between text-slate text-xs mb-1">
            <span className="font-semibold">Telepon</span>
            <Phone className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700 font-mono">{stats.telepon}</p>
          <span className="text-[11px] text-slate mt-0.5 block">Panggilan konsumen</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-mist shadow-subtle">
          <div className="flex items-center justify-between text-slate text-xs mb-1">
            <span className="font-semibold">Pertemuan Langsung</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700 font-mono">{stats.bertemu}</p>
          <span className="text-[11px] text-slate mt-0.5 block">Survei &amp; tatap muka</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-mist shadow-subtle col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate text-xs mb-1">
            <span className="font-semibold">Oper PIC</span>
            <Shield className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700 font-mono">{stats.handovers}</p>
          <span className="text-[11px] text-slate mt-0.5 block">Pengalihan PIC lead</span>
        </div>
      </div>

      {/* ─── 2. FILTER BAR ─── */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-mist shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-mist/80 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-deep-teal" />
            <h2 className="text-xs font-bold text-carbon-ink uppercase tracking-wider">
              Filter Log Aktivitas
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {(selectedUserId || selectedJenis || startDate || endDate || searchQuery) && (
              <button
                type="button"
                onClick={handleResetFilters}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-mist text-xs font-semibold text-slate hover:text-carbon-ink hover:bg-bone transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-xs font-semibold text-deep-teal hover:bg-teal-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Quick Search */}
          <div className="lg:col-span-1">
            <label className="block text-[11px] font-semibold text-slate mb-1">
              Pencarian Cepat
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
              <input
                type="text"
                placeholder="Nama lead, catatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-mist bg-white text-carbon-ink placeholder:text-fog focus:outline-none focus:border-prism-teal"
              />
            </div>
          </div>

          {/* Filter Actor / Personel */}
          <div>
            <label className="block text-[11px] font-semibold text-slate mb-1">
              Personel (Actor)
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => handleUserChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-mist bg-white text-carbon-ink focus:outline-none focus:border-prism-teal"
            >
              <option value="">Semua Personel</option>
              {actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.nama} ({actor.role})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Jenis Aktivitas */}
          <div>
            <label className="block text-[11px] font-semibold text-slate mb-1">
              Jenis Aktivitas
            </label>
            <select
              value={selectedJenis}
              onChange={(e) => handleJenisChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-mist bg-white text-carbon-ink focus:outline-none focus:border-prism-teal"
            >
              <option value="">Semua Jenis</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="TELEPON">Telepon</option>
              <option value="BERTEMU">Bertemu Langsung</option>
              <option value="LAINNYA">Lainnya / Handover</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-mist bg-white text-carbon-ink focus:outline-none focus:border-prism-teal"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-mist bg-white text-carbon-ink focus:outline-none focus:border-prism-teal"
            />
          </div>
        </div>
      </div>

      {/* ─── 3. ACTIVITY TABLE VIEW (DESKTOP & TABLET) ─── */}
      <div className="hidden md:block bg-white rounded-xl border border-mist shadow-subtle overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">Waktu (Time)</TableHead>
              <TableHead className="w-48">Personel (Actor)</TableHead>
              <TableHead className="w-36">Jenis (Type)</TableHead>
              <TableHead className="w-56">Lead Konsumen</TableHead>
              <TableHead>Hasil &amp; Catatan (Note / Result)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredActivities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <div className="max-w-sm mx-auto space-y-2">
                    <Activity className="w-8 h-8 text-slate/40 mx-auto" />
                    <p className="text-sm font-semibold text-carbon-ink">
                      Tidak ada aktivitas ditemukan
                    </p>
                    <p className="text-xs text-slate">
                      Silakan sesuaikan parameter pencarian atau tanggal pada filter di atas.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredActivities.map((act) => {
                const jenisInfo = getJenisBadge(act.jenis);
                const JenisIcon = jenisInfo.icon;
                const isHandover = (act.catatan || "").includes("[HANDOVER PIC]");

                return (
                  <TableRow key={act.id} className="hover:bg-bone/40 transition-colors">
                    {/* 1. Time Column */}
                    <TableCell className="align-top whitespace-nowrap">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-carbon-ink">
                          <Clock className="w-3.5 h-3.5 text-slate" />
                          <span>{formatDateTime(act.created_at)}</span>
                        </div>
                        <span className="text-[10px] text-slate block pl-5">
                          ID Aktivitas #{act.id}
                        </span>
                      </div>
                    </TableCell>

                    {/* 2. Actor Column */}
                    <TableCell className="align-top whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-teal-50 text-deep-teal border border-teal-200 flex items-center justify-center text-[11px] font-bold shrink-0">
                            {act.user.nama.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-carbon-ink text-xs">
                            {act.user.nama}
                          </span>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bone text-graphite border border-mist">
                          {act.user.role}
                        </span>
                      </div>
                    </TableCell>

                    {/* 3. Type Column */}
                    <TableCell className="align-top whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${jenisInfo.className}`}
                      >
                        <JenisIcon className="w-3.5 h-3.5" />
                        <span>{jenisInfo.label}</span>
                      </span>
                    </TableCell>

                    {/* 4. Lead Name Column (Link to detail) */}
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <Link
                          href={`${basePath}/lead/${act.lead.id}`}
                          className="font-bold text-xs text-carbon-ink hover:text-deep-teal inline-flex items-center gap-1 group transition-colors"
                        >
                          <span className="underline decoration-mist group-hover:decoration-deep-teal underline-offset-2">
                            {act.lead.nama}
                          </span>
                          <ExternalLink className="w-3 h-3 text-slate group-hover:text-deep-teal transition-colors" />
                        </Link>
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate">
                          <Phone className="w-3 h-3 text-slate" />
                          <span>{act.lead.no_hp}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* 5. Note / Result Column */}
                    <TableCell className="align-top">
                      <div className="space-y-1.5 max-w-lg">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getHasilBadge(
                              act.hasil
                            )}`}
                          >
                            {formatHasilLabel(act.hasil)}
                          </span>

                          {isHandover && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              <Shield className="w-3 h-3" />
                              Oper PIC
                            </span>
                          )}

                          {act.tgl_follow_up && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate">
                              <CalendarCheck className="w-3 h-3 text-prism-teal" />
                              <span>Next: {formatDateOnly(act.tgl_follow_up)}</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-graphite leading-relaxed break-words">
                          {act.catatan || (
                            <span className="italic text-fog">Tidak ada catatan tertulis</span>
                          )}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ─── 4. ACTIVITY LIST VIEW (MOBILE COMPACT CARDS) ─── */}
      <div className="block md:hidden space-y-3">
        {filteredActivities.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-mist text-center space-y-2">
            <Activity className="w-7 h-7 text-slate/40 mx-auto" />
            <p className="text-xs font-semibold text-carbon-ink">
              Tidak ada aktivitas ditemukan
            </p>
            <p className="text-[11px] text-slate">
              Coba sesuaikan filter atau rentang tanggal.
            </p>
          </div>
        ) : (
          filteredActivities.map((act) => {
            const jenisInfo = getJenisBadge(act.jenis);
            const JenisIcon = jenisInfo.icon;
            const isHandover = (act.catatan || "").includes("[HANDOVER PIC]");

            return (
              <div
                key={act.id}
                className="bg-white p-4 rounded-xl border border-mist shadow-subtle space-y-3"
              >
                {/* Header: Waktu & Jenis */}
                <div className="flex items-center justify-between gap-2 border-b border-mist/80 pb-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDateTime(act.created_at)}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${jenisInfo.className}`}
                  >
                    <JenisIcon className="w-3 h-3" />
                    <span>{jenisInfo.label}</span>
                  </span>
                </div>

                {/* Lead Name & Action Link */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate uppercase tracking-wider block">
                      Lead Konsumen
                    </span>
                    <Link
                      href={`${basePath}/lead/${act.lead.id}`}
                      className="font-bold text-sm text-carbon-ink hover:text-deep-teal inline-flex items-center gap-1 group mt-0.5"
                    >
                      <span className="underline decoration-mist group-hover:decoration-deep-teal">
                        {act.lead.nama}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate group-hover:text-deep-teal" />
                    </Link>
                    <span className="text-xs font-mono text-slate block mt-0.5">
                      {act.lead.no_hp}
                    </span>
                  </div>

                  {/* Actor Badge */}
                  <div className="text-right">
                    <span className="text-[10px] text-slate uppercase tracking-wider block">
                      Personel
                    </span>
                    <span className="text-xs font-semibold text-carbon-ink block mt-0.5">
                      {act.user.nama}
                    </span>
                    <span className="text-[10px] text-slate">({act.user.role})</span>
                  </div>
                </div>

                {/* Hasil & Catatan */}
                <div className="p-3 rounded-lg bg-bone/50 border border-mist space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getHasilBadge(
                        act.hasil
                      )}`}
                    >
                      {formatHasilLabel(act.hasil)}
                    </span>
                    {isHandover && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                        <Shield className="w-2.5 h-2.5" />
                        Oper PIC
                      </span>
                    )}
                    {act.tgl_follow_up && (
                      <span className="text-[11px] text-slate">
                        Next: {formatDateOnly(act.tgl_follow_up)}
                      </span>
                    )}
                  </div>
                  <p className="text-graphite leading-relaxed">
                    {act.catatan || (
                      <span className="italic text-fog">Tidak ada catatan tertulis</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
