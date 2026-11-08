"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Loader2, ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ajukanKPR } from "@/actions/kpr.action";
import type { BankItem, PengajuanKPRItem } from "@/components/forms/kpr-submission-section";

export interface AjukanKprSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transaksiId: number;
  masterBanks: BankItem[];
  existingSubmissions: PengajuanKPRItem[];
  canEdit?: boolean;
}

export function AjukanKprSheet({
  isOpen,
  onOpenChange,
  transaksiId,
  masterBanks,
  existingSubmissions,
  canEdit = true,
}: AjukanKprSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [catatan, setCatatan] = useState("");

  // Determine active bank IDs already submitted
  const activeBankIds = new Set(
    existingSubmissions
      .filter((s) => s.status !== "DITOLAK" && s.status !== "DIBATALKAN")
      .map((s) => s.bank_id)
  );

  const availableBanks = masterBanks.filter((b) => !activeBankIds.has(b.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const bankIdNum = Number(selectedBankId);
    if (!bankIdNum || bankIdNum <= 0) {
      toast.error("Silakan pilih bank tujuan pengajuan.");
      return;
    }

    startTransition(async () => {
      const res = await ajukanKPR({
        transaksiId,
        bankId: bankIdNum,
        catatan: catatan.trim() || undefined,
      });

      if (res.success) {
        toast.success(res.message || "Pengajuan KPR berhasil diajukan.");
        onOpenChange(false);
        setSelectedBankId("");
        setCatatan("");
        router.refresh();
      } else {
        toast.error(res.error || "Gagal mengajukan KPR.");
      }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-md sm:side-right sm:h-full">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-deep-teal flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <SheetTitle>Ajukan KPR ke Bank</SheetTitle>
              <SheetDescription>
                Pilih bank rekanan untuk mengajukan permohonan KPR konsumen.
                Pengajuan dapat dilakukan ke beberapa bank secara paralel.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-carbon-ink">
              Pilih Bank Rekanan <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              disabled={isPending || !canEdit}
              className="w-full h-10 px-3 rounded-lg border border-mist bg-white text-xs font-medium text-carbon-ink focus:border-deep-teal focus:ring-1 focus:ring-deep-teal outline-none"
            >
              <option value="">-- Pilih Bank --</option>
              {availableBanks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama} {b.kode ? `(${b.kode})` : ""}
                </option>
              ))}
            </select>
            {availableBanks.length === 0 && (
              <p className="text-[11px] text-amber-700">
                Semua bank aktif sudah memiliki pengajuan yang sedang berjalan.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-carbon-ink">
              Catatan Pengajuan (Opsional)
            </label>
            <textarea
              rows={3}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Pengajuan melalui cabang BTN Harapan Indah..."
              disabled={isPending || !canEdit}
              className="w-full p-2.5 rounded-lg border border-mist bg-white text-xs font-medium text-carbon-ink focus:border-deep-teal focus:ring-1 focus:ring-deep-teal outline-none"
            />
          </div>

          <SheetFooter className="pt-4 border-t border-mist flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending || !selectedBankId || !canEdit}
              className="w-full sm:w-auto bg-deep-teal hover:bg-teal-700 text-white text-xs font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Mengajukan...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                  Kirim Pengajuan
                </>
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

