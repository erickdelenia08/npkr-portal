// lib/dashboard/reports.ts
/**
 * ============================================================================
 * NPKR PORTAL - MANAGER REPORTS ENGINE (9 TABS SPECIFICATION)
 * ============================================================================
 * Every report returns a generic ReportResult consumed by both UI and CSV exporter.
 */

import { prisma } from "@/lib/prisma";
import {
  TahapTransaksi,
  StatusItj,
  SumberLead,
  StatusUnit,
  MetodeBayar,
} from "@/generated/prisma";
import {
  monthRangeWIB,
  monthRangeDateOnly,
  toWibDay,
  dayDiff,
  todayWIB,
  bulanLabel,
} from "@/lib/date/wib";
import { humanizeEnum } from "@/lib/dashboard/format";
import { closedDealWhere } from "@/lib/dashboard/manager";
import { ReportResult, ReportColumn } from "@/lib/dashboard/csv";

export const VALID_REPORT_TABS = [
  "marketing",
  "penjualan",
  "kas",
  "piutang",
  "pembatalan",
  "bank",
  "durasi",
  "inventori",
  "leads",
] as const;

export type ReportTabKey = (typeof VALID_REPORT_TABS)[number];

export function isValidReportTab(tab: string | null | undefined): tab is ReportTabKey {
  return typeof tab === "string" && (VALID_REPORT_TABS as readonly string[]).includes(tab);
}

/**
 * Statistics helper for durations (mean, median, min, max).
 */
function calcDurationStats(days: number[]): {
  count: number;
  avg: number;
  median: number;
  min: number;
  max: number;
} {
  if (days.length === 0) {
    return { count: 0, avg: 0, median: 0, min: 0, max: 0 };
  }
  const sorted = [...days].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const avg = Number((sum / sorted.length).toFixed(1));

  let median = 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    median = Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
  } else {
    median = sorted[mid];
  }

  return {
    count: sorted.length,
    avg,
    median,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

// ─── 1. REPORT: MARKETING (DEFAULT) ───
export async function getMarketingReport(year: number, month: number): Promise<ReportResult> {
  const rangeWib = monthRangeWIB(year, month);
  const rangeDate = monthRangeDateOnly(year, month);

  const [
    marketingUsers,
    leadMasukGroups,
    surveiJadwalGroups,
    surveiSelesaiGroups,
    itjDiajukanGroups,
    itjDisetujuiGroups,
    closingGroups,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: "MARKETING" },
      select: { id: true, nama: true, username: true, no_hp: true, isActive: true },
    }),
    prisma.lead.groupBy({
      by: ["marketing_id"],
      where: {
        marketing_id: { not: null },
        created_at: { gte: rangeWib.start, lt: rangeWib.end },
      },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["marketing_id"],
      where: {
        marketing_id: { not: null },
        survei_jadwal_at: { gte: rangeWib.start, lt: rangeWib.end },
      },
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["marketing_id"],
      where: {
        marketing_id: { not: null },
        survei_selesai_at: { gte: rangeWib.start, lt: rangeWib.end },
      },
      _count: { _all: true },
    }),
    prisma.itj.groupBy({
      by: ["marketing_id"],
      where: {
        marketing_id: { not: null },
        diajukan_at: { gte: rangeWib.start, lt: rangeWib.end },
      },
      _count: { _all: true },
    }),
    prisma.itj.groupBy({
      by: ["marketing_id"],
      where: {
        marketing_id: { not: null },
        status: StatusItj.DISETUJUI,
        diputuskan_at: { gte: rangeWib.start, lt: rangeWib.end },
      },
      _count: { _all: true },
    }),
    prisma.transaksi.groupBy({
      by: ["marketing_id"],
      where: closedDealWhere(rangeDate.start, rangeDate.end),
      _count: { _all: true },
    }),
  ]);

  const lmMap = new Map<number, number>();
  leadMasukGroups.forEach((g) => g.marketing_id && lmMap.set(g.marketing_id, g._count._all));

  const sjMap = new Map<number, number>();
  surveiJadwalGroups.forEach((g) => g.marketing_id && sjMap.set(g.marketing_id, g._count._all));

  const ssMap = new Map<number, number>();
  surveiSelesaiGroups.forEach((g) => g.marketing_id && ssMap.set(g.marketing_id, g._count._all));

  const idMap = new Map<number, number>();
  itjDiajukanGroups.forEach((g) => g.marketing_id && idMap.set(g.marketing_id, g._count._all));

  const isMap = new Map<number, number>();
  itjDisetujuiGroups.forEach((g) => g.marketing_id && isMap.set(g.marketing_id, g._count._all));

  const clMap = new Map<number, number>();
  closingGroups.forEach((g) => g.marketing_id && clMap.set(g.marketing_id, g._count._all));

  const rows: Record<string, unknown>[] = [];
  let tLm = 0,
    tSj = 0,
    tSs = 0,
    tId = 0,
    tIs = 0,
    tCl = 0;

  for (const u of marketingUsers) {
    const lm = lmMap.get(u.id) || 0;
    const sj = sjMap.get(u.id) || 0;
    const ss = ssMap.get(u.id) || 0;
    const id = idMap.get(u.id) || 0;
    const is = isMap.get(u.id) || 0;
    const cl = clMap.get(u.id) || 0;
    const sum = lm + sj + ss + id + is + cl;

    if (u.isActive || sum > 0) {
      rows.push({
        marketing_id: u.id,
        marketing: u.nama,
        username: u.username,
        no_hp: u.no_hp,
        lead_masuk: lm,
        survei_jadwal: sj,
        survei_selesai: ss,
        itj_diajukan: id,
        itj_disetujui: is,
        closing: cl,
      });

      tLm += lm;
      tSj += sj;
      tSs += ss;
      tId += id;
      tIs += is;
      tCl += cl;
    }
  }

  // Sort by closing desc then name asc
  rows.sort((a, b) => {
    const clA = a.closing as number;
    const clB = b.closing as number;
    if (clB !== clA) return clB - clA;
    return String(a.marketing).localeCompare(String(b.marketing), "id-ID");
  });

  const columns: ReportColumn[] = [
    { key: "marketing", label: "Marketing", type: "text" },
    { key: "username", label: "Username", type: "text" },
    { key: "no_hp", label: "No. HP", type: "text" },
    { key: "lead_masuk", label: "Lead Masuk", type: "int" },
    { key: "survei_jadwal", label: "Survei Dijadwalkan", type: "int" },
    { key: "survei_selesai", label: "Survei Selesai", type: "int" },
    { key: "itj_diajukan", label: "ITJ Diajukan", type: "int" },
    { key: "itj_disetujui", label: "ITJ Disetujui", type: "int" },
    { key: "closing", label: "Closing", type: "int" },
  ];

  return {
    key: "marketing",
    title: `Laporan Kinerja Bulanan Marketing (${bulanLabel(year, month)})`,
    description:
      "Rekapitulasi funnel performa per marketing: Lead Masuk -> Survei Dijadwalkan -> Survei Selesai -> ITJ Diajukan -> ITJ Disetujui -> Closing.",
    notes: [
      "Metrik berbasis tanggal peristiwa (event-date), closing bulan ini dapat berasal dari lead bulan sebelumnya.",
      "ITJ dihitung per pengajuan ITJ dan mengikuti marketing yang tercatat saat pengajuan dibuat.",
      "Lead tanpa PIC marketing tidak ditampilkan pada tabel ini (lihat tab Laporan Prospek).",
      "Tabel performa ini sengaja tidak menyertakan persentase konversi rasio (persentase konversi tersedia pada cohort funnel di Dashboard).",
    ],
    tables: [
      {
        title: "Kinerja Penjualan Seluruh Marketing",
        columns,
        rows,
        totals: {
          marketing: "TOTAL",
          username: "",
          no_hp: "",
          lead_masuk: tLm,
          survei_jadwal: tSj,
          survei_selesai: tSs,
          itj_diajukan: tId,
          itj_disetujui: tIs,
          closing: tCl,
        },
      },
    ],
  };
}

