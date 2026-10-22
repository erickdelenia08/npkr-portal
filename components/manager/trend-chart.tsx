// components/manager/trend-chart.tsx
import React from "react";
import { TrendMonthData } from "@/lib/dashboard/manager";

interface TrendChartProps {
  data: TrendMonthData[];
}

export function TrendChart({ data }: TrendChartProps) {
  // Find highest value across all 6 months to scale bars
  const maxValue = Math.max(
    ...data.map((d) => Math.max(d.leadMasuk, d.itjDisetujui, d.closing)),
    10
  );

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-slate-300 inline-block" />
          <span>Lead Masuk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-teal-400 inline-block" />
          <span>ITJ Disetujui</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs bg-deep-teal inline-block" />
          <span>Closing Terjual</span>
        </div>
      </div>

      {/* Visual CSS Grouped Bars */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-6 pb-2"
        aria-hidden="true"
      >
        {data.map((m) => {
          const hLead = Math.max((m.leadMasuk / maxValue) * 120, 4);
          const hItj = Math.max((m.itjDisetujui / maxValue) * 120, 4);
          const hClose = Math.max((m.closing / maxValue) * 120, 4);

          return (
            <div
              key={m.key}
              className="flex flex-col items-center bg-bone/30 rounded-xl p-2.5 border border-mist/70"
            >
              {/* Bars container */}
              <div className="h-32 w-full flex items-end justify-center gap-1.5 pb-2 border-b border-mist">
                {/* Lead Masuk Bar */}
                <div className="flex flex-col items-center flex-1 max-w-[20px]">
                  <span className="text-[10px] text-slate mb-1 font-semibold">
                    {m.leadMasuk}
                  </span>
                  <div
                    className="w-full bg-slate-300 rounded-t-xs"
                    style={{ height: `${hLead}px` }}
                    title={`Lead Masuk: ${m.leadMasuk}`}
                  />
                </div>

                {/* ITJ Disetujui Bar */}
                <div className="flex flex-col items-center flex-1 max-w-[20px]">
                  <span className="text-[10px] text-teal-600 mb-1 font-semibold">
                    {m.itjDisetujui}
                  </span>
                  <div
                    className="w-full bg-teal-400 rounded-t-xs"
                    style={{ height: `${hItj}px` }}
                    title={`ITJ Disetujui: ${m.itjDisetujui}`}
                  />
                </div>

                {/* Closing Bar */}
                <div className="flex flex-col items-center flex-1 max-w-[20px]">
                  <span className="text-[10px] text-deep-teal mb-1 font-bold">
                    {m.closing}
                  </span>
                  <div
                    className="w-full bg-deep-teal rounded-t-xs"
                    style={{ height: `${hClose}px` }}
                    title={`Closing: ${m.closing}`}
                  />
                </div>
              </div>

              {/* Month label */}
              <span className="text-[11px] font-semibold text-carbon-ink mt-2 text-center whitespace-nowrap">
                {m.label.split(" ")[0]}
              </span>
              <span className="text-[10px] text-slate">
                {m.label.split(" ")[1]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Accessible Screen Reader Table */}
      <div className="sr-only">
        <table>
          <caption>Tren Performa 6 Bulan Terakhir</caption>
          <thead>
            <tr>
              <th scope="col">Bulan</th>
              <th scope="col">Lead Masuk</th>
              <th scope="col">ITJ Disetujui</th>
              <th scope="col">Closing Penjualan</th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.key}>
                <td>{m.label}</td>
                <td>{m.leadMasuk}</td>
                <td>{m.itjDisetujui}</td>
                <td>{m.closing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
