// lib/terbilang.ts
const SATUAN = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

export function terbilang(angka: number): string {
    const n = Math.floor(Math.abs(angka));
    if (n < 12) return SATUAN[n];
    if (n < 20) return terbilang(n - 10) + " Belas";
    if (n < 100) return terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
    if (n < 200) return "Seratus " + terbilang(n - 100);
    if (n < 1_000) return terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100);
    if (n < 2_000) return "Seribu " + terbilang(n - 1_000);
    if (n < 1_000_000) return terbilang(Math.floor(n / 1_000)) + " Ribu " + terbilang(n % 1_000);
    if (n < 1_000_000_000) return terbilang(Math.floor(n / 1_000_000)) + " Juta " + terbilang(n % 1_000_000);
    if (n < 1_000_000_000_000) return terbilang(Math.floor(n / 1_000_000_000)) + " Miliar " + terbilang(n % 1_000_000_000);
    if (n < 1_000_000_000_000_000) return terbilang(Math.floor(n / 1_000_000_000_000)) + " Triliun " + terbilang(n % 1_000_000_000_000);
    return String(angka);
}

export function formatTerbilangRupiah(angka: number): string {
    const text = terbilang(angka).trim().replace(/\s+/g, " ");
    return text ? `${text} Rupiah` : "Nol Rupiah";
}