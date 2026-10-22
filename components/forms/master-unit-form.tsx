"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  X,
  Loader2,
  Layers,
  Sparkles,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Building2,
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
  SerializedMasterUnit,
} from "@/actions/master-unit.action";

interface MasterUnitFormProps {
  tipeList: SerializedMasterTipe[];
  existingUnits?: SerializedMasterUnit[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: "bulk" | "single";
}

export function MasterUnitForm({
  tipeList,
  existingUnits = [],
  isOpen,
  onClose,
  onSuccess,
  initialMode = "bulk",
}: MasterUnitFormProps) {
  const [mode, setMode] = useState<"bulk" | "single">(initialMode);

  // Single Form
  const singleForm = useForm<SingleUnitInput>({
    resolver: zodResolver(singleUnitSchema),
    defaultValues: {
      blok: "",
      tipe_id: tipeList[0]?.id || 0,
      harga_khusus: undefined,
    },
  });

  // Bulk Form
  const bulkForm = useForm<BulkUnitInput>({
    resolver: zodResolver(bulkUnitSchema),
    defaultValues: {
      prefix_blok: "",
      nomor_mulai: 1,
      nomor_akhir: 10,
      tipe_id: tipeList[0]?.id || 0,
      harga_khusus: undefined,
    },
  });

  // Keep default tipe_id updated when tipeList changes
  useEffect(() => {
    if (tipeList.length > 0) {
      if (!singleForm.getValues("tipe_id")) {
        singleForm.setValue("tipe_id", tipeList[0].id);
      }
      if (!bulkForm.getValues("tipe_id")) {
        bulkForm.setValue("tipe_id", tipeList[0].id);
      }
    }
  }, [tipeList, singleForm, bulkForm]);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      singleForm.reset({
        blok: "",
        tipe_id: tipeList[0]?.id || 0,
        harga_khusus: undefined,
      });
      bulkForm.reset({
        prefix_blok: "",
        nomor_mulai: 1,
        nomor_akhir: 10,
        tipe_id: tipeList[0]?.id || 0,
        harga_khusus: undefined,
      });
    }
  }, [isOpen, initialMode, tipeList, singleForm, bulkForm]);

  const rawBulkPrefix = bulkForm.watch("prefix_blok") || "";
  const bulkStart = bulkForm.watch("nomor_mulai");
  const bulkEnd = bulkForm.watch("nomor_akhir");
  const singleBlok = singleForm.watch("blok");

  // Format clean single block prefix: "A", "B", "M" (no hyphens or spaces, single uppercase code)
  const cleanPrefix = useMemo(() => {
    return rawBulkPrefix.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3);
  }, [rawBulkPrefix]);

  // Normalized display prefix with automatic hyphen: e.g. "A-"
  const displayPrefix = cleanPrefix ? `${cleanPrefix}-` : "";

  // Calculate live generated units for bulk mode
  const { generatedBloks, totalBulkCount } = useMemo(() => {
    const startNum = Number(bulkStart) || 0;
    const endNum = Number(bulkEnd) || 0;

    if (!cleanPrefix || startNum < 1 || endNum < startNum || endNum - startNum > 200) {
      return { generatedBloks: [], totalBulkCount: 0 };
    }

    const bloks: string[] = [];
    for (let i = startNum; i <= endNum; i++) {
      bloks.push(`${displayPrefix}${i}`);
    }

    return { generatedBloks: bloks, totalBulkCount: bloks.length };
  }, [cleanPrefix, displayPrefix, bulkStart, bulkEnd]);

  // Check collision with existing units in bulk mode
  const bulkCollisions = useMemo(() => {
    if (generatedBloks.length === 0 || existingUnits.length === 0) return [];
    const existingSet = new Set(existingUnits.map((u) => u.blok.toLowerCase()));
    return generatedBloks.filter((b) => existingSet.has(b.toLowerCase()));
  }, [generatedBloks, existingUnits]);

  // Check collision in single mode
  const singleCollision = useMemo(() => {
    if (!singleBlok || !singleBlok.trim() || existingUnits.length === 0) return false;
    const trimmed = singleBlok.trim().toLowerCase();
    return existingUnits.some((u) => u.blok.toLowerCase() === trimmed);
  }, [singleBlok, existingUnits]);

  if (!isOpen) return null;

  const handleSingleSubmit = async (data: SingleUnitInput) => {
    // Ensure standard hyphen if user wrote e.g. "A1" instead of "A-1"
    let formattedBlok = data.blok.trim().toUpperCase();
    if (/^[A-Za-z]+[0-9]+$/.test(formattedBlok)) {
      formattedBlok = formattedBlok.replace(/^([A-Za-z]+)([0-9]+)$/, "$1-$2");
    }

    if (existingUnits.some((u) => u.blok.toLowerCase() === formattedBlok.toLowerCase())) {
      toast.error(`Unit '${formattedBlok}' sudah ada di database.`);
      return;
    }

    try {
      const res = await createSingleUnit({ ...data, blok: formattedBlok });
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
    if (bulkCollisions.length > 0) {
      toast.error(
        `Konflik nomor unit: ${bulkCollisions.slice(0, 5).join(", ")} sudah ada.`
      );
      return;
    }

    try {
      // Pass the clean single block prefix
      const res = await createBulkUnits({
        ...data,
        prefix_blok: cleanPrefix,
      });

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
      <div className="relative w-full max-w-lg bg-white rounded-lg border border-mist shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mist bg-bone/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-carbon-ink text-white flex items-center justify-center">
              <Layers className="w-4 h-4 text-prism-teal" />
            </div>
            <div>
              <h2 className="text-base font-bold text-carbon-ink tracking-tight font-heading">
                Setup Unit Siteplan
              </h2>
              <p className="text-xs text-slate">
                Inisialisasi nomor unit berdasarkan siteplan yang telah disetujui
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
              <span>Generate Unit Massal</span>
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
              <span>Tambah Satu Unit</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Mode 1: Bulk Generator */}
          {mode === "bulk" && (
            <form
              id="bulk-unit-form"
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
                  className="w-full px-3 py-2 text-xs rounded-md border border-mist bg-white font-medium text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
                >
                  <option value={0}>-- Pilih Tipe Unit --</option>
                  {tipeList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama_tipe} ({t.kategori}) — Rp {t.harga_dasar.toLocaleString("id-ID")}
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-graphite mb-1.5">
                    Prefix Blok <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      maxLength={3}
                      placeholder="cth: A"
                      value={cleanPrefix}
                      onChange={(e) => {
                        const val = e.target.value
                          .replace(/[^A-Za-z0-9]/g, "")
                          .toUpperCase()
                          .slice(0, 3);
                        bulkForm.setValue("prefix_blok", val, {
                          shouldValidate: true,
                        });
                      }}
                      className="w-full px-3 py-2 pr-7 text-xs rounded-md border border-mist font-mono font-bold text-carbon-ink focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all uppercase"
                    />
                    <span className="absolute right-2.5 text-xs font-mono font-bold text-slate select-none">
                      -
                    </span>
                  </div>
                  <p className="text-[10px] text-slate mt-1">
                    Tanda &apos;-&apos; otomatis ditambahkan
                  </p>
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
                    className="w-full px-3 py-2 text-xs rounded-md border border-mist font-mono focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
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
                    placeholder="10"
                    {...bulkForm.register("nomor_akhir", { valueAsNumber: true })}
                    className="w-full px-3 py-2 text-xs rounded-md border border-mist font-mono focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
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
                <label className="block text-xs font-semibold text-graphite mb-1.5">
                  Harga Khusus (Opsional)
                </label>
                <input
                  type="number"
                  placeholder="Kosongkan jika mengikuti harga dasar tipe"
                  {...bulkForm.register("harga_khusus", {
                    setValueAs: (v) => (v === "" || v === null || isNaN(v) ? null : Number(v)),
                  })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
                />
              </div>

              {/* Inline Collision Warning */}
              {bulkCollisions.length > 0 && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Konflik Nomor Unit ({bulkCollisions.length} unit sudah ada):</span>
                  </div>
                  <p className="text-[11px] font-mono leading-relaxed">
                    {bulkCollisions.slice(0, 10).join(", ")}
                    {bulkCollisions.length > 10 && ` dan ${bulkCollisions.length - 10} unit lainnya`} sudah terdaftar di database.
                  </p>
                </div>
              )}

              {/* Enhanced Visual Preview of Generated Units */}
              <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-deep-teal border-b border-teal-100/80 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-prism-teal" />
                    <span>Pratinjau Hasil Generate:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {bulkCollisions.length > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                        {bulkCollisions.length} Konflik
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-teal-100 text-deep-teal font-mono font-bold text-[11px]">
                      {totalBulkCount} Unit
                    </span>
                  </div>
                </div>

                {totalBulkCount > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white/70 rounded-md border border-teal-100">
                      {generatedBloks.map((unitName) => {
                        const isCol = bulkCollisions.includes(unitName);
                        return (
                          <div
                            key={unitName}
                            className={`p-1.5 rounded text-center font-mono text-xs font-semibold border transition-all ${
                              isCol
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-white text-carbon-ink border-mist hover:border-prism-teal"
                            }`}
                            title={isCol ? `Unit ${unitName} sudah ada di database!` : `Unit ${unitName} siap dibuat`}
                          >
                            <span>{unitName}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate px-1">
                      <span>Status: <strong className="text-emerald-700 font-mono">AVAILABLE</strong></span>
                      {cleanPrefix && (
                        <span>Rentang: <strong className="font-mono text-carbon-ink">{displayPrefix}{bulkStart} s/d {displayPrefix}{bulkEnd}</strong></span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate italic">
                    Masukkan prefix blok (contoh: <strong>A</strong>) dan rentang nomor untuk melihat pratinjau unit.
                  </div>
                )}
              </div>
            </form>
          )}

          {/* Mode 2: Single Unit Input */}
          {mode === "single" && (
            <form
              id="single-unit-form"
              onSubmit={singleForm.handleSubmit(handleSingleSubmit)}
              className="p-6 space-y-4"
            >
              {/* Unit / Blok Name */}
              <div>
                <label className="block text-xs font-semibold text-graphite mb-1.5">
                  Nomor / Blok Unit <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: A-1 atau M-10"
                  {...singleForm.register("blok")}
                  className="w-full px-3 py-2 text-xs rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all font-mono font-bold uppercase"
                />
                <p className="text-[10px] text-slate mt-1">
                  Format standar: [Blok]-[Nomor], contoh: A-1, M-10
                </p>
                {singleForm.formState.errors.blok && (
                  <p className="text-xs text-rose-500 mt-1">
                    {singleForm.formState.errors.blok.message}
                  </p>
                )}
                {singleCollision && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Unit &apos;{singleBlok}&apos; sudah ada di database.</span>
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
                  className="w-full px-3 py-2 text-xs rounded-md border border-mist bg-white font-medium text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
                >
                  <option value={0}>-- Pilih Tipe Unit --</option>
                  {tipeList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama_tipe} ({t.kategori}) — Rp {t.harga_dasar.toLocaleString("id-ID")}
                    </option>
                  ))}
                </select>
                {singleForm.formState.errors.tipe_id && (
                  <p className="text-xs text-rose-500 mt-1">
                    {singleForm.formState.errors.tipe_id.message}
                  </p>
                )}
              </div>

              {/* Status Note: Always AVAILABLE */}
              <div className="p-3 rounded-md bg-bone/60 border border-mist text-xs text-slate flex items-center justify-between">
                <span>Status Awal Unit:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  AVAILABLE (Tersedia)
                </span>
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
                  className="w-full px-3 py-2 text-xs font-mono rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-mist bg-bone/30 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors"
          >
            Batal
          </button>

          {mode === "bulk" ? (
            <button
              type="submit"
              form="bulk-unit-form"
              disabled={
                bulkForm.formState.isSubmitting ||
                totalBulkCount === 0 ||
                bulkCollisions.length > 0 ||
                !cleanPrefix
              }
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          ) : (
            <button
              type="submit"
              form="single-unit-form"
              disabled={singleForm.formState.isSubmitting || singleCollision || !singleBlok}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          )}
        </div>
      </div>
    </div>
  );
}