// ─── 2. REPORT: PENJUALAN ───
export async function getPenjualanReport(year: number, month: number): Promise<ReportResult> {
  const rangeDate = monthRangeDateOnly(year, month);

  const transactions = await prisma.transaksi.findMany({
    where: closedDealWhere(rangeDate.start, rangeDate.end),
    include: {
      customer: true,
      unit: { include: { tipe: true } },
      marketing: true,
    },
    orderBy: { closing_at: "asc" },
  });

  // Table 1: Summary per tipe
  const tipeMap = new Map<
    number,
    { tipe: string; kategori: string; unit_terjual: number; total_harga_deal: number }
  >();

  let tUnits = 0;
  let tNilai = 0;

  const detailRows: Record<string, unknown>[] = [];

  for (const tx of transactions) {
    const tId = tx.unit.tipe_id;
    const harga = Number(tx.harga_deal);
    tUnits += 1;
    tNilai += harga;

    if (!tipeMap.has(tId)) {
      tipeMap.set(tId, {
        tipe: tx.unit.tipe.nama_tipe,
        kategori: humanizeEnum(tx.unit.tipe.kategori),
        unit_terjual: 0,
        total_harga_deal: 0,
      });
    }

    const tItem = tipeMap.get(tId)!;
    tItem.unit_terjual += 1;
    tItem.total_harga_deal += harga;

    detailRows.push({
      tgl_closing: toWibDay(tx.closing_at),
      konsumen: tx.customer.nama_ktp,
      unit: tx.unit.blok,
      tipe: tx.unit.tipe.nama_tipe,
      skema: humanizeEnum(tx.metode_bayar),
      marketing: tx.marketing.nama,
      harga_deal: harga,
    });
  }

  const summaryRows = Array.from(tipeMap.values()).sort(
    (a, b) => b.unit_terjual - a.unit_terjual
  );

  return {
    key: "penjualan",
    title: `Laporan Penjualan & Closing Transaksi (${bulanLabel(year, month)})`,
    description:
      "Daftar transaksi yang resmi mencapai tahap Closing (Pengajuan ITJ) pada periode bulan ini.",
    notes: [
      "Closing penjualan resmi dihitung berdasarkan tanggal pengajuan ITJ yang tersimpan di kolom Transaksi.closing_at.",
      "Transaksi berstatus BATAL otomatis dikeluarkan dari seluruh perhitungan.",
    ],
    tables: [
      {
        title: "Ringkasan Penjualan per Tipe Unit",
        columns: [
          { key: "tipe", label: "Tipe Unit", type: "text" },
          { key: "kategori", label: "Kategori", type: "text" },
          { key: "unit_terjual", label: "Unit Terjual", type: "int" },
          { key: "total_harga_deal", label: "Total Nilai Closing", type: "idr" },
        ],
        rows: summaryRows,
        totals: {
          tipe: "TOTAL",
          kategori: "",
          unit_terjual: tUnits,
          total_harga_deal: tNilai,
        },
      },
      {
        title: "Detail Transaksi Closing Penjualan",
        columns: [
          { key: "tgl_closing", label: "Tanggal Closing", type: "date" },
          { key: "konsumen", label: "Konsumen", type: "text" },
          { key: "unit", label: "Unit / Blok", type: "text" },
          { key: "tipe", label: "Tipe Unit", type: "text" },
          { key: "skema", label: "Skema Bayar", type: "text" },
          { key: "marketing", label: "Marketing PIC", type: "text" },
          { key: "harga_deal", label: "Nilai Closing", type: "idr" },
        ],
        rows: detailRows,
        totals: {
          tgl_closing: "TOTAL",
          konsumen: "",
          unit: "",
          tipe: "",
          skema: "",
          marketing: "",
          harga_deal: tNilai,
        },
      },
    ],
  };
}

