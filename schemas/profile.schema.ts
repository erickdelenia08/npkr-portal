// schemas/profile.schema.ts
import { z } from "zod";

/**
 * Validation schema for updating user personal profile (Nama & Username).
 */
export const updateProfileSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(2, "Nama lengkap minimal 2 karakter.")
    .max(100, "Nama lengkap maksimal 100 karakter."),
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter.")
    .max(30, "Username maksimal 30 karakter.")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "Username hanya boleh berisi huruf, angka, titik (.), minus (-), dan underscore (_)."
    ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

/**
 * Validation schema for updating account security / password.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Password saat ini wajib diisi."),
    newPassword: z
      .string()
      .min(8, "Password baru minimal 8 karakter.")
      .max(100, "Password baru maksimal 100 karakter."),
    confirmPassword: z
      .string()
      .min(8, "Konfirmasi password baru minimal 8 karakter."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password baru tidak sesuai dengan password baru.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Password baru tidak boleh sama dengan password saat ini.",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
