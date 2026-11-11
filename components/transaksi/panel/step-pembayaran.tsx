"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  SlidersHorizontal,
  Calendar,
  Award,
  Loader2,
  ArrowRight,
  Receipt,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyActionBar } from "./sticky-action-bar";
import { CatatAkadSheet } from "./catat-akad-sheet";
import { RencanaJadwalSheet } from "./rencana-jadwal-sheet";
import { PembayaranModal } from "@/components/forms/pembayaran-modal";
import { updateTransactionStatus } from "@/actions/transaksi.action";
import { todayWIB } from "@/lib/date/wib";
import type { FinancialSummaryProp } from "@/components/forms/dynamic-action-panel";
import type { DocumentsSummary } from "@/lib/transaksi/document-rules";
import type { TahapDetail, MetodeBayar } from "@/generated/prisma";

export interface StepPembayaranProps {
  transaksiId: number;
  leadId: number;
  version: number;
  metodeBayar: MetodeBayar;
  currentTahapDetail: TahapDetail | string;
  isViewStepActive: boolean;
  canEdit?: boolean;
  financialSummary?: FinancialSummaryProp;
  docsSummary: DocumentsSummary;
  initialNotaris?: string | null;
  initialRencanaAkad?: string | null;
  initialLunasAt?: string | null;
  onOpenOtherOptions: () => void;
  onGoToPemberkasan: () => void;
  onReturnToActive: () => void;
}

const formatRupiah = (val?: number | null): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val ?? 0);

