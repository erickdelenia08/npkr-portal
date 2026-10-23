// lib/unit-setup.ts

/**
 * Deliberate, user-facing business error.
 * Messages from BusinessError are safe to display directly to end users.
 */
export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

export interface SetupRowInput {
  prefix: string;
  nomorMulai: number;
  nomorAkhir: number;
  kecuali?: number[];
  tipeId?: number;
}

export interface OverlapConflict {
  rowAIndex: number;
  rowBIndex: number;
  prefix: string;
  overlappingNumbers: number[];
}

/**
 * Normalizes a raw blok input:
 * - Trims and converts to uppercase
 * - Collapses internal spaces
 * - Automatically ensures a hyphen between prefix (1-3 alphanumeric) and numeric part (e.g. "A1" -> "A-1", "a-05" -> "A-5")
 * - Validates against `^[A-Z0-9]{1,3}-\d{1,4}$`
 */
export function normalizeBlok(raw: string): string {
  if (!raw || typeof raw !== "string") {
    throw new Error("Nama blok tidak boleh kosong.");
  }

  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");

  // If explicit hyphen/underscore present
  let match = cleaned.match(/^([A-Z0-9]{1,3})[-_](\d{1,4})$/);
  // If no separator present, separate letters from digits
  if (!match) {
    match = cleaned.match(/^([A-Z]{1,3})(\d{1,4})$/);
  }

  if (!match) {
    throw new Error(
      `Format nama blok "${raw}" tidak valid. Format yang benar: 1-3 karakter huruf/angka diikuti nomor (contoh: A-1, B-12, A1, B12).`
    );
  }

  const prefix = match[1];
  const num = parseInt(match[2], 10);

  if (isNaN(num)) {
    throw new Error(`Nomor blok "${raw}" tidak valid.`);
  }

  const normalized = `${prefix}-${num}`;
  const validRegex = /^[A-Z0-9]{1,3}-\d{1,4}$/;
  if (!validRegex.test(normalized)) {
    throw new Error(`Format nama blok "${normalized}" tidak sesuai aturan.`);
  }

  return normalized;
}

/**
 * Parses a comma-separated exclude list of numbers and ranges:
 * E.g., "13, 14, 20-22" -> [13, 14, 20, 21, 22]
 * Ignores empty spaces; rejects invalid/garbage strings with a clear Indonesian message.
 */
export function parseExcludeList(raw: string | null | undefined): number[] {
  if (!raw || typeof raw !== "string") {
    return [];
  }

  const trimmed = raw.trim();
  if (trimmed === "") {
    return [];
  }

  const tokens = trimmed.split(",").map((t) => t.trim()).filter(Boolean);
  const resultSet = new Set<number>();

  for (const token of tokens) {
    // Check range "start-end"
    if (token.includes("-")) {
      const parts = token.split("-").map((p) => p.trim());
      if (parts.length !== 2) {
        throw new Error(
          `Rentang nomor "${token}" tidak valid. Gunakan format seperti "20-22".`
        );
      }

      const start = Number(parts[0]);
      const end = Number(parts[1]);

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start <= 0 ||
        end <= 0
      ) {
        throw new Error(
          `Nilai rentang "${token}" harus berupa bilangan bulat positif.`
        );
      }

      if (start > end) {
        throw new Error(
          `Rentang tidak valid: nomor awal (${start}) lebih besar dari nomor akhir (${end}).`
        );
      }

      for (let i = start; i <= end; i++) {
        resultSet.add(i);
      }
    } else {
      const single = Number(token);
      if (!Number.isInteger(single) || single <= 0) {
        throw new Error(
          `Nomor pengecualian "${token}" tidak valid. Harap masukkan bilangan bulat positif.`
        );
      }
      resultSet.add(single);
    }
  }

  return Array.from(resultSet).sort((a, b) => a - b);
}

/**
 * Expands a row definition into ordered blok names, skipping excluded numbers.
 * Example:
 * prefix: "A", nomorMulai: 1, nomorAkhir: 4, kecuali: [2]
 * -> ["A-1", "A-3", "A-4"]
 */
export function expandRow(row: {
  prefix: string;
  nomorMulai: number;
  nomorAkhir: number;
  kecuali?: number[];
}): string[] {
  const cleanPrefix = (row.prefix || "").trim().toUpperCase().replace(/[-_ ]/g, "");
  if (!cleanPrefix || !/^[A-Z0-9]{1,3}$/.test(cleanPrefix)) {
    throw new Error(
      `Prefix "${row.prefix}" tidak valid. Gunakan 1-3 karakter alfanumerik (contoh: A, B, HOK).`
    );
  }

  const start = Number(row.nomorMulai);
  const end = Number(row.nomorAkhir);

  if (!Number.isInteger(start) || start <= 0) {
    throw new Error("Nomor mulai harus berupa bilangan bulat positif.");
  }
  if (!Number.isInteger(end) || end <= 0) {
    throw new Error("Nomor akhir harus berupa bilangan bulat positif.");
  }
  if (start > end) {
    throw new Error(
      `Nomor mulai (${start}) tidak boleh lebih besar dari nomor akhir (${end}).`
    );
  }

  const excludeSet = new Set(row.kecuali || []);
  const bloks: string[] = [];

  for (let num = start; num <= end; num++) {
    if (!excludeSet.has(num)) {
      bloks.push(`${cleanPrefix}-${num}`);
    }
  }

  return bloks;
}

/**
 * Detects overlapping rows with the same prefix and intersecting generated numbers.
 */
export function detectRowOverlaps(rows: SetupRowInput[]): OverlapConflict[] {
  const conflicts: OverlapConflict[] = [];

  // Pre-expand each row's active numbers
  const expandedRows = rows.map((r) => {
    const cleanPrefix = (r.prefix || "").trim().toUpperCase().replace(/[-_ ]/g, "");
    const excludeSet = new Set(r.kecuali || []);
    const numbers: number[] = [];

    if (
      cleanPrefix &&
      Number.isInteger(r.nomorMulai) &&
      Number.isInteger(r.nomorAkhir) &&
      r.nomorMulai > 0 &&
      r.nomorMulai <= r.nomorAkhir
    ) {
      for (let n = r.nomorMulai; n <= r.nomorAkhir; n++) {
        if (!excludeSet.has(n)) {
          numbers.push(n);
        }
      }
    }

    return {
      prefix: cleanPrefix,
      numbers,
    };
  });

  for (let i = 0; i < expandedRows.length; i++) {
    for (let j = i + 1; j < expandedRows.length; j++) {
      const a = expandedRows[i];
      const b = expandedRows[j];

      if (a.prefix && a.prefix === b.prefix) {
        const setA = new Set(a.numbers);
        const overlapping = b.numbers.filter((num) => setA.has(num));

        if (overlapping.length > 0) {
          conflicts.push({
            rowAIndex: i,
            rowBIndex: j,
            prefix: a.prefix,
            overlappingNumbers: overlapping,
          });
        }
      }
    }
  }

  return conflicts;
}
