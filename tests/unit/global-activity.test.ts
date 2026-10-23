// tests/unit/global-activity.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn().mockResolvedValue({
    user: {
      id: "99",
      role: "MANAGER",
    },
  }),
  mockPrisma: {
    aktivitas: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { getGlobalActivities, getActivityActors } from "@/actions/activity";

describe("actions/activity.ts - Global Activity Audit for Manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getGlobalActivities() - RBAC Enforcement", () => {
    it("rejects unauthenticated user", async () => {
      mockAuth.mockResolvedValueOnce(null);

      const res = await getGlobalActivities();
      expect(res.success).toBe(false);
      expect(res.error).toContain("Silakan login kembali");
      expect(mockPrisma.aktivitas.findMany).not.toHaveBeenCalled();
    });

    it("rejects non-Manager / non-Admin users (e.g. MARKETING)", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "10", role: "MARKETING" },
      });

      const res = await getGlobalActivities();
      expect(res.success).toBe(false);
      expect(res.error).toContain("Unauthorized");
      expect(mockPrisma.aktivitas.findMany).not.toHaveBeenCalled();
    });

    it("allows MANAGER role to fetch global activities with actor and lead relations", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "99", role: "MANAGER" },
      });

      const sampleData = [
        {
          id: 1,
          lead_id: 10,
          user_id: 20,
          jenis: "WHATSAPP",
          hasil: "TERTARIK",
          catatan: "Konsumen tertarik tipe 36",
          tgl_follow_up: new Date("2026-10-25T10:00:00Z"),
          created_at: new Date("2026-10-23T08:00:00Z"),
          user: { id: 20, nama: "Budi Marketing", role: "MARKETING" },
          lead: { id: 10, nama: "Bpk Agus", no_hp: "08123456789", marketing_id: 20 },
        },
      ];

      mockPrisma.aktivitas.findMany.mockResolvedValueOnce(sampleData);

      const res = await getGlobalActivities();
      expect(res.success).toBe(true);
      expect(res.data).toEqual(sampleData);
      expect(mockPrisma.aktivitas.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            user: { select: { id: true, nama: true, role: true } },
            lead: { select: { id: true, nama: true, no_hp: true, marketing_id: true } },
          },
          orderBy: { created_at: "desc" },
        })
      );
    });

    it("allows ADMIN role to fetch global activities", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "1", role: "ADMIN" },
      });

      mockPrisma.aktivitas.findMany.mockResolvedValueOnce([]);

      const res = await getGlobalActivities();
      expect(res.success).toBe(true);
      expect(mockPrisma.aktivitas.findMany).toHaveBeenCalled();
    });
  });

  describe("getGlobalActivities() - Filter Support", () => {
    it("correctly constructs where clauses for userId and jenis", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "99", role: "MANAGER" },
      });

      mockPrisma.aktivitas.findMany.mockResolvedValueOnce([]);

      await getGlobalActivities({
        userId: 15,
        jenis: "TELEPON",
      });

      expect(mockPrisma.aktivitas.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 15,
            jenis: "TELEPON",
          }),
        })
      );
    });

    it("correctly constructs date range where clauses for startDate and endDate", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "99", role: "MANAGER" },
      });

      mockPrisma.aktivitas.findMany.mockResolvedValueOnce([]);

      await getGlobalActivities({
        startDate: "2026-10-01",
        endDate: "2026-10-23",
      });

      expect(mockPrisma.aktivitas.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            created_at: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  describe("getActivityActors()", () => {
    it("returns active users ordered by role and name", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "99", role: "MANAGER" },
      });

      const sampleUsers = [
        { id: 1, nama: "Admin One", role: "ADMIN" },
        { id: 2, nama: "Marketing Alpha", role: "MARKETING" },
      ];

      mockPrisma.user.findMany.mockResolvedValueOnce(sampleUsers);

      const res = await getActivityActors();
      expect(res.success).toBe(true);
      expect(res.data).toEqual(sampleUsers);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          select: { id: true, nama: true, role: true },
          orderBy: [{ role: "asc" }, { nama: "asc" }],
        })
      );
    });
  });
});
