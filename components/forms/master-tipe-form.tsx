"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  X,
  Loader2,
  Building2,
  CheckCircle2,
  Layers,
  HelpCircle,
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

interface MasterTipeFormProps {
  initialData?: SerializedMasterTipe | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MasterTipeForm({
  initialData,
  isOpen,
  onClose,
  onSuccess,
}: MasterTipeFormProps) {
  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MasterTipeInput>({
    resolver: zodResolver(masterTipeSchema),
    defaultValues: {
      nama_tipe: "",
      kategori: "KOMERSIL",
      luas_bangunan: 36,
      luas_tanah: 72,
      harga_dasar: 150000000,
    },
  });

  const selectedKategori = watch("kategori");
  const hargaDasarValue = watch("harga_dasar");

  useEffect(() => {
    if (initialData) {
      reset({
        nama_tipe: initialData.nama_tipe,
        kategori: initialData.kategori,
        luas_bangunan: initialData.luas_bangunan || 0,
        luas_tanah: initialData.luas_tanah,
        harga_dasar: initialData.harga_dasar,
      });
    } else {
      reset({
        nama_tipe: "",
        kategori: "KOMERSIL",
        luas_bangunan: 36,
        luas_tanah: 72,
        harga_dasar: 200000000,
      });
    }
  }, [initialData, reset, isOpen]);

  // If kategori changes to KAVLING, automatically set luas_bangunan to 0
  useEffect(() => {
    if (selectedKategori === "KAVLING") {
      setValue("luas_bangunan", 0);
    }
  }, [selectedKategori, setValue]);

  if (!isOpen) return null;

  const onSubmit = async (data: MasterTipeInput) => {
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

  const formattedHarga = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(hargaDasarValue) || 0);

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
              <h2 className="text-base font-bold text-carbon-ink tracking-tight">
                {isEditing ? "Edit Tipe Unit" : "Tambah Tipe Unit Baru"}
              </h2>
              <p className="text-xs text-slate">
                Konfigurasi spesifikasi dan harga dasar tipe properti
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
          {/* Nama Tipe */}
          <div>
            <label className="block text-xs font-semibold text-graphite mb-1.5">
              Nama Tipe <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Komersil 36/72, Subsidi Dahlia"
              {...register("nama_tipe")}
              className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
            />
            {errors.nama_tipe && (
              <p className="text-xs text-rose-500 mt-1">
                {errors.nama_tipe.message}
              </p>
            )}
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-xs font-semibold text-graphite mb-1.5">
              Kategori Properti <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["SUBSIDI", "KOMERSIL", "KAVLING"] as KategoriUnitType[]).map(
                (kat) => (
                  <label
                    key={kat}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-md border text-xs font-semibold cursor-pointer transition-all ${
                      selectedKategori === kat
                        ? "border-prism-teal bg-teal-50 text-deep-teal"
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
                )
              )}
            </div>
            {errors.kategori && (
              <p className="text-xs text-rose-500 mt-1">
                {errors.kategori.message}
              </p>
            )}
          </div>

          {/* Luas Bangunan & Luas Tanah */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-graphite">
                  Luas Bangunan (m²)
                </label>
                {selectedKategori === "KAVLING" && (
                  <span className="text-[10px] text-prism-teal font-medium">
                    (Opsional untuk Kavling)
                  </span>
                )}
              </div>
              <input
                type="number"
                placeholder={selectedKategori === "KAVLING" ? "0 (Tanpa bangunan)" : "36"}
                disabled={selectedKategori === "KAVLING"}
                {...register("luas_bangunan", { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal disabled:bg-bone disabled:cursor-not-allowed transition-all"
              />
              {errors.luas_bangunan && (
                <p className="text-xs text-rose-500 mt-1">
                  {errors.luas_bangunan.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-graphite mb-1.5">
                Luas Tanah (m²) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                placeholder="72"
                {...register("luas_tanah", { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
              />
              {errors.luas_tanah && (
                <p className="text-xs text-rose-500 mt-1">
                  {errors.luas_tanah.message}
                </p>
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
              placeholder="150000000"
              {...register("harga_dasar", { valueAsNumber: true })}
              className="w-full px-3 py-2 text-sm font-mono rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
            />
            {errors.harga_dasar && (
              <p className="text-xs text-rose-500 mt-1">
                {errors.harga_dasar.message}
              </p>
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-colors disabled:opacity-50"
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
