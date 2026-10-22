// components/manager/bar-list.tsx
import React from "react";
import { formatInt } from "@/lib/dashboard/format";

export interface BarListItem {
  label: string;
  value: number;
  formattedValue?: string;
  subValue?: string;
}

interface BarListProps {
  items: BarListItem[];
  emptyMessage?: string;
}

export function BarList({
  items,
  emptyMessage = "Tidak ada data.",
}: BarListProps) {
  if (items.length === 0) {
    return <p className="text-xs text-slate py-4 text-center">{emptyMessage}</p>;
  }

  const maxValue = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const widthPct = Math.max((item.value / maxValue) * 100, item.value > 0 ? 3 : 0);

        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-carbon-ink truncate max-w-[200px]">
                {item.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-carbon-ink">
                  {item.formattedValue || formatInt(item.value)}
                </span>
                {item.subValue && (
                  <span className="text-[11px] text-slate">
                    ({item.subValue})
                  </span>
                )}
              </div>
            </div>

            <div className="h-2.5 bg-bone rounded-full overflow-hidden">
              <div
                className="h-full bg-deep-teal rounded-full transition-all duration-300"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