// ─── 3. REPORT: KAS ───
export async function getKasReport(year: number, month: number): Promise<ReportResult> {
  const rangeDate = monthRangeDateOnly(year, month);

  const payments = await prisma.pembayaran.findMany({
    where: {
      is_void: false,
      tgl_bayar: { gte: rangeDate.start, lt: rangeDate.end },
    },
    include: {
      transaksi: {
        include: {
          customer: true,
          unit: true,
        },
      },
      penerima: true,
    },
    orderBy: { tgl_bayar: "asc" },
  });

  const jenisMap = new Map<string, { jenis: string; jumlah: number; total_nominal: number }>();
  const caraMap = new Map<string, { cara: string; jumlah: number; total_nominal: number }>();

  let totalNominal = 0;
  const detailRows: Record<string, unknown>[] = [];

  for (const p of payments) {
    const nominal = Number(p.nominal);
    totalNominal += nominal;

    const jKey = p.jenis_pembayaran;
    if (!jenisMap.has(jKey)) {
      jenisMap.set(jKey, {
        jenis: humanizeEnum(jKey),
        jumlah: 0,
        total_nominal: 0,
      });
    }
    const jItem = jenisMap.get(jKey)!;
    jItem.jumlah += 1;
    jItem.total_nominal += nominal;

    const cKey = p.cara_bayar;
    if (!caraMap.has(cKey)) {
      caraMap.set(cKey, {
        cara: humanizeEnum(cKey),
        jumlah: 0,
        total_nominal: 0,
      });
    }
    const cItem = caraMap.get(cKey)!;
    cItem.jumlah += 1;
    cItem.total_nominal += nominal;

    detailRows.push({
      tgl_bayar: toWibDay(p.tgl_bayar),
      no_kwitansi: p.no_kwitansi,
      konsumen: p.transaksi.customer.nama_ktp,
      unit: p.transaksi.unit.blok,
      jenis: humanizeEnum(p.jenis_pembayaran),
      cara: humanizeEnum(p.cara_bayar),
      nominal,
      admin_penerima: p.penerima.nama,
    });
  }

  const jenisRows = Array.from(jenisMap.values()).sort(
    (a, b) => b.total_nominal - a.total_nominal
  );
  const caraRows = Array.from(caraMap.values()).sort(
    (a, b) => b.total_nominal - a.total_nominal
  );

  return {
    key: "kas",
    title: `Laporan Penerimaan Kas Masuk (${bulanLabel(year, month)})`,
    description:
      "Rekapitulasi seluruh setoran pembayaran sah (tanpa void) dari konsumen yang masuk ke rekening atau kas kantor.",
    notes: [
      "Metrik kas masuk selalu menyaring is_void = false dan menghitung tanggal bayar murni (tgl_bayar).",
      "Kuitansi yang telah dibatalkan (void) otomatis diabaikan.",
    ],
    tables: [
      {
        title: "Ringkasan Penerimaan per Jenis Pembayaran",
        columns: [
          { key: "jenis", label: "Jenis Pembayaran", type: "text" },
          { key: "jumlah", label: "Jumlah Transaksi", type: "int" },
          { key: "total_nominal", label: "Total Nominal", type: "idr" },
        ],
        rows: jenisRows,
        totals: {
          jenis: "TOTAL",
          jumlah: payments.length,
          total_nominal: totalNominal,
        },
      },
      {
        title: "Ringkasan Penerimaan per Cara Bayar",
        columns: [
          { key: "cara", label: "Cara Bayar", type: "text" },
          { key: "jumlah", label: "Jumlah Transaksi", type: "int" },
          { key: "total_nominal", label: "Total Nominal", type: "idr" },
        ],
        rows: caraRows,
        totals: {
          cara: "TOTAL",
          jumlah: payments.length,
          total_nominal: totalNominal,
        },
      },
      {
        title: "Detail Pembayaran Masuk",
        columns: [
          { key: "tgl_bayar", label: "Tanggal Bayar", type: "date" },
          { key: "no_kwitansi", label: "No. Kwitansi", type: "text" },
          { key: "konsumen", label: "Konsumen", type: "text" },
          { key: "unit", label: "Unit / Blok", type: "text" },
          { key: "jenis", label: "Jenis Bayar", type: "text" },
          { key: "cara", label: "Cara Bayar", type: "text" },
          { key: "nominal", label: "Nominal", type: "idr" },
          { key: "admin_penerima", label: "Admin Penerima", type: "text" },
        ],
        rows: detailRows,
        totals: {
          tgl_bayar: "TOTAL",
          no_kwitansi: "",
          konsumen: "",
          unit: "",
          jenis: "",
          cara: "",
          nominal: totalNominal,
          admin_penerima: "",
        },
      },
    ],
  };
}

// ─── 4. REPORT: PIUTANG (SNAPSHOT) ───
export async function getPiutangReport(): Promise<ReportResult> {
  const transactions = await prisma.transaksi.findMany({
    where: {
      status_transaksi: {
        notIn: [TahapTransaksi.BATAL, TahapTransaksi.SERAH_TERIMA],
      },
    },
    include: {
      customer: true,
      unit: true,
      marketing: true,
      pembayaran: {
        where: { is_void: false },
        select: { nominal: true },
      },
    },
  });

  let tDeal = 0;
  let tPaid = 0;
  let tSisa = 0;
  const rows: Record<string, unknown>[] = [];

  for (const tx of transactions) {
    const hargaDeal = Number(tx.harga_deal);
    const terbayar = tx.pembayaran.reduce((sum, p) => sum + Number(p.nominal), 0);
    const sisa = hargaDeal - terbayar;

    if (sisa > 0) {
      tDeal += hargaDeal;
      tPaid += terbayar;
      tSisa += sisa;
      const pctTerbayar = hargaDeal > 0 ? terbayar / hargaDeal : 0;

      rows.push({
        konsumen: tx.customer.nama_ktp,
        unit: tx.unit.blok,
        skema: humanizeEnum(tx.metode_bayar),
        tahap: humanizeEnum(tx.status_transaksi),
        marketing: tx.marketing.nama,
        harga_deal: hargaDeal,
        terbayar,
        sisa,
        pct_terbayar: pctTerbayar,
      });
    }
  }

  // Sort by sisa desc
  rows.sort((a, b) => (b.sisa as number) - (a.sisa as number));

  const totalPct = tDeal > 0 ? tPaid / tDeal : 0;

  return {
    key: "piutang",
    title: "Laporan Posisi Piutang Konsumen (Snapshot Hari Ini)",
    description:
      "Daftar tagihan piutang berjalan untuk seluruh transaksi aktif (belum lunas dan belum serah terima).",
    isSnapshot: true,
    notes: [
      "Laporan ini merupakan posisi per hari ini (snapshot), tidak dipengaruhi oleh filter bulan.",
      "Hanya menampilkan transaksi aktif dengan sisa tagihan > 0, mengecualikan transaksi BATAL dan SERAH_TERIMA.",
      "Untuk skema KPR, sisa tagihan mencakup porsi pembiayaan bank hingga pencairan (disbursement) dicatatkan sebagai pembayaran.",
    ],
    tables: [
      {
        title: "Daftar Piutang Konsumen Aktif",
        columns: [
          { key: "konsumen", label: "Konsumen", type: "text" },
          { key: "unit", label: "Unit / Blok", type: "text" },
          { key: "skema", label: "Skema", type: "text" },
          { key: "tahap", label: "Tahap Transaksi", type: "text" },
          { key: "marketing", label: "Marketing PIC", type: "text" },
          { key: "harga_deal", label: "Nilai Transaksi", type: "idr" },
          { key: "terbayar", label: "Total Terbayar", type: "idr" },
          { key: "sisa", label: "Sisa Piutang", type: "idr" },
          { key: "pct_terbayar", label: "% Terbayar", type: "pct" },
        ],
        rows,
        totals: {
          konsumen: "TOTAL",
          unit: "",
          skema: "",
          tahap: "",
          marketing: "",
          harga_deal: tDeal,
          terbayar: tPaid,
          sisa: tSisa,
          pct_terbayar: totalPct,
        },
      },
    ],
  };
}

