// schemas/user.schema.ts
import { z } from "zod";

export const userRoleEnum = z.enum(["MARKETING", "ADMIN", "MANAGER"]);
export type UserRole = z.infer<typeof userRoleEnum>;

export const createUserSchema = z.object({
  nama: z.string().trim().min(2, "Nama lengkap minimal 2 karakter"),
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter")
    .max(30, "Username maksimal 30 karakter")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "Username hanya boleh berisi huruf, angka, titik, minus, dan underscore"
    ),
  no_hp: z
    .string()
    .trim()
    .min(8, "Nomor HP minimal 8 digit")
    .max(20, "Nomor HP maksimal 20 digit")
    .regex(/^[0-9+\-\s]+$/, "Format nomor HP tidak valid"),
  role: userRoleEnum.default("MARKETING"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  nama: z.string().trim().min(2, "Nama lengkap minimal 2 karakter"),
  no_hp: z
    .string()
    .trim()
    .min(8, "Nomor HP minimal 8 digit")
    .max(20, "Nomor HP maksimal 20 digit")
    .regex(/^[0-9+\-\s]+$/, "Format nomor HP tidak valid"),
  role: userRoleEnum,
  password: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 6,
      "Password baru minimal 6 karakter jika diisi"
    ),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
