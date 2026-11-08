"use client";

import React, { useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Plus,
  Receipt,
  Clock,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { PembayaranModal } from "@/components/forms/pembayaran-modal";

// --------------------------------------------------
// Plain Serializable Interface for Client Components
// --------------------------------------------------

export interface PlainPaymentItem {
  id: number;
  tanggal: string; // ISO string or YYYY-MM-DD
  jenis: "ITJ" | "DP" | "CICILAN" | "PELUNASAN" | string;
  noKwitansi: string;
  nominal: number;
  penerima: string;
  catatan: string;
  isVoid: boolean;
  voidReason: string | null;
}

export interface TransactionFinancialSummaryProps {
  transaksiId: number;
  hargaDeal: number;
  targetItj: number;
  targetDp: number;
  sisaPelunasan: number;
  totalPaid: number;
  sisaItj: number;
  sisaDp: number;
  payments?: PlainPaymentItem[];
  canEdit?: boolean;
}

// --------------------------------------------------
// Formatters
// --------------------------------------------------

export function formatRupiahCompact(num: number): string {
  if (!Number.isFinite(num) || num === 0) return "Rp 0";
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    const val = abs / 1_000_000_000;
    const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace(".", ",");
    return `${sign}Rp ${formatted} M`;
  }
  if (abs >= 1_000_000) {
    const val = abs / 1_000_000;
    const formatted = val % 1 === 0 ? val.toFixed(0) : val.toFixed(1).replace(".", ",");
    return `${sign}Rp ${formatted} jt`;
  }
  if (abs >= 1_000) {
    const val = Math.round(abs / 1_000);
    return `${sign}Rp ${val.toLocaleString("id-ID")} rb`;
  }
  return `${sign}Rp ${abs.toLocaleString("id-ID")}`;
}

export function formatCurrency(val?: number | null): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val ?? 0);
}

