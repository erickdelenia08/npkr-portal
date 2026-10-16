"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  masterTipeSchema,
  MasterTipeInput,
  singleUnitSchema,
  SingleUnitInput,
  bulkUnitSchema,
  BulkUnitInput,
} from "@/schemas/master-unit.schema";
import { Prisma } from "@/generated/prisma";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Role-Based Access Control helper.
 * Only ADMIN, MANAGER, and DIRECTOR roles are permitted to mutate master data.
 */
async function enforceAdminRole(): Promise<void> {
  const session = await auth();
  const userRole = session?.user?.role;

  const allowedRoles = ["ADMIN", "MANAGER", "DIRECTOR"];

  if (!session || !userRole || !allowedRoles.includes(userRole)) {
    throw new Error("Akses ditolak: Anda tidak memiliki izin untuk mengelola Master Data.");
  }
}

// ==========================================
// 1. MASTER TIPE ACTIONS
// ==========================================

export interface SerializedMasterTipe {
  id: number;
  nama_tipe: string;
  kategori: "SUBSIDI" | "KOMERSIL" | "KAVLING";
  luas_bangunan: number | null;
  luas_tanah: number;
  harga_dasar: number;
  _count?: {
    units: number;
  };
}

/**
 * Retrieve all Master Tipe with associated unit counts.
 */
