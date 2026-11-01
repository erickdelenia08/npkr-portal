// components/tables/manager-activity-table.tsx
"use client";

import React, { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  ExternalLink,
  Users,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  Activity,
  CreditCard,
  Building,
  FileCheck,
  Building2,
  Calendar,
  Sparkles,
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
  ActivityLogFeedItem,
  ActivityFeedResult,
  getActivityFeed,
} from "@/actions/activity";
import { ActivityFeedCategory } from "@/schemas/activity.schema";
import { formatTimestampWIB, relativeTimeTodayWIB } from "@/lib/date/wib";
import { ActivityDetailSheet } from "@/components/shared/activity-detail-sheet";

export interface ActorOption {
  id: number;
  nama: string;
  role: string;
}

interface ManagerActivityTableProps {
  initialResult: ActivityFeedResult;
  actors: ActorOption[];
  defaultDateFrom: string;
  defaultDateTo: string;
  basePath?: string;
}

export function ManagerActivityTable({
  initialResult,
  actors,
  defaultDateFrom,
  defaultDateTo,
  basePath = "/manager",
}: ManagerActivityTableProps) {
  const [result, setResult] = useState<ActivityFeedResult>(initialResult);
  const [selectedActorId, setSelectedActorId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] =
    useState<ActivityFeedCategory>("SEMUA");
  const [dateFrom, setDateFrom] = useState<string>(defaultDateFrom);
  const [dateTo, setDateTo] = useState<string>(defaultDateTo);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(
    initialResult.pagination.page
  );
  const [pageSize, setPageSize] = useState<number>(
    initialResult.pagination.pageSize
  );
  const [isPending, startTransition] = useTransition();

  // Detail Sheet state
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityLogFeedItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);

  const fetchFeed = useCallback(
    (
      targetPage = currentPage,
      targetPageSize = pageSize,
      actor = selectedActorId,
      cat = selectedCategory,
      from = dateFrom,
      to = dateTo,
      search = searchQuery
    ) => {
      startTransition(async () => {
        try {
          const res = await getActivityFeed({
            page: targetPage,
            pageSize: targetPageSize,
            actorId: actor ? Number(actor) : undefined,
            actionCategory: cat,
            dateFrom: from || undefined,
            dateTo: to || undefined,
            search: search.trim() || undefined,
          });

          if (res.success && res.data) {
            setResult(res.data);
            setCurrentPage(res.data.pagination.page);
          } else {
            toast.error(res.error || "Gagal memuat feed aktivitas.");
          }
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
          toast.error(msg);
        }
      });
    },
    [currentPage, pageSize, selectedActorId, selectedCategory, dateFrom, dateTo, searchQuery]
  );

  const handleFilterChange = (
    newActor: string,
    newCat: ActivityFeedCategory,
    newFrom: string,
    newTo: string,
    newSearch: string,
    newPageSize: number
  ) => {
    setSelectedActorId(newActor);
    setSelectedCategory(newCat);
    setDateFrom(newFrom);
    setDateTo(newTo);
    setSearchQuery(newSearch);
    setPageSize(newPageSize);
    fetchFeed(1, newPageSize, newActor, newCat, newFrom, newTo, newSearch);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > result.pagination.totalPages) return;
    fetchFeed(newPage, pageSize);
  };

  const getInitials = (name?: string): string => {
    if (!name) return "SY";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const renderCategoryBadge = (entityType: string, action: string) => {
    if (entityType === "LEAD" || action.startsWith("LEAD_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
          <Users className="w-3 h-3 text-sky-600" />
          Lead
        </span>
      );
    }
    if (entityType === "TRANSAKSI" || action.startsWith("STAGE_") || action.startsWith("AKAD_") || action.startsWith("BAST_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-teal-50 text-teal-800 border border-teal-200">
          <Building className="w-3 h-3 text-teal-600" />
          Transaksi
        </span>
      );
    }
    if (entityType === "PEMBAYARAN" || action.startsWith("PAYMENT_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CreditCard className="w-3 h-3 text-emerald-600" />
          Pembayaran
        </span>
      );
    }
    if (entityType === "PENGAJUAN_KPR" || action.startsWith("KPR_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-800 border border-indigo-200">
          <Building2 className="w-3 h-3 text-indigo-600" />
          KPR
        </span>
      );
    }
    if (entityType === "DOKUMEN" || entityType === "BAST_ITEM" || action.startsWith("DOC_") || action.startsWith("BAST_ITEM_")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <FileCheck className="w-3 h-3 text-amber-600" />
          Dokumen
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
        <Activity className="w-3 h-3 text-zinc-500" />
        Master
      </span>
    );
  };

  const { stats, pagination, items } = result;

  return (
    <div className="space-y-5">
      {/* ─── 1. TOP CARDS: AGGREGATED METRICS (SQL GROUP BY) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total */}
        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">
            Total Aktivitas
          </span>
          <span className="text-xl font-bold text-zinc-900 mt-1 block tabular-nums">
            {stats.totalActivities}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">
            Periode terpilih
          </span>
        </div>

        {/* Lead */}
        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-sky-700 block">
            Lead &amp; Follow-up
          </span>
          <span className="text-xl font-bold text-sky-800 mt-1 block tabular-nums">
            {stats.breakdown.lead}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">Interaksi prospek</span>
        </div>

        {/* Transaksi */}
        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-teal-700 block">
            Transaksi &amp; Tahap
          </span>
          <span className="text-xl font-bold text-teal-800 mt-1 block tabular-nums">
            {stats.breakdown.transaksi}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">Progres berkas</span>
        </div>

        {/* Pembayaran */}
        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-emerald-700 block">
            Pembayaran
          </span>
          <span className="text-xl font-bold text-emerald-800 mt-1 block tabular-nums">
            {stats.breakdown.pembayaran}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">ITJ, DP, Void</span>
        </div>

        {/* KPR */}
        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-indigo-700 block">
            Pengajuan KPR
          </span>
          <span className="text-xl font-bold text-indigo-800 mt-1 block tabular-nums">
            {stats.breakdown.kpr}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">Status &amp; Bank</span>
        </div>

        {/* Lainnya (Dokumen, BAST, Master) */}
        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-amber-700 block">
            Dokumen &amp; Lainnya
          </span>
          <span className="text-xl font-bold text-amber-800 mt-1 block tabular-nums">
            {stats.breakdown.lainnya}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">Legalitas &amp; Unit</span>
        </div>

        {/* Personel Paling Aktif */}
        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white col-span-2 sm:col-span-4 lg:col-span-1">
          <span className="text-[11px] font-medium text-zinc-500 block">
            Personel Teraktif
          </span>
          {stats.mostActiveActor ? (
            <div className="mt-1">
              <span className="text-sm font-bold text-zinc-900 block truncate">
                {stats.mostActiveActor.nama}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-100 text-zinc-600 font-mono">
                  {stats.mostActiveActor.role}
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 tabular-nums">
                  {stats.mostActiveActor.count} aksi
                </span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-zinc-400 mt-1 block">—</span>
          )}
        </div>
      </div>

      {/* ─── 2. CONTROL & FILTER BAR ─── */}
      <div className="flex flex-wrap items-center gap-2.5 bg-zinc-50/80 p-3 rounded-lg border border-zinc-200">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari dalam narasi aktivitas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleFilterChange(
                  selectedActorId,
                  selectedCategory,
                  dateFrom,
                  dateTo,
                  searchQuery,
                  pageSize
                );
              }
            }}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-zinc-200 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
          />
        </div>

        {/* Actor */}
        <select
          value={selectedActorId}
          onChange={(e) =>
            handleFilterChange(
              e.target.value,
              selectedCategory,
              dateFrom,
              dateTo,
              searchQuery,
              pageSize
            )
          }
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="">Semua Personel</option>
          {actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.nama} ({actor.role})
            </option>
          ))}
        </select>

        {/* Category */}
        <select
          value={selectedCategory}
          onChange={(e) =>
            handleFilterChange(
              selectedActorId,
              e.target.value as ActivityFeedCategory,
              dateFrom,
              dateTo,
              searchQuery,
              pageSize
            )
          }
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="SEMUA">Semua Kategori</option>
          <option value="LEAD">Lead &amp; Follow-up</option>
          <option value="TRANSAKSI">Transaksi &amp; Tahap</option>
          <option value="PEMBAYARAN">Pembayaran</option>
          <option value="KPR">KPR</option>
          <option value="DOKUMEN">Dokumen &amp; Legalitas</option>
          <option value="MASTER">Master Data</option>
        </select>

        {/* Date Range */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) =>
              handleFilterChange(
                selectedActorId,
                selectedCategory,
                e.target.value,
                dateTo,
                searchQuery,
                pageSize
              )
            }
            className="h-8 px-2 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            title="Tanggal Mulai (WIB)"
          />
          <span>—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) =>
              handleFilterChange(
                selectedActorId,
                selectedCategory,
                dateFrom,
                e.target.value,
                searchQuery,
                pageSize
              )
            }
            className="h-8 px-2 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            title="Tanggal Akhir (WIB)"
          />
        </div>

        {/* Page Size */}
        <select
          value={pageSize}
          onChange={(e) =>
            handleFilterChange(
              selectedActorId,
              selectedCategory,
              dateFrom,
              dateTo,
              searchQuery,
              Number(e.target.value)
            )
          }
          className="h-8 px-2 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          title="Jumlah per halaman"
        >
          <option value={25}>25 / hal</option>
          <option value={50}>50 / hal</option>
          <option value={100}>100 / hal</option>
        </select>

        {/* Refresh button */}
        <button
          type="button"
          onClick={() =>
            handleFilterChange(
              selectedActorId,
              selectedCategory,
              dateFrom,
              dateTo,
              searchQuery,
              pageSize
            )
          }
          disabled={isPending}
          className="p-2 rounded-md border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          title="Muat Ulang Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ─── 3. FEED TABLE ─── */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-zinc-200 bg-zinc-50/75 hover:bg-zinc-50/75">
              <TableHead className="w-48 text-xs font-semibold text-zinc-600">
                Waktu (WIB)
              </TableHead>
              <TableHead className="w-32 text-xs font-semibold text-zinc-600">
                Kategori
              </TableHead>
              <TableHead className="w-48 text-xs font-semibold text-zinc-600">
                Personel
              </TableHead>
              <TableHead className="text-xs font-semibold text-zinc-600">
                Aktivitas &amp; Narasi
              </TableHead>
              <TableHead className="w-24 text-right text-xs font-semibold text-zinc-600">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="text-xs text-zinc-700 divide-y divide-zinc-100">
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-zinc-500">
                  <p className="text-sm font-semibold text-zinc-800">
                    Tidak ada aktivitas yang sesuai
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Coba sesuaikan kata kunci pencarian atau rentang tanggal.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const todayBadge = relativeTimeTodayWIB(item.created_at);

                return (
                  <TableRow
                    key={item.id}
                    className="hover:bg-zinc-50/60 transition-colors"
                  >
                    {/* Waktu (WIB) */}
                    <TableCell className="align-top whitespace-nowrap">
                      <div className="space-y-0.5">
                        <span className="font-mono text-[11px] text-zinc-700 block">
                          {formatTimestampWIB(item.created_at)}
                        </span>
                        {todayBadge && (
                          <span className="inline-block text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-medium">
                            {todayBadge}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Kategori */}
                    <TableCell className="align-top whitespace-nowrap">
                      {renderCategoryBadge(item.entity_type, item.action)}
                    </TableCell>

                    {/* Personel Pelaksana */}
                    <TableCell className="align-top">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-700 shrink-0">
                          {getInitials(item.actor?.nama)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 truncate">
                            {item.actor?.nama || "Sistem"}
                          </p>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {item.actor?.role || "SYSTEM"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Narasi Ringkasan & Link Entitas */}
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="text-xs text-zinc-900 font-medium leading-relaxed">
                          {item.summary}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                          {/* Lead Link */}
                          {item.lead && (
                            <Link
                              href={`${basePath}/lead/${item.lead.id}`}
                              className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 hover:underline font-medium"
                            >
                              <Users className="w-3 h-3" />
                              <span>{item.lead.nama}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </Link>
                          )}

                          {/* Transaksi Link */}
                          {item.transaksi && (
                            <Link
                              href={`${basePath}/transaksi/${item.transaksi.id}`}
                              className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 hover:underline font-medium"
                            >
                              <Building className="w-3 h-3" />
                              <span>
                                {item.transaksi.unit?.blok
                                  ? `Unit Blok ${item.transaksi.unit.blok}`
                                  : `Trx #${item.transaksi.id}`}
                              </span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </Link>
                          )}

                          {/* Stage Pill */}
                          {item.tahap_detail && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 font-mono">
                              {item.tahap_detail}
                            </span>
                          )}

                          {/* Backfill Indicator */}
                          {item.is_backfill && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200/60 font-mono">
                              <Database className="w-2.5 h-2.5" />
                              Backfill
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Action */}
                    <TableCell className="align-top text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedActivity(item);
                          setIsSheetOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                      >
                        <Eye className="w-3 h-3 text-zinc-500" />
                        Detail
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* ─── 4. SERVER-SIDE PAGINATION CONTROLS ─── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-zinc-200 bg-zinc-50/60 text-xs text-zinc-600">
          <div>
            Menampilkan{" "}
            <span className="font-semibold text-zinc-900">
              {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}
            </span>{" "}
            sampai{" "}
            <span className="font-semibold text-zinc-900">
              {Math.min(pagination.page * pagination.pageSize, pagination.total)}
            </span>{" "}
            dari{" "}
            <span className="font-semibold text-zinc-900">
              {pagination.total}
            </span>{" "}
            aktivitas
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs">
              Halaman {pagination.page} dari {pagination.totalPages}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1 || isPending}
                className="p-1.5 rounded-md border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || isPending}
                className="p-1.5 rounded-md border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Audit Drawer */}
      <ActivityDetailSheet
        activity={selectedActivity}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </div>
  );
}
