// actions/user.action.ts
"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createUserSchema,
  updateUserSchema,
  CreateUserInput,
  UpdateUserInput,
} from "@/schemas/user.schema";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * Clean phone number helper
 */
function cleanPhoneNumber(noHp: string): string {
  let clean = noHp.replace(/[\s-+]/g, "");
  if (clean.startsWith("62")) {
    clean = "0" + clean.slice(2);
  }
  return clean;
}

/**
 * Creates a new Marketing User account.
 * Role required: MANAGER or ADMIN
 */
export async function createUser(
  data: CreateUserInput
): Promise<ActionResponse<{ id: number; username: string }>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return {
      success: false,
      error: "Hanya Branch Manager atau Admin yang dapat menambahkan akun pengguna.",
    };
  }

  const parsed = createUserSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Data akun tidak valid.",
    };
  }

  const { nama, username, no_hp, password, role: targetRole } = parsed.data;
  const normalizedUsername = username.trim().toLowerCase();
  const normalizedPhone = cleanPhoneNumber(no_hp);

  try {
    // 1. Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingUsername) {
      return {
        success: false,
        error: `Username "${normalizedUsername}" sudah dipakai. Silakan gunakan username lain.`,
      };
    }

    // 2. Check if phone number already exists
    const existingPhone = await prisma.user.findUnique({
      where: { no_hp: normalizedPhone },
    });

    if (existingPhone) {
      return {
        success: false,
        error: `Nomor HP "${normalizedPhone}" sudah terdaftar pada akun lain.`,
      };
    }

    // 3. Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create user record with selected role
    const newUser = await prisma.user.create({
      data: {
        nama: nama.trim(),
        username: normalizedUsername,
        no_hp: normalizedPhone,
        password: hashedPassword,
        role: targetRole,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        nama: true,
        role: true,
      },
    });

    revalidatePath("/manager/tim");
    revalidatePath("/manager/tim-marketing");
    revalidatePath("/manager/lead");

    return {
      success: true,
      message: `Akun ${newUser.role} "${newUser.nama}" (@${newUser.username}) berhasil ditambahkan.`,
      data: { id: newUser.id, username: newUser.username },
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal menambahkan akun pengguna.";
    return { success: false, error: errorMsg };
  }
}

/**
 * Updates an existing Marketing User account.
 * Role required: MANAGER or ADMIN
 */
export async function updateUser(
  userId: number,
  data: UpdateUserInput
): Promise<ActionResponse<{ id: number }>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return {
      success: false,
      error: "Hanya Branch Manager atau Admin yang dapat mengubah data tim.",
    };
  }

  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Data akun tidak valid.",
    };
  }

  const { nama, no_hp, password, role: newRole } = parsed.data;
  const normalizedPhone = cleanPhoneNumber(no_hp);

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return { success: false, error: "Akun pengguna tidak ditemukan." };
    }

    // Check if new phone is already taken by another user
    if (normalizedPhone !== existingUser.no_hp) {
      const duplicatePhone = await prisma.user.findUnique({
        where: { no_hp: normalizedPhone },
      });

      if (duplicatePhone) {
        return {
          success: false,
          error: `Nomor HP "${normalizedPhone}" sudah dipakai oleh pengguna lain.`,
        };
      }
    }

    // Build update data
    const updateData: {
      nama: string;
      no_hp: string;
      role: "MARKETING" | "ADMIN" | "MANAGER";
      password?: string;
    } = {
      nama: nama.trim(),
      no_hp: normalizedPhone,
      role: newRole,
    };

    // If password provided, hash and update
    if (password && password.trim().length >= 6) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    revalidatePath("/manager/tim");
    revalidatePath("/manager/tim-marketing");
    revalidatePath("/manager/lead");

    return {
      success: true,
      message: `Data akun "${nama}" (${newRole}) berhasil diperbarui.${
        updateData.password ? " Password telah direset." : ""
      }`,
      data: { id: userId },
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal memperbarui data pengguna.";
    return { success: false, error: errorMsg };
  }
}

/**
 * Toggles a user's active status (soft delete / reactivate).
 * Role required: MANAGER or ADMIN
 */
export async function toggleUserStatus(
  userId: number
): Promise<ActionResponse<{ id: number; isActive: boolean }>> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return {
      success: false,
      error: "Hanya Branch Manager atau Admin yang dapat mengubah status akun.",
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "Akun pengguna tidak ditemukan." };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: !user.isActive,
      },
    });

    revalidatePath("/manager/tim");
    revalidatePath("/manager/tim-marketing");
    revalidatePath("/manager/lead");

    return {
      success: true,
      message: `Akun "${user.nama}" berhasil ${
        updated.isActive ? "diaktifkan kembali" : "dinonaktifkan"
      }.`,
      data: { id: updated.id, isActive: updated.isActive },
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal mengubah status akun pengguna.";
    return { success: false, error: errorMsg };
  }
}
