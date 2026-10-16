"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

/**
 * Human-friendly dictionary mapping URL segments to readable titles.
 */
const ROUTE_LABELS: Record<string, string> = {
  marketing: "Marketing",
  admin: "Admin",
  manager: "Manager",
  dashboard: "Dashboard",
  lead: "Lead",
  "manajemen-lead": "Manajemen Lead",
  unit: "Unit",
  "master-unit": "Master Unit",
  itj: "ITJ",
  "validasi-itj": "Validasi ITJ",
  transaksi: "Transaksi",
  "pantauan-transaksi": "Pantauan Transaksi",
  "tim-marketing": "Tim Marketing",
  laporan: "Laporan",
  customer: "Customer",
  pembayaran: "Pembayaran",
  kwitansi: "Kwitansi",
  settings: "Pengaturan",
};

/**
 * Format a URL path segment into a clean, capitalized label.
 */
function formatSegmentLabel(segment: string): string {
  const lower = segment.toLowerCase();
  if (ROUTE_LABELS[lower]) {
    return ROUTE_LABELS[lower];
  }

  // If numeric or ID
  if (/^\d+$/.test(segment)) {
    return `#${segment}`;
  }

  // Capitalize hyphenated words
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface BreadcrumbItem {
  label: string;
  href: string;
  isLast: boolean;
}

export function Breadcrumb({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  // Split path into individual non-empty segments
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const items: BreadcrumbItem[] = segments.map((segment, index) => {
    const isLast = index === segments.length - 1;
    const accumulatedPath = `/${segments.slice(0, index + 1).join("/")}`;

    // For the role root (e.g. /admin), route to its dashboard if applicable
    let targetHref = accumulatedPath;
    if (index === 0 && (segment === "admin" || segment === "marketing" || segment === "manager")) {
      targetHref = `/${segment}/dashboard`;
    }

    return {
      label: formatSegmentLabel(segment),
      href: targetHref,
      isLast,
    };
  });

  return (
    <nav aria-label="Breadcrumb" className={`text-xs md:text-sm font-medium ${className}`}>
      <ol className="flex items-center flex-wrap gap-1.5 text-slate">
        <li className="inline-flex items-center">
          <Link
            href={`/${segments[0] || "marketing"}/dashboard`}
            className="text-slate hover:text-graphite transition-colors inline-flex items-center gap-1"
            title="Beranda Role"
          >
            <Home className="w-3.5 h-3.5 text-slate" aria-hidden="true" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {items.map((item, index) => (
          <li key={item.href + index} className="inline-flex items-center gap-1.5">
            <ChevronRight
              className="w-3.5 h-3.5 text-fog shrink-0"
              aria-hidden="true"
            />
            {item.isLast ? (
              <span
                className="text-graphite font-semibold truncate max-w-[180px] md:max-w-xs"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-slate hover:text-graphite hover:underline transition-colors truncate max-w-[140px] md:max-w-none"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
