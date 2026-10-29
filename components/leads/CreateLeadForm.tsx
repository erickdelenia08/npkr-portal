"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  User,
  Phone,
  Compass,
  Home,
  Loader2,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { leadSchema, LeadInput } from "@/schemas/lead.schema";
import { createLead, CreateLeadResponse } from "@/actions/lead";
import { getMasterTipeList } from "@/actions/master-unit.action";
import type { SerializedMasterTipe } from "@/actions/master-unit.action";
import z from "zod";

export interface CreateLeadFormProps {
  onSuccess?: (newLead: NonNullable<CreateLeadResponse["data"]>) => void;
  onCancel?: () => void;
  className?: string;
  showTitle?: boolean;
  marketingUsers?: { id: number; nama: string; no_hp: string }[];
  tipeList?: SerializedMasterTipe[];
}

const SUMBER_LEAD_OPTIONS = [
  { value: "Walk-in", label: "Walk-in (Kantor / Lokasi)" },
  { value: "Facebook Ads", label: "Facebook / Meta Ads" },
  { value: "WA Kantor", label: "WhatsApp Official Kantor" },
  { value: "Instagram Organik", label: "Instagram Organik / DM" },
  { value: "Brosur / Pameran", label: "Brosur / Expo Properti" },
  { value: "Teman / Kerabat", label: "Rekomendasi Teman / Kerabat" },
  { value: "Lainnya", label: "Sumber Lainnya" },
];

