/**
 * Helper to build derived Master Tipe name.
 * Formula: ${kategori}-${luas_bangunan}/${luas_tanah}
 * Examples:
 * - SUBSIDI-30/60
 * - KOMERSIL-36/72
 * - KAVLING-0/84
 */
export function buildNamaTipe(
  kategori: string,
  luasBangunan: number | null | undefined,
  luasTanah: number
): string {
  const lb = kategori === "KAVLING" ? 0 : Number(luasBangunan || 0);
  const lt = Number(luasTanah || 0);
  return `${kategori}-${lb}/${lt}`;
}

/**
 * Natural sort helper: Parses blok string into prefix and numeric part.
 * Examples:
 * - "M-1" -> { prefix: "M-", nomor: 1 }
 * - "M-10" -> { prefix: "M-", nomor: 10 }
 * - "Hook-03" -> { prefix: "Hook-", nomor: 3 }
 * - "A12" -> { prefix: "A", nomor: 12 }
 * - "Kavling" -> { prefix: "Kavling", nomor: 0 }
 */
export function parseBlok(blok: string): { prefix: string; nomor: number } {
  const trimmed = blok.trim();
  const match = trimmed.match(/^(.*?)(\d+)$/);
  if (match) {
    return {
      prefix: match[1],
      nomor: parseInt(match[2], 10),
    };
  }
  return {
    prefix: trimmed,
    nomor: 0,
  };
}
