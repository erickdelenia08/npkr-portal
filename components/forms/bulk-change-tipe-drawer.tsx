"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  X,
  Layers,
  ArrowRight,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  SerializedMasterUnit,
  SerializedMasterTipe,
  changeUnitTipeBulk,
  BulkChangeTipeResult,
} from "@/actions/master-unit.action";
import {
  changeTipeBulkSchema,
  ChangeTipeBulkInput,
} from "@/schemas/master-unit.schema";

interface BulkChangeTipeDrawerProps {
  selectedUnits: SerializedMasterUnit[];
  tipeList: SerializedMasterTipe[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkChangeTipeDrawer({
  selectedUnits,
  tipeList,
  isOpen,
  onClose,
  onSuccess,
}: BulkChangeTipeDrawerProps) {
  const [isPending, startTransition] = useTransition();
  const [bulkResult, setBulkResult] = useState<BulkChangeTipeResult | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChangeTipeBulkInput>({
    resolver: zodResolver(changeTipeBulkSchema),
    defaultValues: {
      unitIds: selectedUnits.map((u) => u.id),
      newTipeId: 0,
      alasan: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        unitIds: selectedUnits.map((u) => u.id),
        newTipeId: 0,
        alasan: "",
      });
      setBulkResult(null);
    }
  }, [isOpen, selectedUnits, reset]);

  if (!isOpen || selectedUnits.length === 0) return null;

  // Find dominant kategori and luas_tanah if homogenous
  const firstUnit = selectedUnits[0];
  const isHomogeneous = selectedUnits.every(
    (u) =>
      u.tipe.kategori === firstUnit.tipe.kategori &&
      u.tipe.luas_tanah === firstUnit.tipe.luas_tanah
  );

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);

  const onSubmit = (data: ChangeTipeBulkInput) => {
    startTransition(async () => {
      try {
        const res = await changeUnitTipeBulk({
          unitIds: selectedUnits.map((u) => u.id),
          newTipeId: Number(data.newTipeId),
          alasan: data.alasan,
        });

        if (res.success && res.data) {
          setBulkResult(res.data);
          toast.success(res.message);
          onSuccess();
        } else {
          toast.error(res.message);
          if (res.data) setBulkResult(res.data);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal memproses bulk ganti tipe";
        toast.error(msg);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col border-l border-mist animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mist bg-bone/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-carbon-ink tracking-tight font-heading">
                Ganti Tipe Massal ({selectedUnits.length} Unit)
              </h2>
              <p className="text-xs text-slate">
                Ubah tipe secara bersamaan untuk beberapa unit terpilih
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate hover:text-graphite hover:bg-bone transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Selected units preview pills */}
          <div className="p-3.5 rounded-lg border border-mist bg-bone/30 space-y-2">
            <span className="text-[10px] font-semibold text-slate uppercase tracking-wider block">
              Unit Terpilih:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {selectedUnits.map((u) => (
                <span
                  key={u.id}
                  className="px-2 py-0.5 rounded bg-white border border-mist text-xs font-mono font-bold text-carbon-ink shadow-2xs"
                >
                  {u.blok}
                </span>
              ))}
            </div>
          </div>

          {!isHomogeneous && (
            <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                Unit yang dipilih memiliki variasi kategori atau luas tanah yang berbeda.
                Sistem akan memvalidasi kesesuaian per unit dan melewati unit yang tidak kompatibel.
              </span>
            </div>
          )}

          {/* Form */}
          {!bulkResult ? (
            <form id="bulk-change-tipe-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-graphite mb-1.5">
                  Pilih Tipe Tujuan <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register("newTipeId", { valueAsNumber: true })}
                  className="w-full px-3 py-2 text-xs rounded-md border border-mist bg-white font-medium text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
                >
                  <option value={0}>-- Pilih Tipe Tujuan --</option>
                  {tipeList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama_tipe} ({t.kategori}, LT: {t.luas_tanah}m²) — {formatPrice(t.harga_dasar)}
                    </option>
                  ))}
                </select>
                {errors.newTipeId && (
                  <p className="text-xs text-rose-500 mt-1">{errors.newTipeId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-graphite mb-1.5">
                  Alasan Perubahan Massal <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Penyesuaian siteplan blok, perubahan izin rancang bangun..."
                  {...register("alasan")}
                  className="w-full px-3 py-2 text-xs rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
                />
                {errors.alasan && (
                  <p className="text-xs text-rose-500 mt-1">{errors.alasan.message}</p>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Proses Selesai</span>
                </div>
                <p>
                  Berhasil mengubah <strong>{bulkResult.berhasil}</strong> unit.
                </p>
              </div>

              {bulkResult.dilewati.length > 0 && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-2">
                  <span className="font-semibold text-amber-900 block">
                    {bulkResult.dilewati.length} Unit Dilewati (Tidak Diubah):
                  </span>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {bulkResult.dilewati.map((d, idx) => (
                      <div key={idx} className="flex items-baseline justify-between text-[11px] border-b border-amber-200/50 pb-1">
                        <strong className="font-mono text-carbon-ink">{d.blok}</strong>
                        <span className="text-amber-800">{d.alasan}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-mist bg-bone/30 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors"
          >
            {bulkResult ? "Tutup" : "Batal"}
          </button>
          {!bulkResult && (
            <button
              type="submit"
              form="bulk-change-tipe-form"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Terapkan Perubahan</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
