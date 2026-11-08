"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  MoreVertical,
  History,
  Ban,
  ArrowRight,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  updateStatusPengajuanKPR,
  tolakPengajuanKPR,
} from "@/actions/kpr.action";
import { formatDateOnly } from "@/lib/date/wib";
import {
  type StatusPengajuanKPRType,
  ALLOWED_KPR_STATUS_TRANSITIONS,
} from "@/schemas/kpr.schema";
import type { PengajuanKPRItem } from "@/components/forms/kpr-submission-section";

export const STATUS_LABEL: Record<StatusPengajuanKPRType, string> = {
  DIAJUKAN: "Diajukan",
  WAWANCARA: "Wawancara",
  OTS: "On The Spot (OTS)",
  VERIFIKASI: "Verifikasi",
  SP3K: "SP3K Terbit",
  DITOLAK: "Ditolak",
  DIBATALKAN: "Dibatalkan",
};

export const STATUS_BADGE_STYLE: Record<StatusPengajuanKPRType, string> = {
  DIAJUKAN: "bg-blue-50 text-blue-700 border-blue-200",
  WAWANCARA: "bg-purple-50 text-purple-700 border-purple-200",
  OTS: "bg-amber-50 text-amber-700 border-amber-200",
  VERIFIKASI: "bg-indigo-50 text-indigo-700 border-indigo-200",
  SP3K: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DITOLAK: "bg-rose-50 text-rose-700 border-rose-200",
  DIBATALKAN: "bg-slate-100 text-slate-600 border-slate-200",
};

export interface KprBankCardProps {
  submission: PengajuanKPRItem;
  canEdit?: boolean;
  isReadOnly?: boolean;
  isChosenBank?: boolean;
}

