// lib/transaksi/document-rules.ts

import type {
  JenisDokumen,
  MetodeBayar,
  StatusPernikahan,
  StatusPekerjaan,
} from "@/generated/prisma";

export type DocumentRuleGate = "PENGAJUAN" | "AKAD" | "OPSIONAL";

export function computeDocumentGate(
  required: boolean,
  bisaMenyusul?: boolean
): DocumentRuleGate {
  if (!required) return "OPSIONAL";
  if (bisaMenyusul) return "AKAD";
  return "PENGAJUAN";
}

export interface DocumentRuleItem {
  key: JenisDokumen;
  label: string;
  required: boolean;
  bisaMenyusul?: boolean;
  gate: DocumentRuleGate;
  group?: string;
  description?: string;
}

export type RawDocumentRuleItem = Omit<DocumentRuleItem, "gate">;

function attachGate(item: RawDocumentRuleItem): DocumentRuleItem {
  return {
    ...item,
    gate: computeDocumentGate(item.required, item.bisaMenyusul),
  };
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
 * Persyaratan Pemberkasan KPR Standard Bank (BTN / Bank Rekanan):
 * 1. Wiraswasta / Pegawai Tidak Tetap (TIDAK_TETAP): Tepat 19 persyaratan
 * 2. Karyawan / Pegawai Tetap (TETAP): Tepat 17 persyaratan
 * 3. Khusus KPR Subsidi (kategori === "SUBSIDI"): Tambahan 1 persyaratan (Surat Pernyataan Belum Punya Rumah)
 * 4. Form FPPA: Ditandai "Bisa menyusul" (tidak menghalangi pengajuan KPR awal)
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

  // --- NON-KPR (CASH_KERAS / CASH_TEMPO) ---
  if (!isKpr) {
    const cashList: RawDocumentRuleItem[] = [];

    cashList.push({
      key: "KTP_PEMOHON",
      label: "KTP Pemohon",
      required: true,
      group: "Identitas",
      description: "KTP elektronik asli pemohon",
    });

    cashList.push({
      key: "KARTU_KELUARGA",
      label: "Kartu Keluarga (KK)",
      required: true,
      group: "Identitas",
      description: "Kartu Keluarga terbaru ber-barcode",
    });

    cashList.push({
      key: "NPWP",
      label: "NPWP Pribadi",
      required: true,
      group: "Identitas",
      description: "NPWP aktif terdaftar valid",
    });

    if (statusPernikahan === "MENIKAH") {
      cashList.push({
        key: "KTP_PASANGAN",
        label: "KTP Pasangan (Suami/Istri)",
        required: false,
        group: "Status Pernikahan",
        description: "KTP elektronik asli pasangan pemohon (Opsional Cash)",
      });
      cashList.push({
        key: "BUKU_NIKAH",
        label: "Buku Nikah / Akta Nikah",
        required: false,
        group: "Status Pernikahan",
        description: "Kutipan akta nikah resmi KUA / Catatan Sipil (Opsional Cash)",
      });
    } else if (statusPernikahan === "BELUM_MENIKAH") {
      cashList.push({
        key: "SURAT_PERNYATAAN_BELUM_MENIKAH",
        label: "Surat Pernyataan Belum Menikah",
        required: false,
        group: "Status Pernikahan",
        description: "Surat pernyataan belum menikah (Opsional untuk Cash)",
      });
    } else if (statusPernikahan === "CERAI") {
      cashList.push({
        key: "AKTA_CERAI",
        label: "Akta Cerai / Surat Kematian Pasangan",
        required: false,
        group: "Status Pernikahan",
        description: "Putusan pengadilan agama / akta kematian pasangan (Opsional Cash)",
      });
    }

    cashList.push({
      key: "LEGALITAS_LAINNYA",
      label: "Dokumen Legalitas Tambahan",
      required: false,
      group: "Lainnya",
      description: "Dokumen pendukung lainnya jika diperlukan",
    });

    return {
      isProfileComplete: true,
      missingFields: [],
      documents: cashList.map(attachGate),
    };
  }

  // --- KPR (WIRASWASTA / PEGAWAI TIDAK TETAP vs KARYAWAN / PEGAWAI TETAP) ---
  const list: RawDocumentRuleItem[] = [];
  const isMenikah = statusPernikahan === "MENIKAH";
  const isCerai = statusPernikahan === "CERAI";

  // Helper untuk Dokumen KTP (sesuai status pernikahan)
  const ktpItem: RawDocumentRuleItem = isMenikah
    ? {
      key: "KTP_SUAMI_ISTRI",
      label: "Fotokopi KTP suami istri",
      required: true,
      group: "Identitas & Formulir",
      description: "Fotokopi KTP pemohon dan pasangan (suami istri)",
    }
    : {
      key: "KTP_PEMOHON",
      label: "Fotokopi KTP",
      required: true,
      group: "Identitas & Formulir",
      description: "Fotokopi KTP pemohon",
    };

  // Helper untuk Dokumen Pernikahan (sesuai status pernikahan)
  const nikahItem: RawDocumentRuleItem = isMenikah
    ? {
      key: "BUKU_NIKAH",
      label: "Fotokopi surat nikah",
      required: true,
      group: "Identitas & Formulir",
      description: "Fotokopi buku nikah / akta perkawinan",
    }
    : isCerai
      ? {
        key: "AKTA_CERAI",
        label: "Fotokopi akta cerai",
        required: true,
        group: "Identitas & Formulir",
        description: "Fotokopi akta cerai / surat kematian pasangan",
      }
      : {
        key: "SURAT_PERNYATAAN_BELUM_MENIKAH",
        label: "Surat keterangan belum menikah",
        required: true,
        group: "Identitas & Formulir",
        description: "Surat keterangan belum menikah dari kelurahan/desa",
      };

  // TODO (Business Confirmation): Periksa apakah BUKU_TABUNGAN_BTN dan SURAT_LUNAS_UANG_MUKA juga seharusnya bisaMenyusul untuk TIDAK_TETAP (saat ini hanya FORM_FPPA dan PAS_FOTO yang bisaMenyusul pada TIDAK_TETAP, sedangkan pada TETAP keduanya bisaMenyusul).
  if (statusPekerjaan === "TIDAK_TETAP") {
    // ========================================================
    // 1. KPR Wiraswasta / Pegawai Tidak Tetap (Tepat 19 Dokumen)
    // ========================================================
    list.push(
      // 1
      {
        key: "FORM_APLIKASI_KPR",
        label: "Form Aplikasi KPR",
        required: true,
        group: "Identitas & Formulir",
        description: "Formulir permohonan aplikasi KPR bank yang telah diisi lengkap",
      },
      // 2
      {
        key: "FORM_FPPA",
        label: "Form FPPA",
        required: true,
        bisaMenyusul: true,
        group: "Identitas & Formulir",
        description: "Formulir Persetujuan Penyaluran Pembiayaan / Asuransi (Bisa menyusul)",
      },
      // 3
      ktpItem,
      // 4
      {
        key: "KARTU_KELUARGA",
        label: "Fotokopi Kartu Keluarga",
        required: true,
        group: "Identitas & Formulir",
        description: "Fotokopi Kartu Keluarga terbaru",
      },
      // 5
      nikahItem,
      // 6
      {
        key: "NPWP",
        label: "Fotokopi NPWP / SPPT Pasal 21",
        required: true,
        group: "Identitas & Formulir",
        description: "Fotokopi NPWP pemohon / SPT PPh Pasal 21",
      },
      // 7
      {
        key: "SKU_WIRAUSAHA",
        label: "Fotokopi SIUP / TDP / Surat Keterangan Usaha (suami istri)",
        required: true,
        group: "Pekerjaan & Keuangan",
        description: "Legalitas usaha (SIUP, TDP, NIB, atau SKU dari kelurahan)",
      },
      // 8
      {
        key: "LAPORAN_KEUANGAN",
        label: "Laporan Keuangan 6 bulan terakhir",
        required: true,
        group: "Pekerjaan & Keuangan",
        description: "Laporan laba rugi, neraca, atau pembukuan keuangan usaha 6 bulan terakhir",
      },
      // 9
      {
        key: "SPT_TAHUNAN",
        label: "Fotokopi SPT Tahunan / Surat Keterangan Penghasilan dari kelurahan/desa",
        required: true,
        group: "Pekerjaan & Keuangan",
        description: "Fotokopi SPT PPh tahunan atau surat keterangan penghasilan desa/kelurahan",
      },
      // 10
      {
        key: "REKENING_KORAN",
        label: "Fotokopi buku rekening tabungan / rekening koran 3 bulan terakhir",
        required: true,
        group: "Pekerjaan & Keuangan",
        description: "Buku tabungan / mutasi rekening koran pribadi 3 bulan terakhir",
      },
      // 11
      {
        key: "PAS_FOTO",
        label: "Pas foto 4x6 @ 1 lembar (suami istri)",
        required: true,
        bisaMenyusul: true,
        group: "Identitas & Formulir",
        description: "Pas foto terbaru 4x6 masing-masing 1 lembar",
      },
      // 12
      {
        key: "FOTO_TEMPAT_USAHA",
        label: "Foto tempat usaha tampak depan",
        required: true,
        group: "Pekerjaan & Keuangan",
        description: "Foto fisik tempat usaha tampak depan secara jelas",
      },
      // 13
      {
        key: "DENAH_LOKASI_USAHA",
        label: "Denah menuju lokasi (tulis tangan)",
        required: true,
        group: "Pekerjaan & Keuangan",
        description: "Sketsa denah petunjuk arah menuju lokasi usaha",
      },
      // 14
      {
        key: "BUKU_TABUNGAN_BTN",
        label: "Fotokopi buku tabungan BTN",
        required: true,
        group: "Pekerjaan & Keuangan",
        description: "Fotokopi buku rekening tabungan Bank BTN (halaman depan)",
      },
      // 15
      {
        key: "REKENING_KORAN_USAHA_6BLN",
        label: "Fotokopi rekening koran bank tempat transaksi usaha 6 bulan terakhir",
        required: true,
        group: "Pekerjaan & Keuangan",
        description: "Rekening koran mutasi transaksi usaha 6 bulan terakhir",
      },
      // 16
      {
        key: "SURAT_PENAWARAN_RUMAH",
        label: "Surat Penawaran Rumah",
        required: true,
        group: "Dokumen Properti & Developer",
        description: "Surat Penawaran Rumah (SPR) resmi dari developer",
      },
      // 17
      {
        key: "SURAT_LUNAS_UANG_MUKA",
        label: "Surat Keterangan Lunas Uang Muka",
        required: true,
        group: "Dokumen Properti & Developer",
        description: "Surat keterangan lunas DP / Uang Muka dari developer",
      },
      // 18
      {
        key: "BROSUR_SITEPLAN",
        label: "Brosur dan Siteplan",
        required: true,
        group: "Dokumen Properti & Developer",
        description: "Brosur perumahan dan denah siteplan letak unit",
      },
      // 19
      // TODO (Business Confirmation): KPR + KAVLING saat ini mewajibkan SERTIFIKAT_IMB, perlu konfirmasi apakah kavling tanpa bangunan memerlukan IMB.
      {
        key: "SERTIFIKAT_IMB",
        label: "Fotokopi Sertifikat dan IMB",
        required: true,
        group: "Dokumen Properti & Developer",
        description: "Fotokopi sertifikat induk/pecahan dan IMB/PBG unit",
      }
    );
  } else {
    // ========================================================
    // 2. KPR Karyawan / Pegawai Tetap (Tepat 17 Dokumen)
    // ========================================================
    list.push(
      // 1
      {
        key: "FORM_APLIKASI_KPR",
        label: "Form Aplikasi KPR",
        required: true,
        group: "Identitas & Formulir",
        description: "Formulir permohonan aplikasi KPR bank yang telah diisi lengkap",
      },
      // 2
      {
        key: "FORM_FPPA",
        label: "Form FPPA",
        required: true,
        bisaMenyusul: true,
        group: "Identitas & Formulir",
        description: "Formulir Persetujuan Penyaluran Pembiayaan / Asuransi (Bisa menyusul)",
      },
      // 3
      ktpItem,
      // 4
      {
        key: "KARTU_KELUARGA",
        label: "Fotokopi Kartu Keluarga",
        required: true,
        group: "Identitas & Formulir",
        description: "Fotokopi Kartu Keluarga terbaru",
      },
      // 5
      nikahItem,
      // 6
      {
        key: "NPWP",
        label: "Fotokopi NPWP / SPPT Pasal 21",
        required: true,
        group: "Identitas & Formulir",
        description: "Fotokopi NPWP pemohon / SPT PPh Pasal 21",
      },
      // 7
      {
        key: "SURAT_KET_KERJA",
        label: "Fotokopi SK terakhir / Karpeg / NIP / Surat Keterangan Kerja (suami istri)",
        required: true,
        group: "Pekerjaan & Keuangan",
        description: "SK pengangkatan tetap / Karpeg / Surat Keterangan Kerja resmi",
      },
      // 8
      {
        key: "SLIP_GAJI",
        label: "Fotokopi slip gaji / Surat Keterangan Penghasilan 3 bulan terakhir",
        required: true,
        group: "Pekerjaan & Keuangan",
        description: "Slip gaji resmi atau surat keterangan penghasilan 3 bulan terakhir",
      },
      // 9
      {
        key: "REKENING_KORAN",
        label: "Fotokopi buku rekening tabungan / rekening koran 3 bulan terakhir",
        required: true,
        group: "Pekerjaan & Keuangan",
        description: "Buku tabungan payroll / mutasi rekening koran 3 bulan terakhir",
      },
      // 10
      {
        key: "PAS_FOTO",
        label: "Pas foto 4x6 @ 1 lembar (suami istri)",
        required: true,
        bisaMenyusul: true,
        group: "Identitas & Formulir",
        description: "Pas foto terbaru 4x6 masing-masing 1 lembar",
      },
      // 11
      {
        key: "DENAH_LOKASI_KERJA",
        label: "Denah Lokasi Tempat Bekerja",
        required: true,
        group: "Pekerjaan & Keuangan",
        description: "Denah / sketsa lokasi kantor tempat bekerja",
      },
      // 12
      {
        key: "FOTO_LOKASI_KERJA",
        label: "Foto Lokasi Tempat Bekerja",
        required: true,
        group: "Pekerjaan & Keuangan",
        description: "Foto fisik kantor tempat bekerja",
      },
      // 13
      {
        key: "BUKU_TABUNGAN_BTN",
        label: "Fotokopi buku tabungan",
        required: true,
        bisaMenyusul: true,
        group: "Pekerjaan & Keuangan",
        description: "Fotokopi buku rekening tabungan Bank (halaman depan)",
      },
      // 14
      {
        key: "SURAT_PENAWARAN_RUMAH",
        label: "Surat Penawaran Rumah",
        required: true,
        group: "Dokumen Properti & Developer",
        description: "Surat Penawaran Rumah (SPR) resmi dari developer",
      },
      // 15
      {
        key: "SURAT_LUNAS_UANG_MUKA",
        label: "Surat Keterangan Lunas Uang Muka",
        required: true,
        bisaMenyusul: true,
        group: "Dokumen Properti & Developer",
        description: "Surat keterangan lunas DP / Uang Muka dari developer",
      },
      // 16
      {
        key: "BROSUR_SITEPLAN",
        label: "Brosur dan Siteplan",
        required: true,
        group: "Dokumen Properti & Developer",
        description: "Brosur perumahan dan denah siteplan letak unit",
      },
      // 17
      // TODO (Business Confirmation): KPR + KAVLING saat ini mewajibkan SERTIFIKAT_IMB, perlu konfirmasi apakah kavling tanpa bangunan memerlukan IMB.
      {
        key: "SERTIFIKAT_IMB",
        label: "Fotokopi Sertifikat dan IMB",
        required: true,
        group: "Dokumen Properti & Developer",
        description: "Fotokopi sertifikat induk/pecahan dan IMB/PBG unit",
      }
    );
  }

  // --- 3. Persyaratan Tambahan Khusus KPR Subsidi ---
  if (isSubsidi) {
    list.push({
      key: "SURAT_KET_BELUM_PUNYA_RUMAH",
      label: "Surat Pernyataan Belum Punya Rumah",
      required: true,
      group: "Identitas & Formulir",
      description: "Surat pernyataan resmi belum memiliki rumah (Wajib untuk KPR Subsidi)",
    });
  }

  return {
    isProfileComplete: true,
    missingFields: [],
    documents: list.map(attachGate),
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
  // Legacy compatibility: A verified KTP_SUAMI_ISTRI may satisfy KTP_PEMOHON.
  // Note: A verified KTP_PEMOHON must NOT satisfy KTP_SUAMI_ISTRI (married profile requires combined document).
  if (key === "KTP_PEMOHON" && verifiedKeys.includes("KTP_SUAMI_ISTRI")) {
    return true;
  }
  return false;
}

export const isDokumenLengkap = isDokumenTerverifikasi;

export interface DocumentGateCount {
  done: number;
  total: number;
}

export interface DocumentsSummary {
  pengajuan: DocumentGateCount;
  akad: DocumentGateCount;
  opsional: DocumentGateCount;
  missingForPengajuan: DocumentRuleItem[];
  missingForAkad: DocumentRuleItem[];
}

export function summarizeDocuments(
  docs: DocumentRuleItem[],
  verifiedKeys: string[]
): DocumentsSummary {
  const summary: DocumentsSummary = {
    pengajuan: { done: 0, total: 0 },
    akad: { done: 0, total: 0 },
    opsional: { done: 0, total: 0 },
    missingForPengajuan: [],
    missingForAkad: [],
  };

  for (const doc of docs) {
    const isDone = isDokumenTerverifikasi(doc.key, verifiedKeys);
    if (doc.gate === "PENGAJUAN") {
      summary.pengajuan.total++;
      if (isDone) {
        summary.pengajuan.done++;
      } else {
        summary.missingForPengajuan.push(doc);
      }
    } else if (doc.gate === "AKAD") {
      summary.akad.total++;
      if (isDone) {
        summary.akad.done++;
      } else {
        summary.missingForAkad.push(doc);
      }
    } else {
      summary.opsional.total++;
      if (isDone) {
        summary.opsional.done++;
      }
    }
  }

  return summary;
}
