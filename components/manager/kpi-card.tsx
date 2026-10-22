// components/manager/kpi-card.tsx
import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { MetricComparison } from "@/lib/dashboard/manager";

interface KpiCardProps {
  title: string;
  value: string;
  comparison: MetricComparison;
  icon?: React.ReactNode;
}

export function KpiCard({ title, value, comparison, icon }: KpiCardProps) {
  const { label, isPositive, diff, hint } = comparison;

  return (
    <div className="bg-white border border-mist p-5 rounded-2xl shadow-subtle flex flex-col justify-between transition-all hover:border-slate/30">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-semibold text-slate uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-deep-teal flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-extrabold text-carbon-ink tracking-tight">
          {value}
        </div>

        {hint && (
          <div className="text-[12px] text-slate mt-0.5">
            {hint}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-mist/60 flex items-center gap-1.5 text-[12px]">
        {diff === 0 ? (
          <div className="flex items-center gap-1 text-slate font-medium">
            <Minus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </div>
        ) : isPositive ? (
          <div className="flex items-center gap-1 text-emerald-700 font-medium">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-rose-700 font-medium">
            <TrendingDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
