// tests/unit/profile-settings.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma";

const { mockSessionState, mockDbState, mockPrisma } = vi.hoisted(() => {
  const mockSessionState = {
    user: {
      id: "1",
      role: "MARKETING",
      name: "Budi Santoso",
    } as { id: string; role: string; name?: string } | null,
  };

  const initialHashed = "$2a$10$wT5i8mO8zC83W9E3vS9Oue5E0b2l0Q.0P4dD5P29M6Uo1J1h7lqGi"; // dummy bcrypt hash

  const mockDbState = {
    user: {
      id: 1,
      nama: "Budi Santoso",
      username: "budis",
      password: initialHashed,
      role: "MARKETING",
      isActive: true,
      no_hp: "081234567890",
    },
  };

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  return { mockSessionState, mockDbState, mockPrisma };
});

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => {
    if (!mockSessionState.user) return null;
    return {
      user: {
        id: mockSessionState.user.id,
        role: mockSessionState.user.role,
        name: mockSessionState.user.name,
      },
    };
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  updateProfileAction,
  changePasswordAction,
} from "@/actions/profile.action";

describe("Profile Settings Server Actions & Security Tests", () => {
  const initialPasswordPlain = "OldPassword123!";
  let initialPasswordHash: string;

  beforeEach(() => {
    vi.clearAllMocks();
    initialPasswordHash = bcrypt.hashSync(initialPasswordPlain, 10);

    mockSessionState.user = {
      id: "1",
      role: "MARKETING",
      name: "Budi Santoso",
    };

    mockDbState.user = {
      id: 1,
      nama: "Budi Santoso",
      username: "budis",
      password: initialPasswordHash,
      role: "MARKETING",
      isActive: true,
      no_hp: "081234567890",
    };

    mockPrisma.user.findUnique.mockImplementation(
      async ({ where }: { where: { id?: number; username?: string } }) => {
        if (where.id === 1) return { ...mockDbState.user };
        if (where.id === 2) {
          return {
            id: 2,
            nama: "Admin NPKR",
            username: "admin_npkr",
            password: initialPasswordHash,
            role: "ADMIN",
            isActive: true,
            no_hp: "081234567891",
          };
        }
        if (where.username === "taken_username") {
          return { id: 99, username: "taken_username" };
        }
        return null;
      }
    );

    mockPrisma.user.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => {
        mockDbState.user = { ...mockDbState.user, ...data } as typeof mockDbState.user;
        return { ...mockDbState.user };
      }
    );
  });

  describe("1. Informasi Akun (updateProfileAction)", () => {
    it("should successfully update nama and username", async () => {
      const result = await updateProfileAction({
        nama: "Budi Santoso S.T.",
        username: "budis_new",
      });

      expect(result.success).toBe(true);
      expect(result.data?.nama).toBe("Budi Santoso S.T.");
      expect(result.data?.username).toBe("budis_new");
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          nama: "Budi Santoso S.T.",
          username: "budis_new",
        },
        select: {
          id: true,
          nama: true,
          username: true,
        },
      });
    });

    it("should normalize username to lowercase", async () => {
      const result = await updateProfileAction({
        nama: "Budi Santoso",
        username: "BudiS_New",
      });

      expect(result.success).toBe(true);
      expect(result.data?.username).toBe("budis_new");
    });

    it("should reject update if no changes were made", async () => {
      const result = await updateProfileAction({
        nama: "Budi Santoso",
        username: "budis",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Tidak ada perubahan");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should reject empty or too short nama", async () => {
      const result = await updateProfileAction({
        nama: "A",
        username: "budis_valid",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("minimal 2 karakter");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should reject username with invalid characters or spaces", async () => {
      const result = await updateProfileAction({
        nama: "Budi Santoso",
        username: "budi santoso!",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Username hanya boleh berisi");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should reject username that is already taken by another user", async () => {
      const result = await updateProfileAction({
        nama: "Budi Santoso",
        username: "taken_username",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("sudah digunakan oleh akun lain");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should gracefully handle database P2002 unique constraint race condition", async () => {
      mockPrisma.user.update.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "7.10.0",
        })
      );

      const result = await updateProfileAction({
        nama: "Budi Santoso",
        username: "budis_race",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("sudah digunakan oleh akun lain");
    });
  });

  describe("2. Fitur Ubah Password (changePasswordAction)", () => {
    it("should successfully change password when old password is correct and new password is valid", async () => {
      const result = await changePasswordAction({
        currentPassword: initialPasswordPlain,
        newPassword: "BrandNewPassword456!",
        confirmPassword: "BrandNewPassword456!",
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("berhasil diubah");

      // Verify DB update was called
      expect(mockPrisma.user.update).toHaveBeenCalled();
      const updateCall = mockPrisma.user.update.mock.calls[0][0];
      const savedHash = updateCall.data.password;

      // Verify new password hashes match and old password fails
      expect(bcrypt.compareSync("BrandNewPassword456!", savedHash)).toBe(true);
      expect(bcrypt.compareSync(initialPasswordPlain, savedHash)).toBe(false);
    });

    it("should reject when current password is wrong", async () => {
      const result = await changePasswordAction({
        currentPassword: "WrongPassword999!",
        newPassword: "BrandNewPassword456!",
        confirmPassword: "BrandNewPassword456!",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Password saat ini tidak sesuai");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should reject when new password is less than 8 characters", async () => {
      const result = await changePasswordAction({
        currentPassword: initialPasswordPlain,
        newPassword: "short",
        confirmPassword: "short",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("minimal 8 karakter");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should reject when new password does not match confirmation", async () => {
      const result = await changePasswordAction({
        currentPassword: initialPasswordPlain,
        newPassword: "BrandNewPassword456!",
        confirmPassword: "MismatchPassword789!",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("tidak sesuai dengan password baru");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should reject when new password is identical to current password", async () => {
      const result = await changePasswordAction({
        currentPassword: initialPasswordPlain,
        newPassword: initialPasswordPlain,
        confirmPassword: initialPasswordPlain,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("tidak boleh sama dengan password saat ini");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("3. Otorisasi & Pencegahan Manipulasi", () => {
    it("should allow ADMIN to update own profile", async () => {
      mockSessionState.user = {
        id: "2",
        role: "ADMIN",
        name: "Admin NPKR",
      };

      const result = await updateProfileAction({
        nama: "Super Admin NPKR",
        username: "admin_npkr",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2 },
          data: { nama: "Super Admin NPKR", username: "admin_npkr" },
        })
      );
    });

    it("should allow MANAGER to update own profile", async () => {
      mockSessionState.user = {
        id: "1",
        role: "MANAGER",
        name: "Branch Manager",
      };

      const result = await updateProfileAction({
        nama: "Branch Manager Senior",
        username: "budis",
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { nama: "Branch Manager Senior", username: "budis" },
        })
      );
    });

    it("should reject unauthenticated request for updateProfileAction", async () => {
      mockSessionState.user = null;

      const result = await updateProfileAction({
        nama: "Hacker Attempt",
        username: "hacker",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Sesi Anda tidak valid");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should reject unauthenticated request for changePasswordAction", async () => {
      mockSessionState.user = null;

      const result = await changePasswordAction({
        currentPassword: initialPasswordPlain,
        newPassword: "BrandNewPassword456!",
        confirmPassword: "BrandNewPassword456!",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Sesi Anda tidak valid");
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should strictly ignore client-injected role or id mutations", async () => {
      // Even if unknown fields are passed into action payload
      const payloadWithInjectedRole = {
        nama: "Budi Santoso Updated",
        username: "budis_updated",
        role: "DIRECTOR", // Attempt privilege escalation
        id: 9999, // Attempt modifying other user
      };

      const result = await updateProfileAction(
        payloadWithInjectedRole as unknown as { nama: string; username: string }
      );

      expect(result.success).toBe(true);
      // Prisma update is strictly scoped to where: { id: 1 } (from session)
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          nama: "Budi Santoso Updated",
          username: "budis_updated",
        },
        select: {
          id: true,
          nama: true,
          username: true,
        },
      });
      // Role in DB remains unaffected
      expect(mockDbState.user.role).toBe("MARKETING");
    });
  });
});
