import { describe, it, expect } from "vitest";
import {
  getRequiredDocuments,
  isDokumenTerverifikasi,
  isProfilPemberkasanLengkap,
} from "@/lib/transaksi/document-rules";

describe("Document Rules Matrix SSOT - Bank KPR Checklist", () => {
  it("blocks and flags incomplete profile when marital status is missing", () => {
    const result = getRequiredDocuments({
      metode: "KPR",
      kategori: "SUBSIDI",
      statusPernikahan: null,
      statusPekerjaan: "TETAP",
    });

    expect(result.isProfileComplete).toBe(false);
    if (!result.isProfileComplete) {
      expect(result.missingFields).toContain("status_pernikahan");
      expect(result.message).toContain("Status Pernikahan");
    }
  });

  it("blocks when employment status is missing for KPR", () => {
    const result = getRequiredDocuments({
      metode: "KPR",
      kategori: "SUBSIDI",
      statusPernikahan: "MENIKAH",
      statusPekerjaan: null,
    });

    expect(result.isProfileComplete).toBe(false);
    if (!result.isProfileComplete) {
      expect(result.missingFields).toContain("status_pekerjaan");
    }
  });

  it("KPR Wiraswasta / Pegawai Tidak Tetap (KOMERSIL) generates exactly 19 items", () => {
    const result = getRequiredDocuments({
      metode: "KPR",
      kategori: "KOMERSIL",
      statusPernikahan: "MENIKAH",
      statusPekerjaan: "TIDAK_TETAP",
    });

    expect(result.isProfileComplete).toBe(true);
    if (result.isProfileComplete) {
      // Exactly 19 items
      expect(result.documents.length).toBe(19);

      const keys = result.documents.map((d) => d.key);
      const expectedKeys = [
        "FORM_APLIKASI_KPR",
        "FORM_FPPA",
        "KTP_SUAMI_ISTRI",
        "KARTU_KELUARGA",
        "BUKU_NIKAH",
        "NPWP",
        "SKU_WIRAUSAHA",
        "LAPORAN_KEUANGAN",
        "SPT_TAHUNAN",
        "REKENING_KORAN",
        "PAS_FOTO",
        "FOTO_TEMPAT_USAHA",
        "DENAH_LOKASI_USAHA",
        "BUKU_TABUNGAN_BTN",
        "REKENING_KORAN_USAHA_6BLN",
        "SURAT_PENAWARAN_RUMAH",
        "SURAT_LUNAS_UANG_MUKA",
        "BROSUR_SITEPLAN",
        "SERTIFIKAT_IMB",
      ];
      expect(keys).toEqual(expectedKeys);

      // FPPA must have bisaMenyusul = true
      const fppa = result.documents.find((d) => d.key === "FORM_FPPA");
      expect(fppa).toBeDefined();
      expect(fppa?.required).toBe(true);
      expect(fppa?.bisaMenyusul).toBe(true);

      // Distinct keys for financial accounts
      expect(keys).toContain("REKENING_KORAN");
      expect(keys).toContain("REKENING_KORAN_USAHA_6BLN");
      expect(keys).toContain("BUKU_TABUNGAN_BTN");

      // Developer / property docs included
      expect(keys).toContain("SURAT_PENAWARAN_RUMAH");
      expect(keys).toContain("SURAT_LUNAS_UANG_MUKA");
      expect(keys).toContain("BROSUR_SITEPLAN");
      expect(keys).toContain("SERTIFIKAT_IMB");

      // No subsidies doc for komersil
      expect(keys).not.toContain("SURAT_KET_BELUM_PUNYA_RUMAH");
    }
  });

  it("KPR Karyawan / Pegawai Tetap (KOMERSIL) generates exactly 17 items", () => {
    const result = getRequiredDocuments({
      metode: "KPR",
      kategori: "KOMERSIL",
      statusPernikahan: "MENIKAH",
      statusPekerjaan: "TETAP",
    });

    expect(result.isProfileComplete).toBe(true);
    if (result.isProfileComplete) {
      // Exactly 17 items
      expect(result.documents.length).toBe(17);

      const keys = result.documents.map((d) => d.key);
      const expectedKeys = [
        "FORM_APLIKASI_KPR",
        "FORM_FPPA",
        "KTP_SUAMI_ISTRI",
        "KARTU_KELUARGA",
        "BUKU_NIKAH",
        "NPWP",
        "SURAT_KET_KERJA",
        "SLIP_GAJI",
        "REKENING_KORAN",
        "PAS_FOTO",
        "DENAH_LOKASI_KERJA",
        "FOTO_LOKASI_KERJA",
        "BUKU_TABUNGAN_BTN",
        "SURAT_PENAWARAN_RUMAH",
        "SURAT_LUNAS_UANG_MUKA",
        "BROSUR_SITEPLAN",
        "SERTIFIKAT_IMB",
      ];
      expect(keys).toEqual(expectedKeys);

      // FPPA must have bisaMenyusul = true
      const fppa = result.documents.find((d) => d.key === "FORM_FPPA");
      expect(fppa?.bisaMenyusul).toBe(true);

      // Developer / property docs included
      expect(keys).toContain("SURAT_PENAWARAN_RUMAH");
      expect(keys).toContain("SURAT_LUNAS_UANG_MUKA");
      expect(keys).toContain("BROSUR_SITEPLAN");
      expect(keys).toContain("SERTIFIKAT_IMB");

      // Does not contain wiraswasta-specific docs
      expect(keys).not.toContain("SKU_WIRAUSAHA");
      expect(keys).not.toContain("LAPORAN_KEUANGAN");
      expect(keys).not.toContain("SPT_TAHUNAN");
      expect(keys).not.toContain("REKENING_KORAN_USAHA_6BLN");
      expect(keys).not.toContain("FOTO_TEMPAT_USAHA");
      expect(keys).not.toContain("DENAH_LOKASI_USAHA");
    }
  });

  it("adapts marriage documents dynamically according to statusPernikahan", () => {
    // 1. MENIKAH -> BUKU_NIKAH & KTP_SUAMI_ISTRI
    const resMenikah = getRequiredDocuments({
      metode: "KPR",
      kategori: "KOMERSIL",
      statusPernikahan: "MENIKAH",
      statusPekerjaan: "TETAP",
    });
    expect(resMenikah.documents.map((d) => d.key)).toContain("BUKU_NIKAH");
    expect(resMenikah.documents.map((d) => d.key)).toContain("KTP_SUAMI_ISTRI");
    expect(resMenikah.documents.find((d) => d.key === "KTP_SUAMI_ISTRI")?.label).toBe(
      "Fotokopi KTP suami istri"
    );

    // 2. CERAI -> AKTA_CERAI & KTP_PEMOHON
    const resCerai = getRequiredDocuments({
      metode: "KPR",
      kategori: "KOMERSIL",
      statusPernikahan: "CERAI",
      statusPekerjaan: "TETAP",
    });
    expect(resCerai.documents.map((d) => d.key)).toContain("AKTA_CERAI");
    expect(resCerai.documents.map((d) => d.key)).toContain("KTP_PEMOHON");
    expect(resCerai.documents.map((d) => d.key)).not.toContain("KTP_SUAMI_ISTRI");
    expect(resCerai.documents.map((d) => d.key)).not.toContain("BUKU_NIKAH");
    expect(resCerai.documents.length).toBe(17);

    // 3. BELUM MENIKAH -> SURAT_PERNYATAAN_BELUM_MENIKAH & KTP_PEMOHON
    const resBelumMenikah = getRequiredDocuments({
      metode: "KPR",
      kategori: "KOMERSIL",
      statusPernikahan: "BELUM_MENIKAH",
      statusPekerjaan: "TETAP",
    });
    expect(resBelumMenikah.documents.map((d) => d.key)).toContain(
      "SURAT_PERNYATAAN_BELUM_MENIKAH"
    );
    expect(resBelumMenikah.documents.map((d) => d.key)).toContain("KTP_PEMOHON");
    expect(resBelumMenikah.documents.map((d) => d.key)).not.toContain("KTP_SUAMI_ISTRI");
    expect(resBelumMenikah.documents.map((d) => d.key)).not.toContain("BUKU_NIKAH");
    expect(resBelumMenikah.documents.length).toBe(17);
  });

  it("adds exactly 1 additional document for KPR SUBSIDI", () => {
    // Wiraswasta Subsidi: 19 + 1 = 20
    const resWiraswastaSubsidi = getRequiredDocuments({
      metode: "KPR",
      kategori: "SUBSIDI",
      statusPernikahan: "MENIKAH",
      statusPekerjaan: "TIDAK_TETAP",
    });
    expect(resWiraswastaSubsidi.documents.length).toBe(20);
    expect(resWiraswastaSubsidi.documents.map((d) => d.key)).toContain(
      "SURAT_KET_BELUM_PUNYA_RUMAH"
    );
    const subsidiDoc = resWiraswastaSubsidi.documents.find(
      (d) => d.key === "SURAT_KET_BELUM_PUNYA_RUMAH"
    );
    expect(subsidiDoc?.required).toBe(true);

    // Karyawan Subsidi: 17 + 1 = 18
    const resKaryawanSubsidi = getRequiredDocuments({
      metode: "KPR",
      kategori: "SUBSIDI",
      statusPernikahan: "MENIKAH",
      statusPekerjaan: "TETAP",
    });
    expect(resKaryawanSubsidi.documents.length).toBe(18);
    expect(resKaryawanSubsidi.documents.map((d) => d.key)).toContain(
      "SURAT_KET_BELUM_PUNYA_RUMAH"
    );
  });

  it("excludes income and developer/KPR documents for Cash methods", () => {
    const result = getRequiredDocuments({
      metode: "CASH_KERAS",
      kategori: "KOMERSIL",
      statusPernikahan: "CERAI",
      statusPekerjaan: "TETAP",
    });

    expect(result.isProfileComplete).toBe(true);
    if (result.isProfileComplete) {
      const allDocKeys = result.documents.map((d) => d.key);
      const requiredKeys = result.documents.filter((d) => d.required).map((d) => d.key);

      expect(requiredKeys).toContain("KTP_PEMOHON");
      expect(requiredKeys).toContain("KARTU_KELUARGA");
      expect(requiredKeys).toContain("NPWP");

      // Marital documents are included in checklist but optional for Cash
      expect(allDocKeys).toContain("AKTA_CERAI");
      expect(result.documents.find((d) => d.key === "AKTA_CERAI")?.required).toBe(false);

      // No income docs for cash
      expect(allDocKeys).not.toContain("SLIP_GAJI");
      expect(allDocKeys).not.toContain("SURAT_KET_KERJA");
      expect(allDocKeys).not.toContain("REKENING_KORAN");
      expect(allDocKeys).not.toContain("SKU_WIRAUSAHA");
      expect(allDocKeys).not.toContain("FORM_APLIKASI_KPR");
    }
  });

  it("safely accepts legacy KTP_SUAMI_ISTRI for KTP_PEMOHON verification and vice-versa", () => {
    const legacyVerifiedDocs = ["KTP_SUAMI_ISTRI", "KARTU_KELUARGA"];

    expect(isDokumenTerverifikasi("KTP_PEMOHON", legacyVerifiedDocs)).toBe(true);
    expect(isDokumenTerverifikasi("KTP_SUAMI_ISTRI", legacyVerifiedDocs)).toBe(true);
    expect(isDokumenTerverifikasi("KARTU_KELUARGA", legacyVerifiedDocs)).toBe(true);
    expect(isDokumenTerverifikasi("NPWP", legacyVerifiedDocs)).toBe(false);

    const pemohonVerifiedDocs = ["KTP_PEMOHON"];
    expect(isDokumenTerverifikasi("KTP_SUAMI_ISTRI", pemohonVerifiedDocs)).toBe(true);
  });
});
