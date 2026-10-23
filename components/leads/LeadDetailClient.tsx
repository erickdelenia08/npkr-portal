// components/leads/LeadDetailClient.tsx
"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Plus,
  Calendar,
  Clock,
  Compass,
  Home,
  User,
  RefreshCw,
  AlertTriangle,
  Loader2,
  X,
  XCircle,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { SerializedLeadDetail, getLeadDetail } from "@/actions/activity";
import { markLeadLost } from "@/actions/lead";
import { LeadTahap } from "@/lib/lead-utils";
import { LeadMilestoneStepper } from "./LeadMilestoneStepper";
import { LeadDynamicActionCard } from "./LeadDynamicActionCard";
import { ActivityTimeline } from "./ActivityTimeline";
import { ActivityLoggerModal } from "./ActivityLoggerModal";
import { HandoverDialog } from "@/components/forms/handover-dialog";

interface LeadDetailClientProps {
  initialLead: SerializedLeadDetail;
  currentUserId?: number;
  currentUserRole?: string;
  basePath?: string;
}

const LOST_REASON_PRESETS = [
  "Budget belum sesuai",
  "Lokasi perumahan kurang cocok",
  "Sudah beli di tempat lain",
  "Pengajuan KPR ditolak",
  "Tidak respon / Nomor tidak aktif",
];

const toDate = (val: Date | string | null | undefined): Date | null => {
  if (!val) return null;
  const d = typeof val === "string" ? new Date(val) : val;
  return isNaN(d.getTime()) ? null : d;
};

const formatDate = (val: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
  const d = toDate(val);
  if (!d) return "-";
  return d.toLocaleDateString("id-ID", options || { day: "numeric", month: "short", year: "numeric" });
};

/** Normalisasi nomor HP Indonesia -> format wa.me (62xxxxxxxx). */
const formatWaLink = (noHp: string, nama: string): string => {
  let clean = (noHp || "").replace(/\D/g, "");
  if (clean.startsWith("0")) clean = "62" + clean.slice(1);
  else if (clean.startsWith("8")) clean = "62" + clean;
  const message = encodeURIComponent(
    `Halo Bpk/Ibu ${nama}, saya dari tim marketing NPKR Property. Terkait informasi perumahan yang Anda minati...`
  );
  return `https://wa.me/${clean}?text=${message}`;
};

