// tests/unit/master-unit-smart-lock.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth before importing action
const mockSession = {
  user: {
    id: "1",
    role: "ADMIN",
  },
};

vi.mock("@/auth", () => ({
  auth: vi.fn().mockImplementation(() => Promise.resolve(mockSession)),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => {
  const prismaMock = {
    $transaction: vi.fn((cb) => cb(prismaMock)),
    itj: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    transaksi: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    masterUnit: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  return { prisma: prismaMock };
});

import {
  checkUnitIsLocked,
  updateMasterUnit,
  updateMasterUnitStatus,
  getAllMasterUnits,
} from "@/actions/master-unit.action";
import { prisma } from "@/lib/prisma";

describe("actions/master-unit.action.ts - Smart Lock Guard & Manual Status Changes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.user.role = "ADMIN";
  });

  describe("checkUnitIsLocked()", () => {
    it("returns true if unit has active ITJ record with non-cancelled Transaksi", async () => {
      vi.mocked(prisma.itj.count).mockResolvedValue(1);
      vi.mocked(prisma.transaksi.count).mockResolvedValue(0);

      const isLocked = await checkUnitIsLocked(101);
      expect(isLocked).toBe(true);

      expect(prisma.itj.count).toHaveBeenCalledWith({
        where: {
          unit_id: 101,
          OR: [
            { transaksi: null },
            {
              transaksi: {
                is: {
                  status_transaksi: { not: "BATAL" },
                  cancelled_at: null,
                },
              },
            },
          ],
        },
      });
    });

    it("returns true if unit has active non-cancelled Transaksi", async () => {
      vi.mocked(prisma.itj.count).mockResolvedValue(0);
      vi.mocked(prisma.transaksi.count).mockResolvedValue(1);

      const isLocked = await checkUnitIsLocked(102);
      expect(isLocked).toBe(true);

      expect(prisma.transaksi.count).toHaveBeenCalledWith({
        where: {
          unit_id: 102,
          status_transaksi: { not: "BATAL" },
          cancelled_at: null,
        },
      });
    });

    it("returns false if unit has no active ITJ and no active Transaksi", async () => {
      vi.mocked(prisma.itj.count).mockResolvedValue(0);
      vi.mocked(prisma.transaksi.count).mockResolvedValue(0);

      const isLocked = await checkUnitIsLocked(103);
      expect(isLocked).toBe(false);
    });
  });

  describe("updateMasterUnitStatus() by ADMIN", () => {
    it("allows ADMIN to change unlocked unit from AVAILABLE to HOLD", async () => {
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 301,
        blok: "B-01",
        status_unit: "AVAILABLE",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      vi.mocked(prisma.transaksi.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.itj.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.masterUnit.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.masterUnit.findUniqueOrThrow).mockResolvedValue({
        id: 301,
        blok: "B-01",
        status_unit: "HOLD",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      const res = await updateMasterUnitStatus({ unitId: 301, newStatus: "HOLD" });

      expect(res.success).toBe(true);
      expect(res.data?.status_unit).toBe("HOLD");
      expect(prisma.masterUnit.updateMany).toHaveBeenCalledWith({
        where: { id: 301, status_unit: "AVAILABLE" },
        data: { status_unit: "HOLD" },
      });
    });

    it("allows ADMIN to change unlocked unit from HOLD to AVAILABLE", async () => {
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 302,
        blok: "B-02",
        status_unit: "HOLD",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      vi.mocked(prisma.transaksi.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.itj.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.masterUnit.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.masterUnit.findUniqueOrThrow).mockResolvedValue({
        id: 302,
        blok: "B-02",
        status_unit: "AVAILABLE",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      const res = await updateMasterUnitStatus({ unitId: 302, newStatus: "AVAILABLE" });

      expect(res.success).toBe(true);
      expect(res.data?.status_unit).toBe("AVAILABLE");
    });

    it("allows ADMIN to change unlocked unit to BOOKED", async () => {
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 303,
        blok: "B-03",
        status_unit: "AVAILABLE",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      vi.mocked(prisma.transaksi.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.itj.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.masterUnit.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.masterUnit.findUniqueOrThrow).mockResolvedValue({
        id: 303,
        blok: "B-03",
        status_unit: "BOOKED",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      const res = await updateMasterUnitStatus({ unitId: 303, newStatus: "BOOKED" });

      expect(res.success).toBe(true);
      expect(res.data?.status_unit).toBe("BOOKED");
    });

    it("allows ADMIN to change unlocked unit to SOLD", async () => {
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 304,
        blok: "B-04",
        status_unit: "AVAILABLE",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      vi.mocked(prisma.transaksi.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.itj.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.masterUnit.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.masterUnit.findUniqueOrThrow).mockResolvedValue({
        id: 304,
        blok: "B-04",
        status_unit: "SOLD",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      const res = await updateMasterUnitStatus({ unitId: 304, newStatus: "SOLD" });

      expect(res.success).toBe(true);
      expect(res.data?.status_unit).toBe("SOLD");
    });

    it("allows ADMIN to change unit from SOLD to AVAILABLE if unit has no transaction binding", async () => {
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 305,
        blok: "B-05",
        status_unit: "SOLD",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      vi.mocked(prisma.transaksi.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.itj.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.masterUnit.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.masterUnit.findUniqueOrThrow).mockResolvedValue({
        id: 305,
        blok: "B-05",
        status_unit: "AVAILABLE",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      const res = await updateMasterUnitStatus({ unitId: 305, newStatus: "AVAILABLE" });

      expect(res.success).toBe(true);
      expect(res.data?.status_unit).toBe("AVAILABLE");
    });

    it("returns early without update if target status matches current status", async () => {
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 306,
        blok: "B-06",
        status_unit: "HOLD",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      const res = await updateMasterUnitStatus({ unitId: 306, newStatus: "HOLD" });

      expect(res.success).toBe(true);
      expect(res.message).toContain("sudah berstatus 'HOLD'");
      expect(prisma.masterUnit.updateMany).not.toHaveBeenCalled();
    });

    it("rejects when MARKETING or non-ADMIN calls the action", async () => {
      mockSession.user.role = "MARKETING";

      const res = await updateMasterUnitStatus({ unitId: 307, newStatus: "HOLD" });

      expect(res.success).toBe(false);
      expect(res.message).toContain("Akses ditolak");
    });

    it("rejects when unit has an active transaction", async () => {
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 308,
        blok: "B-08",
        status_unit: "BOOKED",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      vi.mocked(prisma.transaksi.findFirst).mockResolvedValue({
        id: 99,
        status_transaksi: "PEMBERKASAN",
        tahap_detail: "PENGUMPULAN_DOKUMEN",
        customer: { nama_ktp: "Budi Santoso" },
      } as never);

      const res = await updateMasterUnitStatus({ unitId: 308, newStatus: "AVAILABLE" });

      expect(res.success).toBe(false);
      expect(res.message).toContain("Unit terikat dengan transaksi aktif tahap PEMBERKASAN");
      expect(prisma.masterUnit.updateMany).not.toHaveBeenCalled();
    });

    it("rejects when unit has a completed transaction (SERAH_TERIMA / BAST)", async () => {
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 309,
        blok: "B-09",
        status_unit: "SOLD",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      vi.mocked(prisma.transaksi.findFirst).mockResolvedValue({
        id: 100,
        status_transaksi: "SERAH_TERIMA",
        tahap_detail: "BAST",
        customer: { nama_ktp: "Ahmad Dahlan" },
      } as never);

      const res = await updateMasterUnitStatus({ unitId: 309, newStatus: "AVAILABLE" });

      expect(res.success).toBe(false);
      expect(res.message).toContain("transaksi selesai (Serah Terima / BAST)");
      expect(prisma.masterUnit.updateMany).not.toHaveBeenCalled();
    });

    it("rejects when unit has an active ITJ submission", async () => {
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 310,
        blok: "B-10",
        status_unit: "BOOKED",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      vi.mocked(prisma.transaksi.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.itj.findFirst).mockResolvedValue({
        id: 55,
        nama_ktp: "Siti Rahma",
      } as never);

      const res = await updateMasterUnitStatus({ unitId: 310, newStatus: "AVAILABLE" });

      expect(res.success).toBe(false);
      expect(res.message).toContain("Unit terikat dengan pengajuan ITJ aktif (ID: #55 a.n. Siti Rahma)");
      expect(prisma.masterUnit.updateMany).not.toHaveBeenCalled();
    });

    it("rejects with concurrency conflict if status changed concurrently", async () => {
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 311,
        blok: "B-11",
        status_unit: "AVAILABLE",
        tipe: { id: 1, nama_tipe: "Tipe 36", kategori: "SUBSIDI", luas_bangunan: 36, luas_tanah: 60, harga_dasar: 150000000 },
      } as never);

      vi.mocked(prisma.transaksi.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.itj.findFirst).mockResolvedValue(null);
      // Concurrency race: updateMany affected 0 rows because another worker already changed status
      vi.mocked(prisma.masterUnit.updateMany).mockResolvedValue({ count: 0 });

      const res = await updateMasterUnitStatus({ unitId: 311, newStatus: "HOLD" });

      expect(res.success).toBe(false);
      expect(res.message).toContain("Kondisi unit telah berubah bersamaan oleh proses lain");
    });
  });

  describe("updateMasterUnit() with Smart Lock Guard", () => {
    it("rejects with error when unit is LOCKED and input attempts to change status_unit", async () => {
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 201,
        blok: "A-01",
        status_unit: "AVAILABLE",
      } as unknown as never);

      vi.mocked(prisma.itj.count).mockResolvedValue(1);
      vi.mocked(prisma.transaksi.count).mockResolvedValue(0);

      const res = await updateMasterUnit(201, {
        status_unit: "SOLD",
      });

      expect(res.success).toBe(false);
      expect(res.message).toBe("Status unit dikunci oleh sistem karena ada transaksi berjalan.");
      expect(prisma.masterUnit.update).not.toHaveBeenCalled();
    });

    it("allows updating harga_khusus even when unit is LOCKED", async () => {
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 202,
        blok: "A-02",
        status_unit: "AVAILABLE",
      } as unknown as never);

      vi.mocked(prisma.itj.count).mockResolvedValue(0);
      vi.mocked(prisma.transaksi.count).mockResolvedValue(1);

      vi.mocked(prisma.masterUnit.update).mockResolvedValue({
        id: 202,
        tipe_id: 1,
        blok: "A-02",
        status_unit: "AVAILABLE",
        harga_khusus: 350000000,
        tipe: {
          id: 1,
          nama_tipe: "Tipe 36",
          kategori: "SUBSIDI",
          harga_dasar: 300000000,
        },
      } as unknown as never);

      const res = await updateMasterUnit(202, {
        harga_khusus: 350000000,
      });

      expect(res.success).toBe(true);
      expect(res.message).toBe("Data unit berhasil diperbarui");
      expect(prisma.masterUnit.update).toHaveBeenCalled();
    });

    it("allows freely changing status_unit (e.g. to SOLD for legacy sales) when unit is UNLOCKED", async () => {
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 203,
        blok: "A-03",
        status_unit: "AVAILABLE",
      } as unknown as never);

      vi.mocked(prisma.itj.count).mockResolvedValue(0);
      vi.mocked(prisma.transaksi.count).mockResolvedValue(0);

      vi.mocked(prisma.masterUnit.update).mockResolvedValue({
        id: 203,
        tipe_id: 2,
        blok: "A-03",
        status_unit: "SOLD",
        harga_khusus: null,
        tipe: {
          id: 2,
          nama_tipe: "Tipe 45",
          kategori: "KOMERSIL",
          harga_dasar: 450000000,
        },
      } as unknown as never);

      const res = await updateMasterUnit(203, {
        status_unit: "SOLD",
      });

      expect(res.success).toBe(true);
      expect(res.message).toBe("Data unit berhasil diperbarui");
      expect(res.data?.status_unit).toBe("SOLD");
      expect(prisma.masterUnit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 203 },
          data: expect.objectContaining({
            status_unit: "SOLD",
          }),
        })
      );
    });
  });

  describe("getAllMasterUnits()", () => {
    it("fetches all units with tipe relation and calculates isLocked", async () => {
      vi.mocked(prisma.masterUnit.findMany).mockResolvedValue([
        {
          id: 1,
          blok: "F-11",
          tipe_id: 1,
          status_unit: "AVAILABLE",
          harga_khusus: null,
          itj: [],
          transaksi: [],
          tipe: {
            id: 1,
            nama_tipe: "Tipe 36",
            kategori: "SUBSIDI",
            harga_dasar: 168000000,
          },
        },
      ] as never);

      const res = await getAllMasterUnits();

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.data?.[0].blok).toBe("F-11");
      expect(res.data?.[0].tipe.kategori).toBe("SUBSIDI");
      expect(res.data?.[0].isLocked).toBe(false);
    });
  });
});
