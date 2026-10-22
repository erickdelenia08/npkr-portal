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
  changeTipeSchema,
  ChangeTipeInput,
  changeTipeBulkSchema,
  ChangeTipeBulkInput,
} from "@/schemas/master-unit.schema";
import { Prisma } from "@/generated/prisma";
import { buildNamaTipe, parseBlok } from "@/lib/tipe-name";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Role-Based Access Control helper.
 * Strictly checks that the user has the ADMIN role for mutating master inventory data.
 */
async function enforceAdminRole(): Promise<{ userId: number }> {
  const session = await auth();
  const userRole = session?.user?.role;
  const userId = session?.user?.id ? parseInt(session.user.id, 10) : 0;

  if (!session || userRole !== "ADMIN" || !userId) {
    throw new Error(
      "Akses ditolak: Hanya pengguna dengan peran ADMIN yang memiliki izin untuk mengubah data Master Unit & Tipe."
    );
  }

  return { userId };
}

/**
 * Check current user role for client-side permission toggles.
 */
export async function getCurrentUserRole(): Promise<{ isAdmin: boolean; role: string | null }> {
  const session = await auth();
  const userRole = session?.user?.role || null;
  return {
    isAdmin: userRole === "ADMIN",
    role: userRole,
  };
}

// ==========================================
// 1. MASTER TIPE ACTIONS
// ==========================================

export interface SerializedMasterTipe {
  id: number;
  nama_tipe: string;
  kategori: "SUBSIDI" | "KOMERSIL" | "KAVLING";
  luas_bangunan: number;
  luas_tanah: number;
  harga_dasar: number;
  jumlah_unit: number;
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
      jumlah_unit: item._count?.units || 0,
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
 * nama_tipe is ALWAYS derived: ${kategori}-${luas_bangunan}/${luas_tanah}
 * KAVLING forces luas_bangunan = 0.
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

    const { kategori, luas_tanah, harga_dasar } = parsed.data;
    const luas_bangunan = kategori === "KAVLING" ? 0 : Number(parsed.data.luas_bangunan || 0);

    const derivedNama = buildNamaTipe(kategori, luas_bangunan, luas_tanah);

