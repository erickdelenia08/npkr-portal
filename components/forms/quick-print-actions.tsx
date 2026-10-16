"use client";

import React from "react";
import { Printer, FileText, Download } from "lucide-react";
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
  const handlePrintSpr = () => {
    toast.info("Memproses berkas SPR (Surat Pesanan Rumah)...", {
      description: `Dokumen SPR untuk transaksi #${transaksiId} sedang disiapkan.`,
    });
  };

  const handlePrintKwitansi = () => {
    if (!hasPembayaran) {
      toast.warning("Belum ada riwayat pembayaran untuk dicetak.");
      return;
    }
    toast.info("Mempersiapkan kwitansi resmi tanda terima pembayaran...", {
      description: `Format kwitansi #${transaksiId} siap diunduh/dicetak.`,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePrintSpr}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-carbon-ink border-mist hover:bg-bone transition-all shadow-subtle"
      >
        <FileText className="w-3.5 h-3.5 text-deep-teal" />
        <span>Cetak SPR</span>
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePrintKwitansi}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-carbon-ink border-mist hover:bg-bone transition-all shadow-subtle"
      >
        <Printer className="w-3.5 h-3.5 text-indigo-600" />
        <span>Cetak Kwitansi</span>
      </Button>
    </div>
  );
}
