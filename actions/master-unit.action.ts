"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  masterTipeSchema,
  MasterTipeInput,
  singleUnitSchema,
  SingleUnitInput,
  changeTipeSchema,
  ChangeTipeInput,
  changeTipeBulkSchema,
  ChangeTipeBulkInput,
  setupUnitsBatchSchema,
} from "@/schemas/master-unit.schema";
import { Prisma } from "@/generated/prisma";
import { buildNamaTipe, parseBlok } from "@/lib/tipe-name";
import {
  normalizeBlok,
  expandRow,
  detectRowOverlaps,
  SetupRowInput,
  OverlapConflict,
  BusinessError,
} from "@/lib/unit-setup";

export interface ActionResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

/**
 * Centralized, safe error mapper:
 * - BusinessError & Zod validation errors pass through cleanly
 * - Prisma known errors are mapped to friendly Indonesian text
 * - Raw database and unexpected errors are logged to console.error and obscured from the client
 */
function handleActionError<T = unknown>(
  error: unknown,
  fallbackMessage: string
): ActionResponse<T> {
  if (error instanceof BusinessError) {
    return { success: false, message: error.message };
  }

  if (error instanceof z.ZodError) {
    return {
      success: false,
      message: error.issues[0]?.message || "Validasi data gagal",
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error("Prisma error in master-unit action:", error.code, error.message);
    let friendly = "Terjadi kesalahan pada sistem basis data.";
    if (error.code === "P2002") {
      friendly = "Data duplikat sudah terdaftar dalam sistem.";
    } else if (error.code === "P2003") {
      friendly = "Data masih dipakai oleh data lain dan tidak dapat diubah/dihapus.";
    } else if (error.code === "P2025") {
      friendly = "Data tidak ditemukan atau sudah berubah.";
    }
    return { success: false, message: friendly };
  }

  console.error("Unexpected error in master-unit action:", error);
  const msg = error instanceof Error ? error.message : fallbackMessage;
  return { success: false, message: msg };
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
    throw new BusinessError(
      "Akses ditolak: Hanya pengguna dengan peran ADMIN yang memiliki izin untuk mengubah data Master Unit & Tipe."
    );
  }

  return { userId };
}

/**
 * Read-action session guard: Any authenticated role (ADMIN, MANAGER, MARKETING)
 */
async function requireSession(): Promise<{ userId: number; role: string }> {
  const session = await auth();
  const userRole = session?.user?.role;
  const userId = session?.user?.id ? parseInt(session.user.id, 10) : 0;

  if (!session || !userId || !userRole) {
    throw new BusinessError("Silakan login terlebih dahulu untuk mengakses data ini.");
  }

  return { userId, role: userRole };
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
    await requireSession();

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
    return handleActionError(error, "Gagal memuat data tipe unit");
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

    const nama_tipe = buildNamaTipe(kategori, luas_bangunan, luas_tanah);

    // Unique combination check: @@unique([kategori, luas_bangunan, luas_tanah])
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
      throw new BusinessError(
        `Tipe unit '${nama_tipe}' sudah terdaftar. Setiap kombinasi Kategori, Luas Bangunan, dan Luas Tanah harus unik.`
      );
    }

    const created = await prisma.masterTipe.create({
      data: {
        nama_tipe,
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
    revalidatePath("/admin/master-unit/setup");

    return {
      success: true,
      message: `Tipe unit '${created.nama_tipe}' berhasil dibuat`,
      data: {
        id: created.id,
        nama_tipe: created.nama_tipe,
        kategori: created.kategori,
        luas_bangunan: created.luas_bangunan,
        luas_tanah: created.luas_tanah,
        harga_dasar: Number(created.harga_dasar),
        jumlah_unit: 0,
        _count: { units: 0 },
      },
    };
  } catch (error: unknown) {
    return handleActionError(error, "Gagal menambahkan tipe unit");
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
      throw new BusinessError("Tipe unit tidak ditemukan");
    }

    const unitCount = currentTipe._count.units;
    const { kategori, luas_tanah, harga_dasar } = parsed.data;
    const luas_bangunan = kategori === "KAVLING" ? 0 : Number(parsed.data.luas_bangunan || 0);

    // Rule: If tipe is used by units, kategori and luas_tanah are FIXED because siteplan is legally approved
    if (unitCount > 0) {
      if (kategori !== currentTipe.kategori || luas_tanah !== currentTipe.luas_tanah) {
        throw new BusinessError(
          `Tipe ini sudah digunakan oleh ${unitCount} unit. Kategori dan Luas Tanah tidak boleh diubah karena siteplan telah disetujui. Hanya Luas Bangunan dan Harga Dasar yang boleh disesuaikan.`
        );
      }
    }

    const derivedNama = buildNamaTipe(kategori, luas_bangunan, luas_tanah);

    // Check collision with another existing tipe
    const collision = await prisma.masterTipe.findFirst({
      where: {
        id: { not: id },
        kategori,
        luas_bangunan,
        luas_tanah,
      },
    });

    if (collision) {
      throw new BusinessError(
        `Kombinasi ${kategori} LB ${luas_bangunan} / LT ${luas_tanah} sudah digunakan oleh tipe '${collision.nama_tipe}'.`
      );
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
    revalidatePath("/admin/master-unit/setup");

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
        jumlah_unit: updated._count?.units || 0,
        _count: updated._count,
      },
    };
  } catch (error: unknown) {
    return handleActionError(error, "Gagal memperbarui tipe unit");
  }
}

