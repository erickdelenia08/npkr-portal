// tests/unit/handover-separation.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn().mockResolvedValue({
  user: {
    id: "10",
    name: "Marketing Alpha",
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
  transaksi: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  itj: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  aktivitas: {
    create: vi.fn(),
  },
  activityLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    lead: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    transaksi: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { handoverLead } from "@/actions/lead-handover.action";
import { handoverTransaksi } from "@/actions/transaksi-handover.action";
import { reassignLead } from "@/actions/lead";

describe("Audit & Verifikasi Pemisahan Handover PIC Lead vs PIC Transaksi (10 Skenario Wajib)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "10",
        name: "Marketing Alpha",
        role: "MARKETING",
      },
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Skenario 1: Handover PIC Lead sebelum closing
  // ───────────────────────────────────────────────────────────────────────────
  it("Skenario 1: Handover PIC Lead sebelum closing -> Lead.marketing_id berubah, Transaksi tidak tersentuh", async () => {
    mockTx.lead.findUnique.mockResolvedValue({
      id: 101,
      nama: "Calon Pembeli 1",
      marketing_id: 10,
      marketing: { id: 10, nama: "Marketing Alpha" },
      itj: [], // belum ITJ / belum closing
    });

    mockTx.user.findUnique.mockResolvedValue({
      id: 20,
      nama: "Marketing Beta",
      role: "MARKETING",
      isActive: true,
    });

    mockTx.lead.update.mockResolvedValue({ id: 101, marketing_id: 20 });
    mockTx.aktivitas.create.mockResolvedValue({ id: 1 });
    mockTx.activityLog.create.mockResolvedValue({ id: 1 });

    const res = await handoverLead(101, 20, "Oper prospek ke tim 2");

    expect(res.success).toBe(true);
    expect(res.message).toContain("Marketing Beta");

    // Pastikan Lead.marketing_id di-update ke 20
    expect(mockTx.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 101 },
        data: expect.objectContaining({ marketing_id: 20 }),
      })
    );

    // Pastikan Transaksi TIDAK PERNAH disentuh
    expect(mockTx.transaksi.update).not.toHaveBeenCalled();
    expect(mockTx.transaksi.updateMany).not.toHaveBeenCalled();

    // Pastikan log Aktivitas & ActivityLog LEAD_HANDOVER tercatat
    expect(mockTx.aktivitas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lead_id: 101,
          catatan: expect.stringContaining("[HANDOVER PIC LEAD]"),
        }),
      })
    );
    expect(mockTx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "LEAD_HANDOVER",
          entity_type: "LEAD",
          entity_id: 101,
        }),
      })
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Skenario 2: Handover PIC Transaksi setelah closing
  // ───────────────────────────────────────────────────────────────────────────
  it("Skenario 2: Handover PIC Transaksi setelah closing -> Transaksi.pic_id berubah, Lead.marketing_id tidak berubah", async () => {
    // Current user is Admin
    mockAuth.mockResolvedValue({
      user: {
        id: "99",
        name: "Admin Office",
        role: "ADMIN",
      },
    });

    mockTx.transaksi.findUnique.mockResolvedValue({
      id: 501,
      pic_id: 10,
      tahap_detail: "PEMBERKASAN",
      status_transaksi: "PEMBERKASAN",
      tgl_bast: null,
      pic: { id: 10, nama: "Marketing Alpha" },
      unit: { id: 1, blok: "A1" },
      itj: {
        id: 301,
        lead_id: 101,
        closer_id: 10, // Closing oleh Alpha
        lead: { id: 101, nama: "Calon Pembeli 1", marketing_id: 10 },
      },
    });

    mockTx.user.findUnique.mockResolvedValue({
      id: 30,
      nama: "Admin Siti",
      role: "ADMIN",
      isActive: true,
    });

    mockTx.transaksi.update.mockResolvedValue({ id: 501, pic_id: 30 });
    mockTx.aktivitas.create.mockResolvedValue({ id: 2 });
    mockTx.activityLog.create.mockResolvedValue({ id: 2 });

    const res = await handoverTransaksi(501, 30, "Pemberkasan diserahkan ke Admin");

    expect(res.success).toBe(true);
    expect(res.message).toContain("Admin Siti");

    // Pastikan Transaksi.pic_id di-update ke 30
    expect(mockTx.transaksi.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 501 },
        data: expect.objectContaining({ pic_id: 30 }),
      })
    );

    // Pastikan Lead.marketing_id dan Itj.closer_id TIDAK PERNAH di-update
    expect(mockTx.lead.update).not.toHaveBeenCalled();
    expect(mockTx.itj.update).not.toHaveBeenCalled();

    // Pastikan ActivityLog tercatat sebagai TRANSAKSI_HANDOVER
    expect(mockTx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "TRANSAKSI_HANDOVER",
          entity_type: "TRANSAKSI",
          entity_id: 501,
        }),
      })
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Skenario 3: Lead dan Transaksi memiliki PIC yang berbeda
  // ───────────────────────────────────────────────────────────────────────────
  it("Skenario 3: Lead dan Transaksi memiliki PIC yang berbeda -> Berhasil beroperasi independen", async () => {
    // Current user is Transaksi PIC (Admin Siti, id: 30)
    mockAuth.mockResolvedValue({
      user: {
        id: "30",
        name: "Admin Siti",
        role: "ADMIN",
      },
    });

    // Trx kepunyaan PIC 30 (Admin Siti), tapi Lead milik PIC 10 (Marketing Alpha)
    mockTx.transaksi.findUnique.mockResolvedValue({
      id: 502,
      pic_id: 30,
      tahap_detail: "WAWANCARA",
      status_transaksi: "PROSES_KPR",
      tgl_bast: null,
      pic: { id: 30, nama: "Admin Siti" },
      unit: { id: 2, blok: "B2" },
      itj: {
        id: 302,
        lead_id: 102,
        closer_id: 10,
        lead: { id: 102, nama: "Konsumen B", marketing_id: 10 },
      },
    });

    mockTx.user.findUnique.mockResolvedValue({
      id: 40,
      nama: "Admin Joko",
      role: "ADMIN",
      isActive: true,
    });

    mockTx.transaksi.update.mockResolvedValue({ id: 502, pic_id: 40 });

    const res = await handoverTransaksi(502, 40, "Oper antrian KPR ke Joko");

    expect(res.success).toBe(true);
    expect(mockTx.transaksi.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 502 },
        data: expect.objectContaining({ pic_id: 40 }),
      })
    );
    // Lead tetap milik Marketing Alpha (tidak disentuh)
    expect(mockTx.lead.update).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Skenario 4: Handover berulang pada PIC Transaksi
  // ───────────────────────────────────────────────────────────────────────────
  it("Skenario 4: Handover berulang pada PIC Transaksi -> Transaksi.pic_id berubah berkali-kali, Lead.marketing_id tetap sama", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "99",
        name: "Manager Budi",
        role: "MANAGER",
      },
    });

    // Transaksi handover ke-1: Dari 10 -> 30
    mockTx.transaksi.findUnique.mockResolvedValueOnce({
      id: 503,
      pic_id: 10,
      tahap_detail: "PEMBERKASAN",
      status_transaksi: "PEMBERKASAN",
      tgl_bast: null,
      pic: { id: 10, nama: "Marketing Alpha" },
      unit: { id: 3, blok: "C3" },
      itj: {
        id: 303,
        lead_id: 103,
        closer_id: 10,
        lead: { id: 103, nama: "Konsumen C", marketing_id: 10 },
      },
    });
    mockTx.user.findUnique.mockResolvedValueOnce({
      id: 30,
      nama: "Admin Siti",
      role: "ADMIN",
      isActive: true,
    });
    await handoverTransaksi(503, 30);

    // Transaksi handover ke-2: Dari 30 -> 40
    mockTx.transaksi.findUnique.mockResolvedValueOnce({
      id: 503,
      pic_id: 30,
      tahap_detail: "PEMBERKASAN",
      status_transaksi: "PEMBERKASAN",
      tgl_bast: null,
      pic: { id: 30, nama: "Admin Siti" },
      unit: { id: 3, blok: "C3" },
      itj: {
        id: 303,
        lead_id: 103,
        closer_id: 10,
        lead: { id: 103, nama: "Konsumen C", marketing_id: 10 },
      },
    });
    mockTx.user.findUnique.mockResolvedValueOnce({
      id: 40,
      nama: "Admin Joko",
      role: "ADMIN",
      isActive: true,
    });
    const res2 = await handoverTransaksi(503, 40);

    expect(res2.success).toBe(true);
    expect(mockTx.transaksi.update).toHaveBeenCalledTimes(2);
    // Lead tidak pernah diubah
    expect(mockTx.lead.update).not.toHaveBeenCalled();
    expect(mockTx.itj.update).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Skenario 5: Handover berulang pada PIC Lead
  // ───────────────────────────────────────────────────────────────────────────
  it("Skenario 5: Handover berulang pada PIC Lead -> Lead.marketing_id berubah berkali-kali, Transaksi.pic_id tetap sama", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "99",
        name: "Manager Budi",
        role: "MANAGER",
      },
    });

    // Lead handover 1: 10 -> 20
    mockTx.lead.findUnique.mockResolvedValueOnce({
      id: 105,
      marketing_id: 10,
      marketing: { id: 10, nama: "Marketing Alpha" },
      itj: [],
    });
    mockTx.user.findUnique.mockResolvedValueOnce({
      id: 20,
      nama: "Marketing Beta",
      role: "MARKETING",
      isActive: true,
    });
    await handoverLead(105, 20);

    // Lead handover 2: 20 -> 25
    mockTx.lead.findUnique.mockResolvedValueOnce({
      id: 105,
      marketing_id: 20,
      marketing: { id: 20, nama: "Marketing Beta" },
      itj: [],
    });
    mockTx.user.findUnique.mockResolvedValueOnce({
      id: 25,
      nama: "Marketing Charlie",
      role: "MARKETING",
      isActive: true,
    });
    const res2 = await handoverLead(105, 25);

    expect(res2.success).toBe(true);
    expect(mockTx.lead.update).toHaveBeenCalledTimes(2);
    expect(mockTx.transaksi.update).not.toHaveBeenCalled();
    expect(mockTx.transaksi.updateMany).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Skenario 6: Handover PIC Lead ditolak jika Lead sudah ITJ / Closing
  // ───────────────────────────────────────────────────────────────────────────
  it("Skenario 6: Handover PIC Lead ditolak jika Lead sudah ITJ / Closing -> Server mengembalikan error / ditolak", async () => {
    mockTx.lead.findUnique.mockResolvedValue({
      id: 106,
      marketing_id: 10,
      marketing: { id: 10, nama: "Marketing Alpha" },
      itj: [{ id: 888 }], // SUDAH ADA ITJ!
    });

    mockTx.user.findUnique.mockResolvedValue({
      id: 20,
      nama: "Marketing Beta",
      role: "MARKETING",
      isActive: true,
    });

    const res = await handoverLead(106, 20);

    expect(res.success).toBe(false);
    expect(res.error).toContain("handover terkunci");
    expect(mockTx.lead.update).not.toHaveBeenCalled();
    expect(mockTx.transaksi.update).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Skenario 7: Handover PIC Transaksi ditolak jika Transaksi sudah selesai (BAST)
  // ───────────────────────────────────────────────────────────────────────────
  it("Skenario 7: Handover PIC Transaksi ditolak jika Transaksi sudah selesai (BAST) -> Server mengembalikan error / ditolak", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "99",
        name: "Admin Office",
        role: "ADMIN",
      },
    });

    mockTx.transaksi.findUnique.mockResolvedValue({
      id: 507,
      pic_id: 30,
      tahap_detail: "BAST",
      status_transaksi: "SELESAI",
      tgl_bast: new Date("2026-10-01"),
      pic: { id: 30, nama: "Admin Siti" },
      unit: { id: 7, blok: "G7" },
      itj: {
        id: 307,
        lead_id: 107,
        closer_id: 10,
        lead: { id: 107, nama: "Konsumen G", marketing_id: 10 },
      },
    });

    mockTx.user.findUnique.mockResolvedValue({
      id: 40,
      nama: "Admin Joko",
      role: "ADMIN",
      isActive: true,
    });

    const res = await handoverTransaksi(507, 40);

    expect(res.success).toBe(false);
    expect(res.error).toContain("handover terkunci");
    expect(mockTx.transaksi.update).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Skenario 8: Handover PIC Transaksi ditolak jika Transaksi sudah BATAL
  // ───────────────────────────────────────────────────────────────────────────
  it("Skenario 8: Handover PIC Transaksi ditolak jika Transaksi sudah BATAL -> Server mengembalikan error / ditolak", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "99",
        name: "Admin Office",
        role: "ADMIN",
      },
    });

    mockTx.transaksi.findUnique.mockResolvedValue({
      id: 508,
      pic_id: 30,
      tahap_detail: "BATAL",
      cancelled_at: new Date(),
      tgl_bast: null,
      pic: { id: 30, nama: "Admin Siti" },
      unit: { id: 8, blok: "H8" },
      itj: {
        id: 308,
        lead_id: 108,
        closer_id: 10,
        lead: { id: 108, nama: "Konsumen H", marketing_id: 10 },
      },
    });

    mockTx.user.findUnique.mockResolvedValue({
      id: 40,
      nama: "Admin Joko",
      role: "ADMIN",
      isActive: true,
    });

    const res = await handoverTransaksi(508, 40);

    expect(res.success).toBe(false);
    expect(res.error).toContain("BATAL");
    expect(mockTx.transaksi.update).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Skenario 9: Itj.closer_id tetap tidak berubah pada handover Lead maupun Transaksi
  // ───────────────────────────────────────────────────────────────────────────
  it("Skenario 9: Itj.closer_id tetap tidak berubah (immutable) pada handover Lead maupun Transaksi", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "99",
        name: "Manager",
        role: "MANAGER",
      },
    });

    // ITJ memiliki closer_id: 10 (Marketing Alpha)
    mockTx.transaksi.findUnique.mockResolvedValue({
      id: 509,
      pic_id: 10,
      tahap_detail: "PEMBERKASAN",
      status_transaksi: "PEMBERKASAN",
      tgl_bast: null,
      pic: { id: 10, nama: "Marketing Alpha" },
      unit: { id: 9, blok: "I9" },
      itj: {
        id: 309,
        lead_id: 109,
        closer_id: 10,
        lead: { id: 109, nama: "Konsumen I", marketing_id: 10 },
      },
    });

    mockTx.user.findUnique.mockResolvedValue({
      id: 30,
      nama: "Admin Siti",
      role: "ADMIN",
      isActive: true,
    });

    mockTx.transaksi.update.mockResolvedValue({ id: 509, pic_id: 30 });

    await handoverTransaksi(509, 30);

    // Pastikan mutlak tidak ada pemanggilan ke itj.update
    expect(mockTx.itj.update).not.toHaveBeenCalled();
    // Pastikan transaksi.update hanya mengubah pic_id, bukan closer_id
    expect(mockTx.transaksi.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 509 },
        data: expect.not.objectContaining({ closer_id: expect.anything() }),
      })
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Skenario 10: Server Action validasi otorisasi & parameter
  // ───────────────────────────────────────────────────────────────────────────
  it("Skenario 10: Server Action validasi otorisasi & parameter (input invalid, user non-aktif, unauthorized role)", async () => {
    // 10a. User non-PIC marketing mencoba handover transaksi
    mockAuth.mockResolvedValueOnce({
      user: {
        id: "77", // Bukan PIC (PIC adalah 10)
        name: "Marketing Random",
        role: "MARKETING",
      },
    });
    mockTx.transaksi.findUnique.mockResolvedValueOnce({
      id: 510,
      pic_id: 10,
      tahap_detail: "PEMBERKASAN",
      status_transaksi: "PEMBERKASAN",
      tgl_bast: null,
      pic: { id: 10, nama: "Marketing Alpha" },
      unit: { id: 10, blok: "J10" },
      itj: { id: 310, lead_id: 110, closer_id: 10 },
    });

    const resAuth = await handoverTransaksi(510, 30);
    expect(resAuth.success).toBe(false);
    expect(resAuth.error).toContain("Anda tidak memiliki izin");

    // 10b. Input target user tidak ditemukan / tidak aktif
    mockAuth.mockResolvedValueOnce({
      user: {
        id: "10",
        name: "Marketing Alpha",
        role: "MARKETING",
      },
    });
    mockTx.transaksi.findUnique.mockResolvedValueOnce({
      id: 510,
      pic_id: 10,
      tahap_detail: "PEMBERKASAN",
      status_transaksi: "PEMBERKASAN",
      tgl_bast: null,
      pic: { id: 10, nama: "Marketing Alpha" },
      unit: { id: 10, blok: "J10" },
      itj: { id: 310, lead_id: 110, closer_id: 10 },
    });
    mockTx.user.findUnique.mockResolvedValueOnce(null); // User not found/inactive

    const resInactive = await handoverTransaksi(510, 999);
    expect(resInactive.success).toBe(false);
    expect(resInactive.error).toContain("tidak ditemukan atau tidak aktif");

    // 10c. Target user sama dengan PIC saat ini
    mockAuth.mockResolvedValueOnce({
      user: {
        id: "10",
        name: "Marketing Alpha",
        role: "MARKETING",
      },
    });
    mockTx.transaksi.findUnique.mockResolvedValueOnce({
      id: 510,
      pic_id: 10,
      tahap_detail: "PEMBERKASAN",
      status_transaksi: "PEMBERKASAN",
      tgl_bast: null,
      pic: { id: 10, nama: "Marketing Alpha" },
      unit: { id: 10, blok: "J10" },
      itj: { id: 310, lead_id: 110, closer_id: 10 },
    });
    mockTx.user.findUnique.mockResolvedValueOnce({
      id: 10,
      nama: "Marketing Alpha",
      role: "MARKETING",
      isActive: true,
    });

    const resSame = await handoverTransaksi(510, 10);
    expect(resSame.success).toBe(false);
    expect(resSame.error).toContain("sudah ditugaskan");

    // 10d. Parameter id negatif / invalid
    const resInvalid = await handoverTransaksi(-1, 20);
    expect(resInvalid.success).toBe(false);
    expect(resInvalid.error).toContain("ID Transaksi tidak valid");
  });
});
