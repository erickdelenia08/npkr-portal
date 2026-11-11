"use client";

import React, { useState } from "react";
import { UserCheck, ArrowRight, Building2, Edit2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentChecklist, type DokumenInfoItem } from "./document-checklist";
import { ProfileSheet } from "./profile-sheet";
import { AjukanKprSheet } from "./ajukan-kpr-sheet";
import { StickyActionBar } from "./sticky-action-bar";
import type { DocumentRuleItem, DocumentsSummary } from "@/lib/transaksi/document-rules";
import type {
  TahapDetail,
  MetodeBayar,
  StatusPernikahan,
  StatusPekerjaan,
} from "@/generated/prisma";
import type { BankItem, PengajuanKPRItem } from "@/components/forms/kpr-submission-section";

export interface StepPemberkasanProps {
  transaksiId: number;
  leadId: number;
  version: number;
  metodeBayar: MetodeBayar;
  currentTahapDetail: TahapDetail | string;
  isViewStepActive: boolean;
  canEdit?: boolean;
  statusPernikahan?: StatusPernikahan | null;
  statusPekerjaan?: StatusPekerjaan | null;
  documents: DocumentRuleItem[];
  verifiedDocs: string[];
  dokumenInfo?: DokumenInfoItem[];
  docsSummary: DocumentsSummary;
  masterBanks?: BankItem[];
  pengajuanKprList?: PengajuanKPRItem[];
  onOpenOtherOptions: () => void;
  onReturnToActive: () => void;
  onAdvanceCashToPayment?: () => void;
  isSubmittingAdvance?: boolean;
}

export function StepPemberkasan({
  transaksiId,
  leadId: _leadId,
  version: _version,
  metodeBayar,
  currentTahapDetail,
  isViewStepActive,
  canEdit = true,
  statusPernikahan,
  statusPekerjaan,
  documents,
  verifiedDocs,
  dokumenInfo = [],
  docsSummary,
  masterBanks = [],
  pengajuanKprList = [],
  onOpenOtherOptions,
  onReturnToActive,
  onAdvanceCashToPayment,
  isSubmittingAdvance = false,
}: StepPemberkasanProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAjukanKprOpen, setIsAjukanKprOpen] = useState(false);

  const isKpr = metodeBayar === "KPR";
  const isReadOnlyState =
    currentTahapDetail === "BATAL" || currentTahapDetail === "BAST";

  const missingPengajuanCount = docsSummary.missingForPengajuan.length;
  const canAdvance = missingPengajuanCount === 0;

  // Format marriage label
  const pernikahanLabel = statusPernikahan
    ? statusPernikahan === "MENIKAH"
      ? "Menikah"
      : statusPernikahan === "BELUM_MENIKAH"
        ? "Belum Menikah"
        : "Cerai"
    : "Belum Ditentukan";

  // Format employment label
  const pekerjaanLabel = statusPekerjaan
    ? statusPekerjaan === "TETAP"
      ? "Pegawai Tetap"
      : "Wiraswasta / Tidak Tetap"
    : "Belum Ditentukan";

  return (
    <div className="space-y-5">
      {/* ─── Profile Summary Chip ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl border border-mist bg-white shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-deep-teal flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-carbon-ink">Profil Pemberkasan:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-bone text-graphite border border-mist">
                {pernikahanLabel}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-bone text-graphite border border-mist">
                {pekerjaanLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate mt-0.5">
              Profil menentukan daftar berkas identitas, pekerjaan, dan legalitas yang wajib diserahkan.
            </p>
          </div>
        </div>

        {canEdit && !isReadOnlyState && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsProfileOpen(true)}
            className="text-xs h-8 shrink-0 self-start sm:self-auto gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5 text-deep-teal" />
            <span>Ubah Profil</span>
          </Button>
        )}
      </div>

      {/* ─── Document Checklist ─── */}
      <div className="bg-white rounded-xl border border-mist p-4 sm:p-5 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-carbon-ink tracking-tight">
            Checklist Dokumen Pemberkasan
          </h3>
          <p className="text-xs text-slate mt-0.5">
            Dapat diperbarui sewaktu-waktu sampai tahap Serah Terima (BAST). Tanda centang
            tersimpan otomatis per baris.
          </p>
        </div>

        <DocumentChecklist
          transaksiId={transaksiId}
          documents={documents}
          verifiedKeys={verifiedDocs}
          dokumenInfo={dokumenInfo}
          canEdit={canEdit}
          isReadOnlyState={isReadOnlyState}
        />
      </div>

      {/* ─── Sticky Action Bar ─── */}
      <StickyActionBar
        statusText={
          isViewStepActive ? (
            canAdvance ? (
              <span className="text-emerald-700 font-medium font-light">
                ✓ Berkas wajib pengajuan lengkap ({docsSummary.pengajuan.total}/{docsSummary.pengajuan.total})
              </span>
            ) : (
              <span className="text-rose-600 font-medium font-light">
                {missingPengajuanCount} berkas wajib pengajuan belum lengkap
              </span>
            )
          ) : (
            <span className="text-slate font-light">
              Mode pratinjau berkas (posisi transaksi di tahap berikutnya)
            </span>
          )
        }
        secondaryAction={
          canEdit && !isReadOnlyState ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenOtherOptions}
              className="text-xs h-9 gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate" />
              {/* <span>Opsi Lainnya</span> */}
            </Button>
          ) : null
        }
      >
        {isViewStepActive ? (
          isKpr ? (
            <Button
              type="button"
              disabled={!canAdvance || !canEdit || isReadOnlyState}
              onClick={() => setIsAjukanKprOpen(true)}
              className="bg-deep-teal hover:bg-teal-700 text-white text-xs font-semibold h-9 shadow-2xs"
            >
              <Building2 className="mr-1.5 h-4 w-4" />
              <span>Ajukan ke Bank</span>
            </Button>
          ) : (
            <Button
              type="button"
              disabled={!canAdvance || !canEdit || isReadOnlyState || isSubmittingAdvance}
              onClick={onAdvanceCashToPayment}
              className="bg-deep-teal hover:bg-teal-700 text-white text-xs font-semibold h-9 shadow-2xs"
            >
              <ArrowRight className="mr-1.5 h-4 w-4" />
              <span>{isSubmittingAdvance ? "Memproses..." : "Lanjut ke Pembayaran"}</span>
            </Button>
          )
        ) : (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onReturnToActive}
            className="bg-deep-teal hover:bg-teal-700 text-white text-xs font-semibold h-9"
          >
            <span>Kembali ke Tahap Aktif</span>
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
      </StickyActionBar>

      {/* Sheets */}
      <ProfileSheet
        isOpen={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        transaksiId={transaksiId}
        initialStatusPernikahan={statusPernikahan}
        initialStatusPekerjaan={statusPekerjaan}
        canEdit={canEdit}
        isReadOnly={isReadOnlyState}
      />

      {isKpr && (
        <AjukanKprSheet
          isOpen={isAjukanKprOpen}
          onOpenChange={setIsAjukanKprOpen}
          transaksiId={transaksiId}
          masterBanks={masterBanks}
          existingSubmissions={pengajuanKprList}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