export async function getMasterTipeList(): Promise<ActionResponse<SerializedMasterTipe[]>> {
  try {
    const list = await prisma.masterTipe.findMany({
      include: {
        _count: {
          select: { units: true },
        },
      },
      orderBy: { id: "asc" },
    });

    const serialized: SerializedMasterTipe[] = list.map((item) => ({
      id: item.id,
      nama_tipe: item.nama_tipe,
      kategori: item.kategori,
      luas_bangunan: item.luas_bangunan,
      luas_tanah: item.luas_tanah,
      harga_dasar: Number(item.harga_dasar),
      _count: item._count,
    }));

    return {
      success: true,
      message: "Data tipe unit berhasil dimuat",
      data: serialized,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memuat data tipe unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Create a new Master Tipe
 */
export async function createMasterTipe(
  input: MasterTipeInput
): Promise<ActionResponse<SerializedMasterTipe>> {
  try {
    await enforceAdminRole();

    const parsed = masterTipeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Validasi gagal",
      };
    }

    const created = await prisma.masterTipe.create({
      data: {
        nama_tipe: parsed.data.nama_tipe,
        kategori: parsed.data.kategori,
        luas_bangunan: parsed.data.luas_bangunan || null,
        luas_tanah: parsed.data.luas_tanah,
        harga_dasar: new Prisma.Decimal(parsed.data.harga_dasar),
      },
    });

    revalidatePath("/admin/master-unit");

    return {
      success: true,
      message: `Tipe unit '${created.nama_tipe}' berhasil ditambahkan`,
      data: {
        id: created.id,
        nama_tipe: created.nama_tipe,
        kategori: created.kategori,
        luas_bangunan: created.luas_bangunan,
        luas_tanah: created.luas_tanah,
        harga_dasar: Number(created.harga_dasar),
      },
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal menambahkan tipe unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Update an existing Master Tipe
 */
export async function updateMasterTipe(
  id: number,
  input: MasterTipeInput
): Promise<ActionResponse<SerializedMasterTipe>> {
  try {
    await enforceAdminRole();

    const parsed = masterTipeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Validasi gagal",
      };
    }

    const updated = await prisma.masterTipe.update({
      where: { id },
      data: {
        nama_tipe: parsed.data.nama_tipe,
        kategori: parsed.data.kategori,
        luas_bangunan: parsed.data.luas_bangunan || null,
        luas_tanah: parsed.data.luas_tanah,
        harga_dasar: new Prisma.Decimal(parsed.data.harga_dasar),
      },
    });

    revalidatePath("/admin/master-unit");

    return {
      success: true,
      message: `Tipe unit '${updated.nama_tipe}' berhasil diperbarui`,
      data: {
        id: updated.id,
        nama_tipe: updated.nama_tipe,
        kategori: updated.kategori,
        luas_bangunan: updated.luas_bangunan,
        luas_tanah: updated.luas_tanah,
        harga_dasar: Number(updated.harga_dasar),
      },
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memperbarui tipe unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Delete a Master Tipe (guarded against cascading conflicts)
 */
export async function deleteMasterTipe(id: number): Promise<ActionResponse> {
  try {
    await enforceAdminRole();

    // Check if any unit is attached to this type
    const unitsCount = await prisma.masterUnit.count({
      where: { tipe_id: id },
    });

    if (unitsCount > 0) {
      return {
        success: false,
        message: `Tidak dapat menghapus tipe ini karena masih digunakan oleh ${unitsCount} unit. Hapus atau pindahkan unit terlebih dahulu.`,
      };
    }

    await prisma.masterTipe.delete({ where: { id } });
    revalidatePath("/admin/master-unit");

    return {
      success: true,
      message: "Tipe unit berhasil dihapus",
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal menghapus tipe unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

// ==========================================
// 2. MASTER UNIT ACTIONS
// ==========================================

export interface SerializedMasterUnit {
  id: number;
  tipe_id: number;
  blok: string;
  status_unit: "AVAILABLE" | "HOLD" | "SOLD";
  harga_khusus: number | null;
  tipe: {
    id: number;
    nama_tipe: string;
    kategori: "SUBSIDI" | "KOMERSIL" | "KAVLING";
    harga_dasar: number;
  };
}

export interface UnitQueryFilter {
  search?: string;
  status?: string;
  tipeId?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedUnitsResult {
  units: SerializedMasterUnit[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Retrieve paginated list of Master Units with search & filters
 */
export async function getMasterUnits(
  params: UnitQueryFilter = {}
): Promise<ActionResponse<PaginatedUnitsResult>> {
  try {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.MasterUnitWhereInput = {};

    // Search by Blok name
    if (params.search && params.search.trim()) {
      where.blok = {
        contains: params.search.trim(),
      };
    }

    // Filter by status
    if (params.status && ["AVAILABLE", "HOLD", "SOLD"].includes(params.status)) {
      where.status_unit = params.status as "AVAILABLE" | "HOLD" | "SOLD";
    }

    // Filter by tipe
    if (params.tipeId && params.tipeId > 0) {
      where.tipe_id = params.tipeId;
    }

    const [total, rawUnits] = await Promise.all([
      prisma.masterUnit.count({ where }),
      prisma.masterUnit.findMany({
        where,
        include: {
          tipe: true,
        },
        orderBy: { blok: "asc" },
        skip,
        take: limit,
      }),
    ]);

    const units: SerializedMasterUnit[] = rawUnits.map((u) => ({
      id: u.id,
      tipe_id: u.tipe_id,
      blok: u.blok,
      status_unit: u.status_unit,
      harga_khusus: u.harga_khusus ? Number(u.harga_khusus) : null,
      tipe: {
        id: u.tipe.id,
        nama_tipe: u.tipe.nama_tipe,
        kategori: u.tipe.kategori,
        harga_dasar: Number(u.tipe.harga_dasar),
      },
    }));

    return {
      success: true,
      message: "Data unit berhasil dimuat",
      data: {
        units,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memuat data unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Create a single Master Unit
 */
export async function createSingleUnit(
  input: SingleUnitInput
): Promise<ActionResponse<SerializedMasterUnit>> {
  try {
    await enforceAdminRole();

    const parsed = singleUnitSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Validasi gagal",
      };
    }

    // Check if blok already exists
    const existing = await prisma.masterUnit.findUnique({
      where: { blok: parsed.data.blok },
    });

    if (existing) {
      return {
        success: false,
        message: `Blok '${parsed.data.blok}' sudah ada di database`,
      };
    }

    const created = await prisma.masterUnit.create({
      data: {
        blok: parsed.data.blok,
        tipe_id: parsed.data.tipe_id,
        status_unit: parsed.data.status_unit || "AVAILABLE",
        harga_khusus: parsed.data.harga_khusus
          ? new Prisma.Decimal(parsed.data.harga_khusus)
          : null,
      },
      include: {
        tipe: true,
      },
    });

    revalidatePath("/admin/master-unit");

    return {
      success: true,
      message: `Unit blok '${created.blok}' berhasil ditambahkan`,
      data: {
        id: created.id,
        tipe_id: created.tipe_id,
        blok: created.blok,
        status_unit: created.status_unit,
        harga_khusus: created.harga_khusus ? Number(created.harga_khusus) : null,
        tipe: {
          id: created.tipe.id,
          nama_tipe: created.tipe.nama_tipe,
          kategori: created.tipe.kategori,
          harga_dasar: Number(created.tipe.harga_dasar),
        },
      },
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal menambahkan unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Bulk create Master Units using Prisma's createMany()
 */
export async function createBulkUnits(
  input: BulkUnitInput
): Promise<ActionResponse<{ count: number; duplicatesSkipped: number }>> {
  try {
    await enforceAdminRole();

    const parsed = bulkUnitSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Validasi gagal",
      };
    }

    const { prefix_blok, nomor_mulai, nomor_akhir, tipe_id, harga_khusus } = parsed.data;

    // Verify that the chosen Tipe exists
    const tipeExists = await prisma.masterTipe.findUnique({
      where: { id: tipe_id },
    });

    if (!tipeExists) {
      return {
        success: false,
        message: "Tipe unit yang dipilih tidak ditemukan",
      };
    }

    // Build the array of unit objects
    const unitsToCreate: Prisma.MasterUnitCreateManyInput[] = [];
    for (let num = nomor_mulai; num <= nomor_akhir; num++) {
      unitsToCreate.push({
        blok: `${prefix_blok}${num}`,
        tipe_id,
        status_unit: "AVAILABLE",
        harga_khusus: harga_khusus ? new Prisma.Decimal(harga_khusus) : null,
      });
    }

    // Check which blocks already exist in the database
    const existingBloks = await prisma.masterUnit.findMany({
      where: {
        blok: {
          in: unitsToCreate.map((u) => u.blok),
        },
      },
      select: { blok: true },
    });

    const existingBlokSet = new Set(existingBloks.map((b) => b.blok));
    const nonConflictingUnits = unitsToCreate.filter((u) => !existingBlokSet.has(u.blok));

    if (nonConflictingUnits.length === 0) {
      return {
        success: false,
        message: `Semua unit dalam rentang ${prefix_blok}${nomor_mulai} s/d ${prefix_blok}${nomor_akhir} sudah ada di database.`,
      };
    }

    // Perform efficient bulk creation using Prisma's createMany
    const result = await prisma.masterUnit.createMany({
      data: nonConflictingUnits,
      skipDuplicates: true,
    });

    revalidatePath("/admin/master-unit");

    const skippedCount = unitsToCreate.length - result.count;
    const msg = skippedCount > 0
      ? `Berhasil menambahkan ${result.count} unit baru (${skippedCount} unit dilewati karena sudah ada).`
      : `Berhasil menambahkan ${result.count} unit baru secara massal.`;

    return {
      success: true,
      message: msg,
      data: {
        count: result.count,
        duplicatesSkipped: skippedCount,
      },
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal membuat unit secara massal";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Update unit details or unit status
 */
export async function updateMasterUnit(
  id: number,
  data: {
    tipe_id?: number;
    status_unit?: "AVAILABLE" | "HOLD" | "SOLD";
    harga_khusus?: number | null;
  }
): Promise<ActionResponse> {
  try {
    await enforceAdminRole();

    const updatePayload: Prisma.MasterUnitUpdateInput = {};

    if (data.tipe_id) {
      updatePayload.tipe = { connect: { id: data.tipe_id } };
    }
    if (data.status_unit) {
      updatePayload.status_unit = data.status_unit;
    }
    if (data.harga_khusus !== undefined) {
      updatePayload.harga_khusus = data.harga_khusus
        ? new Prisma.Decimal(data.harga_khusus)
        : null;
    }

    await prisma.masterUnit.update({
      where: { id },
      data: updatePayload,
    });

    revalidatePath("/admin/master-unit");

    return {
      success: true,
      message: "Data unit berhasil diperbarui",
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memperbarui unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Delete a unit
 */
export async function deleteMasterUnit(id: number): Promise<ActionResponse> {
  try {
    await enforceAdminRole();

    // Check if unit has any transactions
    const unit = await prisma.masterUnit.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transaksi: true },
        },
      },
    });

    if (!unit) {
      return { success: false, message: "Unit tidak ditemukan" };
    }

    if (unit._count.transaksi > 0) {
      return {
        success: false,
        message: "Unit ini tidak dapat dihapus karena sudah memiliki riwayat transaksi.",
      };
    }

    if (unit.status_unit !== "AVAILABLE") {
      return {
        success: false,
        message: `Unit berstatus '${unit.status_unit}' tidak dapat dihapus. Ubah status ke AVAILABLE terlebih dahulu jika ingin menghapus.`,
      };
    }

    await prisma.masterUnit.delete({ where: { id } });
    revalidatePath("/admin/master-unit");

    return {
      success: true,
      message: `Unit '${unit.blok}' berhasil dihapus`,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal menghapus unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}
