// components/tables/manager-activity-table.tsx
"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  ExternalLink,
  Phone,
  MessageCircle,
  Users,
  Tag,
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

  const formatDateTime = (dateVal: Date | string | null | undefined): string => {
    if (!dateVal) return "—";
    const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (dateVal: Date | string | null | undefined): string => {
    if (!dateVal) return "—";
    const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderJenisBadge = (jenis: JenisAktivitas) => {
    switch (jenis) {
      case "WHATSAPP":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
            <MessageCircle className="w-3 h-3 text-emerald-600" />
            WhatsApp
          </span>
        );
      case "TELEPON":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-800">
            <Phone className="w-3 h-3 text-blue-600" />
            Telepon
          </span>
        );
      case "BERTEMU":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-800">
            <Users className="w-3 h-3 text-purple-600" />
            Tatap Muka
          </span>
        );
      case "LAINNYA":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600">
            <Tag className="w-3 h-3 text-zinc-400" />
            Lainnya
          </span>
        );
    }
  };

  const renderHasilBadge = (hasil: HasilAktivitas) => {
    switch (hasil) {
      case "TERTARIK":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "MINTA_INFO_LAGI":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "MASIH_MIKIR":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "TIDAK_JADI":
        return "bg-zinc-100 text-zinc-500 border-zinc-200";
      case "TIDAK_DIJAWAB":
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

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
        toast.error(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
      }
    });
  };

  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities;
    const q = searchQuery.toLowerCase().trim();
    return activities.filter((item) => {
      return (
        item.user.nama.toLowerCase().includes(q) ||
        item.lead.nama.toLowerCase().includes(q) ||
        (item.catatan || "").toLowerCase().includes(q) ||
        (item.lead.no_hp || "").includes(q)
      );
    });
  }, [activities, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: filteredActivities.length,
      wa: filteredActivities.filter((a) => a.jenis === "WHATSAPP").length,
      call: filteredActivities.filter((a) => a.jenis === "TELEPON").length,
      meet: filteredActivities.filter((a) => a.jenis === "BERTEMU").length,
      operPic: filteredActivities.filter((a) => (a.catatan || "").includes("[HANDOVER PIC]")).length,
    };
  }, [filteredActivities]);

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Total Aktivitas</span>
          <span className="text-xl font-semibold text-zinc-900 mt-1 block tabular-nums">
            {stats.total}
          </span>
        </div>
        <div className="p-3 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">WhatsApp</span>
          <span className="text-xl font-semibold text-emerald-800 mt-1 block tabular-nums">
            {stats.wa}
          </span>
        </div>
        <div className="p-3 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Telepon</span>
          <span className="text-xl font-semibold text-blue-800 mt-1 block tabular-nums">
            {stats.call}
          </span>
        </div>
        <div className="p-3 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Tatap Muka</span>
          <span className="text-xl font-semibold text-purple-800 mt-1 block tabular-nums">
            {stats.meet}
          </span>
        </div>
        <div className="p-3 rounded-lg border border-zinc-200 bg-white col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-zinc-500 block">Oper PIC</span>
          <span className="text-xl font-semibold text-amber-800 mt-1 block tabular-nums">
            {stats.operPic}
          </span>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-wrap items-center gap-2.5 bg-zinc-50/60 p-2.5 rounded-lg border border-zinc-200">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari prospek, personel, catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-zinc-200 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
          />
        </div>

        <select
          value={selectedUserId}
          onChange={(e) => {
            setSelectedUserId(e.target.value);
            applyFilters(e.target.value, selectedJenis, startDate, endDate);
          }}
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="">Semua Personel</option>
          {actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.nama} ({actor.role})
            </option>
          ))}
        </select>

        <select
          value={selectedJenis}
          onChange={(e) => {
            setSelectedJenis(e.target.value);
            applyFilters(selectedUserId, e.target.value, startDate, endDate);
          }}
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="">Semua Metode</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="TELEPON">Telepon</option>
          <option value="BERTEMU">Tatap Muka</option>
          <option value="LAINNYA">Lainnya</option>
        </select>

        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              applyFilters(selectedUserId, selectedJenis, e.target.value, endDate);
            }}
            className="h-8 px-2 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
          <span>—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              applyFilters(selectedUserId, selectedJenis, startDate, e.target.value);
            }}
            className="h-8 px-2 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>

        <button
          type="button"
          onClick={() => applyFilters(selectedUserId, selectedJenis, startDate, endDate)}
          disabled={isPending}
          className="p-2 rounded-md border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          title="Muat Ulang"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Main Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-zinc-200 bg-zinc-50/75 hover:bg-zinc-50/75">
              <TableHead className="w-40 text-xs font-medium text-zinc-500">Waktu</TableHead>
              <TableHead className="w-44 text-xs font-medium text-zinc-500">Personel</TableHead>
              <TableHead className="w-32 text-xs font-medium text-zinc-500">Metode</TableHead>
              <TableHead className="w-52 text-xs font-medium text-zinc-500">Prospek</TableHead>
              <TableHead className="text-xs font-medium text-zinc-500">Hasil &amp; Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs text-zinc-700 divide-y divide-zinc-100">
            {filteredActivities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-zinc-500">
                  <p className="text-sm font-medium text-zinc-900">Tidak ada log aktivitas</p>
                  <p className="text-xs text-zinc-500 mt-1">Ubah kata kunci atau reset filter tanggal.</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredActivities.map((act) => {
                const isHandover = (act.catatan || "").includes("[HANDOVER PIC]");

                return (
                  <TableRow key={act.id} className="hover:bg-zinc-50/60 transition-colors">
                    {/* Waktu */}
                    <TableCell className="align-top whitespace-nowrap font-mono text-[11px] text-zinc-500">
                      {formatDateTime(act.created_at)}
                    </TableCell>

                    {/* Personel */}
                    <TableCell className="align-top whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-900">{act.user.nama}</span>
                        <span className="text-[10px] text-zinc-400">{act.user.role}</span>
                      </div>
                    </TableCell>

                    {/* Metode */}
                    <TableCell className="align-top whitespace-nowrap">
                      {renderJenisBadge(act.jenis)}
                    </TableCell>

                    {/* Lead */}
                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <Link
                          href={`${basePath}/lead/${act.lead.id}`}
                          className="font-medium text-zinc-900 hover:underline inline-flex items-center gap-1 group"
                        >
                          <span>{act.lead.nama}</span>
                          <ExternalLink className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <span className="font-mono text-[11px] text-zinc-400 mt-0.5">
                          {act.lead.no_hp}
                        </span>
                      </div>
                    </TableCell>

                    {/* Catatan & Hasil */}
                    <TableCell className="align-top">
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium border ${renderHasilBadge(
                              act.hasil
                            )}`}
                          >
                            {act.hasil.replace(/_/g, " ")}
                          </span>

                          {isHandover && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              Oper PIC
                            </span>
                          )}

                          {act.tgl_follow_up && (
                            <span className="text-[11px] text-zinc-500 font-mono">
                              Next: {formatDateOnly(act.tgl_follow_up)}
                            </span>
                          )}
                        </div>

                        <p className="text-zinc-600 leading-relaxed">
                          {act.catatan || <span className="text-zinc-400 italic">Tidak ada catatan</span>}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <div className="px-4 py-2.5 border-t border-zinc-200 bg-zinc-50/50 text-xs text-zinc-500">
          Menampilkan <span className="font-medium text-zinc-800">{filteredActivities.length}</span> log aktivitas
        </div>
      </div>
    </div>
  );
}