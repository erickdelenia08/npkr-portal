"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getMacroTahap,
  getAllowedDetailsForMetode,
} from "@/lib/transaksi/stage-map";
import {
  parseDateOnlyUTC,
  todayDateOnlyUTC,
} from "@/lib/date/wib";
import {
  Prisma,
  TahapDetail,
  JenisDokumen,
  ItemBAST,
  StatusBAST,
  MetodeBayar,
  StatusDokumen,
} from "@/generated/prisma";
import {
  createPembayaranSchema,
  voidPembayaranSchema,
  verifyDokumenSchema,
  updateTransactionStatusSchema,
  updateProfilPemberkasanSchema,
  simpanJadwalTransaksiSchema,
  type CreatePembayaranInput,
  type VerifyDokumenInput,
  type UpdateTransactionStatusInput,
  type UpdateProfilPemberkasanInput,
  type SimpanJadwalTransaksiInput,
} from "@/schemas/transaksi.schema";
import { getRequiredDocuments } from "@/lib/transaksi/document-rules";
import { applyStage } from "@/lib/transaksi/apply-stage";
import { MAKRO_OF } from "@/lib/transaksi/stage-map";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * Enforces that the current session belongs to an active user with PIC or ADMIN permissions:
 * - Admin: can edit any transaction
 * - Marketing (PIC): can edit transactions where marketing_id === user.id
 * - Manager / Other: read-only mode unless Admin
 */
async function requireCanEditTransaksi(transaksiId?: number) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Silakan login kembali.");
  }

  const userId = Number(session.user.id);
  const role = session.user.role;

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("Sesi pengguna tidak valid.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw new Error("Pengguna tidak aktif atau tidak ditemukan.");
  }

  if (transaksiId) {
    const trx = await prisma.transaksi.findUnique({
      where: { id: transaksiId },
      select: { id: true, pic_id: true },
    });
    if (!trx) {
      throw new Error("Transaksi tidak ditemukan.");
    }
    const canEdit = userId === trx.pic_id || role === "ADMIN";
    if (!canEdit) {
      throw new Error(
        "Hanya PIC Marketing penanggung jawab atau Admin yang dapat memperbarui transaksi ini."
      );
    }
  } else if (role !== "ADMIN") {
    throw new Error("Hanya PIC Marketing atau Admin yang berwenang.");
  }

  return { session, adminId: userId, userId, user };
}

async function requireActiveAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Silakan login kembali.");
  }

  const role = session.user.role;
  if (role !== "ADMIN") {
    throw new Error("Hanya Admin yang berwenang melakukan tindakan ini.");
  }

  const adminId = Number(session.user.id);
  if (!Number.isSafeInteger(adminId) || adminId <= 0) {
    throw new Error("Sesi pengguna tidak valid.");
  }

  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user || !user.isActive || user.role !== "ADMIN") {
    throw new Error("Pengguna tidak aktif atau tidak memiliki hak akses Admin.");
  }

  return { session, adminId, user };
}



/**
 * Determines whether a given stage constitutes the official sale event for a payment method.
 * - KPR: AKAD_KREDIT (Credit agreement executed with bank financing)
 * - CASH_KERAS: AJB (Full cash settlement confirmed, formal deed executed)
 * - CASH_TEMPO: AJB (Full installment settlement confirmed, formal deed executed)
 */
function isOfficialSaleMilestone(metode: MetodeBayar, detail: TahapDetail): boolean {
  if (metode === "KPR") {
    return detail === "AKAD_KREDIT";
  }
  if (metode === "CASH_KERAS" || metode === "CASH_TEMPO") {
    return detail === "AJB";
  }
  return false;
}

// -----------------------------------------------------------------------------
// 1. PAYMENT MUTATIONS (Create & Void)
// -----------------------------------------------------------------------------

/**
 * Creates a new payment record (Pembayaran) for a transaction.
 * Role required: Active ADMIN
 */
