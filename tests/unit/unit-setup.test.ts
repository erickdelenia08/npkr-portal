// tests/unit/unit-setup.test.ts
import { describe, it, expect } from "vitest";
import {
  normalizeBlok,
  parseExcludeList,
  expandRow,
  detectRowOverlaps,
} from "@/lib/unit-setup";

describe("lib/unit-setup.ts - Pure Unit Setup Helpers", () => {
  describe("normalizeBlok()", () => {
    it("normalizes lowercase and unhyphenated blocks correctly", () => {
      expect(normalizeBlok("a1")).toBe("A-1");
      expect(normalizeBlok("b12")).toBe("B-12");
      expect(normalizeBlok("c-03")).toBe("C-3");
      expect(normalizeBlok("  f-15  ")).toBe("F-15");
      expect(normalizeBlok("hok1")).toBe("HOK-1");
      expect(normalizeBlok("hok-1")).toBe("HOK-1");
    });

    it("throws clear error for empty or garbage strings", () => {
      expect(() => normalizeBlok("")).toThrow("Nama blok tidak boleh kosong");
      expect(() => normalizeBlok("InvalidBlockNameLong")).toThrow("tidak valid");
      expect(() => normalizeBlok("---")).toThrow("tidak valid");
    });
  });

  describe("parseExcludeList()", () => {
    it("parses single numbers and ranges correctly", () => {
      const res = parseExcludeList("13, 14, 20-22");
      expect(res).toEqual([13, 14, 20, 21, 22]);
    });

    it("returns empty array for empty or whitespace-only inputs", () => {
      expect(parseExcludeList("")).toEqual([]);
      expect(parseExcludeList("   ")).toEqual([]);
      expect(parseExcludeList(null)).toEqual([]);
      expect(parseExcludeList(undefined)).toEqual([]);
    });

    it("rejects garbage tokens with a clear Indonesian message", () => {
      expect(() => parseExcludeList("13, abc, 20")).toThrow(
        "Nomor pengecualian \"abc\" tidak valid"
      );
      expect(() => parseExcludeList("25-20")).toThrow(
        "nomor awal (25) lebih besar dari nomor akhir (20)"
      );
    });
  });

  describe("expandRow()", () => {
    it("expands rows skipping excluded numbers", () => {
      const bloks = expandRow({
        prefix: "A",
        nomorMulai: 1,
        nomorAkhir: 5,
        kecuali: [2, 4],
      });
      expect(bloks).toEqual(["A-1", "A-3", "A-5"]);
    });

    it("throws error when start > end", () => {
      expect(() =>
        expandRow({
          prefix: "A",
          nomorMulai: 10,
          nomorAkhir: 5,
        })
      ).toThrow("Nomor mulai (10) tidak boleh lebih besar dari nomor akhir (5)");
    });
  });

  describe("detectRowOverlaps()", () => {
    it("detects intersecting number ranges within the same prefix", () => {
      const conflicts = detectRowOverlaps([
        { prefix: "A", nomorMulai: 1, nomorAkhir: 10 },
        { prefix: "B", nomorMulai: 1, nomorAkhir: 10 },
        { prefix: "A", nomorMulai: 8, nomorAkhir: 15 },
      ]);

      expect(conflicts.length).toBe(1);
      expect(conflicts[0].rowAIndex).toBe(0);
      expect(conflicts[0].rowBIndex).toBe(2);
      expect(conflicts[0].prefix).toBe("A");
      expect(conflicts[0].overlappingNumbers).toEqual([8, 9, 10]);
    });

    it("returns empty array when there are no overlaps", () => {
      const conflicts = detectRowOverlaps([
        { prefix: "A", nomorMulai: 1, nomorAkhir: 5 },
        { prefix: "A", nomorMulai: 6, nomorAkhir: 10 },
        { prefix: "B", nomorMulai: 1, nomorAkhir: 10 },
      ]);
      expect(conflicts).toEqual([]);
    });
  });
});
