"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { itjSchema } from "@/schemas/itj/itj.schema";
import { StatusItj } from "@/generated/prisma";

export async function submitITJ(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  leadId?: number;
}> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const role = (session.user as { role?: string }).role;

  if (role !== "MARKETING") {
    return {
      success: false,
      error: "Kamu tidak memiliki izin untuk mengajukan ITJ.",
    };
  }

  const userId = Number(
    (session.user as { id?: string | number }).id
  );

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return {
      success: false,
      error: "ID pengguna tidak valid. Silakan login kembali.",
    };
  }

  const raw = {
    leadId: formData.get("leadId"),
    nik: formData.get("nik"),
    namaKtp: formData.get("namaKtp"),
    tempatLahir: formData.get("tempatLahir"),
    tglLahir: formData.get("tglLahir"),
    alamatKtp: formData.get("alamatKtp"),
    unitId: formData.get("unitId"),
    nominalItj: formData.get("nominalItj"),
    targetDp: formData.get("targetDp"),
    metodeBayar: formData.get("metodeBayar"),
    tenor: formData.get("tenor") || undefined,
  };

  const parsed = itjSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Data ITJ tidak valid.",
    };
  }

  const data = parsed.data;

  try {
    let leadTargetId = data.leadId;

    await prisma.$transaction(async (tx) => {
      // 1. Pastikan lead tersedia dan ambil relasi customer serta itj terakhir.
      const lead = await tx.lead.findUnique({
        where: { id: data.leadId },
        include: {
          customer: true,
          itj: {
            orderBy: { id: "desc" },
            take: 1,
          },
        },
      });

      if (!lead) {
        throw new Error("Lead tidak ditemukan.");
      }

      leadTargetId = lead.id;

      if (
        lead.marketing_id !== null &&
        lead.marketing_id !== userId
      ) {
        throw new Error("Lead ini bukan tanggung jawab kamu.");
      }

      // 1. Authorization: Only allow access if survei_selesai_at is NOT null, and the lead is not Lost/Closed
      if (!lead.survei_selesai_at) {
        throw new Error("Pengajuan ITJ hanya dapat dilakukan setelah survei lokasi selesai.");
      }

      if (lead.lost_at !== null) {
        throw new Error("Lead yang berstatus LOST tidak dapat diajukan ITJ.");
      }

      if (lead.closing_at !== null) {
        throw new Error("Lead ini sudah berstatus Closing.");
      }

      // 2. Pastikan unit ada dan kategorinya sesuai.
      const unit = await tx.masterUnit.findUnique({
        where: { id: data.unitId },
        include: { tipe: true },
      });

      if (!unit) {
        throw new Error("Unit tidak ditemukan.");
      }

      if (
        unit.tipe.kategori === "KAVLING" &&
        data.metodeBayar === "KPR"
      ) {
        throw new Error("Metode KPR tidak tersedia untuk unit kavling.");
      }

      // 3. Cek apakah ada ITJ sebelumnya (revisi atau baru)
      const existingItj = lead.itj[0] || null;
      const isRevising =
        existingItj &&
        (existingItj.status === "PERLU_REVISI" || existingItj.status === "DITOLAK");

      if (existingItj && existingItj.status === "DIAJUKAN") {
        throw new Error("Pengajuan ITJ untuk lead ini sedang dalam proses review.");
      }

      // Validasi ketersediaan unit
      if (unit.status_unit !== "AVAILABLE") {
        const isSameHeldUnit = isRevising && existingItj.unit_id === data.unitId && unit.status_unit === "HOLD";
        if (!isSameHeldUnit) {
          throw new Error("Unit sudah tidak tersedia. Silakan pilih unit lain.");
        }
      }

      // 4. Kunci unit menjadi HOLD
      if (isRevising && existingItj.unit_id !== data.unitId) {
        // Lepas unit sebelumnya menjadi AVAILABLE
        await tx.masterUnit.update({
          where: { id: existingItj.unit_id },
          data: { status_unit: "AVAILABLE" },
        });
        // Kunci unit baru menjadi HOLD
        await tx.masterUnit.update({
          where: { id: data.unitId },
          data: { status_unit: "HOLD" },
        });
      } else {
        await tx.masterUnit.update({
          where: { id: data.unitId },
          data: { status_unit: "HOLD" },
        });
      }

      // 5. Update atau Buat Customer
      let customerId: number;
      if (lead.customer) {
        await tx.customer.update({
          where: { id: lead.customer.id },
          data: {
            nama_ktp: data.namaKtp,
            nik: data.nik,
            tempat_lahir: data.tempatLahir,
            tgl_lahir: new Date(`${data.tglLahir}T00:00:00.000Z`),
            alamat_ktp: data.alamatKtp,
            no_hp: lead.no_hp,
          },
        });
        customerId = lead.customer.id;
      } else {
        const createdCustomer = await tx.customer.create({
          data: {
            lead_id: lead.id,
            nama_ktp: data.namaKtp,
            nik: data.nik,
            tempat_lahir: data.tempatLahir,
            tgl_lahir: new Date(`${data.tglLahir}T00:00:00.000Z`),
            alamat_ktp: data.alamatKtp,
            no_hp: lead.no_hp,
          },
        });
        customerId = createdCustomer.id;
      }

      // 6. Buat atau Update record ITJ
      if (isRevising) {
        await tx.itj.update({
          where: { id: existingItj.id },
          data: {
            unit_id: unit.id,
            status: "DIAJUKAN",
            nik: data.nik,
            nama_ktp: data.namaKtp,
            nominal: data.nominalItj,
            target_dp: data.targetDp,
            metode_bayar: data.metodeBayar,
            tenor: data.metodeBayar === "KPR" ? data.tenor ?? null : null,
            diajukan_at: new Date(),
            diputuskan_at: null,
            diputuskan_oleh: null,
          },
        });
      } else {
        await tx.itj.create({
          data: {
            lead_id: lead.id,
            unit_id: unit.id,
            status: "DIAJUKAN",
            nik: data.nik,
            nama_ktp: data.namaKtp,
            nominal: data.nominalItj,
            target_dp: data.targetDp,
            metode_bayar: data.metodeBayar,
            tenor: data.metodeBayar === "KPR" ? data.tenor ?? null : null,
            diajukan_at: new Date(),
          },
        });
      }

      // 7. Buat atau update transaksi ITJ
      const hargaDeal = unit.harga_khusus ?? unit.tipe.harga_dasar;
      const existingTransaksi = await tx.transaksi.findFirst({
        where: { customer_id: customerId },
      });

      if (existingTransaksi) {
        await tx.transaksi.update({
          where: { id: existingTransaksi.id },
          data: {
            unit_id: unit.id,
            metode_bayar: data.metodeBayar,
            harga_deal: hargaDeal,
            target_itj: data.nominalItj,
            target_dp: data.targetDp,
            tenor_bulan: data.metodeBayar === "KPR" ? data.tenor ?? null : null,
            status_transaksi: "ITJ_DIAJUKAN",
          },
        });
      } else {
        await tx.transaksi.create({
          data: {
            customer_id: customerId,
            unit_id: unit.id,
            marketing_id: userId,
            metode_bayar: data.metodeBayar,
            harga_deal: hargaDeal,
            target_itj: data.nominalItj,
            target_dp: data.targetDp,
            tenor_bulan: data.metodeBayar === "KPR" ? data.tenor ?? null : null,
            status_transaksi: "ITJ_DIAJUKAN",
          },
        });
      }

      // 8. Catat riwayat aktivitas
      await tx.aktivitas.create({
        data: {
          lead_id: lead.id,
          jenis: "LAINNYA",
          hasil: "TERTARIK",
          catatan: `${isRevising ? "[REVISI ITJ]" : "[PENGAJUAN ITJ]"} Blok ${unit.blok} sebesar Rp ${Number(data.nominalItj).toLocaleString("id-ID")}`,
        },
      });
    });

    revalidatePath(`/marketing/lead/${leadTargetId}`);
    revalidatePath("/marketing/lead");
    revalidatePath("/admin/validasi-itj");
    revalidatePath("/manager/itj");
    return { success: true, leadId: leadTargetId };
  } catch (error: unknown) {
    console.error("submitITJ error:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return {
      success: false,
      error: "Terjadi kesalahan saat menyimpan transaksi ITJ.",
    };
  }
}

