// components/leads/LeadDetailClient.tsx
"use client";

import React, { useState, useTransition } from "react";
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
  Sparkles,
  RefreshCw,
  PhoneCall,
  AlertTriangle,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { SerializedLeadDetail, getLeadDetail } from "@/actions/activity";
import { markLeadLost } from "@/actions/lead";
import { LeadTahap } from "@/lib/lead-utils";
import { LeadMilestoneStepper } from "./LeadMilestoneStepper";
import { LeadDynamicActionCard } from "./LeadDynamicActionCard";
import { ActivityTimeline } from "./ActivityTimeline";
import { ActivityLoggerModal } from "./ActivityLoggerModal";

interface LeadDetailClientProps {
  initialLead: SerializedLeadDetail;
}

const LOST_REASON_PRESETS = [
  "Budget belum sesuai",
  "Lokasi perumahan kurang cocok",
  "Sudah beli di tempat lain",
  "Pengajuan KPR ditolak",
  "Tidak respon / Nomor tidak aktif",
];

export function LeadDetailClient({ initialLead }: LeadDetailClientProps) {
  const router = useRouter();
  const [lead, setLead] = useState<SerializedLeadDetail>(initialLead);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState<boolean>(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState<boolean>(false);
  const [lostReason, setLostReason] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const formatWaLink = (noHp: string, nama: string): string => {
    let clean = noHp.replace(/[\s-+]/g, "");
    if (clean.startsWith("0")) clean = "62" + clean.slice(1);
    const message = encodeURIComponent(
      `Halo Bpk/Ibu ${nama}, saya dari tim marketing NPKR Property. Terkait informasi perumahan yang Anda minati...`
    );
    return `https://wa.me/${clean}?text=${message}`;
  };

  const formatDate = (val: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (!val) return "-";
    const date = typeof val === "string" ? new Date(val) : val;
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", options || { day: "numeric", month: "short", year: "numeric" });
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
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
        toast.error(msg);
      }
    });
  };

  const waHref = formatWaLink(lead.no_hp, lead.nama);
  const callHref = `tel:${lead.no_hp}`;
  const nextFollowUp = lead.aktivitas.find((a) => a.tgl_follow_up)?.tgl_follow_up;
  const isLost = Boolean(lead.lost_at);

  return (
    <div className="space-y-6 pb-24 sm:pb-16 max-w-4xl mx-auto">
      {/* Top Breadcrumb & Quick Navigation Bar */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/marketing/lead"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate hover:text-carbon-ink transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Kembali ke Daftar Lead</span>
        </Link>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="p-1.5 rounded-lg border border-mist bg-white text-slate hover:text-graphite transition-colors disabled:opacity-50 cursor-pointer"
          title="Segarkan data lead"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* 1. Read-Only Milestone Stepper at the top */}
      <LeadMilestoneStepper lead={lead} />

      {/* Main Profile Info Card */}
      <div className="bg-white rounded-2xl border border-mist p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-lg shrink-0">
              {lead.nama.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-carbon-ink tracking-tight">
                  {lead.nama}
                </h1>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getTahapBadge(lead.tahap)}`}>
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
            <a
              href={callHref}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bone text-graphite hover:bg-slate-200 border border-mist text-xs font-semibold transition-colors"
            >
              <PhoneCall className="w-4 h-4 text-slate" />
              <span>Telepon</span>
            </a>
            <button
              type="button"
              onClick={() => setIsActivityModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-prism-teal hover:bg-deep-teal text-white text-xs font-semibold transition-all cursor-pointer shadow-subtle"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Aktivitas</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-mist">
          <div className="p-2.5 rounded-lg bg-bone/50 border border-mist space-y-0.5">
            <span className="text-[10px] font-semibold text-slate uppercase flex items-center gap-1">
              <Compass className="w-3 h-3" />Sumber
            </span>
            <p className="text-xs font-bold text-carbon-ink truncate">{lead.sumber}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-bone/50 border border-mist space-y-0.5">
            <span className="text-[10px] font-semibold text-slate uppercase flex items-center gap-1">
              <Home className="w-3 h-3" />Minat Unit
            </span>
            <p className="text-xs font-bold text-carbon-ink truncate">{lead.minat_tipe || "Belum Menentukan"}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-bone/50 border border-mist space-y-0.5">
            <span className="text-[10px] font-semibold text-slate uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-600" />Next Follow-Up
            </span>
            <p className={`text-xs font-bold truncate ${nextFollowUp ? "text-amber-700" : "text-slate font-normal"}`}>
              {nextFollowUp ? formatDate(nextFollowUp) : "Belum dijadwalkan"}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-bone/50 border border-mist space-y-0.5">
            <span className="text-[10px] font-semibold text-slate uppercase flex items-center gap-1">
              <User className="w-3 h-3" />Marketing PIC
            </span>
            <p className="text-xs font-bold text-carbon-ink truncate">{lead.marketing?.nama || "Belum ditugaskan"}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-mist text-[11px] text-slate">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />Terdaftar: {formatDate(lead.created_at)}
          </span>
          {lead.updated_at && (
            <span className="hidden sm:inline-block">
              Pembaruan Terakhir: {formatDate(lead.updated_at)}
            </span>
          )}
        </div>
      </div>

      {/* 2. Dynamic Main Action Card based on Milestone or ITJ Status */}
      <LeadDynamicActionCard lead={lead} onRefresh={fetchLatestLead} />

      {/* Follow-up Fast Action Banner */}
      <div className="bg-gradient-to-r from-teal-50/70 via-white to-teal-50/40 rounded-xl border border-teal-100 p-4 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-carbon-ink">Tindak Lanjut &amp; Catat Aktivitas</h2>
            <p className="text-[11px] text-slate">Simpan riwayat interaksi konsumen (WA, Pertemuan, dll.)</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsActivityModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-prism-teal hover:bg-deep-teal text-white text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-subtle"
        >
          <Plus className="w-4 h-4" />
          <span>Catat</span>
        </button>
      </div>

      {/* Activity Timeline */}
      <ActivityTimeline activities={lead.aktivitas} />

      {/* 4. Lost Button at the very bottom of the page */}
      <div className="pt-6 pb-4 border-t border-mist flex flex-col items-center justify-center space-y-2">
        {!isLost ? (
          <button
            type="button"
            onClick={() => setIsLostModalOpen(true)}
            className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Tidak Jadi (Lost)</span>
          </button>
        ) : (
          <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Lead ini sudah ditandai Tidak Jadi (Lost)</span>
          </p>
        )}
      </div>

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-mist z-30 shadow-lg">
        <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold active:bg-emerald-100 transition-colors"
          >
            <MessageCircle className="w-4 h-4 mb-0.5" /> WA
          </a>
          <a
            href={callHref}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-bone text-graphite border border-mist text-[10px] font-semibold active:bg-slate-200 transition-colors"
          >
            <PhoneCall className="w-4 h-4 mb-0.5" /> Telepon
          </a>
          <button
            type="button"
            onClick={() => setIsActivityModalOpen(true)}
            className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-prism-teal active:bg-deep-teal text-white text-xs font-bold transition-all shadow-subtle"
          >
            <Plus className="w-4 h-4" /> + Catat Aktivitas
          </button>
        </div>
      </div>

      {/* 3. Follow-Up Modal (3-Tap) */}
      <ActivityLoggerModal
        leadId={lead.id}
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSuccess={handleActivitySuccess}
      />

      {/* Confirmation Dialog for "Tidak Jadi (Lost)" */}
      {isLostModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-mist shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mist">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-carbon-ink">
                  Tandai Tidak Jadi (Lost)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLostModalOpen(false)}
                className="p-1 rounded-full text-slate hover:text-graphite hover:bg-bone"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate">
                Apakah Anda yakin ingin menandai prospek <strong>{lead.nama}</strong> sebagai Lost? Silakan pilih atau tulis alasan pembatalan.
              </p>

              <div>
                <label className="block text-[11px] font-semibold text-graphite mb-1.5">
                  Pilih Alasan Cepat:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {LOST_REASON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLostReason(preset)}
                      className={`text-[11px] py-1 px-2.5 rounded-md border transition-colors cursor-pointer ${
                        lostReason === preset
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
                <label className="block text-[11px] font-semibold text-graphite mb-1">
                  Alasan Pembatalan / Lost <span className="text-rose-500">*</span>
                </label>
                <textarea
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