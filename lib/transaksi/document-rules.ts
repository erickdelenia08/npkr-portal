// lib/transaksi/document-rules.ts

import type {
  JenisDokumen,
  MetodeBayar,
  StatusPernikahan,
  StatusPekerjaan,
} from "@/generated/prisma";

export interface DocumentRuleItem {
  key: JenisDokumen;
  label: string;
  required: boolean;
  description?: string;
}

export interface DocumentRulesParams {
  metode: MetodeBayar;
  kategori: "SUBSIDI" | "KOMERSIL" | "KAVLING" | string;
  statusPernikahan?: StatusPernikahan | null;
  statusPekerjaan?: StatusPekerjaan | null;
}

export type DocumentRulesResult =
  | {
    isProfileComplete: true;
    missingFields: [];
    documents: DocumentRuleItem[];
  }
  | {
    isProfileComplete: false;
    missingFields: Array<"status_pernikahan" | "status_pekerjaan">;
    message: string;
    documents: DocumentRuleItem[];
  };

/**
 * DEFAULT DOCUMENT REQUIREMENT MATRIX
 * NOTE: Aturan matriks default ini harus dikonfirmasi ulang oleh pihak manajemen/bisnis.
 *
 * Matrix Rule:
 * 1. Seluruh transaksi:
 *    - KTP_PEMOHON: Wajib
 *    - KARTU_KELUARGA: Wajib
 *    - NPWP: Wajib
 *    - LEGALITAS_LAINNYA: Opsional
 *
 * 2. Berdasarkan Status Pernikahan:
 *    - MENIKAH:
 *      * KTP_PASANGAN: Wajib
 *      * BUKU_NIKAH: Wajib
 *    - BELUM_MENIKAH:
 *      * SURAT_PERNYATAAN_BELUM_MENIKAH: Wajib (KPR), Opsional (Cash)
 *    - CERAI:
 *      * AKTA_CERAI: Wajib
 *
 * 3. Berdasarkan Pekerjaan & Skema Pembayaran:
 *    - KPR + TETAP:
 *      * SLIP_GAJI: Wajib
 *      * SURAT_KET_KERJA: Wajib
 *      * REKENING_KORAN: Wajib
 *    - KPR + TIDAK_TETAP (Wirausaha / Profesional):
 *      * SKU_WIRAUSAHA: Wajib
 *      * REKENING_KORAN: Wajib
 *      * LAPORAN_KEUANGAN: Wajib jika KOMERSIL, Opsional jika SUBSIDI
 *    - KPR + SUBSIDI:
 *      * SURAT_KET_BELUM_PUNYA_RUMAH: Wajib
 *    - CASH (CASH_KERAS / CASH_TEMPO):
 *      * Tidak ada dokumen penghasilan (Slip Gaji, SKK, Rekening Koran, SKU, Lap. Keuangan)
 */
