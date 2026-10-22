// components/leads/LeadDynamicActionCard.tsx
"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  CheckCircle2,
  CalendarCheck2,
  FileText,
  Edit3,
  Loader2,
  X,
  FileWarning,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { SerializedLeadDetail } from "@/actions/activity";
import { scheduleSurvey, completeSurvey } from "@/actions/lead";

interface LeadDynamicActionCardProps {
  lead: SerializedLeadDetail;
  onRefresh: () => Promise<void> | void;
  basePath?: string;
}

/* ------------------------------------------------------------------ */
/* KONFIGURASI — samakan dengan enum di schema.prisma                  */
/* ------------------------------------------------------------------ */
const ITJ_APPROVED = ["DISETUJUI", "APPROVED"];
const ITJ_PENDING = ["MENUNGGU", "DIAJUKAN", "PENDING"];
const ITJ_REJECTED = ["DITOLAK", "REJECTED"];

// true  = setelah ITJ ditolak, marketing boleh ajukan ulang
// false = tombol ajukan hilang setelah ditolak
const ALLOW_RESUBMIT_AFTER_REJECT = true;

/** Bentuk minimal data ITJ yang dibaca komponen ini (aman untuk objek maupun array). */
interface ItjLike {
  status?: string | null;
  nominal?: number | null;
  diajukan_at?: Date | string | null;
  alasan_tolak?: string | null;
  unit?: { blok?: string | null } | null;
  transaksi_id?: number | string | null;
  transaksi?: { id?: number | string | null } | null;
}