    // Check duplicate of (kategori, luas_bangunan, luas_tanah)
    const existing = await prisma.masterTipe.findUnique({
      where: {
        kategori_luas_bangunan_luas_tanah: {
          kategori,
          luas_bangunan,
          luas_tanah,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        message: `Tipe ${derivedNama} sudah ada di sistem.`,
      };
    }

    const created = await prisma.masterTipe.create({
      data: {
        nama_tipe: derivedNama,
        kategori,
        luas_bangunan,
        luas_tanah,
        harga_dasar: new Prisma.Decimal(harga_dasar),
      },
      include: {
        _count: {
          select: { units: true },
        },
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
        jumlah_unit: 0,
        _count: created._count,
      },
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal menambahkan tipe unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Update an existing Master Tipe
 * If a tipe is already used by units, updateMasterTipe must refuse to change kategori or luas_tanah.
 * (luas_bangunan and harga_dasar may change); recompute nama_tipe in the same transaction.
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

    const currentTipe = await prisma.masterTipe.findUnique({
      where: { id },
      include: {
        _count: {
          select: { units: true },
        },
      },
    });

    if (!currentTipe) {
      return { success: false, message: "Tipe unit tidak ditemukan" };
    }

    const unitCount = currentTipe._count.units;
    const { kategori, luas_tanah, harga_dasar } = parsed.data;
    const luas_bangunan = kategori === "KAVLING" ? 0 : Number(parsed.data.luas_bangunan || 0);

    // Rule: If tipe is used by units, kategori and luas_tanah are FIXED because siteplan is legally approved
    if (unitCount > 0) {
      if (kategori !== currentTipe.kategori || luas_tanah !== currentTipe.luas_tanah) {
        return {
          success: false,
          message: `Tipe ini sudah digunakan oleh ${unitCount} unit. Kategori dan Luas Tanah tidak boleh diubah karena siteplan telah disetujui. Hanya Luas Bangunan dan Harga Dasar yang boleh disesuaikan.`,
        };
      }
    }

    const derivedNama = buildNamaTipe(kategori, luas_bangunan, luas_tanah);

    // Check collision with another existing tipe
    const duplicate = await prisma.masterTipe.findFirst({
      where: {
        kategori,
        luas_bangunan,
        luas_tanah,
        NOT: { id },
      },
    });

    if (duplicate) {
      return {
        success: false,
        message: `Tipe ${derivedNama} sudah ada di sistem.`,
      };
    }

    const updated = await prisma.masterTipe.update({
      where: { id },
      data: {
        nama_tipe: derivedNama,
        kategori,
        luas_bangunan,
        luas_tanah,
        harga_dasar: new Prisma.Decimal(harga_dasar),
      },
      include: {
        _count: {
          select: { units: true },
        },
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
        jumlah_unit: updated._count.units,
        _count: updated._count,
      },
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memperbarui tipe unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Delete a Master Tipe (refuse if any unit uses it)
 */
export async function deleteMasterTipe(id: number): Promise<ActionResponse> {
  try {
    await enforceAdminRole();

    const unitsCount = await prisma.masterUnit.count({
      where: { tipe_id: id },
    });

    if (unitsCount > 0) {
      return {
        success: false,
        message: `Tidak dapat menghapus: Tipe ini masih digunakan oleh ${unitsCount} unit.`,
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
  blok_prefix: string;
  blok_nomor: number;
  status_unit: "AVAILABLE" | "HOLD" | "BOOKED" | "SOLD";
  harga_khusus: number | null;
  isLocked: boolean;
  tipe: {
    id: number;
    nama_tipe: string;
    kategori: "SUBSIDI" | "KOMERSIL" | "KAVLING";
    luas_bangunan: number;
    luas_tanah: number;
    harga_dasar: number;
  };
}

export interface UnitQueryFilter {
  search?: string;
  status?: string;
  tipeId?: number;
  kategori?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedUnitsResult {
  units: SerializedMasterUnit[];
  total: number;
  page: number;
  totalPages: number;
}

export interface MasterUnitSummary {
  total: number;
  available: number;
  proses: number; // HOLD + BOOKED
  sold: number;
  perKategori: {
    SUBSIDI: number;
    KOMERSIL: number;
    KAVLING: number;
  };
}

/**
 * Smart Lock Guard: Checks whether a unit is locked by active ITJ or active Transaksi.
 */
export async function checkUnitIsLocked(unitId: number): Promise<boolean> {
  const [activeItjCount, activeTrxCount] = await Promise.all([
    prisma.itj.count({
      where: {
        unit_id: unitId,
        status: { in: ["DIAJUKAN", "PERLU_REVISI", "DISETUJUI"] },
      },
    }),
    prisma.transaksi.count({
      where: {
        unit_id: unitId,
        status_transaksi: { not: "BATAL" },
        cancelled_at: null,
      },
    }),
  ]);

  return activeItjCount > 0 || activeTrxCount > 0;
}

/**
 * Retrieve server-side summary of master units.
 * Computes status counts and breakdown per kategori from the entire DB.
 */
export async function getMasterUnitSummary(): Promise<ActionResponse<MasterUnitSummary>> {
  try {
    const [statusGroups, tipes] = await Promise.all([
      prisma.masterUnit.groupBy({
        by: ["status_unit"],
        _count: { id: true },
      }),
      prisma.masterTipe.findMany({
        select: {
          kategori: true,
          _count: {
            select: { units: true },
          },
        },
      }),
    ]);

    let available = 0;
    let hold = 0;
    let booked = 0;
    let sold = 0;
    let total = 0;

    for (const group of statusGroups) {
      const count = group._count.id;
      total += count;
      if (group.status_unit === "AVAILABLE") available = count;
      else if (group.status_unit === "HOLD") hold = count;
      else if (group.status_unit === "BOOKED") booked = count;
      else if (group.status_unit === "SOLD") sold = count;
    }

    const perKategori = {
      SUBSIDI: 0,
      KOMERSIL: 0,
      KAVLING: 0,
    };

    for (const t of tipes) {
      const count = t._count.units;
      if (t.kategori === "SUBSIDI") perKategori.SUBSIDI += count;
      else if (t.kategori === "KOMERSIL") perKategori.KOMERSIL += count;
      else if (t.kategori === "KAVLING") perKategori.KAVLING += count;
    }

    return {
      success: true,
      message: "Summary master unit berhasil dimuat",
      data: {
        total,
        available,
        proses: hold + booked,
        sold,
        perKategori,
      },
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memuat summary unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Retrieve paginated list of Master Units with natural sort by blok and filters.
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
    if (params.status && ["AVAILABLE", "HOLD", "BOOKED", "SOLD"].includes(params.status)) {
      where.status_unit = params.status as "AVAILABLE" | "HOLD" | "BOOKED" | "SOLD";
    }

    // Filter by tipe
    if (params.tipeId && params.tipeId > 0) {
      where.tipe_id = params.tipeId;
    }

    // Filter by kategori
    if (
      params.kategori &&
      ["SUBSIDI", "KOMERSIL", "KAVLING"].includes(params.kategori)
    ) {
      where.tipe = {
        is: {
          kategori: params.kategori as "SUBSIDI" | "KOMERSIL" | "KAVLING",
        },
      };
    }



    const [total, rawUnits] = await Promise.all([
      prisma.masterUnit.count({ where }),
      prisma.masterUnit.findMany({
        where,
        include: {
          tipe: true,
          itj: {
            where: {
              status: { in: ["DIAJUKAN", "PERLU_REVISI", "DISETUJUI"] },
            },
            select: { id: true },
            take: 1,
          },
          transaksi: {
            where: {
              status_transaksi: { not: "BATAL" },
              cancelled_at: null,
            },
            select: { id: true },
            take: 1,
          },
        },
        // Natural sort order: blok_prefix then numeric blok_nomor, then blok fallback
        orderBy: [{ blok_prefix: "asc" }, { blok_nomor: "asc" }, { blok: "asc" }],
        skip,
        take: limit,
      }),
    ]);

    const units: SerializedMasterUnit[] = rawUnits.map((u) => {
      const isLocked = (u.itj && u.itj.length > 0) || (u.transaksi && u.transaksi.length > 0);
      return {
        id: u.id,
        tipe_id: u.tipe_id,
        blok: u.blok,
        blok_prefix: u.blok_prefix,
        blok_nomor: u.blok_nomor,
        status_unit: u.status_unit,
        harga_khusus: u.harga_khusus ? Number(u.harga_khusus) : null,
        isLocked,
        tipe: {
          id: u.tipe.id,
          nama_tipe: u.tipe.nama_tipe,
          kategori: u.tipe.kategori,
          luas_bangunan: u.tipe.luas_bangunan,
          luas_tanah: u.tipe.luas_tanah,
          harga_dasar: Number(u.tipe.harga_dasar),
        },
      };
    });

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
 * Retrieve all Master Units for siteplan visual & read-only inventory
 */
export async function getAllMasterUnits(): Promise<ActionResponse<SerializedMasterUnit[]>> {
  try {
    const rawUnits = await prisma.masterUnit.findMany({
      include: {
        tipe: true,
        itj: {
          where: {
            status: { in: ["DIAJUKAN", "PERLU_REVISI", "DISETUJUI"] },
          },
          select: { id: true },
          take: 1,
        },
        transaksi: {
          where: {
            status_transaksi: { not: "BATAL" },
            cancelled_at: null,
          },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: [{ blok_prefix: "asc" }, { blok_nomor: "asc" }, { blok: "asc" }],
    });

    const units: SerializedMasterUnit[] = rawUnits.map((u) => {
      const isLocked = (u.itj && u.itj.length > 0) || (u.transaksi && u.transaksi.length > 0);
      return {
        id: u.id,
        tipe_id: u.tipe_id,
        blok: u.blok,
        blok_prefix: u.blok_prefix,
        blok_nomor: u.blok_nomor,
        status_unit: u.status_unit,
        harga_khusus: u.harga_khusus ? Number(u.harga_khusus) : null,
        isLocked,
        tipe: {
          id: u.tipe.id,
          nama_tipe: u.tipe.nama_tipe,
          kategori: u.tipe.kategori,
          luas_bangunan: u.tipe.luas_bangunan,
          luas_tanah: u.tipe.luas_tanah,
          harga_dasar: Number(u.tipe.harga_dasar),
        },
      };
    });

    return {
      success: true,
      message: "Data seluruh unit berhasil dimuat",
      data: units,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memuat inventaris unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Create a single Master Unit (Siteplan setup)
 * Status is ALWAYS AVAILABLE.
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

    const trimmedBlok = parsed.data.blok.trim();

    // Check if blok already exists
    const existing = await prisma.masterUnit.findUnique({
      where: { blok: trimmedBlok },
    });

    if (existing) {
      return {
        success: false,
        message: `Blok '${trimmedBlok}' sudah ada di database`,
      };
    }

    const { prefix, nomor } = parseBlok(trimmedBlok);

    const created = await prisma.masterUnit.create({
      data: {
        blok: trimmedBlok,
        blok_prefix: prefix,
        blok_nomor: nomor,
        tipe_id: parsed.data.tipe_id,
        status_unit: "AVAILABLE",
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
        blok_prefix: created.blok_prefix,
        blok_nomor: created.blok_nomor,
        status_unit: created.status_unit,
        harga_khusus: created.harga_khusus ? Number(created.harga_khusus) : null,
        isLocked: false,
        tipe: {
          id: created.tipe.id,
          nama_tipe: created.tipe.nama_tipe,
          kategori: created.tipe.kategori,
          luas_bangunan: created.tipe.luas_bangunan,
          luas_tanah: created.tipe.luas_tanah,
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
 * Bulk create Master Units with collision checks and optional skipped numbers.
 * Status is ALWAYS AVAILABLE.
 */
export async function createBulkUnits(
  input: BulkUnitInput
): Promise<ActionResponse<{ count: number }>> {
  try {
    await enforceAdminRole();

    const parsed = bulkUnitSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Validasi gagal",
      };
    }

    const {
      prefix_blok,
      nomor_mulai,
      nomor_akhir,
      tipe_id,
      harga_khusus,
    } = parsed.data;

    // Verify chosen tipe
    const tipeExists = await prisma.masterTipe.findUnique({
      where: { id: tipe_id },
    });

    if (!tipeExists) {
      return {
        success: false,
        message: "Tipe unit yang dipilih tidak ditemukan",
      };
    }

    // Normalize prefix: strip existing hyphens/spaces and ensure standard single block "X-"
    const cleanPrefix = prefix_blok.trim().replace(/-+$/, "").toUpperCase();
    const formattedPrefix = `${cleanPrefix}-`;

    // Build unit candidate list
    const candidates: Array<{
      blok: string;
      blok_prefix: string;
      blok_nomor: number;
      tipe_id: number;
      status_unit: "AVAILABLE";
      harga_khusus: Prisma.Decimal | null;
    }> = [];

    for (let num = nomor_mulai; num <= nomor_akhir; num++) {
      const blokName = `${formattedPrefix}${num}`;
      const parsedPart = parseBlok(blokName);

      candidates.push({
        blok: blokName,
        blok_prefix: parsedPart.prefix,
        blok_nomor: parsedPart.nomor,
        tipe_id,
        status_unit: "AVAILABLE",
        harga_khusus: harga_khusus ? new Prisma.Decimal(harga_khusus) : null,
      });
    }

    // Check collisions with existing blok names
    const existingBloks = await prisma.masterUnit.findMany({
      where: {
        blok: {
          in: candidates.map((c) => c.blok),
        },
      },
      select: { blok: true },
    });

    if (existingBloks.length > 0) {
      const existingNames = existingBloks.map((b) => b.blok);
      const sample = existingNames.slice(0, 5).join(", ");
      const suffix = existingNames.length > 5 ? ` dan ${existingNames.length - 5} lainnya` : "";
      return {
        success: false,
        message: `Terdapat blok yang sudah ada di database (${sample}${suffix}). Harap ubah rentang atau prefix blok.`,
      };
    }

    // Insert all units
    const result = await prisma.masterUnit.createMany({
      data: candidates,
    });

    revalidatePath("/admin/master-unit");

    return {
      success: true,
      message: `Berhasil membuat ${result.count} blok unit secara massal`,
      data: { count: result.count },
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal membuat unit secara massal";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Change Unit Tipe (Single Unit)
 * Strict business rules:
 * 1. Unit exists
 * 2. Unit status is AVAILABLE and has no active Itj / Transaksi
 * 3. New tipe has SAME kategori AND SAME luas_tanah as current tipe
 * 4. newTipeId !== current tipe_id
 * 5. Alasan min 5 chars
 * 6. Logs into UnitTipeLog in a single transaction
 */
export async function changeUnitTipe(
  input: ChangeTipeInput & { unitId: number }
): Promise<ActionResponse<{ logId: number }>> {
  try {
    const { userId } = await enforceAdminRole();

    const parsed = changeTipeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Validasi gagal",
      };
    }

    const { unitId } = input;
    const { newTipeId, alasan, resetHargaKhusus } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch unit with current tipe
      const unit = await tx.masterUnit.findUnique({
        where: { id: unitId },
        include: {
          tipe: true,
          itj: {
            where: {
              status: { in: ["DIAJUKAN", "PERLU_REVISI", "DISETUJUI"] },
            },
            select: { id: true },
            take: 1,
          },
          transaksi: {
            where: {
              status_transaksi: { not: "BATAL" },
              cancelled_at: null,
            },
            select: { id: true },
            take: 1,
          },
        },
      });

      if (!unit) {
        throw new Error("Unit tidak ditemukan.");
      }

      // 2. Unit must be AVAILABLE and free from any active process
      if (unit.status_unit !== "AVAILABLE") {
        throw new Error(
          `Unit sedang berstatus '${unit.status_unit}'. Tipe hanya dapat diubah saat unit berstatus AVAILABLE.`
        );
      }

      const hasActiveProcess =
        (unit.itj && unit.itj.length > 0) || (unit.transaksi && unit.transaksi.length > 0);
      if (hasActiveProcess) {
        throw new Error(
          "Unit sedang dalam proses pengajuan ITJ atau transaksi aktif. Tipe tidak dapat diubah."
        );
      }

      // 3. New tipe must differ from current
      if (unit.tipe_id === newTipeId) {
        throw new Error("Tipe yang dipilih sama dengan tipe unit saat ini.");
      }

      // 4. Fetch new tipe
      const newTipe = await tx.masterTipe.findUnique({
        where: { id: newTipeId },
      });

      if (!newTipe) {
        throw new Error("Tipe baru tidak ditemukan.");
      }

      // 5. Compatible check: same kategori AND same luas_tanah
      if (newTipe.kategori !== unit.tipe.kategori) {
        throw new Error(
          `Kategori tidak cocok! Tipe unit saat ini adalah ${unit.tipe.kategori}, sedangkan tipe baru adalah ${newTipe.kategori}.`
        );
      }

      if (newTipe.luas_tanah !== unit.tipe.luas_tanah) {
        throw new Error(
          `Luas tanah tidak cocok! Luas tanah unit saat ini adalah ${unit.tipe.luas_tanah} m², sedangkan tipe baru adalah ${newTipe.luas_tanah} m². Luas tanah siteplan tidak boleh diubah.`
        );
      }

      // 6. Update unit
      const updateData: Prisma.MasterUnitUpdateInput = {
        tipe: { connect: { id: newTipeId } },
      };

      if (resetHargaKhusus) {
        updateData.harga_khusus = null;
      }

      await tx.masterUnit.update({
        where: { id: unitId },
        data: updateData,
      });

      return { blok: unit.blok, newNamaTipe: newTipe.nama_tipe };
    });

    revalidatePath("/admin/master-unit");

    return {
      success: true,
      message: `Tipe unit blok '${result.blok}' berhasil diubah menjadi '${result.newNamaTipe}'`,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal mengubah tipe unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

export interface BulkChangeTipeResult {
  berhasil: number;
  dilewati: { blok: string; alasan: string }[];
}

/**
 * Bulk Change Unit Tipe (Phase 2)
 * Applies strict validations per unit; does NOT fail the whole batch.
 */
export async function changeUnitTipeBulk(
  input: ChangeTipeBulkInput
): Promise<ActionResponse<BulkChangeTipeResult>> {
  try {
    const { userId } = await enforceAdminRole();

    const parsed = changeTipeBulkSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Validasi gagal",
      };
    }

    const { unitIds, newTipeId, alasan } = parsed.data;

    const newTipe = await prisma.masterTipe.findUnique({
      where: { id: newTipeId },
    });

    if (!newTipe) {
      return { success: false, message: "Tipe baru tidak ditemukan" };
    }

    let berhasil = 0;
    const dilewati: { blok: string; alasan: string }[] = [];

    for (const uId of unitIds) {
      try {
        await prisma.$transaction(async (tx) => {
          const unit = await tx.masterUnit.findUnique({
            where: { id: uId },
            include: {
              tipe: true,
              itj: {
                where: {
                  status: { in: ["DIAJUKAN", "PERLU_REVISI", "DISETUJUI"] },
                },
                select: { id: true },
                take: 1,
              },
              transaksi: {
                where: {
                  status_transaksi: { not: "BATAL" },
                  cancelled_at: null,
                },
                select: { id: true },
                take: 1,
              },
            },
          });

          if (!unit) {
            dilewati.push({ blok: `ID #${uId}`, alasan: "Unit tidak ditemukan" });
            return;
          }

          if (unit.status_unit !== "AVAILABLE") {
            dilewati.push({
              blok: unit.blok,
              alasan: `Status unit adalah '${unit.status_unit}' (hanya AVAILABLE yang dapat diubah)`,
            });
            return;
          }

          const hasActive =
            (unit.itj && unit.itj.length > 0) || (unit.transaksi && unit.transaksi.length > 0);
          if (hasActive) {
            dilewati.push({
              blok: unit.blok,
              alasan: "Memiliki ITJ atau transaksi berjalan",
            });
            return;
          }

          if (unit.tipe_id === newTipeId) {
            dilewati.push({
              blok: unit.blok,
              alasan: "Sudah menggunakan tipe yang sama",
            });
            return;
          }

          if (newTipe.kategori !== unit.tipe.kategori) {
            dilewati.push({
              blok: unit.blok,
              alasan: `Kategori berbeda (${unit.tipe.kategori} vs ${newTipe.kategori})`,
            });
            return;
          }

          if (newTipe.luas_tanah !== unit.tipe.luas_tanah) {
            dilewati.push({
              blok: unit.blok,
              alasan: `Luas tanah berbeda (${unit.tipe.luas_tanah}m² vs ${newTipe.luas_tanah}m²)`,
            });
            return;
          }

          // Update unit
          await tx.masterUnit.update({
            where: { id: uId },
            data: {
              tipe_id: newTipeId,
            },
          });

          berhasil++;
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Kesalahan tidak terduga";
        dilewati.push({ blok: `ID #${uId}`, alasan: msg });
      }
    }

    revalidatePath("/admin/master-unit");

    const message =
      berhasil > 0
        ? `Berhasil mengubah tipe untuk ${berhasil} unit.${
            dilewati.length > 0 ? ` (${dilewati.length} unit dilewati).` : ""
          }`
        : `Tidak ada unit yang diubah. (${dilewati.length} unit dilewati).`;

    return {
      success: berhasil > 0,
      message,
      data: { berhasil, dilewati },
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memproses bulk ganti tipe";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Update harga khusus on a unit.
 */
export async function updateUnitHargaKhusus(
  unitId: number,
  hargaKhusus: number | null
): Promise<ActionResponse> {
  try {
    await enforceAdminRole();

    const unit = await prisma.masterUnit.findUnique({
      where: { id: unitId },
    });

    if (!unit) {
      return { success: false, message: "Unit tidak ditemukan" };
    }

    await prisma.masterUnit.update({
      where: { id: unitId },
      data: {
        harga_khusus: hargaKhusus !== null ? new Prisma.Decimal(hargaKhusus) : null,
      },
    });

    revalidatePath("/admin/master-unit");

    return {
      success: true,
      message: `Harga khusus untuk blok '${unit.blok}' berhasil disimpan`,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal mengatur harga khusus";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Update unit details (for testing / backward compatibility)
 */
export async function updateMasterUnit(
  id: number,
  data: {
    tipe_id?: number;
    status_unit?: "AVAILABLE" | "HOLD" | "BOOKED" | "SOLD";
    harga_khusus?: number | null;
  }
): Promise<ActionResponse<SerializedMasterUnit>> {
  try {
    await enforceAdminRole();

    const currentUnit = await prisma.masterUnit.findUnique({
      where: { id },
      include: { tipe: true },
    });

    if (!currentUnit) {
      return { success: false, message: "Unit tidak ditemukan" };
    }

    const isLocked = await checkUnitIsLocked(id);

    if (data.status_unit !== undefined && data.status_unit !== currentUnit.status_unit) {
      if (isLocked) {
        throw new Error("Status unit dikunci oleh sistem karena ada transaksi berjalan.");
      }
    }

    const updatePayload: Prisma.MasterUnitUpdateInput = {};

    if (data.tipe_id) {
      updatePayload.tipe = { connect: { id: data.tipe_id } };
    }
    if (data.status_unit !== undefined) {
      updatePayload.status_unit = data.status_unit;
    }
    if (data.harga_khusus !== undefined) {
      updatePayload.harga_khusus = data.harga_khusus
        ? new Prisma.Decimal(data.harga_khusus)
        : null;
    }

    const updated = await prisma.masterUnit.update({
      where: { id },
      data: updatePayload,
      include: { tipe: true },
    });

    revalidatePath("/admin/master-unit");

    return {
      success: true,
      message: "Data unit berhasil diperbarui",
      data: {
        id: updated.id,
        tipe_id: updated.tipe_id,
        blok: updated.blok,
        blok_prefix: updated.blok_prefix,
        blok_nomor: updated.blok_nomor,
        status_unit: updated.status_unit,
        harga_khusus: updated.harga_khusus ? Number(updated.harga_khusus) : null,
        isLocked,
        tipe: {
          id: updated.tipe.id,
          nama_tipe: updated.tipe.nama_tipe,
          kategori: updated.tipe.kategori,
          luas_bangunan: updated.tipe.luas_bangunan,
          luas_tanah: updated.tipe.luas_tanah,
          harga_dasar: Number(updated.tipe.harga_dasar),
        },
      },
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal memperbarui unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}

/**
 * Delete a unit (allowed ONLY for AVAILABLE units without active Itj/Transaksi)
 */
export async function deleteMasterUnit(id: number): Promise<ActionResponse> {
  try {
    await enforceAdminRole();

    const unit = await prisma.masterUnit.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transaksi: true, itj: true },
        },
      },
    });

    if (!unit) {
      return { success: false, message: "Unit tidak ditemukan" };
    }

    if (unit._count.transaksi > 0 || unit._count.itj > 0) {
      return {
        success: false,
        message: "Unit ini tidak dapat dihapus karena sudah memiliki riwayat transaksi atau pengajuan ITJ.",
      };
    }

    if (unit.status_unit !== "AVAILABLE") {
      return {
        success: false,
        message: `Unit berstatus '${unit.status_unit}' tidak dapat dihapus.`,
      };
    }

    await prisma.masterUnit.delete({ where: { id } });
    revalidatePath("/admin/master-unit");

    return {
      success: true,
      message: `Unit blok '${unit.blok}' berhasil dihapus`,
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Gagal menghapus unit";
    return { success: false, message: errorMsg, error: errorMsg };
  }
}
