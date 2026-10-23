"use client";

import React, { useEffect, useMemo, useId } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
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
} from "@/actions/master-unit.action";
import type { SerializedMasterTipe } from "@/actions/master-unit.action";
import { buildNamaTipe } from "@/lib/tipe-name";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";

interface MasterTipeFormProps {
  initialData?: SerializedMasterTipe | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingTipeList?: SerializedMasterTipe[];
  presetKategori?: KategoriUnitType;
  presetLuasTanah?: number;
  onCreated?: (tipe: SerializedMasterTipe) => void;
}

export function MasterTipeForm({
  initialData,
  isOpen,
  onClose,
  onSuccess,
  existingTipeList = [],
  presetKategori,
  presetLuasTanah,
  onCreated,
}: MasterTipeFormProps) {
  const isEditing = Boolean(initialData);
  const unitsCount = initialData?.jumlah_unit ?? initialData?._count?.units ?? 0;
  const isUsedByUnits = isEditing && unitsCount > 0;

  const isKategoriLocked = isUsedByUnits || Boolean(presetKategori);
  const isLuasTanahLocked = isUsedByUnits || Boolean(presetLuasTanah);

  const baseId = useId();
  const lbId = `${baseId}-lb`;
  const ltId = `${baseId}-lt`;
  const hargaId = `${baseId}-harga`;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm<MasterTipeInput>({
    resolver: zodResolver(masterTipeSchema),
    mode: "onChange",
    defaultValues: {
      kategori: presetKategori || "KOMERSIL",
      luas_bangunan: undefined,
      luas_tanah: presetLuasTanah || undefined,
      harga_dasar: undefined,
    },
  });

  const selectedKategori = watch("kategori");
  const luasBangunanValue = watch("luas_bangunan");
  const luasTanahValue = watch("luas_tanah");
  const hargaDasarValue = watch("harga_dasar");

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      reset({
        kategori: initialData.kategori,
        luas_bangunan: initialData.luas_bangunan,
        luas_tanah: initialData.luas_tanah,
        harga_dasar: initialData.harga_dasar,
      });
    } else {
      reset({
        kategori: presetKategori || "KOMERSIL",
        luas_bangunan: presetKategori === "KAVLING" ? 0 : undefined,
        luas_tanah: presetLuasTanah || undefined,
        harga_dasar: undefined,
      });
    }
  }, [initialData, reset, isOpen, presetKategori, presetLuasTanah]);

  // If kategori is KAVLING, automatically set luas_bangunan to 0
  useEffect(() => {
    if (selectedKategori === "KAVLING") {
      setValue("luas_bangunan", 0, { shouldValidate: true });
    }
  }, [selectedKategori, setValue]);

  // Derived nama preview: show KOMERSIL-…/… until both luas fields are filled
  const derivedNama = useMemo(() => {
    const kat = selectedKategori || "KOMERSIL";
    const lb = kat === "KAVLING" ? 0 : luasBangunanValue;
    const lt = luasTanahValue;

    if ((lb === undefined || lb === null || isNaN(Number(lb))) || !lt || isNaN(Number(lt))) {
      return `${kat}-…/…`;
    }
    return buildNamaTipe(kat, Number(lb), Number(lt));
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
        if (res.success && res.data) {
          toast.success(res.message);
          onCreated?.(res.data);
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-mist bg-bone/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-carbon-ink tracking-tight font-heading">
                {isEditing ? "Edit Spesifikasi Tipe" : "Tambah Tipe Unit Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate">
                Nama tipe otomatis dibuat berdasarkan kombinasi Kategori dan Luas (LB/LT)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

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

          {/* Used By Units Warning Banner */}
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
                {isKategoriLocked && <Lock className="w-3 h-3 text-slate ml-1" />}
              </label>
              {isKategoriLocked && (
                <span className="text-[10px] text-slate font-medium">
                  {isUsedByUnits ? "Terkunci (Dipakai unit)" : "Terkunci (Sesuai Siteplan)"}
                </span>
              )}
            </div>

            {isKategoriLocked ? (
              <div className="p-2.5 rounded-md border border-mist bg-bone/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-carbon-ink">{selectedKategori}</span>
                <span className="text-[10px] text-slate">Nilai terkunci</span>
                {/* Hidden input to ensure react-hook-form value is preserved */}
                <input type="hidden" {...register("kategori")} />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(["SUBSIDI", "KOMERSIL", "KAVLING"] as KategoriUnitType[]).map((kat) => (
                  <label
                    key={kat}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-semibold transition-all focus-within:ring-2 focus-within:ring-prism-teal focus-within:outline-none cursor-pointer ${
                      selectedKategori === kat
                        ? "border-prism-teal bg-teal-50 text-deep-teal font-bold shadow-xs"
                        : "border-mist bg-white text-slate hover:bg-bone"
                    }`}
                  >
                    <input
                      type="radio"
                      value={kat}
                      {...register("kategori")}
                      className="sr-only"
                    />
                    <span>{kat}</span>
                  </label>
                ))}
              </div>
            )}
            {errors.kategori && (
              <p className="text-xs text-rose-500 mt-1">{errors.kategori.message}</p>
            )}
          </div>

          {/* Luas Bangunan & Luas Tanah */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={lbId} className="text-xs font-semibold text-graphite">
                  Luas Bangunan (m²) <span className="text-rose-500">*</span>
                </label>
                {selectedKategori === "KAVLING" && (
                  <span className="text-[10px] text-prism-teal font-medium">0 (Kavling)</span>
                )}
              </div>
              {selectedKategori === "KAVLING" ? (
                <div className="px-3 py-2 text-sm rounded-md border border-mist bg-bone text-slate font-mono">
                  0
                  <input type="hidden" {...register("luas_bangunan", { valueAsNumber: true })} />
                </div>
              ) : (
                <input
                  id={lbId}
                  type="number"
                  min={0}
                  placeholder="cth: 36"
                  {...register("luas_bangunan", {
                    setValueAs: (v) => (v === "" || v === null || isNaN(v) ? undefined : Number(v)),
                  })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
                />
              )}
              {errors.luas_bangunan && (
                <p className="text-xs text-rose-500 mt-1">{errors.luas_bangunan.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={ltId} className="text-xs font-semibold text-graphite flex items-center gap-1">
                  <span>Luas Tanah (m²)</span>
                  <span className="text-rose-500">*</span>
                  {isLuasTanahLocked && <Lock className="w-3 h-3 text-slate ml-1" />}
                </label>
                {isLuasTanahLocked && (
                  <span className="text-[10px] text-slate font-medium">Terkunci</span>
                )}
              </div>
              {isLuasTanahLocked ? (
                <div className="px-3 py-2 text-sm rounded-md border border-mist bg-bone text-carbon-ink font-mono">
                  {luasTanahValue}
                  <input type="hidden" {...register("luas_tanah", { valueAsNumber: true })} />
                </div>
              ) : (
                <input
                  id={ltId}
                  type="number"
                  min={1}
                  placeholder="cth: 72"
                  {...register("luas_tanah", {
                    setValueAs: (v) => (v === "" || v === null || isNaN(v) ? undefined : Number(v)),
                  })}
                  className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
                />
              )}
              {errors.luas_tanah && (
                <p className="text-xs text-rose-500 mt-1">{errors.luas_tanah.message}</p>
              )}
            </div>
          </div>

          {/* Harga Dasar (Using CurrencyInput) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor={hargaId} className="text-xs font-semibold text-graphite">
                Harga Dasar Unit <span className="text-rose-500">*</span>
              </label>
            </div>
            <Controller
              control={control}
              name="harga_dasar"
              render={({ field }) => (
                <CurrencyInput
                  id={hargaId}
                  placeholder="cth: 150.000.000"
                  value={field.value}
                  onChange={(val) => field.onChange(val || undefined)}
                />
              )}
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
      </DialogContent>
    </Dialog>
  );
}