export function KprBankCard({
  submission,
  canEdit = true,
  isReadOnly = false,
  isChosenBank = false,
}: KprBankCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [alasan, setAlasan] = useState("");

  const allowedTransitions =
    ALLOWED_KPR_STATUS_TRANSITIONS[submission.status] || [];

  const forwardOptions = allowedTransitions.filter(
    (st) => st !== "DITOLAK" && st !== "DIBATALKAN"
  );
  const canReject =
    allowedTransitions.includes("DITOLAK") && !isChosenBank && !isReadOnly && canEdit;
  const canCancel =
    allowedTransitions.includes("DIBATALKAN") && !isChosenBank && !isReadOnly && canEdit;

  const handleNextStatus = (targetStatus: StatusPengajuanKPRType) => {
    if (!canEdit || isReadOnly) return;

    startTransition(async () => {
      const res = await updateStatusPengajuanKPR({
        pengajuanId: submission.id,
        status: targetStatus,
      });

      if (res.success) {
        toast.success(res.message || `Status diubah ke ${STATUS_LABEL[targetStatus]}.`);
        router.refresh();
      } else {
        toast.error(res.error || "Gagal mengubah status pengajuan.");
      }
    });
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alasan.trim() || alasan.trim().length < 3) {
      toast.error("Alasan penolakan bank wajib diisi (minimal 3 karakter).");
      return;
    }

    startTransition(async () => {
      const res = await tolakPengajuanKPR({
        pengajuanId: submission.id,
        alasanPenolakan: alasan.trim(),
      });

      if (res.success) {
        toast.success(res.message || "Pengajuan KPR ditandai Ditolak.");
        setIsRejectOpen(false);
        setAlasan("");
        router.refresh();
      } else {
        toast.error(res.error || "Gagal menolak pengajuan.");
      }
    });
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alasan.trim() || alasan.trim().length < 3) {
      toast.error("Alasan pembatalan wajib diisi (minimal 3 karakter).");
      return;
    }

    startTransition(async () => {
      const res = await updateStatusPengajuanKPR({
        pengajuanId: submission.id,
        status: "DIBATALKAN",
        catatan: alasan.trim(),
      });

      if (res.success) {
        toast.success(res.message || "Pengajuan KPR dibatalkan.");
        setIsCancelOpen(false);
        setAlasan("");
        router.refresh();
      } else {
        toast.error(res.error || "Gagal membatalkan pengajuan.");
      }
    });
  };

  const isTerminal =
    submission.status === "DITOLAK" || submission.status === "DIBATALKAN";

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 shadow-2xs space-y-3.5 transition-all ${
        isChosenBank
          ? "border-teal-300 bg-teal-50/20 ring-1 ring-teal-200"
          : isTerminal
          ? "border-mist bg-bone/30 opacity-75"
          : "border-mist bg-white"
      }`}
    >
      {/* Header: Bank name, Chosen badge, status badge, menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm sm:text-base font-bold text-carbon-ink tracking-tight truncate">
              {submission.bank.nama}
            </h4>
            {submission.bank.kode && (
              <span className="rounded bg-bone px-1.5 py-0.5 text-[10px] font-mono text-slate font-semibold border border-mist">
                {submission.bank.kode}
              </span>
            )}
            {isChosenBank && (
              <span className="inline-flex items-center gap-1 rounded bg-teal-100 text-teal-800 px-2 py-0.5 text-[11px] font-bold border border-teal-300">
                <CheckCircle2 className="w-3 h-3 text-teal-700" />
                Bank Pembiaya Terpilih
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate">
            <span>Pengajuan #{submission.nomor_pengajuan}</span>
            <span>•</span>
            <span>
              Diajukan:{" "}
              <strong className="text-graphite font-medium">
                {formatDateOnly(submission.tanggal_ajukan)}
              </strong>
            </span>
            {submission.tanggal_keputusan && (
              <>
                <span>•</span>
                <span>
                  Keputusan:{" "}
                  <strong className="text-graphite font-medium">
                    {formatDateOnly(submission.tanggal_keputusan)}
                  </strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right side: Status Badge + Dropdown Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${
              STATUS_BADGE_STYLE[submission.status]
            }`}
          >
            {STATUS_LABEL[submission.status]}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Menu pengajuan KPR"
              className="p-1.5 rounded-md text-slate hover:text-carbon-ink hover:bg-bone transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 text-xs">
              <DropdownMenuItem
                onClick={() => setIsHistoryOpen(true)}
                className="gap-2 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-deep-teal" />
                <span>Riwayat Status ({submission.logs?.length || 0})</span>
              </DropdownMenuItem>

              {canReject && (
                <DropdownMenuItem
                  onClick={() => setIsRejectOpen(true)}
                  className="gap-2 text-rose-600 focus:text-rose-600 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Tolak Pengajuan</span>
                </DropdownMenuItem>
              )}

              {canCancel && (
                <DropdownMenuItem
                  onClick={() => setIsCancelOpen(true)}
                  className="gap-2 text-slate-700 cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Batalkan Pengajuan</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Note or Rejection Reason if any */}
      {submission.alasan_penolakan && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900">
          <span className="font-semibold block text-[11px]">Alasan Penolakan Bank:</span>
          {submission.alasan_penolakan}
        </div>
      )}

      {submission.catatan && !submission.alasan_penolakan && (
        <p className="text-xs text-slate italic bg-bone/40 p-2 rounded border border-mist/50">
          Catatan: {submission.catatan}
        </p>
      )}

      {/* Actions: Primary Forward Step Button */}
      {!isTerminal && !isReadOnly && canEdit && forwardOptions.length > 0 && (
        <div className="pt-2 border-t border-mist/60 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] text-slate font-medium">Langkah Selanjutnya:</span>
          <div className="flex items-center gap-2 flex-wrap">
            {forwardOptions.map((target) => {
              const isSp3k = target === "SP3K";
              return (
                <Button
                  key={target}
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleNextStatus(target)}
                  className={`h-8 px-3 text-xs font-semibold shadow-2xs gap-1.5 ${
                    isSp3k
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-deep-teal hover:bg-teal-700 text-white"
                  }`}
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                  <span>Lanjut ke {STATUS_LABEL[target]}</span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sheet: Riwayat Status */}
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <SheetContent side="bottom" className="sm:max-w-md sm:side-right sm:h-full">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-deep-teal flex items-center justify-center shrink-0">
                <History className="w-4 h-4" />
              </div>
              <div>
                <SheetTitle>Riwayat Pengajuan: {submission.bank.nama}</SheetTitle>
                <SheetDescription>
                  Daftar kronologis perubahan status proses permohonan KPR.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="py-4 space-y-3 divide-y divide-mist">
            {(!submission.logs || submission.logs.length === 0) ? (
              <p className="text-xs text-slate text-center py-6">
                Belum ada catatan riwayat perubahan status.
              </p>
            ) : (
              submission.logs.map((log) => (
                <div key={log.id} className="pt-3 first:pt-0 space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-carbon-ink">
                      {log.status_sebelum ? `${log.status_sebelum} → ` : ""}
                      <span className="text-deep-teal">{log.status_sesudah}</span>
                    </span>
                    <span className="text-[11px] text-slate font-mono">
                      {formatDateOnly(log.created_at)}
                    </span>
                  </div>
                  {log.catatan && (
                    <p className="text-graphite text-[11px] leading-relaxed">
                      {log.catatan}
                    </p>
                  )}
                  {log.actor?.nama && (
                    <span className="text-[10px] text-slate block">
                      Oleh: {log.actor.nama}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sheet: Tolak Pengajuan */}
      <Sheet open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <SheetContent side="bottom" className="sm:max-w-md sm:side-right sm:h-full">
          <SheetHeader>
            <SheetTitle>Tolak Pengajuan: {submission.bank.nama}</SheetTitle>
            <SheetDescription>
              Masukkan alasan resmi penolakan dari pihak perbankan (wajib).
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleRejectSubmit} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-carbon-ink">
                Alasan Penolakan Bank <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Contoh: Skor BI Checking / SLIK tidak memenuhi kriteria bank..."
                disabled={isPending}
                className="w-full p-2.5 rounded-lg border border-mist bg-white text-xs font-medium text-carbon-ink focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
              />
            </div>

            <SheetFooter className="pt-4 border-t border-mist flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setIsRejectOpen(false)}
                className="w-full sm:w-auto text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending || alasan.trim().length < 3}
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                {isPending ? "Menyimpan..." : "Tandai Ditolak"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Sheet: Batalkan Pengajuan */}
      <Sheet open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <SheetContent side="bottom" className="sm:max-w-md sm:side-right sm:h-full">
          <SheetHeader>
            <SheetTitle>Batalkan Pengajuan: {submission.bank.nama}</SheetTitle>
            <SheetDescription>
              Batalkan permohonan ke bank ini jika tidak ingin diteruskan.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleCancelSubmit} className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-carbon-ink">
                Alasan Pembatalan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Contoh: Konsumen lebih memilih bank lain dengan bunga lebih kompetitif..."
                disabled={isPending}
                className="w-full p-2.5 rounded-lg border border-mist bg-white text-xs font-medium text-carbon-ink focus:border-deep-teal focus:ring-1 focus:ring-deep-teal outline-none"
              />
            </div>

            <SheetFooter className="pt-4 border-t border-mist flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setIsCancelOpen(false)}
                className="w-full sm:w-auto text-xs"
              >
                Tutup
              </Button>
              <Button
                type="submit"
                disabled={isPending || alasan.trim().length < 3}
                className="w-full sm:w-auto bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold"
              >
                {isPending ? "Membatalkan..." : "Konfirmasi Batalkan"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
