// components/manager/month-picker.tsx
"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { shiftMonth, bulanLabel } from "@/lib/date/wib";

interface MonthPickerProps {
  currentMonth: string; // "YYYY-MM"
  className?: string;
}

export function MonthPicker({ currentMonth, className = "" }: MonthPickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [yStr, mStr] = currentMonth.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const label = bulanLabel(year, month);

  const handleMonthChange = (newMonthKey: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("bulan", newMonthKey);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePrev = () => {
    handleMonthChange(shiftMonth(currentMonth, -1));
  };

  const handleNext = () => {
    handleMonthChange(shiftMonth(currentMonth, 1));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      handleMonthChange(e.target.value);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-white border border-mist p-1.5 rounded-xl shadow-subtle ${className}`}
    >
      <button
        type="button"
        onClick={handlePrev}
        aria-label="Pilih bulan sebelumnya"
        className="p-1.5 rounded-lg text-slate hover:text-carbon-ink hover:bg-bone transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-teal"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="relative flex items-center px-2 py-0.5 gap-2 cursor-pointer hover:bg-bone rounded-lg transition-colors group">
        <Calendar className="w-4 h-4 text-deep-teal shrink-0" />
        <span className="text-xs sm:text-sm font-semibold text-carbon-ink select-none whitespace-nowrap">
          {label}
        </span>
        <input
          type="month"
          value={currentMonth}
          onChange={handleInputChange}
          aria-label="Pilih bulan spesifik"
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={handleNext}
        aria-label="Pilih bulan berikutnya"
        className="p-1.5 rounded-lg text-slate hover:text-carbon-ink hover:bg-bone transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-teal"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
