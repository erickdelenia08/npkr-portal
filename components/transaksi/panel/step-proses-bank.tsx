"use client";

import React, { useState } from "react";
import {
  Building2,
  Plus,
  Calendar,
  SlidersHorizontal,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ArrowRight,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KprBankCard } from "./kpr-bank-card";
import { AjukanKprSheet } from "./ajukan-kpr-sheet";
import { CatatAkadSheet } from "./catat-akad-sheet";
import { RencanaJadwalSheet } from "./rencana-jadwal-sheet";
import { StickyActionBar } from "./sticky-action-bar";
import type { DocumentsSummary } from "@/lib/transaksi/document-rules";
import type { BankItem, PengajuanKPRItem } from "@/components/forms/kpr-submission-section";
import type { TahapDetail, MetodeBayar } from "@/generated/prisma";

export interface StepProsesBankProps {
  transaksiId: number;
  leadId: number;
  version: number;
  metodeBayar: MetodeBayar;
  currentTahapDetail: TahapDetail | string;
  isViewStepActive: boolean;
  canEdit?: boolean;
  docsSummary: DocumentsSummary;
  masterBanks?: BankItem[];
  pengajuanKprList?: PengajuanKPRItem[];
  initialNotaris?: string | null;
  initialRencanaAkad?: string | null;
  onOpenOtherOptions: () => void;
  onGoToPemberkasan: () => void;
  onReturnToActive: () => void;
}

