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
  TahapTransaksi,
  TahapDetail,
  JenisDokumen,
  ItemBAST,
  StatusInspeksi,
  MetodeBayar,
  StatusDokumen,
  StatusPengajuanKPR,
} from "@/generated/prisma";
import {
  createPembayaranSchema,
  voidPembayaranSchema,
  verifyDokumenSchema,
  updateTransactionStatusSchema,
  updateProfilPemberkasanSchema,
  type CreatePembayaranInput,
  type VoidPembayaranInput,
  type VerifyDokumenInput,
  type UpdateTransactionStatusInput,
  type UpdateProfilPemberkasanInput,
} from "@/schemas/transaksi.schema";
import { getRequiredDocuments } from "@/lib/transaksi/document-rules";

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
      select: { id: true, marketing_id: true },
    });
    if (!trx) {
      throw new Error("Transaksi tidak ditemukan.");
    }
    const canEdit = userId === trx.marketing_id || role === "ADMIN";
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

      if (trx.status_transaksi === "BATAL") {
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

      if (payment.transaksi.status_transaksi === "BATAL") {
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
    const { adminId } = await requireCanEditTransaksi(input?.transaksiId);

    const parsed = verifyDokumenSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Data verifikasi dokumen tidak valid.",
      };
    }

    const { transaksiId, jenis, catatan } = parsed.data;
    const status: StatusDokumen =
      parsed.data.status ??
      (parsed.data.verified ? "TERVERIFIKASI" : "BELUM_DIUNGGAH");

    const result = await prisma.$transaction(async (tx) => {
      const trx = await tx.transaksi.findUnique({
        where: { id: transaksiId },
        select: { id: true, status_transaksi: true },
      });

      if (!trx) {
        throw new Error("Transaksi tidak ditemukan.");
      }

      if (trx.status_transaksi === "BATAL") {
        throw new Error("Tidak dapat memverifikasi dokumen pada transaksi yang sudah BATAL.");
      }

      const isVerified = status === "TERVERIFIKASI";
      const verifiedBy = isVerified ? adminId : null;
      const verifiedAt = isVerified ? new Date() : null;

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
          kategori: "PEMBERKASAN",
          status,
          verified_by: verifiedBy,
          verified_at: verifiedAt,
          catatan_verifikasi: catatan?.trim() || null,
        },
        update: {
          status,
          verified_by: verifiedBy,
          verified_at: verifiedAt,
          catatan_verifikasi: catatan?.trim() || null,
        },
      });

      return updatedDoc;
    });

    revalidatePath(`/admin/transaksi/${transaksiId}`);
    return {
      success: true,
      message: `Status dokumen ${result.jenis.replace(/_/g, " ")} berhasil diubah menjadi ${result.status}.`,
      data: result,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal memverifikasi dokumen.";
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

      if (trx.status_transaksi === "BATAL") {
        throw new Error("Tidak dapat mengubah profil pada transaksi yang sudah BATAL.");
      }

      const updatedCustomer = await tx.customer.update({
        where: { id: trx.customer_id },
        data: {
          status_pernikahan: statusPernikahan,
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

    const { adminId } = await requireCanEditTransaksi(rawInput.transaksiId);

    const parsed = updateTransactionStatusSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Data status tidak valid.",
      };
    }

    const validData = parsed.data;
    const targetDetail: TahapDetail = validData.tahapDetail;
    const targetMacro: TahapTransaksi = getMacroTahap(targetDetail);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current transaction with all required relations
      const existingTrx = await tx.transaksi.findUnique({
        where: { id: validData.transaksiId },
        include: {
          customer: true,
          unit: {
            include: { tipe: true },
          },
          itj: true,
          pembayaran: {
            where: { is_void: false },
          },
          pengajuan_kpr: {
            orderBy: { nomor_pengajuan: "desc" },
            include: { bank: true },
          },
          inspeksi_bast: true,
          dokumen: true,
        },
      });

      if (!existingTrx) {
        throw new Error("Transaksi tidak ditemukan.");
      }

      // 2. Validate Lead ownership integrity
      if (
        validData.leadId &&
        existingTrx.itj?.lead_id &&
        validData.leadId !== existingTrx.itj.lead_id
      ) {
        throw new Error("ID Lead yang dikirimkan tidak sesuai dengan data transaksi.");
      }
      const actualLeadId = existingTrx.itj?.lead_id || validData.leadId;

      // 3. State Guards
      if (existingTrx.status_transaksi === "BATAL") {
        throw new Error("Transaksi yang sudah BATAL tidak dapat diubah statusnya lagi.");
      }

      if (existingTrx.tahap_detail === "BAST" && targetDetail !== "BAST") {
        throw new Error("Transaksi yang sudah menyelesaikan serah terima (BAST) telah tuntas.");
      }

      const allowedList = getAllowedDetailsForMetode(existingTrx.metode_bayar);
      if (!allowedList.includes(targetDetail)) {
        throw new Error(
          `Tahap detail "${targetDetail}" tidak valid untuk metode pembayaran ${existingTrx.metode_bayar}.`
        );
      }

      const currentIndex = allowedList.indexOf(existingTrx.tahap_detail);
      const targetIndex = allowedList.indexOf(targetDetail);
      const isCancellation = targetDetail === "BATAL";
      const isSameStage = targetDetail === existingTrx.tahap_detail;
      const isRegression = targetIndex < currentIndex && !isCancellation;
      const isAdvancing = targetIndex > currentIndex && !isCancellation;

      // 4. Transition Machine Guards
      if (isCancellation) {
        if (!validData.catatanAdmin?.trim()) {
          throw new Error("Alasan pembatalan transaksi wajib diisi pada catatan progress.");
        }
      }

      if (isRegression) {
        if (!validData.catatanAdmin?.trim() || validData.catatanAdmin.trim().length < 5) {
          throw new Error("Alasan pemunduran tahap transaksi wajib diisi pada catatan progress (minimal 5 karakter).");
        }
      }

      // Check for illegal forward jumps (skipping intermediate stages)
      if (isAdvancing) {
        const stepDifference = targetIndex - currentIndex;
        if (stepDifference > 1) {
          const nextExpected = allowedList[currentIndex + 1];
          throw new Error(
            `Perpindahan tahap tidak valid: Tidak dapat melompati tahap. Tahap berikutnya adalah "${nextExpected}".`
          );
        }
      }

      // 5. Document Persistence & Verification Gates
      const verifiedDocKeys = new Set(
        existingTrx.dokumen
          .filter((d) => d.status === "TERVERIFIKASI")
          .map((d) => d.jenis)
      );

      if (validData.documents !== undefined && validData.documents !== null) {
        const submittedDocKeys = new Set(validData.documents);
        const allowedDocTypes: JenisDokumen[] = [
          "KTP_SUAMI_ISTRI",
          "KARTU_KELUARGA",
          "NPWP",
          "BUKU_NIKAH",
          "SLIP_GAJI",
          "SURAT_KET_KERJA",
          "REKENING_KORAN",
          "SURAT_KET_BELUM_PUNYA_RUMAH",
          "SKU_WIRAUSAHA",
          "LAPORAN_KEUANGAN",
          "LEGALITAS_LAINNYA",
        ];

        for (const docKey of allowedDocTypes) {
          const isChecked = submittedDocKeys.has(docKey);
          const existingDoc = existingTrx.dokumen.find((d) => d.jenis === docKey);

          if (isChecked) {
            verifiedDocKeys.add(docKey);
            if (!existingDoc || existingDoc.status !== "TERVERIFIKASI") {
              await tx.dokumenTransaksi.upsert({
                where: {
                  transaksi_id_jenis: {
                    transaksi_id: existingTrx.id,
                    jenis: docKey,
                  },
                },
                create: {
                  transaksi_id: existingTrx.id,
                  jenis: docKey,
                  kategori: "PEMBERKASAN",
                  status: "TERVERIFIKASI",
                  verified_by: adminId,
                  verified_at: new Date(),
                },
                update: {
                  status: "TERVERIFIKASI",
                  verified_by: adminId,
                  verified_at: new Date(),
                },
              });
            }
          } else if (existingDoc && existingDoc.status === "TERVERIFIKASI") {
            verifiedDocKeys.delete(docKey);
            await tx.dokumenTransaksi.update({
              where: { id: existingDoc.id },
              data: {
                status: "MENUNGGU_VERIFIKASI",
                verified_by: null,
                verified_at: null,
              },
            });
          }
        }
      }

      // If leaving documentation stage (index 0), enforce required verified documents
      if (isAdvancing && currentIndex === 0 && targetIndex > 0) {
        const docEvaluation = getRequiredDocuments({
          metode: existingTrx.metode_bayar,
          kategori: existingTrx.unit.tipe.kategori,
          statusPernikahan: existingTrx.customer.status_pernikahan,
          statusPekerjaan: existingTrx.customer.status_pekerjaan,
        });

        if (!docEvaluation.isProfileComplete) {
          throw new Error(`Pemberkasan belum lengkap: ${docEvaluation.message}`);
        }

        const requiredDocs = docEvaluation.documents.filter((d) => d.required);
        const missingRequiredDocs = requiredDocs.filter((doc) => {
          if (doc.key === "KTP_PEMOHON") {
            return !verifiedDocKeys.has("KTP_PEMOHON") && !verifiedDocKeys.has("KTP_SUAMI_ISTRI");
          }
          return !verifiedDocKeys.has(doc.key);
        });

        if (missingRequiredDocs.length > 0) {
          const missingLabels = missingRequiredDocs
            .map((d) => d.label)
            .join(", ");
          throw new Error(
            `Dokumen pemberkasan belum lengkap: Dokumen [${missingLabels}] wajib diverifikasi sebelum dapat melanjutkan tahap transaksi.`
          );
        }
      }

      // 5.1. BAST Checklist Persistence & Audit Logging
      const ALL_BAST_ITEMS: ItemBAST[] = [
        "PONDASI_STRUKTUR",
        "DINDING_PLESTER_CAT",
        "ATAP_PLAFON",
        "LANTAI_KERAMIK",
        "KUSEN_PINTU_JENDELA",
        "KELISTRIKAN",
        "SANITASI_AIR_POMPA",
        "FASAD_KEBERSIHAN",
      ];

      const currentBastMap = new Map<ItemBAST, { id: number; status: StatusInspeksi }>(
        existingTrx.inspeksi_bast.map((b) => [b.item, { id: b.id, status: b.status }])
      );

      if (validData.bastItems !== undefined && validData.bastItems !== null) {
        const submittedBastSet = new Set(validData.bastItems);

        for (const bastItem of ALL_BAST_ITEMS) {
          const isChecked = submittedBastSet.has(bastItem);
          const existing = currentBastMap.get(bastItem);

          if (isChecked) {
            if (!existing || (existing.status !== "SESUAI" && existing.status !== "SELESAI_DIPERBAIKI")) {
              const updated = await tx.inspeksiBAST.upsert({
                where: {
                  transaksi_id_item: {
                    transaksi_id: existingTrx.id,
                    item: bastItem,
                  },
                },
                create: {
                  transaksi_id: existingTrx.id,
                  item: bastItem,
                  status: "SESUAI",
                  catatan: "Diverifikasi via checklist BAST",
                  inspektur_id: adminId,
                  diperiksa_at: new Date(),
                },
                update: {
                  status: "SESUAI",
                  inspektur_id: adminId,
                  diperiksa_at: new Date(),
                },
              });

              await tx.inspeksiBASTLog.create({
                data: {
                  inspeksi_bast_id: updated.id,
                  status_sebelum: existing ? existing.status : null,
                  status_sesudah: "SESUAI",
                  catatan: "Diverifikasi via checklist BAST",
                  inspektur_id: adminId,
                },
              });

              currentBastMap.set(bastItem, { id: updated.id, status: "SESUAI" });
            }
          } else if (existing && (existing.status === "SESUAI" || existing.status === "SELESAI_DIPERBAIKI")) {
            const updated = await tx.inspeksiBAST.update({
              where: { id: existing.id },
              data: {
                status: "BELUM_DICEK",
                inspektur_id: adminId,
                diperiksa_at: new Date(),
              },
            });

            await tx.inspeksiBASTLog.create({
              data: {
                inspeksi_bast_id: existing.id,
                status_sebelum: existing.status,
                status_sesudah: "BELUM_DICEK",
                catatan: "Checklist BAST dicabut",
                inspektur_id: adminId,
              },
            });

            currentBastMap.set(bastItem, { id: updated.id, status: "BELUM_DICEK" });
          }
        }
      }

      // 6. Specific Stage Prerequisites
      // A. KPR Stage Validations & Active Bank Invariant
      if (existingTrx.metode_bayar === "KPR") {
        const activePengajuanList = existingTrx.pengajuan_kpr.filter(
          (p) => p.status !== "DITOLAK" && p.status !== "DIBATALKAN"
        );
        if (activePengajuanList.length > 1) {
          throw new Error(
            `Integritas data KPR tidak valid: Terdapat ${activePengajuanList.length} pengajuan KPR aktif secara bersamaan pada transaksi #${existingTrx.id}. Harap periksa pengajuan bank.`
          );
        }
        const activeKpr = activePengajuanList[0] || null;

        // Reject advancing directly into KPR micro stages via this action
        if (isAdvancing && ["WAWANCARA", "OTS", "VERIFIKASI", "SP3K"].includes(targetDetail)) {
          throw new Error(
            `Perpindahan tahap ke "${targetDetail}" hanya dapat dilakukan melalui modul Pengajuan Bank KPR.`
          );
        }

        // Regression from AKAD_KREDIT into SP3K
        if (isRegression && existingTrx.tahap_detail === "AKAD_KREDIT" && targetDetail === "SP3K") {
          if (activeKpr && activeKpr.status === "DISETUJUI") {
            await tx.pengajuanKPR.update({
              where: { id: activeKpr.id },
              data: { status: "SP3K" },
            });

            await tx.pengajuanKPRLog.create({
              data: {
                pengajuan_id: activeKpr.id,
                status_sebelum: "DISETUJUI",
                status_sesudah: "SP3K",
                admin_id: adminId,
                catatan: `Status KPR di ${activeKpr.bank.nama} dikembalikan ke SP3K seiring pemunduran tahap dari Akad Kredit. Alasan: ${validData.catatanAdmin?.trim() || "-"}`,
              },
            });
          }
        }

        if (targetDetail === "AKAD_KREDIT") {
          if (!activeKpr) {
            throw new Error(
              "Akad Kredit KPR memerlukan data Pengajuan KPR yang aktif ke Bank. Silakan buat pengajuan ke Bank terlebih dahulu."
            );
          }

          const isValidStatus = activeKpr.status === "SP3K" || (isSameStage && activeKpr.status === "DISETUJUI");
          if (!isValidStatus) {
            throw new Error(
              `Akad Kredit KPR belum dapat diproses: Status pengajuan KPR di ${activeKpr.bank.nama} saat ini adalah "${activeKpr.status}". Status harus SP3K Terbit sebelum dapat melanjutkan ke Akad Kredit.`
            );
          }

          if (!validData.tglAkad?.trim()) {
            throw new Error("Tanggal Akad Kredit wajib diisi.");
          }

          if (!validData.namaNotaris?.trim()) {
            throw new Error("Nama Notaris/PPAT rekanan bank wajib diisi.");
          }

          // Otomatis tandai bank aktif sebagai DISETUJUI saat masuk ke Akad Kredit
          if (activeKpr.status !== "DISETUJUI") {
            await tx.pengajuanKPR.update({
              where: { id: activeKpr.id },
              data: {
                status: "DISETUJUI",
                tanggal_keputusan: new Date(),
              },
            });

            await tx.pengajuanKPRLog.create({
              data: {
                pengajuan_id: activeKpr.id,
                status_sebelum: activeKpr.status,
                status_sesudah: "DISETUJUI",
                admin_id: adminId,
                catatan: `Status KPR di ${activeKpr.bank.nama} otomatis disetujui seiring pelaksanaan Akad Kredit`,
              },
            });
          }
        }
      }

      // B. Settlement Validations (Cash Keras & Cash Tempo)
      const totalPaid = existingTrx.pembayaran.reduce(
        (sum, p) => sum + Number(p.nominal),
        0
      );
      const hargaDeal = Number(existingTrx.harga_deal);

      if (targetDetail === "PEMBAYARAN_DP" && existingTrx.metode_bayar === "CASH_TEMPO") {
        const dpPaid = existingTrx.pembayaran
          .filter((p) => p.jenis_pembayaran === "DP" || p.jenis_pembayaran === "ITJ")
          .reduce((sum, p) => sum + Number(p.nominal), 0);

        const targetDp = Number(existingTrx.target_dp);
        if (dpPaid < targetDp) {
          throw new Error(
            `Tahap Pembayaran DP belum tercapai: Pembayaran DP yang masuk (Rp ${dpPaid.toLocaleString(
              "id-ID"
            )}) belum memenuhi target DP (Rp ${targetDp.toLocaleString("id-ID")}).`
          );
        }
      }

      if (targetDetail === "PELUNASAN") {
        if (totalPaid < hargaDeal) {
          const sisa = hargaDeal - totalPaid;
          throw new Error(
            `Tahap Pelunasan belum dapat dicatat: Total penerimaan yang sah (Rp ${totalPaid.toLocaleString(
              "id-ID"
            )}) belum melunasi harga deal (Rp ${hargaDeal.toLocaleString(
              "id-ID"
            )}). Sisa tagihan: Rp ${sisa.toLocaleString("id-ID")}.`
          );
        }
      }

      if (targetDetail === "AJB") {
        if (totalPaid < hargaDeal) {
          throw new Error(
            `Akad (Cash) belum dapat diproses: Pembayaran belum lunas 100%. Sisa tagihan: Rp ${(
              hargaDeal - totalPaid
            ).toLocaleString("id-ID")}.`
          );
        }

        const dateStr = validData.tglAkad?.trim() || validData.tglAjb?.trim();
        if (!dateStr && !existingTrx.tgl_akad && !existingTrx.tgl_ajb) {
          throw new Error("Tanggal Akad wajib diisi.");
        }

        if (!validData.namaNotaris?.trim()) {
          throw new Error("Nama Notaris / PPAT pembuat akta wajib diisi.");
        }
      }

      // C. BAST Handover Inspection Validations
      if (targetDetail === "BAST") {
        const isKavling = existingTrx.unit?.tipe?.kategori === "KAVLING";

        if (!isKavling) {
          const incompleteItems = ALL_BAST_ITEMS.filter((item) => {
            const st = currentBastMap.get(item)?.status;
            return st !== "SESUAI" && st !== "SELESAI_DIPERBAIKI";
          });

          if (incompleteItems.length > 0) {
            throw new Error(
              `Serah Terima (BAST) gagal: Terdapat ${incompleteItems.length
              } item fisik unit yang belum berstatus SESUAI atau SELESAI DIPERBAIKI pada checklist BAST.`
            );
          }
        }
      }

      // 6. Build Transaksi Update Payload
      const updateData: Prisma.TransaksiUpdateInput = {
        status_transaksi: targetMacro,
        tahap_detail: targetDetail,
      };

      if (validData.namaNotaris !== undefined) {
        updateData.nama_notaris = validData.namaNotaris?.trim() || null;
      }

      if (validData.catatanAdmin !== undefined) {
        updateData.catatan_admin = validData.catatanAdmin?.trim() || null;
      }

      // Date Milestones (Operational only; closing_at is set atomically upon ITJ submission)
      if (targetDetail === "AKAD_KREDIT") {
        const akadDate = validData.tglAkad
          ? parseDateOnlyUTC(validData.tglAkad)
          : (existingTrx.tgl_akad || todayDateOnlyUTC());
        updateData.tgl_akad = akadDate;
      }

      if (targetDetail === "AJB") {
        const akadDate = validData.tglAkad
          ? parseDateOnlyUTC(validData.tglAkad)
          : validData.tglAjb
            ? parseDateOnlyUTC(validData.tglAjb)
            : (existingTrx.tgl_akad || existingTrx.tgl_ajb || todayDateOnlyUTC());
        updateData.tgl_akad = akadDate;
        updateData.tgl_ajb = akadDate; // Keep tgl_ajb populated for backwards compatibility
      }

      if (targetDetail === "PELUNASAN") {
        updateData.lunas_at = validData.lunasAt
          ? parseDateOnlyUTC(validData.lunasAt)
          : (existingTrx.lunas_at || todayDateOnlyUTC());
      }

      if (targetDetail === "BAST") {
        const bastDate = validData.tglBast
          ? parseDateOnlyUTC(validData.tglBast)
          : (existingTrx.tgl_bast || todayDateOnlyUTC());
        updateData.tgl_bast = bastDate;

        // Fallback jika transaksi lawas belum memiliki closing_at
        if (!existingTrx.closing_at && !updateData.closing_at) {
          updateData.closing_at =
            existingTrx.tgl_akad || existingTrx.tgl_ajb || bastDate;
        }
      }

      if (isCancellation) {
        updateData.cancelled_at = new Date();
        updateData.alasan_batal = validData.catatanAdmin?.trim() || "Dibatalkan oleh Admin";
      }

      // 7. Inventory Status & Official Sale Rules
      // If advancing to official sale event (AKAD_KREDIT for KPR, AJB for Cash), mark SOLD
      if (isOfficialSaleMilestone(existingTrx.metode_bayar, targetDetail)) {
        await tx.masterUnit.update({
          where: { id: existingTrx.unit_id },
          data: { status_unit: "SOLD" },
        });
      }

      // If regressing backwards from AKAD_KREDIT or AJB, revert unit to BOOKED (closing_at remains intact)
      if (
        (existingTrx.tahap_detail === "AKAD_KREDIT" || existingTrx.tahap_detail === "AJB") &&
        !isSameStage &&
        targetDetail !== "AKAD_KREDIT" &&
        targetDetail !== "AJB" &&
        targetDetail !== "BAST" &&
        targetDetail !== "BATAL"
      ) {
        await tx.masterUnit.update({
          where: { id: existingTrx.unit_id },
          data: { status_unit: "BOOKED" },
        });
      }

      // If cancelling transaction, check whether unit should be set to AVAILABLE
      if (isCancellation) {
        const otherActiveTrx = await tx.transaksi.findFirst({
          where: {
            unit_id: existingTrx.unit_id,
            id: { not: existingTrx.id },
            status_transaksi: { not: "BATAL" },
          },
        });

        const activeItj = await tx.itj.findFirst({
          where: {
            unit_id: existingTrx.unit_id,
            id: { not: existingTrx.itj_id },
            status: { in: ["DIAJUKAN", "DISETUJUI"] },
          },
        });

        if (!otherActiveTrx && !activeItj) {
          await tx.masterUnit.update({
            where: { id: existingTrx.unit_id },
            data: { status_unit: "AVAILABLE" },
          });
        } else if (otherActiveTrx) {
          await tx.masterUnit.update({
            where: { id: existingTrx.unit_id },
            data: { status_unit: "BOOKED" },
          });
        }
      }

      // 8. Apply Transaction Update
      const updatedTrx = await tx.transaksi.update({
        where: { id: validData.transaksiId },
        data: updateData,
      });

      // 9. Audit Logging (TransaksiTahapLog & Aktivitas)
      // Only insert stage log if status actually changed or cancellation note added
      if (!isSameStage || isCancellation) {
        await tx.transaksiTahapLog.create({
          data: {
            transaksi_id: existingTrx.id,
            tahap_sebelum: existingTrx.status_transaksi,
            tahap_sesudah: targetMacro,
            detail_sebelum: existingTrx.tahap_detail,
            detail_sesudah: targetDetail,
            admin_id: adminId,
            catatan: validData.catatanAdmin?.trim() || null,
          },
        });

        const activityNotes = [
          `[STATUS TRANSAKSI] ${targetDetail} (${targetMacro})`,
          validData.catatanAdmin ? `Catatan: ${validData.catatanAdmin.trim()}` : null,
        ]
          .filter(Boolean)
          .join(" • ");

        await tx.aktivitas.create({
          data: {
            lead_id: actualLeadId,
            user_id: adminId,
            jenis: "LAINNYA",
            hasil: isCancellation ? "TIDAK_JADI" : "TERTARIK",
            catatan: activityNotes,
          },
        });
      }

      return updatedTrx;
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
      message: `Progres transaksi berhasil disimpan (${targetDetail}).`,
      data: result,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui status transaksi.";
    return { success: false, error: message };
  }
}

export const updateTransactionTahap = updateTransactionStatus;

export interface MarketingTransaksiItem {
  id: number;
  customer_id: number;
  unit_id: number;
  marketing_id: number;
  itj_id: number;
  metode_bayar: MetodeBayar;
  harga_deal: number;
  target_itj: number;
  target_dp: number;
  tenor_bulan: number | null;
  status_transaksi: TahapTransaksi;
  tahap_detail: TahapDetail;
  closing_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    id: number;
    nama_ktp: string;
    no_hp: string;
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
      where: { marketing_id: userId },
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
      marketing_id: trx.marketing_id,
      itj_id: trx.itj_id,
      metode_bayar: trx.metode_bayar,
      harga_deal: Number(trx.harga_deal),
      target_itj: Number(trx.target_itj),
      target_dp: Number(trx.target_dp),
      tenor_bulan: trx.tenor_bulan,
      status_transaksi: trx.status_transaksi,
      tahap_detail: trx.tahap_detail,
      closing_at: trx.closing_at ? trx.closing_at.toISOString() : null,
      closed_at: trx.closed_at ? trx.closed_at.toISOString() : null,
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