/**
 * Delete a Master Tipe (allowed ONLY if unitCount === 0).
 */
export async function deleteMasterTipe(id: number): Promise<ActionResponse> {
  try {
    await enforceAdminRole();

    const tipe = await prisma.masterTipe.findUnique({
      where: { id },
      include: {
        _count: {
          select: { units: true },
        },
      },
    });

    if (!tipe) {
      throw new BusinessError("Tipe unit tidak ditemukan");
    }

    if (tipe._count.units > 0) {
      throw new BusinessError(
        `Tipe '${tipe.nama_tipe}' tidak dapat dihapus karena masih digunakan oleh ${tipe._count.units} unit.`
      );
    }

    // Check if referenced in historical unit tipe logs
    const logCount = await prisma.unitTipeLog.count({
      where: {
        OR: [{ tipe_lama_id: id }, { tipe_baru_id: id }],
      },
    });

    if (logCount > 0) {
      throw new BusinessError(
        `Tipe '${tipe.nama_tipe}' tidak dapat dihapus karena tercatat dalam riwayat perubahan tipe unit.`
      );
    }

    await prisma.masterTipe.delete({ where: { id } });

    revalidatePath("/admin/master-unit");
    revalidatePath("/admin/master-unit/setup");

    return {
      success: true,
      message: `Tipe unit '${tipe.nama_tipe}' berhasil dihapus`,
    };
  } catch (error: unknown) {
    return handleActionError(error, "Gagal menghapus tipe unit");
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
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  tipeId?: number;
  kategori?: string;
}

export interface PaginatedUnitsResult {
  units: SerializedMasterUnit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MasterUnitSummary {
  total: number;
  available: number;
  proses: number;
  sold: number;
  perKategori: {
    SUBSIDI: number;
    KOMERSIL: number;
    KAVLING: number;
  };
}

export interface SerializedUnitTipeLog {
  id: number;
  unit_id: number | null;
  blok: string;
  tipe_lama_id: number;
  tipe_baru_id: number;
  harga_khusus_lama: number | null;
  harga_khusus_direset: boolean;
  alasan: string;
  created_at: Date;
  tipe_lama: {
    id: number;
    nama_tipe: string;
    harga_dasar: number;
    kategori: string;
    luas_bangunan: number;
    luas_tanah: number;
  };
  tipe_baru: {
    id: number;
    nama_tipe: string;
    harga_dasar: number;
    kategori: string;
    luas_bangunan: number;
    luas_tanah: number;
  };
  admin: {
    id: number;
    nama: string;
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
        transaksi: {
          is: {
            status_transaksi: { not: "BATAL" },
          },
        },
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
    await requireSession();

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
    return handleActionError(error, "Gagal memuat summary unit");
  }
}

/**
 * Retrieve paginated list of Master Units with natural sort by blok and filters.
 * Supports status "PROSES" meaning [HOLD, BOOKED].
 */
export async function getMasterUnits(
  params: UnitQueryFilter = {}
): Promise<ActionResponse<PaginatedUnitsResult>> {
  try {
    await requireSession();

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

    // Filter by status: supports individual status OR compound "PROSES"
    if (params.status && params.status.trim()) {
      if (params.status === "PROSES") {
        where.status_unit = { in: ["HOLD", "BOOKED"] };
      } else if (["AVAILABLE", "HOLD", "BOOKED", "SOLD"].includes(params.status)) {
        where.status_unit = params.status as "AVAILABLE" | "HOLD" | "BOOKED" | "SOLD";
      }
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
              transaksi: {
                is: {
                  status_transaksi: { not: "BATAL" },
                },
              },
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

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: "Data master unit berhasil dimuat",
      data: {
        units,
        total,
        page,
        limit,
        totalPages,
      },
    };
  } catch (error: unknown) {
    return handleActionError(error, "Gagal memuat daftar unit");
  }
}

/**
 * Retrieve all Master Units for siteplan visual & read-only inventory
 */
export async function getAllMasterUnits(): Promise<ActionResponse<SerializedMasterUnit[]>> {
  try {
    await requireSession();

    const rawUnits = await prisma.masterUnit.findMany({
      include: {
        tipe: true,
        itj: {
          where: {
            transaksi: {
              is: {
                status_transaksi: { not: "BATAL" },
              },
            },
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
    return handleActionError(error, "Gagal memuat inventaris unit");
  }
}

/**
 * Create a single Master Unit (Siteplan setup)
 * Normalizes blok name (e.g. A1 -> A-1), status is ALWAYS AVAILABLE.
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

    const normalizedBlok = normalizeBlok(parsed.data.blok);

    // Check if blok already exists
    const existing = await prisma.masterUnit.findUnique({
      where: { blok: normalizedBlok },
    });

    if (existing) {
      throw new BusinessError(`Unit dengan blok '${normalizedBlok}' sudah ada di database.`);
    }

    const { prefix, nomor } = parseBlok(normalizedBlok);

    const created = await prisma.masterUnit.create({
      data: {
        blok: normalizedBlok,
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
    revalidatePath("/marketing/unit");
    revalidatePath("/manager/unit");

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
    return handleActionError(error, "Gagal menambahkan unit");
  }
}

// ==========================================
// 3. WIZARD ACTIONS (/admin/master-unit/setup)
// ==========================================

export interface SetupRowPreview {
  rowIndex: number;
  prefix: string;
  count: number;
  bloks: string[];
  tipe: SerializedMasterTipe | null;
  error?: string;
}

export interface SetupPreviewResult {
  totalBloks: number;
  perRow: SetupRowPreview[];
  perTipe: Array<{
    tipeId: number;
    nama_tipe: string;
    kategori: string;
    luas_bangunan: number;
    luas_tanah: number;
    count: number;
  }>;
  existingBloks: string[];
  batchDuplicates: string[];
  invalidTipes: number[];
  overlaps: OverlapConflict[];
  canCommit: boolean;
}

/**
 * Dry-run preview of wizard setup rows:
 * Validates syntax, expands numbers, detects internal duplicates/overlaps,
 * and checks collisions against existing units in the database.
 * Max 500 blocks total. Writes nothing to DB.
 */
export async function previewSetupUnits(
  rows: SetupRowInput[]
): Promise<ActionResponse<SetupPreviewResult>> {
  try {
    await enforceAdminRole();

    const parsed = setupUnitsBatchSchema.safeParse(rows);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Validasi baris konfigurasi gagal",
      };
    }

    const validRows = parsed.data;

    // Detect internal overlaps
    const overlaps = detectRowOverlaps(validRows);

    // Fetch all referenced tipes
    const uniqueTipeIds = Array.from(new Set(validRows.map((r) => r.tipeId)));
    const tipesInDb = await prisma.masterTipe.findMany({
      where: { id: { in: uniqueTipeIds } },
    });
    const tipeMap = new Map<number, SerializedMasterTipe>();
    for (const t of tipesInDb) {
      tipeMap.set(t.id, {
        id: t.id,
        nama_tipe: t.nama_tipe,
        kategori: t.kategori,
        luas_bangunan: t.luas_bangunan,
        luas_tanah: t.luas_tanah,
        harga_dasar: Number(t.harga_dasar),
        jumlah_unit: 0,
      });
    }

    const invalidTipes = uniqueTipeIds.filter((id) => !tipeMap.has(id));

    // Expand rows & collect all bloks
    const perRow: SetupRowPreview[] = [];
    const allBloks: string[] = [];
    const seenInBatch = new Set<string>();
    const batchDuplicatesSet = new Set<string>();

    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      let rowBloks: string[] = [];
      let rowError: string | undefined;

      try {
        rowBloks = expandRow({
          prefix: r.prefix,
          nomorMulai: r.nomorMulai,
          nomorAkhir: r.nomorAkhir,
          kecuali: r.kecuali,
        });

        for (const b of rowBloks) {
          if (seenInBatch.has(b)) {
            batchDuplicatesSet.add(b);
          } else {
            seenInBatch.add(b);
          }
          allBloks.push(b);
        }
      } catch (err: unknown) {
        rowError = err instanceof Error ? err.message : "Gagal mengekspansi baris blok";
      }

      perRow.push({
        rowIndex: i,
        prefix: r.prefix.toUpperCase().trim(),
        count: rowBloks.length,
        bloks: rowBloks,
        tipe: tipeMap.get(r.tipeId) || null,
        error: rowError,
      });
    }

    const totalBloks = allBloks.length;
    if (totalBloks > 500) {
      throw new BusinessError(
        `Total blok yang digenerate (${totalBloks}) melebihi batas maksimal 500 blok per setup.`
      );
    }

    // Check collisions with existing DB records
    let existingBloks: string[] = [];
    if (allBloks.length > 0) {
      const existingRecords = await prisma.masterUnit.findMany({
        where: { blok: { in: allBloks } },
        select: { blok: true },
      });
      existingBloks = existingRecords.map((e) => e.blok);
    }

    // Per-tipe summary
    const tipeCounts = new Map<number, number>();
    for (const r of validRows) {
      const count = perRow[validRows.indexOf(r)]?.count || 0;
      tipeCounts.set(r.tipeId, (tipeCounts.get(r.tipeId) || 0) + count);
    }

    const perTipe = Array.from(tipeCounts.entries()).map(([tipeId, count]) => {
      const t = tipeMap.get(tipeId);
      return {
        tipeId,
        nama_tipe: t?.nama_tipe || `Tipe #${tipeId}`,
        kategori: t?.kategori || "-",
        luas_bangunan: t?.luas_bangunan || 0,
        luas_tanah: t?.luas_tanah || 0,
        count,
      };
    });

    const batchDuplicates = Array.from(batchDuplicatesSet);
    const hasRowErrors = perRow.some((r) => !!r.error);

    const canCommit =
      totalBloks > 0 &&
      totalBloks <= 500 &&
      existingBloks.length === 0 &&
      batchDuplicates.length === 0 &&
      overlaps.length === 0 &&
      invalidTipes.length === 0 &&
      !hasRowErrors;

    return {
      success: true,
      message: "Preview setup unit selesai",
      data: {
        totalBloks,
        perRow,
        perTipe,
        existingBloks,
        batchDuplicates,
        invalidTipes,
        overlaps,
        canCommit,
      },
    };
  } catch (error: unknown) {
    return handleActionError(error, "Gagal membuat preview setup unit");
  }
}

/**
 * Commit setup units to database in a single atomic transaction.
 * All-or-nothing.
 */
export async function commitSetupUnits(
  rows: SetupRowInput[]
): Promise<ActionResponse<{ count: number; bloks: string[] }>> {
  try {
    await enforceAdminRole();

    const parsed = setupUnitsBatchSchema.safeParse(rows);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message || "Validasi data gagal",
      };
    }

    const validRows = parsed.data;

    // Detect internal overlaps
    const overlaps = detectRowOverlaps(validRows);
    if (overlaps.length > 0) {
      throw new BusinessError(
        `Ditemukan konflik rentang nomor pada prefix "${overlaps[0].prefix}" (nomor: ${overlaps[0].overlappingNumbers.join(", ")}).`
      );
    }

    // Expand rows & prepare payload
    const unitsToCreate: Array<{
      blok: string;
      blok_prefix: string;
      blok_nomor: number;
      tipe_id: number;
      status_unit: "AVAILABLE";
    }> = [];

    const seenInBatch = new Set<string>();
    const allBloks: string[] = [];

    for (const r of validRows) {
      const expanded = expandRow({
        prefix: r.prefix,
        nomorMulai: r.nomorMulai,
        nomorAkhir: r.nomorAkhir,
        kecuali: r.kecuali,
      });

      for (const blokName of expanded) {
        if (seenInBatch.has(blokName)) {
          throw new BusinessError(`Duplikasi blok dalam konfigurasi: ${blokName}`);
        }
        seenInBatch.add(blokName);
        allBloks.push(blokName);

        const { prefix, nomor } = parseBlok(blokName);
        unitsToCreate.push({
          blok: blokName,
          blok_prefix: prefix,
          blok_nomor: nomor,
          tipe_id: r.tipeId,
          status_unit: "AVAILABLE",
        });
      }
    }

    if (unitsToCreate.length === 0) {
      throw new BusinessError("Tidak ada blok unit yang dapat disimpan.");
    }

    if (unitsToCreate.length > 500) {
      throw new BusinessError(
        `Total pembuatan (${unitsToCreate.length}) melebihi batas maksimal 500 unit.`
      );
    }

    // Atomic transaction
    const createdCount = await prisma.$transaction(async (tx) => {
      // 1. Check database collisions
      const existing = await tx.masterUnit.findMany({
        where: { blok: { in: allBloks } },
        select: { blok: true },
      });

      if (existing.length > 0) {
        const preview = existing.slice(0, 5).map((e) => e.blok).join(", ");
        const more = existing.length > 5 ? ` (+${existing.length - 5} lainnya)` : "";
        throw new BusinessError(
          `Gagal menyimpan: blok berikut sudah terdaftar di database: ${preview}${more}.`
        );
      }

      // 2. Validate all tipe ids exist
      const uniqueTipes = Array.from(new Set(validRows.map((r) => r.tipeId)));
      const countTipes = await tx.masterTipe.count({
        where: { id: { in: uniqueTipes } },
      });
      if (countTipes !== uniqueTipes.length) {
        throw new BusinessError("Salah satu tipe unit yang dipilih tidak valid atau sudah dihapus.");
      }

      // 3. Create all units atomically
      const result = await tx.masterUnit.createMany({
        data: unitsToCreate,
      });

      return result.count;
    });

    revalidatePath("/admin/master-unit");
    revalidatePath("/admin/master-unit/setup");
    revalidatePath("/marketing/unit");
    revalidatePath("/manager/unit");

    return {
      success: true,
      message: `Berhasil membuat ${createdCount} unit baru secara bersamaan!`,
      data: { count: createdCount, bloks: allBloks },
    };
  } catch (error: unknown) {
    return handleActionError(error, "Gagal membuat unit");
  }
}

// ==========================================
// 4. CHANGE TIPE & LOGS ACTIONS
// ==========================================

/**
 * Change Master Tipe of a single unit.
 * Rules:
 * - Unit must be AVAILABLE
 * - Unit must not have active ITJ or active Transaksi
 * - New tipe must have SAME kategori AND SAME luas_tanah
 * - Updates using updateMany for concurrency safety
 * - Records audit trail in UnitTipeLog
 */
export async function changeUnitTipe(
  input: ChangeTipeInput & { unitId: number }
): Promise<ActionResponse<{ blok: string; newNamaTipe: string }>> {
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
              transaksi: {
                is: {
                  status_transaksi: { not: "BATAL" },
                },
              },
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
        throw new BusinessError("Unit tidak ditemukan.");
      }

      // 2. Unit must be AVAILABLE and free from any active process
      if (unit.status_unit !== "AVAILABLE") {
        throw new BusinessError(
          `Unit sedang berstatus '${unit.status_unit}'. Tipe hanya dapat diubah saat unit berstatus AVAILABLE.`
        );
      }

      const hasActiveProcess =
        (unit.itj && unit.itj.length > 0) || (unit.transaksi && unit.transaksi.length > 0);
      if (hasActiveProcess) {
        throw new BusinessError(
          "Unit sedang dalam proses pengajuan ITJ atau transaksi aktif. Tipe tidak dapat diubah."
        );
      }

      // 3. New tipe must differ from current
      if (unit.tipe_id === newTipeId) {
        throw new BusinessError("Tipe yang dipilih sama dengan tipe unit saat ini.");
      }

      // 4. Fetch new tipe
      const newTipe = await tx.masterTipe.findUnique({
        where: { id: newTipeId },
      });

      if (!newTipe) {
        throw new BusinessError("Tipe baru tidak ditemukan.");
      }

      // 5. Compatible check: same kategori AND same luas_tanah
      if (newTipe.kategori !== unit.tipe.kategori) {
        throw new BusinessError(
          `Kategori tidak cocok! Tipe unit saat ini adalah ${unit.tipe.kategori}, sedangkan tipe baru adalah ${newTipe.kategori}.`
        );
      }

      if (newTipe.luas_tanah !== unit.tipe.luas_tanah) {
        throw new BusinessError(
          `Luas tanah tidak cocok! Luas tanah unit saat ini adalah ${unit.tipe.luas_tanah} m², sedangkan tipe baru adalah ${newTipe.luas_tanah} m². Luas tanah siteplan tidak boleh diubah.`
        );
      }

      // 6. Concurrency-guarded update
      const updatedCount = await tx.masterUnit.updateMany({
        where: {
          id: unitId,
          status_unit: "AVAILABLE",
          tipe_id: unit.tipe_id,
        },
        data: {
          tipe_id: newTipeId,
          harga_khusus: resetHargaKhusus ? null : undefined,
        },
      });

      if (updatedCount.count !== 1) {
        throw new BusinessError(
          "Gagal mengubah tipe: status unit telah berubah atau unit sedang diproses oleh transaksi lain."
        );
      }

      // 7. Write UnitTipeLog audit record
      await tx.unitTipeLog.create({
        data: {
          unit_id: unitId,
          blok: unit.blok,
          tipe_lama_id: unit.tipe_id,
          tipe_baru_id: newTipeId,
          harga_khusus_lama: unit.harga_khusus,
          harga_khusus_direset: Boolean(resetHargaKhusus && unit.harga_khusus !== null),
          alasan,
          changed_by: userId,
        },
      });

      return { blok: unit.blok, newNamaTipe: newTipe.nama_tipe };
    });

    revalidatePath("/admin/master-unit");
    revalidatePath("/marketing/unit");
    revalidatePath("/manager/unit");

    return {
      success: true,
      message: `Tipe unit blok '${result.blok}' berhasil diubah ke ${result.newNamaTipe}`,
      data: result,
    };
  } catch (error: unknown) {
    return handleActionError(error, "Gagal mengubah tipe unit");
  }
}

