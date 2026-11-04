// actions/transaksi-handover.action.ts
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity/log";
import { ActionResponse, EligiblePIC } from "@/actions/lead-handover.action";

export type { ActionResponse, EligiblePIC };

/**
 * Handover PIC responsibility for a Transaksi.
 * STRICT BUSINESS RULES:
 * - Only changes Transaksi.pic_id.
 * - MUST NOT change Lead.marketing_id.
 * - MUST NOT change Itj.closer_id.
 * - LOCKED if Transaksi is finished (BAST / tgl_bast != null) or cancelled (BATAL).
 * - Only the current Transaksi PIC, an Admin, or a Manager can perform handover.
 */
export async function handoverTransaksi(
  transaksiId: number,
  newPicId: number,
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

  if (!Number.isSafeInteger(transaksiId) || transaksiId <= 0) {
    return { success: false, error: "ID Transaksi tidak valid." };
  }

  if (!Number.isSafeInteger(newPicId) || newPicId <= 0) {
    return { success: false, error: "Silakan pilih personel PIC baru." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch Transaksi with relations
      const trx = await tx.transaksi.findUnique({
        where: { id: transaksiId },
        include: {
          pic: {
            select: { id: true, nama: true },
          },
          unit: {
            select: { id: true, blok: true },
          },
          itj: {
            select: {
              id: true,
              lead_id: true,
              closer_id: true,
              lead: {
                select: { id: true, nama: true, marketing_id: true },
              },
            },
          },
        },
      });

      if (!trx) {
        throw new Error("Data transaksi tidak ditemukan.");
      }

      // 2. Authorization Guard: Current Transaksi PIC, Admin, or Manager
      const canHandover =
        currentUserRole === "ADMIN" ||
        currentUserRole === "MANAGER" ||
        currentUserId === trx.pic_id;

      if (!canHandover) {
        throw new Error(
          "Anda tidak memiliki izin untuk mengalihkan PIC transaksi ini. Hanya PIC saat ini, Admin, atau Manager yang diperkenankan."
        );
      }

      // 3. Status Guard: BAST or BATAL locked
      if (trx.tahap_detail === "BAST" || trx.tgl_bast != null) {
        throw new Error(
          "Transaksi yang sudah selesai (BAST) tidak dapat dialihkan (handover terkunci)."
        );
      }

      if (trx.tahap_detail === "BATAL" || trx.cancelled_at != null) {
        throw new Error(
          "Transaksi yang sudah dibatalkan (BATAL) tidak dapat dialihkan."
        );
      }

      // 4. Validate Target User
      const targetUser = await tx.user.findUnique({
        where: { id: newPicId, isActive: true },
        select: { id: true, nama: true, role: true },
      });

      if (!targetUser) {
        throw new Error("Personel PIC baru tidak ditemukan atau tidak aktif.");
      }

      if (trx.pic_id === newPicId) {
        throw new Error(
          `Transaksi ini sudah ditugaskan kepada ${targetUser.nama}. Silakan pilih personel lain.`
        );
      }

      const now = new Date();
      const prevPicName = trx.pic?.nama || "Sebelumnya";

      // 5. Update Transaksi.pic_id ONLY.
      // DILARANG MERUBAH Lead.marketing_id atau Itj.closer_id!
      await tx.transaksi.update({
        where: { id: trx.id },
        data: {
          pic_id: newPicId,
          version: { increment: 1 },
          updated_at: now,
        },
      });

      // 6. Record in Aktivitas (Lead interaction timeline if associated lead exists)
      const cleanNote = catatan?.trim() ? ` Catatan: ${catatan.trim()}` : "";
      if (trx.itj?.lead_id) {
        await tx.aktivitas.create({
          data: {
            lead_id: trx.itj.lead_id,
            user_id: currentUserId,
            jenis: "LAINNYA",
            hasil: "TERTARIK",
            catatan: `[HANDOVER PIC TRANSAKSI] Tanggung jawab transaksi unit ${trx.unit.blok} dialihkan dari ${prevPicName} ke ${targetUser.nama}.${cleanNote}`,
            created_at: now,
          },
        });
      }

      // 7. Record in append-only ActivityLog
      await logActivity(tx, {
        entityType: "TRANSAKSI",
        entityId: trx.id,
        action: "TRANSAKSI_HANDOVER",
        transaksiId: trx.id,
        leadId: trx.itj?.lead_id || null,
        actorId: currentUserId,
        summaryContext: {
          actorName: session.user.name,
          blok: trx.unit.blok,
          oldPicName: prevPicName,
          newPicName: targetUser.nama,
          leadName: trx.itj?.lead?.nama || null,
        },
        before: {
          pic_id: trx.pic_id,
          pic_nama: prevPicName,
        },
        after: {
          pic_id: newPicId,
          pic_nama: targetUser.nama,
        },
      });

      return {
        targetName: targetUser.nama,
        blok: trx.unit.blok,
        leadId: trx.itj?.lead_id || null,
      };
    });

    // 8. Revalidate paths
    revalidatePath(`/admin/transaksi/${transaksiId}`);
    revalidatePath(`/marketing/transaksi/${transaksiId}`);
    revalidatePath(`/manager/transaksi/${transaksiId}`);
    revalidatePath("/admin/transaksi");
    revalidatePath("/marketing/transaksi");
    revalidatePath("/manager/transaksi");
    revalidatePath("/manager/aktivitas");
    if (result.leadId) {
      revalidatePath(`/marketing/lead/${result.leadId}`);
      revalidatePath(`/admin/lead/${result.leadId}`);
      revalidatePath(`/manager/lead/${result.leadId}`);
    }

    return {
      success: true,
      message: `PIC transaksi unit ${result.blok} berhasil dialihkan ke ${result.targetName}.`,
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat mengalihkan PIC transaksi.";
    return { success: false, error: errorMsg };
  }
}
