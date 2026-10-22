"use client";

import React, { useState } from "react";
import { Printer, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface QuickPrintActionsProps {
  transaksiId: number;
  hasPembayaran: boolean;
}

export function QuickPrintActions({
  transaksiId,
  hasPembayaran,
}: QuickPrintActionsProps) {
  const [isPrintingSpr, setIsPrintingSpr] = useState(false);
  const [isPrintingKwitansi, setIsPrintingKwitansi] = useState(false);

  const downloadFileFromResponse = async (
    response: Response,
    fallbackFilename: string
  ) => {
    // Ambil filename dari Content-Disposition jika tersedia
    const disposition = response.headers.get("Content-Disposition");
    let filename = fallbackFilename;

    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handlePrintSpr = async () => {
    if (isPrintingSpr) return;

    const toastId = toast.loading("Memproses berkas SPR (Surat Pesanan Rumah)...", {
      description: `Menyiapkan format dokumen transaksi #${transaksiId}.`,
    });

    try {
      setIsPrintingSpr(true);
      const res = await fetch(`/api/documents/spr?transactionId=${transaksiId}`);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Gagal menghasilkan dokumen SPR");
      }

      await downloadFileFromResponse(res, `SPR-${transaksiId}.docx`);

      toast.success("Dokumen SPR berhasil diunduh!", {
        id: toastId,
        description: "File .docx siap dicetak atau diedit.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan";
      toast.error("Gagal mencetak SPR", {
        id: toastId,
        description: errorMessage,
      });
    } finally {
      setIsPrintingSpr(false);
    }
  };

  const handlePrintKwitansi = async () => {
    if (isPrintingKwitansi) return;

    if (!hasPembayaran) {
      toast.warning("Belum ada riwayat pembayaran untuk dicetak.", {
        description: "Kwitansi hanya dapat dicetak setelah ada pembayaran yang tercatat.",
      });
      return;
    }

    const toastId = toast.loading("Mempersiapkan kwitansi resmi tanda terima pembayaran...", {
      description: `Menyiapkan kwitansi untuk transaksi #${transaksiId}.`,
    });

    try {
      setIsPrintingKwitansi(true);
      const res = await fetch(`/api/documents/kwitansi?transactionId=${transaksiId}`);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Gagal menghasilkan kwitansi");
      }

      await downloadFileFromResponse(res, `Kwitansi-ITJ-${transaksiId}.docx`);

      toast.success("Kwitansi resmi berhasil diunduh!", {
        id: toastId,
        description: "File .docx siap dicetak atau ditandatangani.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan";
      toast.error("Gagal mencetak Kwitansi", {
        id: toastId,
        description: errorMessage,
      });
    } finally {
      setIsPrintingKwitansi(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPrintingSpr}
        onClick={handlePrintSpr}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-carbon-ink border-mist hover:bg-bone transition-all shadow-subtle disabled:opacity-60"
      >
        {isPrintingSpr ? (
          <Loader2 className="w-3.5 h-3.5 text-deep-teal animate-spin" />
        ) : (
          <FileText className="w-3.5 h-3.5 text-deep-teal" />
        )}
        <span>{isPrintingSpr ? "Menyiapkan..." : "Cetak SPR"}</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPrintingKwitansi || !hasPembayaran}
        onClick={handlePrintKwitansi}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-carbon-ink border-mist hover:bg-bone transition-all shadow-subtle disabled:opacity-60"
      >
        {isPrintingKwitansi ? (
          <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
        ) : (
          <Printer className="w-3.5 h-3.5 text-indigo-600" />
        )}
        <span>{isPrintingKwitansi ? "Menyiapkan..." : "Cetak Kwitansi"}</span>
      </Button>
    </div>
  );
}
