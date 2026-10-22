"use client";

import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  X,
  Loader2,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
} from "lucide-react";
import {
  masterTipeSchema,
  MasterTipeInput,
  KategoriUnitType,
} from "@/schemas/master-unit.schema";
import {
  createMasterTipe,
  updateMasterTipe,
  SerializedMasterTipe,
} from "@/actions/master-unit.action";
import { buildNamaTipe } from "@/lib/tipe-name";

interface MasterTipeFormProps {
  initialData?: SerializedMasterTipe | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingTipeList?: SerializedMasterTipe[];
}

export function MasterTipeForm({
  initialData,
  isOpen,
  onClose,
  onSuccess,
  existingTipeList = [],
}: MasterTipeFormProps) {
  const isEditing = Boolean(initialData);
  const unitsCount = initialData?.jumlah_unit ?? initialData?._count?.units ?? 0;
  const isUsedByUnits = isEditing && unitsCount > 0;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<MasterTipeInput>({
    resolver: zodResolver(masterTipeSchema),
    mode: "onChange",
    defaultValues: {
      kategori: "KOMERSIL",
      luas_bangunan: undefined,
      luas_tanah: undefined,
      harga_dasar: undefined,
    },
  });

  const selectedKategori = watch("kategori");
  const luasBangunanValue = watch("luas_bangunan");
  const luasTanahValue = watch("luas_tanah");
  const hargaDasarValue = watch("harga_dasar");

  useEffect(() => {
    if (initialData) {
      reset({
        kategori: initialData.kategori,
        luas_bangunan: initialData.luas_bangunan,
        luas_tanah: initialData.luas_tanah,
        harga_dasar: initialData.harga_dasar,
      });
    } else {
      reset({
        kategori: "KOMERSIL",
        luas_bangunan: undefined,
        luas_tanah: undefined,
        harga_dasar: undefined,
      });
    }
  }, [initialData, reset, isOpen]);

  // If kategori changes to KAVLING, automatically set luas_bangunan to 0
  useEffect(() => {
    if (selectedKategori === "KAVLING") {
      setValue("luas_bangunan", 0, { shouldValidate: true });
    }
  }, [selectedKategori, setValue]);

  // Live preview of derived nama_tipe
  const derivedNama = useMemo(() => {
    const lb = selectedKategori === "KAVLING" ? 0 : Number(luasBangunanValue || 0);
    const lt = Number(luasTanahValue || 0);
    return buildNamaTipe(selectedKategori || "KOMERSIL", lb, lt);
  }, [selectedKategori, luasBangunanValue, luasTanahValue]);

  // Duplicate detection in existing tipe list
  const isDuplicate = useMemo(() => {
    if (!luasTanahValue) return false;
    const lb = selectedKategori === "KAVLING" ? 0 : Number(luasBangunanValue || 0);
    const lt = Number(luasTanahValue || 0);

    return existingTipeList.some((t) => {
      if (initialData && t.id === initialData.id) return false;
      return (
        t.kategori === selectedKategori &&
        t.luas_bangunan === lb &&
        t.luas_tanah === lt
      );
    });
  }, [existingTipeList, initialData, selectedKategori, luasBangunanValue, luasTanahValue]);

  if (!isOpen) return null;

  const onSubmit = async (data: MasterTipeInput) => {
    if (isDuplicate) {
      toast.error(`Tipe ${derivedNama} sudah ada di sistem.`);
      return;
    }

    try {
      if (isEditing && initialData) {
        const res = await updateMasterTipe(initialData.id, data);
        if (res.success) {
          toast.success(res.message);
          onSuccess();
          onClose();
        } else {
          toast.error(res.message);
        }
      } else {
        const res = await createMasterTipe(data);
        if (res.success) {
          toast.success(res.message);
          onSuccess();
          onClose();
        } else {
          toast.error(res.message);
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
      toast.error(msg);
    }
  };

  const formattedHarga =
    hargaDasarValue && !isNaN(Number(hargaDasarValue))
      ? new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(Number(hargaDasarValue))
      : "-";

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
            <div className="w-8 h-8 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-carbon-ink tracking-tight font-heading">
                {isEditing ? "Edit Spesifikasi Tipe" : "Tambah Tipe Unit Baru"}
              </h2>
              <p className="text-xs text-slate">
                Nama tipe otomatis dibuat berdasarkan kombinasi Kategori dan Luas (LB/LT)
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
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Live Read-Only Derived Name Preview Card */}
          <div className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-prism-teal" />
              <div>
                <span className="text-[10px] font-semibold text-deep-teal uppercase tracking-wider block">
                  Format Nama Tipe (Otomatis)
                </span>
                <span className="font-mono font-bold text-base text-deep-teal">
                  {derivedNama}
                </span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-white text-deep-teal border border-teal-200">
              Auto-Generated
            </span>
          </div>

          {/* Used By Units Warning Banner (if editing existing type) */}
          {isUsedByUnits && (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Dipakai {unitsCount} unit aktif</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Kategori dan Luas Tanah dikunci karena siteplan unit telah disetujui secara legal.
                Perubahan pada Luas Bangunan atau Harga Dasar akan berlaku pada ke-{unitsCount} unit tersebut.
              </p>
            </div>
          )}

          {/* Duplicate Warning */}
          {isDuplicate && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>
                Tipe <strong>{derivedNama}</strong> sudah ada dalam daftar. Kombinasi Kategori, Luas Bangunan, dan Luas Tanah harus unik.
              </span>
            </div>
          )}

          {/* Kategori */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-graphite flex items-center gap-1">
                <span>Kategori Properti</span>
                <span className="text-rose-500">*</span>
                {isUsedByUnits && <Lock className="w-3 h-3 text-slate ml-1" />}
              </label>
              {isUsedByUnits && (
                <span className="text-[10px] text-slate font-medium">Terkunci (Dipakai unit)</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["SUBSIDI", "KOMERSIL", "KAVLING"] as KategoriUnitType[]).map((kat) => (
                <label
                  key={kat}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-semibold transition-all ${
                    isUsedByUnits
                      ? selectedKategori === kat
                        ? "border-mist bg-bone text-carbon-ink cursor-not-allowed"
                        : "border-mist bg-bone/40 text-fog cursor-not-allowed"
                      : selectedKategori === kat
                      ? "border-prism-teal bg-teal-50 text-deep-teal cursor-pointer"
                      : "border-mist bg-white text-slate hover:bg-bone cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    value={kat}
                    disabled={isUsedByUnits}
                    {...register("kategori")}
                    className="sr-only"
                  />
                  <span>{kat}</span>
                </label>
              ))}
            </div>
            {errors.kategori && (
              <p className="text-xs text-rose-500 mt-1">{errors.kategori.message}</p>
            )}
          </div>

          {/* Luas Bangunan & Luas Tanah */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-graphite">
                  Luas Bangunan (m²) <span className="text-rose-500">*</span>
                </label>
                {selectedKategori === "KAVLING" && (
                  <span className="text-[10px] text-prism-teal font-medium">0 (Kavling)</span>
                )}
              </div>
              <input
                type="number"
                min={0}
                placeholder={selectedKategori === "KAVLING" ? "0" : "cth: 36"}
                disabled={selectedKategori === "KAVLING"}
                {...register("luas_bangunan", {
                  setValueAs: (v) =>
                    selectedKategori === "KAVLING"
                      ? 0
                      : v === "" || v === null || isNaN(v)
                      ? undefined
                      : Number(v),
                })}
                className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal disabled:bg-bone disabled:cursor-not-allowed transition-all"
              />
              {errors.luas_bangunan && (
                <p className="text-xs text-rose-500 mt-1">{errors.luas_bangunan.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-graphite flex items-center gap-1">
                  <span>Luas Tanah (m²)</span>
                  <span className="text-rose-500">*</span>
                  {isUsedByUnits && <Lock className="w-3 h-3 text-slate ml-1" />}
                </label>
                {isUsedByUnits && (
                  <span className="text-[10px] text-slate font-medium">Terkunci</span>
                )}
              </div>
              <input
                type="number"
                min={1}
                placeholder="cth: 72"
                disabled={isUsedByUnits}
                {...register("luas_tanah", {
                  setValueAs: (v) => (v === "" || v === null || isNaN(v) ? undefined : Number(v)),
                })}
                className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal disabled:bg-bone disabled:cursor-not-allowed transition-all"
              />
              {errors.luas_tanah && (
                <p className="text-xs text-rose-500 mt-1">{errors.luas_tanah.message}</p>
              )}
            </div>
          </div>

          {/* Harga Dasar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-graphite">
                Harga Dasar Unit (Rp) <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs font-mono font-semibold text-deep-teal">
                {formattedHarga}
              </span>
            </div>
            <input
              type="number"
              step="1000000"
              placeholder="cth: 150000000"
              {...register("harga_dasar", {
                setValueAs: (v) => (v === "" || v === null || isNaN(v) ? undefined : Number(v)),
              })}
              className="w-full px-3 py-2 text-sm font-mono rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
            />
            {errors.harga_dasar && (
              <p className="text-xs text-rose-500 mt-1">{errors.harga_dasar.message}</p>
            )}
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
              disabled={isSubmitting || !isValid || isDuplicate}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isEditing ? "Simpan Perubahan" : "Tambah Tipe"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
