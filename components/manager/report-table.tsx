// components/manager/report-table.tsx
import React from "react";
import { ReportTable as IReportTable, ColumnType } from "@/lib/dashboard/csv";
import {
  formatInt,
  formatIdr,
  formatDateOnly,
  formatDecimal,
  formatPct,
} from "@/lib/dashboard/format";

interface ReportTableProps {
  table: IReportTable;
  emptyMessage?: string;
}

/**
 * Format a cell value based on column definition for HTML rendering.
 */
function renderCellValue(value: unknown, type: ColumnType): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-slate">-</span>;
  }

  switch (type) {
    case "int":
      return formatInt(typeof value === "number" ? value : Number(value));
    case "idr":
      return formatIdr(typeof value === "number" ? value : Number(value));
    case "decimal":
      return formatDecimal(typeof value === "number" ? value : Number(value), 1);
    case "pct":
      return formatPct(typeof value === "number" ? value : Number(value));
    case "date":
      return formatDateOnly(value as string | Date);
    case "text":
    default:
      return String(value);
  }
}

/**
 * Text alignment according to data type.
 */
function getAlignmentClass(type: ColumnType): string {
  switch (type) {
    case "int":
    case "idr":
    case "decimal":
    case "pct":
      return "text-right font-medium";
    case "date":
      return "text-center whitespace-nowrap";
    case "text":
    default:
      return "text-left";
  }
}

export function ReportTable({
  table,
  emptyMessage = "Tidak ada data untuk periode ini.",
}: ReportTableProps) {
  const { title, columns, rows, totals } = table;

  return (
    <div className="space-y-2.5">
      {title && (
        <h3 className="text-sm font-bold text-carbon-ink tracking-tight">
          {title}
        </h3>
      )}

      {/* Overflow-x container ensures table scrolls inside itself, not the page body */}
      <div className="overflow-x-auto rounded-xl border border-mist bg-white shadow-2xs">
        <table className="w-full text-xs text-carbon-ink divide-y divide-mist">
          <thead className="bg-bone/70 text-slate font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-3.5 py-3 ${getAlignmentClass(col.type)}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-mist/60 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-xs text-slate bg-bone/20"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-bone/40 transition-colors"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3.5 py-2.5 ${getAlignmentClass(col.type)}`}
                    >
                      {renderCellValue(row[col.key], col.type)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {totals && rows.length > 0 && (
            <tfoot className="bg-bone/80 font-bold border-t-2 border-mist text-carbon-ink">
              <tr>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3.5 py-3 ${getAlignmentClass(col.type)}`}
                  >
                    {renderCellValue(totals[col.key], col.type)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
