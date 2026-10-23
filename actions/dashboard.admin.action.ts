"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatTimestampWIB } from "@/lib/date/wib";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface AdminDashboardMetrics {
  pendingItjCount: number;
  pendingDocsCount: number;
  activeKprCount: number;
}

export interface AdminPendingItjItem {
  id: number;
  leadNama: string;
  leadNoHp: string;
  unitBlok: string;
  nominal: number;
  diajukanAt: string;
}

export interface AdminPendingDocItem {
  id: number;
  transaksiId: number;
  jenis: string;
  jenisLabel: string;
  customerNama: string;
  unitBlok: string;
  uploadedAt: string;
}

export interface AdminActiveKprItem {
  id: number;
  transaksiId: number;
  nomorPengajuan: number;
  bankNama: string;
  customerNama: string;
  unitBlok: string;
  status: string;
  updatedAt: string;
}

export interface AdminDashboardData {
  metrics: AdminDashboardMetrics;
  widgets: {
    pendingItj: AdminPendingItjItem[];
    pendingDocs: AdminPendingDocItem[];
    activeKpr: AdminActiveKprItem[];
  };
}

const JENIS_DOKUMEN_LABELS: Record<string, string> = {
  KTP_SUAMI_ISTRI: "KTP Suami / Istri",
  KARTU_KELUARGA: "Kartu Keluarga (KK)",
  NPWP: "NPWP Pribadi",
  BUKU_NIKAH: "Buku Nikah / Akta Nikah",
  SLIP_GAJI: "Slip Gaji",
  SURAT_KET_KERJA: "Surat Keterangan Kerja",
  REKENING_KORAN: "Rekening Koran 3 Bln",
  SURAT_KET_BELUM_PUNYA_RUMAH: "Surat Ket. Belum Ada Rumah",
  SKU_WIRAUSAHA: "Surat Ket. Usaha (SKU)",
  LAPORAN_KEUANGAN: "Laporan Keuangan",
  LEGALITAS_LAINNYA: "Dokumen Lainnya",
};

/**
 * Server Action for Admin Dashboard (Desktop Command Center)
 * - Metric 1: Count Itj where status = 'DIAJUKAN'
 * - Metric 2: Count DokumenTransaksi where status = 'MENUNGGU_VERIFIKASI'
 * - Metric 3: Count PengajuanKPR where status in ['DIAJUKAN', 'WAWANCARA', 'OTS']
 * - Widget 1: Top 5 newest Itj where status = 'DIAJUKAN'
 * - Widget 2: Top 5 newest DokumenTransaksi where status = 'MENUNGGU_VERIFIKASI'
 * - Widget 3: Active PengajuanKPR (not DISETUJUI/DITOLAK/DIBATALKAN)
 */
export async function getAdminDashboardData(): Promise<
  ActionResponse<AdminDashboardData>
> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        message: "Akses ditolak: Silakan login terlebih dahulu.",
      };
    }

    const userRole = session.user.role;
    const allowedRoles = ["ADMIN", "MANAGER"];

    if (!userRole || !allowedRoles.includes(userRole)) {
      return {
        success: false,
        message: "Akses ditolak: Hanya Admin dan Manager yang dapat mengakses Dashboard Admin.",
      };
    }

    // 1. Metric 1: Count active Closing ITJ (transaksi not BATAL)
    const pendingItjCount = await prisma.itj.count({
      where: {
        transaksi: {
          is: {
            status_transaksi: { not: "BATAL" },
          },
        },
      },
    });

    // 2. Metric 2: Count DokumenTransaksi where status = 'MENUNGGU_VERIFIKASI'
    const pendingDocsCount = await prisma.dokumenTransaksi.count({
      where: { status: "MENUNGGU_VERIFIKASI" },
    });

    // 3. Metric 3: Count PengajuanKPR where status in ['DIAJUKAN', 'WAWANCARA', 'OTS']
    const activeKprCount = await prisma.pengajuanKPR.count({
      where: {
        status: { in: ["DIAJUKAN", "WAWANCARA", "OTS"] },
      },
    });

    // 4. Widget Data 1 (Recent Closings): Top 5 newest active ITJ
    const rawPendingItj = await prisma.itj.findMany({
      where: {
        transaksi: {
          is: {
            status_transaksi: { not: "BATAL" },
          },
        },
      },
      orderBy: { diajukan_at: "desc" },
      take: 5,
      include: {
        lead: {
          select: { nama: true, no_hp: true },
        },
        unit: {
          select: { blok: true },
        },
      },
    });

    const pendingItj: AdminPendingItjItem[] = rawPendingItj.map((item) => ({
      id: item.id,
      leadNama: item.lead?.nama || item.nama_ktp,
      leadNoHp: item.lead?.no_hp || "-",
      unitBlok: item.unit?.blok || "-",
      nominal: Number(item.nominal),
      diajukanAt: formatTimestampWIB(item.diajukan_at),
    }));

    // 5. Widget Data 2 (Pending Docs): Top 5 newest DokumenTransaksi where status = 'MENUNGGU_VERIFIKASI'
    const rawPendingDocs = await prisma.dokumenTransaksi.findMany({
      where: { status: "MENUNGGU_VERIFIKASI" },
      orderBy: { updated_at: "desc" },
      take: 5,
      include: {
        transaksi: {
          select: {
            id: true,
            customer: {
              select: { nama_ktp: true },
            },
            unit: {
              select: { blok: true },
            },
          },
        },
      },
    });

    const pendingDocs: AdminPendingDocItem[] = rawPendingDocs.map((item) => ({
      id: item.id,
      transaksiId: item.transaksi_id,
      jenis: item.jenis,
      jenisLabel: JENIS_DOKUMEN_LABELS[item.jenis] || item.jenis,
      customerNama: item.transaksi?.customer?.nama_ktp || "Konsumen",
      unitBlok: item.transaksi?.unit?.blok || "-",
      uploadedAt: formatTimestampWIB(item.updated_at),
    }));

    // 6. Widget Data 3 (KPR Tracking): Active PengajuanKPR (not DISETUJUI/DITOLAK/DIBATALKAN)
    const rawActiveKpr = await prisma.pengajuanKPR.findMany({
      where: {
        status: {
          notIn: ["DISETUJUI", "DITOLAK", "DIBATALKAN"],
        },
      },
      orderBy: { updated_at: "desc" },
      take: 5,
      include: {
        bank: {
          select: { nama: true },
        },
        transaksi: {
          select: {
            id: true,
            customer: {
              select: { nama_ktp: true },
            },
            unit: {
              select: { blok: true },
            },
          },
        },
      },
    });

    const activeKpr: AdminActiveKprItem[] = rawActiveKpr.map((item) => ({
      id: item.id,
      transaksiId: item.transaksi_id,
      nomorPengajuan: item.nomor_pengajuan,
      bankNama: item.bank?.nama || "Bank",
      customerNama: item.transaksi?.customer?.nama_ktp || "Konsumen",
      unitBlok: item.transaksi?.unit?.blok || "-",
      status: item.status,
      updatedAt: formatTimestampWIB(item.updated_at),
    }));

    return {
      success: true,
      message: "Data dashboard admin berhasil dimuat",
      data: {
        metrics: {
          pendingItjCount,
          pendingDocsCount,
          activeKprCount,
        },
        widgets: {
          pendingItj,
          pendingDocs,
          activeKpr,
        },
      },
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal memuat data dashboard admin";
    return {
      success: false,
      message: errorMsg,
      error: errorMsg,
    };
  }
}
