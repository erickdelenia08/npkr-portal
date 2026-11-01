// components/shared/transaction-audit-trail.tsx
"use client";

import React, { useState, useMemo } from "react";
import {
  History,
  CheckCircle2,
  CreditCard,
  Building2,
  FileText,
  Clock,
  User,
  Layers,
  ArrowRight,
  Database,
  Filter,
  Eye,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { ActivityLogFeedItem } from "@/actions/activity";
import { formatTimestampWIB, relativeTimeTodayWIB } from "@/lib/date/wib";
import { ActivityDetailSheet } from "@/components/shared/activity-detail-sheet";

interface TransactionAuditTrailProps {
  logs: ActivityLogFeedItem[];
  transaksiId: number;
}

type TimelineFilter = "SEMUA" | "TAHAP" | "PEMBAYARAN" | "KPR" | "DOKUMEN";

export function TransactionAuditTrail({
  logs,
  transaksiId,
}: TransactionAuditTrailProps) {
  const [filter, setFilter] = useState<TimelineFilter>("SEMUA");
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityLogFeedItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);

  const filteredLogs = useMemo(() => {
    if (filter === "SEMUA") return logs;

    return logs.filter((log) => {
      const act = log.action;
      if (filter === "TAHAP") {
        return (
          act.startsWith("STAGE_") ||
          act.startsWith("AKAD_") ||
          act.startsWith("BAST_CONFIRMED") ||
          act === "TRANSAKSI_CANCELLED" ||
          act === "SCHEDULE_UPDATED" ||
          act === "PROFILE_UPDATED" ||
          act === "ITJ_SUBMITTED"
        );
      }
      if (filter === "PEMBAYARAN") {
        return act.startsWith("PAYMENT_");
      }
      if (filter === "KPR") {
        return act.startsWith("KPR_");
      }
      if (filter === "DOKUMEN") {
        return act.startsWith("DOC_") || act.startsWith("BAST_ITEM_");
      }
      return true;
    });
  }, [logs, filter]);

  const getTimelineIcon = (action: string) => {
    if (action.startsWith("PAYMENT_")) {
      return <CreditCard className="w-4 h-4 text-emerald-600" />;
    }
    if (action.startsWith("KPR_")) {
      return <Building2 className="w-4 h-4 text-indigo-600" />;
    }
    if (action.startsWith("DOC_") || action.startsWith("BAST_ITEM_")) {
      return <FileText className="w-4 h-4 text-amber-600" />;
    }
    if (action === "TRANSAKSI_CANCELLED") {
      return <AlertCircle className="w-4 h-4 text-rose-600" />;
    }
    return <CheckCircle2 className="w-4 h-4 text-teal-600" />;
  };

  const getTimelineBadgeClass = (action: string) => {
    if (action.startsWith("PAYMENT_")) {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
    if (action.startsWith("KPR_")) {
      return "bg-indigo-50 text-indigo-800 border-indigo-200";
    }
    if (action.startsWith("DOC_") || action.startsWith("BAST_ITEM_")) {
      return "bg-amber-50 text-amber-800 border-amber-200";
    }
    if (action === "TRANSAKSI_CANCELLED") {
      return "bg-rose-50 text-rose-800 border-rose-200";
    }
    return "bg-teal-50 text-teal-800 border-teal-200";
  };

  const renderDiffSnippet = (log: ActivityLogFeedItem) => {
    const beforeObj =
      typeof log.before === "object" && log.before !== null
        ? (log.before as Record<string, unknown>)
        : null;
    const afterObj =
      typeof log.after === "object" && log.after !== null
        ? (log.after as Record<string, unknown>)
        : null;

    if (!beforeObj && !afterObj) return null;

    // Tahap transition diff snippet
    if (Boolean(beforeObj?.tahap_detail) || Boolean(afterObj?.tahap_detail)) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-mono mt-1.5 text-zinc-600">
          {Boolean(beforeObj?.tahap_detail) && (
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
              {String(beforeObj?.tahap_detail)}
            </span>
          )}
          {Boolean(beforeObj?.tahap_detail) && Boolean(afterObj?.tahap_detail) && (
            <ArrowRight className="w-3 h-3 text-zinc-400" />
          )}
          {Boolean(afterObj?.tahap_detail) && (
            <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold border border-teal-200">
              {String(afterObj?.tahap_detail)}
            </span>
          )}
        </div>
      );
    }

    // KPR Status diff snippet
    if (Boolean(beforeObj?.status) || Boolean(afterObj?.status)) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-mono mt-1.5 text-zinc-600">
          {Boolean(beforeObj?.status) && (
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
              {String(beforeObj?.status)}
            </span>
          )}
          {Boolean(beforeObj?.status) && Boolean(afterObj?.status) && (
            <ArrowRight className="w-3 h-3 text-zinc-400" />
          )}
          {Boolean(afterObj?.status) && (
            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 font-semibold border border-indigo-200">
              {String(afterObj?.status)}
            </span>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-zinc-200 shadow-2xs overflow-hidden">
      {/* Header Bar */}
      <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-teal-700" />
          <div>
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              Riwayat Aktivitas &amp; Audit Trail
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Jejak kronologis permanen setiap mutasi berkas, perubahan tahap, pembayaran, dan keputusan bank.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium text-zinc-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-zinc-400" />
            Filter:
          </span>
          {(
            [
              { key: "SEMUA", label: "Semua" },
              { key: "TAHAP", label: "Tahap & Status" },
              { key: "PEMBAYARAN", label: "Pembayaran" },
              { key: "KPR", label: "KPR" },
              { key: "DOKUMEN", label: "Dokumen" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                filter === tab.key
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Body */}
      <div className="p-5">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-zinc-400">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-medium text-zinc-600">
              Belum ada riwayat aktivitas yang tercatat untuk filter ini.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
            {filteredLogs.map((log) => {
              const todayRelative = relativeTimeTodayWIB(log.created_at);

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Node Icon */}
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border border-zinc-300 flex items-center justify-center shadow-xs">
                    {getTimelineIcon(log.action)}
                  </div>

                  {/* Content Card */}
                  <div className="p-3.5 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 transition-colors shadow-2xs space-y-2">
                    {/* Top Row: Timestamp & Actor */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-zinc-700 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          {formatTimestampWIB(log.created_at)}
                        </span>
                        {todayRelative && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-medium">
                            {todayRelative}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded border ${getTimelineBadgeClass(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {log.is_backfill && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono">
                            <Database className="w-2.5 h-2.5" />
                            Backfill
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedActivity(log);
                            setIsSheetOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 px-2 py-0.5 rounded hover:bg-zinc-100 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Detail
                        </button>
                      </div>
                    </div>

                    {/* Summary Narration */}
                    <p className="text-xs font-medium text-zinc-900 leading-relaxed">
                      {log.summary}
                    </p>

                    {/* Diff Snippet if any */}
                    {renderDiffSnippet(log)}

                    {/* Actor Footer */}
                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-zinc-400" />
                        <span className="font-semibold text-zinc-800">
                          {log.actor?.nama || "Sistem"}
                        </span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-zinc-100 text-zinc-600 font-mono">
                          {log.actor?.role || "SYSTEM"}
                        </span>
                      </div>

                      {log.tahap_detail && (
                        <span className="font-mono text-[10px] text-zinc-400">
                          Tahap: {log.tahap_detail}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

