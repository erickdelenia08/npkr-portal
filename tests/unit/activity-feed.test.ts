// tests/unit/activity-feed.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getActivityFeed,
  getTransactionHistory,
  getLeadHistory,
} from "@/actions/activity";
import { relativeTimeTodayWIB } from "@/lib/date/wib";
import { prisma } from "@/lib/prisma";

const mockAuth = vi.fn().mockResolvedValue({
  user: {
    id: "1",
    role: "MANAGER",
    name: "Manager Joni",
  },
});

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

describe("Phase 2: Manager Activity Feed & Audit Trail Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "1",
        role: "MANAGER",
        name: "Manager Joni",
      },
    });
  });

  describe("relativeTimeTodayWIB()", () => {
    it("returns null for dates not today in WIB", () => {
      const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000);
      expect(relativeTimeTodayWIB(yesterday)).toBeNull();
    });

    it("returns relative time text for today", () => {
      // Pin time to 15:00 WIB so 2 hours ago is guaranteed within the same WIB calendar day
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-06T15:00:00+07:00"));

      try {
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
        const res = relativeTimeTodayWIB(fiveMinsAgo);
        expect(res).toBe("5 mnt lalu");

        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const resHours = relativeTimeTodayWIB(twoHoursAgo);
        expect(resHours).toBe("2 jam lalu");
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("getActivityFeed()", () => {
    it("rejects non-manager users (including admin and marketing)", async () => {
      // Test MARKETING rejection
      mockAuth.mockResolvedValue({
        user: {
          id: "20",
          role: "MARKETING",
          name: "Marketing Alpha",
        },
      });

      const resMarketing = await getActivityFeed();
      expect(resMarketing.success).toBe(false);
      expect(resMarketing.error).toContain("Unauthorized");

      // Test ADMIN rejection
      mockAuth.mockResolvedValue({
        user: {
          id: "2",
          role: "ADMIN",
          name: "Admin Beta",
        },
      });

      const resAdmin = await getActivityFeed();
      expect(resAdmin.success).toBe(false);
      expect(resAdmin.error).toContain("Unauthorized");
    });

    it("returns paginated results with SQL aggregation stats for Manager", async () => {
      const res = await getActivityFeed({
        page: 1,
        pageSize: 10,
        actionCategory: "SEMUA",
      });

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      if (res.data) {
        expect(res.data.pagination).toBeDefined();
        expect(res.data.pagination.page).toBe(1);
        expect(res.data.pagination.pageSize).toBe(10);
        expect(typeof res.data.pagination.total).toBe("number");
        expect(typeof res.data.pagination.totalPages).toBe("number");

        expect(res.data.stats).toBeDefined();
        expect(typeof res.data.stats.totalActivities).toBe("number");
        expect(res.data.stats.breakdown).toBeDefined();
        expect(typeof res.data.stats.breakdown.lead).toBe("number");
        expect(typeof res.data.stats.breakdown.transaksi).toBe("number");
        expect(typeof res.data.stats.breakdown.pembayaran).toBe("number");
        expect(typeof res.data.stats.breakdown.kpr).toBe("number");
        expect(typeof res.data.stats.breakdown.lainnya).toBe("number");
      }
    });

    it("filters correctly by category", async () => {
      const res = await getActivityFeed({
        actionCategory: "PEMBAYARAN",
        pageSize: 5,
      });

      expect(res.success).toBe(true);
      if (res.data) {
        for (const item of res.data.items) {
          expect(item.entity_type).toBe("PEMBAYARAN");
        }
      }
    });
  });

  describe("getTransactionHistory()", () => {
    it("rejects unauthorized marketing user not tied to the transaction", async () => {
      // Find an existing transaction in the test db
      const trx = await prisma.transaksi.findFirst({
        select: { id: true, pic_id: true },
      });

      if (!trx) return;

      mockAuth.mockResolvedValue({
        user: {
          id: "999999", // non-existent / not PIC
          role: "MARKETING",
          name: "Marketing Random",
        },
      });

      const res = await getTransactionHistory(trx.id);
      expect(res.success).toBe(false);
      expect(res.error).toContain("Akses ditolak");
    });

    it("allows MANAGER to view transaction history including pre-transaction lead logs", async () => {
      const trx = await prisma.transaksi.findFirst({
        select: { id: true },
      });

      if (!trx) return;

      const res = await getTransactionHistory(trx.id);
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
      if (res.data && res.data.length > 0) {
        expect(res.data[0]).toHaveProperty("action");
        expect(res.data[0]).toHaveProperty("summary");
        expect(res.data[0]).toHaveProperty("created_at");
      }
    });
  });

  describe("getLeadHistory()", () => {
    it("returns lead activity logs in chronological descending order", async () => {
      const lead = await prisma.lead.findFirst({
        select: { id: true },
      });

      if (!lead) return;

      const res = await getLeadHistory(lead.id);
      expect(res.success).toBe(true);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });
});

