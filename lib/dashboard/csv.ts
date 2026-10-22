// lib/dashboard/csv.ts

/**
 * Configurable CSV constants for Indonesian regional settings.
 */
export const CSV_DELIMITER = ";";
export const CSV_DECIMAL_SEPARATOR = ",";
export const CSV_CRLF = "\r\n";
export const UTF8_BOM = "\uFEFF";

export type ColumnType = "text" | "int" | "idr" | "date" | "decimal" | "pct";

export interface ReportColumn {
  key: string;
  label: string;
  type: ColumnType;
}

export interface ReportTable {
  title?: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totals?: Record<string, unknown>;
}

export interface ReportResult {
  key: string;
  title: string;
  description: string;
  notes: string[];
  tables: ReportTable[];
  isSnapshot?: boolean;
}

/**
 * Sanitizes cell text to protect against formula injection in spreadsheet applications.
 * Any text starting with =, +, -, @, \t, or \r is prefixed with an apostrophe.
 */
export function sanitizeFormula(value: string): string {
  if (!value) return "";
  const firstChar = value.charAt(0);
  if (
    firstChar === "=" ||
    firstChar === "+" ||
    firstChar === "-" ||
    firstChar === "@" ||
    firstChar === "\t" ||
    firstChar === "\r"
  ) {
    return `'${value}`;
  }
  return value;
}

/**
 * Quotes cell if it contains delimiter, double quotes, or newlines.
 * Escapes internal quotes by doubling them.
 */
export function quoteCell(value: string, delimiter = CSV_DELIMITER): string {
  const needsQuotes =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r");

  if (needsQuotes) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Formats a value according to its column type for CSV export.
 */
export function formatCsvValue(
  value: unknown,
  type: ColumnType,
  delimiter = CSV_DELIMITER,
  decimalSep = CSV_DECIMAL_SEPARATOR
): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  let text = "";

  switch (type) {
    case "int":
    case "idr": {
      const num = typeof value === "number" ? value : Number(value);
      text = isNaN(num) ? "" : String(Math.round(num));
      break;
    }
    case "decimal": {
      const num = typeof value === "number" ? value : Number(value);
      if (isNaN(num)) {
        text = "";
      } else {
        text = String(num).replace(".", decimalSep);
      }
      break;
    }
    case "pct": {
      const num = typeof value === "number" ? value : Number(value);
      if (isNaN(num)) {
        text = "";
      } else {
        // Raw decimal ratio like 0.455 -> 45.5 -> "45,5"
        const pctVal = Number((num * 100).toFixed(1));
        text = String(pctVal).replace(".", decimalSep);
      }
      break;
    }
    case "date": {
      if (value instanceof Date) {
        text = value.toISOString().slice(0, 10);
      } else {
        text = String(value).slice(0, 10);
      }
      break;
    }
    case "text":
    default: {
      text = String(value);
      text = sanitizeFormula(text);
      break;
    }
  }

  return quoteCell(text, delimiter);
}

/**
 * Converts a generic ReportResult structure to CSV string with BOM, CRLF, and notes.
 */
export function reportToCsv(
  report: ReportResult,
  delimiter = CSV_DELIMITER,
  decimalSep = CSV_DECIMAL_SEPARATOR
): string {
  const lines: string[] = [];

  for (let tIdx = 0; tIdx < report.tables.length; tIdx++) {
    const table = report.tables[tIdx];

    // Optional table title
    if (table.title) {
      lines.push(quoteCell(sanitizeFormula(table.title), delimiter));
    }

    // Header row
    const headerCells = table.columns.map((col) =>
      quoteCell(sanitizeFormula(col.label), delimiter)
    );
    lines.push(headerCells.join(delimiter));

    // Data rows
    for (const row of table.rows) {
      const rowCells = table.columns.map((col) =>
        formatCsvValue(row[col.key], col.type, delimiter, decimalSep)
      );
      lines.push(rowCells.join(delimiter));
    }

    // Totals row (if present)
    if (table.totals) {
      const totalsCells = table.columns.map((col) =>
        formatCsvValue(table.totals?.[col.key], col.type, delimiter, decimalSep)
      );
      lines.push(totalsCells.join(delimiter));
    }

    // Blank line between tables
    lines.push("");
  }

  // Notes section
  if (report.notes && report.notes.length > 0) {
    lines.push(quoteCell("Catatan Definisi:", delimiter));
    for (const note of report.notes) {
      lines.push(quoteCell(sanitizeFormula(`- ${note}`), delimiter));
    }
    lines.push("");
  }

  return UTF8_BOM + lines.join(CSV_CRLF);
}
