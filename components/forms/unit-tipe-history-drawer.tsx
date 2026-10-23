"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  History,
  ArrowRight,
  User,
  Calendar,
  AlertCircle,
  Loader2,
  Tag,
} from "lucide-react";
import { getUnitTipeLogs } from "@/actions/master-unit.action";
import type {
  SerializedMasterUnit,
  SerializedUnitTipeLog,
} from "@/actions/master-unit.action";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface UnitTipeHistoryDrawerProps {
  unit: SerializedMasterUnit | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UnitTipeHistoryDrawer({
  unit,
  isOpen,
  onClose,
}: UnitTipeHistoryDrawerProps) {
  const [logs, setLogs] = useState<SerializedUnitTipeLog[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (unit && isOpen) {
      startTransition(async () => {
        const res = await getUnitTipeLogs(unit.id);
        if (res.success && res.data) {
          setLogs(res.data);
        } else {
          setLogs([]);
        }
      });
    }
  }, [unit, isOpen]);

  if (!unit) return null;

  const formatDate = (iso: string | Date) => {
    try {
      const d = typeof iso === "string" ? new Date(iso) : iso;
      return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
    } catch {
      return String(iso);
    }
  };

  const formatPrice = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="p-0 gap-0 max-w-lg flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-mist bg-bone/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-carbon-ink tracking-tight font-heading">
                Riwayat Perubahan Tipe Blok {unit.blok}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate">
                Catatan riwayat pergantian spesifikasi tipe unit
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isPending ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-prism-teal" />
              <span>Memuat riwayat perubahan...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate">
              <History className="w-8 h-8 mx-auto text-slate/40 mb-2" />
              <p className="font-semibold text-graphite">Belum Ada Riwayat Perubahan</p>
              <p className="text-[11px] mt-0.5">
                Tipe unit ini belum pernah diganti sejak didaftarkan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-lg border border-mist bg-white shadow-2xs space-y-3"
                >
                  {/* Header info */}
                  <div className="flex items-center justify-between text-[11px] text-slate border-b border-mist/70 pb-2">
                    <div className="flex items-center gap-1.5 font-medium text-graphite">
                      <User className="w-3.5 h-3.5 text-prism-teal" />
                      <span>{log.admin.nama}</span>
                      <span className="text-[10px] bg-bone px-1.5 py-0.2 rounded text-slate font-medium">
                        Admin
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate" />
                      <span>{formatDate(log.created_at)}</span>
                    </div>
                  </div>

                  {/* Tipe change badge */}
                  <div className="flex items-center justify-between p-2 rounded-md bg-bone/40 text-xs font-mono">
                    <span className="font-medium text-slate">
                      {log.tipe_lama.nama_tipe}
                    </span>
                    <ArrowRight className="w-4 h-4 text-prism-teal shrink-0 mx-2" />
                    <span className="font-bold text-deep-teal">
                      {log.tipe_baru.nama_tipe}
                    </span>
                  </div>

                  {/* Special price notes */}
                  {log.harga_khusus_lama !== null && (
                    <div className="text-[11px] text-slate flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-amber-600" />
                      <span>
                        Harga khusus lama:{" "}
                        <strong className="font-mono text-carbon-ink">
                          {formatPrice(log.harga_khusus_lama)}
                        </strong>{" "}
                        {log.harga_khusus_direset ? "(direset)" : "(dipertahankan)"}
                      </span>
                    </div>
                  )}

                  {/* Reason */}
                  <div className="text-xs bg-teal-50/40 p-2.5 rounded-md border border-teal-100/60">
                    <span className="text-[10px] font-semibold text-deep-teal uppercase tracking-wider block mb-0.5">
                      Alasan:
                    </span>
                    <p className="text-graphite italic text-[11px] leading-relaxed">
                      &quot;{log.alasan}&quot;
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-mist bg-bone/30 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors"
          >
            Tutup
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
