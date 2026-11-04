// components/shared/activity-detail-sheet.tsx
"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ActivityLogFeedItem } from "@/actions/activity";
import { formatTimestampWIB, relativeTimeTodayWIB } from "@/lib/date/wib";
import {
  Activity,
  User,
  Clock,
  Layers,
  ArrowRight,
  Database,
  FileText,
  Building,
  CheckCircle2,
} from "lucide-react";

interface ActivityDetailSheetProps {
  activity: ActivityLogFeedItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityDetailSheet({
  activity,
  isOpen,
  onClose,
}: ActivityDetailSheetProps) {
  if (!activity) return null;

  const todayRelative = relativeTimeTodayWIB(activity.created_at);

  const renderJsonValue = (val: unknown): string => {
    if (val === null || val === undefined) return "null";
    if (typeof val === "boolean") return val ? "true" : "false";
    if (typeof val === "number" || typeof val === "string") return String(val);
    return JSON.stringify(val);
  };

  const getChangedKeys = (
    beforeObj: Record<string, unknown>,
    afterObj: Record<string, unknown>
  ): string[] => {
    const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
    return Array.from(keys);
  };

  const isPlainObject = (
    val: unknown
  ): val is Record<string, unknown> => {
    return typeof val === "object" && val !== null && !Array.isArray(val);
  };

  const beforeIsObj = isPlainObject(activity.before);
  const afterIsObj = isPlainObject(activity.after);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-zinc-100 text-zinc-700">
              <Activity className="w-4 h-4" />
            </span>
            <SheetTitle className="text-base font-semibold">
              Detail Audit Aktivitas
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-zinc-500">
            Log audit permanen (append-only) untuk verifikasi transparansi operasional.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 py-4 text-xs">
          {/* Summary Banner */}
          <div className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50/80 space-y-1.5">
            <span className="text-[11px] font-medium text-zinc-400 block uppercase tracking-wider">
              Ringkasan Narasi
            </span>
            <p className="text-sm font-medium text-zinc-900 leading-relaxed">
              {activity.summary}
            </p>
          </div>

          {/* Meta Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg border border-zinc-200 bg-white">
            {/* Actor */}
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                <User className="w-3 h-3 text-zinc-400" />
                Personel Pelaksana
              </span>
              <p className="font-semibold text-zinc-900">
                {activity.actor?.nama || "Sistem"}
              </p>
              <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono">
                {activity.actor?.role || "SYSTEM"}
              </span>
            </div>

            {/* Timestamp */}
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-400" />
                Waktu Transaksi (WIB)
              </span>
              <p className="font-mono text-zinc-800">
                {formatTimestampWIB(activity.created_at)}
              </p>
              {todayRelative && (
                <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                  {todayRelative}
                </span>
              )}
            </div>

            {/* Entity */}
            <div className="space-y-1 pt-2 border-t border-zinc-100">
              <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-zinc-400" />
                Entitas &amp; ID
              </span>
              <p className="font-medium text-zinc-800">
                {activity.entity_type} #{activity.entity_id}
              </p>
              <span className="text-[11px] font-mono text-zinc-500 block truncate">
                {activity.action}
              </span>
            </div>

            {/* Stage / Unit */}
            <div className="space-y-1 pt-2 border-t border-zinc-100">
              <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                <Building className="w-3 h-3 text-zinc-400" />
                Konteks Transaksi
              </span>
              <p className="font-medium text-zinc-800">
                {activity.transaksi?.unit?.blok
                  ? `Unit Blok ${activity.transaksi.unit.blok}`
                  : activity.lead?.nama
                  ? `Lead: ${activity.lead.nama}`
                  : "—"}
              </p>
              {activity.tahap_detail && (
                <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono">
                  {activity.tahap_detail}
                </span>
              )}
            </div>
          </div>

          {/* Backfill badge */}
          {activity.is_backfill && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 text-xs">
              <Database className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Catatan ini merupakan hasil migrasi/backfill dari riwayat data terdahulu.
              </span>
            </div>
          )}

          {/* Before & After Diff Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <h4 className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                Perubahan Data (Before / After)
              </h4>
            </div>

            {beforeIsObj && afterIsObj ? (
              <div className="space-y-2">
                {getChangedKeys(
                  activity.before as Record<string, unknown>,
                  activity.after as Record<string, unknown>
                ).map((key) => {
                  const bVal = (activity.before as Record<string, unknown>)[key];
                  const aVal = (activity.after as Record<string, unknown>)[key];
                  const isChanged = bVal !== aVal;

                  return (
                    <div
                      key={key}
                      className="p-2.5 rounded-md border border-zinc-200 bg-zinc-50/50 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-semibold text-zinc-700">
                          {key}
                        </span>
                        {isChanged ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                            Diperbarui
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400">Sama</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-1.5 rounded bg-white border border-zinc-100">
                          <span className="text-[10px] text-zinc-400 block mb-0.5">
                            Sebelum:
                          </span>
                          <span className="font-mono text-rose-700 break-all">
                            {renderJsonValue(bVal)}
                          </span>
                        </div>
                        <div className="p-1.5 rounded bg-white border border-zinc-100">
                          <span className="text-[10px] text-zinc-400 block mb-0.5">
                            Sesudah:
                          </span>
                          <span className="font-mono text-emerald-700 font-medium break-all">
                            {renderJsonValue(aVal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50">
                  <span className="text-[11px] font-semibold text-zinc-500 block mb-1">
                    Before:
                  </span>
                  <pre className="font-mono text-[11px] text-zinc-700 overflow-x-auto whitespace-pre-wrap">
                    {renderJsonValue(activity.before)}
                  </pre>
                </div>
                <div className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50">
                  <span className="text-[11px] font-semibold text-zinc-500 block mb-1">
                    After:
                  </span>
                  <pre className="font-mono text-[11px] text-zinc-700 overflow-x-auto whitespace-pre-wrap">
                    {renderJsonValue(activity.after)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

