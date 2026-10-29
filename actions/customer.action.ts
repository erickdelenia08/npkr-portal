"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toWibDay, parseDateOnlyUTC } from "@/lib/date/wib";
import {
  updateCustomerIdentitySchema,
  UpdateCustomerIdentityInput,
} from "@/schemas/customer.schema";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Role-Based Access Control helper.
 * Verifies that the current user has access to view or manage customer data.
 */
async function enforceCustomerAccessRole(allowManager = true): Promise<void> {
  const session = await auth();
  const userRole = session?.user?.role;

  const allowedRoles = allowManager
    ? ["ADMIN", "MANAGER", "DIRECTOR"]
    : ["ADMIN", "DIRECTOR"];

  if (!session || !userRole || !allowedRoles.includes(userRole)) {
    throw new Error(
      allowManager
        ? "Akses ditolak: Anda tidak memiliki izin untuk melihat Buku Induk Customer."
        : "Akses ditolak: Hanya Administrator yang dapat memperbarui identitas customer."
    );
  }
}

export interface SerializedCustomerListItem {
  id: number;
  nama_ktp: string;
  nik: string;
  no_hp: string | null;
  alamat_ktp: string;
  tempat_lahir: string;
  tgl_lahir: string;
  jumlah_unit: number;
  created_at: string;
}

export interface SerializedCustomerTransaction {
  id: number;
  metode_bayar: "KPR" | "CASH_KERAS" | "CASH_TEMPO";
  harga_deal: number;
  status_transaksi: string;
  tahap_detail: string;
  closing_at: string | null;
  created_at: string;
  unit: {
    id: number;
    blok: string;
    status_unit: string;
    tipe: {
      id: number;
      nama_tipe: string;
      kategori: "SUBSIDI" | "KOMERSIL" | "KAVLING";
      harga_dasar: number;
    };
  };
}

export interface SerializedCustomerDetail {
  id: number;
  nama_ktp: string;
  nik: string;
  tempat_lahir: string;
  tgl_lahir: string;
  alamat_ktp: string;
  no_hp: string | null;
  created_at: string;
  updated_at: string;
  jumlah_unit: number;
  transaksi: SerializedCustomerTransaction[];
}

/**
 * 1. Fetch all Customers with transaction counts (Buku Induk Customer)
 */