// ──────────────────────────────────────────────────────────
// ADMIN / MANAGER ACTIONS — Approve / Reject / Review ITJ
// ──────────────────────────────────────────────────────────

interface ITJActionResponse {
  success: boolean;
  error?: string;
}

/**
 * Review an ITJ submission (DIAJUKAN, PERLU_REVISI, DISETUJUI, DITOLAK).
 */
export async function reviewITJ(
  itjId: number,
  keputusan: StatusItj,
  catatan?: string
): Promise<ITJActionResponse> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return {
      success: false,
      error: "Hanya Admin atau Manager yang dapat mereview pengajuan ITJ.",
    };
  }

  const reviewerId = Number(session.user.id);

  // Validate mandatory note for PERLU_REVISI or DITOLAK
  if (
    (keputusan === "PERLU_REVISI" || keputusan === "DITOLAK") &&
    (!catatan || !catatan.trim())
  ) {
    return {
      success: false,
      error:
        keputusan === "PERLU_REVISI"
          ? "Catatan revisi wajib diisi agar marketing mengetahui data yang perlu diperbaiki."
          : "Catatan alasan penolakan ITJ wajib diisi.",
    };
  }

  const effectiveCatatan = catatan?.trim() || (keputusan === "DISETUJUI" ? "Pengajuan ITJ disetujui" : null);

  try {
    let leadTargetId: number | null = null;

    await prisma.$transaction(async (tx) => {
      const itj = await tx.itj.findUnique({
        where: { id: itjId },
        include: { unit: true, lead: true },
      });

      if (!itj) {
        throw new Error("Pengajuan ITJ tidak ditemukan.");
      }

      leadTargetId = itj.lead_id;

      // 1. Update Itj status
      await tx.itj.update({
        where: { id: itjId },
        data: {
          status: keputusan,
          diputuskan_at: new Date(),
          diputuskan_oleh: reviewerId,
        },
      });

      // 2. Record Review entry
      await tx.itjReview.create({
        data: {
          itj_id: itjId,
          reviewer_id: reviewerId,
          keputusan,
          catatan: effectiveCatatan,
        },
      });

      // 3. Side effects based on decision
      if (keputusan === "DISETUJUI") {
        // Sets MasterUnit to SOLD
        await tx.masterUnit.update({
          where: { id: itj.unit_id },
          data: { status_unit: "SOLD" },
        });

        // Fills the closing_at milestone date on the parent Lead model
        await tx.lead.update({
          where: { id: itj.lead_id },
          data: { closing_at: new Date(), lost_at: null },
        });

        // Update transaksi status
        await tx.transaksi.updateMany({
          where: { unit_id: itj.unit_id },
          data: { status_transaksi: "Pemberkasan Awal" },
        });

        // Log Aktivitas
        await tx.aktivitas.create({
          data: {
            lead_id: itj.lead_id,
            jenis: "LAINNYA",
            hasil: "TERTARIK",
            catatan: `[ITJ DISETUJUI ADMIN] Blok ${itj.unit.blok} berhasil disetujui. Lead resmi Closing.`,
          },
        });
      } else if (keputusan === "DITOLAK") {
        // Changes MasterUnit status back to AVAILABLE
        await tx.masterUnit.update({
          where: { id: itj.unit_id },
          data: { status_unit: "AVAILABLE" },
        });

        // Reset closing_at on lead
        await tx.lead.update({
          where: { id: itj.lead_id },
          data: { closing_at: null },
        });

        // Update transaksi status
        await tx.transaksi.updateMany({
          where: { unit_id: itj.unit_id },
          data: { status_transaksi: "ITJ_DITOLAK" },
        });

        // Log Aktivitas
        await tx.aktivitas.create({
          data: {
            lead_id: itj.lead_id,
            jenis: "LAINNYA",
            hasil: "TIDAK_JADI",
            catatan: `[ITJ DITOLAK ADMIN] ${effectiveCatatan || ""}`,
          },
        });
      } else if (keputusan === "PERLU_REVISI") {
        // Keep unit in HOLD
        await tx.masterUnit.update({
          where: { id: itj.unit_id },
          data: { status_unit: "HOLD" },
        });

        // Reset closing_at
        await tx.lead.update({
          where: { id: itj.lead_id },
          data: { closing_at: null },
        });

        // Update transaksi status
        await tx.transaksi.updateMany({
          where: { unit_id: itj.unit_id },
          data: { status_transaksi: "ITJ_PERLU_REVISI" },
        });

        // Log Aktivitas
        await tx.aktivitas.create({
          data: {
            lead_id: itj.lead_id,
            jenis: "LAINNYA",
            hasil: "TERTARIK",
            catatan: `[ITJ PERLU REVISI] ${effectiveCatatan || ""}`,
          },
        });
      }
    });

    revalidatePath("/admin/itj");
    revalidatePath("/admin/validasi-itj");
    revalidatePath("/manager/itj");
    revalidatePath("/marketing/lead");
    if (leadTargetId) {
      revalidatePath(`/marketing/lead/${leadTargetId}`);
    }
    return { success: true };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal mereview pengajuan ITJ";
    return { success: false, error: errorMsg };
  }
}

