"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  X,
  Loader2,
  Layers,
  Sparkles,
  Plus,
  HelpCircle,
  Building,
} from "lucide-react";
import {
  singleUnitSchema,
  SingleUnitInput,
  bulkUnitSchema,
  BulkUnitInput,
} from "@/schemas/master-unit.schema";
import {
  createSingleUnit,
  createBulkUnits,
  SerializedMasterTipe,
} from "@/actions/master-unit.action";

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
  const [mode, setMode] = useState<"bulk" | "single">("bulk");

  // Single Form
  const singleForm = useForm<SingleUnitInput>({
    resolver: zodResolver(singleUnitSchema),
    defaultValues: {
      blok: "",
      tipe_id: tipeList[0]?.id || 0,
      status_unit: "AVAILABLE",
      harga_khusus: undefined,
    },
  });

  // Bulk Form
  const bulkForm = useForm<BulkUnitInput>({
    resolver: zodResolver(bulkUnitSchema),
    defaultValues: {
      prefix_blok: "F-",
      nomor_mulai: 1,
      nomor_akhir: 10,
      tipe_id: tipeList[0]?.id || 0,
      harga_khusus: undefined,
    },
  });

  const bulkPrefix = bulkForm.watch("prefix_blok");
  const bulkStart = bulkForm.watch("nomor_mulai");
  const bulkEnd = bulkForm.watch("nomor_akhir");

  if (!isOpen) return null;

  // Calculate live preview for bulk mode
  const startNum = Number(bulkStart) || 0;
  const endNum = Number(bulkEnd) || 0;
  const totalBulkCount = endNum >= startNum && endNum - startNum <= 200 ? endNum - startNum + 1 : 0;

  const previewUnits: string[] = [];
  if (totalBulkCount > 0 && totalBulkCount <= 200) {
    const previewLimit = Math.min(6, totalBulkCount);
    for (let i = 0; i < previewLimit; i++) {
      previewUnits.push(`${bulkPrefix || ""}${startNum + i}`);
    }
  }

  const handleSingleSubmit = async (data: SingleUnitInput) => {
    try {
      const res = await createSingleUnit(data);
      if (res.success) {
        toast.success(res.message);
        singleForm.reset();
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

  const handleBulkSubmit = async (data: BulkUnitInput) => {
    try {
      const res = await createBulkUnits(data);
      if (res.success) {
        toast.success(res.message);
        bulkForm.reset();
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white rounded-lg border border-mist shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mist bg-bone/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-carbon-ink text-white flex items-center justify-center">
              <Layers className="w-4 h-4 text-prism-teal" />
            </div>
            <div>
              <h2 className="text-base font-bold text-carbon-ink tracking-tight">
                Tambah Blok / Unit Baru
              </h2>
              <p className="text-xs text-slate">
                Generate nomor blok sekaligus atau input per satu unit
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

        {/* Mode Switcher */}
        <div className="px-6 pt-4 pb-1">
          <div className="grid grid-cols-2 p-1 rounded-lg bg-bone border border-mist text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode("bulk")}
              className={`py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                mode === "bulk"
                  ? "bg-white text-carbon-ink shadow-xs"
                  : "text-slate hover:text-graphite"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-prism-teal" />
              <span>Bulk / Massal (Auto Series)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`py-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                mode === "single"
                  ? "bg-white text-carbon-ink shadow-xs"
                  : "text-slate hover:text-graphite"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Satuan (Single)</span>
            </button>
          </div>
        </div>

        {/* Form Body - Bulk Mode */}
        {mode === "bulk" && (
          <form
            onSubmit={bulkForm.handleSubmit(handleBulkSubmit)}
            className="p-6 space-y-4"
          >
            {/* Tipe Unit Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-graphite mb-1.5">
                Tipe Unit <span className="text-rose-500">*</span>
              </label>
              <select
                {...bulkForm.register("tipe_id", { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm rounded-md border border-mist bg-white focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
              >
                <option value="">-- Pilih Tipe Unit --</option>
                {tipeList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama_tipe} ({t.kategori}) - Rp{" "}
                    {t.harga_dasar.toLocaleString("id-ID")}
                  </option>
                ))}
              </select>
              {bulkForm.formState.errors.tipe_id && (
                <p className="text-xs text-rose-500 mt-1">
                  {bulkForm.formState.errors.tipe_id.message}
                </p>
              )}
            </div>

            {/* Prefix & Series Range */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-graphite mb-1.5">
                  Prefix Blok <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="F-"
                  {...bulkForm.register("prefix_blok")}
                  className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
                />
                {bulkForm.formState.errors.prefix_blok && (
                  <p className="text-xs text-rose-500 mt-1">
                    {bulkForm.formState.errors.prefix_blok.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-graphite mb-1.5">
                  No. Mulai <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  {...bulkForm.register("nomor_mulai", { valueAsNumber: true })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
                />
                {bulkForm.formState.errors.nomor_mulai && (
                  <p className="text-xs text-rose-500 mt-1">
                    {bulkForm.formState.errors.nomor_mulai.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-graphite mb-1.5">
                  No. Akhir <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="20"
                  {...bulkForm.register("nomor_akhir", { valueAsNumber: true })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
                />
                {bulkForm.formState.errors.nomor_akhir && (
                  <p className="text-xs text-rose-500 mt-1">
                    {bulkForm.formState.errors.nomor_akhir.message}
                  </p>
                )}
              </div>
            </div>

            {/* Harga Khusus (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-graphite">
                  Harga Khusus (Opsional)
                </label>
                <span className="text-[11px] text-slate">
                  Berlaku untuk semua unit yang digenerate
                </span>
              </div>
              <input
                type="number"
                placeholder="Kosongkan jika mengikuti harga dasar tipe"
                {...bulkForm.register("harga_khusus", {
                  setValueAs: (v) => (v === "" || v === null || isNaN(v) ? null : Number(v)),
                })}
                className="w-full px-3 py-2 text-sm font-mono rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
              />
            </div>

            {/* Live Preview Box */}
            <div className="p-3.5 rounded-md bg-teal-50/50 border border-teal-100">
              <div className="flex items-center justify-between text-xs font-semibold text-deep-teal mb-2">
                <span>Pratinjau Hasil Generate:</span>
                <span className="px-2 py-0.5 rounded bg-teal-100/80 text-deep-teal font-mono">
                  Total: {totalBulkCount} Unit
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {previewUnits.map((u) => (
                  <span
                    key={u}
                    className="px-2 py-1 bg-white text-carbon-ink border border-mist rounded text-xs font-mono font-medium shadow-2xs"
                  >
                    {u}
                  </span>
                ))}
                {totalBulkCount > previewUnits.length && (
                  <span className="px-2 py-1 text-slate text-xs italic">
                    +{totalBulkCount - previewUnits.length} unit lainnya...
                  </span>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-mist">
              <button
                type="button"
                onClick={onClose}
                disabled={bulkForm.formState.isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={bulkForm.formState.isSubmitting || totalBulkCount === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-colors disabled:opacity-50"
              >
                {bulkForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Membuat {totalBulkCount} Unit...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate {totalBulkCount} Unit</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Form Body - Single Mode */}
        {mode === "single" && (
          <form
            onSubmit={singleForm.handleSubmit(handleSingleSubmit)}
            className="p-6 space-y-4"
          >
            {/* Blok Name */}
            <div>
              <label className="block text-xs font-semibold text-graphite mb-1.5">
                Nama Blok Unit <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: F-1, A-12, Hook-03"
                {...singleForm.register("blok")}
                className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all font-mono"
              />
              {singleForm.formState.errors.blok && (
                <p className="text-xs text-rose-500 mt-1">
                  {singleForm.formState.errors.blok.message}
                </p>
              )}
            </div>

            {/* Tipe Unit Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-graphite mb-1.5">
                Tipe Unit <span className="text-rose-500">*</span>
              </label>
              <select
                {...singleForm.register("tipe_id", { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm rounded-md border border-mist bg-white focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
              >
                <option value="">-- Pilih Tipe Unit --</option>
                {tipeList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama_tipe} ({t.kategori}) - Rp{" "}
                    {t.harga_dasar.toLocaleString("id-ID")}
                  </option>
                ))}
              </select>
              {singleForm.formState.errors.tipe_id && (
                <p className="text-xs text-rose-500 mt-1">
                  {singleForm.formState.errors.tipe_id.message}
                </p>
              )}
            </div>

            {/* Status Unit Initial */}
            <div>
              <label className="block text-xs font-semibold text-graphite mb-1.5">
                Status Unit Awal
              </label>
              <select
                {...singleForm.register("status_unit")}
                className="w-full px-3 py-2 text-sm rounded-md border border-mist bg-white focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
              >
                <option value="AVAILABLE">AVAILABLE (Tersedia)</option>
                <option value="HOLD">HOLD (Ditahan / Proses ITJ)</option>
                <option value="SOLD">SOLD (Terjual)</option>
              </select>
            </div>

            {/* Harga Khusus */}
            <div>
              <label className="block text-xs font-semibold text-graphite mb-1.5">
                Harga Khusus (Opsional jika Hook/Strategis)
              </label>
              <input
                type="number"
                placeholder="Kosongkan jika sama dengan harga dasar"
                {...singleForm.register("harga_khusus", {
                  setValueAs: (v) => (v === "" || v === null || isNaN(v) ? null : Number(v)),
                })}
                className="w-full px-3 py-2 text-sm font-mono rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-mist">
              <button
                type="button"
                onClick={onClose}
                disabled={singleForm.formState.isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={singleForm.formState.isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-colors disabled:opacity-50"
              >
                {singleForm.formState.isSubmitting ? (
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
        )}
      </div>
    </div>
  );
}
