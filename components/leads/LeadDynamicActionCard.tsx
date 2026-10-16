// components/leads/LeadDynamicActionCard.tsx
"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle2,
  CalendarCheck2,
  AlertCircle,
  FileText,
  Edit3,
  Loader2,
  X,
  FileWarning,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { SerializedLeadDetail } from "@/actions/activity";
import { scheduleSurvey, completeSurvey } from "@/actions/lead";

interface LeadDynamicActionCardProps {
  lead: SerializedLeadDetail;
  onRefresh: () => Promise<void> | void;
}

export function LeadDynamicActionCard({ lead, onRefresh }: LeadDynamicActionCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [surveyDateTime, setSurveyDateTime] = useState<string>("");

  // Format Helper
  const formatDateTime = (val: Date | string | null | undefined): string => {
    if (!val) return "-";
    const date = typeof val === "string" ? new Date(val) : val;
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (val: Date | string | null | undefined): string => {
    if (!val) return "-";
    const date = typeof val === "string" ? new Date(val) : val;
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Open schedule modal with initial value
  const handleOpenScheduleModal = () => {
    if (lead.survei_jadwal_at) {
      const d = new Date(lead.survei_jadwal_at);
      // Format to YYYY-MM-DDTHH:mm for datetime-local input
      const pad = (n: number) => n.toString().padStart(2, "0");
      const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setSurveyDateTime(localStr);
    } else {
      // Default to tomorrow 10:00 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const pad = (n: number) => n.toString().padStart(2, "0");
      const localStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T10:00`;
      setSurveyDateTime(localStr);
    }
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = () => {
    if (!surveyDateTime) {
      toast.error("Pilih tanggal dan jam survei");
      return;
    }

    startTransition(async () => {
      try {
        const res = await scheduleSurvey(lead.id, new Date(surveyDateTime));
        if (res.success) {
          toast.success(res.message);
          setIsScheduleModalOpen(false);
          await onRefresh();
        } else {
          toast.error(res.message || "Gagal menjadwalkan survei");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
        toast.error(msg);
      }
    });
  };

  const handleMarkSurveyCompleted = () => {
    startTransition(async () => {
      try {
        const res = await completeSurvey(lead.id);
        if (res.success) {
          toast.success(res.message);
          await onRefresh();
        } else {
          toast.error(res.message || "Gagal menandai survei selesai");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
        toast.error(msg);
      }
    });
  };

  // Determine State
  const itjStatus = lead.itj?.status;
  const isSurveyScheduled = Boolean(lead.survei_jadwal_at) && !lead.survei_selesai_at;
  const isSurveyCompleted = Boolean(lead.survei_selesai_at);

  return (
    <>
      <div className="bg-white rounded-2xl border border-mist p-5 shadow-2xs space-y-4">
        {/* State 1: ITJ is 'DIAJUKAN' */}
        {itjStatus === "DIAJUKAN" && (
          <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-sky-950">
                  ITJ Menunggu Persetujuan Admin
                </h3>
                <p className="text-xs text-sky-700">
                  Pengajuan ITJ sedang direview oleh Branch Manager / Admin. Harap tunggu keputusan verifikasi berkas.
                </p>
              </div>
            </div>
            {lead.itj && (
              <div className="pt-2 border-t border-sky-100 flex flex-wrap items-center gap-4 text-xs font-medium text-sky-800">
                {lead.itj.unit && <span>Unit: <strong>{lead.itj.unit.blok}</strong></span>}
                <span>Nominal: <strong>Rp {lead.itj.nominal.toLocaleString("id-ID")}</strong></span>
                <span>Diajukan: <strong>{formatDateOnly(lead.itj.diajukan_at)}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* State 2: ITJ is 'PERLU_REVISI' */}
        {itjStatus === "PERLU_REVISI" && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                <FileWarning className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-950">
                  ITJ Perlu Revisi
                </h3>
                <p className="text-xs text-amber-800">
                  Reviewer meminta perbaikan dokumen atau data pengajuan ITJ.
                </p>
                {lead.itj?.latestReview?.catatan && (
                  <div className="mt-2 p-2.5 rounded-lg bg-white/80 border border-amber-200 text-xs text-amber-900 italic">
                    &ldquo;{lead.itj.latestReview.catatan}&rdquo;
                  </div>
                )}
              </div>
            </div>
            <div className="pt-1">
              <Link
                href={`/marketing/lead/${lead.id}/itj`}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Revisi ITJ</span>
              </Link>
            </div>
          </div>
        )}

        {/* State 3: ITJ is 'DITOLAK' */}
        {itjStatus === "DITOLAK" && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-rose-950">
                  Pengajuan ITJ Ditolak
                </h3>
                <p className="text-xs text-rose-800">
                  Pengajuan ITJ sebelumnya tidak disetujui. Anda dapat mengajukan ITJ baru dengan data yang sesuai.
                </p>
                {lead.itj?.latestReview?.catatan && (
                  <div className="mt-2 p-2.5 rounded-lg bg-white/80 border border-rose-200 text-xs text-rose-900 italic">
                    Catatan: &ldquo;{lead.itj.latestReview.catatan}&rdquo;
                  </div>
                )}
              </div>
            </div>
            <div className="pt-1">
              <Link
                href={`/marketing/lead/${lead.id}/itj`}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Ajukan ITJ</span>
              </Link>
            </div>
          </div>
        )}

        {/* State 4: ITJ is 'DISETUJUI' or Closing Reached */}
        {(itjStatus === "DISETUJUI" || Boolean(lead.closing_at)) && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  ITJ Disetujui (Closing Selesai)
                </h3>
                <p className="text-xs text-emerald-700">
                  Selamat! Pengajuan ITJ telah disetujui dan transaksi penjualan tercatat.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Non-ITJ States (Survey Workflow) */}
        {!itjStatus && (
          <div>
            {/* Sub-State: Survey Completed -> Ajukan ITJ */}
            {isSurveyCompleted ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl bg-teal-50/60 border border-teal-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-teal-950">
                        Survei Lokasi Sudah Terlaksana
                      </h3>
                      <p className="text-[11px] text-teal-700">
                        Selesai: {formatDateOnly(lead.survei_selesai_at)}. Lanjutkan ke pengajuan Ikatan Tanda Jadi (ITJ).
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/marketing/lead/${lead.id}/itj`}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-prism-teal hover:bg-deep-teal active:bg-deep-teal text-white text-xs font-bold shadow-subtle transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ajukan ITJ</span>
                </Link>
              </div>
            ) : isSurveyScheduled ? (
              /* Sub-State: Survey Scheduled -> Tandai Sudah Survei & Ubah Jadwal */
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wide flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Jadwal Survei Lokasi
                    </span>
                    <span className="text-xs font-semibold text-purple-900 font-mono">
                      {formatDateTime(lead.survei_jadwal_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-800">
                    Pastikan marketing siap mendampingi konsumen pada jam yang telah disepakati.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleMarkSurveyCompleted}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CalendarCheck2 className="w-4 h-4" />
                    )}
                    <span>Tandai Sudah Survei</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenScheduleModal}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-bone text-graphite border border-mist text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-slate" />
                    <span>Ubah Jadwal</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Sub-State: No Survey Yet -> Jadwalkan Survei */
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-bone/70 border border-mist">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-prism-teal flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-carbon-ink">
                      Survei Lokasi Belum Dijadwalkan
                    </h3>
                    <p className="text-[11px] text-slate">
                      Ajak calon konsumen untuk melihat lokasi proyek dan unit contoh.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenScheduleModal}
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-prism-teal hover:bg-deep-teal active:bg-deep-teal text-white text-xs font-bold shadow-subtle transition-all cursor-pointer disabled:opacity-50"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Jadwalkan Survei</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule / Reschedule Survey Modal */}
      {isScheduleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-mist shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mist">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-carbon-ink">
                  {lead.survei_jadwal_at ? "Ubah Jadwal Survei" : "Jadwalkan Survei"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 rounded-full text-slate hover:text-graphite hover:bg-bone"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-graphite">
                Pilih Tanggal &amp; Waktu Survei <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={surveyDateTime}
                onChange={(e) => setSurveyDateTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md border border-mist bg-white text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
              />
              <p className="text-[11px] text-slate">
                Sistem akan memperbarui milestone dan mencatat riwayat aktivitas secara otomatis.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-mist">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                disabled={isPending}
                className="px-3.5 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simpan Jadwal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