const getTahapBadge = (tahap: LeadTahap | string): string => {
  switch (tahap) {
    case "Lead Masuk":
    case "BARU":
    case "FOLLOW_UP":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "Survei Dijadwalkan":
    case "SURVEI_DIJADWALKAN":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "Sudah Survei":
    case "SUDAH_SURVEI":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "Closing":
    case "ITJ":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Lost":
    case "LOST":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

export function LeadDetailClient({
  initialLead,
  currentUserId,
  currentUserRole,
  basePath = "/marketing",
}: LeadDetailClientProps) {
  const router = useRouter();
  const [lead, setLead] = useState<SerializedLeadDetail>(initialLead);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState<boolean>(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState<boolean>(false);
  const [lostReason, setLostReason] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Sinkronkan jika server component mengirim data baru (setelah router.refresh())
  useEffect(() => {
    setLead(initialLead);
  }, [initialLead]);

  // Tutup modal Lost dengan tombol Escape
  useEffect(() => {
    if (!isLostModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) setIsLostModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLostModalOpen, isPending]);

  const canEdit =
    currentUserRole === "ADMIN" ||
    (Number.isSafeInteger(currentUserId) && currentUserId === lead.marketing_id);

  const canHandover = canEdit || currentUserRole === "MANAGER";

  const fetchLatestLead = async () => {
    const res = await getLeadDetail(lead.id);
    if (res.success && res.data) {
      setLead(res.data);
    }
    router.refresh();
  };

  const handleRefresh = () => {
    startTransition(async () => {
      await fetchLatestLead();
    });
  };

  const handleActivitySuccess = async () => {
    await fetchLatestLead();
  };

  const handleConfirmLost = () => {
    if (!lostReason.trim()) {
      toast.error("Alasan pembatalan (Lost) wajib diisi");
      return;
    }

    startTransition(async () => {
      try {
        const res = await markLeadLost(lead.id, lostReason.trim());
        if (res.success) {
          toast.success(res.message);
          setIsLostModalOpen(false);
          setLostReason("");
          await fetchLatestLead();
        } else {
          toast.error(res.message || "Gagal menandai lead lost");
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
      }
    });
  };

  const waHref = formatWaLink(lead.no_hp, lead.nama);
  const isLost = Boolean(lead.lost_at);

  // Follow-up terdekat yang belum lewat; jika tidak ada, tandai yang terakhir sebagai terlewat
  const followUp = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const dates = lead.aktivitas
      .map((a) => toDate(a.tgl_follow_up))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    const upcoming = dates.find((d) => d.getTime() >= startOfToday.getTime());
    if (upcoming) return { date: upcoming, overdue: false };

    const last = dates[dates.length - 1];
    return last ? { date: last, overdue: true } : null;
  }, [lead.aktivitas]);

  return (
    <div className="space-y-5 pb-28 sm:pb-16 max-w-4xl mx-auto">
      {/* Breadcrumb & refresh */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`${basePath}/lead`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate hover:text-carbon-ink transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Kembali ke daftar lead</span>
        </Link>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          aria-label="Segarkan data lead"
          className="p-1.5 rounded-lg border border-mist bg-white text-slate hover:text-graphite transition-colors disabled:opacity-50 cursor-pointer"
          title="Segarkan data lead"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Banner Lost (terlihat di atas, bukan tersembunyi di bawah halaman) */}
      {isLost && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="text-xs">
            <p className="font-bold">Lead ini ditandai Tidak Jadi (Lost)</p>
            <p className="text-rose-700">Sejak {formatDate(lead.lost_at)}. Aksi survei dan ITJ dinonaktifkan.</p>
          </div>
        </div>
      )}

      {/* Banner Read-Only untuk non-PIC / Manager */}
      {!canEdit && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Mode Hanya Baca (Read-Only)</p>
            <p className="text-amber-800 mt-0.5">
              Anda melihat detail lead ini dalam mode hanya baca. Perubahan data, survei, dan pencatatan aktivitas hanya dapat dilakukan oleh Marketing PIC ({lead.marketing?.nama || "PIC"}) atau Administrator.
              {currentUserRole === "MANAGER" && (
                <span className="block mt-1 font-semibold text-teal-800">
                  Sebagai Manager, Anda tetap memiliki hak akses untuk mengalihkan PIC (Oper PIC).
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Milestone stepper (read-only) */}
      <LeadMilestoneStepper lead={lead} />

      {/* Kartu aksi utama: langsung di bawah stepper supaya next step jelas */}
      {!isLost && <LeadDynamicActionCard lead={lead} onRefresh={fetchLatestLead} basePath={basePath} canEdit={canEdit} />}

      {/* Profil lead */}
      <div className="bg-white rounded-2xl border border-mist p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-lg shrink-0">
              {lead.nama.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-carbon-ink tracking-tight break-words">
                  {lead.nama}
                </h1>
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getTahapBadge(lead.tahap)}`}
                >
                  {lead.tahap}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs font-mono text-slate">
                <Phone className="w-3.5 h-3.5" />
                <span>{lead.no_hp}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </a>
            {canHandover && (
              <HandoverDialog
                leadId={lead.id}
                currentMarketingId={lead.marketing_id}
                currentMarketingName={lead.marketing?.nama}
                onSuccess={fetchLatestLead}
              />
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsActivityModalOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-prism-teal hover:bg-deep-teal text-white text-xs font-semibold transition-all cursor-pointer shadow-subtle"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Aktivitas</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-mist">
          <div className="p-2.5 rounded-lg bg-bone/50 border border-mist space-y-0.5">
            <span className="text-[11px] font-semibold text-slate flex items-center gap-1">
              <Compass className="w-3 h-3" />
              Sumber
            </span>
            <p className="text-xs font-bold text-carbon-ink truncate">{lead.sumber}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-bone/50 border border-mist space-y-0.5">
            <span className="text-[11px] font-semibold text-slate flex items-center gap-1">
              <Home className="w-3 h-3" />
              Minat unit
            </span>
            <p className="text-xs font-bold text-carbon-ink truncate">{lead.minat_tipe || "Belum menentukan"}</p>
          </div>
          <div
            className={`p-2.5 rounded-lg border space-y-0.5 ${followUp?.overdue ? "bg-rose-50 border-rose-200" : "bg-bone/50 border-mist"
              }`}
          >
            <span className="text-[11px] font-semibold text-slate flex items-center gap-1">
              <Calendar className={`w-3 h-3 ${followUp?.overdue ? "text-rose-600" : "text-amber-600"}`} />
              Follow-up berikutnya
            </span>
            <p
              className={`text-xs truncate ${!followUp
                ? "text-slate font-normal"
                : followUp.overdue
                  ? "text-rose-700 font-bold"
                  : "text-amber-700 font-bold"
                }`}
            >
              {!followUp
                ? "Belum dijadwalkan"
                : followUp.overdue
                  ? `Terlewat · ${formatDate(followUp.date)}`
                  : formatDate(followUp.date)}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-bone/50 border border-mist space-y-0.5">
            <span className="text-[11px] font-semibold text-slate flex items-center gap-1">
              <User className="w-3 h-3" />
              Marketing PIC
            </span>
            <p className="text-xs font-bold text-carbon-ink truncate">{lead.marketing?.nama || "Belum ditugaskan"}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-mist text-[11px] text-slate">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Terdaftar {formatDate(lead.created_at)}
          </span>
          {lead.updated_at && (
            <span className="hidden sm:inline-block">Diperbarui {formatDate(lead.updated_at)}</span>
          )}
        </div>
      </div>

      {/* Riwayat aktivitas */}
      <ActivityTimeline activities={lead.aktivitas} />

      {/* Tombol Lost di paling bawah (aksi destruktif dijauhkan dari aksi utama) */}
      {!isLost && canEdit && (
        <div className="pt-6 pb-4 border-t border-mist flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsLostModalOpen(true)}
            className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Tandai Tidak Jadi (Lost)</span>
          </button>
        </div>
      )}

      {/* Bar aksi mobile: WhatsApp + Catat Aktivitas (jika canEdit) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-md border-t border-mist z-30 shadow-lg">
        <div className={`grid ${canEdit ? "grid-cols-5" : "grid-cols-1"} gap-2 max-w-md mx-auto`}>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`${canEdit ? "col-span-2" : "col-span-1"} flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold active:bg-emerald-100 transition-colors`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsActivityModalOpen(true)}
              className="col-span-3 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-prism-teal active:bg-deep-teal text-white text-xs font-bold transition-all shadow-subtle cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Aktivitas</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal catat aktivitas */}
      <ActivityLoggerModal
        leadId={lead.id}
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSuccess={handleActivitySuccess}
      />

      {/* Konfirmasi Lost */}
      {isLostModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lost-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setIsLostModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-mist shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mist">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 id="lost-title" className="text-sm font-bold text-carbon-ink">
                  Tandai Tidak Jadi (Lost)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLostModalOpen(false)}
                disabled={isPending}
                aria-label="Tutup"
                className="p-1 rounded-full text-slate hover:text-graphite hover:bg-bone"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate">
                Yakin menandai <strong>{lead.nama}</strong> sebagai Lost? Pilih atau tulis alasannya.
              </p>

              <div>
                <span className="block text-[11px] font-semibold text-graphite mb-1.5">Alasan cepat</span>
                <div className="flex flex-wrap gap-1.5">
                  {LOST_REASON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLostReason(preset)}
                      className={`text-[11px] py-1 px-2.5 rounded-md border transition-colors cursor-pointer ${lostReason === preset
                        ? "bg-rose-50 text-rose-700 border-rose-300 font-semibold"
                        : "bg-white text-slate border-mist hover:bg-bone hover:text-graphite"
                        }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="lost-reason" className="block text-[11px] font-semibold text-graphite mb-1">
                  Alasan Lost <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="lost-reason"
                  rows={2}
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  placeholder="Contoh: Konsumen memilih unit di lokasi lain karena lebih dekat ke kantor..."
                  className="w-full px-3 py-2 text-xs rounded-md border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-mist">
              <button
                type="button"
                onClick={() => setIsLostModalOpen(false)}
                disabled={isPending}
                className="px-3.5 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmLost}
                disabled={isPending || !lostReason.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-subtle transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Konfirmasi Lost</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}