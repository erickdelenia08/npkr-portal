"use client";

import React, { Suspense, useMemo, useState, useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Workflow,
  LockKeyhole,
  CheckCircle2,
  Ban,
  AlertTriangle,
} from "lucide-react";

import {
  type UiStepId,
  getUiStepsForMetode,
  getActiveStepForStage,
} from "@/lib/transaksi/stage-map";
import { toast } from "sonner";
import {
  getRequiredDocuments,
  summarizeDocuments,
} from "@/lib/transaksi/document-rules";

import { TransaksiStepper } from "@/components/transaksi/panel/transaksi-stepper";
import { StepBanner } from "@/components/transaksi/panel/step-banner";
import { StepPemberkasan } from "@/components/transaksi/panel/step-pemberkasan";
import { StepProsesBank } from "@/components/transaksi/panel/step-proses-bank";
import { StepPembayaran } from "@/components/transaksi/panel/step-pembayaran";
import { updateTransactionStatus } from "@/actions/transaksi.action";
import {
  StepAkadBast,
  MASTER_BAST_ITEMS,
  type BastItemDef,
} from "@/components/transaksi/panel/step-akad-bast";
import { OtherOptionsSheet } from "@/components/transaksi/panel/other-options-sheet";
import type { DokumenInfoItem } from "@/components/transaksi/panel/document-checklist";

import type {
  MetodeBayar,
  ItemBAST,
  StatusBAST,
  StatusPernikahan,
  StatusPekerjaan,
  TahapDetail
} from "@/generated/prisma";
import type {
  BankItem,
  PengajuanKPRItem,
} from "@/components/forms/kpr-submission-section";

// --------------------------------------------------
// Exported Types (Backwards Compatible)
// --------------------------------------------------

export interface ChecklistBastPropItem {
  item: ItemBAST;
  status: StatusBAST;
}

export type InspeksiBastPropItem = ChecklistBastPropItem;

export interface FinancialSummaryProp {
  hargaDeal: number;
  totalPaid: number;
  targetDp: number;
  dpPaid: number;
  sisaPelunasan: number;
  sisaDp: number;
  lastPaymentDate: string | null;
}

export interface DynamicActionPanelProps {
  transaksiId: number;
  leadId: number;
  version: number;
  metodeBayar: MetodeBayar;
  kategoriUnit: "SUBSIDI" | "KOMERSIL" | "KAVLING";
  currentTahapDetail: string;
  currentStatus?: string;
  initialNotaris: string | null;
  initialTglAkad: string | null;
  initialTglAjb?: string | null;
  initialTglBast?: string | null;
  initialLunasAt?: string | null;
  initialRencanaAkad?: string | null;
  initialRencanaBast?: string | null;
  initialPengajuanTerpilihId?: number | null;
  initialCatatan: string | null;
  initialVerifiedDocs?: string[];
  initialDokumenInfo?: DokumenInfoItem[];
  initialChecklistBast?: ChecklistBastPropItem[];
  initialInspeksiBast?: ChecklistBastPropItem[];
  initialPengajuanKpr?: PengajuanKPRItem[];
  masterBanks?: BankItem[];
  canEdit?: boolean;
  statusPernikahan?: StatusPernikahan | null;
  statusPekerjaan?: StatusPekerjaan | null;
  financialSummary?: FinancialSummaryProp;
}

export { MASTER_BAST_ITEMS, type BastItemDef };

const EMPTY_STRINGS: string[] = [];
const EMPTY_DOKUMEN_INFO: DokumenInfoItem[] = [];
const EMPTY_CHECKLIST: ChecklistBastPropItem[] = [];
const EMPTY_PENGAJUAN: PengajuanKPRItem[] = [];
const EMPTY_BANKS: BankItem[] = [];

// Humanize helper
const humanize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

// --------------------------------------------------
// Inner Component with URL & State Synchronization
// --------------------------------------------------
// Tahap pertama setelah pemberkasan untuk metode Cash (sesuai alur di stage-map)
const CASH_FIRST_PAYMENT_STAGE: Partial<Record<MetodeBayar, TahapDetail>> = {
  CASH_KERAS: "MENUNGGU_PELUNASAN",
  CASH_TEMPO: "PEMBAYARAN_DP",
};