export function StepProsesBank({
  transaksiId,
  leadId,
  version,
  metodeBayar,
  currentTahapDetail,
  isViewStepActive,
  canEdit = true,
  docsSummary,
  masterBanks = [],
  pengajuanKprList = [],
  initialNotaris,
  initialRencanaAkad,
  onOpenOtherOptions,
  onGoToPemberkasan,
  onReturnToActive,
}: StepProsesBankProps) {
  const [isAjukanKprOpen, setIsAjukanKprOpen] = useState(false);
  const [isCatatAkadOpen, setIsCatatAkadOpen] = useState(false);
  const [isJadwalOpen, setIsJadwalOpen] = useState(false);

  const isReadOnlyState =
    currentTahapDetail === "BATAL" || currentTahapDetail === "BAST";

  const sp3kBanks = pengajuanKprList.filter((p) => p.status === "SP3K");
  const hasSp3k = sp3kBanks.length > 0;

  const totalDocsCount =
    docsSummary.pengajuan.total + docsSummary.akad.total;
  const verifiedDocsCount =
    docsSummary.pengajuan.done + docsSummary.akad.done;
  const missingAkadCount = docsSummary.missingForAkad.length;
  const missingPengajuanCount = docsSummary.missingForPengajuan.length;

  const canAkad =
    hasSp3k && missingAkadCount === 0 && missingPengajuanCount === 0;

  let akadDisabledReason = "";
  if (!hasSp3k) {
    akadDisabledReason = "Membutuhkan minimal 1 pengajuan dengan status SP3K.";
  } else if (missingPengajuanCount > 0) {
    akadDisabledReason = `${missingPengajuanCount} dokumen wajib pengajuan belum diverifikasi.`;
  } else if (missingAkadCount > 0) {
    akadDisabledReason = `${missingAkadCount} dokumen susulan wajib akad belum diverifikasi.`;
  }

  return (
    <div className="space-y-5">
      {/* ─── Document Summary Chip ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl border border-mist bg-white shadow-2xs">
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
                  {missingAkadCount} menyusul untuk Akad
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Dokumen Akad Lengkap
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate mt-0.5">
              Berkas dapat diperiksa dan dilengkapi kapan saja tanpa mengubah posisi tahap transaksi.
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
      </div>

      {/* ─── SP3K Callout Alert ─── */}
      {hasSp3k && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Persetujuan Bank (SP3K Terbit)
                </h4>
                <p className="text-xs text-emerald-950 font-medium mt-0.5">
                  Bank disetujui:{" "}
                  <strong>{sp3kBanks.map((s) => s.bank.nama).join(", ")}</strong>
                </p>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-white text-emerald-800 border border-emerald-300 shadow-2xs shrink-0">
              Siap Akad
            </span>
          </div>

          {!canAkad && (
            <div className="flex items-start gap-2 pt-2 border-t border-emerald-200/60 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span>{akadDisabledReason} </span>
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

      {/* ─── Bank Applications Section ─── */}
      <div className="bg-white rounded-xl border border-mist p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-mist/70 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-carbon-ink tracking-tight">
              Pengajuan ke Bank Penyalur
            </h3>
            <p className="text-xs text-slate mt-0.5">
              Pengajuan KPR dapat dilakukan ke lebih dari satu bank rekanan secara simultan.
            </p>
          </div>

          {canEdit && !isReadOnlyState && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAjukanKprOpen(true)}
              className="text-xs h-8 shrink-0 self-start sm:self-auto gap-1.5 border-mist hover:border-deep-teal hover:text-deep-teal"
            >
              <Plus className="w-3.5 h-3.5 text-deep-teal" />
              <span>Ajukan ke Bank Lain</span>
            </Button>
          )}
        </div>

        {pengajuanKprList.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-xl border border-dashed border-mist bg-bone/30 space-y-3">
            <div className="w-12 h-12 rounded-full bg-teal-50 text-deep-teal mx-auto flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-carbon-ink">
                Belum Ada Pengajuan Bank
              </p>
              <p className="text-xs text-slate mt-0.5 max-w-sm mx-auto">
                Ajukan berkas konsumen ke bank rekanan untuk memulai proses analisis KPR, wawancara, dan verifikasi.
              </p>
            </div>
            {canEdit && !isReadOnlyState && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsAjukanKprOpen(true)}
                className="bg-deep-teal hover:bg-teal-900 text-white text-xs h-8 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ajukan ke Bank Pertama</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pengajuanKprList.map((submission) => (
              <KprBankCard
                key={submission.id}
                submission={submission}
                canEdit={canEdit}
                isReadOnly={isReadOnlyState}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── Sticky Action Bar ─── */}
      <StickyActionBar
        statusText={
          isViewStepActive ? (
            hasSp3k ? (
              canAkad ? (
                <span className="text-emerald-700 font-medium">
                  ✓ Siap Akad Kredit ({sp3kBanks.length} bank SP3K)
                </span>
              ) : (
                <span className="text-amber-700 font-medium">
                  {missingAkadCount + missingPengajuanCount} berkas belum lengkap sebelum Akad
                </span>
              )
            ) : (
              <span className="text-slate font-medium">
                {pengajuanKprList.length} bank dalam proses pengajuan
              </span>
            )
          ) : (
            <span className="text-slate font-medium">
              Melihat Langkah 2 · Posisi aktif berbeda
            </span>
          )
        }
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

            {canEdit && !isReadOnlyState && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsJadwalOpen(true)}
                className="text-xs h-8 text-graphite border-mist gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-deep-teal" />
                <span>Rencana Akad</span>
              </Button>
            )}

            {canEdit && !isReadOnlyState && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAjukanKprOpen(true)}
                className="text-xs h-8 text-graphite border-mist gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-deep-teal" />
                <span>+ Bank Lain</span>
              </Button>
            )}
          </>
        }
      >
        {isViewStepActive ? (
          canEdit && !isReadOnlyState ? (
            <Button
              type="button"
              size="sm"
              disabled={!canAkad}
              onClick={() => setIsCatatAkadOpen(true)}
              title={!canAkad ? akadDisabledReason : undefined}
              className="bg-deep-teal hover:bg-teal-900 text-white text-xs h-8 font-semibold gap-1.5 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Catat Akad Kredit</span>
            </Button>
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
      <AjukanKprSheet
        isOpen={isAjukanKprOpen}
        onOpenChange={setIsAjukanKprOpen}
        transaksiId={transaksiId}
        masterBanks={masterBanks}
        existingSubmissions={pengajuanKprList}
        canEdit={canEdit}
      />

      <CatatAkadSheet
        isOpen={isCatatAkadOpen}
        onOpenChange={setIsCatatAkadOpen}
        transaksiId={transaksiId}
        leadId={leadId}
        version={version}
        metodeBayar={metodeBayar}
        currentTahapDetail={currentTahapDetail}
        sp3kBanks={sp3kBanks}
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
