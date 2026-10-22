import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMarketingDashboardData } from "@/actions/dashboard.action";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { todayWIB, monthRangeWIB } from "@/lib/date/wib";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    lead: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    transaksi: {
      count: vi.fn(),
    },
  },
}));

describe("Marketing Dashboard Server Action Tests", () => {
  const mockMarketingUser = {
    id: 10,
    nama: "Budi Marketing",
    role: "MARKETING",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject unauthenticated request", async () => {
    vi.mocked(auth).mockResolvedValue(null as unknown as ReturnType<typeof auth>);

    const res = await getMarketingDashboardData();
    expect(res.success).toBe(false);
    expect(res.message).toContain("Akses ditolak");
  });

  it("should calculate metrics for current month properly", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "10", name: "Budi Marketing", role: "MARKETING" },
    } as unknown as ReturnType<typeof auth>);

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockMarketingUser as never);
    vi.mocked(prisma.lead.count)
      .mockResolvedValueOnce(12) // new leads
      .mockResolvedValueOnce(5); // surveys
    vi.mocked(prisma.transaksi.count).mockResolvedValueOnce(3); // closings
    vi.mocked(prisma.lead.findMany).mockResolvedValue([] as never);

    const res = await getMarketingDashboardData();

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.metrics.newLeadsThisMonth).toBe(12);
    expect(res.data?.metrics.surveysThisMonth).toBe(5);
    expect(res.data?.metrics.closingsThisMonth).toBe(3);
  });

  it("should categorize active leads into appropriate task buckets", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "10", name: "Budi Marketing", role: "MARKETING" },
    } as unknown as ReturnType<typeof auth>);

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockMarketingUser as never);
    vi.mocked(prisma.lead.count).mockResolvedValue(0);
    vi.mocked(prisma.transaksi.count).mockResolvedValue(0);

    const todayStr = todayWIB();
    const yesterday = new Date(`${todayStr}T00:00:00+07:00`);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayNoon = new Date(`${todayStr}T12:00:00+07:00`);
    const tomorrow = new Date(`${todayStr}T10:00:00+07:00`);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Mock active leads representing 4 categories
    const mockLeads = [
      // 1. ITJ Action Needed (Perlu Revisi)
      {
        id: 1,
        nama: "Customer A",
        no_hp: "08123456789",
        minat_tipe: "36/60",
        next_follow_up_at: null,
        survei_jadwal_at: null,
        survei_selesai_at: null,
        itj: [
          {
            id: 101,
            status: "PERLU_REVISI",
            diajukan_at: new Date(),
            diputuskan_at: new Date(),
            updated_at: new Date(),
            unit: { blok: "F-11" },
            reviews: [{ catatan: "KTP buram, mohon upload ulang" }],
          },
        ],
        aktivitas: [],
      },
      // 2. Overdue Follow-up
      {
        id: 2,
        nama: "Customer B",
        no_hp: "08129876543",
        minat_tipe: "Komersil",
        next_follow_up_at: yesterday,
        survei_jadwal_at: null,
        survei_selesai_at: null,
        itj: [],
        aktivitas: [{ catatan: "Minta info skema cicilan" }],
      },
      // 3. Today's Follow-up
      {
        id: 3,
        nama: "Customer C",
        no_hp: "08134567890",
        minat_tipe: "36/60",
        next_follow_up_at: todayNoon,
        survei_jadwal_at: null,
        survei_selesai_at: null,
        itj: [],
        aktivitas: [{ catatan: "Janji telepon jam makan siang" }],
      },
      // 4. Upcoming Survey
      {
        id: 4,
        nama: "Customer D",
        no_hp: "08156789012",
        minat_tipe: "Kavling",
        next_follow_up_at: null,
        survei_jadwal_at: tomorrow,
        survei_selesai_at: null,
        itj: [],
        aktivitas: [],
      },
    ];

    vi.mocked(prisma.lead.findMany).mockResolvedValue(mockLeads as never);

    const res = await getMarketingDashboardData();

    expect(res.success).toBe(true);
    expect(res.data?.tasks.itjActionNeeded.length).toBe(1);
    expect(res.data?.tasks.itjActionNeeded[0].nama).toBe("Customer A");
    expect(res.data?.tasks.itjActionNeeded[0].unitBlok).toBe("F-11");
    expect(res.data?.tasks.itjActionNeeded[0].badgeText).toBe("PERLU REVISI");

    expect(res.data?.tasks.overdueFollowUps.length).toBe(1);
    expect(res.data?.tasks.overdueFollowUps[0].nama).toBe("Customer B");
    expect(res.data?.tasks.overdueFollowUps[0].badgeText).toBe("TERLEWAT");

    expect(res.data?.tasks.todayFollowUps.length).toBe(1);
    expect(res.data?.tasks.todayFollowUps[0].nama).toBe("Customer C");
    expect(res.data?.tasks.todayFollowUps[0].badgeText).toBe("HARI INI");

    expect(res.data?.tasks.upcomingSurveys.length).toBe(1);
    expect(res.data?.tasks.upcomingSurveys[0].nama).toBe("Customer D");
    expect(res.data?.tasks.upcomingSurveys[0].badgeText).toBe("JADWAL SURVEI");

    expect(res.data?.tasks.totalTasks).toBe(4);
  });
});