export interface BulkChangeTipeResult {
  berhasil: number;
  dilewati: { blok: string; alasan: string }[];
}

/**
 * Bulk Change Master Tipe for multiple units.
 * Cap at 200 units. Writes a UnitTipeLog per successfully changed unit.
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

    const { unitIds, newTipeId, alasan, resetHargaKhusus } = parsed.data;

    const newTipe = await prisma.masterTipe.findUnique({
      where: { id: newTipeId },
    });

    if (!newTipe) {
      throw new BusinessError("Tipe baru tidak ditemukan");
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
                  transaksi: {
                    is: {
                      status_transaksi: { not: "BATAL" },
                    },
                  },
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

          // Concurrency guarded update
          const updated = await tx.masterUnit.updateMany({
            where: {
              id: uId,
              status_unit: "AVAILABLE",
              tipe_id: unit.tipe_id,
            },
            data: {
              tipe_id: newTipeId,
              harga_khusus: resetHargaKhusus ? null : undefined,
            },
          });

          if (updated.count !== 1) {
            dilewati.push({
              blok: unit.blok,
              alasan: "Status unit berubah bersamaan oleh proses lain",
            });
            return;
          }

          // Write UnitTipeLog
          await tx.unitTipeLog.create({
            data: {
              unit_id: uId,
              blok: unit.blok,
              tipe_lama_id: unit.tipe_id,
              tipe_baru_id: newTipeId,
              harga_khusus_lama: unit.harga_khusus,
              harga_khusus_direset: Boolean(resetHargaKhusus && unit.harga_khusus !== null),
              alasan,
              changed_by: userId,
            },
          });

          berhasil++;
        });
      } catch (err: unknown) {
        dilewati.push({
          blok: `ID #${uId}`,
          alasan: err instanceof Error ? err.message : "Gagal memproses perubahan",
        });
      }
    }

    revalidatePath("/admin/master-unit");
    revalidatePath("/marketing/unit");
    revalidatePath("/manager/unit");

    const message =
      berhasil > 0
        ? `Berhasil mengubah ${berhasil} unit ke tipe ${newTipe.nama_tipe}.${
            dilewati.length > 0 ? ` (${dilewati.length} unit dilewati)` : ""
          }`
        : `Tidak ada unit yang diubah. Seluruh ${dilewati.length} unit dilewati.`;

    return {
      success: berhasil > 0,
      message,
      data: { berhasil, dilewati },
    };
  } catch (error: unknown) {
    return handleActionError(error, "Gagal mengubah tipe unit secara massal");
  }
}

/**
 * Retrieve historical changes of a unit's tipe.
 */