export function StepPembayaran({
  transaksiId,
  leadId,
  version,
  metodeBayar,
  currentTahapDetail,
  isViewStepActive,
  canEdit = true,
  financialSummary,
  docsSummary,
  initialNotaris,
  initialRencanaAkad,
  initialLunasAt,
  onOpenOtherOptions,
  onGoToPemberkasan,
  onReturnToActive,
}: StepPembayaranProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [isCatatAkadOpen, setIsCatatAkadOpen] = useState(false);
  const [isJadwalOpen, setIsJadwalOpen] = useState(false);

  const handleOpenRiwayat = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      const el = document.getElementById("riwayat-pembayaran");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("riwayat", "1");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const today = todayWIB();
  const [tglPelunasan, setTglPelunasan] = useState(() => {
    if (initialLunasAt) return initialLunasAt.slice(0, 10);
    if (financialSummary?.lastPaymentDate)
      return financialSummary.lastPaymentDate.slice(0, 10);
    return today;
  });

  const isReadOnlyState =
    currentTahapDetail === "BATAL" || currentTahapDetail === "BAST";

  const sisaPelunasan = financialSummary?.sisaPelunasan ?? 0;
  const sisaDp = financialSummary?.sisaDp ?? 0;
  const isLunas = sisaPelunasan === 0;
  const isDpLunas = sisaDp === 0;

  const totalDocsCount =
    docsSummary.pengajuan.total + docsSummary.akad.total;
  const verifiedDocsCount =
    docsSummary.pengajuan.done + docsSummary.akad.done;
  const missingAkadCount = docsSummary.missingForAkad.length;

  const isMenungguPelunasan = currentTahapDetail === "MENUNGGU_PELUNASAN";
  const isPembayaranDp = currentTahapDetail === "PEMBAYARAN_DP";
  const isCicilanBerjalan = currentTahapDetail === "CICILAN_BERJALAN";
  const isTahapPelunasan = currentTahapDetail === "PELUNASAN";

  const canAdvanceStage = () => {
    if (isMenungguPelunasan || isCicilanBerjalan) {
      return isLunas && Boolean(tglPelunasan) && tglPelunasan <= today;
    }
    if (isPembayaranDp) {
      return isDpLunas;
    }
    if (isTahapPelunasan) {
      return missingAkadCount === 0;
    }
    return false;
  };

  const handleAdvance = (targetDetail: TahapDetail) => {
    if (!canEdit || isPending) return;

    startTransition(async () => {
      try {
        const res = await updateTransactionStatus({
          transaksiId,
          leadId,
          tahapDetail: targetDetail,
          fromDetail: currentTahapDetail as TahapDetail,
          version,
          lunasAt:
            targetDetail === "PELUNASAN" || isTahapPelunasan
              ? tglPelunasan || null
              : null,
        });

        if (!res.success) {
          toast.error(res.error || "Gagal memperbarui status pembayaran.");
          return;
        }

        toast.success(res.message || "Status tahap berhasil diperbarui.");
        router.refresh();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Terjadi kesalahan sistem."
        );
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* ─── Document Summary Chip ─── */}
      {verifiedDocsCount != totalDocsCount && <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl border border-mist bg-white shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-deep-teal flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-carbon-ink">Status Dokumen:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-bone text-graphite border border-mist">
                {verifiedDocsCount}/{totalDocsCount} Terverifikasi
              </span>
              {missingAkadCount > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {missingAkadCount} menyusul untuk AJB
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Dokumen Lengkap
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate mt-0.5">
              Berkas konsumen dapat diverifikasi kapan saja tanpa mengganggu tahapan pembayaran.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGoToPemberkasan}
          className="text-xs h-8 shrink-0 self-start sm:self-auto gap-1.5"
        >
          <FileText className="w-3.5 h-3.5 text-deep-teal" />
          <span>Lengkapi Berkas</span>
        </Button>
      </div>}

      {/* ─── Financial Status Notice (Streamlined) ─── */}
      {!isLunas && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-semibold">Sisa tagihan belum memenuhi target pelunasan.</span>
              <span className="text-amber-800 ml-1">
                Kurang {formatRupiah(sisaPelunasan)}.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenRiwayat}
              className="h-8 text-xs border-amber-300 hover:bg-amber-100 text-amber-900 gap-1.5"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Riwayat Pembayaran</span>
            </Button>
            {canEdit && (
              <PembayaranModal
                transaksiId={transaksiId}
                trigger={
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs bg-amber-700 hover:bg-amber-800 text-white gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Catat Pembayaran</span>
                  </Button>
                }
              />
            )}
          </div>
        </div>
      )}

      {/* ─── Micro-stage Actions ─── */}
      {isMenungguPelunasan && (
        <div className="bg-white rounded-xl border border-mist p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-deep-teal">
              Konfirmasi Pelunasan (Cash Keras)
            </h4>
            <p className="text-xs text-slate">
              Setelah pembayaran terverifikasi lunas 100%, tentukan tanggal pelunasan untuk melanjutkan ke tahap Pelunasan.
            </p>
          </div>

          <div className="max-w-xs space-y-1.5">
            <label
              htmlFor="fld-tglPelunasan"
              className="block text-xs font-semibold text-carbon-ink"
            >
              Tanggal Pelunasan (100%) <span className="text-rose-600">*</span>
            </label>
            <input
              id="fld-tglPelunasan"
              type="date"
              max={today}
              value={tglPelunasan}
              disabled={!canEdit || isPending || !isLunas}
              onChange={(e) => setTglPelunasan(e.target.value)}
              className="w-full rounded-lg border border-mist bg-white px-3 py-2 text-xs focus:border-deep-teal focus:outline-none disabled:bg-bone disabled:opacity-60"
            />
          </div>
        </div>
      )}

      {isPembayaranDp && (
        <div className="bg-white rounded-xl border border-mist p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-deep-teal">
              Pemenuhan Uang Muka DP (Cash Tempo)
            </h4>
            <p className="text-xs text-slate">
              {isDpLunas
                ? "Target pembayaran Uang Muka (DP) telah terpenuhi. Anda dapat melanjutkan ke tahap Cicilan Berjalan."
                : `Target DP belum terpenuhi. Kurang ${formatRupiah(sisaDp)}.`}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-lg border border-mist bg-bone/30">
              <span className="block text-[11px] text-slate font-medium">
                Target Uang Muka (DP)
              </span>
              <span className="font-mono font-bold text-sm text-carbon-ink">
                {formatRupiah(financialSummary?.targetDp)}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-mist bg-bone/30">
              <span className="block text-[11px] text-slate font-medium">
                DP Terbayar
              </span>
              <span className="font-mono font-bold text-sm text-emerald-700">
                {formatRupiah(financialSummary?.dpPaid)}
              </span>
            </div>

            <div className="p-3 rounded-lg border border-mist bg-bone/30">
              <span className="block text-[11px] text-slate font-medium">
                Sisa DP
              </span>
              <span
                className={`font-mono font-bold text-sm ${sisaDp > 0 ? "text-rose-600" : "text-emerald-700"
                  }`}
              >
                {formatRupiah(sisaDp)}
              </span>
            </div>
          </div>
        </div>
      )}

      {isCicilanBerjalan && (
        <div className="bg-white rounded-xl border border-mist p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-deep-teal">
              Progres Cicilan &amp; Pelunasan (Cash Tempo)
            </h4>
            <p className="text-xs text-slate">
              {isLunas
                ? "Seluruh cicilan telah lunas 100%. Tentukan tanggal pelunasan untuk menyelesaikan tahap ini."
                : `Cicilan masih berlangsung. Sisa tagihan pelunasan: ${formatRupiah(sisaPelunasan)}.`}
            </p>
          </div>

          {isLunas && (
            <div className="max-w-xs space-y-1.5">
              <label
                htmlFor="fld-tglPelunasanTempo"
                className="block text-xs font-semibold text-carbon-ink"
              >
                Tanggal Pelunasan (100%) <span className="text-rose-600">*</span>
              </label>
              <input
                id="fld-tglPelunasanTempo"
                type="date"
                max={today}
                value={tglPelunasan}
                disabled={!canEdit || isPending}
                onChange={(e) => setTglPelunasan(e.target.value)}
                className="w-full rounded-lg border border-mist bg-white px-3 py-2 text-xs focus:border-deep-teal focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      {isTahapPelunasan && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Pembayaran Lunas 100%
                </h4>
                <p className="text-xs text-emerald-950 font-medium mt-0.5">
                  Transaksi siap untuk pelaksanaan Akta Jual Beli (AJB) di hadapan Notaris/PPAT.
                </p>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white text-emerald-800 border border-emerald-300 shadow-2xs shrink-0">
              Siap AJB
            </span>
          </div>

          {missingAkadCount > 0 && (
            <div className="flex items-start gap-2 pt-2 border-t border-emerald-200/60 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span>Terdapat {missingAkadCount} dokumen yang wajib diverifikasi sebelum AJB. </span>
                <button
                  type="button"
                  onClick={onGoToPemberkasan}
                  className="font-semibold underline hover:text-black cursor-pointer"
                >
                  Buka Checklist Pemberkasan
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Sticky Action Bar ─── */}
      <StickyActionBar
        // statusText={
        //   isViewStepActive ? (
        //     isTahapPelunasan ? (
        //       <span className="text-emerald-700 font-medium">
        //         ✓ Lunas 100% · Siap Akad AJB
        //       </span>
        //     ) : isLunas ? (
        //       <span className="text-emerald-700 font-medium">
        //         ✓ Dana Lunas 100%
        //       </span>
        //     ) : (
        //       <span className="text-rose-600 font-medium">
        //         Sisa tagihan: {formatRupiah(sisaPelunasan)}
        //       </span>
        //     )
        //   ) : (
        //     <span className="text-slate font-medium">
        //       Melihat Langkah 2 · Posisi aktif berbeda
        //     </span>
        //   )
        // }
        secondaryAction={
          <>
            {canEdit && !isReadOnlyState && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenOtherOptions}
                className="text-xs h-8 text-graphite border-mist gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-steel" />
                {/* <span>Opsi Lainnya</span> */}
              </Button>
            )}

            {isTahapPelunasan && canEdit && !isReadOnlyState && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsJadwalOpen(true)}
                className="text-xs h-8 text-graphite border-mist gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-deep-teal" />
                <span>Rencana Akad</span>
                {/* <span>Rencana AJB</span> */}
              </Button>
            )}
          </>
        }
      >
        {isViewStepActive ? (
          canEdit && !isReadOnlyState ? (
            isTahapPelunasan ? (
              <Button
                type="button"
                size="sm"
                disabled={!canAdvanceStage() || isPending}
                onClick={() => setIsCatatAkadOpen(true)}
                className="bg-deep-teal hover:bg-teal-900 text-white text-xs h-8 font-semibold gap-1.5 shadow-2xs disabled:opacity-50"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Catat Akad (AJB)</span>
              </Button>
            ) : isMenungguPelunasan ? (
              <Button
                type="button"
                size="sm"
                disabled={!canAdvanceStage() || isPending}
                onClick={() => handleAdvance("PELUNASAN")}
                className="bg-deep-teal hover:bg-teal-900 text-white text-xs h-8 font-semibold gap-1.5 shadow-2xs disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Konfirmasi Pelunasan</span>
                )}
              </Button>
            ) : isPembayaranDp ? (
              <Button
                type="button"
                size="sm"
                disabled={!canAdvanceStage() || isPending}
                onClick={() => handleAdvance("CICILAN_BERJALAN")}
                className="bg-deep-teal hover:bg-teal-900 text-white text-xs h-8 font-semibold gap-1.5 shadow-2xs disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Lanjut ke Cicilan Berjalan</span>
                )}
              </Button>
            ) : isCicilanBerjalan ? (
              <Button
                type="button"
                size="sm"
                disabled={!canAdvanceStage() || isPending}
                onClick={() => handleAdvance("PELUNASAN")}
                className="bg-deep-teal hover:bg-teal-900 text-white text-xs h-8 font-semibold gap-1.5 shadow-2xs disabled:opacity-50"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Konfirmasi Pelunasan 100%</span>
                )}
              </Button>
            ) : null
          ) : null
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={onReturnToActive}
            className="bg-deep-teal hover:bg-teal-900 text-white text-xs h-8 font-semibold gap-1.5 shadow-2xs"
          >
            <span>Kembali ke Tahap Aktif</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </StickyActionBar>

      {/* ─── Sheets / Dialogs ─── */}
      <CatatAkadSheet
        isOpen={isCatatAkadOpen}
        onOpenChange={setIsCatatAkadOpen}
        transaksiId={transaksiId}
        leadId={leadId}
        version={version}
        metodeBayar={metodeBayar}
        currentTahapDetail={currentTahapDetail}
        initialNotaris={initialNotaris}
        canEdit={canEdit}
      />

      <RencanaJadwalSheet
        isOpen={isJadwalOpen}
        onOpenChange={setIsJadwalOpen}
        transaksiId={transaksiId}
        version={version}
        initialNotaris={initialNotaris}
        initialRencanaAkad={initialRencanaAkad}
        canEdit={canEdit}
      />
    </div>
  );
}
