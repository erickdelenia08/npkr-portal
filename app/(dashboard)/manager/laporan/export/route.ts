// app/manager/laporan/export/route.ts
import { NextRequest } from "next/server";
import { requireManagerApi } from "@/lib/dashboard/guard";
import { parseMonthParam } from "@/lib/date/wib";
import { reportToCsv } from "@/lib/dashboard/csv";
import {
  isValidReportTab,
  getReportByKey,
  ReportTabKey,
} from "@/lib/dashboard/reports";

export async function GET(request: NextRequest) {
  // Enforce MANAGER-only access server-side (401 unauth, 403 forbidden)
  const authResult = await requireManagerApi();
  if (!authResult.authorized) {
    return authResult.response;
  }

  const { searchParams } = new URL(request.url);
  const rawTab = searchParams.get("tab");
  const rawBulan = searchParams.get("bulan");

  const tab: ReportTabKey = isValidReportTab(rawTab) ? rawTab : "marketing";
  const { year, month, key: monthKey } = parseMonthParam(rawBulan);

  try {
    const report = await getReportByKey(tab, year, month);
    const csvContent = reportToCsv(report);

    const filename = `laporan-${tab}-${monthKey}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Terjadi kesalahan saat membuat ekspor CSV.";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
