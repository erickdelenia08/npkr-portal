// actions/report.action.ts
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// ─── 1. Performa Marketing Data Types ───
export interface MarketingPerformanceRow {
  namaMarketing: string;
  username: string;
  noHp: string;
  totalLeadAktif: number;
  totalSurvei: number;
  totalClosing: number;
}

// ─── 2. Penjualan Closing Data Types ───
export interface SalesReportRow {
  tanggalClosing: string;
  namaCustomer: string;
  nikCustomer: string;
  noHpCustomer: string;
  blokUnit: string;
  tipeUnit: string;
  metodeBayar: string;
  hargaDeal: number;
  marketingPic: string;
}

// ─── 3. Sumber Lead Data Types ───
export interface LeadSourceRow {
  sumber: string;
  jumlahLeadMasuk: number;
  jumlahSurvei: number;
  jumlahClosing: number;
  persentaseClosing: string;
}

// Helper: Calculate Date Range for Month & Year
function getDateRange(month: number, year: number): { startDate: Date; endDate: Date } {
  if (month === 0) {
    // 0 = All Year
    return {
      startDate: new Date(year, 0, 1, 0, 0, 0, 0),
      endDate: new Date(year, 11, 31, 23, 59, 59, 999),
    };
  }
  return {
    startDate: new Date(year, month - 1, 1, 0, 0, 0, 0),
    endDate: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

/**
 * Report 1: Laporan Performa Marketing
 * Columns: Nama Marketing, Total Lead Aktif, Total Survei, Total Closing (ITJ Disetujui)
 */
export async function getMarketingPerformanceReport(
  month: number,
  year: number
): Promise<ActionResponse<MarketingPerformanceRow[]>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return {
      success: false,
      error: "Hanya Branch Manager atau Admin yang dapat mengekspor laporan.",
    };
  }

  const { startDate, endDate } = getDateRange(month, year);

  try {
    const marketingUsers = await prisma.user.findMany({
      where: {
        role: "MARKETING",
        isActive: true,
      },
      select: {
        id: true,
        nama: true,
        username: true,
        no_hp: true,
        leads: {
          select: {
            id: true,
            closing_at: true,
            lost_at: true,
            survei_selesai_at: true,
            created_at: true,
            itj: {
              where: {
                status: "DISETUJUI",
                OR: [
                  {
                    diputuskan_at: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                  {
                    diputuskan_at: null,
                    diajukan_at: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                ],
              },
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        nama: "asc",
      },
    });

    const rows: MarketingPerformanceRow[] = marketingUsers.map((user) => {
      let totalLeadAktif = 0;
      let totalSurvei = 0;
      let totalClosing = 0;

      for (const lead of user.leads) {
        // Active lead: not lost and not closed
        if (!lead.closing_at && !lead.lost_at) {
          totalLeadAktif += 1;
        }

        // Survey conducted in selected period
        if (
          lead.survei_selesai_at &&
          new Date(lead.survei_selesai_at) >= startDate &&
          new Date(lead.survei_selesai_at) <= endDate
        ) {
          totalSurvei += 1;
        }

        // Approved ITJs or closing in selected period
        if (lead.itj.length > 0) {
          totalClosing += lead.itj.length;
        } else if (
          lead.closing_at &&
          new Date(lead.closing_at) >= startDate &&
          new Date(lead.closing_at) <= endDate
        ) {
          totalClosing += 1;
        }
      }

      return {
        namaMarketing: user.nama,
        username: user.username,
        noHp: user.no_hp,
        totalLeadAktif,
        totalSurvei,
        totalClosing,
      };
    });

    // Sort by Total Closing descending
    rows.sort((a, b) => b.totalClosing - a.totalClosing);

    return {
      success: true,
      data: rows,
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal memproses laporan performa marketing.";
    return { success: false, error: errorMsg };
  }
}

/**
 * Report 2: Laporan Penjualan (Closing)
 * Columns: Tanggal Closing, Nama Customer, Blok Unit, Metode Bayar, Harga Deal, Marketing PIC
 */
export async function getSalesReport(
  month: number,
  year: number
): Promise<ActionResponse<SalesReportRow[]>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return {
      success: false,
      error: "Hanya Branch Manager atau Admin yang dapat mengekspor laporan.",
    };
  }

  const { startDate, endDate } = getDateRange(month, year);

  try {
    const transaksiList = await prisma.transaksi.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        customer: {
          include: {
            lead: {
              include: {
                itj: {
                  where: { status: "DISETUJUI" },
                  take: 1,
                  select: { diajukan_at: true, diputuskan_at: true },
                },
              },
            },
          },
        },
        unit: {
          include: {
            tipe: true,
          },
        },
        marketing: {
          select: {
            nama: true,
            username: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    const rows: SalesReportRow[] = transaksiList.map((trx) => {
      const closingDate =
        trx.tgl_akad ||
        trx.customer.lead?.closing_at ||
        trx.customer.lead?.itj?.[0]?.diputuskan_at ||
        trx.created_at;

      const dateStr = new Date(closingDate).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      return {
        tanggalClosing: dateStr,
        namaCustomer: trx.customer.nama_ktp,
        nikCustomer: trx.customer.nik,
        noHpCustomer: trx.customer.no_hp,
        blokUnit: trx.unit.blok,
        tipeUnit: trx.unit.tipe.nama_tipe,
        metodeBayar: trx.metode_bayar,
        hargaDeal: Number(trx.harga_deal),
        marketingPic: trx.marketing.nama,
      };
    });

    return {
      success: true,
      data: rows,
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal memproses laporan penjualan.";
    return { success: false, error: errorMsg };
  }
}

/**
 * Report 3: Laporan Sumber Lead
 * Columns: Sumber (Walk-in, FB Ads, etc.), Jumlah Lead Masuk, Jumlah Closing
 */
export async function getLeadSourceReport(
  month: number,
  year: number
): Promise<ActionResponse<LeadSourceRow[]>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return {
      success: false,
      error: "Hanya Branch Manager atau Admin yang dapat mengekspor laporan.",
    };
  }

  const { startDate, endDate } = getDateRange(month, year);

  try {
    const leads = await prisma.lead.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        sumber: true,
        survei_selesai_at: true,
        closing_at: true,
      },
    });

    const sumberMap = new Map<
      string,
      { masuk: number; survei: number; closing: number }
    >();

    for (const lead of leads) {
      const rawSumber = lead.sumber.trim() || "Lainnya";
      const existing = sumberMap.get(rawSumber) || {
        masuk: 0,
        survei: 0,
        closing: 0,
      };

      existing.masuk += 1;
      if (lead.survei_selesai_at) {
        existing.survei += 1;
      }
      if (lead.closing_at) {
        existing.closing += 1;
      }

      sumberMap.set(rawSumber, existing);
    }

    const rows: LeadSourceRow[] = Array.from(sumberMap.entries()).map(
      ([sumber, counts]) => {
        const rate =
          counts.masuk > 0
            ? ((counts.closing / counts.masuk) * 100).toFixed(1) + "%"
            : "0%";

        return {
          sumber,
          jumlahLeadMasuk: counts.masuk,
          jumlahSurvei: counts.survei,
          jumlahClosing: counts.closing,
          persentaseClosing: rate,
        };
      }
    );

    // Sort by Jumlah Lead Masuk descending
    rows.sort((a, b) => b.jumlahLeadMasuk - a.jumlahLeadMasuk);

    return {
      success: true,
      data: rows,
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal memproses laporan sumber lead.";
    return { success: false, error: errorMsg };
  }
}
