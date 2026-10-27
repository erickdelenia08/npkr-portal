// components/leads/LeadMilestoneStepper.tsx
"use client";

import React from "react";
import { Check, Clock, AlertTriangle } from "lucide-react";
import { SerializedLeadDetail } from "@/actions/activity";

interface LeadMilestoneStepperProps {
  lead: SerializedLeadDetail;
}

interface StepItem {
  key: string;
  label: string;
  date: Date | string | null | undefined;
  isCompleted: boolean;
  isActive: boolean;
}

export function LeadMilestoneStepper({ lead }: LeadMilestoneStepperProps) {
  const formatDate = (val: Date | string | null | undefined): string | null => {
    if (!val) return null;
    const date = typeof val === "string" ? new Date(val) : val;
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const isLost = Boolean(lead.lost_at);

  // Milestone logic
  const hasLeadMasuk = Boolean(lead.created_at);
  const hasSurveiJadwal = Boolean(lead.survei_jadwal_at);
  const hasSudahSurvei = Boolean(lead.survei_selesai_at);
  const hasClosing = Boolean(lead.closing_at);

  const steps: StepItem[] = [
    {
      key: "lead_masuk",
      label: "Lead Masuk",
      date: lead.created_at,
      isCompleted: hasLeadMasuk,
      isActive: hasLeadMasuk && !hasSurveiJadwal && !isLost,
    },
    {
      key: "survei_jadwal",
      label: "Survei Jadwal",
      date: lead.survei_jadwal_at,
      isCompleted: hasSurveiJadwal,
      isActive: hasSurveiJadwal && !hasSudahSurvei && !isLost,
    },
    {
      key: "sudah_survei",
      label: "Sudah Survei",
      date: lead.survei_selesai_at,
      isCompleted: hasSudahSurvei,
      isActive: hasSudahSurvei && !hasClosing && !isLost,
    },
    {
      key: "closing",
      label: "Closing",
      date: lead.itj?.transaksi?.closing_at,
      isCompleted: Boolean(lead.itj?.transaksi?.closing_at),
      isActive: Boolean(lead.itj?.transaksi?.closing_at && !isLost),
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-mist p-4 sm:p-5 shadow-2xs space-y-3">
      {/* Lost Banner if lead is lost */}
      {isLost && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold">Lead Berstatus Tidak Jadi (Lost)</p>
            <p className="text-rose-700">
              Alasan: {lead.lost_reason || "Tidak disebutkan"}
              {lead.lost_at && ` • ${formatDate(lead.lost_at)}`}
            </p>
          </div>
        </div>
      )}

      {/* Stepper Timeline */}
      <div className="relative">
        <ol className="grid grid-cols-4 gap-2 sm:gap-4 relative">
          {steps.map((step, idx) => {
            const formattedDate = formatDate(step.date);
            const isLast = idx === steps.length - 1;

            return (
              <li key={step.key} className="relative flex flex-col items-center text-center">
                {/* Connecting Line to next step */}
                {!isLast && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-[2px] -z-0 transition-colors ${steps[idx + 1].isCompleted
                      ? "bg-teal-500"
                      : "bg-slate-200"
                      }`}
                    style={{ transform: "translateY(-50%)" }}
                  />
                )}

                {/* Step Circle Indicator */}
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${step.isCompleted
                    ? "bg-teal-600 text-white ring-4 ring-teal-50"
                    : step.isActive
                      ? "bg-white text-teal-700 border-2 border-teal-600 ring-4 ring-teal-50/70"
                      : "bg-bone text-slate-400 border border-mist"
                    }`}
                >
                  {step.isCompleted ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step Title & Date */}
                <div className="mt-2 space-y-0.5 px-0.5">
                  <p
                    className={`text-[11px] sm:text-xs font-bold leading-tight ${step.isCompleted || step.isActive
                      ? "text-carbon-ink"
                      : "text-slate-400"
                      }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate font-mono">
                    {formattedDate ? (
                      formattedDate
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
