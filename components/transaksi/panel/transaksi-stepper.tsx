"use client";

import React from "react";
import { Check, Lock } from "lucide-react";
import {
  type UiStepId,
  type UiStepDefinition,
  getStepStatus,
} from "@/lib/transaksi/stage-map";
import type { DocumentsSummary } from "@/lib/transaksi/document-rules";
import type { TahapDetail } from "@/generated/prisma";

export interface TransaksiStepperProps {
  steps: UiStepDefinition[];
  viewStep: UiStepId;
  activeStep: UiStepId;
  currentTahapDetail: TahapDetail | string;
  onSelectStep: (stepId: UiStepId) => void;
  docsSummary?: DocumentsSummary;
  isKpr?: boolean;
}

export function TransaksiStepper({
  steps,
  viewStep,
  activeStep,
  currentTahapDetail,
  onSelectStep,
  docsSummary,
}: TransaksiStepperProps) {
  // Document counts for Step 1 badge
  const totalWajibDocs = docsSummary
    ? docsSummary.pengajuan.total + docsSummary.akad.total
    : 0;
  const verifiedWajibDocs = docsSummary
    ? docsSummary.pengajuan.done + docsSummary.akad.done
    : 0;
  const hasMissingAkadDocs = docsSummary
    ? docsSummary.missingForAkad.length > 0
    : false;

  const currentViewStepDef =
    steps.find((s) => s.id === viewStep) || steps[0];

  return (
    <div className="bg-white rounded-xl border border-mist p-3.5 sm:p-5 shadow-2xs">
      {/* ─── DESKTOP STEPPER (>= md) ─── */}
      <div className="hidden md:flex items-center justify-between gap-3">
        {steps.map((step, idx) => {
          const status = getStepStatus(
            step.id,
            activeStep,
            currentTahapDetail
          );
          const isSelected = viewStep === step.id;
          const isClickable = status !== "terkunci";

          let stepHint = "";
          if (step.id === "akad-bast" && status === "terkunci") {
            stepHint = "Terbuka setelah akad dicatat";
          } else if (status === "terkunci") {
            stepHint = "Selesaikan tahap sebelumnya";
          }

          return (
            <React.Fragment key={step.id}>
              {/* Step item button */}
              <button
                type="button"
                onClick={() => isClickable && onSelectStep(step.id)}
                disabled={!isClickable}
                aria-current={isSelected ? "step" : undefined}
                aria-disabled={!isClickable}
                title={stepHint || step.label}
                className={`flex items-center gap-3 text-left p-2 rounded-lg transition-all select-none min-h-[48px] ${
                  isClickable
                    ? "cursor-pointer hover:bg-bone/60"
                    : "cursor-not-allowed opacity-60"
                } ${isSelected ? "ring-1 ring-deep-teal/40 bg-teal-50/40" : ""}`}
              >
                {/* Step circle / indicator */}
                <div className="relative shrink-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-colors ${
                      status === "selesai"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : status === "aktif"
                        ? "bg-deep-teal text-white ring-4 ring-teal-50 shadow-2xs"
                        : "bg-bone text-steel border border-mist"
                    }`}
                  >
                    {status === "selesai" ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : status === "terkunci" ? (
                      <Lock className="w-3.5 h-3.5 text-steel" />
                    ) : (
                      step.stepNumber
                    )}
                  </div>

                  {/* Amber dot for Step 1 if any AKAD-gate docs are still missing */}
                  {step.id === "pemberkasan" && hasMissingAkadDocs && (
                    <span
                      title="Terdapat berkas menyusul yang belum lengkap sebelum Akad"
                      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white"
                    />
                  )}
                </div>

                {/* Step labels */}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs sm:text-sm font-semibold truncate ${
                        isSelected
                          ? "text-deep-teal font-bold"
                          : status === "terkunci"
                          ? "text-steel"
                          : "text-carbon-ink"
                      }`}
                    >
                      {step.label}
                    </span>

                    {/* Step 1 doc counter badge */}
                    {step.id === "pemberkasan" && totalWajibDocs > 0 && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold border ${
                          hasMissingAkadDocs
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {verifiedWajibDocs}/{totalWajibDocs}
                      </span>
                    )}
                  </div>

                  <span className="block text-[11px] text-slate truncate">
                    {status === "selesai"
                      ? "Selesai"
                      : status === "aktif"
                      ? "Tahap Aktif"
                      : stepHint || "Terkunci"}
                  </span>
                </div>
              </button>

              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded transition-colors ${
                    status === "selesai" ? "bg-emerald-500" : "bg-mist"
                  }`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ─── MOBILE STEPPER (< md) ─── */}
      <div className="md:hidden space-y-2.5">
        <div className="flex items-center justify-between">
          {/* Row of numbered steps */}
          <div className="flex items-center gap-2">
            {steps.map((step, idx) => {
              const status = getStepStatus(
                step.id,
                activeStep,
                currentTahapDetail
              );
              const isSelected = viewStep === step.id;
              const isClickable = status !== "terkunci";

              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    onClick={() => isClickable && onSelectStep(step.id)}
                    disabled={!isClickable}
                    aria-current={isSelected ? "step" : undefined}
                    aria-label={`Langkah ${step.stepNumber}: ${step.label} (${status})`}
                    className={`relative w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-all ${
                      status === "selesai"
                        ? "bg-emerald-600 text-white"
                        : status === "aktif"
                        ? "bg-deep-teal text-white ring-3 ring-teal-100"
                        : "bg-bone text-steel border border-mist"
                    } ${
                      isSelected
                        ? "scale-105 shadow-sm"
                        : isClickable
                        ? "opacity-90"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {status === "selesai" ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : status === "terkunci" ? (
                      <Lock className="w-3 h-3 text-steel" />
                    ) : (
                      step.stepNumber
                    )}

                    {/* Amber dot for Step 1 */}
                    {step.id === "pemberkasan" && hasMissingAkadDocs && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 ring-1.5 ring-white" />
                    )}
                  </button>

                  {idx < steps.length - 1 && (
                    <div
                      className={`w-4 h-0.5 rounded ${
                        status === "selesai" ? "bg-emerald-500" : "bg-mist"
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Step 1 badge counter for mobile */}
          {totalWajibDocs > 0 && (
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold border ${
                hasMissingAkadDocs
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              Berkas: {verifiedWajibDocs}/{totalWajibDocs}
            </span>
          )}
        </div>

        {/* Selected step label display on mobile */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-mist/50">
          <div className="flex items-center gap-1.5">
            <span className="text-slate font-medium">Langkah {currentViewStepDef.stepNumber}:</span>
            <span className="font-bold text-carbon-ink">
              {currentViewStepDef.label}
            </span>
          </div>

          <span className="text-[11px] text-slate font-medium">
            {viewStep === activeStep ? (
              <span className="text-deep-teal font-semibold">Tahap Berjalan</span>
            ) : (
              <span>Pratinjau Langkah</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

