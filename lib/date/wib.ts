// lib/date/wib.ts

/**
 * Timezone constant for Business Operations: Asia/Jakarta (WIB, UTC+7).
 */
export const WIB_TIMEZONE = "Asia/Jakarta";

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Jakarta (WIB).
 */
export function todayWIB(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Converts a Date or ISO string into a "YYYY-MM-DD" date string in WIB (Asia/Jakarta, UTC+7).
 * If the input is already a "YYYY-MM-DD" string, returns it directly.
 */
export function toWibDay(date: Date | string | null | undefined): string {
  if (!date) return "";
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return date.trim();
  }
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Constructs a Date object set to UTC midnight for a given YYYY-MM-DD string.
 * Used for storing date-only columns (@db.Date) to prevent day-boundary shifts.
 */
export function parseDateOnlyUTC(dateStr: string): Date {
  const clean = dateStr.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    throw new Error(`Format tanggal tidak valid: "${dateStr}". Gunakan format YYYY-MM-DD.`);
  }
  const date = new Date(`${clean}T00:00:00.000Z`);
  if (isNaN(date.getTime())) {
    throw new Error(`Nilai tanggal tidak valid: "${dateStr}".`);
  }
  return date;
}

/**
 * Returns today's date as a UTC midnight Date object based on current WIB date.
 * Used as default value for @db.Date columns (e.g. tgl_bayar, lunas_at).
 */
export function todayDateOnlyUTC(): Date {
  return parseDateOnlyUTC(todayWIB());
}

/**
 * Computes month boundaries in WIB (Asia/Jakarta, UTC+7).
 * - month: 1..12 for specific month, or 0 for the entire year.
 * Returns { start, end } where start is inclusive and end is exclusive.
 */
export function monthRangeWIB(
  year: number,
  month: number
): { start: Date; end: Date } {
  if (month === 0) {
    const nextYear = year + 1;
    const startIso = `${year}-01-01T00:00:00+07:00`;
    const endIso = `${nextYear}-01-01T00:00:00+07:00`;
    return {
      start: new Date(startIso),
      end: new Date(endIso),
    };
  }

  const mStr = String(month).padStart(2, "0");
  const startIso = `${year}-${mStr}-01T00:00:00+07:00`;

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const nextMStr = String(nextMonth).padStart(2, "0");
  const endIso = `${nextYear}-${nextMStr}-01T00:00:00+07:00`;

  return {
    start: new Date(startIso),
    end: new Date(endIso),
  };
}

/**
 * Computes date-only boundaries as UTC midnight for querying @db.Date columns (e.g. closing_at).
 * - month: 1..12 for specific month, or 0 for the entire year.
 * Returns { start, end } where start is inclusive and end is exclusive in UTC midnight.
 */
export function monthRangeDateOnly(
  year: number,
  month: number
): { start: Date; end: Date } {
  if (month === 0) {
    const nextYear = year + 1;
    return {
      start: new Date(`${year}-01-01T00:00:00.000Z`),
      end: new Date(`${nextYear}-01-01T00:00:00.000Z`),
    };
  }

  const mStr = String(month).padStart(2, "0");
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const nextMStr = String(nextMonth).padStart(2, "0");

  return {
    start: new Date(`${year}-${mStr}-01T00:00:00.000Z`),
    end: new Date(`${nextYear}-${nextMStr}-01T00:00:00.000Z`),
  };
}

// Alias for backwards compatibility
export const monthRangeDateOnlyUTC = monthRangeDateOnly;

/**
 * Shifts a "YYYY-MM" string by delta months (+1, -1, etc.).
 */
export function shiftMonth(yearMonth: string, delta: number): string {
  const parts = yearMonth.trim().split("-");
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  if (isNaN(y) || isNaN(m)) {
    const today = todayWIB().slice(0, 7);
    return shiftMonth(today, delta);
  }

  m += delta;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * Parses and validates "YYYY-MM" string from query parameters.
 * If missing or invalid, falls back to the current month in WIB.
 */
export function parseMonthParam(param?: string | null): {
  year: number;
  month: number;
  key: string;
} {
  if (param && /^\d{4}-(0[1-9]|1[0-2])$/.test(param.trim())) {
    const [yStr, mStr] = param.trim().split("-");
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    return {
      year,
      month,
      key: `${year}-${String(month).padStart(2, "0")}`,
    };
  }

  const today = todayWIB(); // "YYYY-MM-DD" in WIB
  const year = parseInt(today.slice(0, 4), 10);
  const month = parseInt(today.slice(5, 7), 10);
  return {
    year,
    month,
    key: `${year}-${String(month).padStart(2, "0")}`,
  };
}

/**
 * Formats year and month into Indonesian locale label (e.g. "Oktober 2026").
 */
export function bulanLabel(year: number, month: number): string {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Calculates calendar day difference between two "YYYY-MM-DD" strings (b - a).
 * e.g. dayDiff("2026-10-01", "2026-10-05") === 4.
 */
export function dayDiff(a: string, b: string): number {
  const da = parseDateOnlyUTC(a);
  const db = parseDateOnlyUTC(b);
  const msDiff = db.getTime() - da.getTime();
  return Math.round(msDiff / (1000 * 60 * 60 * 24));
}

/**
 * Format date-only (@db.Date) values safely using timeZone: "UTC".
 */
export function formatDateOnly(
  date: Date | string | null | undefined,
  locale = "id-ID"
): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Format real timestamp values (created_at, updated_at) using Asia/Jakarta (WIB).
 */
export function formatTimestampWIB(
  date: Date | string | null | undefined,
  locale = "id-ID"
): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    timeZone: WIB_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