function formatDateShort(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function getJenisBadgeStyle(jenis: string): string {
  switch (jenis) {
    case "ITJ":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "DP":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "CICILAN":
      return "bg-purple-50 text-purple-800 border-purple-200";
    case "PELUNASAN":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    default:
      return "bg-bone text-graphite border-mist";
  }
}

// --------------------------------------------------
// Main Component: Compact Financial Summary Card
// --------------------------------------------------

export function TransactionFinancialSummary({
  transaksiId,
  hargaDeal,
  sisaPelunasan,
  totalPaid,
  sisaItj,
  sisaDp,
  payments = [],
  canEdit = true,
}: TransactionFinancialSummaryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Filter state for Mobile Sheet
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [showVoid, setShowVoid] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Sync sheet open with URL query param ?riwayat=1
  const isRiwayatOpen = searchParams?.get("riwayat") === "1";

  const handleOpenRiwayat = () => {
    // On desktop (>= 1024px), smooth scroll to #riwayat-pembayaran
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      const el = document.getElementById("riwayat-pembayaran");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    // On mobile, set query param ?riwayat=1
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("riwayat", "1");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleCloseRiwayat = () => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("riwayat");
    const query = params.toString();
    router.replace(query ? `?${query}` : pathname, { scroll: false });
  };

  // Calculations
  const isLunas = sisaPelunasan === 0;
  const percentPaid = Math.min(
    100,
    Math.round((totalPaid / (hargaDeal || 1)) * 100)
  );

  const validPayments = useMemo(
    () => payments.filter((p) => !p.isVoid),
    [payments]
  );

  const lastPayment = useMemo(() => {
    if (validPayments.length === 0) return null;
    return [...validPayments].sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    )[0];
  }, [validPayments]);

  // Filtered payments for sheet
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (!showVoid && p.isVoid) return false;
      if (selectedFilter !== "ALL" && p.jenis !== selectedFilter) return false;
      return true;
    });
  }, [payments, selectedFilter, showVoid]);

  // Kwitansi download handler
  const handleDownloadKwitansi = async (paymentId: number, noKwitansi: string) => {
    if (downloadingId !== null) return;
    setDownloadingId(paymentId);
    const toastId = toast.loading(`Mempersiapkan kwitansi ${noKwitansi}...`);

    try {
      const res = await fetch(
        `/api/documents/kwitansi?transactionId=${transaksiId}&pembayaranId=${paymentId}`
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Gagal mengunduh kwitansi.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Kwitansi-${noKwitansi || paymentId}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Kwitansi ${noKwitansi} berhasil diunduh!`, { id: toastId });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Terjadi kesalahan saat mengunduh.",
        { id: toastId }
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <>
      {/* ─── 1. KARTU PEMBAYARAN PADAT (MOBILE & DESKTOP) ─── */}
      <div className="bg-white rounded-xl border border-mist shadow-2xs p-4 sm:p-5 space-y-3">
        {/* Header: Label + Status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-deep-teal flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-carbon-ink tracking-tight">
              Pembayaran
            </h2>
          </div>

          <div>
            {isLunas ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Lunas Penuh
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Belum Lunas
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar & Nominal */}
        <div className="space-y-1.5">
          <div className="h-2.5 w-full rounded-full bg-bone overflow-hidden border border-mist/40">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isLunas ? "bg-emerald-600" : "bg-deep-teal"
              }`}
              style={{ width: `${percentPaid}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-carbon-ink">
              {formatRupiahCompact(totalPaid)} dari {formatRupiahCompact(hargaDeal)}
            </span>
            <span className="font-mono font-bold text-slate">
              {percentPaid}%
            </span>
          </div>
        </div>

        {/* Sisa per jenis */}
        <div className="text-xs text-slate font-medium flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {sisaItj > 0 && (
            <>
              <span>Sisa ITJ {formatRupiahCompact(sisaItj)}</span>
              <span className="text-mist" aria-hidden="true">·</span>
            </>
          )}
          {sisaDp > 0 && (
            <>
              <span>Sisa DP {formatRupiahCompact(sisaDp)}</span>
              <span className="text-mist" aria-hidden="true">·</span>
            </>
          )}
          <span>Sisa pelunasan {formatRupiahCompact(sisaPelunasan)}</span>
        </div>

        {/* Pembayaran Terakhir */}
        <div className="text-xs text-slate flex items-center gap-1.5 pt-0.5">
          <Clock className="w-3.5 h-3.5 text-steel shrink-0" />
          {lastPayment ? (
            <span>
              Terakhir:{" "}
              <strong className="text-carbon-ink font-semibold">
                {formatDateShort(lastPayment.tanggal)}
              </strong>{" "}
              · {formatRupiahCompact(lastPayment.nominal)}{" "}
              <span className="text-slate">({lastPayment.jenis})</span>
            </span>
          ) : (
            <span>Terakhir: Belum ada mutasi pembayaran</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {canEdit && (
            <PembayaranModal
              transaksiId={transaksiId}
              sisaItj={sisaItj}
              sisaDp={sisaDp}
              trigger={
                <Button
                  type="button"
                  size="sm"
                  className="bg-deep-teal hover:bg-teal-900 text-white text-xs h-8 font-semibold gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Catat Pembayaran</span>
                </Button>
              }
            />
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenRiwayat}
            className="text-xs h-8 text-graphite border-mist gap-1.5 hover:bg-bone/60"
          >
            <Receipt className="w-3.5 h-3.5 text-deep-teal" />
            <span>Riwayat ({validPayments.length})</span>
          </Button>
        </div>
      </div>

      {/* ─── 2. MOBILE BOTTOM SHEET RIWAYAT PEMBAYARAN (< lg) ─── */}
      <Sheet open={isRiwayatOpen} onOpenChange={(open) => !open && handleCloseRiwayat()}>
        <SheetContent
          side="bottom"
          className="p-0 max-h-[92dvh] flex flex-col rounded-t-2xl border-t border-mist bg-white shadow-2xl"
        >
          {/* Drag handle */}
          <div className="pt-2.5 pb-1 flex justify-center shrink-0">
            <div className="w-10 h-1 bg-slate-300 rounded-full" />
          </div>

          {/* Sticky Header */}
          <div className="px-4 py-3 border-b border-mist/80 bg-white shrink-0 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SheetTitle className="text-base font-bold text-carbon-ink tracking-tight flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-deep-teal" />
                  <span>Riwayat Pembayaran</span>
                </SheetTitle>
                <p className="text-xs text-slate mt-0.5">
                  Total masuk:{" "}
                  <strong className="text-emerald-700 font-mono font-bold">
                    {formatCurrency(totalPaid)}
                  </strong>{" "}
                  · {validPayments.length} transaksi sah
                </p>
              </div>

              {canEdit && (
                <PembayaranModal
                  transaksiId={transaksiId}
                  sisaItj={sisaItj}
                  sisaDp={sisaDp}
                  trigger={
                    <Button
                      type="button"
                      size="sm"
                      className="bg-deep-teal hover:bg-teal-900 text-white text-xs h-7 px-2.5 font-semibold gap-1 shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Catat</span>
                    </Button>
                  }
                />
              )}
            </div>

            {/* Filter Chips & Void Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-mist/60">
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs no-scrollbar">
                {["ALL", "ITJ", "DP", "CICILAN", "PELUNASAN"].map((opt) => {
                  const isSel = selectedFilter === opt;
                  const label = opt === "ALL" ? "Semua" : opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSelectedFilter(opt)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                        isSel
                          ? "bg-deep-teal text-white shadow-2xs"
                          : "bg-bone text-graphite hover:bg-mist/50 border border-mist/60"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <label
                htmlFor="toggle-void-mobile"
                className="flex items-center gap-1.5 text-[11px] font-medium text-slate cursor-pointer select-none"
              >
                <input
                  id="toggle-void-mobile"
                  type="checkbox"
                  checked={showVoid}
                  onChange={(e) => setShowVoid(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-deep-teal focus:ring-deep-teal"
                />
                <span>Tampilkan void</span>
              </label>
            </div>
          </div>

          {/* Scrollable Card List for Mobile */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredPayments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate space-y-2">
                <FileSpreadsheet className="w-8 h-8 text-steel mx-auto" />
                <p className="font-semibold text-carbon-ink">
                  Tidak ada catatan pembayaran
                </p>
                <p className="text-[11px] max-w-xs mx-auto">
                  {selectedFilter !== "ALL"
                    ? `Tidak ada transaksi bertipe ${selectedFilter}.`
                    : "Belum ada transaksi pembayaran yang dicatat."}
                </p>
              </div>
            ) : (
              filteredPayments.map((bayar) => (
                <div
                  key={bayar.id}
                  className={`p-3.5 rounded-xl border transition-all space-y-2 text-xs ${
                    bayar.isVoid
                      ? "border-rose-200 bg-rose-50/40 text-slate"
                      : "border-mist bg-white shadow-2xs"
                  }`}
                >
                  {/* Top Row: Tanggal & Nominal */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate text-[11px]">
                      {formatDateShort(bayar.tanggal)}
                    </span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        bayar.isVoid
                          ? "line-through text-rose-500"
                          : "text-carbon-ink"
                      }`}
                    >
                      {formatCurrency(bayar.nominal)}
                    </span>
                  </div>

                  {/* Middle Row: Badge, Kwitansi, Penerima */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-mist/60">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getJenisBadgeStyle(
                          bayar.jenis
                        )}`}
                      >
                        {bayar.jenis}
                      </span>
                      <span className="font-mono text-[11px] text-slate">
                        {bayar.noKwitansi}
                      </span>
                      {bayar.isVoid && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          VOID
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-graphite">
                      Penerima: <strong>{bayar.penerima}</strong>
                    </span>
                  </div>

                  {/* Bottom Row: Full Note, Void Reason & Print Button */}
                  <div className="pt-1.5 flex flex-col gap-2">
                    {bayar.catatan && (
                      <p className="text-[11px] text-carbon-ink leading-relaxed break-words bg-bone/40 p-2 rounded-lg border border-mist/40">
                        {bayar.catatan}
                      </p>
                    )}

                    {bayar.isVoid && bayar.voidReason && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 leading-snug">
                        <strong>Alasan Void:</strong> {bayar.voidReason}
                      </div>
                    )}

                    {!bayar.isVoid && (
                      <div className="flex justify-end pt-0.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={downloadingId === bayar.id}
                          onClick={() =>
                            handleDownloadKwitansi(bayar.id, bayar.noKwitansi)
                          }
                          className="h-7 text-xs px-2.5 font-semibold text-deep-teal border-mist hover:bg-teal-50 gap-1.5"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// --------------------------------------------------
// Desktop Inline Payment History Table (>= lg)
// --------------------------------------------------

export function TransactionPaymentTable({
  transaksiId,
  sisaItj,
  sisaDp,
  totalPaid,
  payments = [],
  canEdit = true,
}: {
  transaksiId: number;
  sisaItj: number;
  sisaDp: number;
  totalPaid: number;
  payments?: PlainPaymentItem[];
  canEdit?: boolean;
}) {
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [showVoid, setShowVoid] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (!showVoid && p.isVoid) return false;
      if (selectedFilter !== "ALL" && p.jenis !== selectedFilter) return false;
      return true;
    });
  }, [payments, selectedFilter, showVoid]);

  const handleDownloadKwitansi = async (paymentId: number, noKwitansi: string) => {
    if (downloadingId !== null) return;
    setDownloadingId(paymentId);
    const toastId = toast.loading(`Mempersiapkan kwitansi ${noKwitansi}...`);

    try {
      const res = await fetch(
        `/api/documents/kwitansi?transactionId=${transaksiId}&pembayaranId=${paymentId}`
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Gagal mengunduh kwitansi.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Kwitansi-${noKwitansi || paymentId}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Kwitansi ${noKwitansi} berhasil diunduh!`, { id: toastId });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Terjadi kesalahan saat mengunduh.",
        { id: toastId }
      );
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div
      id="riwayat-pembayaran"
      className="bg-white rounded-xl border border-mist shadow-2xs overflow-hidden"
    >
      {/* Table Header */}
      <div className="p-5 border-b border-mist flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-deep-teal flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-carbon-ink tracking-tight">
              Riwayat Pembayaran &amp; Kwitansi
            </h3>
            <p className="text-xs text-slate mt-0.5">
              Total Penerimaan Masuk:{" "}
              <strong className="font-mono font-bold text-emerald-700">
                {formatCurrency(totalPaid)}
              </strong>
            </p>
          </div>
        </div>

        {canEdit && (
          <PembayaranModal
            transaksiId={transaksiId}
            sisaItj={sisaItj}
            sisaDp={sisaDp}
            trigger={
              <Button
                size="sm"
                className="inline-flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-teal-400" />
                <span>+ Input Pembayaran</span>
              </Button>
            }
          />
        )}
      </div>

      {/* Filter Row */}
      <div className="px-5 py-3 border-b border-mist/80 bg-bone/30 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {["ALL", "ITJ", "DP", "CICILAN", "PELUNASAN"].map((opt) => {
            const isSel = selectedFilter === opt;
            const label = opt === "ALL" ? "Semua" : opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setSelectedFilter(opt)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isSel
                    ? "bg-deep-teal text-white shadow-2xs"
                    : "bg-white text-graphite hover:bg-bone border border-mist/80"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <label
          htmlFor="toggle-void-desktop"
          className="flex items-center gap-1.5 text-xs font-medium text-slate cursor-pointer select-none"
        >
          <input
            id="toggle-void-desktop"
            type="checkbox"
            checked={showVoid}
            onChange={(e) => setShowVoid(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-deep-teal focus:ring-deep-teal"
          />
          <span>Tampilkan void</span>
        </label>
      </div>

      {/* Desktop Table View */}
      {filteredPayments.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate space-y-2">
          <FileSpreadsheet className="w-10 h-10 text-steel mx-auto" />
          <h4 className="text-sm font-semibold text-carbon-ink">
            Belum ada data pembayaran
          </h4>
          <p className="text-xs text-slate max-w-sm mx-auto">
            {selectedFilter !== "ALL"
              ? `Tidak ditemukan transaksi pembayaran bertipe ${selectedFilter}.`
              : "Catatan penerimaan tanda jadi (ITJ) atau uang muka (DP) akan tampil di sini."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bone/60 border-b border-mist text-slate font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3">Tanggal</th>
                <th className="px-5 py-3">Jenis &amp; Kwitansi</th>
                <th className="px-5 py-3">Nominal</th>
                <th className="px-5 py-3">Admin Penerima</th>
                <th className="px-5 py-3">Catatan / Keterangan</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {filteredPayments.map((bayar) => (
                <tr
                  key={bayar.id}
                  className={`hover:bg-bone/30 transition-colors ${
                    bayar.isVoid ? "opacity-60 bg-rose-50/20" : ""
                  }`}
                >
                  <td className="px-5 py-3.5 text-slate font-medium whitespace-nowrap">
                    {formatDateShort(bayar.tanggal)}
                  </td>

                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getJenisBadgeStyle(
                          bayar.jenis
                        )}`}
                      >
                        {bayar.jenis}
                      </span>
                      <span className="font-mono text-slate text-[11px]">
                        {bayar.noKwitansi}
                      </span>
                      {bayar.isVoid && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          VOID
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-3.5 font-mono font-bold text-carbon-ink whitespace-nowrap">
                    <span className={bayar.isVoid ? "line-through text-rose-500" : ""}>
                      {formatCurrency(bayar.nominal)}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-graphite whitespace-nowrap">
                    {bayar.penerima}
                  </td>

                  <td className="px-5 py-3.5 text-slate max-w-sm">
                    <div className="space-y-1">
                      <p className="leading-relaxed">{bayar.catatan || "-"}</p>
                      {bayar.isVoid && bayar.voidReason && (
                        <p className="text-[11px] text-rose-600 font-semibold italic">
                          Alasan Void: {bayar.voidReason}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    {!bayar.isVoid && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={downloadingId === bayar.id}
                        onClick={() =>
                          handleDownloadKwitansi(bayar.id, bayar.noKwitansi)
                        }
                        className="h-7 text-xs px-2.5 font-semibold text-deep-teal border-mist hover:bg-teal-50 gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak</span>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
