// tests/unit/date-wib.test.ts
import { describe, it, expect } from "vitest";
import {
  monthRangeWIB,
  monthRangeDateOnly,
  shiftMonth,
  toWibDay,
  dayDiff,
  parseMonthParam,
  bulanLabel,
} from "@/lib/date/wib";

describe("lib/date/wib.ts - Date & Timezone Utilities", () => {
  it("computes monthRangeWIB correctly across December to January rollover", () => {
    // December 2026
    const decRange = monthRangeWIB(2026, 12);
    expect(decRange.start.toISOString()).toBe("2026-11-30T17:00:00.000Z"); // 2026-12-01 00:00:00+07:00
    expect(decRange.end.toISOString()).toBe("2026-12-31T17:00:00.000Z"); // 2027-01-01 00:00:00+07:00

    // January 2027
    const janRange = monthRangeWIB(2027, 1);
    expect(janRange.start.toISOString()).toBe("2026-12-31T17:00:00.000Z"); // 2027-01-01 00:00:00+07:00
    expect(janRange.end.toISOString()).toBe("2027-01-31T17:00:00.000Z"); // 2027-02-01 00:00:00+07:00
  });

  it("computes monthRangeDateOnly correctly across December to January rollover", () => {
    // December 2026
    const dec = monthRangeDateOnly(2026, 12);
    expect(dec.start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(dec.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");

    // January 2027
    const jan = monthRangeDateOnly(2027, 1);
    expect(jan.start.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(jan.end.toISOString()).toBe("2027-02-01T00:00:00.000Z");
  });

  it("handles February in a leap year (2024) and non-leap year (2025)", () => {
    // Leap year 2024: Feb has 29 days
    const leapDateRange = monthRangeDateOnly(2024, 2);
    expect(leapDateRange.start.toISOString()).toBe("2024-02-01T00:00:00.000Z");
    expect(leapDateRange.end.toISOString()).toBe("2024-03-01T00:00:00.000Z");
    const diffDaysLeap = (leapDateRange.end.getTime() - leapDateRange.start.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDaysLeap).toBe(29);

    // Non-leap year 2025: Feb has 28 days
    const nonLeapDateRange = monthRangeDateOnly(2025, 2);
    expect(nonLeapDateRange.start.toISOString()).toBe("2025-02-01T00:00:00.000Z");
    expect(nonLeapDateRange.end.toISOString()).toBe("2025-03-01T00:00:00.000Z");
    const diffDaysNonLeap = (nonLeapDateRange.end.getTime() - nonLeapDateRange.start.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDaysNonLeap).toBe(28);
  });

  it("shifts months properly including year rollover", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
    expect(shiftMonth("2026-10", -1)).toBe("2026-09");
    expect(shiftMonth("2026-10", 1)).toBe("2026-11");
  });

  it("converts timestamps to WIB days accurately", () => {
    // 2026-10-31 17:30 UTC is 2026-11-01 00:30 WIB
    const d = new Date("2026-10-31T17:30:00.000Z");
    expect(toWibDay(d)).toBe("2026-11-01");

    // 2026-10-31 16:30 UTC is 2026-10-31 23:30 WIB
    const d2 = new Date("2026-10-31T16:30:00.000Z");
    expect(toWibDay(d2)).toBe("2026-10-31");
  });

  it("calculates dayDiff correctly", () => {
    expect(dayDiff("2026-10-01", "2026-10-05")).toBe(4);
    expect(dayDiff("2026-10-05", "2026-10-01")).toBe(-4);
    expect(dayDiff("2026-10-01", "2026-10-01")).toBe(0);
  });

  it("formats Indonesian month label correctly", () => {
    expect(bulanLabel(2026, 10)).toBe("Oktober 2026");
    expect(bulanLabel(2027, 1)).toBe("Januari 2027");
  });

  it("parses valid and invalid month params correctly", () => {
    expect(parseMonthParam("2026-05")).toEqual({ year: 2026, month: 5, key: "2026-05" });
    const fallback = parseMonthParam("invalid");
    expect(fallback.key).toMatch(/^\d{4}-\d{2}$/);
  });
});
