"use client";

import React, { useState, useTransition } from "react";
import { X, Loader2, Edit3, Lock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  SerializedMasterUnit,
  SerializedMasterTipe,
  updateMasterUnit,
} from "@/actions/master-unit.action";

interface EditMasterUnitModalProps {
  unit: SerializedMasterUnit | null;
  tipeList: SerializedMasterTipe[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditMasterUnitModal({
  unit,
  tipeList,
  isOpen,
  onClose,
  onSuccess,
}: EditMasterUnitModalProps) {
  const [tipeId, setTipeId] = useState<number>(unit?.tipe_id ?? 0);
  const [statusUnit, setStatusUnit] = useState<"AVAILABLE" | "HOLD" | "BOOKED" | "SOLD">(
    unit?.status_unit ?? "AVAILABLE"
  );
  const [hargaKhusus, setHargaKhusus] = useState<string>(
    unit?.harga_khusus !== null && unit?.harga_khusus !== undefined ? String(unit.harga_khusus) : ""
  );
  const [formError, setFormError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  if (!isOpen || !unit) return null;

  const isLocked = Boolean(unit.isLocked);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    startTransition(async () => {
      try {
        const payload: {
          tipe_id: number;
          status_unit?: "AVAILABLE" | "HOLD" | "BOOKED" | "SOLD";
          harga_khusus: number | null;
        } = {
          tipe_id: Number(tipeId),
          harga_khusus: hargaKhusus === "" ? null : Number(hargaKhusus),
        };

        // Only send status_unit if not locked or keeping unchanged
        if (!isLocked) {
          payload.status_unit = statusUnit;
        }

        const res = await updateMasterUnit(unit.id, payload);

        if (res.success) {
          toast.success(res.message);
          onSuccess();
          onClose();
        } else {
          setFormError(res.message);
          toast.error(res.message);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Terjadi kesalahan sistem";
        setFormError(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-white rounded-lg border border-mist shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mist bg-bone/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-carbon-ink text-white flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-prism-teal" />
            </div>
            <div>
              <h2 className="text-base font-bold text-carbon-ink tracking-tight">
                Edit Unit Blok {unit.blok}
              </h2>
              <p className="text-xs text-slate">
                Ubah spesifikasi tipe, harga khusus, atau status unit
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Unit Blok (Read-only identifier) */}
          <div>
            <label className="block text-xs font-semibold text-graphite mb-1.5">
              Nama Blok
            </label>
            <input
              type="text"
              value={unit.blok}
              disabled
              className="w-full px-3 py-2 text-sm font-mono font-bold rounded-md border border-mist bg-bone/60 text-carbon-ink cursor-not-allowed"
            />
          </div>

          {/* Tipe Unit */}
          <div>
            <label className="block text-xs font-semibold text-graphite mb-1.5">
              Tipe Unit <span className="text-rose-500">*</span>
            </label>
            <select
              value={tipeId}
              onChange={(e) => setTipeId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-md border border-mist bg-white focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
            >
              {tipeList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama_tipe} ({t.kategori}) - Rp {t.harga_dasar.toLocaleString("id-ID")}
                </option>
              ))}
            </select>
          </div>

          {/* Status Unit with Smart Lock Rule */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="status_unit_select"
                className="text-xs font-semibold text-graphite flex items-center gap-1.5"
              >
                <span>Status Unit</span>
                {isLocked && <Lock className="w-3.5 h-3.5 text-amber-600" />}
              </label>
              {isLocked && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                  LOCKED
                </span>
              )}
            </div>

            <select
              id="status_unit_select"
              value={statusUnit}
              disabled={isLocked}
              onChange={(e) =>
                setStatusUnit(
                  e.target.value as "AVAILABLE" | "HOLD" | "BOOKED" | "SOLD"
                )
              }
              className={`w-full px-3 py-2 text-sm rounded-md border transition-all ${
                isLocked
                  ? "border-amber-200 bg-amber-50/50 text-slate-600 cursor-not-allowed opacity-90"
                  : "border-mist bg-white text-carbon-ink focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
              }`}
            >
              <option value="AVAILABLE">AVAILABLE (Tersedia)</option>
              <option value="HOLD">HOLD (Ditahan / Pengajuan ITJ)</option>
              <option value="BOOKED">BOOKED (Dipesan)</option>
              <option value="SOLD">SOLD (Terjual / Closing Legacy)</option>
            </select>

            {/* Smart Lock Warning Text */}
            {isLocked ? (
              <p className="text-xs text-amber-700 mt-1.5 flex items-center gap-1.5 font-medium bg-amber-50/90 border border-amber-200/80 p-2 rounded-md">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Status dikunci oleh sistem karena ada transaksi aktif.</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate mt-1">
                Pilih status unit. Ubah ke SOLD jika merupakan penjualan unit sebelum CRM (legacy).
              </p>
            )}
          </div>

          {/* Harga Khusus (Always Editable) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-graphite">
                Harga Khusus (Opsional)
              </label>
              <span className="text-[10px] text-deep-teal bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100 font-medium">
                Selalu Dapat Diubah
              </span>
            </div>
            <input
              type="number"
              min={0}
              placeholder="Kosongkan jika mengikuti harga dasar tipe unit"
              value={hargaKhusus}
              onChange={(e) => setHargaKhusus(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
            />
            <p className="text-[11px] text-slate mt-1">
              Harga khusus dapat disesuaikan kapan saja untuk kavling hook atau penyesuaian promo.
            </p>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div className="p-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md">
              {formError}
            </div>
          )}

          {/* Submit Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-mist">
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
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perubahan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