export async function createPembayaran(
  data: CreatePembayaranInput
): Promise<ActionResponse> {
  try {
    const { adminId } = await requireCanEditTransaksi(data.transaksiId);

    const parsed = createPembayaranSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Data pembayaran tidak valid.",
      };
    }

    const validData = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const trx = await tx.transaksi.findUnique({
        where: { id: validData.transaksiId },
        include: {
          pembayaran: {
            where: { is_void: false },
          },
        },
      });

      if (!trx) {
        throw new Error("Transaksi tidak ditemukan.");
      }

      if (trx.tahap_detail === "BATAL") {
        throw new Error("Tidak dapat mencatat pembayaran pada transaksi yang sudah BATAL.");
      }

      if (trx.tahap_detail === "BAST") {
        throw new Error("Transaksi sudah selesai (BAST). Pembayaran baru tidak diperkenankan.");
      }

      // Validate payment type compatibility with payment method
      if (trx.metode_bayar === "KPR") {
        if (validData.jenisBayar !== "ITJ" && validData.jenisBayar !== "DP") {
          throw new Error(
            `Jenis pembayaran "${validData.jenisBayar}" tidak berlaku untuk metode KPR. Pembayaran yang diterima dari konsumen adalah ITJ dan DP.`
          );
        }
      } else if (trx.metode_bayar === "CASH_KERAS") {
        if (validData.jenisBayar === "CICILAN") {
          throw new Error("Jenis pembayaran CICILAN tidak tersedia untuk metode Cash Keras.");
        }
      }

      // Check cumulative paid amount vs harga deal
      const currentPaid = trx.pembayaran.reduce(
        (sum, p) => sum + Number(p.nominal),
        0
      );
      const hargaDeal = Number(trx.harga_deal);

      if (currentPaid + validData.nominal > hargaDeal) {
        const sisa = Math.max(0, hargaDeal - currentPaid);
        throw new Error(
          `Nominal pembayaran (Rp ${validData.nominal.toLocaleString("id-ID")}) melebihi sisa tagihan (Rp ${sisa.toLocaleString("id-ID")}).`
        );
      }

      // Generate unique receipt number atomically
      const noKwitansi = `KWT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      const newPayment = await tx.pembayaran.create({
        data: {
          transaksi_id: validData.transaksiId,
          admin_id: adminId,
          no_kwitansi: noKwitansi,
          jenis_pembayaran: validData.jenisBayar,
          cara_bayar: "TRANSFER",
          nominal: validData.nominal,
          tgl_bayar: todayDateOnlyUTC(),
          is_void: false,
          catatan: validData.catatan?.trim() || null,
        },
      });

      return { newPayment, noKwitansi };
    });

    revalidatePath(`/admin/transaksi/${validData.transaksiId}`);
    revalidatePath("/admin/transaksi");
    revalidatePath("/manager/transaksi");

    return {
      success: true,
      message: `Pembayaran ${validData.jenisBayar} berhasil dicatat (No. Kwitansi: ${result.noKwitansi}).`,
      data: result.newPayment,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal menyimpan pembayaran.";
    return { success: false, error: message };
  }
}

/**
 * Voids an existing payment with mandatory reason and audit trail.
 * Role required: Active ADMIN
 */
export async function voidPembayaran(
  input: unknown
): Promise<ActionResponse> {
  try {
    const { adminId } = await requireActiveAdmin();

    const parsed = voidPembayaranSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Data void pembayaran tidak valid.",
      };
    }

    const { pembayaranId, voidReason } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.pembayaran.findUnique({
        where: { id: pembayaranId },
        include: { transaksi: true },
      });

      if (!payment) {
        throw new Error("Data pembayaran tidak ditemukan.");
      }

      if (payment.is_void) {
        throw new Error("Pembayaran ini sudah pernah dibatalkan (void) sebelumnya.");
      }

      if (payment.transaksi.tahap_detail === "BATAL") {
        throw new Error("Transaksi sudah berstatus BATAL.");
      }

      const voided = await tx.pembayaran.update({
        where: { id: pembayaranId },
        data: {
          is_void: true,
          void_at: new Date(),
          void_by: adminId,
          void_reason: voidReason.trim(),
        },
      });

      // Recalculate remaining valid payments for transaction
      const remainingPayments = await tx.pembayaran.findMany({
        where: {
          transaksi_id: payment.transaksi_id,
          is_void: false,
        },
      });

      const remainingTotal = remainingPayments.reduce(
        (sum, p) => sum + Number(p.nominal),
        0
      );

      // If transaction was marked lunas_at but now falls below deal price, reset lunas_at
      if (
        payment.transaksi.lunas_at &&
        remainingTotal < Number(payment.transaksi.harga_deal)
      ) {
        await tx.transaksi.update({
          where: { id: payment.transaksi_id },
          data: { lunas_at: null },
        });
      }

      return voided;
    });

    revalidatePath(`/admin/transaksi/${result.transaksi_id}`);
    revalidatePath("/admin/transaksi");
    revalidatePath("/manager/transaksi");

    return {
      success: true,
      message: `Kwitansi ${result.no_kwitansi} berhasil dibatalkan (void).`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal membatalkan pembayaran.";
    return { success: false, error: message };
  }
}

// -----------------------------------------------------------------------------
// 2. DOCUMENT VERIFICATION MUTATIONS
// -----------------------------------------------------------------------------

/**
 * Explicitly verifies or updates a document status for a transaction.
 * Role required: Active ADMIN or Marketing PIC
 */
export async function verifyDokumenTransaksi(
  input: VerifyDokumenInput
): Promise<ActionResponse> {
  try {
    await requireCanEditTransaksi(input?.transaksiId);

    const parsed = verifyDokumenSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Data verifikasi dokumen tidak valid.",
      };
    }

    const { transaksiId, jenis } = parsed.data;
    const isLengkap = parsed.data.status === "LENGKAP" || parsed.data.verified === true;
    const status: StatusDokumen = isLengkap ? "LENGKAP" : "BELUM_LENGKAP";

    const result = await prisma.$transaction(async (tx) => {
      const trx = await tx.transaksi.findUnique({
        where: { id: transaksiId },
        select: { id: true, tahap_detail: true },
      });

      if (!trx) {
        throw new Error("Transaksi tidak ditemukan.");
      }

      if (trx.tahap_detail === "BATAL") {
        throw new Error("Tidak dapat mengubah checklist dokumen pada transaksi yang sudah BATAL.");
      }

      const updatedDoc = await tx.dokumenTransaksi.upsert({
        where: {
          transaksi_id_jenis: {
            transaksi_id: transaksiId,
            jenis,
          },
        },
        create: {
          transaksi_id: transaksiId,
          jenis,
          status,
        },
        update: {
          status,
        },
      });

      return updatedDoc;
    });

    revalidatePath(`/admin/transaksi/${transaksiId}`);
    return {
      success: true,
      message: `Status dokumen ${result.jenis.replace(/_/g, " ")} berhasil ditandai ${result.status === "LENGKAP" ? "Lengkap" : "Belum Lengkap"}.`,
      data: result,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui checklist dokumen.";
    return { success: false, error: message };
  }
}

/**
 * Updates marital and employment profile for customer attached to transaction.
 * Creates audit log in Aktivitas.
 */
export async function updateProfilPemberkasan(
  input: UpdateProfilPemberkasanInput
): Promise<ActionResponse> {
  try {
    const parsed = updateProfilPemberkasanSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Data profil pemberkasan tidak valid.",
      };
    }

    const { transaksiId, statusPernikahan, statusPekerjaan } = parsed.data;
    const { adminId } = await requireCanEditTransaksi(transaksiId);

    const result = await prisma.$transaction(async (tx) => {
      const trx = await tx.transaksi.findUnique({
        where: { id: transaksiId },
        include: { customer: true, itj: true },
      });

      if (!trx) {
        throw new Error("Transaksi tidak ditemukan.");
      }

      if (trx.tahap_detail === "BATAL") {
        throw new Error("Tidak dapat mengubah profil pada transaksi yang sudah BATAL.");
      }

      const updatedCustomer = await tx.customer.update({
        where: { id: trx.customer_id },
        data: {
          status_pernikahan: statusPernikahan || null,
          status_pekerjaan: statusPekerjaan || null,
        },
      });

      const auditText = `[PROFIL PEMBERKASAN] Status Pernikahan: ${statusPernikahan}, Status Pekerjaan: ${statusPekerjaan || "-"}`;
      const leadId = trx.itj?.lead_id;

      if (leadId) {
        await tx.aktivitas.create({
          data: {
            lead_id: leadId,
            user_id: adminId,
            jenis: "LAINNYA",
            hasil: "TERTARIK",
            catatan: auditText,
          },
        });
      }

      return updatedCustomer;
    });

    revalidatePath(`/admin/transaksi/${transaksiId}`);
    return {
      success: true,
      message: "Profil pemberkasan konsumen berhasil diperbarui.",
      data: result,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui profil pemberkasan.";
    return { success: false, error: message };
  }
}

// -----------------------------------------------------------------------------
// 3. CORE STATUS & STAGE MACHINE (updateTransactionStatus)
// -----------------------------------------------------------------------------

/**
 * Updates transaction progress status with rigorous server-side validation:
 * 1. Active Admin authentication & authorization.
 * 2. Cross-validates leadId against existing transaction ITJ relation.
 * 3. Enforces transition policies per payment method (no invalid forward skips).
 * 4. Verifies settlement before PELUNASAN / AJB.
 * 5. Verifies BAST physical inspection items (100% SESUAI / SELESAI_DIPERBAIKI) before BAST handover.
 * 6. Verifies active KPR bank decision before AKAD_KREDIT.
 * 7. Correctly manages MasterUnit inventory status (BOOKED, SOLD, AVAILABLE).
 * 8. Protects against date shifts using parseSafeDate.
 * 9. Creates atomic TransaksiTahapLog and Aktivitas audit records.
 */
export async function updateTransactionStatus(
  inputOrId: number | UpdateTransactionStatusInput,
  maybeData?: Omit<UpdateTransactionStatusInput, "transaksiId">
): Promise<ActionResponse> {
  try {
    const rawInput =
      typeof inputOrId === "object"
        ? inputOrId
        : {
            transaksiId: inputOrId,
            ...maybeData,
          };

    const { adminId, user } = await requireCanEditTransaksi(rawInput.transaksiId);

    const parsed = updateTransactionStatusSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Data status tidak valid.",
      };
    }

    const validData = parsed.data;

    // Fetch current transaction if fromDetail or version is omitted
    let fromDetail = validData.fromDetail;
    let version = validData.version;

    if (!fromDetail || version === undefined) {
      const current = await prisma.transaksi.findUnique({
        where: { id: validData.transaksiId },
        select: { tahap_detail: true, version: true },
      });
      if (!current) {
        return { success: false, error: "Transaksi tidak ditemukan." };
      }
      fromDetail = fromDetail || current.tahap_detail;
      version = version !== undefined ? version : current.version;
    }

    const result = await applyStage({
      transaksiId: validData.transaksiId,
      fromDetail,
      toDetail: validData.tahapDetail,
      version,
      actorId: adminId,
      userRole: user.role,
      catatanAdmin: validData.catatanAdmin,
      namaNotaris: validData.namaNotaris,
      tglAkad: validData.tglAkad || validData.tglAjb,
      tglBast: validData.tglBast,
      lunasAt: validData.lunasAt,
      rencanaAkadAt: validData.rencanaAkadAt,
      rencanaBastAt: validData.rencanaBastAt,
      alasanBatal: validData.catatanAdmin,
      pengajuanTerpilihId: validData.pengajuanTerpilihId,
      documents: validData.documents,
    });

    revalidatePath(`/admin/transaksi/${validData.transaksiId}`);
    revalidatePath(`/marketing/transaksi/${validData.transaksiId}`);
    revalidatePath("/admin/transaksi");
    revalidatePath("/manager/transaksi");
    revalidatePath("/marketing/transaksi");
    if (validData.leadId) {
      revalidatePath(`/marketing/lead/${validData.leadId}`);
    }

    return {
      success: true,
      message: `Progres transaksi berhasil disimpan (${validData.tahapDetail}).`,
      data: result,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui status transaksi.";
    return { success: false, error: message };
  }
}

export const updateTransactionTahap = updateTransactionStatus;

/**
 * Saves planned transaction milestone dates and notary without advancing transaction stage.
 */
export async function simpanJadwalTransaksi(
  input: SimpanJadwalTransaksiInput
): Promise<ActionResponse> {
  try {
    const parsed = simpanJadwalTransaksiSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Data jadwal tidak valid.",
      };
    }

    const { transaksiId, version, namaNotaris, rencanaAkadAt, rencanaBastAt } = parsed.data;
    await requireCanEditTransaksi(transaksiId);

    const affected = await prisma.transaksi.updateMany({
      where: {
        id: transaksiId,
        version: version,
      },
      data: {
        nama_notaris: namaNotaris !== undefined ? namaNotaris?.trim() || null : undefined,
        rencana_akad_at: rencanaAkadAt !== undefined
          ? rencanaAkadAt?.trim()
            ? parseDateOnlyUTC(rencanaAkadAt)
            : null
          : undefined,
        rencana_bast_at: rencanaBastAt !== undefined
          ? rencanaBastAt?.trim()
            ? parseDateOnlyUTC(rencanaBastAt)
            : null
          : undefined,
        version: { increment: 1 },
      },
    });

    if (affected.count !== 1) {
      return {
        success: false,
        error: "Data transaksi telah diubah oleh pengguna lain. Halaman akan dimuat ulang.",
      };
    }

    revalidatePath(`/admin/transaksi/${transaksiId}`);
    revalidatePath(`/marketing/transaksi/${transaksiId}`);

    return {
      success: true,
      message: "Rencana jadwal transaksi berhasil disimpan.",
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal menyimpan rencana jadwal transaksi.";
    return { success: false, error: message };
  }
}

export interface MarketingTransaksiItem {
  id: number;
  customer_id: number;
  unit_id: number;
  pic_id: number;
  marketing_id?: number;
  itj_id: number;
  metode_bayar: MetodeBayar;
  harga_deal: number;
  target_itj: number;
  target_dp: number;
  tenor_bulan: number | null;
  status_transaksi?: string | null;
  tahap_detail: TahapDetail;
  closing_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    id: number;
    nama_ktp: string;
    no_hp: string | null;
    nik: string;
  };
  unit: {
    id: number;
    blok: string;
    status_unit: string;
    tipe: {
      id: number;
      nama_tipe: string;
      kategori: string;
    } | null;
  };
  itj: {
    id: number;
    nominal: number;
    diajukan_at: string;
  } | null;
}

/**
 * Fetches all transactions for a specific marketing agent (PIC).
 * Ordered by created_at descending with customer, unit (with tipe), and itj included.
 */
export async function getTransaksiByMarketing(
  userId: number
): Promise<ActionResponse<MarketingTransaksiItem[]>> {
  try {
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return { success: false, error: "ID pengguna tidak valid.", data: [] };
    }

    const transaksiList = await prisma.transaksi.findMany({
      where: { pic_id: userId },
      include: {
        customer: {
          select: {
            id: true,
            nama_ktp: true,
            no_hp: true,
            nik: true,
          },
        },
        unit: {
          select: {
            id: true,
            blok: true,
            status_unit: true,
            tipe: {
              select: {
                id: true,
                nama_tipe: true,
                kategori: true,
              },
            },
          },
        },
        itj: {
          select: {
            id: true,
            nominal: true,
            diajukan_at: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const serialized: MarketingTransaksiItem[] = transaksiList.map((trx) => ({
      id: trx.id,
      customer_id: trx.customer_id,
      unit_id: trx.unit_id,
      pic_id: trx.pic_id,
      marketing_id: trx.pic_id,
      itj_id: trx.itj_id,
      metode_bayar: trx.metode_bayar,
      harga_deal: Number(trx.harga_deal),
      target_itj: Number(trx.target_itj),
      target_dp: Number(trx.target_dp),
      tenor_bulan: trx.tenor_bulan,
      status_transaksi: MAKRO_OF[trx.tahap_detail],
      tahap_detail: trx.tahap_detail,
      closing_at: trx.closing_at ? trx.closing_at.toISOString() : null,
      cancelled_at: trx.cancelled_at ? trx.cancelled_at.toISOString() : null,
      created_at: trx.created_at.toISOString(),
      updated_at: trx.updated_at.toISOString(),
      customer: {
        id: trx.customer.id,
        nama_ktp: trx.customer.nama_ktp,
        no_hp: trx.customer.no_hp,
        nik: trx.customer.nik,
      },
      unit: {
        id: trx.unit.id,
        blok: trx.unit.blok,
        status_unit: trx.unit.status_unit,
        tipe: trx.unit.tipe
          ? {
              id: trx.unit.tipe.id,
              nama_tipe: trx.unit.tipe.nama_tipe,
              kategori: trx.unit.tipe.kategori,
            }
          : null,
      },
      itj: trx.itj
        ? {
            id: trx.itj.id,
            nominal: Number(trx.itj.nominal),
            diajukan_at: trx.itj.diajukan_at.toISOString(),
          }
        : null,
    }));

    return {
      success: true,
      message: `Berhasil mengambil ${serialized.length} transaksi.`,
      data: serialized,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal mengambil data transaksi marketing.";
    return { success: false, error: message, data: [] };
  }
}

