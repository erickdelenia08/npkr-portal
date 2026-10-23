// tests/unit/master-unit-smart-lock.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth before importing action
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: {
      id: "1",
      role: "ADMIN",
    },
  }),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    itj: {
      count: vi.fn(),
    },
    transaksi: {
      count: vi.fn(),
    },
    masterUnit: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { checkUnitIsLocked, updateMasterUnit, getAllMasterUnits } from "@/actions/master-unit.action";
import { prisma } from "@/lib/prisma";

describe("actions/master-unit.action.ts - Smart Lock Guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
          transaksi: {
            is: {
              status_transaksi: { not: "BATAL" },
            },
          },
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

  describe("updateMasterUnit() with Smart Lock Guard", () => {
    it("rejects with error when unit is LOCKED and input attempts to change status_unit", async () => {
      // Unit exists with status AVAILABLE
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 201,
        blok: "A-01",
        status_unit: "AVAILABLE",
      } as unknown as never);

      // Unit is locked by active ITJ
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
      // Unit exists with status AVAILABLE
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 202,
        blok: "A-02",
        status_unit: "AVAILABLE",
      } as unknown as never);

      // Unit is locked by active Transaksi
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
      // Unit exists with status AVAILABLE
      vi.mocked(prisma.masterUnit.findUnique).mockResolvedValue({
        id: 203,
        blok: "A-03",
        status_unit: "AVAILABLE",
      } as unknown as never);

      // Unit is unlocked
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
