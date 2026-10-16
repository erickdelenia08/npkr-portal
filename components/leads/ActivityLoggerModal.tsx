"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  X,
  PhoneCall,
  MessageCircle,
  Users,
  MapPin,
  MoreHorizontal,
  Calendar,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { activitySchema, ActivityInput } from "@/schemas/activity.schema";
import { createActivity } from "@/actions/activity";
import { JenisAktivitas, HasilAktivitas } from "@/generated/prisma";

interface ActivityLoggerModalProps {
  leadId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const JENIS_OPTIONS: { value: JenisAktivitas; label: string; icon: React.ElementType }[] = [
  { value: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { value: "BERTEMU", label: "Bertemu", icon: Users },
  { value: "LAINNYA", label: "Lainnya", icon: MoreHorizontal },
];

const HASIL_OPTIONS: { value: HasilAktivitas; label: string }[] = [
  { value: "TERTARIK", label: "Tertarik" },
  { value: "MASIH_MIKIR", label: "Masih Mikir" },
  { value: "TIDAK_DIJAWAB", label: "Tidak Dijawab" },
  { value: "MINTA_INFO_LAGI", label: "Minta Info" },
  { value: "TIDAK_JADI", label: "Tidak Jadi" },
];

export function ActivityLoggerModal({
  leadId,
  isOpen,
  onClose,
  onSuccess,
}: ActivityLoggerModalProps) {
  // Format today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityInput>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      lead_id: leadId,
      jenis: "WHATSAPP",
      hasil: "TERTARIK",
      catatan: "",
      tgl_follow_up: "",
    },
  });

  const selectedJenis = watch("jenis");
  const selectedHasil = watch("hasil");
  const selectedFollowUp = watch("tgl_follow_up");

  if (!isOpen) return null;

  const isTidakJadi = selectedHasil === "TIDAK_JADI";

  // Quick Date Shortcut Helper
  const setQuickDate = (daysAhead: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    setValue("tgl_follow_up", target.toISOString().split("T")[0], {
      shouldValidate: true,
    });
  };

  const onSubmit = async (data: ActivityInput) => {
    try {
      const res = await createActivity({
        ...data,
        lead_id: leadId,
        tgl_follow_up: data.tgl_follow_up,
      });

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      toast.success(res.message);
      reset({
        lead_id: leadId,
        jenis: "WHATSAPP",
        hasil: "TERTARIK",
        catatan: "",
        tgl_follow_up: "",
      });
      onSuccess();
      onClose();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Gagal menyimpan aktivitas";
      toast.error(msg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-mist shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Mobile Pull Drag Indicator */}
        <div className="sm:hidden w-12 h-1 bg-slate-200 rounded-full mx-auto my-2 shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-mist bg-bone/30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-carbon-ink tracking-tight">
                3-Tap Catat Aktivitas
              </h2>
              <p className="text-[11px] text-slate">
                Rekam interaksi follow up konsumen secara instan
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate hover:text-graphite hover:bg-bone transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-5 space-y-4 overflow-y-auto flex-1"
        >
          {/* Step 1: Jenis Aktivitas Chips */}
          <div>
            <label className="block text-xs font-semibold text-graphite mb-1.5">
              1. Jenis Interaksi <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {JENIS_OPTIONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = selectedJenis === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setValue("jenis", item.value)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-prism-teal text-white border-prism-teal shadow-2xs"
                        : "bg-white text-slate border-mist hover:bg-bone hover:text-graphite"
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Hasil Aktivitas Chips */}
          <div>
            <label className="block text-xs font-semibold text-graphite mb-1.5">
              2. Hasil Respon Konsumen <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {HASIL_OPTIONS.map((item) => {
                const isSelected = selectedHasil === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setValue("hasil", item.value)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                      isSelected
                        ? item.value === "TIDAK_JADI"
                          ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                          : "bg-deep-teal text-white border-deep-teal shadow-2xs"
                        : "bg-white text-slate border-mist hover:bg-bone hover:text-graphite"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Follow-Up Date (Required) */}
          <div className="p-3 rounded-lg bg-bone/50 border border-mist space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-graphite flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-prism-teal" />
                <span>3. Jadwal Follow-Up Berikutnya</span>
                <span className="text-rose-500">*</span>
              </label>
            </div>

            <div className="space-y-2">
              {/* Quick Date Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setQuickDate(1)}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-white text-graphite border border-mist hover:bg-teal-50 hover:text-deep-teal hover:border-teal-200 transition-colors shrink-0"
                >
                  Besok (+1 Hari)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(3)}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-white text-graphite border border-mist hover:bg-teal-50 hover:text-deep-teal hover:border-teal-200 transition-colors shrink-0"
                >
                  3 Hari Lagi
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(7)}
                  className="px-2.5 py-1 rounded text-[11px] font-medium bg-white text-graphite border border-mist hover:bg-teal-50 hover:text-deep-teal hover:border-teal-200 transition-colors shrink-0"
                >
                  1 Minggu
                </button>
              </div>

              <input
                type="date"
                min={todayStr}
                {...register("tgl_follow_up")}
                className="w-full px-3 py-2 text-xs font-mono rounded-md border border-mist bg-white text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
              />

              {errors.tgl_follow_up && (
                <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{errors.tgl_follow_up.message}</span>
                </p>
              )}
            </div>
          </div>

          {/* Catatan Tambahan (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-graphite mb-1.5">
              Catatan Follow-Up <span className="text-fog font-normal">(Opsional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Konsumen tertarik tipe 36, minta survei hari Sabtu jam 10 pagi..."
              {...register("catatan")}
              className="w-full px-3 py-2 text-xs rounded-md border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-mist shrink-0">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-all disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-prism-teal/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Aktivitas</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