function DynamicActionPanelInner({
  transaksiId,
  leadId,
  version,
  metodeBayar,
  kategoriUnit,
  currentTahapDetail,
  currentStatus,
  initialNotaris,
  initialTglAkad,
  initialTglAjb,
  initialTglBast,
  initialLunasAt,
  initialRencanaAkad,
  initialRencanaBast,
  initialPengajuanTerpilihId,
  initialVerifiedDocs = EMPTY_STRINGS,
  initialDokumenInfo = EMPTY_DOKUMEN_INFO,
  initialChecklistBast,
  initialInspeksiBast,
  initialPengajuanKpr = EMPTY_PENGAJUAN,
  masterBanks = EMPTY_BANKS,
  canEdit = true,
  statusPernikahan,
  statusPekerjaan,
  financialSummary,
}: DynamicActionPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isCompleted = currentTahapDetail === "BAST";
  const isCancelled = currentTahapDetail === "BATAL";

  const steps = useMemo(
    () => getUiStepsForMetode(metodeBayar),
    [metodeBayar]
  );

  const activeStep = useMemo<UiStepId>(
    () => getActiveStepForStage(currentTahapDetail, metodeBayar),
    [currentTahapDetail, metodeBayar]
  );

  // Hanya langkah sampai posisi aktif yang boleh dibuka (langkah masa depan terkunci)
  const activeIndex = steps.findIndex((s) => s.id === activeStep);
  const isStepViewable = (id: UiStepId) => {
    const idx = steps.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    return activeIndex === -1 || idx <= activeIndex;
  };

  const queryLangkah = searchParams?.get("langkah") as UiStepId | null;
  const [viewStep, setViewStep] = useState<UiStepId>(
    queryLangkah && isStepViewable(queryLangkah) ? queryLangkah : activeStep
  );
  const [isOtherOptionsOpen, setIsOtherOptionsOpen] = useState(false);
  const [isAdvancing, startAdvance] = useTransition();

  const syncUrl = (stepId: UiStepId) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("langkah", stepId);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleSelectStep = (stepId: UiStepId) => {
    if (!isStepViewable(stepId)) return;
    setViewStep(stepId);
    syncUrl(stepId);
  };

  const handleReturnToActive = () => {
    handleSelectStep(activeStep);
  };

  // Mode "ikut posisi": jika admin sedang melihat langkah yang tadinya aktif,
  // lalu tahap transaksi maju (atau mundur) di server, tampilan ikut pindah.
  // Jika admin sedang melihat langkah lain, tampilannya tidak diganggu.
  const prevActiveStepRef = useRef<UiStepId>(activeStep);
  useEffect(() => {
    const prevActive = prevActiveStepRef.current;
    if (prevActive === activeStep) return;
    prevActiveStepRef.current = activeStep;

    if (viewStep === prevActive) {
      setViewStep(activeStep);
      syncUrl(activeStep);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  // Cash: "Lanjut ke Pembayaran" harus benar-benar memajukan tahap di server
  const handleAdvanceCashToPayment = () => {
    if (!canEdit || isAdvancing) return;

    const target = CASH_FIRST_PAYMENT_STAGE[metodeBayar];
    if (!target) return; // KPR memakai alur pengajuan bank

    // Tahap sudah lewat pemberkasan (mis. diubah pengguna lain): cukup pindah tampilan
    if (activeStep !== "pemberkasan") {
      handleSelectStep(activeStep);
      return;
    }

    startAdvance(async () => {
      try {
        const res = await updateTransactionStatus({
          transaksiId,
          leadId,
          tahapDetail: target,
          fromDetail: currentTahapDetail as TahapDetail,
          version,
        });

        if (!res.success) {
          if (res.error?.includes("telah diubah oleh pengguna lain")) {
            toast.error(
              "Data transaksi telah diubah oleh pengguna lain. Halaman akan dimuat ulang."
            );
            router.refresh();
            return;
          }
          toast.error(res.error || "Gagal melanjutkan ke tahap pembayaran.");
          return;
        }

        toast.success(res.message || "Transaksi dilanjutkan ke tahap pembayaran.");
        // Tampilan ikut pindah ke Pembayaran lewat efek "ikut posisi" di atas
        router.refresh();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Terjadi kesalahan sistem."
        );
      }
    });
  };

  // Rule-based document requirements calculation
  const ruleResult = useMemo(() => {
    return getRequiredDocuments({
      metode: metodeBayar,
      kategori: kategoriUnit,
      statusPernikahan,
      statusPekerjaan,
    });
  }, [metodeBayar, kategoriUnit, statusPernikahan, statusPekerjaan]);

  const docsSummary = useMemo(() => {
    return summarizeDocuments(ruleResult.documents, initialVerifiedDocs);
  }, [ruleResult.documents, initialVerifiedDocs]);

  const effectiveChecklistBast =
    initialChecklistBast ?? initialInspeksiBast ?? EMPTY_CHECKLIST;

  return (
    <section className="space-y-4">
      {/* ─── Read-Only Notice ─── */}
      {!canEdit && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-xs font-medium text-amber-900 shadow-2xs">
          <LockKeyhole className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Mode Baca Saja: Hanya PIC Transaksi atau Super Admin yang dapat memperbarui tahapan transaksi ini.
          </span>
        </div>
      )}

      {/* ─── Terminal State Banners ─── */}
      {isCompleted && (
        <div
          role="status"
          className="flex items-start gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950 shadow-2xs"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">
              Transaksi Selesai — Serah Terima (BAST)
            </h4>
            <p className="text-xs text-emerald-900 mt-0.5">
              Unit telah resmi diserahterimakan kepada konsumen. Seluruh tahapan transaksi telah selesai.
            </p>
          </div>
        </div>
      )}

      {isCancelled && (
        <div
          role="status"
          className="flex items-start gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-950 shadow-2xs"
        >
          <Ban className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Transaksi Dibatalkan</h4>
            <p className="text-xs text-rose-900 mt-0.5">
              Transaksi ini telah dibatalkan. Riwayat alasan pembatalan tercatat di audit trail.
            </p>
          </div>
        </div>
      )}

      {/* ─── 1. Responsive Stepper ─── */}
      <TransaksiStepper
        steps={steps}
        viewStep={viewStep}
        activeStep={activeStep}
        currentTahapDetail={currentTahapDetail}
        onSelectStep={handleSelectStep}
        docsSummary={docsSummary}
        isKpr={metodeBayar === "KPR"}
      />

      {/* ─── 2. Step View Banner (when viewStep !== activeStep) ─── */}
      {/* <StepBanner
        viewStep={viewStep}
        activeStep={activeStep}
        steps={steps}
        onReturnToActive={handleReturnToActive}
      /> */}

      {/* ─── 3. Active View Step Content ─── */}
      {viewStep === "pemberkasan" && (
        <StepPemberkasan
          transaksiId={transaksiId}
          leadId={leadId}
          version={version}
          metodeBayar={metodeBayar}
          currentTahapDetail={currentTahapDetail}
          isViewStepActive={viewStep === activeStep}
          canEdit={canEdit}
          statusPernikahan={statusPernikahan}
          statusPekerjaan={statusPekerjaan}
          documents={ruleResult.documents}
          verifiedDocs={initialVerifiedDocs}
          dokumenInfo={initialDokumenInfo}
          docsSummary={docsSummary}
          masterBanks={masterBanks}
          pengajuanKprList={initialPengajuanKpr}
          onOpenOtherOptions={() => setIsOtherOptionsOpen(true)}
          onReturnToActive={handleReturnToActive}
          // onAdvanceCashToPayment={() => handleSelectStep("pembayaran")}
          onAdvanceCashToPayment={handleAdvanceCashToPayment}
        />
      )}

      {viewStep === "proses-bank" && (
        <StepProsesBank
          transaksiId={transaksiId}
          leadId={leadId}
          version={version}
          metodeBayar={metodeBayar}
          currentTahapDetail={currentTahapDetail}
          isViewStepActive={viewStep === activeStep}
          canEdit={canEdit}
          docsSummary={docsSummary}
          masterBanks={masterBanks}
          pengajuanKprList={initialPengajuanKpr}
          initialNotaris={initialNotaris}
          initialRencanaAkad={initialRencanaAkad}
          onOpenOtherOptions={() => setIsOtherOptionsOpen(true)}
          onGoToPemberkasan={() => handleSelectStep("pemberkasan")}
          onReturnToActive={handleReturnToActive}
        />
      )}

      {/* <span>{activeStep}</span> */}

      {viewStep === "pembayaran" && (
        <StepPembayaran
          transaksiId={transaksiId}
          leadId={leadId}
          version={version}
          metodeBayar={metodeBayar}
          currentTahapDetail={currentTahapDetail}
          isViewStepActive={viewStep === activeStep}
          canEdit={canEdit}
          financialSummary={financialSummary}
          docsSummary={docsSummary}
          initialNotaris={initialNotaris}
          initialRencanaAkad={initialRencanaAkad}
          initialLunasAt={initialLunasAt}
          onOpenOtherOptions={() => setIsOtherOptionsOpen(true)}
          onGoToPemberkasan={() => handleSelectStep("pemberkasan")}
          onReturnToActive={handleReturnToActive}
        />
      )}

      {viewStep === "akad-bast" && (
        <StepAkadBast
          transaksiId={transaksiId}
          leadId={leadId}
          version={version}
          metodeBayar={metodeBayar}
          kategoriUnit={kategoriUnit}
          currentTahapDetail={currentTahapDetail}
          isViewStepActive={viewStep === activeStep}
          canEdit={canEdit}
          initialNotaris={initialNotaris}
          initialTglAkad={initialTglAkad}
          initialTglAjb={initialTglAjb}
          initialTglBast={initialTglBast}
          initialRencanaBast={initialRencanaBast}
          initialPengajuanTerpilihId={initialPengajuanTerpilihId}
          initialPengajuanKpr={initialPengajuanKpr}
          initialChecklistBast={effectiveChecklistBast}
          onOpenOtherOptions={() => setIsOtherOptionsOpen(true)}
          onReturnToActive={handleReturnToActive}
        />
      )}

      {/* ─── 4. Global Other Options Sheet (Mundur / Batal) ─── */}
      <OtherOptionsSheet
        isOpen={isOtherOptionsOpen}
        onOpenChange={setIsOtherOptionsOpen}
        transaksiId={transaksiId}
        leadId={leadId}
        version={version}
        metodeBayar={metodeBayar}
        currentTahapDetail={currentTahapDetail}
        canEdit={canEdit}
      />
    </section>
  );
}

// --------------------------------------------------
// Exported Component Wrapped in Suspense Boundary
// --------------------------------------------------

export function DynamicActionPanel(props: DynamicActionPanelProps) {
  return (
    <Suspense
      fallback={
        <div className="p-8 rounded-xl border border-mist bg-white text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-deep-teal border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate font-medium">
            Memuat progress transaksi...
          </p>
        </div>
      }
    >
      <DynamicActionPanelInner {...props} />
    </Suspense>
  );
}
