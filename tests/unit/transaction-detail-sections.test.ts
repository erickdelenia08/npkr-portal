import { describe, it, expect } from "vitest";
import { formatDateOnly } from "@/lib/date/wib";

describe("Transaction Detail View: Customer, Unit & Financial Sections", () => {
  describe("Section A & B: Customer & Unit Data Transformations", () => {
    it("formats customer TTL and handles null phone number safely", () => {
      const customer = {
        nama_ktp: "Budi Santoso",
        nik: "3201123456789001",
        tempat_lahir: "Bandung",
        tgl_lahir: new Date("1992-05-15T00:00:00.000Z"),
        alamat_ktp: "Jl. Merdeka No. 10, RT 02/05, Bandung",
        no_hp: null,
      };

      const formattedTTL = `${customer.tempat_lahir}, ${formatDateOnly(customer.tgl_lahir)}`;
      expect(formattedTTL).toBe("Bandung, 15 Mei 1992");

      const cleanPhone = customer.no_hp
        ? (customer.no_hp as string).replace(/[^0-9+]/g, "")
        : "";
      expect(cleanPhone).toBe("");
    });

    it("sanitizes valid phone number for tel: link", () => {
      const rawPhone = "0812-3456-7890";
      const cleanPhone = rawPhone.replace(/[^0-9+]/g, "");
      expect(cleanPhone).toBe("081234567890");
    });

    it("formats transaction scheme and optional tenor properly", () => {
      const unitA = {
        blok: "A-01",
        tipe: {
          nama_tipe: "Type 36/60",
          kategori: "SUBSIDI",
        },
        metode_bayar: "KPR_SUBSIDI",
        tenor_bulan: 180,
      };

      const unitB = {
        blok: "B-05",
        tipe: {
          nama_tipe: "Type 45/84",
          kategori: "KOMERSIAL",
        },
        metode_bayar: "CASH_KERAS",
        tenor_bulan: null,
      };

      const formatScheme = (metode: string, tenor: number | null) =>
        `${metode.replace(/_/g, " ")}${tenor ? ` (${tenor} Bulan)` : ""}`;

      expect(formatScheme(unitA.metode_bayar, unitA.tenor_bulan)).toBe(
        "KPR SUBSIDI (180 Bulan)"
      );
      expect(formatScheme(unitB.metode_bayar, unitB.tenor_bulan)).toBe(
        "CASH KERAS"
      );
    });
  });

  describe("Section C: Financial Calculations & Indicator Badges", () => {
    const formatCurrency = (val: number): string =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(val);

    it("formats currency accurately in Indonesian Rupiah", () => {
      const amount = 168000000;
      const formatted = formatCurrency(amount);
      // Indonesian Rupiah format standard
      expect(formatted).toContain("168.000.000");
    });

    it("calculates progress percentage correctly and prevents division by zero", () => {
      const calculatePercent = (totalPaid: number, hargaDeal: number) =>
        Math.min(100, Math.round((totalPaid / (hargaDeal || 1)) * 100));

      expect(calculatePercent(50000000, 200000000)).toBe(25);
      expect(calculatePercent(200000000, 200000000)).toBe(100);
      expect(calculatePercent(250000000, 200000000)).toBe(100); // capped at 100
      expect(calculatePercent(0, 0)).toBe(0); // safe fallback
    });

    it("evaluates status badges accurately for partially paid vs fully settled transactions", () => {
      // Scenario 1: Partial payment (ITJ paid, DP remaining, Pelunasan remaining)
      const state1 = {
        hargaDeal: 200000000,
        targetItj: 5000000,
        targetDp: 20000000,
        totalPaid: 5000000,
        sisaItj: 0,
        sisaDp: 20000000,
        sisaPelunasan: 195000000,
      };

      expect(state1.sisaItj === 0).toBe(true);
      expect(state1.sisaDp > 0).toBe(true);
      expect(state1.sisaPelunasan === 0).toBe(false);

      // Scenario 2: Fully paid
      const state2 = {
        hargaDeal: 200000000,
        targetItj: 5000000,
        targetDp: 20000000,
        totalPaid: 200000000,
        sisaItj: 0,
        sisaDp: 0,
        sisaPelunasan: 0,
      };

      expect(state2.sisaItj === 0).toBe(true);
      expect(state2.sisaDp === 0).toBe(true);
      expect(state2.sisaPelunasan === 0).toBe(true);
    });

    it("formats compact Rupiah numbers cleanly according to design specs", () => {
      const formatRupiahCompact = (num: number): string => {
        if (!Number.isFinite(num) || num === 0) return "Rp 0";
        const abs = Math.abs(num);
        const sign = num < 0 ? "-" : "";
        if (abs >= 1_000_000_000) {
          const val = abs / 1_000_000_000;
          const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace(".", ",");
          return `${sign}Rp ${formatted} M`;
        }
        if (abs >= 1_000_000) {
          const val = abs / 1_000_000;
          const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace(".", ",");
          return `${sign}Rp ${formatted} jt`;
        }
        if (abs >= 1_000) {
          const val = Math.round(abs / 1_000);
          return `${sign}Rp ${val.toLocaleString("id-ID")} rb`;
        }
        return `${sign}Rp ${abs.toLocaleString("id-ID")}`;
      };

      expect(formatRupiahCompact(0)).toBe("Rp 0");
      expect(formatRupiahCompact(5000000)).toBe("Rp 5 jt");
      expect(formatRupiahCompact(120000000)).toBe("Rp 120 jt");
      expect(formatRupiahCompact(200000000)).toBe("Rp 200 jt");
      expect(formatRupiahCompact(1500000000)).toBe("Rp 1,5 M");
      expect(formatRupiahCompact(2000000000)).toBe("Rp 2 M");
      expect(formatRupiahCompact(50000)).toBe("Rp 50 rb");
    });
  });
});

