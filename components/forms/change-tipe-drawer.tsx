"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  X,
  Lock,
  ArrowRight,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  PlusCircle,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import {
  SerializedMasterUnit,
  SerializedMasterTipe,
  changeUnitTipe,
} from "@/actions/master-unit.action";
import {
  changeTipeSchema,
  ChangeTipeInput,
} from "@/schemas/master-unit.schema";

interface ChangeTipeDrawerProps {
  unit: SerializedMasterUnit | null;
  tipeList: SerializedMasterTipe[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenCreateTipe?: () => void;
}

export function ChangeTipeDrawer({
  unit,
  tipeList,
  isOpen,
  onClose,
  onSuccess,
  onOpenCreateTipe,
}: ChangeTipeDrawerProps) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChangeTipeInput>({
    resolver: zodResolver(changeTipeSchema),
    defaultValues: {
      newTipeId: 0,
      alasan: "",
      resetHargaKhusus: false,
    },
  });

  const selectedNewTipeId = watch("newTipeId");
  const resetHargaKhususWatched = watch("resetHargaKhusus");

  // Filter ONLY compatible tipe: same kategori AND same luas_tanah, excluding current tipe_id
  const compatibleTipeList = useMemo(() => {
    if (!unit) return [];
    return tipeList.filter(
      (t) =>
        t.id !== unit.tipe_id &&
        t.kategori === unit.tipe.kategori &&
        t.luas_tanah === unit.tipe.luas_tanah
    );
  }, [unit, tipeList]);

  // Selected new tipe object
  const newTipeObject = useMemo(() => {
    const id = Number(selectedNewTipeId);
    return compatibleTipeList.find((t) => t.id === id) || null;
  }, [compatibleTipeList, selectedNewTipeId]);

  React.useEffect(() => {
    if (unit) {
      reset({
        newTipeId: compatibleTipeList[0]?.id || 0,
        alasan: "",
        resetHargaKhusus: false,
      });
    }
  }, [unit, compatibleTipeList, reset, isOpen]);

  if (!isOpen || !unit) return null;

