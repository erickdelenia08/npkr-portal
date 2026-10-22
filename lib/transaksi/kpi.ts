// lib/transaksi/kpi.ts

import { prisma } from "@/lib/prisma";
import { parseDateOnlyUTC } from "@/lib/date/wib";

export interface CountAkadParams {
  from?: string | Date;
  to?: string | Date;
  marketingId?: number;
}

/**
 * KPI: Menghitung total transaksi yang telah mencapai tahap Akad (KPR maupun Cash).
 * Dihitung berdasarkan terisinya kolom `tgl_akad` dalam rentang waktu yang ditentukan,
 * dan mengecualikan transaksi yang berstatus BATAL.
 *
 * NOTE: Menggunakan `tgl_akad` (bukan tahap_detail = AKAD_KREDIT/AJB) karena setelah
 * transaksi akad, transaksi akan berlanjut ke tahap BAST / SERAH_TERIMA.
 */
export async function countAkad({
  from,
  to,
  marketingId,
}: CountAkadParams = {}): Promise<number> {
  const where: Record<string, unknown> = {
    status_transaksi: { not: "BATAL" },
    tgl_akad: { not: null },
  };

  if (marketingId) {
    where.marketing_id = marketingId;
  }

  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) {
      dateFilter.gte = typeof from === "string" ? parseDateOnlyUTC(from) : from;
    }
    if (to) {
      dateFilter.lte = typeof to === "string" ? parseDateOnlyUTC(to) : to;
    }
    where.tgl_akad = dateFilter;
  }

  return await prisma.transaksi.count({
    where,
  });
}
