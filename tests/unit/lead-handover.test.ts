// tests/unit/lead-handover.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn().mockResolvedValue({
  user: {
    id: "10",
    role: "MARKETING",
  },
});

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockTx = {
  lead: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  transaksi: {
    updateMany: vi.fn(),
  },
  aktivitas: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
    user: {
      findMany: vi.fn(),
    },
  },
}));

import { handoverLead, getEligiblePICs, type EligiblePIC } from "@/actions/lead-handover.action";
import { prisma } from "@/lib/prisma";

describe("actions/lead-handover.action.ts - Oper PIC / Handover Mechanism", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "10",
        role: "MARKETING",
      },
    });
  });

  describe("getEligiblePICs()", () => {
    it("fetches active marketing and admin personnel", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: 1, nama: "Admin Pusat", role: "ADMIN", no_hp: "08123456789" },
        { id: 10, nama: "Marketing Alpha", role: "MARKETING", no_hp: "08123456780" },
        { id: 11, nama: "Marketing Beta", role: "MARKETING", no_hp: "08123456781" },
      ] as unknown as Awaited<ReturnType<typeof prisma.user.findMany>>);

      const res = await getEligiblePICs();
      expect(res.success).toBe(true);
      expect(res.data?.length).toBe(3);
      expect(res.data?.[1].nama).toBe("Marketing Alpha");
    });
  });

  describe("handoverLead()", () => {
    it("allows current PIC to handover lead, updates active transactions, and logs Aktivitas", async () => {
      mockTx.lead.findUnique.mockResolvedValue({
        id: 100,
        marketing_id: 10,
        marketing: { id: 10, nama: "Marketing Alpha" },
        itj: [{ id: 1 }],
      });

      mockTx.user.findUnique.mockResolvedValue({
        id: 11,
        nama: "Marketing Beta",
        role: "MARKETING",
      });

      mockTx.lead.update.mockResolvedValue({ id: 100, marketing_id: 11 });
      mockTx.transaksi.updateMany.mockResolvedValue({ count: 1 });
      mockTx.aktivitas.create.mockResolvedValue({ id: 999 });

      const res = await handoverLead(100, 11, "Konsumen minta survei ulang hari Sabtu");

      expect(res.success).toBe(true);
      expect(res.message).toContain("Marketing Beta");

      // Verify Lead.marketing_id was updated to newMarketingId
      expect(mockTx.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 100 },
          data: expect.objectContaining({ marketing_id: 11 }),
        })
      );

      // Verify Transaksi.marketing_id was updated to newMarketingId
      expect(mockTx.transaksi.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            itj: { lead_id: 100 },
            status_transaksi: { not: "BATAL" },
          },
          data: { marketing_id: 11 },
        })
      );

      // Verify Aktivitas log creation
      expect(mockTx.aktivitas.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lead_id: 100,
            user_id: 10,
            jenis: "LAINNYA",
            catatan: expect.stringContaining("Marketing Beta"),
          }),
        })
      );
    });

    it("allows ADMIN to handover a lead even if not current PIC", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "99",
          role: "ADMIN",
        },
      });

      mockTx.lead.findUnique.mockResolvedValue({
        id: 100,
        marketing_id: 10,
        marketing: { id: 10, nama: "Marketing Alpha" },
        itj: [],
      });

      mockTx.user.findUnique.mockResolvedValue({
        id: 12,
        nama: "Marketing Gamma",
        role: "MARKETING",
      });

      mockTx.lead.update.mockResolvedValue({ id: 100, marketing_id: 12 });
      mockTx.transaksi.updateMany.mockResolvedValue({ count: 0 });
      mockTx.aktivitas.create.mockResolvedValue({ id: 1000 });

      const res = await handoverLead(100, 12, "Penugasan ulang oleh Admin");

      expect(res.success).toBe(true);
      expect(mockTx.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 100 },
          data: expect.objectContaining({ marketing_id: 12 }),
        })
      );
    });

    it("allows MANAGER to handover a lead even if not current PIC", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "99",
          role: "MANAGER",
        },
      });

      mockTx.lead.findUnique.mockResolvedValue({
        id: 100,
        marketing_id: 10,
        marketing: { id: 10, nama: "Marketing Alpha" },
        itj: [],
      });

      mockTx.user.findUnique.mockResolvedValue({
        id: 12,
        nama: "Marketing Gamma",
        role: "MARKETING",
      });

      mockTx.lead.update.mockResolvedValue({ id: 100, marketing_id: 12 });
      mockTx.transaksi.updateMany.mockResolvedValue({ count: 0 });
      mockTx.aktivitas.create.mockResolvedValue({ id: 1001 });

      const res = await handoverLead(100, 12, "Penugasan ulang oleh Manager");

      expect(res.success).toBe(true);
      expect(mockTx.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 100 },
          data: expect.objectContaining({ marketing_id: 12 }),
        })
      );
    });

    it("rejects handover if non-PIC marketing user attempts it", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "88",
          role: "MARKETING",
        },
      });

      mockTx.lead.findUnique.mockResolvedValue({
        id: 100,
        marketing_id: 10,
        marketing: { id: 10, nama: "Marketing Alpha" },
        itj: [],
      });

      const res = await handoverLead(100, 11, "Coba alihkan");

      expect(res.success).toBe(false);
      expect(res.error).toContain("Anda tidak memiliki izin");
      expect(mockTx.lead.update).not.toHaveBeenCalled();
    });

    it("rejects handover if target user is same as current PIC", async () => {
      mockTx.lead.findUnique.mockResolvedValue({
        id: 100,
        marketing_id: 10,
        marketing: { id: 10, nama: "Marketing Alpha" },
        itj: [],
      });

      mockTx.user.findUnique.mockResolvedValue({
        id: 10,
        nama: "Marketing Alpha",
        role: "MARKETING",
      });

      const res = await handoverLead(100, 10);

      expect(res.success).toBe(false);
      expect(res.error).toContain("sudah ditugaskan");
      expect(mockTx.lead.update).not.toHaveBeenCalled();
    });
  });
});
