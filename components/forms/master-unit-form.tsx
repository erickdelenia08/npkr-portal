"use client";

import React, { useId, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Building2,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  singleUnitSchema,
  SingleUnitInput,
} from "@/schemas/master-unit.schema";
import { createSingleUnit } from "@/actions/master-unit.action";
import type { SerializedMasterTipe } from "@/actions/master-unit.action";
import { normalizeBlok } from "@/lib/unit-setup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";

interface MasterUnitFormProps {
  tipeList: SerializedMasterTipe[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MasterUnitForm({
  tipeList,
  isOpen,
  onClose,
  onSuccess,
}: MasterUnitFormProps) {
  const baseId = useId();
  const blokId = `${baseId}-blok`;
  const tipeId = `${baseId}-tipe`;
  const hargaId = `${baseId}-harga`;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SingleUnitInput>({
    resolver: zodResolver(singleUnitSchema),
    defaultValues: {
      blok: "",
      tipe_id: 0,
      harga_khusus: null,
    },
  });

  const selectedTipeId = watch("tipe_id");
  const selectedTipe = useMemo(() => {
    return tipeList.find((t) => t.id === Number(selectedTipeId));
  }, [tipeList, selectedTipeId]);

  React.useEffect(() => {
    if (isOpen) {
      reset({
        blok: "",
        tipe_id: 0,
        harga_khusus: null,
      });
    }
  }, [isOpen, reset]);

  const handleBlokBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw && raw.trim()) {
      const normalized = normalizeBlok(raw);
      setValue("blok", normalized, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: SingleUnitInput) => {
    if (!data.tipe_id || data.tipe_id === 0) {
      toast.error("Silakan pilih tipe unit.");
      return;
    }

    try {
      const res = await createSingleUnit(data);
      if (res.success) {
        toast.success(res.message);
        reset();
        onSuccess();
        onClose();
      } else {
        toast.error(res.message);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-mist bg-bone/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-carbon-ink text-white flex items-center justify-center">
              <Layers className="w-4 h-4 text-prism-teal" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-carbon-ink tracking-tight font-heading">
                Tambah Satu Unit
              </DialogTitle>
              <DialogDescription className="text-xs text-slate">
                Inisialisasi nomor unit baru dengan status awal AVAILABLE
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Unit / Blok Name */}
          <div>
            <label htmlFor={blokId} className="block text-xs font-semibold text-graphite mb-1.5">
              Nomor / Blok Unit <span className="text-rose-500">*</span>
            </label>
            <input
              id={blokId}
              type="text"
              placeholder="Contoh: A-1 atau M-10"
              {...register("blok")}
              onBlur={handleBlokBlur}
              className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all font-mono font-bold uppercase"
            />
            <p className="text-[10px] text-slate mt-1">
              Format: [Prefix]-[Nomor], cth: A-1. Spasi atau penulisan &quot;A1&quot; otomatis dinormalisasi saat berpindah input.
            </p>
            {errors.blok && (
              <p className="text-xs text-rose-500 mt-1">{errors.blok.message}</p>
            )}
          </div>

          {/* Tipe Unit Dropdown */}
          <div>
            <label htmlFor={tipeId} className="block text-xs font-semibold text-graphite mb-1.5">
              Tipe Unit <span className="text-rose-500">*</span>
            </label>
            <select
              id={tipeId}
              {...register("tipe_id", { valueAsNumber: true })}
              className="w-full px-3 py-2 text-sm rounded-md border border-mist bg-white font-medium text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
            >
              <option value={0}>-- Pilih Tipe --</option>
              {tipeList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama_tipe} ({t.kategori})
                </option>
              ))}
            </select>
            {errors.tipe_id && (
              <p className="text-xs text-rose-500 mt-1">{errors.tipe_id.message}</p>
            )}

            {/* Selected Tipe Details */}
            {selectedTipe && (
              <div className="mt-2 p-2.5 rounded-md bg-teal-50/70 border border-teal-200 text-xs flex items-center justify-between text-deep-teal">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-prism-teal" />
                  <span>
                    LB: <strong>{selectedTipe.luas_bangunan} m²</strong> | LT:{" "}
                    <strong>{selectedTipe.luas_tanah} m²</strong>
                  </span>
                </div>
                <span className="font-mono font-bold">
                  Rp {selectedTipe.harga_dasar.toLocaleString("id-ID")}
                </span>
              </div>
            )}
          </div>

          {/* Status Note: Always AVAILABLE */}
          <div className="p-3 rounded-md bg-bone/60 border border-mist text-xs text-slate flex items-center justify-between">
            <span>Status Awal Unit:</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              AVAILABLE (Tersedia)
            </span>
          </div>

          {/* Harga Khusus (Optional) */}
          <div>
            <label htmlFor={hargaId} className="block text-xs font-semibold text-graphite mb-1.5">
              Harga Khusus (Opsional jika Hook/Strategis)
            </label>
            <Controller
              control={control}
              name="harga_khusus"
              render={({ field }) => (
                <CurrencyInput
                  id={hargaId}
                  placeholder="Kosongkan jika mengikuti harga dasar"
                  value={field.value}
                  onChange={(val) => field.onChange(val > 0 ? val : null)}
                />
              )}
            />
            <p className="text-[10px] text-slate mt-1">
              Jika diisi, harga ini menimpa harga dasar tipe unit.
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-mist">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Unit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
