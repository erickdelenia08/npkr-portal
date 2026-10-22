// tests/unit/customer-directory.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth before importing action
const mockAuth = vi.fn().mockResolvedValue({
  user: {
    id: "1",
    role: "ADMIN",
  },
});

vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {
  getCustomers,
  getCustomerDetail,
  updateCustomerIdentity,
} from "@/actions/customer.action";
import { prisma } from "@/lib/prisma";

describe("actions/customer.action.ts - Buku Induk Customer Directory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "1",
        role: "ADMIN",
      },
    });
  });

  describe("getCustomers()", () => {
    it("returns serialized customer list with transaction count", async () => {
      vi.mocked(prisma.customer.findMany).mockResolvedValue([
        {
          id: 1,
          nama_ktp: "Budi Santoso",
          nik: "3508123456780001",
          tempat_lahir: "Lumajang",
          tgl_lahir: new Date("1990-05-12T00:00:00.000Z"),
          alamat_ktp: "Jl. Sukodono No. 10",
          no_hp: "081234567890",
          created_at: new Date("2026-01-10T08:00:00.000Z"),
          updated_at: new Date("2026-01-10T08:00:00.000Z"),
          _count: { transaksi: 2 },
        },
      ] as never);

      const res = await getCustomers();

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.data?.[0]).toMatchObject({
        id: 1,
        nama_ktp: "Budi Santoso",
        nik: "3508123456780001",
        jumlah_unit: 2,
        tgl_lahir: "1990-05-12",
      });
    });

    it("allows search filter by name or NIK", async () => {
      vi.mocked(prisma.customer.findMany).mockResolvedValue([] as never);

      await getCustomers({ search: "Budi" });

      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { nama_ktp: { contains: "Budi" } },
            { nik: { contains: "Budi" } },
            { no_hp: { contains: "Budi" } },
          ],
        },
        include: {
          _count: { select: { transaksi: true } },
        },
        orderBy: { nama_ktp: "asc" },
      });
    });
  });

  describe("getCustomerDetail()", () => {
    it("returns single customer with nested transaksi, unit, and tipe relations", async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: 1,
        nama_ktp: "Siti Rahma",
        nik: "3508123456780002",
        tempat_lahir: "Jember",
        tgl_lahir: new Date("1995-08-17T00:00:00.000Z"),
        alamat_ktp: "Jl. Gajah Mada No. 45",
        no_hp: "085678901234",
        created_at: new Date("2026-02-01T10:00:00.000Z"),
        updated_at: new Date("2026-02-01T10:00:00.000Z"),
        _count: { transaksi: 1 },
        transaksi: [
          {
            id: 10,
            metode_bayar: "KPR",
            harga_deal: 168000000,
            status_transaksi: "AKAD_AJB",
            tahap_detail: "AKAD_KREDIT",
            closing_at: new Date("2026-03-01T00:00:00.000Z"),
            created_at: new Date("2026-02-05T09:00:00.000Z"),
            unit: {
              id: 50,
              blok: "F-11",
              status_unit: "SOLD",
              tipe: {
                id: 1,
                nama_tipe: "Tipe 36",
                kategori: "SUBSIDI",
                harga_dasar: 168000000,
              },
            },
          },
        ],
      } as never);

      const res = await getCustomerDetail(1);

      expect(res.success).toBe(true);
      expect(res.data?.nama_ktp).toBe("Siti Rahma");
      expect(res.data?.transaksi).toHaveLength(1);
      expect(res.data?.transaksi[0].unit.blok).toBe("F-11");
      expect(res.data?.transaksi[0].unit.tipe.kategori).toBe("SUBSIDI");
    });

    it("returns error message when customer is not found", async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null);

      const res = await getCustomerDetail(999);

      expect(res.success).toBe(false);
      expect(res.message).toBe("Customer tidak ditemukan di database");
    });
  });

  describe("updateCustomerIdentity()", () => {
    it("rejects update if caller has MANAGER role", async () => {
      mockAuth.mockResolvedValueOnce({
        user: { id: "2", role: "MANAGER" },
      });

      const res = await updateCustomerIdentity(1, {
        nama_ktp: "Budi Santoso",
        nik: "3508123456780001",
        tempat_lahir: "Lumajang",
        tgl_lahir: "1990-05-12",
        alamat_ktp: "Jl. Sukodono No. 10",
        no_hp: "081234567890",
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain("Hanya Administrator yang dapat memperbarui identitas customer");
      expect(prisma.customer.update).not.toHaveBeenCalled();
    });

    it("enforces NIK uniqueness check if NIK is changed to one already used", async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: 1,
        nik: "3508123456780001",
      } as never);

      // Another customer already has the new NIK
      vi.mocked(prisma.customer.findFirst).mockResolvedValue({
        id: 2,
        nama_ktp: "Dewi Lestari",
      } as never);

      const res = await updateCustomerIdentity(1, {
        nama_ktp: "Budi Santoso",
        nik: "3508999999999999",
        tempat_lahir: "Lumajang",
        tgl_lahir: "1990-05-12",
        alamat_ktp: "Jl. Sukodono No. 10",
        no_hp: "081234567890",
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain("sudah terdaftar atas nama Dewi Lestari");
      expect(prisma.customer.update).not.toHaveBeenCalled();
    });

    it("successfully updates customer identity when NIK is unique and data is valid", async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: 1,
        nik: "3508123456780001",
      } as never);

      vi.mocked(prisma.customer.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.customer.update).mockResolvedValue({
        id: 1,
        nama_ktp: "Budi Santoso S.T.",
        nik: "3508123456780001",
        tempat_lahir: "Lumajang",
        tgl_lahir: new Date("1990-05-12T00:00:00.000Z"),
        alamat_ktp: "Jl. Sukodono No. 12",
        no_hp: "081234567899",
        created_at: new Date("2026-01-10T08:00:00.000Z"),
        updated_at: new Date("2026-01-10T09:00:00.000Z"),
        _count: { transaksi: 2 },
        transaksi: [],
      } as never);

      const res = await updateCustomerIdentity(1, {
        nama_ktp: "Budi Santoso S.T.",
        nik: "3508123456780001",
        tempat_lahir: "Lumajang",
        tgl_lahir: "1990-05-12",
        alamat_ktp: "Jl. Sukodono No. 12",
        no_hp: "081234567899",
      });

      expect(res.success).toBe(true);
      expect(res.message).toContain("berhasil diperbarui");
      expect(res.data?.nama_ktp).toBe("Budi Santoso S.T.");
      expect(prisma.customer.update).toHaveBeenCalled();
    });
  });
});
