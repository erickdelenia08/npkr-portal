"use client";

import React, { useState, useTransition, useId } from "react";
import { Loader2, CheckCircle2, Tag } from "lucide-react";
import { toast } from "sonner";
import { updateUnitHargaKhusus } from "@/actions/master-unit.action";
import type { SerializedMasterUnit } from "@/actions/master-unit.action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";

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
  if (!unit) return null;

  return (
    <SetHargaKhususModalForm
      key={unit.id}
      unit={unit}
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

interface SetHargaKhususModalFormProps {
  unit: SerializedMasterUnit;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function SetHargaKhususModalForm({
  unit,
  isOpen,
  onClose,
  onSuccess,
}: SetHargaKhususModalFormProps) {
  const [hargaKhusus, setHargaKhusus] = useState<number | null>(
    unit.harga_khusus ?? null
  );
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  const basePriceFormatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(unit.tipe.harga_dasar);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const res = await updateUnitHargaKhusus(
          unit.id,
          hargaKhusus !== null && hargaKhusus > 0
            ? hargaKhusus
            : null
        );

        if (res.success) {
          toast.success(res.message);
          onSuccess();
          onClose();
        } else {
          toast.error(res.message);
        }
      } catch (error: unknown) {
        const msg =
          error instanceof Error
            ? error.message
            : "Gagal menyimpan harga khusus";

        toast.error(msg);
      }
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-mist bg-bone/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-carbon-ink tracking-tight font-heading">
                Atur Harga Khusus Blok {unit.blok}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate">
                Penyesuaian harga khusus kavling hook atau posisi strategis
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-md bg-bone/50 border border-mist text-xs flex items-center justify-between">
            <span className="text-slate">
              Harga Dasar Tipe ({unit.tipe.nama_tipe}):
            </span>
            <span className="font-mono font-semibold text-graphite">
              {basePriceFormatted}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={inputId}
                className="text-xs font-semibold text-graphite"
              >
                Nominal Harga Khusus
              </label>

              {hargaKhusus !== null && hargaKhusus > 0 && (
                <button
                  type="button"
                  onClick={() => setHargaKhusus(null)}
                  disabled={isPending}
                  className="text-[11px] text-rose-600 hover:underline disabled:opacity-50"
                >
                  Reset ke Harga Dasar
                </button>
              )}
            </div>

            <CurrencyInput
              id={inputId}
              placeholder="Kosongkan jika ingin mengikuti harga dasar tipe"
              value={hargaKhusus}
              onChange={(val) =>
                setHargaKhusus(val > 0 ? val : null)
              }
            />

            <p className="text-[11px] text-slate mt-1.5">
              Kosongkan atau ketik 0 jika ingin menghapus harga khusus
              dan mengembalikan harga unit ke harga dasar tipe.
            </p>
          </div>

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
      </DialogContent>
    </Dialog>
  );
}