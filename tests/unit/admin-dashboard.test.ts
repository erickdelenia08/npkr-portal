import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAdminDashboardData } from "@/actions/dashboard.admin.action";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    itj: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    dokumenTransaksi: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    pengajuanKPR: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("Admin Dashboard Server Action Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject unauthenticated request", async () => {
    vi.mocked(auth).mockResolvedValue(null as unknown as ReturnType<typeof auth>);

    const res = await getAdminDashboardData();
    expect(res.success).toBe(false);
    expect(res.message).toContain("Akses ditolak");
  });

  it("should reject unauthorized roles like MARKETING", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "5", name: "Marketing User", role: "MARKETING" },
    } as unknown as ReturnType<typeof auth>);

    const res = await getAdminDashboardData();
    expect(res.success).toBe(false);
    expect(res.message).toContain("Hanya Admin dan Manager");
  });

  it("should return metrics and mini-table widgets for ADMIN user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "1", name: "Admin Utama", role: "ADMIN" },
    } as unknown as ReturnType<typeof auth>);

    // Mock Metric counts
    vi.mocked(prisma.itj.count).mockResolvedValue(4);
    vi.mocked(prisma.dokumenTransaksi.count).mockResolvedValue(9);
    vi.mocked(prisma.pengajuanKPR.count).mockResolvedValue(3);

    // Mock Widget 1: Pending ITJ
    vi.mocked(prisma.itj.findMany).mockResolvedValue([
      {
        id: 10,
        nama_ktp: "Budi Santoso",
        nominal: 5000000,
        diajukan_at: new Date("2026-10-18T10:00:00Z"),
        lead: { nama: "Budi Santoso", no_hp: "08123456789" },
        unit: { blok: "F-1" },
      },
    ] as never);

    // Mock Widget 2: Pending Docs
    vi.mocked(prisma.dokumenTransaksi.findMany).mockResolvedValue([
      {
        id: 20,
        transaksi_id: 100,
        jenis: "KTP_SUAMI_ISTRI",
        updated_at: new Date("2026-10-18T11:00:00Z"),
        transaksi: {
          id: 100,
          customer: { nama_ktp: "Ani Rahayu" },
          unit: { blok: "F-2" },
        },
      },
    ] as never);

    // Mock Widget 3: Active KPR
    vi.mocked(prisma.pengajuanKPR.findMany).mockResolvedValue([
      {
        id: 30,
        transaksi_id: 101,
        nomor_pengajuan: 1,
        status: "WAWANCARA",
        updated_at: new Date("2026-10-18T12:00:00Z"),
        bank: { nama: "Bank BTN" },
        transaksi: {
          id: 101,
          customer: { nama_ktp: "Joko Widodo" },
          unit: { blok: "A-5" },
        },
      },
    ] as never);

    const res = await getAdminDashboardData();

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();

    // Verify 3 Metrics
    expect(res.data?.metrics.pendingItjCount).toBe(4);
    expect(res.data?.metrics.pendingDocsCount).toBe(9);
    expect(res.data?.metrics.activeKprCount).toBe(3);

    // Verify Widget 1 (Pending ITJ)
    expect(res.data?.widgets.pendingItj.length).toBe(1);
    expect(res.data?.widgets.pendingItj[0].leadNama).toBe("Budi Santoso");
    expect(res.data?.widgets.pendingItj[0].unitBlok).toBe("F-1");
    expect(res.data?.widgets.pendingItj[0].nominal).toBe(5000000);

    // Verify Widget 2 (Pending Docs)
    expect(res.data?.widgets.pendingDocs.length).toBe(1);
    expect(res.data?.widgets.pendingDocs[0].customerNama).toBe("Ani Rahayu");
    expect(res.data?.widgets.pendingDocs[0].jenisLabel).toBe("KTP Suami / Istri");
    expect(res.data?.widgets.pendingDocs[0].transaksiId).toBe(100);

    // Verify Widget 3 (Active KPR)
    expect(res.data?.widgets.activeKpr.length).toBe(1);
    expect(res.data?.widgets.activeKpr[0].bankNama).toBe("Bank BTN");
    expect(res.data?.widgets.activeKpr[0].customerNama).toBe("Joko Widodo");
    expect(res.data?.widgets.activeKpr[0].status).toBe("WAWANCARA");
  });
});
