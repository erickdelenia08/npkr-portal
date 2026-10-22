// components/manager/report-tabs.tsx
import React from "react";
import Link from "next/link";
import { ReportTabKey } from "@/lib/dashboard/reports";

interface TabItem {
  key: ReportTabKey;
  label: string;
}

export const REPORT_TAB_ITEMS: TabItem[] = [
  { key: "marketing", label: "Kinerja Marketing" },
  { key: "penjualan", label: "Penjualan Closing" },
  { key: "kas", label: "Kas Masuk" },
  { key: "piutang", label: "Piutang Konsumen" },
  { key: "pembatalan", label: "Pembatalan" },
  { key: "bank", label: "Pengajuan KPR" },
  { key: "durasi", label: "Durasi SLA" },
  { key: "inventori", label: "Inventori Unit" },
  { key: "leads", label: "Prospek & Sumber" },
];

interface ReportTabsProps {
  activeTab: ReportTabKey;
  currentMonth: string;
}

export function ReportTabs({ activeTab, currentMonth }: ReportTabsProps) {
  return (
    <div className="border-b border-mist">
      <nav
        aria-label="Tab Laporan Manajemen"
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1"
      >
        {REPORT_TAB_ITEMS.map((tab) => {
          const isActive = tab.key === activeTab;

          return (
            <Link
              key={tab.key}
              href={`/manager/laporan?tab=${tab.key}&bulan=${currentMonth}`}
              aria-current={isActive ? "page" : undefined}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prism-teal ${
                isActive
                  ? "bg-teal-50 text-deep-teal border border-teal-200 shadow-2xs font-bold"
                  : "text-slate hover:text-carbon-ink hover:bg-bone border border-transparent"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