  const isAvailable = unit.status_unit === "AVAILABLE" && !unit.isLocked;

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);

  const onSubmit = (data: ChangeTipeInput) => {
    if (!isAvailable) {
      toast.error(
        `Unit blok ${unit.blok} berstatus '${unit.status_unit}' dan tidak dapat diubah tipenya.`
      );
      return;
    }

    startTransition(async () => {
      try {
        const res = await changeUnitTipe({
          unitId: unit.id,
          newTipeId: Number(data.newTipeId),
          alasan: data.alasan,
          resetHargaKhusus: Boolean(data.resetHargaKhusus),
        });

        if (res.success) {
          toast.success(res.message);
          onSuccess();
          onClose();
        } else {
          toast.error(res.message);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal mengubah tipe unit";
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
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col border-l border-mist animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mist bg-bone/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-carbon-ink tracking-tight font-heading">
                Ganti Tipe Unit Blok {unit.blok}
              </h2>
              <p className="text-xs text-slate">
                Ganti ke tipe lain yang kompatibel (kategori &amp; luas tanah sama)
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

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status Alert if NOT AVAILABLE */}
          {!isAvailable && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <strong className="block font-semibold">Tipe Tidak Dapat Diubah</strong>
                <p className="text-[11px] mt-0.5">
                  Unit ini sedang berstatus <strong>{unit.status_unit}</strong> atau sedang dalam
                  proses transaksi/ITJ aktif. Hanya unit AVAILABLE yang dapat diganti tipenya.
                </p>
              </div>
            </div>
          )}

          {/* Locked Siteplan Specifications (Read-Only) */}
          <div className="bg-bone/40 rounded-lg border border-mist p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-graphite border-b border-mist pb-2">
              <span className="flex items-center gap-1.5 text-slate uppercase tracking-wider text-[10px]">
                <Lock className="w-3.5 h-3.5 text-steel" />
                <span>Spesifikasi Siteplan (Terkunci)</span>
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                Legalitas Tetap
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate text-[11px] block">Nama Blok</span>
                <span className="font-mono font-bold text-sm text-carbon-ink">
                  {unit.blok}
                </span>
              </div>
              <div>
                <span className="text-slate text-[11px] block">Kategori</span>
                <span className="font-semibold text-carbon-ink">
                  {unit.tipe.kategori}
                </span>
              </div>
              <div>
                <span className="text-slate text-[11px] block">Luas Tanah (LT)</span>
                <span className="font-mono font-semibold text-carbon-ink">
                  {unit.tipe.luas_tanah} m²
                </span>
              </div>
              <div>
                <span className="text-slate text-[11px] block">Tipe Saat Ini</span>
                <span className="font-mono font-semibold text-deep-teal">
                  {unit.tipe.nama_tipe}
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form id="change-tipe-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipe Baru Dropdown */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-graphite">
                  Pilih Tipe Baru <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate">
                  {compatibleTipeList.length} tipe kompatibel
                </span>
              </div>

              {compatibleTipeList.length === 0 ? (
                <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-800 space-y-2">
                  <p className="font-medium">
                    Belum ada tipe lain dengan Kategori <strong>{unit.tipe.kategori}</strong> dan Luas Tanah <strong>{unit.tipe.luas_tanah} m²</strong>.
                  </p>
                  {onOpenCreateTipe && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCreateTipe();
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-amber-300 text-amber-900 font-semibold hover:bg-amber-100/50 transition-colors shadow-2xs"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-amber-700" />
                      <span>Buat Tipe Baru ({unit.tipe.kategori}-{unit.tipe.luas_tanah}m²)</span>
                    </button>
                  )}
                </div>
              ) : (
                <select
                  disabled={!isAvailable}
                  {...register("newTipeId", { valueAsNumber: true })}
                  className="w-full px-3 py-2 text-xs rounded-md border border-mist bg-white font-medium text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal disabled:bg-bone disabled:cursor-not-allowed"
                >
                  <option value={0}>-- Pilih Tipe Kompatibel --</option>
                  {compatibleTipeList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama_tipe} (LB: {t.luas_bangunan}m², LT: {t.luas_tanah}m²) — {formatPrice(t.harga_dasar)}
                    </option>
                  ))}
                </select>
              )}
              {errors.newTipeId && (
                <p className="text-xs text-rose-500 mt-1">{errors.newTipeId.message}</p>
              )}
            </div>

            {/* Change Preview Box */}
            {newTipeObject && (
              <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/50 space-y-2.5">
                <span className="text-[10px] font-semibold text-deep-teal uppercase tracking-wider block">
                  Perbandingan Perubahan
                </span>

                {/* Tipe name comparison */}
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="text-slate">
                    <span className="text-[10px] text-fog block">Tipe Lama</span>
                    <span className="font-semibold text-graphite">{unit.tipe.nama_tipe}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-prism-teal shrink-0 mx-2" />
                  <div className="text-right">
                    <span className="text-[10px] text-fog block">Tipe Baru</span>
                    <span className="font-bold text-deep-teal">{newTipeObject.nama_tipe}</span>
                  </div>
                </div>

                {/* Harga dasar comparison */}
                <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-teal-100">
                  <div className="text-slate">
                    <span className="text-[10px] text-fog block">Harga Dasar Lama</span>
                    <span>{formatPrice(unit.tipe.harga_dasar)}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-prism-teal shrink-0 mx-2" />
                  <div className="text-right">
                    <span className="text-[10px] text-fog block">Harga Dasar Baru</span>
                    <span className="font-bold text-deep-teal">
                      {formatPrice(newTipeObject.harga_dasar)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Harga Khusus Warning & Reset Checkbox */}
            {unit.harga_khusus !== null && unit.harga_khusus !== undefined && (
              <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 space-y-2">
                <div className="flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Unit Memiliki Harga Khusus</span>
                    <span className="text-[11px] text-amber-800">
                      Harga khusus saat ini: <strong className="font-mono">{formatPrice(unit.harga_khusus)}</strong>
                    </span>
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 text-xs font-medium text-graphite cursor-pointer">
                  <input
                    type="checkbox"
                    {...register("resetHargaKhusus")}
                    className="w-4 h-4 rounded text-prism-teal focus:ring-prism-teal border-mist cursor-pointer"
                  />
                  <span>Reset harga khusus ke harga dasar tipe baru</span>
                </label>
              </div>
            )}

            {/* Alasan Perubahan */}
            <div>
              <label className="block text-xs font-semibold text-graphite mb-1.5">
                Alasan Perubahan Tipe <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                disabled={!isAvailable}
                placeholder="Contoh: Permintaan pembeli upgrade luas bangunan, revisi rencana marketing..."
                {...register("alasan")}
                className="w-full px-3 py-2 text-xs rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal disabled:bg-bone transition-all"
              />
              {errors.alasan && (
                <p className="text-xs text-rose-500 mt-1">{errors.alasan.message}</p>
              )}
              <p className="text-[11px] text-slate mt-1">
                Setiap perubahan tipe akan tercatat dalam log audit resmi unit ini.
              </p>
            </div>
          </form>
        </div>

        {/* Drawer Footer Buttons */}
        <div className="p-4 border-t border-mist bg-bone/30 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            form="change-tipe-form"
            disabled={isPending || !isAvailable || compatibleTipeList.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Simpan Perubahan Tipe</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