const toTime = (v: Date | string | null | undefined): number => {
  if (!v) return 0;
  const t = (typeof v === "string" ? new Date(v) : v).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const pad = (n: number) => n.toString().padStart(2, "0");

/** Format Date -> "YYYY-MM-DDTHH:mm" (waktu lokal) untuk input datetime-local. */
const toLocalInputValue = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

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

/** Ringkasan unit / nominal / tanggal ITJ. */
function ItjSummary({ itj, tone }: { itj: ItjLike; tone: "emerald" | "amber" | "rose" }) {
  const toneClass = {
    emerald: "border-emerald-100 text-emerald-800",
    amber: "border-amber-100 text-amber-800",
    rose: "border-rose-100 text-rose-800",
  }[tone];

  return (
    <dl className={`pt-3 border-t ${toneClass} grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs`}>
      {itj.unit?.blok && (
        <div>
          <dt className="opacity-70">Unit</dt>
          <dd className="font-bold">{itj.unit.blok}</dd>
        </div>
      )}
      {typeof itj.nominal === "number" && (
        <div>
          <dt className="opacity-70">Nominal</dt>
          <dd className="font-bold">Rp {itj.nominal.toLocaleString("id-ID")}</dd>
        </div>
      )}
      <div>
        <dt className="opacity-70">Tgl pengajuan</dt>
        <dd className="font-bold">{formatDateOnly(itj.diajukan_at)}</dd>
      </div>
    </dl>
  );
}

export function LeadDynamicActionCard({
  lead,
  onRefresh,
  basePath = "/marketing",
}: LeadDynamicActionCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [surveyDateTime, setSurveyDateTime] = useState<string>("");

  /* -------------------------- Derive state -------------------------- */
  const { activeItj, isApproved, isWaiting, isRejected } = useMemo(() => {
    const raw: unknown = lead.itj;
    const list: ItjLike[] = !raw ? [] : Array.isArray(raw) ? (raw as ItjLike[]) : [raw as ItjLike];

    // Terbaru di depan
    const sorted = [...list].sort((a, b) => toTime(b.diajukan_at) - toTime(a.diajukan_at));

    // Prioritas: disetujui > menunggu > yang terbaru (mis. ditolak)
    const active =
      sorted.find((i) => ITJ_APPROVED.includes(String(i.status).toUpperCase())) ??
      sorted.find((i) => ITJ_PENDING.includes(String(i.status).toUpperCase())) ??
      sorted[0];

    const status = String(active?.status ?? "").toUpperCase();

    return {
      activeItj: active,
      isApproved: ITJ_APPROVED.includes(status) || Boolean(lead.closing_at),
      isWaiting: ITJ_PENDING.includes(status),
      isRejected: ITJ_REJECTED.includes(status),
    };
  }, [lead.itj, lead.closing_at]);

  const isSurveyCompleted = Boolean(lead.survei_selesai_at);
  const isSurveyScheduled = Boolean(lead.survei_jadwal_at) && !isSurveyCompleted;

  // Sumber kebenaran tunggal untuk tombol "Ajukan ITJ"
  const canSubmitItj =
    !isApproved &&
    !isWaiting &&
    (isRejected ? ALLOW_RESUBMIT_AFTER_REJECT : isSurveyCompleted);

  // Route transaksi dinamis (transaksi/[id]): tombol hanya muncul jika id sudah ada
  const transaksiId =
    activeItj?.transaksi_id ?? activeItj?.transaksi?.id ?? null;
  const transaksiHref = transaksiId ? `${basePath}/transaksi/${transaksiId}` : null;

  /* ------------------------------ Modal ------------------------------ */
  useEffect(() => {
    if (!isScheduleModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) setIsScheduleModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isScheduleModalOpen, isPending]);

  const handleOpenScheduleModal = () => {
    if (lead.survei_jadwal_at) {
      setSurveyDateTime(toLocalInputValue(new Date(lead.survei_jadwal_at)));
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      setSurveyDateTime(toLocalInputValue(tomorrow));
    }
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = () => {
    if (!surveyDateTime) {
      toast.error("Pilih tanggal dan jam survei");
      return;
    }
    const picked = new Date(surveyDateTime);
    if (isNaN(picked.getTime()) || picked.getTime() < Date.now() - 60_000) {
      toast.error("Jadwal survei tidak boleh di masa lalu");
      return;
    }

    startTransition(async () => {
      try {
        const res = await scheduleSurvey(lead.id, picked);
        if (res.success) {
          toast.success(res.message);
          setIsScheduleModalOpen(false);
          await onRefresh();
        } else {
          toast.error(res.message || "Gagal menjadwalkan survei");
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
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
        toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    });
  };

  /* ------------------------------ Render ----------------------------- */
  return (
    <>
      <div className="bg-white rounded-2xl border border-mist p-5 shadow-2xs space-y-4">
        {/* 1. ITJ disetujui / closing -> tombol ke transaksi */}
        {isApproved && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">ITJ disetujui, transaksi aktif</h3>
                <p className="text-xs text-emerald-700">
                  Unit sudah di-booking. Lanjutkan proses dokumen di halaman transaksi.
                </p>
              </div>
            </div>

            {activeItj && <ItjSummary itj={activeItj} tone="emerald" />}

            {transaksiHref && (
              <Link
                href={transaksiHref}
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-subtle transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Buka Transaksi</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}

        {/* 2. ITJ menunggu persetujuan -> tidak ada tombol ajukan */}
        {!isApproved && isWaiting && activeItj && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">Menunggu persetujuan ITJ</h3>
                <p className="text-xs text-amber-800">
                  Pengajuan sudah dikirim. Tombol ajukan disembunyikan agar tidak terkirim dua kali.
                </p>
              </div>
            </div>
            <ItjSummary itj={activeItj} tone="amber" />

            {transaksiHref && (
              <Link
                href={transaksiHref}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Buka Transaksi</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}

        {/* 3. ITJ ditolak -> alasan + ajukan ulang (opsional) */}
        {!isApproved && !isWaiting && isRejected && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <FileWarning className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-950">Pengajuan ITJ ditolak</h3>
                  <p className="text-xs text-rose-800">
                    {activeItj?.alasan_tolak
                      ? `Alasan: ${activeItj.alasan_tolak}`
                      : ALLOW_RESUBMIT_AFTER_REJECT
                        ? "Perbaiki data lalu ajukan ulang."
                        : "Hubungi admin jika perlu pengajuan baru."}
                  </p>
                </div>
              </div>
              {activeItj && <ItjSummary itj={activeItj} tone="rose" />}
            </div>

            {canSubmitItj && (
              <Link
                href={`${basePath}/lead/${lead.id}/itj`}
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-prism-teal hover:bg-deep-teal active:bg-deep-teal text-white text-xs font-bold shadow-subtle transition-all"
              >
                <FileText className="w-4 h-4" />
                <span>Ajukan Ulang ITJ</span>
              </Link>
            )}
          </div>
        )}

        {/* 4. Belum ada ITJ -> alur survei */}
        {!isApproved && !isWaiting && !isRejected && (
          <>
            {isSurveyCompleted ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-teal-50/60 border border-teal-100">
                  <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-teal-950">Survei lokasi sudah terlaksana</h3>
                    <p className="text-[11px] text-teal-700">
                      Selesai {formatDateOnly(lead.survei_selesai_at)}. Lanjutkan dengan mengajukan Ikatan Tanda Jadi (ITJ).
                    </p>
                  </div>
                </div>

                {canSubmitItj && (
                  <Link
                    href={`${basePath}/lead/${lead.id}/itj`}
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-prism-teal hover:bg-deep-teal active:bg-deep-teal text-white text-xs font-bold shadow-subtle transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Ajukan ITJ</span>
                  </Link>
                )}
              </div>
            ) : isSurveyScheduled ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Jadwal survei lokasi
                    </span>
                    <span className="text-xs font-semibold text-purple-900 font-mono">
                      {formatDateTime(lead.survei_jadwal_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-800">
                    Pastikan marketing siap mendampingi konsumen pada jam yang disepakati.
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
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-bone/70 border border-mist">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-prism-teal flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-carbon-ink">Survei lokasi belum dijadwalkan</h3>
                    <p className="text-[11px] text-slate">
                      Ajak calon konsumen melihat lokasi proyek dan unit contoh.
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
          </>
        )}
      </div>

      {/* Modal jadwal survei */}
      {isScheduleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setIsScheduleModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-mist shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mist">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 id="schedule-title" className="text-sm font-bold text-carbon-ink">
                  {lead.survei_jadwal_at ? "Ubah Jadwal Survei" : "Jadwalkan Survei"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                disabled={isPending}
                aria-label="Tutup"
                className="p-1 rounded-full text-slate hover:text-graphite hover:bg-bone"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label htmlFor="survey-datetime" className="block text-xs font-semibold text-graphite">
                Tanggal &amp; waktu survei <span className="text-rose-500">*</span>
              </label>
              <input
                id="survey-datetime"
                type="datetime-local"
                value={surveyDateTime}
                min={toLocalInputValue(new Date())}
                onChange={(e) => setSurveyDateTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-md border border-mist bg-white text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
              />
              <p className="text-[11px] text-slate">
                Milestone dan riwayat aktivitas akan diperbarui otomatis.
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
                disabled={isPending || !surveyDateTime}
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