export async function getUnitTipeLogs(
  unitId: number
): Promise<ActionResponse<SerializedUnitTipeLog[]>> {
  try {
    await requireSession();

    const logs = await prisma.unitTipeLog.findMany({
      where: { unit_id: unitId },
      include: {
        tipe_lama: true,
        tipe_baru: true,
        admin: {
          select: { id: true, nama: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const serialized: SerializedUnitTipeLog[] = logs.map((l) => ({
      id: l.id,
      unit_id: l.unit_id,
      blok: l.blok,
      tipe_lama_id: l.tipe_lama_id,
      tipe_baru_id: l.tipe_baru_id,
      harga_khusus_lama: l.harga_khusus_lama ? Number(l.harga_khusus_lama) : null,
      harga_khusus_direset: l.harga_khusus_direset,
      alasan: l.alasan,
      created_at: l.created_at,
      tipe_lama: {
        id: l.tipe_lama.id,
        nama_tipe: l.tipe_lama.nama_tipe,
        harga_dasar: Number(l.tipe_lama.harga_dasar),
        kategori: l.tipe_lama.kategori,
        luas_bangunan: l.tipe_lama.luas_bangunan,
        luas_tanah: l.tipe_lama.luas_tanah,
      },
      tipe_baru: {
        id: l.tipe_baru.id,
        nama_tipe: l.tipe_baru.nama_tipe,
        harga_dasar: Number(l.tipe_baru.harga_dasar),
        kategori: l.tipe_baru.kategori,
        luas_bangunan: l.tipe_baru.luas_bangunan,
        luas_tanah: l.tipe_baru.luas_tanah,
      },
      admin: {
        id: l.admin.id,
        nama: l.admin.nama,
      },
    }));

    return {
      success: true,
      message: "Riwayat perubahan tipe unit berhasil dimuat",
      data: serialized,
    };
  } catch (error: unknown) {
    return handleActionError(error, "Gagal memuat riwayat tipe unit");
  }
}

/**
 * Adjust unit special price (harga_khusus) for hook/strategic lots.
 */
export async function updateUnitHargaKhusus(
  unitId: number,
  hargaKhusus: number | null
): Promise<ActionResponse<SerializedMasterUnit>> {
  try {
    await enforceAdminRole();

    const unit = await prisma.masterUnit.findUnique({
      where: { id: unitId },
      include: { tipe: true },
    });

    if (!unit) {
      throw new BusinessError("Unit tidak ditemukan");
    }

    const updated = await prisma.masterUnit.update({
      where: { id: unitId },
      data: {
        harga_khusus: hargaKhusus !== null ? new Prisma.Decimal(hargaKhusus) : null,
      },
      include: { tipe: true },
    });

    const isLocked = await checkUnitIsLocked(unitId);

    revalidatePath("/admin/master-unit");
    revalidatePath("/marketing/unit");
    revalidatePath("/manager/unit");

    return {
      success: true,
      message:
        hargaKhusus !== null
          ? `Harga khusus blok '${unit.blok}' berhasil diatur menjadi Rp ${hargaKhusus.toLocaleString("id-ID")}`
          : `Harga khusus blok '${unit.blok}' berhasil dihapus (kembali ke harga dasar)`,
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
    return handleActionError(error, "Gagal mengatur harga khusus");
  }
}

/**
 * Update unit details (for testing / backward compatibility).
 * Honors smart lock guard: rejects status change when locked.
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
      throw new BusinessError("Unit tidak ditemukan");
    }

    const isLocked = await checkUnitIsLocked(id);

    if (data.status_unit !== undefined && data.status_unit !== currentUnit.status_unit) {
      if (isLocked) {
        throw new BusinessError("Status unit dikunci oleh sistem karena ada transaksi berjalan.");
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
    return handleActionError(error, "Gagal memperbarui unit");
  }
}

/**
 * Delete a unit (allowed ONLY for AVAILABLE units without active Itj/Transaksi).
 * If the unit has UnitTipeLog history, onDelete: SetNull ensures logs survive with the snapshot blok name.
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
      throw new BusinessError("Unit tidak ditemukan");
    }

    if (unit._count.transaksi > 0 || unit._count.itj > 0) {
      throw new BusinessError(
        "Unit ini tidak dapat dihapus karena sudah memiliki riwayat transaksi atau pengajuan ITJ."
      );
    }

    if (unit.status_unit !== "AVAILABLE") {
      throw new BusinessError(`Unit berstatus '${unit.status_unit}' tidak dapat dihapus.`);
    }

    await prisma.masterUnit.delete({ where: { id } });

    revalidatePath("/admin/master-unit");
    revalidatePath("/marketing/unit");
    revalidatePath("/manager/unit");

    return {
      success: true,
      message: `Unit blok '${unit.blok}' berhasil dihapus`,
    };
  } catch (error: unknown) {
    return handleActionError(error, "Gagal menghapus unit");
  }
}

