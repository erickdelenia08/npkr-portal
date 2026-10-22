// tests/unit/csv.test.ts
import { describe, it, expect } from "vitest";
import {
  sanitizeFormula,
  quoteCell,
  formatCsvValue,
  reportToCsv,
  ReportResult,
} from "@/lib/dashboard/csv";

describe("lib/dashboard/csv.ts - Indonesian CSV Export Engine", () => {
  it("sanitizes formula-injection characters with a leading apostrophe", () => {
    expect(sanitizeFormula("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(sanitizeFormula("+123456")).toBe("'+123456");
    expect(sanitizeFormula("-DANGER")).toBe("'-DANGER");
    expect(sanitizeFormula("@admin")).toBe("'@admin");
    expect(sanitizeFormula("\tcmd")).toBe("'\tcmd");
    expect(sanitizeFormula("\rcmd")).toBe("'\rcmd");
    expect(sanitizeFormula("Normal Text")).toBe("Normal Text");
  });

  it("quotes cells containing delimiter, quotes, or newlines (and doubles quotes)", () => {
    // Delimiter semicolon ';'
    expect(quoteCell("Rumah; Blok A")).toBe('"Rumah; Blok A"');

    // Double quotes
    expect(quoteCell('Perumahan "NPKR"')).toBe('"Perumahan ""NPKR"""');

    // Newline
    expect(quoteCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');

    // Safe string
    expect(quoteCell("SafeString")).toBe("SafeString");
  });

  it("formats decimal comma and percent conversion properly", () => {
    // Percent: 0.455 -> "45,5"
    expect(formatCsvValue(0.455, "pct")).toBe("45,5");
    expect(formatCsvValue(1, "pct")).toBe("100");
    expect(formatCsvValue(0, "pct")).toBe("0");

    // Decimal: 12.34 -> "12,34"
    expect(formatCsvValue(12.34, "decimal")).toBe("12,34");

    // Raw integers / IDR
    expect(formatCsvValue(250000000, "idr")).toBe("250000000");
    expect(formatCsvValue(15, "int")).toBe("15");

    // Date
    expect(formatCsvValue("2026-10-31T00:00:00.000Z", "date")).toBe("2026-10-31");
  });

  it("produces full CSV output with UTF-8 BOM, CRLF, tables, and notes", () => {
    const mockReport: ReportResult = {
      key: "marketing",
      title: "Laporan Kinerja Marketing",
      description: "Deskripsi performa",
      notes: ["Event-date based", "ITJ per pengajuan"],
      tables: [
        {
          title: "Tabel 1",
          columns: [
            { key: "nama", label: "Marketing", type: "text" },
            { key: "closing", label: "Closing", type: "int" },
            { key: "rate", label: "Rasio", type: "pct" },
          ],
          rows: [
            { nama: "Budi Santoso", closing: 3, rate: 0.25 },
            { nama: "=Malicious", closing: 0, rate: 0 },
          ],
          totals: {
            nama: "TOTAL",
            closing: 3,
            rate: 0.25,
          },
        },
      ],
    };

    const csv = reportToCsv(mockReport);

    // Starts with UTF-8 BOM
    expect(csv.startsWith("\uFEFF")).toBe(true);

    // Uses CRLF
    expect(csv).toContain("\r\n");

    // Table title line
    expect(csv).toContain("Tabel 1");

    // Headers joined by ';'
    expect(csv).toContain("Marketing;Closing;Rasio");

    // Sanitized malicious text
    expect(csv).toContain("'=Malicious;0;0");

    // Decimal comma in percent
    expect(csv).toContain("25");

    // Notes included at the bottom
    expect(csv).toContain("Catatan Definisi:");
    expect(csv).toContain("- Event-date based");
  });
});
