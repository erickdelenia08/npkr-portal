// lib/dashboard/format.ts
import { formatDateOnly as formatDateOnlyUTC } from "@/lib/date/wib";

/**
 * Format integer numbers with Indonesian thousands separator (e.g. 12500 -> "12.500").
 */
export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "0";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format currency in Rupiah without decimals (e.g. 250000000 -> "Rp 250.000.000").
 */
export function formatIdr(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format compact Indonesian Rupiah (e.g. "Rp 1,25 M" or "Rp 850 jt").
 */
export function formatCompactIdr(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value) || value === 0) {
    return "Rp 0";
  }

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    const m = abs / 1_000_000_000;
    const formatted = m
      .toLocaleString("id-ID", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      });
    return `${sign}Rp ${formatted} M`;
  }

  if (abs >= 1_000_000) {
    const jt = abs / 1_000_000;
    const formatted = jt
      .toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      });
    return `${sign}Rp ${formatted} jt`;
  }

  return formatIdr(value);
}

/**
 * Format decimal numbers with Indonesian locale comma (e.g. 12.345 -> "12,3").
 */
export function formatDecimal(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format percentage (ratio 0..1 or 0..100) with Indonesian locale comma.
 * e.g. 0.455 -> "45,5%".
 */
export function formatPct(
  ratio: number | null | undefined,
  isRawRatio = true
): string {
  if (ratio === null || ratio === undefined || isNaN(ratio)) return "-";
  const pct = isRawRatio ? ratio * 100 : ratio;
  return `${pct.toLocaleString("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

/**
 * Re-export date-only formatting with UTC timezone.
 */
export const formatDateOnly = formatDateOnlyUTC;

/**
 * Humanizes enum values (e.g. "PROSES_BANK" -> "Proses Bank", "FACEBOOK_ADS" -> "Facebook Ads").
 */
export function humanizeEnum(val: string | null | undefined): string {
  if (!val) return "-";
  return val
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