export function CreateLeadForm({
  onSuccess,
  onCancel,
  className = "",
  showTitle = true,
  marketingUsers,
  tipeList,
}: CreateLeadFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [internalTipeList, setInternalTipeList] = useState<SerializedMasterTipe[]>(
    tipeList || []
  );
  const [isLoadingTipe, setIsLoadingTipe] = useState(false);

  // Auto fetch master tipe if not provided as props

  useEffect(() => {
    // Data sudah tersedia dari props, tidak perlu fetch.
    if (tipeList && tipeList.length > 0) {
      return;
    }

    let isMounted = true;

    const loadTipe = async () => {
      setIsLoadingTipe(true);

      try {
        const res = await getMasterTipeList();

        if (isMounted && res.success && res.data) {
          setInternalTipeList(res.data);
        }
      } catch (err: unknown) {
        console.error("Gagal memuat master tipe:", err);
      } finally {
        if (isMounted) {
          setIsLoadingTipe(false);
        }
      }
    };

    void loadTipe();

    return () => {
      isMounted = false;
    };
  }, [tipeList]);



  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof leadSchema>,
    unknown,
    z.output<typeof leadSchema>
  >({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      nama: "",
      no_hp: "",
      sumber: "Walk-in",
      minat_tipe: "",
      marketing_id: null,
      notes: null,
      next_follow_up: null,
    },
  });


  const onSubmit = async (data: LeadInput) => {
    setErrorMessage(null);

    try {
      const res = await createLead(data);

      if (!res.success) {
        const err = res.error || "Gagal menambahkan lead baru";
        setErrorMessage(err);
        toast.error(err);
        return;
      }

      toast.success(res.message || "Lead berhasil ditambahkan!");
      reset({
        nama: "",
        no_hp: "",
        sumber: "Walk-in",
        minat_tipe: "",
        marketing_id: null,
        notes: null,
        next_follow_up: null,
      });

      if (res.data && onSuccess) {
        onSuccess(res.data);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan lead";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border border-mist p-5 sm:p-6 shadow-subtle ${className}`}
    >
      {showTitle && (
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-mist">
          <div className="w-9 h-9 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-carbon-ink tracking-tight font-heading">
              Tambah Prospek Lead Baru
            </h2>
            <p className="text-xs text-slate mt-0.5">
              Catat data kontak konsumen awal sebelum proses survei atau booking unit
            </p>
          </div>
        </div>
      )}

      {/* Duplicate / Validation Error Alert */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-800 font-bold ml-2 text-sm"
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nama Konsumen */}
        <div>
          <label
            htmlFor="nama"
            className="block text-xs font-semibold text-graphite mb-1.5"
          >
            Nama Konsumen <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate">
              <User className="w-4 h-4" />
            </div>
            <input
              id="nama"
              type="text"
              placeholder="Contoh: Hendra Gunawan"
              disabled={isSubmitting}
              {...register("nama")}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal disabled:bg-bone disabled:cursor-not-allowed transition-all"
            />
          </div>
          {errors.nama && (
            <p className="text-xs text-rose-500 mt-1">{errors.nama.message}</p>
          )}
        </div>

        {/* Nomor WhatsApp / HP */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="no_hp"
              className="block text-xs font-semibold text-graphite"
            >
              Nomor WhatsApp / HP <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] text-slate font-medium">
              Harus unik di database
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate">
              <Phone className="w-4 h-4" />
            </div>
            <input
              id="no_hp"
              autoComplete="off"
              type="tel"
              placeholder="Contoh: 081234567890"
              disabled={isSubmitting}
              {...register("no_hp")}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-mist bg-white text-graphite placeholder:text-fog font-mono focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal disabled:bg-bone disabled:cursor-not-allowed transition-all"
            />
          </div>
          {errors.no_hp && (
            <p className="text-xs text-rose-500 mt-1">{errors.no_hp.message}</p>
          )}
        </div>

        {/* Sumber Prospek */}
        <div>
          <label
            htmlFor="sumber"
            className="block text-xs font-semibold text-graphite mb-1.5"
          >
            Sumber Prospek (Lead Source) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate">
              <Compass className="w-4 h-4" />
            </div>
            <select
              id="sumber"
              disabled={isSubmitting}
              {...register("sumber")}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-mist bg-white text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal disabled:bg-bone disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {SUMBER_LEAD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {errors.sumber && (
            <p className="text-xs text-rose-500 mt-1">{errors.sumber.message}</p>
          )}
        </div>

        {/* Minat Tipe Unit (Master Tipe Dropdown - No Manual Input) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="minat_tipe"
              className="block text-xs font-semibold text-graphite"
            >
              Minat Tipe Unit <span className="text-fog font-normal">(Opsional)</span>
            </label>
            <span className="text-[10px] text-slate font-medium">
              Dipilih dari Master Tipe
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate">
              <Home className="w-4 h-4" />
            </div>
            <select
              id="minat_tipe"
              disabled={isSubmitting || isLoadingTipe}
              {...register("minat_tipe")}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-mist bg-white text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal disabled:bg-bone disabled:cursor-not-allowed transition-all cursor-pointer font-medium"
            >
              <option value="">-- Belum Menentukan / Pilih Tipe Unit --</option>
              {internalTipeList.map((t) => (
                <option key={t.id} value={t.nama_tipe}>
                  {t.nama_tipe} ({t.kategori}) — Rp {t.harga_dasar.toLocaleString("id-ID")}
                </option>
              ))}
            </select>
          </div>
          {isLoadingTipe && (
            <p className="text-[11px] text-slate mt-1 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin text-prism-teal" />
              <span>Memuat daftar master tipe...</span>
            </p>
          )}
        </div>

        {/* Tugaskan Marketing (Tersedia jika dibuka oleh Admin/Manager) */}
        {marketingUsers && marketingUsers.length > 0 && (
          <div>
            <label
              htmlFor="marketing_id"
              className="block text-xs font-semibold text-graphite mb-1.5"
            >
              Tugaskan ke Marketing <span className="text-fog font-normal">(Opsional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate">
                <UserPlus className="w-4 h-4" />
              </div>
              <select
                id="marketing_id"
                disabled={isSubmitting}
                {...register("marketing_id", {
                  setValueAs: (val: unknown) =>
                    !val || val === "" || val === "0" ? null : Number(val),
                })}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-mist bg-white text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal disabled:bg-bone disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <option value="">Belum Ditugaskan (Unassigned)</option>
                {marketingUsers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nama} ({m.no_hp})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-mist/80">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors disabled:opacity-50"
            >
              Batal
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-colors disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-prism-teal/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan Prospek...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Simpan Lead</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
