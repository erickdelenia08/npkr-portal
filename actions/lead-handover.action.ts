// actions/lead-handover.action.ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface EligiblePIC {
  id: number;
  nama: string;
  role: string;
  no_hp: string;
}

/**
 * Fetch all active users eligible to become PIC (Marketing and Admin)
 */
export async function getEligiblePICs(): Promise<ActionResponse<EligiblePIC[]>> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Silakan login kembali." };
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ["MARKETING", "ADMIN", "MANAGER"] },
      },
      select: {
        id: true,
        nama: true,
        role: true,
        no_hp: true,
      },
      orderBy: [{ role: "asc" }, { nama: "asc" }],
    });

    return {
      success: true,
      data: users,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memuat daftar personel PIC.";
    return { success: false, error: message };
  }
}

/**
 * Handover PIC responsibility for a lead and its active transactions.
 * Only the current PIC or an Admin can perform handover.
 */
export async function handoverLead(
  leadId: number,
  newMarketingId: number,
  catatan?: string
): Promise<ActionResponse> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const currentUserId = Number((session.user as { id?: string | number }).id);
  const currentUserRole = session.user.role;

  if (!Number.isSafeInteger(currentUserId) || currentUserId <= 0) {
    return { success: false, error: "Sesi tidak valid. Silakan login kembali." };
  }

  if (!Number.isSafeInteger(leadId) || leadId <= 0) {
    return { success: false, error: "ID Lead tidak valid." };
  }

  if (!Number.isSafeInteger(newMarketingId) || newMarketingId <= 0) {
    return { success: false, error: "Silakan pilih personel PIC baru." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch Lead
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
        include: {
          marketing: {
            select: { id: true, nama: true },
          },
          itj: {
            select: { id: true },
          },
        },
      });

      if (!lead) {
        throw new Error("Data lead tidak ditemukan.");
      }

      // 2. Authorization Guard: Current PIC, Admin, or Manager
      const canHandover =
        currentUserRole === "ADMIN" ||
        currentUserRole === "MANAGER" ||
        currentUserId === lead.marketing_id;

      if (!canHandover) {
        throw new Error(
          "Anda tidak memiliki izin untuk mengalihkan PIC lead ini. Hanya PIC saat ini, Admin, atau Manager yang diperkenankan."
        );
      }

      // 3. Validate Target User
      const targetUser = await tx.user.findUnique({
        where: { id: newMarketingId, isActive: true },
        select: { id: true, nama: true, role: true },
      });

      if (!targetUser) {
        throw new Error("Personel PIC baru tidak ditemukan atau tidak aktif.");
      }

      if (lead.marketing_id === newMarketingId) {
        throw new Error(
          `Lead ini sudah ditugaskan kepada ${targetUser.nama}. Silakan pilih personel lain.`
        );
      }

      const now = new Date();
      const prevPicName = lead.marketing?.nama || "Sebelumnya";

      // 4. Update Lead marketing_id (PIC baru). Do NOT touch original_marketing_id!
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          marketing_id: newMarketingId,
          last_activity_at: now,
        },
      });

      // 5. Update active Transaksi if any
      const updatedTrx = await tx.transaksi.updateMany({
        where: {
          itj: { lead_id: lead.id },
          status_transaksi: { not: "BATAL" },
        },
        data: {
          marketing_id: newMarketingId,
        },
      });

      // 6. Create audit log in Aktivitas
      const cleanNote = catatan?.trim() ? ` Catatan: ${catatan.trim()}` : "";
      await tx.aktivitas.create({
        data: {
          lead_id: lead.id,
          user_id: currentUserId,
          jenis: "LAINNYA",
          hasil: "TERTARIK",
          catatan: `[HANDOVER PIC] Tanggung jawab operasional dialihkan dari ${prevPicName} ke ${targetUser.nama}.${cleanNote}`,
          created_at: now,
        },
      });

      return {
        targetName: targetUser.nama,
        trxCount: updatedTrx.count,
      };
    });

    // 7. Path revalidation
    revalidatePath(`/marketing/lead/${leadId}`);
    revalidatePath("/marketing/lead");
    revalidatePath("/admin/lead");
    revalidatePath("/manager/lead");
    revalidatePath("/admin/transaksi");
    revalidatePath("/marketing/transaksi");
    revalidatePath("/manager/transaksi");
    revalidatePath("/manager/aktivitas");

    return {
      success: true,
      message: `PIC berhasil dialihkan ke ${result.targetName}.${
        result.trxCount > 0 ? ` (${result.trxCount} transaksi berjalan ikut diperbarui)` : ""
      }`,
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat mengalihkan PIC lead.";
    return { success: false, error: errorMsg };
  }
}
