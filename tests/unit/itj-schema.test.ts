import { describe, it, expect } from "vitest";
import { itjSchema } from "@/schemas/itj/itj.schema";

describe("ITJ Schema & Financial Calculations", () => {
  const basePayload = {
    leadId: 1,
    nik: "3508123456789012",
    namaKtp: "Budi Santoso",
    tempatLahir: "Lumajang",
    tglLahir: "1990-05-20",
    alamatKtp: "Jl. Merdeka No. 10",
    unitId: 5,
    hargaDeal: 200000000,
    targetItj: 5000000,
    nominalDibayar: 1000000,
    targetDp: 20000000,
    metodeBayar: "KPR",
    tenor: 120,
  };

  it("validates successful ITJ input with separate target_itj and nominal_dibayar", () => {
    const result = itjSchema.safeParse(basePayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hargaDeal).toBe(200000000);
      expect(result.data.targetItj).toBe(5000000);
      expect(result.data.nominalDibayar).toBe(1000000);
      expect(result.data.targetDp).toBe(20000000);

      // KPR Plafon calculation: Harga Deal - Target DP
      const plafonKpr = result.data.hargaDeal - result.data.targetDp;
      expect(plafonKpr).toBe(180000000);
    }
  });

  it("rejects when nominalDibayar is less than 300,000", () => {
    const result = itjSchema.safeParse({
      ...basePayload,
      nominalDibayar: 200000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/minimal Rp300\.000/i);
    }
  });

  it("rejects when nominalDibayar exceeds targetItj", () => {
    const result = itjSchema.safeParse({
      ...basePayload,
      targetItj: 1000000,
      nominalDibayar: 2000000,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/tidak boleh melebihi/i);
    }
  });

  it("requires tenor when metodeBayar is KPR", () => {
    const result = itjSchema.safeParse({
      ...basePayload,
      metodeBayar: "KPR",
      tenor: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("allows non-KPR payment methods without tenor", () => {
    const result = itjSchema.safeParse({
      ...basePayload,
      metodeBayar: "CASH_KERAS",
      tenor: undefined,
    });
    expect(result.success).toBe(true);
  });
});
