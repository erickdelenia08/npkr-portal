"use client";

import React from "react";
import { Info, ArrowRight } from "lucide-react";
import type { UiStepId, UiStepDefinition } from "@/lib/transaksi/stage-map";

export interface StepBannerProps {
  viewStep: UiStepId;
  activeStep: UiStepId;
  steps: UiStepDefinition[];
  onReturnToActive: () => void;
}

export function StepBanner({
  viewStep,
  activeStep,
  steps,
  onReturnToActive,
}: StepBannerProps) {
  if (viewStep === activeStep) return null;

  const viewStepDef = steps.find((s) => s.id === viewStep);
  const activeStepDef = steps.find((s) => s.id === activeStep);

  const viewLabel = viewStepDef?.label ?? viewStep;
  const activeLabel = activeStepDef?.label ?? activeStep;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-4 py-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs shadow-2xs"
    >
      <div className="flex items-start sm:items-center gap-2.5">
        <Info className="w-4 h-4 text-deep-teal shrink-0 mt-0.5 sm:mt-0" />
        <p className="leading-snug">
          Anda melihat <strong className="font-semibold">{viewLabel}</strong>. Posisi
          transaksi tetap di <strong className="font-semibold">{activeLabel}</strong>.
        </p>
      </div>

      <button
        type="button"
        onClick={onReturnToActive}
        className="inline-flex items-center gap-1.5 font-semibold text-deep-teal hover:text-teal-950 underline hover:no-underline shrink-0 text-xs cursor-pointer select-none self-start sm:self-auto"
      >
        <span>Kembali ke tahap aktif</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

