// tests/unit/document-checklist-kpr.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRequiredDocuments,
  isDokumenTerverifikasi,
} from "@/lib/transaksi/document-rules";

const { mockTx, mockPrisma, mockAuth } = vi.hoisted(() => {
  const tx = {
    transaksi: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pengajuanKPR: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    pengajuanKPRLog: {
      create: vi.fn(),
    },
    transaksiTahapLog: {
      create: vi.fn(),
    },
    dokumenTransaksi: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    bank: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
    aktivitas: {
      create: vi.fn(),
    },
  };

  const prismaObj = {
    $transaction: vi.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
    user: {
      findUnique: vi.fn(),
    },
    transaksi: {
      findUnique: vi.fn(),
    },
    dokumenTransaksi: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    activityLog: {
      create: vi.fn(),
    },
  };

  const authFn = vi.fn().mockResolvedValue({
    user: {
      id: "1",
      role: "ADMIN",
      nama: "Admin Tester",
    },
  });

  return { mockTx: tx, mockPrisma: prismaObj, mockAuth: authFn };
});

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// Import actions after vi.mock
import { ajukanKPR } from "@/actions/kpr.action";
import { verifyDokumenTransaksi } from "@/actions/transaksi.action";

describe("KPR Document Checklist & Stage Independence Rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "1",
        role: "ADMIN",
        nama: "Admin Tester",
      },
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      role: "ADMIN",
      isActive: true,
      nama: "Admin Tester",
    });
    mockPrisma.transaksi.findUnique.mockImplementation(async ({ where }: { where: { id: number } }) => ({
      id: where.id,
      pic_id: 1,
    }));
  });

  describe("1. Document Rule Evaluation: blockingRequiredDocs vs bisaMenyusul (FPPA)", () => {
    it("Scenario 1: Incomplete mandatory non-bisaMenyusul documents must block allRequiredVerified", () => {
      const evaluation = getRequiredDocuments({
        metode: "KPR",
        kategori: "KOMERSIL",
        statusPernikahan: "MENIKAH",
        statusPekerjaan: "TETAP",
      });

      expect(evaluation.isProfileComplete).toBe(true);

      const blockingRequiredDocs = evaluation.documents.filter((d) => d.required && !d.bisaMenyusul);

      // FPPA is required, but marked bisaMenyusul
      const fppa = evaluation.documents.find((d) => d.key === "FORM_FPPA");
      expect(fppa?.required).toBe(true);
      expect(fppa?.bisaMenyusul).toBe(true);
      expect(blockingRequiredDocs.some((d) => d.key === "FORM_FPPA")).toBe(false);

      // When mandatory doc (e.g. SLIP_GAJI) is missing
      const verifiedDocs = ["FORM_APLIKASI_KPR", "KTP_SUAMI_ISTRI", "KARTU_KELUARGA", "NPWP"];
      const allRequiredVerified =
        evaluation.isProfileComplete &&
        blockingRequiredDocs.every((doc) => isDokumenTerverifikasi(doc.key, verifiedDocs));

      expect(allRequiredVerified).toBe(false);
    });

    it("Scenario 2: When all blockingRequiredDocs are verified, allRequiredVerified is true even if FPPA is missing", () => {
      const evaluation = getRequiredDocuments({
        metode: "KPR",
        kategori: "KOMERSIL",
        statusPernikahan: "MENIKAH",
        statusPekerjaan: "TETAP",
      });

      const blockingRequiredDocs = evaluation.documents.filter((d) => d.required && !d.bisaMenyusul);

      // Verify ALL blocking docs, leaving FORM_FPPA unverified
      const verifiedDocs = blockingRequiredDocs.map((d) => d.key);
      expect(verifiedDocs).not.toContain("FORM_FPPA");

      const allRequiredVerified =
        evaluation.isProfileComplete &&
        blockingRequiredDocs.every((doc) => isDokumenTerverifikasi(doc.key, verifiedDocs));

      expect(allRequiredVerified).toBe(true);
    });
  });

  describe("2. Initial Bank Submission & Stage Advancement (ajukanKPR)", () => {
    it("Scenario 1 (Backend): ajukanKPR in PENGUMPULAN_DOKUMEN rejects if mandatory doc is missing", async () => {
      mockTx.transaksi.findUnique.mockResolvedValue({
        id: 101,
        tahap_detail: "PENGUMPULAN_DOKUMEN",
        metode_bayar: "KPR",
        customer: {
          status_pernikahan: "MENIKAH",
          status_pekerjaan: "TETAP",
        },
        unit: {
          blok: "A-01",
          tipe: { kategori: "KOMERSIL" },
        },
        dokumen: [
          { jenis: "KTP_SUAMI_ISTRI", status: "LENGKAP" },
          // Missing SLIP_GAJI, FORM_APLIKASI_KPR, etc.
        ],
        itj: { lead_id: 1 },
        pengajuan_kpr: [],
      });

      const res = await ajukanKPR({
        transaksiId: 101,
        bankId: 1,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Dokumen pemberkasan wajib");
      expect(res.error).toContain("belum lengkap");
    });

    it("Scenario 2 & 3 (Backend): ajukanKPR in PENGUMPULAN_DOKUMEN succeeds when only FPPA is missing, and advances stage to PROSES_BANK", async () => {
      const evaluation = getRequiredDocuments({
        metode: "KPR",
        kategori: "KOMERSIL",
        statusPernikahan: "MENIKAH",
        statusPekerjaan: "TETAP",
      });
      const blockingRequiredDocs = evaluation.documents.filter((d) => d.required && !d.bisaMenyusul);

      // All blocking required docs are complete, FPPA is NOT included
      const completedDocs = blockingRequiredDocs.map((d) => ({
        jenis: d.key,
        status: "LENGKAP",
      }));

      mockTx.transaksi.findUnique.mockResolvedValue({
        id: 102,
        tahap_detail: "PENGUMPULAN_DOKUMEN",
        metode_bayar: "KPR",
        customer: {
          status_pernikahan: "MENIKAH",
          status_pekerjaan: "TETAP",
        },
        unit: {
          blok: "A-02",
          tipe: { kategori: "KOMERSIL" },
        },
        dokumen: completedDocs,
        itj: { lead_id: 2 },
        pengajuan_kpr: [],
      });

      mockTx.bank.findUnique.mockResolvedValue({
        id: 1,
        nama: "Bank BTN",
        is_active: true,
      });

      mockTx.pengajuanKPR.findMany.mockResolvedValue([]);
      mockTx.pengajuanKPR.create.mockResolvedValue({
        id: 1,
        nomor_pengajuan: 1,
        bank: { nama: "Bank BTN" },
      });
      mockTx.user.findUnique.mockResolvedValue({
        id: 1,
        nama: "Admin Tester",
      });

      const res = await ajukanKPR({
        transaksiId: 102,
        bankId: 1,
      });

      expect(res.success).toBe(true);

      // Verify transaction moved to PROSES_BANK
      expect(mockTx.transaksi.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 102 },
          data: expect.objectContaining({
            tahap_detail: "PROSES_BANK",
          }),
        })
      );
    });

    it("Scenario 7 (Backend): ajukanKPR in PROSES_BANK allows parallel submission to other banks without document gating", async () => {
      mockTx.transaksi.findUnique.mockResolvedValue({
        id: 103,
        tahap_detail: "PROSES_BANK", // Already in PROSES_BANK
        metode_bayar: "KPR",
        customer: {
          status_pernikahan: "MENIKAH",
          status_pekerjaan: "TETAP",
        },
        unit: {
          blok: "A-03",
          tipe: { kategori: "KOMERSIL" },
        },
        // Even if some docs are empty/missing
        dokumen: [],
        itj: { lead_id: 3 },
        pengajuan_kpr: [{ id: 1, bank_id: 1, status: "DIAJUKAN" }],
      });

      mockTx.bank.findUnique.mockResolvedValue({
        id: 2,
        nama: "Bank Mandiri",
        is_active: true,
      });

      mockTx.pengajuanKPR.findFirst.mockResolvedValue({
        id: 1,
        bank_id: 1,
        nomor_pengajuan: 1,
        status: "DIAJUKAN",
      });
      mockTx.pengajuanKPR.create.mockResolvedValue({
        id: 2,
        nomor_pengajuan: 2,
        bank: { nama: "Bank Mandiri" },
      });
      mockTx.user.findUnique.mockResolvedValue({
        id: 1,
        nama: "Admin Tester",
      });

      const res = await ajukanKPR({
        transaksiId: 103,
        bankId: 2,
      });

      expect(res.success).toBe(true);
      expect(mockTx.pengajuanKPR.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bank_id: 2,
            nomor_pengajuan: 2,
          }),
        })
      );
      // Stage was already PROSES_BANK, so update shouldn't re-transition stage
      expect(mockTx.transaksi.update).not.toHaveBeenCalled();
    });
  });

  describe("3. Document Verification in PROSES_BANK (verifyDokumenTransaksi)", () => {
    it("Scenario 5 & 6: Can verify/unverify documents in PROSES_BANK without changing transaction stage or KPR status", async () => {
      mockTx.transaksi.findUnique.mockResolvedValue({
        id: 201,
        tahap_detail: "PROSES_BANK",
        unit: { blok: "B-05" },
        itj: { lead_id: 5 },
      });

      mockTx.dokumenTransaksi.findUnique.mockResolvedValue(null);
      mockTx.dokumenTransaksi.upsert.mockResolvedValue({
        id: 1,
        transaksi_id: 201,
        jenis: "FORM_FPPA",
        status: "LENGKAP",
      });
      mockTx.user.findUnique.mockResolvedValue({
        id: 1,
        nama: "Admin Tester",
      });

      const res = await verifyDokumenTransaksi({
        transaksiId: 201,
        jenis: "FORM_FPPA",
        status: "LENGKAP",
      });

      expect(res.success).toBe(true);

      // Verified document upserted
      expect(mockTx.dokumenTransaksi.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            transaksi_id_jenis: {
              transaksi_id: 201,
              jenis: "FORM_FPPA",
            },
          },
          update: { status: "LENGKAP" },
        })
      );

      // Activity log recorded
      expect(mockTx.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entity_type: "DOKUMEN",
            action: "DOC_CHECKED",
            tahap_detail: "PROSES_BANK",
          }),
        })
      );

      // Verify that Transaksi stage and PengajuanKPR records were NEVER modified
      expect(mockTx.transaksi.update).not.toHaveBeenCalled();
      expect(mockTx.pengajuanKPR.update).not.toHaveBeenCalled();
    });
  });

  describe("4. Preserving Document State Across Reloads and Bank Updates", () => {
    it("Scenario 9: Initial verified documents accurately reflect saved DokumenTransaksi on reload", () => {
      const savedTransaksi = {
        id: 301,
        tahap_detail: "PROSES_BANK",
        dokumen: [
          { jenis: "KTP_SUAMI_ISTRI", status: "LENGKAP" },
          { jenis: "FORM_FPPA", status: "LENGKAP" },
          { jenis: "NPWP", status: "BELUM_LENGKAP" },
        ],
      };

      const initialVerifiedDocs = savedTransaksi.dokumen
        .filter((d) => d.status === "LENGKAP")
        .map((d) => d.jenis);

      expect(initialVerifiedDocs).toContain("KTP_SUAMI_ISTRI");
      expect(initialVerifiedDocs).toContain("FORM_FPPA");
      expect(initialVerifiedDocs).not.toContain("NPWP");

      expect(isDokumenTerverifikasi("KTP_SUAMI_ISTRI", initialVerifiedDocs)).toBe(true);
      expect(isDokumenTerverifikasi("FORM_FPPA", initialVerifiedDocs)).toBe(true);
      expect(isDokumenTerverifikasi("NPWP", initialVerifiedDocs)).toBe(false);
    });
  });
});