export async function getCustomers(query?: {
  search?: string;
}): Promise<ActionResponse<SerializedCustomerListItem[]>> {
  try {
    await enforceCustomerAccessRole(true);

    const searchTerm = query?.search?.trim();

    const whereClause = searchTerm
      ? {
          OR: [
            { nama_ktp: { contains: searchTerm } },
            { nik: { contains: searchTerm } },
            { no_hp: { contains: searchTerm } },
          ],
        }
      : {};

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { transaksi: true },
        },
      },
      orderBy: { nama_ktp: "asc" },
    });

    const serialized: SerializedCustomerListItem[] = customers.map((c) => ({
      id: c.id,
      nama_ktp: c.nama_ktp,
      nik: c.nik,
      no_hp: c.no_hp,
      alamat_ktp: c.alamat_ktp,
      tempat_lahir: c.tempat_lahir,
      tgl_lahir: toWibDay(c.tgl_lahir),
      jumlah_unit: c._count.transaksi,
      created_at: c.created_at.toISOString(),
    }));

    return {
      success: true,
      message: "Data customer berhasil dimuat",
      data: serialized,
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal memuat data customer";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * 2. Fetch single Customer detail with owned units / transactions
 */
export async function getCustomerDetail(
  id: number
): Promise<ActionResponse<SerializedCustomerDetail>> {
  try {
    await enforceCustomerAccessRole(true);

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transaksi: true },
        },
        transaksi: {
          include: {
            unit: {
              include: {
                tipe: true,
              },
            },
          },
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!customer) {
      return {
        success: false,
        message: "Customer tidak ditemukan di database",
      };
    }

    const serialized: SerializedCustomerDetail = {
      id: customer.id,
      nama_ktp: customer.nama_ktp,
      nik: customer.nik,
      tempat_lahir: customer.tempat_lahir,
      tgl_lahir: toWibDay(customer.tgl_lahir),
      alamat_ktp: customer.alamat_ktp,
      no_hp: customer.no_hp,
      created_at: customer.created_at.toISOString(),
      updated_at: customer.updated_at.toISOString(),
      jumlah_unit: customer._count.transaksi,
      transaksi: customer.transaksi.map((t) => ({
        id: t.id,
        metode_bayar: t.metode_bayar,
        harga_deal: Number(t.harga_deal),
        status_transaksi: t.status_transaksi,
        tahap_detail: t.tahap_detail,
        closing_at: t.closing_at ? toWibDay(t.closing_at) : null,
        created_at: t.created_at.toISOString(),
        unit: {
          id: t.unit.id,
          blok: t.unit.blok,
          status_unit: t.unit.status_unit,
          tipe: {
            id: t.unit.tipe.id,
            nama_tipe: t.unit.tipe.nama_tipe,
            kategori: t.unit.tipe.kategori,
            harga_dasar: Number(t.unit.tipe.harga_dasar),
          },
        },
      })),
    };

    return {
      success: true,
      message: "Detail customer berhasil dimuat",
      data: serialized,
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal memuat detail customer";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * 3. Update customer identity (Nama KTP, NIK, TTL, Alamat, No HP)
 * Only ADMIN and DIRECTOR are permitted to execute this mutation.
 */
export async function updateCustomerIdentity(
  id: number,
  data: UpdateCustomerIdentityInput
): Promise<ActionResponse<SerializedCustomerDetail>> {
  try {
    await enforceCustomerAccessRole(false);

    const parsed = updateCustomerIdentitySchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Validasi data gagal",
      };
    }

    // Verify customer exists
    const currentCustomer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, nik: true },
    });

    if (!currentCustomer) {
      return {
        success: false,
        message: "Customer tidak ditemukan",
      };
    }

    // Check NIK uniqueness if NIK is modified
    if (parsed.data.nik !== currentCustomer.nik) {
      const existingWithNik = await prisma.customer.findFirst({
        where: {
          nik: parsed.data.nik,
          id: { not: id },
        },
        select: { id: true, nama_ktp: true },
      });

      if (existingWithNik) {
        return {
          success: false,
          message: `NIK '${parsed.data.nik}' sudah terdaftar atas nama ${existingWithNik.nama_ktp}.`,
        };
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        nama_ktp: parsed.data.nama_ktp,
        nik: parsed.data.nik,
        tempat_lahir: parsed.data.tempat_lahir,
        tgl_lahir: parseDateOnlyUTC(parsed.data.tgl_lahir),
        alamat_ktp: parsed.data.alamat_ktp,
        no_hp: parsed.data.no_hp,
      },
      include: {
        _count: {
          select: { transaksi: true },
        },
        transaksi: {
          include: {
            unit: {
              include: {
                tipe: true,
              },
            },
          },
          orderBy: { created_at: "desc" },
        },
      },
    });

    // Revalidate customer directory and detail pages
    revalidatePath("/admin/customer");
    revalidatePath(`/admin/customer/${id}`);
    revalidatePath("/manager/customer");
    revalidatePath(`/manager/customer/${id}`);

    const serialized: SerializedCustomerDetail = {
      id: updated.id,
      nama_ktp: updated.nama_ktp,
      nik: updated.nik,
      tempat_lahir: updated.tempat_lahir,
      tgl_lahir: toWibDay(updated.tgl_lahir),
      alamat_ktp: updated.alamat_ktp,
      no_hp: updated.no_hp,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
      jumlah_unit: updated._count.transaksi,
      transaksi: updated.transaksi.map((t) => ({
        id: t.id,
        metode_bayar: t.metode_bayar,
        harga_deal: Number(t.harga_deal),
        status_transaksi: t.status_transaksi,
        tahap_detail: t.tahap_detail,
        closing_at: t.closing_at ? toWibDay(t.closing_at) : null,
        created_at: t.created_at.toISOString(),
        unit: {
          id: t.unit.id,
          blok: t.unit.blok,
          status_unit: t.unit.status_unit,
          tipe: {
            id: t.unit.tipe.id,
            nama_tipe: t.unit.tipe.nama_tipe,
            kategori: t.unit.tipe.kategori,
            harga_dasar: Number(t.unit.tipe.harga_dasar),
          },
        },
      })),
    };

    return {
      success: true,
      message: `Identitas customer '${updated.nama_ktp}' berhasil diperbarui`,
      data: serialized,
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Gagal memperbarui identitas customer";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}
