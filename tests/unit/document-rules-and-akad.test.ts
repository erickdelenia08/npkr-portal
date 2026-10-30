import { describe, it, expect } from "vitest";
import {
  getRequiredDocuments,
  isDokumenTerverifikasi,
  isProfilPemberkasanLengkap,
} from "@/lib/transaksi/document-rules";

describe("Document Rules Matrix SSOT", () => {
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

  it("generates correct document requirements for KPR + SUBSIDI + MENIKAH + TETAP", () => {
    const result = getRequiredDocuments({
      metode: "KPR",
      kategori: "SUBSIDI",
      statusPernikahan: "MENIKAH",
      statusPekerjaan: "TETAP",
    });

    expect(result.isProfileComplete).toBe(true);
    if (result.isProfileComplete) {
      const keys = result.documents.map((d) => d.key);
      const requiredKeys = result.documents.filter((d) => d.required).map((d) => d.key);

      // Core docs
      expect(requiredKeys).toContain("KTP_PEMOHON");
      expect(requiredKeys).toContain("KARTU_KELUARGA");
      expect(requiredKeys).toContain("NPWP");

      // Menikah docs
      expect(requiredKeys).toContain("KTP_PASANGAN");
      expect(requiredKeys).toContain("BUKU_NIKAH");

      // Tetap docs
      expect(requiredKeys).toContain("SLIP_GAJI");
      expect(requiredKeys).toContain("SURAT_KET_KERJA");
      expect(requiredKeys).toContain("REKENING_KORAN");

      // Subsidi docs
      expect(requiredKeys).toContain("SURAT_KET_BELUM_PUNYA_RUMAH");

      // Optional doc
      expect(keys).toContain("LEGALITAS_LAINNYA");
      expect(requiredKeys).not.toContain("LEGALITAS_LAINNYA");
    }
  });

  it("generates correct document requirements for KPR + KOMERSIL + TIDAK_TETAP (Wirausaha)", () => {
    const result = getRequiredDocuments({
      metode: "KPR",
      kategori: "KOMERSIL",
      statusPernikahan: "BELUM_MENIKAH",
      statusPekerjaan: "TIDAK_TETAP",
    });

    expect(result.isProfileComplete).toBe(true);
    if (result.isProfileComplete) {
      const requiredKeys = result.documents.filter((d) => d.required).map((d) => d.key);

      expect(requiredKeys).toContain("SURAT_PERNYATAAN_BELUM_MENIKAH");
      expect(requiredKeys).toContain("SKU_WIRAUSAHA");
      expect(requiredKeys).toContain("REKENING_KORAN");
      expect(requiredKeys).toContain("LAPORAN_KEUANGAN"); // Komersil requires financial statement
      expect(requiredKeys).not.toContain("SLIP_GAJI");
    }
  });

  it("excludes income documents for Cash methods", () => {
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
    }
  });

  it("safely accepts legacy KTP_SUAMI_ISTRI for KTP_PEMOHON verification", () => {
    const legacyVerifiedDocs = ["KTP_SUAMI_ISTRI", "KARTU_KELUARGA"];

    // Should be recognized as verified for KTP_PEMOHON without re-blocking
    expect(isDokumenTerverifikasi("KTP_PEMOHON", legacyVerifiedDocs)).toBe(true);
    expect(isDokumenTerverifikasi("KARTU_KELUARGA", legacyVerifiedDocs)).toBe(true);
    expect(isDokumenTerverifikasi("NPWP", legacyVerifiedDocs)).toBe(false);
  });
});
