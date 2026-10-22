// components/manager/funnel-chart.tsx
import React from "react";
import { FunnelStep } from "@/lib/dashboard/manager";
import { formatInt } from "@/lib/dashboard/format";

interface FunnelChartProps {
  steps: FunnelStep[];
  totalLeads: number;
}

export function FunnelChart({ steps, totalLeads }: FunnelChartProps) {
  if (totalLeads === 0) {
    return (
      <div className="py-8 text-center text-slate text-xs bg-bone/40 rounded-xl border border-mist">
        Tidak ada data prospek (lead masuk) untuk periode bulan ini.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Visual CSS Bar Funnel */}
      <div className="space-y-3" aria-hidden="true">
        {steps.map((step, idx) => {
          const widthPct = Math.max(step.pctOfTotal, 4); // minimum 4% so bar is visible

          return (
            <div key={step.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-carbon-ink">
                  {idx + 1}. {step.label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-carbon-ink">
                    {formatInt(step.count)} lead
                  </span>
                  <span className="text-slate text-[11px] w-14 text-right">
                    {step.pctOfTotal.toFixed(1)}% total
                  </span>
                  {idx > 0 && (
                    <span className="text-deep-teal font-semibold text-[11px] w-16 text-right">
                      {step.pctOfPrev.toFixed(1)}% tahap
                    </span>
                  )}
                </div>
              </div>

              <div className="h-4 bg-bone rounded-md overflow-hidden p-0.5">
                <div
                  className="h-full bg-deep-teal rounded-sm transition-all duration-300"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Accessible Screen Reader Table Alternative */}
      <div className="sr-only">
        <table>
          <caption>Tabel Konversi Funnel Prospek Kohort</caption>
          <thead>
            <tr>
              <th scope="col">Tahap Funnel</th>
              <th scope="col">Jumlah Prospek</th>
              <th scope="col">% dari Total Lead</th>
              <th scope="col">% dari Tahap Sebelumnya</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((step) => (
              <tr key={step.key}>
                <td>{step.label}</td>
                <td>{step.count}</td>
                <td>{step.pctOfTotal.toFixed(1)}%</td>
                <td>{step.pctOfPrev.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
