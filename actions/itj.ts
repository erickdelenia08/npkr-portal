// actions/itj.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { itjSchema } from "@/schemas/itj/itj.schema";
import { todayDateOnlyUTC } from "@/lib/date/wib";
import type { TahapDetail } from "@/generated/prisma";

export interface ITJActionResponse {
  success: boolean;
  error?: string;
  leadId?: number;
  transaksiId?: number;
  data?: {
    transaksiId: number;
    leadId: number;
  };
}

/**
 * Submit ITJ and immediately create an active Transaksi + first Pembayaran.
 * Allowed for any authenticated user (Marketing, Admin, Manager).
 * Uses a single atomic prisma.$transaction.
 */
export async function submitITJ(
  formDataOrInput: FormData | Record<string, unknown>
): Promise<ITJActionResponse> {
  const session = await auth();

  if (!session?.user) {
    return { success: false, error: "Silakan login kembali." };
  }

  const userId = Number((session.user as { id?: string | number }).id);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return {
      success: false,
      error: "ID pengguna tidak valid. Silakan login kembali.",
    };
  }

  const isFormData =
    typeof formDataOrInput === "object" &&
    formDataOrInput !== null &&
    "get" in formDataOrInput &&
    typeof (formDataOrInput as { get: unknown }).get === "function";

  const raw = isFormData
    ? {
        leadId: (formDataOrInput as FormData).get("leadId"),
        nik: (formDataOrInput as FormData).get("nik"),
        namaKtp: (formDataOrInput as FormData).get("namaKtp"),
        tempatLahir: (formDataOrInput as FormData).get("tempatLahir"),
        tglLahir: (formDataOrInput as FormData).get("tglLahir"),
        alamatKtp: (formDataOrInput as FormData).get("alamatKtp"),
        unitId: (formDataOrInput as FormData).get("unitId"),
        hargaDeal: (formDataOrInput as FormData).get("hargaDeal"),
        targetItj:
          (formDataOrInput as FormData).get("targetItj") ??
          (formDataOrInput as FormData).get("nominalItj"),
        nominalDibayar:
          (formDataOrInput as FormData).get("nominalDibayar") ??
          (formDataOrInput as FormData).get("nominalItj"),
        targetDp: (formDataOrInput as FormData).get("targetDp"),
        metodeBayar: (formDataOrInput as FormData).get("metodeBayar"),
        tenor: (formDataOrInput as FormData).get("tenor") || undefined,
      }
    : formDataOrInput;

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
    let createdTransaksiId: number | undefined;

    await prisma.$transaction(async (tx) => {
      // 1. Pastikan lead tersedia dan valid
      const lead = await tx.lead.findUnique({
        where: { id: data.leadId },
        include: {
          customer: true,
          itj: {
            include: {
              transaksi: true,
            },
            orderBy: { id: "desc" },
            take: 1,
          },
        },
      });

      if (!lead) {
        throw new Error("Lead tidak ditemukan.");
      }

      leadTargetId = lead.id;

      if (!lead.survei_selesai_at) {
        throw new Error(
          "Pembuatan ITJ hanya dapat dilakukan setelah survei lokasi selesai."
        );
      }

      if (lead.lost_at !== null) {
        throw new Error("Lead yang berstatus LOST tidak dapat dibuatkan ITJ.");
      }

      const hasActiveClosing = lead.itj.some(
        (i) => i.transaksi && i.transaksi.status_transaksi !== "BATAL"
      );
      if (hasActiveClosing) {
        throw new Error("Lead ini sudah memiliki transaksi aktif.");
      }

      // 2. Pastikan unit ada dan kategorinya sesuai
      const unit = await tx.masterUnit.findUnique({
        where: { id: data.unitId },
        include: { tipe: true },
      });

      if (!unit) {
        throw new Error("Unit tidak ditemukan.");
      }

      if (unit.tipe.kategori === "KAVLING" && data.metodeBayar === "KPR") {
        throw new Error("Metode KPR tidak tersedia untuk unit kavling.");
      }

      // 3. Verifikasi unit AVAILABLE & Kunci unit langsung menjadi BOOKED (Atomic Concurrency Guard)
      if (unit.status_unit !== "AVAILABLE") {
        throw new Error("Unit sudah tidak tersedia. Silakan pilih unit lain.");
      }

      const claim = await tx.masterUnit.updateMany({
        where: { id: data.unitId, status_unit: "AVAILABLE" },
        data: { status_unit: "BOOKED" },
      });

      if (claim.count !== 1) {
        throw new Error("Unit sudah tidak tersedia. Silakan pilih unit lain.");
      }

      // 4. Repeat Buyer Logic untuk Customer (Upsert Customer)
      const cleanNik = data.nik.trim();
      let customerId: number;

      const existingCustomer = await tx.customer.findUnique({
        where: { nik: cleanNik },
      });

      if (existingCustomer) {
        await tx.customer.update({
          where: { id: existingCustomer.id },
          data: {
            nama_ktp: data.namaKtp.trim(),
            tempat_lahir: data.tempatLahir.trim(),
            tgl_lahir: new Date(`${data.tglLahir}T00:00:00.000Z`),
            alamat_ktp: data.alamatKtp.trim(),
            no_hp: lead.no_hp,
          },
        });
        customerId = existingCustomer.id;
      } else {
        const createdCustomer = await tx.customer.create({
          data: {
            nama_ktp: data.namaKtp.trim(),
            nik: cleanNik,
            tempat_lahir: data.tempatLahir.trim(),
            tgl_lahir: new Date(`${data.tglLahir}T00:00:00.000Z`),
            alamat_ktp: data.alamatKtp.trim(),
            no_hp: lead.no_hp,
          },
        });
        customerId = createdCustomer.id;
      }

      // 5. Update Lead dengan customer_id dan set marketing_id ke user saat ini (PIC)
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          customer_id: customerId,
          marketing_id: userId,
          lost_at: null,
          lost_reason: null,
        },
      });

      // 6. Buat record ITJ (langsung closing)
      const itjRecord = await tx.itj.create({
        data: {
          lead_id: lead.id,
          unit_id: unit.id,
          marketing_id: userId,
          nik: cleanNik,
          nama_ktp: data.namaKtp.trim(),
          nominal: data.nominalDibayar,
          harga_deal: data.hargaDeal,
          target_itj: data.targetItj,
          nominal_dibayar: data.nominalDibayar,
          target_dp: data.targetDp,
          metode_bayar: data.metodeBayar,
          tenor: data.metodeBayar === "KPR" ? data.tenor ?? null : null,
          diajukan_at: new Date(),
        },
      });

      // 7. Langsung buat Transaksi
      let detailTahap: TahapDetail = "PENGUMPULAN_DOKUMEN";
      if (data.metodeBayar === "CASH_KERAS") {
        detailTahap = "PEMBERKASAN_LEGALITAS";
      } else if (data.metodeBayar === "CASH_TEMPO") {
        detailTahap = "PEMBERKASAN_PPJB";
      }

      const createdTransaksi = await tx.transaksi.create({
        data: {
          customer_id: customerId,
          unit_id: unit.id,
          marketing_id: userId,
          itj_id: itjRecord.id,
          metode_bayar: data.metodeBayar,
          harga_deal: data.hargaDeal,
          target_itj: data.targetItj,
          target_dp: data.targetDp,
          tenor_bulan: data.metodeBayar === "KPR" ? data.tenor ?? null : null,
          status_transaksi: "PEMBERKASAN",
          tahap_detail: detailTahap,
          closing_at: todayDateOnlyUTC(),
        },
      });

      createdTransaksiId = createdTransaksi.id;

      // 8. Buat Pembayaran pertama (ITJ) dengan is_void: false
      const noKwitansi = `KWT-ITJ-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      await tx.pembayaran.create({
        data: {
          transaksi_id: createdTransaksi.id,
          admin_id: userId,
          no_kwitansi: noKwitansi,
          jenis_pembayaran: "ITJ",
          cara_bayar: "TRANSFER",
          nominal: data.nominalDibayar,
          tgl_bayar: todayDateOnlyUTC(),
          is_void: false,
          catatan: `Pembayaran awal ITJ Blok ${unit.blok}`,
        },
      });

      // 9. Catat riwayat aktivitas lead & perbarui last_activity_at
      const actNow = new Date();
      await tx.aktivitas.create({
        data: {
          lead_id: lead.id,
          user_id: userId,
          jenis: "LAINNYA",
          hasil: "TERTARIK",
          catatan: `[TRANSAKSI ITJ BERHASIL] Blok ${unit.blok} berhasil dibooking dengan setoran ITJ Rp ${Number(data.nominalDibayar).toLocaleString("id-ID")} (Target ITJ: Rp ${Number(data.targetItj).toLocaleString("id-ID")}). Transaksi #${createdTransaksi.id} aktif.`,
          created_at: actNow,
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: { last_activity_at: actNow },
      });
    });

    revalidatePath(`/marketing/lead/${leadTargetId}`);
    revalidatePath("/marketing/lead");
    revalidatePath("/admin/transaksi");
    revalidatePath("/manager/transaksi");
    if (createdTransaksiId) {
      revalidatePath(`/admin/transaksi/${createdTransaksiId}`);
    }

    return {
      success: true,
      leadId: leadTargetId,
      transaksiId: createdTransaksiId,
      data: createdTransaksiId
        ? {
            transaksiId: createdTransaksiId,
            leadId: leadTargetId,
          }
        : undefined,
    };
  } catch (error: unknown) {
    console.error("submitITJ error:", error);
    const errorMsg =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat memproses transaksi ITJ.";
    return { success: false, error: errorMsg };
  }
}

export const submitItj = submitITJ;