// ─── 5. REPORT: PEMBATALAN ───
export async function getPembatalanReport(year: number, month: number): Promise<ReportResult> {
  const rangeWib = monthRangeWIB(year, month);

  const cancellations = await prisma.transaksi.findMany({
    where: {
      status_transaksi: TahapTransaksi.BATAL,
      cancelled_at: { gte: rangeWib.start, lt: rangeWib.end },
    },
    include: {
      customer: true,
      unit: true,
      marketing: true,
      logs: {
        where: { detail_sesudah: "BATAL" },
        orderBy: { created_at: "desc" },
        take: 1,
      },
    },
    orderBy: { cancelled_at: "asc" },
  });

  const stageMap = new Map<string, { tahap_sebelum: string; jumlah: number; total_nilai: number }>();
  let totalBatalNilai = 0;
  const detailRows: Record<string, unknown>[] = [];

  for (const tx of cancellations) {
    const harga = Number(tx.harga_deal);
    totalBatalNilai += harga;

    const lastLog = tx.logs[0];
    const tahapSebelum = lastLog?.detail_sebelum
      ? humanizeEnum(lastLog.detail_sebelum)
      : "Tidak Tercatat";

    if (!stageMap.has(tahapSebelum)) {
      stageMap.set(tahapSebelum, {
        tahap_sebelum: tahapSebelum,
        jumlah: 0,
        total_nilai: 0,
      });
    }
    const item = stageMap.get(tahapSebelum)!;
    item.jumlah += 1;
    item.total_nilai += harga;

    detailRows.push({
      tgl_batal: toWibDay(tx.cancelled_at),
      konsumen: tx.customer.nama_ktp,
      unit: tx.unit.blok,
      skema: humanizeEnum(tx.metode_bayar),
      tahap_sebelum: tahapSebelum,
      sudah_closing: tx.closing_at ? "Ya" : "Belum",
      marketing: tx.marketing.nama,
      harga_deal: harga,
      alasan: tx.alasan_batal || tx.catatan_admin || "-",
    });
  }

  const stageRows = Array.from(stageMap.values()).sort((a, b) => b.jumlah - a.jumlah);

  return {
    key: "pembatalan",
    title: `Laporan Pembatalan Transaksi (${bulanLabel(year, month)})`,
    description:
      "Rekapitulasi transaksi batal berdasarkan titik tahap sebelum pembatalan dan alasan di lapangan.",
    notes: [
      "Tahap sebelum pembatalan diperoleh dari log riwayat perubahan status (TransaksiTahapLog).",
      "Alasan pembatalan merujuk pada alasan_batal atau catatan admin saat pembatalan diajukan.",
    ],
    tables: [
      {
        title: "Distribusi Pembatalan Berdasarkan Tahap Terakhir",
        columns: [
          { key: "tahap_sebelum", label: "Tahap Sebelum Batal", type: "text" },
          { key: "jumlah", label: "Jumlah Unit", type: "int" },
          { key: "total_nilai", label: "Total Nilai Batal", type: "idr" },
        ],
        rows: stageRows,
        totals: {
          tahap_sebelum: "TOTAL",
          jumlah: cancellations.length,
          total_nilai: totalBatalNilai,
        },
      },
      {
        title: "Detail Transaksi Dibatalkan",
        columns: [
          { key: "tgl_batal", label: "Tanggal Batal", type: "date" },
          { key: "konsumen", label: "Konsumen", type: "text" },
          { key: "unit", label: "Unit / Blok", type: "text" },
          { key: "skema", label: "Skema Bayar", type: "text" },
          { key: "tahap_sebelum", label: "Tahap Sebelum Batal", type: "text" },
          { key: "sudah_closing", label: "Pernah Closing", type: "text" },
          { key: "marketing", label: "Marketing PIC", type: "text" },
          { key: "harga_deal", label: "Nilai Deal", type: "idr" },
          { key: "alasan", label: "Alasan Pembatalan", type: "text" },
        ],
        rows: detailRows,
        totals: {
          tgl_batal: "TOTAL",
          konsumen: "",
          unit: "",
          skema: "",
          tahap_sebelum: "",
          sudah_closing: "",
          marketing: "",
          harga_deal: totalBatalNilai,
          alasan: "",
        },
      },
    ],
  };
}