export const reviewItj = reviewITJ;


/**
 * Approves a pending ITJ submission.
 */
export async function approveITJ(leadId: number): Promise<ITJActionResponse> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      error: "Hanya Admin yang dapat menyetujui ITJ.",
    };
  }

  const reviewerId = Number(session.user.id);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Find the lead + linked transaction via customer.
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
        include: {
          customer: {
            include: {
              transaksi: { where: { status_transaksi: "ITJ_DIAJUKAN" } },
            },
          },
        },
      });

      if (!lead) {
        throw new Error("Lead tidak ditemukan.");
      }

      const transaksi = lead.customer?.transaksi[0];

      if (!transaksi) {
        throw new Error("Transaksi ITJ tidak ditemukan untuk lead ini.");
      }

      // 2. Mark unit as SOLD.
      await tx.masterUnit.update({
        where: { id: transaksi.unit_id },
        data: { status_unit: "SOLD" },
      });

      // 3. Update transaction status.
      await tx.transaksi.update({
        where: { id: transaksi.id },
        data: { status_transaksi: "ITJ_DITERIMA" },
      });

      // 4. Update Itj record and add ItjReview entry
      const existingItj = await tx.itj.findFirst({
        where: { lead_id: leadId, status: "DIAJUKAN" },
        orderBy: { created_at: "desc" },
      });

      if (existingItj) {
        await tx.itj.update({
          where: { id: existingItj.id },
          data: {
            status: "DISETUJUI",
            diputuskan_at: new Date(),
            diputuskan_oleh: reviewerId,
          },
        });

        await tx.itjReview.create({
          data: {
            itj_id: existingItj.id,
            reviewer_id: reviewerId,
            keputusan: "DISETUJUI",
            catatan: "Disetujui oleh Admin",
          },
        });
      }

      // 5. Ensure lead closing_at is recorded
      await tx.lead.update({
        where: { id: leadId },
        data: { closing_at: new Date() },
      });
    });

    revalidatePath("/admin/validasi-itj");
    revalidatePath("/marketing/lead");
    return { success: true };
  } catch (error: unknown) {
    console.error("approveITJ error:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return {
      success: false,
      error: "Terjadi kesalahan saat menyetujui ITJ.",
    };
  }
}

