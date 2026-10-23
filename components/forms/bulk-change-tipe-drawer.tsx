"use client";

import React, { useState, useTransition, useMemo, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { changeUnitTipeBulk } from "@/actions/master-unit.action";
import type {
  SerializedMasterUnit,
  SerializedMasterTipe,
  BulkChangeTipeResult,
} from "@/actions/master-unit.action";
import {
  changeTipeBulkSchema,
  ChangeTipeBulkInput,
} from "@/schemas/master-unit.schema";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

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

  const baseId = useId();
  const tipeSelectId = `${baseId}-tipe`;
  const alasanId = `${baseId}-alasan`;
  const resetHargaId = `${baseId}-reset-harga`;

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
      resetHargaKhusus: false,
    },
  });

  const selectedNewTipeId = watch("newTipeId");

  React.useEffect(() => {
    if (isOpen) {
      reset({
        unitIds: selectedUnits.map((u) => u.id),
        newTipeId: 0,
        alasan: "",
        resetHargaKhusus: false,
      });
      setBulkResult(null);
    }
  }, [isOpen, selectedUnits, reset]);

  const targetTipe = useMemo(() => {
    const id = Number(selectedNewTipeId);
    return tipeList.find((t) => t.id === id) || null;
  }, [tipeList, selectedNewTipeId]);

  // Compatibility analysis for selected units against targetTipe
  const { compatibleCount, skippedCount, hasSpecialPriceUnits } = useMemo(() => {
    if (!targetTipe) {
      return {
        compatibleCount: 0,
        skippedCount: 0,
        hasSpecialPriceUnits: selectedUnits.some((u) => u.harga_khusus !== null && u.harga_khusus !== undefined),
      };
    }

    let comp = 0;
    let skip = 0;
    let special = false;

    for (const unit of selectedUnits) {
      if (unit.harga_khusus !== null && unit.harga_khusus !== undefined) {
        special = true;
      }
      if (
        unit.status_unit === "AVAILABLE" &&
        !unit.isLocked &&
        unit.tipe.kategori === targetTipe.kategori &&
        unit.tipe.luas_tanah === targetTipe.luas_tanah &&
        unit.tipe_id !== targetTipe.id
      ) {
        comp++;
      } else {
        skip++;
      }
    }

    return {
      compatibleCount: comp,
      skippedCount: skip,
      hasSpecialPriceUnits: special,
    };
  }, [selectedUnits, targetTipe]);

  if (!isOpen || selectedUnits.length === 0) return null;

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);

  const onSubmit = (data: ChangeTipeBulkInput) => {
    if (!data.newTipeId || Number(data.newTipeId) === 0) {
      toast.error("Silakan pilih tipe tujuan.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await changeUnitTipeBulk({
          unitIds: selectedUnits.map((u) => u.id),
          newTipeId: Number(data.newTipeId),
          alasan: data.alasan,
          resetHargaKhusus: Boolean(data.resetHargaKhusus),
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
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="p-0 gap-0 max-w-lg flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-mist bg-bone/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-carbon-ink tracking-tight font-heading">
                Ganti Tipe Massal ({selectedUnits.length} Unit)
              </SheetTitle>
              <SheetDescription className="text-xs text-slate">
                Ubah tipe secara bersamaan untuk beberapa unit terpilih
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Selected units preview pills */}
          <div className="p-3.5 rounded-lg border border-mist bg-bone/30 space-y-2">
            <span className="text-[10px] font-semibold text-slate uppercase tracking-wider block">
              Unit Terpilih ({selectedUnits.length} unit):
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

          {/* Form */}
          {!bulkResult ? (
            <form id="bulk-change-tipe-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor={tipeSelectId} className="block text-xs font-semibold text-graphite mb-1.5">
                  Pilih Tipe Tujuan <span className="text-rose-500">*</span>
                </label>
                <select
                  id={tipeSelectId}
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

              {/* Compatibility Breakdown Preview */}
              {targetTipe && (
                <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-deep-teal">
                    <span>Pratinjau Kesesuaian Tipe:</span>
                    <span className="font-mono text-[11px]">{targetTipe.nama_tipe}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                      <span className="block font-bold text-sm text-emerald-700">{compatibleCount} Unit</span>
                      <span>Kompatibel &amp; akan diubah</span>
                    </div>
                    <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800">
                      <span className="block font-bold text-sm text-amber-700">{skippedCount} Unit</span>
                      <span>Akan dilewati (tidak cocok)</span>
                    </div>
                  </div>
                  {skippedCount > 0 && (
                    <p className="text-[10px] text-amber-900 mt-1">
                      * Unit dilewati jika kategori/LT berbeda, status bukan AVAILABLE, atau sudah bertipe ini.
                    </p>
                  )}
                </div>
              )}

              {/* Reset Harga Khusus */}
              {hasSpecialPriceUnits && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70">
                  <label htmlFor={resetHargaId} className="flex items-center gap-2 text-xs font-medium text-graphite cursor-pointer">
                    <input
                      id={resetHargaId}
                      type="checkbox"
                      {...register("resetHargaKhusus")}
                      className="w-4 h-4 rounded text-prism-teal focus:ring-prism-teal border-mist cursor-pointer"
                    />
                    <span>Reset harga khusus pada unit yang berubah ke harga dasar tipe baru</span>
                  </label>
                </div>
              )}

              <div>
                <label htmlFor={alasanId} className="block text-xs font-semibold text-graphite mb-1.5">
                  Alasan Perubahan Massal <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id={alasanId}
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
              disabled={isPending || !targetTipe || compatibleCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Terapkan Perubahan ({compatibleCount} Unit)</span>
              )}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