// ─── 6. REPORT: BANK (PENGAJUAN KPR) ───
export async function getBankReport(year: number, month: number): Promise<ReportResult> {
  const rangeWib = monthRangeWIB(year, month);

  const applications = await prisma.pengajuanKPR.findMany({
    where: {
      tanggal_ajukan: { gte: rangeWib.start, lt: rangeWib.end },
    },
    include: {
      bank: true,
      transaksi: {
        include: { customer: true },
      },
    },
    orderBy: { tanggal_ajukan: "asc" },
  });

  const bankMap = new Map<
    number,
    {
      bank: string;
      diajukan: number;
      dalam_proses: number;
      sp3k_disetujui: number;
      ditolak: number;
      dibatalkan: number;
      durasiList: number[];
    }
  >();

  const rejectionRows: Record<string, unknown>[] = [];

  for (const app of applications) {
    const bId = app.bank_id;
    if (!bankMap.has(bId)) {
      bankMap.set(bId, {
        bank: app.bank.nama,
        diajukan: 0,
        dalam_proses: 0,
        sp3k_disetujui: 0,
        ditolak: 0,
        dibatalkan: 0,
        durasiList: [],
      });
    }

    const b = bankMap.get(bId)!;
    b.diajukan += 1;

    const s = app.status;
    if (s === "DIAJUKAN" || s === "WAWANCARA" || s === "OTS" || s === "VERIFIKASI") {
      b.dalam_proses += 1;
    } else if (s === "SP3K" || s === "DISETUJUI") {
      b.sp3k_disetujui += 1;
    } else if (s === "DITOLAK") {
      b.ditolak += 1;
      rejectionRows.push({
        tanggal: toWibDay(app.tanggal_keputusan || app.tanggal_ajukan),
        bank: app.bank.nama,
        konsumen: app.transaksi.customer.nama_ktp,
        alasan_penolakan: app.alasan_penolakan || "-",
      });
    } else if (s === "DIBATALKAN") {
      b.dibatalkan += 1;
    }

    if (app.tanggal_keputusan) {
      const startDay = toWibDay(app.tanggal_ajukan);
      const endDay = toWibDay(app.tanggal_keputusan);
      const diff = dayDiff(startDay, endDay);
      b.durasiList.push(diff);
    }
  }

  let totDiajukan = 0;
  let totProses = 0;
  let totLolos = 0;
  let totTolak = 0;
  let totBatal = 0;
  const allDurasi: number[] = [];

  const bankRows = Array.from(bankMap.values()).map((b) => {
    totDiajukan += b.diajukan;
    totProses += b.dalam_proses;
    totLolos += b.sp3k_disetujui;
    totTolak += b.ditolak;
    totBatal += b.dibatalkan;
    allDurasi.push(...b.durasiList);

    const decided = b.sp3k_disetujui + b.ditolak;
    const rasioLolos = decided > 0 ? b.sp3k_disetujui / decided : null;
    const avgHari =
      b.durasiList.length > 0
        ? Number(
            (
              b.durasiList.reduce((s, d) => s + d, 0) / b.durasiList.length
            ).toFixed(1)
          )
        : null;

    return {
      bank: b.bank,
      diajukan: b.diajukan,
      dalam_proses: b.dalam_proses,
      sp3k_disetujui: b.sp3k_disetujui,
      ditolak: b.ditolak,
      dibatalkan: b.dibatalkan,
      rasio_lolos: rasioLolos,
      avg_hari: avgHari,
    };
  });

  const totDecided = totLolos + totTolak;
  const totRasio = totDecided > 0 ? totLolos / totDecided : null;
  const totAvgHari =
    allDurasi.length > 0
      ? Number((allDurasi.reduce((s, d) => s + d, 0) / allDurasi.length).toFixed(1))
      : null;

  return {
    key: "bank",
    title: `Laporan Pengajuan KPR Perbankan (${bulanLabel(year, month)})`,
    description:
      "Rekapitulasi berkas KPR diajukan ke perbankan, tingkat persetujuan (approval rate), dan rata-rata durasi keputusan.",
    notes: [
      "Dalam proses mencakup status: DIAJUKAN, WAWANCARA, OTS, dan VERIFIKASI.",
      "Rasio lolos dihitung dari: SP3K & Disetujui / (SP3K & Disetujui + Ditolak) hanya bagi berkas yang telah diputuskan.",
      "Rata-rata hari keputusan dihitung dari tanggal pengajuan hingga tanggal diterbitkannya keputusan bank.",
    ],
    tables: [
      {
        title: "Kinerja Pengajuan KPR per Mitra Bank",
        columns: [
          { key: "bank", label: "Nama Bank", type: "text" },
          { key: "diajukan", label: "Diajukan", type: "int" },
          { key: "dalam_proses", label: "Dalam Proses", type: "int" },
          { key: "sp3k_disetujui", label: "SP3K / Disetujui", type: "int" },
          { key: "ditolak", label: "Ditolak", type: "int" },
          { key: "dibatalkan", label: "Dibatalkan", type: "int" },
          { key: "rasio_lolos", label: "Rasio Lolos", type: "pct" },
          { key: "avg_hari", label: "Rata-rata Hari Putusan", type: "decimal" },
        ],
        rows: bankRows,
        totals: {
          bank: "TOTAL",
          diajukan: totDiajukan,
          dalam_proses: totProses,
          sp3k_disetujui: totLolos,
          ditolak: totTolak,
          dibatalkan: totBatal,
          rasio_lolos: totRasio,
          avg_hari: totAvgHari,
        },
      },
      {
        title: "Daftar Penolakan Berkas Bank",
        columns: [
          { key: "tanggal", label: "Tanggal Putusan", type: "date" },
          { key: "bank", label: "Bank", type: "text" },
          { key: "konsumen", label: "Konsumen", type: "text" },
          { key: "alasan_penolakan", label: "Alasan Penolakan", type: "text" },
        ],
        rows: rejectionRows,
      },
    ],
  };
}

