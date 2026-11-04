// tests/unit/activity-log.test.ts

import { describe, it, expect } from "vitest";
import {
  ACTIVITY_ACTIONS,
  getCategoryForEntity,
  getCategoryForAction,
} from "@/lib/activity/actions";
import { buildActivitySummary } from "@/lib/activity/summary";
import { logActivity } from "@/lib/activity/log";
import { prisma } from "@/lib/prisma";

describe("Phase 1: Unified ActivityLog Engine & Privacy Tests", () => {
  it("covers all 29 required actions in ACTIVITY_ACTIONS", () => {
    expect(ACTIVITY_ACTIONS).toHaveLength(29);
    expect(ACTIVITY_ACTIONS).toContain("LEAD_CREATED");
    expect(ACTIVITY_ACTIONS).toContain("LEAD_HANDOVER");
    expect(ACTIVITY_ACTIONS).toContain("ITJ_SUBMITTED");
    expect(ACTIVITY_ACTIONS).toContain("STAGE_ADVANCED");
    expect(ACTIVITY_ACTIONS).toContain("STAGE_REVERTED");
    expect(ACTIVITY_ACTIONS).toContain("TRANSAKSI_CANCELLED");
    expect(ACTIVITY_ACTIONS).toContain("TRANSAKSI_HANDOVER");
    expect(ACTIVITY_ACTIONS).toContain("SCHEDULE_UPDATED");
    expect(ACTIVITY_ACTIONS).toContain("AKAD_CONFIRMED");
    expect(ACTIVITY_ACTIONS).toContain("BAST_CONFIRMED");
    expect(ACTIVITY_ACTIONS).toContain("PROFILE_UPDATED");
    expect(ACTIVITY_ACTIONS).toContain("DOC_CHECKED");
    expect(ACTIVITY_ACTIONS).toContain("DOC_UNCHECKED");
    expect(ACTIVITY_ACTIONS).toContain("BAST_ITEM_CHECKED");
    expect(ACTIVITY_ACTIONS).toContain("BAST_ITEM_UNCHECKED");
    expect(ACTIVITY_ACTIONS).toContain("PAYMENT_RECORDED");
    expect(ACTIVITY_ACTIONS).toContain("PAYMENT_VOIDED");
    expect(ACTIVITY_ACTIONS).toContain("KPR_SUBMITTED");
    expect(ACTIVITY_ACTIONS).toContain("KPR_STATUS_CHANGED");
    expect(ACTIVITY_ACTIONS).toContain("KPR_REJECTED");
    expect(ACTIVITY_ACTIONS).toContain("KPR_BANK_SELECTED");
    expect(ACTIVITY_ACTIONS).toContain("UNIT_TYPE_CHANGED");
  });

  it("maps categories correctly for entity and action", () => {
    expect(getCategoryForEntity("LEAD")).toBe("LEAD");
    expect(getCategoryForEntity("TRANSAKSI")).toBe("TRANSAKSI");
    expect(getCategoryForEntity("UNIT")).toBe("TRANSAKSI");
    expect(getCategoryForEntity("PEMBAYARAN")).toBe("KEUANGAN");
    expect(getCategoryForEntity("PENGAJUAN_KPR")).toBe("KEUANGAN");
    expect(getCategoryForEntity("DOKUMEN")).toBe("DOKUMEN");
    expect(getCategoryForEntity("BAST_ITEM")).toBe("DOKUMEN");

    expect(getCategoryForAction("LEAD_CREATED")).toBe("LEAD");
    expect(getCategoryForAction("PAYMENT_RECORDED")).toBe("KEUANGAN");
    expect(getCategoryForAction("KPR_SUBMITTED")).toBe("KEUANGAN");
    expect(getCategoryForAction("DOC_CHECKED")).toBe("DOKUMEN");
    expect(getCategoryForAction("BAST_ITEM_CHECKED")).toBe("DOKUMEN");
    expect(getCategoryForAction("STAGE_ADVANCED")).toBe("TRANSAKSI");
    expect(getCategoryForAction("SCHEDULE_UPDATED")).toBe("TRANSAKSI");
  });

  it("builds clean Indonesian summaries without PII", () => {
    const summary1 = buildActivitySummary("DOC_CHECKED", {
      actorName: "Rina",
      docLabel: "KTP Pemohon",
      blok: "A-01",
    });
    expect(summary1).toBe("Rina menandai dokumen KTP Pemohon lengkap untuk unit A-01");

    const summary2 = buildActivitySummary("SCHEDULE_UPDATED", {
      actorName: "Admin Budi",
      scheduleType: "rencana akad",
      oldDate: "25 Nov 2026",
      newDate: "2 Des 2026",
      blok: "B-05",
    });
    expect(summary2).toBe("Admin Budi mengubah rencana akad unit B-05 dari 25 Nov 2026 ke 2 Des 2026");

    const summary3 = buildActivitySummary("KPR_BANK_SELECTED", {
      bankName: "Bank BTN",
      cancelledCount: 2,
    });
    expect(summary3).toBe("Bank BTN dipilih sebagai bank pembiaya; 2 pengajuan lain dibatalkan");
  });

  it("sanitizes forbidden PII fields from before/after payloads in logActivity", async () => {
    await prisma.$transaction(async (tx) => {
      const log = await logActivity(tx, {
        entityType: "TRANSAKSI",
        entityId: 999999,
        action: "STAGE_ADVANCED",
        actorId: null,
        summary: "Uji Privasi",
        before: {
          tahap: "PENGUMPULAN_DOKUMEN",
          nik: "3508123456789012",
          alamat_ktp: "Jl. Rahasia No. 1",
          no_hp: "081234567890",
          password: "secretpassword",
        },
        after: {
          tahap: "PROSES_BANK",
          NIK: "3508123456789012",
          phone: "081234567890",
        },
      });

      const beforeObj = log.before as Record<string, unknown>;
      const afterObj = log.after as Record<string, unknown>;

      expect(beforeObj.tahap).toBe("PENGUMPULAN_DOKUMEN");
      expect(beforeObj.nik).toBeUndefined();
      expect(beforeObj.alamat_ktp).toBeUndefined();
      expect(beforeObj.no_hp).toBeUndefined();
      expect(beforeObj.password).toBeUndefined();

      expect(afterObj.tahap).toBe("PROSES_BANK");
      expect(afterObj.NIK).toBeUndefined();
      expect(afterObj.phone).toBeUndefined();

      // Rollback test by throwing an intentional error
      throw new Error("INTENTIONAL_ROLLBACK_TEST");
    }).catch((err) => {
      expect(err.message).toBe("INTENTIONAL_ROLLBACK_TEST");
    });
  });

  it("ensures transactional rollback: failed operation leaves NO ActivityLog rows", async () => {
    const countBefore = await prisma.activityLog.count();

    await prisma.$transaction(async (tx) => {
      await logActivity(tx, {
        entityType: "TRANSAKSI",
        entityId: 888888,
        action: "TRANSAKSI_CANCELLED",
        summary: "This log should rollback",
      });

      // Force error after logActivity call
      throw new Error("TRANSACTION_FAILED_AFTER_LOG");
    }).catch((err) => {
      expect(err.message).toBe("TRANSACTION_FAILED_AFTER_LOG");
    });

    const countAfter = await prisma.activityLog.count();
    expect(countAfter).toBe(countBefore);
  });
});
