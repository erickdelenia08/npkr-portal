// actions/profile.action.ts
"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  updateProfileSchema,
  changePasswordSchema,
  type UpdateProfileInput,
  type ChangePasswordInput,
} from "@/schemas/profile.schema";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * Updates full name and username for the currently authenticated user.
 * Enforces strict session ownership, prevents updating other users,
 * checks for un-changed submissions, and handles duplicate username constraints.
 */
export async function updateProfileAction(
  input: UpdateProfileInput
): Promise<ActionResponse<{ nama: string; username: string }>> {
  try {
    // 1. Authorize session from server
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.",
      };
    }

    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return {
        success: false,
        error: "Identitas pengguna sesi tidak valid.",
      };
    }

    // 2. Validate input on the server
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Data profil tidak valid.",
      };
    }

    const targetNama = parsed.data.nama.trim();
    const targetUsername = parsed.data.username.trim().toLowerCase();

    // 3. Retrieve current user record from database
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nama: true,
        username: true,
        isActive: true,
      },
    });

    if (!currentUser || !currentUser.isActive) {
      return {
        success: false,
        error: "Akun pengguna tidak ditemukan atau sudah dinonaktifkan.",
      };
    }

    // 4. Check if there are actual changes
    const isNamaSame = currentUser.nama.trim() === targetNama;
    const isUsernameSame = currentUser.username.trim().toLowerCase() === targetUsername;

    if (isNamaSame && isUsernameSame) {
      return {
        success: false,
        error: "Tidak ada perubahan data yang disimpan.",
      };
    }

    // 5. Pre-check uniqueness if username has changed
    if (!isUsernameSame) {
      const existingUser = await prisma.user.findUnique({
        where: { username: targetUsername },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== userId) {
        return {
          success: false,
          error: `Username "${targetUsername}" sudah digunakan oleh akun lain. Silakan pilih username lain.`,
        };
      }
    }

    // 6. Perform atomic update in DB
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        nama: targetNama,
        username: targetUsername,
      },
      select: {
        id: true,
        nama: true,
        username: true,
      },
    });

    revalidatePath("/profile/settings");

    return {
      success: true,
      message: "Informasi profil akun berhasil diperbarui.",
      data: {
        nama: updated.nama,
        username: updated.username,
      },
    };
  } catch (error: unknown) {
    // 7. Handle unique constraint race condition
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "Username sudah digunakan oleh akun lain. Silakan pilih username lain.",
      };
    }

    const errorMsg =
      error instanceof Error ? error.message : "Terjadi kesalahan saat memperbarui profil.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Changes password for the currently authenticated user.
 * Enforces old password verification via bcrypt, validates password policy,
 * checks that the new password differs from the current password, and updates safely.
 */
export async function changePasswordAction(
  input: ChangePasswordInput
): Promise<ActionResponse<void>> {
  try {
    // 1. Authorize session from server
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.",
      };
    }

    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return {
        success: false,
        error: "Identitas pengguna sesi tidak valid.",
      };
    }

    // 2. Validate input on the server
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Data password tidak valid.",
      };
    }

    const { currentPassword, newPassword } = parsed.data;

    // 3. Fetch user record with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return {
        success: false,
        error: "Akun pengguna tidak ditemukan atau sudah dinonaktifkan.",
      };
    }

    // 4. Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      return {
        success: false,
        error: "Password saat ini tidak sesuai. Silakan periksa kembali.",
      };
    }

    // 5. Verify new password is not identical to current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return {
        success: false,
        error: "Password baru tidak boleh sama dengan password saat ini.",
      };
    }

    // 6. Hash new password with bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 7. Update password in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return {
      success: true,
      message: "Password berhasil diubah. Gunakan password baru pada sesi login berikutnya.",
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Terjadi kesalahan saat mengubah password.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