// ─── 7. REPORT: DURASI ───
export async function getDurasiReport(year: number, month: number): Promise<ReportResult> {
  const rangeWib = monthRangeWIB(year, month);
  const rangeDate = monthRangeDateOnly(year, month);

  const [itjDecisions, monthClosings, monthBasts] = await Promise.all([
    // Table 1: Decisions made in the month
    prisma.itj.findMany({
      where: {
        diputuskan_at: { gte: rangeWib.start, lt: rangeWib.end },
      },
      select: {
        status: true,
        diajukan_at: true,
        diputuskan_at: true,
      },
    }),
    // Table 2: Closings in the month
    prisma.transaksi.findMany({
      where: closedDealWhere(rangeDate.start, rangeDate.end),
      include: {
        itj: { select: { diputuskan_at: true } },
      },
    }),
    // Table 3: BAST in the month
    prisma.transaksi.findMany({
      where: {
        tgl_bast: { gte: rangeDate.start, lt: rangeDate.end },
        status_transaksi: { not: TahapTransaksi.BATAL },
      },
      select: {
        metode_bayar: true,
        closing_at: true,
        tgl_bast: true,
      },
    }),
  ]);

  // Table 1: ITJ Review time (diajukan_at to diputuskan_at) grouped by status
  const itjStatusGroups = new Map<StatusItj, number[]>();
  for (const itj of itjDecisions) {
    if (itj.diputuskan_at) {
      const diff = dayDiff(toWibDay(itj.diajukan_at), toWibDay(itj.diputuskan_at));
      if (!itjStatusGroups.has(itj.status)) {
        itjStatusGroups.set(itj.status, []);
      }
      itjStatusGroups.get(itj.status)!.push(diff);
    }
  }

  const table1Rows: Record<string, unknown>[] = [];
  const allItjDays: number[] = [];
  for (const status of Object.values(StatusItj)) {
    const days = itjStatusGroups.get(status) || [];
    allItjDays.push(...days);
    const stats = calcDurationStats(days);
    table1Rows.push({
      kelompok: humanizeEnum(status),
      jumlah: stats.count,
      rata_rata: stats.avg,
      median: stats.median,
      tercepat: stats.min,
      terlama: stats.max,
    });
  }

  // Table 2: ITJ approved to closing (diputuskan_at to closing_at) grouped by metode_bayar
  const closingMethodGroups = new Map<MetodeBayar, number[]>();
  const allClosingDays: number[] = [];
  for (const tx of monthClosings) {
    if (tx.itj?.diputuskan_at && tx.closing_at) {
      const diff = dayDiff(toWibDay(tx.itj.diputuskan_at), toWibDay(tx.closing_at));
      if (!closingMethodGroups.has(tx.metode_bayar)) {
        closingMethodGroups.set(tx.metode_bayar, []);
      }
      closingMethodGroups.get(tx.metode_bayar)!.push(diff);
      allClosingDays.push(diff);
    }
  }

  const table2Rows: Record<string, unknown>[] = [];
  for (const method of Object.values(MetodeBayar)) {
    const days = closingMethodGroups.get(method) || [];
    const stats = calcDurationStats(days);
    table2Rows.push({
      kelompok: humanizeEnum(method),
      jumlah: stats.count,
      rata_rata: stats.avg,
      median: stats.median,
      tercepat: stats.min,
      terlama: stats.max,
    });
  }
  const allClosingStats = calcDurationStats(allClosingDays);
  table2Rows.push({
    kelompok: "Semua Metode Bayar",
    jumlah: allClosingStats.count,
    rata_rata: allClosingStats.avg,
    median: allClosingStats.median,
    tercepat: allClosingStats.min,
    terlama: allClosingStats.max,
  });

  // Table 3: Closing to BAST (closing_at to tgl_bast) grouped by metode_bayar
  const bastMethodGroups = new Map<MetodeBayar, number[]>();
  const allBastDays: number[] = [];
  for (const tx of monthBasts) {
    if (tx.closing_at && tx.tgl_bast) {
      const diff = dayDiff(toWibDay(tx.closing_at), toWibDay(tx.tgl_bast));
      if (!bastMethodGroups.has(tx.metode_bayar)) {
        bastMethodGroups.set(tx.metode_bayar, []);
      }
      bastMethodGroups.get(tx.metode_bayar)!.push(diff);
      allBastDays.push(diff);
    }
  }

  const table3Rows: Record<string, unknown>[] = [];
  for (const method of Object.values(MetodeBayar)) {
    const days = bastMethodGroups.get(method) || [];
    const stats = calcDurationStats(days);
    table3Rows.push({
      kelompok: humanizeEnum(method),
      jumlah: stats.count,
      rata_rata: stats.avg,
      median: stats.median,
      tercepat: stats.min,
      terlama: stats.max,
    });
  }
  const allBastStats = calcDurationStats(allBastDays);
  table3Rows.push({
    kelompok: "Semua Metode Bayar",
    jumlah: allBastStats.count,
    rata_rata: allBastStats.avg,
    median: allBastStats.median,
    tercepat: allBastStats.min,
    terlama: allBastStats.max,
  });

  const durationColumns: ReportColumn[] = [
    { key: "kelompok", label: "Kelompok", type: "text" },
    { key: "jumlah", label: "Jumlah", type: "int" },
    { key: "rata_rata", label: "Rata-rata (Hari)", type: "decimal" },
    { key: "median", label: "Median (Hari)", type: "decimal" },
    { key: "tercepat", label: "Tercepat (Hari)", type: "int" },
    { key: "terlama", label: "Terlama (Hari)", type: "int" },
  ];

  return {
    key: "durasi",
    title: `Laporan Analisis Durasi Proses SLA (${bulanLabel(year, month)})`,
    description:
      "Statistik durasi hari kalender penyelesaian tahapan dari review ITJ, persetujuan ke closing, hingga serah terima unit (BAST).",
    notes: [
      "Durasi dihitung dalam selisih hari kalender murni di zona waktu Asia/Jakarta (WIB).",
      "Durasi ITJ ke closing dihitung dari tanggal persetujuan ITJ hingga tanggal closing resmi (Transaksi.closing_at).",
      "Durasi closing ke BAST dihitung untuk seluruh transaksi yang mencatatkan tanggal serah terima (tgl_bast) pada periode ini.",
    ],
    tables: [
      {
        title: "Durasi Review & Keputusan ITJ",
        columns: durationColumns,
        rows: table1Rows,
      },
      {
        title: "Durasi ITJ Disetujui ke Closing Penjualan",
        columns: durationColumns,
        rows: table2Rows,
      },
      {
        title: "Durasi Closing Penjualan ke Serah Terima (BAST)",
        columns: durationColumns,
        rows: table3Rows,
      },
    ],
  };
}

