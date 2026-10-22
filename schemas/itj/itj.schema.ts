
import { z } from "zod";

const integerId = z.preprocess(
  (value) => {
    if (typeof value === "string" && /^\d+$/.test(value)) {
      return Number(value);
    }
    return value;
  },
  z.number().int().positive()
);

const rupiahAmount = (minimum: number, message: string) =>
  z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined
        ? NaN
        : typeof value === "string" || typeof value === "number"
          ? Number(value)
          : value,
    z.number().finite().min(minimum, message)
  );

export const itjSchema = z
  .object({
    leadId: integerId,

    nik: z
      .string()
      .trim()
      .regex(/^\d{16}$/, "NIK harus terdiri dari 16 digit"),

    namaKtp: z.string().trim().min(1, "Nama pada KTP wajib diisi"),
    tempatLahir: z.string().trim().min(1, "Tempat lahir wajib diisi"),

    tglLahir: z
      .string()
      .min(1, "Tanggal lahir wajib diisi")
      .date("Tanggal lahir tidak valid"),

    alamatKtp: z.string().trim().min(1, "Alamat KTP wajib diisi"),

    unitId: integerId,

    hargaDeal: rupiahAmount(1, "Harga deal harus lebih dari Rp0"),

    targetItj: rupiahAmount(
      300000,
      "Target total ITJ minimal Rp300.000"
    ),

    nominalDibayar: rupiahAmount(
      300000,
      "ITJ dibayar saat ini minimal Rp300.000"
    ),

    targetDp: rupiahAmount(0, "Target DP minimal Rp0"),

    metodeBayar: z.enum(["KPR", "CASH_KERAS", "CASH_TEMPO"]),

    tenor: z.preprocess(
      (value) =>
        value === "" || value === undefined || value === null
          ? undefined
          : typeof value === "string" || typeof value === "number"
            ? Number(value)
            : value,
      z.number().int().positive().optional()
    ),
  })
  .superRefine((data, ctx) => {
    if (data.metodeBayar === "KPR" && data.tenor === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["tenor"],
        message: "Tenor wajib diisi untuk metode KPR",
      });
    }
    if (data.nominalDibayar > data.targetItj) {
      ctx.addIssue({
        code: "custom",
        path: ["nominalDibayar"],
        message: "ITJ dibayar saat ini tidak boleh melebihi target total ITJ",
      });
    }
  });

export type ItjInput = z.infer<typeof itjSchema>;