/**
 * Rejects a pending ITJ submission.
 */
export async function rejectITJ(
  leadId: number,
  catatan: string
): Promise<ITJActionResponse> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  if (session.user.role !== "ADMIN") {
    return {
      success: false,
      error: "Hanya Admin yang dapat menolak ITJ.",
    };
  }

  if (!catatan.trim()) {
    return {
      success: false,
      error: "Catatan penolakan wajib diisi.",
    };
  }

  const reviewerId = Number(session.user.id);

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Find the lead + linked transaction via customer.
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
        include: {
          customer: {
            include: {
              transaksi: { where: { status_transaksi: "ITJ_DIAJUKAN" } },
            },
          },
        },
      });

      if (!lead) {
        throw new Error("Lead tidak ditemukan.");
      }

      const transaksi = lead.customer?.transaksi[0];

      if (!transaksi) {
        throw new Error("Transaksi ITJ tidak ditemukan untuk lead ini.");
      }

      // 2. Release unit → AVAILABLE.
      await tx.masterUnit.update({
        where: { id: transaksi.unit_id },
        data: { status_unit: "AVAILABLE" },
      });

      // 3. Delete the transaction (must go before customer due to FK).
      await tx.transaksi.delete({
        where: { id: transaksi.id },
      });

      // 4. Delete the customer record.
      if (lead.customer) {
        await tx.customer.delete({
          where: { id: lead.customer.id },
        });
      }

      // 5. Update Itj record and create ItjReview
      const existingItj = await tx.itj.findFirst({
        where: { lead_id: leadId, status: "DIAJUKAN" },
        orderBy: { created_at: "desc" },
      });

      if (existingItj) {
        await tx.itj.update({
          where: { id: existingItj.id },
          data: {
            status: "DITOLAK",
            diputuskan_at: new Date(),
            diputuskan_oleh: reviewerId,
          },
        });

        await tx.itjReview.create({
          data: {
            itj_id: existingItj.id,
            reviewer_id: reviewerId,
            keputusan: "DITOLAK",
            catatan: catatan.trim(),
          },
        });
      }

      // 6. Reset closing_at milestone
      await tx.lead.update({
        where: { id: leadId },
        data: { closing_at: null },
      });

      // 7. Log rejection note as an activity.
      await tx.aktivitas.create({
        data: {
          lead_id: leadId,
          jenis: "LAINNYA",
          hasil: "TIDAK_JADI",
          catatan: `[ITJ DITOLAK ADMIN] ${catatan.trim()}`,
        },
      });
    });

    revalidatePath("/admin/validasi-itj");
    revalidatePath("/marketing/lead");
    return { success: true };
  } catch (error: unknown) {
    console.error("rejectITJ error:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return {
      success: false,
      error: "Terjadi kesalahan saat menolak ITJ.",
    };
  }
}

export const submitItj = submitITJ;