// ─── 8. REPORT: INVENTORI (SNAPSHOT) ───
export async function getInventoriReport(): Promise<ReportResult> {
  const [types, holdBookedUnits] = await Promise.all([
    prisma.masterTipe.findMany({
      include: {
        units: { select: { status_unit: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.masterUnit.findMany({
      where: {
        status_unit: { in: [StatusUnit.HOLD, StatusUnit.BOOKED] },
      },
      include: {
        tipe: true,
        itj: {
          orderBy: { diajukan_at: "desc" },
          take: 1,
          select: { diajukan_at: true },
        },
      },
    }),
  ]);

  let totTersedia = 0;
  let totHold = 0;
  let totBooked = 0;
  let totSold = 0;
  let totAll = 0;

  const table1Rows: Record<string, unknown>[] = [];
  for (const t of types) {
    let trs = 0,
      hld = 0,
      bkd = 0,
      sld = 0;
    for (const u of t.units) {
      if (u.status_unit === StatusUnit.AVAILABLE) trs++;
      else if (u.status_unit === StatusUnit.HOLD) hld++;
      else if (u.status_unit === StatusUnit.BOOKED) bkd++;
      else if (u.status_unit === StatusUnit.SOLD) sld++;
    }
    const tot = trs + hld + bkd + sld;
    totTersedia += trs;
    totHold += hld;
    totBooked += bkd;
    totSold += sld;
    totAll += tot;

    table1Rows.push({
      tipe: t.nama_tipe,
      kategori: humanizeEnum(t.kategori),
      tersedia: trs,
      hold: hld,
      booked: bkd,
      sold: sld,
      total: tot,
    });
  }

  const todayStr = todayWIB();
  const table2Rows: Record<string, unknown>[] = [];

  for (const u of holdBookedUnits) {
    const latestItj = u.itj[0];
    const itjDay = latestItj ? toWibDay(latestItj.diajukan_at) : null;
    const usiaHari = itjDay ? Math.max(0, dayDiff(itjDay, todayStr)) : 0;

    table2Rows.push({
      blok: u.blok,
      tipe: u.tipe.nama_tipe,
      status: humanizeEnum(u.status_unit),
      tgl_itj: itjDay,
      usia_hari: usiaHari,
    });
  }

  // Sort by age desc
  table2Rows.sort((a, b) => (b.usia_hari as number) - (a.usia_hari as number));

  return {
    key: "inventori",
    title: "Laporan Inventori Unit & Status Ketersediaan (Snapshot Hari Ini)",
    description:
      "Pemetaan ketersediaan stok fisik per tipe serta monitoring usia unit tertahan (Hold & Booked).",
    isSnapshot: true,
    notes: [
      "Laporan ini merupakan posisi stok per hari ini (snapshot).",
      "Usia unit status HOLD atau BOOKED diestimasi berdasarkan tanggal pengajuan ITJ terbaru (Itj.diajukan_at).",
    ],
    tables: [
      {
        title: "Rekapitulasi Stok per Tipe Unit",
        columns: [
          { key: "tipe", label: "Tipe Unit", type: "text" },
          { key: "kategori", label: "Kategori", type: "text" },
          { key: "tersedia", label: "Tersedia", type: "int" },
          { key: "hold", label: "Hold", type: "int" },
          { key: "booked", label: "Booked", type: "int" },
          { key: "sold", label: "Terjual", type: "int" },
          { key: "total", label: "Total Unit", type: "int" },
        ],
        rows: table1Rows,
        totals: {
          tipe: "TOTAL",
          kategori: "",
          tersedia: totTersedia,
          hold: totHold,
          booked: totBooked,
          sold: totSold,
          total: totAll,
        },
      },
      {
        title: "Daftar Unit HOLD & BOOKED Berjalan",
        columns: [
          { key: "blok", label: "Blok / No. Unit", type: "text" },
          { key: "tipe", label: "Tipe Unit", type: "text" },
          { key: "status", label: "Status Unit", type: "text" },
          { key: "tgl_itj", label: "Tgl ITJ Terakhir", type: "date" },
          { key: "usia_hari", label: "Usia Tertahan (Hari)", type: "int" },
        ],
        rows: table2Rows,
      },
    ],
  };
}

// ─── 9. REPORT: LEADS ───
export async function getLeadsReport(year: number, month: number): Promise<ReportResult> {
  const rangeWib = monthRangeWIB(year, month);

  const [marketingUsers, leadsInMonth] = await Promise.all([
    prisma.user.findMany({
      where: { role: "MARKETING" },
      select: { id: true, nama: true },
    }),
    prisma.lead.findMany({
      where: {
        created_at: { gte: rangeWib.start, lt: rangeWib.end },
      },
      select: {
        id: true,
        marketing_id: true,
        sumber: true,
        created_at: true,
      },
    }),
  ]);

  // Table 1: Matrix marketing x sumber
  const marketingMap = new Map<number, { nama: string; counts: Record<SumberLead, number> }>();
  for (const u of marketingUsers) {
    marketingMap.set(u.id, {
      nama: u.nama,
      counts: {
        [SumberLead.WALK_IN]: 0,
        [SumberLead.FACEBOOK_ADS]: 0,
        [SumberLead.TIKTOK]: 0,
        [SumberLead.INSTAGRAM]: 0,
        [SumberLead.WA_KANTOR]: 0,
        [SumberLead.REFERRAL]: 0,
        [SumberLead.LAINNYA]: 0,
      },
    });
  }

  const unassignedCounts: Record<SumberLead, number> = {
    [SumberLead.WALK_IN]: 0,
    [SumberLead.FACEBOOK_ADS]: 0,
    [SumberLead.TIKTOK]: 0,
    [SumberLead.INSTAGRAM]: 0,
    [SumberLead.WA_KANTOR]: 0,
    [SumberLead.REFERRAL]: 0,
    [SumberLead.LAINNYA]: 0,
  };

  // Table 2: Daily lead count
  const dailyCounts = new Map<string, number>();

  // Determine number of days in month
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let d = 1; d <= lastDayOfMonth; d++) {
    const dayKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    dailyCounts.set(dayKey, 0);
  }

  for (const lead of leadsInMonth) {
    if (lead.marketing_id && marketingMap.has(lead.marketing_id)) {
      marketingMap.get(lead.marketing_id)!.counts[lead.sumber] += 1;
    } else {
      unassignedCounts[lead.sumber] += 1;
    }

    const dayStr = toWibDay(lead.created_at);
    if (dailyCounts.has(dayStr)) {
      dailyCounts.set(dayStr, (dailyCounts.get(dayStr) || 0) + 1);
    }
  }

  const table1Rows: Record<string, unknown>[] = [];
  const totPerSumber: Record<SumberLead, number> = {
    [SumberLead.WALK_IN]: 0,
    [SumberLead.FACEBOOK_ADS]: 0,
    [SumberLead.TIKTOK]: 0,
    [SumberLead.INSTAGRAM]: 0,
    [SumberLead.WA_KANTOR]: 0,
    [SumberLead.REFERRAL]: 0,
    [SumberLead.LAINNYA]: 0,
  };
  let grandTotalLeads = 0;

  for (const [, item] of marketingMap.entries()) {
    const rowTotal = Object.values(item.counts).reduce((a, b) => a + b, 0);
    grandTotalLeads += rowTotal;

    Object.keys(totPerSumber).forEach((s) => {
      totPerSumber[s as SumberLead] += item.counts[s as SumberLead];
    });

    table1Rows.push({
      marketing: item.nama,
      walk_in: item.counts[SumberLead.WALK_IN],
      facebook_ads: item.counts[SumberLead.FACEBOOK_ADS],
      tiktok: item.counts[SumberLead.TIKTOK],
      instagram: item.counts[SumberLead.INSTAGRAM],
      wa_kantor: item.counts[SumberLead.WA_KANTOR],
      referral: item.counts[SumberLead.REFERRAL],
      lainnya: item.counts[SumberLead.LAINNYA],
      total: rowTotal,
    });
  }

  // Row for unassigned
  const unassignedTotal = Object.values(unassignedCounts).reduce((a, b) => a + b, 0);
  if (unassignedTotal > 0) {
    grandTotalLeads += unassignedTotal;
    Object.keys(totPerSumber).forEach((s) => {
      totPerSumber[s as SumberLead] += unassignedCounts[s as SumberLead];
    });
    table1Rows.push({
      marketing: "Belum Ada PIC",
      walk_in: unassignedCounts[SumberLead.WALK_IN],
      facebook_ads: unassignedCounts[SumberLead.FACEBOOK_ADS],
      tiktok: unassignedCounts[SumberLead.TIKTOK],
      instagram: unassignedCounts[SumberLead.INSTAGRAM],
      wa_kantor: unassignedCounts[SumberLead.WA_KANTOR],
      referral: unassignedCounts[SumberLead.REFERRAL],
      lainnya: unassignedCounts[SumberLead.LAINNYA],
      total: unassignedTotal,
    });
  }

  // Sort rows by total desc
  table1Rows.sort((a, b) => (b.total as number) - (a.total as number));

  // Table 2: Daily counts
  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const table2Rows: Record<string, unknown>[] = [];
  for (const [dayKey, count] of dailyCounts.entries()) {
    const dObj = new Date(`${dayKey}T00:00:00.000Z`);
    const dayName = dayNames[dObj.getUTCDay()];
    table2Rows.push({
      tanggal: dayKey,
      hari: dayName,
      jumlah: count,
    });
  }

  return {
    key: "leads",
    title: `Laporan Prospek & Sumber Lead (${bulanLabel(year, month)})`,
    description:
      "Distribusi perolehan prospek baru per marketing x sumber serta tren volume harian di bulan berjalan.",
    notes: [
      "Lead baru dihitung berdasarkan waktu Lead.created_at di zona waktu WIB.",
      "Baris 'Belum Ada PIC' memuat prospek yang belum dialokasikan ke marketing mana pun.",
      "Tabel volume harian menyajikan seluruh hari kalender dalam bulan terpilih (termasuk hari dengan 0 lead).",
    ],
    tables: [
      {
        title: "Distribusi Sumber Lead per Marketing",
        columns: [
          { key: "marketing", label: "Marketing", type: "text" },
          { key: "walk_in", label: "Walk-in Kantor", type: "int" },
          { key: "facebook_ads", label: "Facebook Ads", type: "int" },
          { key: "tiktok", label: "TikTok", type: "int" },
          { key: "instagram", label: "Instagram", type: "int" },
          { key: "wa_kantor", label: "WA Kantor", type: "int" },
          { key: "referral", label: "Referral / Agen", type: "int" },
          { key: "lainnya", label: "Lainnya", type: "int" },
          { key: "total", label: "Total Prospek", type: "int" },
        ],
        rows: table1Rows,
        totals: {
          marketing: "TOTAL",
          walk_in: totPerSumber[SumberLead.WALK_IN],
          facebook_ads: totPerSumber[SumberLead.FACEBOOK_ADS],
          tiktok: totPerSumber[SumberLead.TIKTOK],
          instagram: totPerSumber[SumberLead.INSTAGRAM],
          wa_kantor: totPerSumber[SumberLead.WA_KANTOR],
          referral: totPerSumber[SumberLead.REFERRAL],
          lainnya: totPerSumber[SumberLead.LAINNYA],
          total: grandTotalLeads,
        },
      },
      {
        title: "Rekapitulasi Volume Lead Harian (WIB)",
        columns: [
          { key: "tanggal", label: "Tanggal", type: "date" },
          { key: "hari", label: "Hari", type: "text" },
          { key: "jumlah", label: "Jumlah Lead", type: "int" },
        ],
        rows: table2Rows,
        totals: {
          tanggal: "TOTAL",
          hari: "",
          jumlah: grandTotalLeads,
        },
      },
    ],
  };
}

/**
 * Universal dispatcher for all 9 reports based on tab key.
 */
export async function getReportByKey(
  tab: ReportTabKey,
  year: number,
  month: number
): Promise<ReportResult> {
  switch (tab) {
    case "marketing":
      return getMarketingReport(year, month);
    case "penjualan":
      return getPenjualanReport(year, month);
    case "kas":
      return getKasReport(year, month);
    case "piutang":
      return getPiutangReport();
    case "pembatalan":
      return getPembatalanReport(year, month);
    case "bank":
      return getBankReport(year, month);
    case "durasi":
      return getDurasiReport(year, month);
    case "inventori":
      return getInventoriReport();
    case "leads":
      return getLeadsReport(year, month);
    default:
      return getMarketingReport(year, month);
  }
}
