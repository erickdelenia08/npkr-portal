"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Award, Loader2, Calendar, UserCheck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { updateTransactionStatus } from "@/actions/transaksi.action";
import { todayWIB } from "@/lib/date/wib";
import type { PengajuanKPRItem } from "@/components/forms/kpr-submission-section";
import type { TahapDetail, MetodeBayar } from "@/generated/prisma";

export interface CatatAkadSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transaksiId: number;
  leadId: number;
  version: number;
  metodeBayar: MetodeBayar;
  currentTahapDetail: TahapDetail | string;
  sp3kBanks?: PengajuanKPRItem[];
  initialNotaris?: string | null;
  canEdit?: boolean;
}

export function CatatAkadSheet({
  isOpen,
  onOpenChange,
  transaksiId,
  leadId,
  version,
  metodeBayar,
  currentTahapDetail,
  sp3kBanks = [],
  initialNotaris = "",
  canEdit = true,
}: CatatAkadSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isKpr = metodeBayar === "KPR";
  const today = todayWIB();

  const [selectedPengajuanId, setSelectedPengajuanId] = useState<number | "">(
    sp3kBanks.length === 1 ? sp3kBanks[0].id : ""
  );
  const [namaNotaris, setNamaNotaris] = useState(initialNotaris || "");
  const [tglAkad, setTglAkad] = useState(today);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (isKpr && sp3kBanks.length > 1 && !selectedPengajuanId) {
      toast.error("Silakan pilih bank pembiaya yang disetujui (SP3K).");
      return;
    }

    if (!namaNotaris.trim()) {
      toast.error("Nama Notaris/PPAT wajib diisi.");
      return;
    }

    if (!tglAkad) {
      toast.error("Tanggal akad aktual wajib diisi.");
      return;
    }

    if (tglAkad > today) {
      toast.error("Tanggal akad aktual tidak boleh di masa depan.");
      return;
    }

    startTransition(async () => {
      const targetTahap = isKpr ? "AKAD_KREDIT" : "AJB";

      const res = await updateTransactionStatus({
        transaksiId,
        leadId,
        version,
        tahapDetail: targetTahap as TahapDetail,
        fromDetail: currentTahapDetail as TahapDetail,
        namaNotaris: namaNotaris.trim(),
        tglAkad,
        tglAjb: !isKpr ? tglAkad : undefined,
        pengajuanTerpilihId:
          isKpr && selectedPengajuanId ? Number(selectedPengajuanId) : undefined,
        catatanAdmin: `[AKAD] Pencatatan akad resmi oleh Notaris ${namaNotaris.trim()} pada ${tglAkad}.`,
      });

      if (res.success) {
        toast.success(res.message || "Akad transaksi berhasil dicatat.");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error || "Gagal mencatat akad transaksi.");
      }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-md sm:side-right sm:h-full">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-deep-teal flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <SheetTitle>
                {isKpr ? "Catat Akad Kredit KPR" : "Catat Akta Jual Beli (AJB)"}
              </SheetTitle>
              <SheetDescription>
                Pencatatan akad resmi akan memindahkan transaksi ke tahap Akad & BAST.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Bank Choice for KPR if more than 1 SP3K */}
          {isKpr && sp3kBanks.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-carbon-ink">
                Pilih Bank Pembiaya (SP3K) <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPengajuanId}
                onChange={(e) => setSelectedPengajuanId(Number(e.target.value))}
                disabled={isPending || !canEdit}
                className="w-full h-10 px-3 rounded-lg border border-mist bg-white text-xs font-medium text-carbon-ink focus:border-deep-teal focus:ring-1 focus:ring-deep-teal outline-none"
              >
                <option value="">-- Pilih Bank Pembiaya --</option>
                {sp3kBanks.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.bank.nama} (Pengajuan #{app.nomor_pengajuan})
                  </option>
                ))}
              </select>
            </div>
          )}

          {isKpr && sp3kBanks.length === 1 && (
            <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200/80 text-xs text-teal-900">
              <span className="font-semibold">Bank Pembiaya Terpilih:</span>{" "}
              {sp3kBanks[0].bank.nama} (SP3K #{sp3kBanks[0].nomor_pengajuan})
            </div>
          )}

          {/* Nama Notaris */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-carbon-ink">
              Nama Notaris / PPAT <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={namaNotaris}
                onChange={(e) => setNamaNotaris(e.target.value)}
                placeholder="Contoh: Notaris Hj. Siti Aminah, S.H., M.Kn."
                disabled={isPending || !canEdit}
                className="w-full h-10 px-3 rounded-lg border border-mist bg-white text-xs font-medium text-carbon-ink focus:border-deep-teal focus:ring-1 focus:ring-deep-teal outline-none"
              />
            </div>
          </div>

          {/* Tanggal Akad Aktual */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-carbon-ink">
              Tanggal Akad Aktual <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                max={today}
                value={tglAkad}
                onChange={(e) => setTglAkad(e.target.value)}
                disabled={isPending || !canEdit}
                className="w-full h-10 px-3 rounded-lg border border-mist bg-white text-xs font-mono font-medium text-carbon-ink focus:border-deep-teal focus:ring-1 focus:ring-deep-teal outline-none"
              />
            </div>
            <p className="text-[11px] text-slate">
              Tanggal pelaksanaan akad tidak boleh di masa depan.
            </p>
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
              disabled={
                isPending ||
                !canEdit ||
                !namaNotaris.trim() ||
                !tglAkad ||
                tglAkad > today
              }
              className="w-full sm:w-auto bg-deep-teal hover:bg-teal-700 text-white text-xs font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Mencatat Akad...
                </>
              ) : (
                "Simpan & Masuk Tahap Akad"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

