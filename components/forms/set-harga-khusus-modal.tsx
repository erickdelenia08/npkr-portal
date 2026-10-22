"use client";

import React, { useState, useTransition, useEffect } from "react";
import { X, Loader2, CheckCircle2, Tag, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  SerializedMasterUnit,
  updateUnitHargaKhusus,
} from "@/actions/master-unit.action";

interface SetHargaKhususModalProps {
  unit: SerializedMasterUnit | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SetHargaKhususModal({
  unit,
  isOpen,
  onClose,
  onSuccess,
}: SetHargaKhususModalProps) {
  const [hargaKhusus, setHargaKhusus] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (unit) {
      setHargaKhusus(
        unit.harga_khusus !== null && unit.harga_khusus !== undefined
          ? String(unit.harga_khusus)
          : ""
      );
    }
  }, [unit, isOpen]);

  if (!isOpen || !unit) return null;

  const basePriceFormatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(unit.tipe.harga_dasar);

  const parsedNumber = hargaKhusus.trim() !== "" ? Number(hargaKhusus) : null;
  const previewFormatted =
    parsedNumber !== null && !isNaN(parsedNumber)
      ? new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(parsedNumber)
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const res = await updateUnitHargaKhusus(unit.id, parsedNumber);
        if (res.success) {
          toast.success(res.message);
          onSuccess();
          onClose();
        } else {
          toast.error(res.message);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal menyimpan harga khusus";
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
            <div className="w-8 h-8 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-carbon-ink tracking-tight font-heading">
                Atur Harga Khusus Blok {unit.blok}
              </h2>
              <p className="text-xs text-slate">
                Penyesuaian harga khusus kavling hook atau posisi strategis
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-md bg-bone/50 border border-mist text-xs flex items-center justify-between">
            <span className="text-slate">Harga Dasar Tipe ({unit.tipe.nama_tipe}):</span>
            <span className="font-mono font-semibold text-graphite">{basePriceFormatted}</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-graphite">
                Nominal Harga Khusus (Rp)
              </label>
              {previewFormatted && (
                <span className="text-xs font-mono font-semibold text-deep-teal">
                  {previewFormatted}
                </span>
              )}
            </div>
            <input
              type="number"
              min={0}
              step={1000000}
              placeholder="Kosongkan jika ingin mengikuti harga dasar tipe"
              value={hargaKhusus}
              onChange={(e) => setHargaKhusus(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
            />
            <p className="text-[11px] text-slate mt-1.5">
              Kosongkan kolom ini jika ingin menghapus harga khusus dan mengembalikan harga unit ke harga dasar tipe.
            </p>
          </div>

          {/* Action buttons */}
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
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Harga</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