export function getRequiredDocuments({
  metode,
  kategori,
  statusPernikahan,
  statusPekerjaan,
}: DocumentRulesParams): DocumentRulesResult {
  const isKpr = metode === "KPR";
  const missingFields: Array<"status_pernikahan" | "status_pekerjaan"> = [];

  // Status pernikahan dan pekerjaan hanya wajib untuk KPR
  if (isKpr) {
    if (!statusPernikahan) {
      missingFields.push("status_pernikahan");
    }
    if (!statusPekerjaan) {
      missingFields.push("status_pekerjaan");
    }
  }

  if (missingFields.length > 0) {
    const missingLabels = missingFields.map((f) =>
      f === "status_pernikahan" ? "Status Pernikahan" : "Status Pekerjaan"
    );
    return {
      isProfileComplete: false,
      missingFields,
      message: `Profil kelayakan pemberkasan belum lengkap. Silakan tentukan: [${missingLabels.join(
        ", "
      )}].`,
      documents: [],
    };
  }

  const isSubsidi = kategori === "SUBSIDI";
  const isKomersil = kategori === "KOMERSIL";

  const list: DocumentRuleItem[] = [];

  // --- 1. Dokumen Dasar (Semua Konsumen) ---
  list.push({
    key: "KTP_PEMOHON",
    label: "KTP Pemohon",
    required: true,
    description: "KTP elektronik asli pemohon",
  });

  list.push({
    key: "KARTU_KELUARGA",
    label: "Kartu Keluarga (KK)",
    required: true,
    description: "Kartu Keluarga terbaru ber-barcode",
  });

  list.push({
    key: "NPWP",
    label: "NPWP Pribadi",
    required: true,
    description: "NPWP aktif terdaftar valid",
  });

  // --- 2. Dokumen Status Pernikahan ---
  if (statusPernikahan === "MENIKAH") {
    list.push({
      key: "KTP_PASANGAN",
      label: "KTP Pasangan (Suami/Istri)",
      required: isKpr,
      description: isKpr
        ? "KTP elektronik asli pasangan pemohon (Wajib KPR)"
        : "KTP elektronik asli pasangan pemohon (Opsional Cash)",
    });
    list.push({
      key: "BUKU_NIKAH",
      label: "Buku Nikah / Akta Nikah",
      required: isKpr,
      description: isKpr
        ? "Kutipan akta nikah resmi KUA / Catatan Sipil (Wajib KPR)"
        : "Kutipan akta nikah resmi KUA / Catatan Sipil (Opsional Cash)",
    });
  } else if (statusPernikahan === "BELUM_MENIKAH") {
    list.push({
      key: "SURAT_PERNYATAAN_BELUM_MENIKAH",
      label: "Surat Pernyataan Belum Menikah",
      required: isKpr,
      description: isKpr
        ? "Surat keterangan / pernyataan belum menikah dari kelurahan (Wajib KPR)"
        : "Surat pernyataan belum menikah (Opsional untuk Cash)",
    });
  } else if (statusPernikahan === "CERAI") {
    list.push({
      key: "AKTA_CERAI",
      label: "Akta Cerai / Surat Kematian Pasangan",
      required: isKpr,
      description: isKpr
        ? "Putusan pengadilan agama / akta kematian pasangan (Wajib KPR)"
        : "Putusan pengadilan agama / akta kematian pasangan (Opsional Cash)",
    });
  }

  // --- 3. Dokumen Pekerjaan & Penghasilan (Hanya KPR) ---
  if (isKpr) {
    if (statusPekerjaan === "TETAP") {
      list.push({
        key: "SLIP_GAJI",
        label: "Slip Gaji 3 Bulan Terakhir",
        required: true,
        description: "Rincian gaji resmi bertanda tangan HRD/Keuangan",
      });
      list.push({
        key: "SURAT_KET_KERJA",
        label: "Surat Keterangan Kerja (SKK)",
        required: true,
        description: "SKK asli dari perusahaan pemberi kerja",
      });
      list.push({
        key: "REKENING_KORAN",
        label: "Rekening Koran Payroll 3–6 Bulan",
        required: true,
        description: "Buku tabungan / e-statement payroll bank",
      });
    } else if (statusPekerjaan === "TIDAK_TETAP") {
      list.push({
        key: "SKU_WIRAUSAHA",
        label: "Surat Keterangan Usaha (SKU) / NIB",
        required: true,
        description: "Izin usaha legalitas dari kelurahan / OSS",
      });
      list.push({
        key: "REKENING_KORAN",
        label: "Rekening Koran Operasional Usaha 3–6 Bulan",
        required: true,
        description: "Rekening koran tabungan mutasi usaha",
      });
      list.push({
        key: "LAPORAN_KEUANGAN",
        label: "Laporan Keuangan Usaha",
        required: isKomersil,
        description: isKomersil
          ? "Laporan laba rugi & neraca usaha 1 tahun terakhir (Wajib Komersil)"
          : "Catatan omzet dan pembukuan sederhana (Opsional Subsidi)",
      });
    }

    // Dokumen Khusus Subsidi
    if (isSubsidi) {
      list.push({
        key: "SURAT_KET_BELUM_PUNYA_RUMAH",
        label: "Surat Keterangan Belum Memiliki Rumah",
        required: true,
        description: "Surat resmi kelurahan untuk syarat KPR FLPP/Subsidi",
      });
    }
  }

  // --- 4. Dokumen Tambahan ---
  list.push({
    key: "LEGALITAS_LAINNYA",
    label: "Dokumen Legalitas Tambahan",
    required: false,
    description: "Dokumen pendukung lainnya jika diperlukan",
  });

  return {
    isProfileComplete: true,
    missingFields: [],
    documents: list,
  };
}

export function isProfilPemberkasanLengkap(
  statusPernikahan?: StatusPernikahan | null,
  statusPekerjaan?: StatusPekerjaan | null,
  metode?: MetodeBayar
): boolean {
  if (metode === "KPR") {
    if (!statusPernikahan) return false;
    if (!statusPekerjaan) return false;
  }
  return true;
}

export function isDokumenTerverifikasi(
  key: JenisDokumen,
  verifiedKeys: string[]
): boolean {
  if (verifiedKeys.includes(key)) return true;
  if (key === "KTP_PEMOHON" && verifiedKeys.includes("KTP_SUAMI_ISTRI")) {
    return true;
  }
  return false;
}

