"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Info,
  Loader2,
  Lock,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { verifyDokumenTransaksi } from "@/actions/transaksi.action";
import {
  type DocumentRuleItem,
  summarizeDocuments,
} from "@/lib/transaksi/document-rules";
import { todayWIB } from "@/lib/date/wib";
import type { JenisDokumen } from "@/generated/prisma";

export interface DokumenInfoItem {
  jenis: string;
  diterima_at: string | null;
}

export interface DocumentChecklistProps {
  transaksiId: number;
  documents: DocumentRuleItem[];
  verifiedKeys: string[];
  dokumenInfo?: DokumenInfoItem[];
  canEdit?: boolean;
  isReadOnlyState?: boolean;
  onDocsChanged?: (verifiedKeys: string[]) => void;
}

export function DocumentChecklist({
  transaksiId,
  documents,
  verifiedKeys: initialVerifiedKeys,
  dokumenInfo = [],
  canEdit = true,
  isReadOnlyState = false,
  onDocsChanged,
}: DocumentChecklistProps) {
  const router = useRouter();

  // Optimistic verified keys set
  const [verifiedSet, setVerifiedSet] = useState<Set<string>>(
    () => new Set(initialVerifiedKeys)
  );

  // Optimistic date mapping
  const [datesMap, setDatesMap] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    for (const info of dokumenInfo) {
      map[info.jenis] = info.diterima_at;
    }
    return map;
  });

  // Track saving and saved states per document key
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});

  // Filter: ALL vs UNVERIFIED
  const [filter, setFilter] = useState<"ALL" | "UNVERIFIED">("ALL");

  // Descriptions expanded
  const [expandedInfo, setExpandedInfo] = useState<Record<string, boolean>>({});

  // Sync with prop updates if initialVerifiedKeys changes from outside
  useEffect(() => {
    setVerifiedSet(new Set(initialVerifiedKeys));
  }, [initialVerifiedKeys]);

  useEffect(() => {
    const map: Record<string, string | null> = {};
    for (const info of dokumenInfo) {
      map[info.jenis] = info.diterima_at;
    }
    setDatesMap(map);
  }, [dokumenInfo]);

  // Serialized request queue to prevent race conditions during fast tapping
  const requestQueueRef = useRef<Promise<void>>(Promise.resolve());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isInteractive = canEdit && !isReadOnlyState;

  // Grouping documents
  const groupedDocs = useMemo(() => {
    const groups: Record<string, DocumentRuleItem[]> = {};
    for (const doc of documents) {
      const g = doc.group || "Dokumen Lainnya";
      if (!groups[g]) groups[g] = [];
      groups[g].push(doc);
    }
    return groups;
  }, [documents]);

  // Initial open accordions: open if any required item is not verified
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const [groupName, items] of Object.entries(groupedDocs)) {
      const hasMissingRequired = items.some(
        (doc) =>
          doc.required &&
          !initialVerifiedKeys.includes(doc.key)
      );
      init[groupName] = hasMissingRequired;
    }
    return init;
  });

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const toggleInfo = (key: string) => {
    setExpandedInfo((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Debounced router refresh after bursts
  const scheduleDebouncedRefresh = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      router.refresh();
    }, 1200);
  };

  // Perform serialized document toggle
  const handleToggle = (doc: DocumentRuleItem) => {
    if (!isInteractive) return;

    const currentlyChecked = verifiedSet.has(doc.key);
    const nextChecked = !currentlyChecked;

    // 1. Optimistic UI update
    setVerifiedSet((prev) => {
      const next = new Set(prev);
      if (nextChecked) {
        next.add(doc.key);
      } else {
        next.delete(doc.key);
      }
      onDocsChanged?.(Array.from(next));
      return next;
    });

    const targetDate = nextChecked
      ? datesMap[doc.key] || todayWIB()
      : null;

    setDatesMap((prev) => ({
      ...prev,
      [doc.key]: targetDate,
    }));

    setSavingKeys((prev) => ({ ...prev, [doc.key]: true }));

    // 2. Queue server mutation
    requestQueueRef.current = requestQueueRef.current
      .then(async () => {
        const res = await verifyDokumenTransaksi({
          transaksiId,
          jenis: doc.key as JenisDokumen,
          status: nextChecked ? "LENGKAP" : "BELUM_LENGKAP",
          diterimaAt: targetDate,
        });

        if (!res.success) {
          throw new Error(res.error || "Gagal memperbarui checklist dokumen.");
        }

        // On success: show subtle saved indicator
        setSavingKeys((prev) => ({ ...prev, [doc.key]: false }));
        setSavedKeys((prev) => ({ ...prev, [doc.key]: true }));
        setTimeout(() => {
          setSavedKeys((prev) => ({ ...prev, [doc.key]: false }));
        }, 1800);

        scheduleDebouncedRefresh();
      })
      .catch((err: unknown) => {
        // Rollback only this row
        setVerifiedSet((prev) => {
          const next = new Set(prev);
          if (currentlyChecked) {
            next.add(doc.key);
          } else {
            next.delete(doc.key);
          }
          onDocsChanged?.(Array.from(next));
          return next;
        });

        setDatesMap((prev) => ({
          ...prev,
          [doc.key]: currentlyChecked ? prev[doc.key] : null,
        }));

        setSavingKeys((prev) => ({ ...prev, [doc.key]: false }));
        toast.error(
          err instanceof Error
            ? err.message
            : "Gagal menyimpan perubahan dokumen."
        );
      });
  };

  // Handle date change for verified document
  const handleDateChange = (docKey: string, newDate: string) => {
    if (!isInteractive || !verifiedSet.has(docKey)) return;

    const oldDate = datesMap[docKey];
    setDatesMap((prev) => ({ ...prev, [docKey]: newDate }));
    setSavingKeys((prev) => ({ ...prev, [docKey]: true }));

    requestQueueRef.current = requestQueueRef.current
      .then(async () => {
        const res = await verifyDokumenTransaksi({
          transaksiId,
          jenis: docKey as JenisDokumen,
          status: "LENGKAP",
          diterimaAt: newDate || todayWIB(),
        });

        if (!res.success) {
          throw new Error(res.error || "Gagal memperbarui tanggal diterima.");
        }

        setSavingKeys((prev) => ({ ...prev, [docKey]: false }));
        setSavedKeys((prev) => ({ ...prev, [docKey]: true }));
        setTimeout(() => {
          setSavedKeys((prev) => ({ ...prev, [docKey]: false }));
        }, 1800);

        scheduleDebouncedRefresh();
      })
      .catch((err: unknown) => {
        setDatesMap((prev) => ({ ...prev, [docKey]: oldDate }));
        setSavingKeys((prev) => ({ ...prev, [docKey]: false }));
        toast.error(
          err instanceof Error
            ? err.message
            : "Gagal menyimpan tanggal dokumen."
        );
      });
  };

  // Compute live summary
  const currentSummary = useMemo(() => {
    return summarizeDocuments(documents, Array.from(verifiedSet));
  }, [documents, verifiedSet]);

  const today = todayWIB();

  return (
    <div className="space-y-4">
      {/* ─── Top Counters & Filters Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-lg bg-bone/40 border border-mist">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="font-semibold text-carbon-ink">
            Wajib Pengajuan:{" "}
            <strong
              className={`font-mono font-bold ${
                currentSummary.pengajuan.done === currentSummary.pengajuan.total
                  ? "text-emerald-700"
                  : "text-rose-600"
              }`}
            >
              {currentSummary.pengajuan.done}/{currentSummary.pengajuan.total}
            </strong>
          </span>
          <span className="text-mist">•</span>
          <span className="text-slate font-medium">
            Sebelum Akad:{" "}
            <strong
              className={`font-mono font-bold ${
                currentSummary.akad.done === currentSummary.akad.total
                  ? "text-emerald-700"
                  : "text-amber-600"
              }`}
            >
              {currentSummary.akad.done}/{currentSummary.akad.total}
            </strong>
          </span>
          {currentSummary.opsional.total > 0 && (
            <>
              <span className="text-mist">•</span>
              <span className="text-slate">
                Opsional:{" "}
                <strong className="font-mono text-slate font-semibold">
                  {currentSummary.opsional.done}/{currentSummary.opsional.total}
                </strong>
              </span>
            </>
          )}
        </div>

        {/* Filter chips (Order remains stable!) */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer select-none ${
              filter === "ALL"
                ? "bg-carbon-ink text-white shadow-2xs"
                : "bg-white text-slate hover:text-carbon-ink border border-mist"
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setFilter("UNVERIFIED")}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer select-none ${
              filter === "UNVERIFIED"
                ? "bg-carbon-ink text-white shadow-2xs"
                : "bg-white text-slate hover:text-carbon-ink border border-mist"
            }`}
          >
            Belum Lengkap
          </button>
        </div>
      </div>

      {/* Read-only notification if applicable */}
      {!isInteractive && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-bone text-slate text-xs border border-mist">
          <Lock className="w-3.5 h-3.5 text-steel shrink-0" />
          <span>
            {isReadOnlyState
              ? "Checklist dokumen terkunci (transaksi telah selesai / dibatalkan)."
              : "Mode hanya baca: Anda tidak memiliki hak edit checklist dokumen."}
          </span>
        </div>
      )}

      {/* ─── Group Accordions ─── */}
      <div className="space-y-3">
        {Object.entries(groupedDocs).map(([groupName, items]) => {
          // Count in this group
          const totalInGroup = items.length;
          const doneInGroup = items.filter((d) =>
            verifiedSet.has(d.key)
          ).length;
          const isGroupComplete = totalInGroup > 0 && doneInGroup === totalInGroup;

          // Apply filter without altering row order
          const visibleItems = items.filter((d) => {
            if (filter === "UNVERIFIED") {
              return !verifiedSet.has(d.key);
            }
            return true;
          });

          if (visibleItems.length === 0 && filter === "UNVERIFIED") {
            return null;
          }

          const isOpen = Boolean(openGroups[groupName]);

          return (
            <div
              key={groupName}
              className="rounded-lg border border-mist bg-white shadow-2xs overflow-hidden"
            >
              {/* Group Header Button */}
              <button
                type="button"
                onClick={() => toggleGroup(groupName)}
                aria-expanded={isOpen}
                className="w-full px-4 py-3 bg-bone/30 hover:bg-bone/60 transition-colors flex items-center justify-between text-left cursor-pointer select-none min-h-[46px]"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="font-bold text-xs sm:text-sm text-carbon-ink tracking-tight truncate">
                    {groupName}
                  </span>
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                      isGroupComplete
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-bone text-slate border-mist"
                    }`}
                  >
                    {isGroupComplete ? (
                      <span className="inline-flex items-center gap-1">
                        {doneInGroup}/{totalInGroup} ✓
                      </span>
                    ) : (
                      `${doneInGroup}/${totalInGroup}`
                    )}
                  </span>
                </div>

                <div
                  className={`p-1 rounded text-slate transition-transform duration-200 ${
                    isOpen ? "rotate-180" : "rotate-0"
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {/* Group Items List */}
              {isOpen && (
                <div className="divide-y divide-mist/70 border-t border-mist/70">
                  {visibleItems.map((doc) => {
                    const isChecked = verifiedSet.has(doc.key);
                    const isSaving = Boolean(savingKeys[doc.key]);
                    const isSaved = Boolean(savedKeys[doc.key]);
                    const showDesc = Boolean(expandedInfo[doc.key]);
                    const docDate = datesMap[doc.key] || today;

                    return (
                      <div
                        key={doc.key}
                        className={`p-3 sm:px-4 transition-colors min-h-[50px] flex flex-col justify-center ${
                          isChecked ? "bg-teal-50/20" : "hover:bg-bone/20"
                        }`}
                      >
                        <div className="flex items-start sm:items-center justify-between gap-3">
                          {/* Left: Checkbox + Label */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <label
                              className={`relative flex items-center justify-center w-5 h-5 rounded border mt-0.5 sm:mt-0 shrink-0 transition-all ${
                                isInteractive
                                  ? "cursor-pointer"
                                  : "cursor-not-allowed opacity-60"
                              } ${
                                isChecked
                                  ? "bg-deep-teal border-deep-teal text-white shadow-2xs"
                                  : "bg-white border-mist hover:border-slate"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!isInteractive || isSaving}
                                onChange={() => handleToggle(doc)}
                                className="sr-only"
                              />
                              {isChecked && (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                            </label>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  onClick={() => isInteractive && handleToggle(doc)}
                                  className={`text-xs font-medium leading-snug cursor-pointer select-none ${
                                    isChecked
                                      ? "text-carbon-ink font-semibold"
                                      : "text-graphite"
                                  }`}
                                >
                                  {doc.label}
                                </span>

                                {/* Gate / Status Badges */}
                                {isChecked ? (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Lengkap
                                  </span>
                                ) : doc.gate === "PENGAJUAN" ? (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                    Wajib Pengajuan
                                  </span>
                                ) : doc.gate === "AKAD" ? (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    Menyusul sblm Akad
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-bone text-slate border border-mist">
                                    Opsional
                                  </span>
                                )}

                                {/* Description info button */}
                                {doc.description && (
                                  <button
                                    type="button"
                                    onClick={() => toggleInfo(doc.key)}
                                    aria-label="Info keterangan dokumen"
                                    className="p-0.5 rounded text-slate hover:text-deep-teal transition-colors"
                                  >
                                    <Info className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Date Input when Lengkap + Saving Indicator */}
                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto pt-0.5 sm:pt-0">
                            {/* Saving / Saved subtle status */}
                            {isSaving && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate">
                                <Loader2 className="w-3 h-3 animate-spin text-deep-teal" />
                                <span className="hidden sm:inline">Menyimpan...</span>
                              </span>
                            )}
                            {isSaved && !isSaving && (
                              <span className="text-[11px] font-medium text-emerald-600 animate-in fade-in duration-200">
                                Tersimpan
                              </span>
                            )}

                            {/* Received Date Picker when LENGKAP */}
                            {isChecked && (
                              <div className="flex items-center gap-1 bg-bone/60 border border-mist rounded px-1.5 py-0.5">
                                <Calendar className="w-3 h-3 text-slate shrink-0" />
                                <input
                                  type="date"
                                  max={today}
                                  value={docDate}
                                  disabled={!isInteractive || isSaving}
                                  onChange={(e) =>
                                    handleDateChange(doc.key, e.target.value)
                                  }
                                  className="text-[11px] font-mono bg-transparent text-carbon-ink outline-none cursor-pointer p-0 w-[104px] sm:w-[110px]"
                                  title="Tanggal dokumen diterima fisik"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Description toggle */}
                        {showDesc && doc.description && (
                          <div className="mt-2 text-[11px] text-slate bg-bone/50 p-2 rounded border border-mist/60 animate-in fade-in duration-150">
                            {doc.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

