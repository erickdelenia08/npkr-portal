"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  Loader2,
  Lock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Info,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { updateMasterUnitStatus } from "@/actions/master-unit.action";
import type { SerializedMasterUnit } from "@/actions/master-unit.action";
import type { StatusUnitType } from "@/schemas/master-unit.schema";

interface ChangeUnitStatusModalProps {
  unit: SerializedMasterUnit | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface StatusOptionMeta {
  value: StatusUnitType;
  label: string;
  badgeStyle: string;
  dotColor: string;
  desc: string;
}

const STATUS_OPTIONS: StatusOptionMeta[] = [
  {
    value: "AVAILABLE",
    label: "AVAILABLE",
    badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500",
    desc: "Unit tersedia dan siap dipasarkan. Dapat dipilih untuk pengajuan ITJ oleh marketing.",
  },
  {
    value: "HOLD",
    label: "HOLD",
    badgeStyle: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-500",
    desc: "Unit ditahan sementara oleh manajemen. Tidak dapat dipilih untuk pengajuan ITJ baru.",
  },
  {
    value: "BOOKED",
    label: "BOOKED",
    badgeStyle: "bg-blue-50 text-blue-700 border-blue-200",
    dotColor: "bg-blue-500",
    desc: "Unit ditandai terpesan secara manual untuk keperluan alokasi inventori internal.",
  },
  {
    value: "SOLD",
    label: "SOLD",
    badgeStyle: "bg-purple-50 text-purple-700 border-purple-200",
    dotColor: "bg-purple-500",
    desc: "Unit ditandai terjual secara manual tanpa melalui alur transaksi sistem.",
  },
];

export function ChangeUnitStatusModal({
  unit,
  isOpen,
  onClose,
  onSuccess,
}: ChangeUnitStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<StatusUnitType>("AVAILABLE");
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (unit) {
      setSelectedStatus(unit.status_unit);
      setConfirmed(false);
    }
  }, [unit, isOpen]);

  if (!isOpen || !unit) return null;

  const isLocked = Boolean(unit.isLocked);
  const isSameStatus = selectedStatus === unit.status_unit;
  const isManualSale = selectedStatus === "BOOKED" || selectedStatus === "SOLD";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      toast.error("Unit ini terkunci dan tidak dapat diubah statusnya.");
      return;
    }

    if (isSameStatus) {
      toast.info(`Unit sudah berstatus '${selectedStatus}'.`);
      onClose();
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateMasterUnitStatus({
          unitId: unit.id,
          newStatus: selectedStatus,
        });

        if (res.success) {
          toast.success(res.message);
          onSuccess();
          onClose();
        } else {
          toast.error(res.message || res.error || "Gagal mengubah status unit");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem";
        toast.error(msg);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-carbon-ink/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-status-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-mist overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mist bg-bone/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-deep-teal">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 id="change-status-title" className="text-base font-bold text-carbon-ink">
                Ubah Status Unit
              </h3>
              <p className="text-xs text-slate">
                Blok <strong className="font-mono text-carbon-ink">{unit.blok}</strong> ·{" "}
                {unit.tipe.nama_tipe} ({unit.tipe.kategori})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded-lg text-slate hover:text-carbon-ink hover:bg-bone transition-colors disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Unit Status Overview Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-mist bg-bone/30">
            <div>
              <span className="text-[11px] font-semibold text-slate uppercase tracking-wider block">
                Status Saat Ini
              </span>
              <span className="text-xs text-graphite font-medium mt-0.5 block">
                {unit.blok} terdaftar dengan status:
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                unit.status_unit === "AVAILABLE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : unit.status_unit === "HOLD"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : unit.status_unit === "BOOKED"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-purple-50 text-purple-700 border-purple-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  unit.status_unit === "AVAILABLE"
                    ? "bg-emerald-500"
                    : unit.status_unit === "HOLD"
                      ? "bg-amber-500"
                      : unit.status_unit === "BOOKED"
                        ? "bg-blue-500"
                        : "bg-purple-500"
                }`}
              />
              {unit.status_unit}
            </span>
          </div>

          {/* Locked Alert: If unit has active transaction or binding ITJ */}
          {isLocked ? (
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-950">Unit Terkunci oleh Transaksi Sistem</p>
                  <p className="text-amber-800 leading-relaxed">
                    Unit ini sedang terikat dengan pengajuan ITJ atau proses transaksi yang masih
                    berjalan (atau telah selesai/BAST). Demi integritas data, status unit tidak dapat
                    diubah secara manual.
                  </p>
                  <p className="text-[11px] text-amber-700 font-medium">
                    Untuk mengubah status unit ini, batalkan atau selesaikan transaksi terkait melalui
                    menu Transaksi.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Status Radio Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-graphite block">
                  Pilih Status Baru:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = selectedStatus === opt.value;
                    const isCurrent = unit.status_unit === opt.value;

                    return (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-teal-50/30 border-prism-teal shadow-2xs ring-1 ring-prism-teal/50"
                            : "bg-white border-mist hover:border-slate/40 hover:bg-bone/20"
                        }`}
                      >
                        <input
                          type="radio"
                          name="statusUnit"
                          value={opt.value}
                          checked={isSelected}
                          onChange={() => setSelectedStatus(opt.value)}
                          className="mt-1 w-4 h-4 text-prism-teal focus:ring-prism-teal border-mist"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold border ${opt.badgeStyle}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${opt.dotColor}`} />
                              {opt.label}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-slate font-medium">
                                (Status Saat Ini)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate mt-1 leading-normal">
                            {opt.desc}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Informational Warning for Manual BOOKED / SOLD */}
              {isManualSale && !isSameStatus && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-blue-900 text-xs">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    <strong>Perhatian:</strong> Perubahan manual ke status{" "}
                    <strong>{selectedStatus}</strong> adalah penyesuaian inventori internal dan{" "}
                    <strong>tidak membuat</strong> transaksi, kwitansi, atau data konsumen baru di
                    sistem.
                  </p>
                </div>
              )}

              {/* Confirmation Checkbox */}
              {!isSameStatus && (
                <div className="pt-2 border-t border-mist">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-prism-teal focus:ring-prism-teal border-mist cursor-pointer"
                    />
                    <span className="text-xs text-graphite leading-relaxed select-none">
                      Saya yakin ingin mengubah status unit{" "}
                      <strong className="font-mono text-carbon-ink">{unit.blok}</strong> dari{" "}
                      <strong>{unit.status_unit}</strong> menjadi{" "}
                      <strong className="text-deep-teal">{selectedStatus}</strong>.
                    </span>
                  </label>
                </div>
              )}
            </>
          )}

          {/* Modal Actions Footer */}
          <div className="pt-4 border-t border-mist flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-mist text-slate hover:text-carbon-ink hover:bg-bone transition-colors disabled:opacity-50"
            >
              {isLocked ? "Tutup" : "Batal"}
            </button>

            {!isLocked && (
              <button
                type="submit"
                disabled={isPending || isSameStatus || (!confirmed && !isSameStatus)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-deep-teal text-white hover:bg-deep-teal/90 shadow-2xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
