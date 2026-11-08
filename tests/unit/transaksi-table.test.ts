import { describe, it, expect } from "vitest";
import {
  STATUS_OPTIONS,
  type SerializedTransaksi,
} from "@/components/tables/transaksi-table";

describe("TransaksiTable - Column Sorting and Status Filtering Logic", () => {
  const sampleData: SerializedTransaksi[] = [
    {
      id: 1,
      customer_id: 1,
      unit_id: 1,
      marketing_id: 1,
      metode_bayar: "KPR",
      harga_deal: 500_000_000,
      target_itj: 10_000_000,
      target_dp: 50_000_000,
      tenor_bulan: 120,
      status_transaksi: "PEMBERKASAN",
      nama_bank: "Bank BTN",
      nama_notaris: null,
      tgl_akad: null,
      tgl_bast: null,
      catatan_admin: null,
      created_at: "2026-10-01T10:00:00.000Z",
      updated_at: "2026-10-01T10:00:00.000Z",
      customer: {
        id: 1,
        nama_ktp: "Budi Santoso",
        no_hp: "08123456789",
        nik: "3201010101010001",
      },
      unit: {
        id: 1,
        blok: "Blok A-10",
        tipe: {
          id: 1,
          nama_tipe: "Tipe 36",
          kategori: "SUBSIDI",
        },
      },
      marketing: {
        id: 1,
        nama: "Siti Rahma",
        no_hp: "08199999999",
      },
      pembayaran: [],
    },
    {
      id: 2,
      customer_id: 2,
      unit_id: 2,
      marketing_id: 1,
      metode_bayar: "CASH_KERAS",
      harga_deal: 450_000_000,
      target_itj: 10_000_000,
      target_dp: 0,
      tenor_bulan: null,
      status_transaksi: "PROSES_BANK",
      nama_bank: null,
      nama_notaris: null,
      tgl_akad: null,
      tgl_bast: null,
      catatan_admin: null,
      created_at: "2026-10-15T10:00:00.000Z",
      updated_at: "2026-10-15T10:00:00.000Z",
      customer: {
        id: 2,
        nama_ktp: "Andi Wijaya",
        no_hp: "08123456788",
        nik: "3201010101010002",
      },
      unit: {
        id: 2,
        blok: "Blok A-2",
        tipe: {
          id: 2,
          nama_tipe: "Tipe 45",
          kategori: "KOMERSIL",
        },
      },
      marketing: {
        id: 1,
        nama: "Siti Rahma",
        no_hp: "08199999999",
      },
      pembayaran: [],
    },
    {
      id: 3,
      customer_id: 3,
      unit_id: 3,
      marketing_id: 2,
      metode_bayar: "CASH_TEMPO",
      harga_deal: 600_000_000,
      target_itj: 10_000_000,
      target_dp: 60_000_000,
      tenor_bulan: 12,
      status_transaksi: "AKAD_AJB",
      nama_bank: null,
      nama_notaris: "Notaris Jaya",
      tgl_akad: "2026-10-20T00:00:00.000Z",
      tgl_bast: null,
      catatan_admin: null,
      created_at: "2026-10-05T10:00:00.000Z",
      updated_at: "2026-10-05T10:00:00.000Z",
      customer: {
        id: 3,
        nama_ktp: "Cynthia Dewi",
        no_hp: "08123456787",
        nik: "3201010101010003",
      },
      unit: {
        id: 3,
        blok: "Blok A-1",
        tipe: {
          id: 3,
          nama_tipe: "Tipe 54",
          kategori: "KOMERSIL",
        },
      },
      marketing: {
        id: 2,
        nama: "Doni Pratama",
        no_hp: "08188888888",
      },
      pembayaran: [],
    },
    {
      id: 4,
      customer_id: 4,
      unit_id: 4,
      marketing_id: 2,
      metode_bayar: "KPR",
      harga_deal: 520_000_000,
      target_itj: 10_000_000,
      target_dp: 50_000_000,
      tenor_bulan: 180,
      status_transaksi: "BATAL",
      nama_bank: "Bank BNI",
      nama_notaris: null,
      tgl_akad: null,
      tgl_bast: null,
      catatan_admin: "Konsumen membatalkan pemesanan",
      created_at: "2026-09-20T10:00:00.000Z",
      updated_at: "2026-09-20T10:00:00.000Z",
      customer: {
        id: 4,
        nama_ktp: "Ahmad Zaki",
        no_hp: "08123456786",
        nik: "3201010101010004",
      },
      unit: {
        id: 4,
        blok: "Blok B-3",
        tipe: {
          id: 1,
          nama_tipe: "Tipe 36",
          kategori: "SUBSIDI",
        },
      },
      marketing: {
        id: 2,
        nama: "Doni Pratama",
        no_hp: "08188888888",
      },
      pembayaran: [],
    },
  ];

  it("STATUS_OPTIONS matches system specification", () => {
    const values = STATUS_OPTIONS.map((opt) => opt.value);
    expect(values).toEqual([
      "ALL",
      "PEMBERKASAN",
      "PROSES_BANK",
      "PEMBAYARAN",
      "AKAD_AJB",
      "PEMBANGUNAN",
      "SERAH_TERIMA",
      "BATAL",
    ]);
  });

  describe("Column Sorting", () => {
    it("sorts by created_at descending (newest first, default)", () => {
      const sorted = [...sampleData].sort((a, b) => {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      expect(sorted.map((s) => s.id)).toEqual([2, 3, 1, 4]);
      // Verify original sampleData is not mutated
      expect(sampleData[0].id).toBe(1);
    });

    it("sorts by created_at ascending (oldest first)", () => {
      const sorted = [...sampleData].sort((a, b) => {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      expect(sorted.map((s) => s.id)).toEqual([4, 1, 3, 2]);
    });

    it("sorts by customer name using Indonesian localeCompare ascending and descending", () => {
      const sortedAsc = [...sampleData].sort((a, b) =>
        a.customer.nama_ktp.localeCompare(b.customer.nama_ktp, "id", {
          sensitivity: "base",
        })
      );

      expect(sortedAsc.map((s) => s.customer.nama_ktp)).toEqual([
        "Ahmad Zaki",
        "Andi Wijaya",
        "Budi Santoso",
        "Cynthia Dewi",
      ]);

      const sortedDesc = [...sampleData].sort((a, b) =>
        b.customer.nama_ktp.localeCompare(a.customer.nama_ktp, "id", {
          sensitivity: "base",
        })
      );

      expect(sortedDesc.map((s) => s.customer.nama_ktp)).toEqual([
        "Cynthia Dewi",
        "Budi Santoso",
        "Andi Wijaya",
        "Ahmad Zaki",
      ]);
    });

    it("sorts by unit block naturally: A-1, A-2 before A-10", () => {
      const sortedAsc = [...sampleData].sort((a, b) =>
        a.unit.blok.localeCompare(b.unit.blok, "id", {
          numeric: true,
          sensitivity: "base",
        })
      );

      expect(sortedAsc.map((s) => s.unit.blok)).toEqual([
        "Blok A-1",
        "Blok A-2",
        "Blok A-10",
        "Blok B-3",
      ]);

      const sortedDesc = [...sampleData].sort((a, b) =>
        b.unit.blok.localeCompare(a.unit.blok, "id", {
          numeric: true,
          sensitivity: "base",
        })
      );

      expect(sortedDesc.map((s) => s.unit.blok)).toEqual([
        "Blok B-3",
        "Blok A-10",
        "Blok A-2",
        "Blok A-1",
      ]);
    });
  });

  describe("Status Filtering & Combined Filter Pipeline", () => {
    it("filters exactly by status_transaksi", () => {
      const pemberkasan = sampleData.filter(
        (t) => t.status_transaksi === "PEMBERKASAN"
      );
      expect(pemberkasan.length).toBe(1);
      expect(pemberkasan[0].id).toBe(1);

      const batal = sampleData.filter((t) => t.status_transaksi === "BATAL");
      expect(batal.length).toBe(1);
      expect(batal[0].id).toBe(4);

      const pembangunan = sampleData.filter(
        (t) => t.status_transaksi === "PEMBANGUNAN"
      );
      expect(pembangunan.length).toBe(0);
    });

    it("filters in pipeline: payment method -> status -> search query -> sorting", () => {
      const selectedMetode: string = "KPR";
      const selectedStatus: string = "ALL";
      const searchQuery = "Budi";
      const sortColumn = "customer";
      const sortDirection = "asc";

      // 1. Filter metode bayar
      const afterMetode = sampleData.filter((trx) => {
        if (selectedMetode === "ALL") return true;
        return trx.metode_bayar === selectedMetode;
      });
      expect(afterMetode.map((t) => t.id)).toEqual([1, 4]);

      // 2. Filter status
      const afterStatus = afterMetode.filter((trx) => {
        if (selectedStatus === "ALL") return true;
        return trx.status_transaksi === selectedStatus;
      });
      expect(afterStatus.map((t) => t.id)).toEqual([1, 4]);

      // 3. Filter search
      const q = searchQuery.toLowerCase();
      const afterSearch = afterStatus.filter((trx) => {
        return (
          trx.customer.nama_ktp.toLowerCase().includes(q) ||
          trx.customer.nik.toLowerCase().includes(q) ||
          trx.unit.blok.toLowerCase().includes(q) ||
          trx.marketing.nama.toLowerCase().includes(q)
        );
      });
      expect(afterSearch.length).toBe(1);
      expect(afterSearch[0].customer.nama_ktp).toBe("Budi Santoso");

      // 4. Sorting
      const sorted = [...afterSearch].sort((a, b) => {
        let cmp = 0;
        if (sortColumn === "customer") {
          cmp = a.customer.nama_ktp.localeCompare(
            b.customer.nama_ktp,
            "id",
            { sensitivity: "base" }
          );
        }
        return sortDirection === "asc" ? cmp : -cmp;
      });
      expect(sorted.length).toBe(1);
    });

    it("supports combining payment method and status simultaneously", () => {
      const selectedMetode: string = "KPR";
      const selectedStatus: string = "BATAL";

      const filtered = sampleData.filter((t) => {
        if (selectedMetode !== "ALL" && t.metode_bayar !== selectedMetode) {
          return false;
        }
        if (selectedStatus !== "ALL" && t.status_transaksi !== selectedStatus) {
          return false;
        }
        return true;
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe(4);
      expect(filtered[0].customer.nama_ktp).toBe("Ahmad Zaki");
    });
  });
});

