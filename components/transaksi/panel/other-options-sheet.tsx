"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SlidersHorizontal, Undo2, Ban, Loader2, AlertTriangle } from "lucide-react";
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
import {
  getStagesByMetode,
} from "@/lib/transaksi/stage-map";
import type { TahapDetail, MetodeBayar } from "@/generated/prisma";

export interface OtherOptionsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transaksiId: number;
  leadId: number;
  version: number;
  metodeBayar: MetodeBayar;
  currentTahapDetail: TahapDetail | string;
  canEdit?: boolean;
}

export function OtherOptionsSheet({
  isOpen,
  onOpenChange,
  transaksiId,
  leadId,
  version,
  metodeBayar,
  currentTahapDetail,
  canEdit = true,
}: OtherOptionsSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"MUNDUR" | "BATAL">("MUNDUR");
  const [targetMundurStage, setTargetMundurStage] = useState<string>("");
  const [alasan, setAlasan] = useState("");

  const stages = getStagesByMetode(metodeBayar);
  const currentIndex = stages.findIndex((s) => s.detail === currentTahapDetail);

  // Available regression stages (strictly earlier than current stage)
  const regressionStages = stages.filter(
    (s, idx) => idx < currentIndex && s.detail !== "BATAL"
  );

  const handleMundurTahap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!targetMundurStage) {
      toast.error("Silakan pilih tahap tujuan pemunduran.");
      return;
    }

    if (!alasan.trim() || alasan.trim().length < 5) {
      toast.error("Alasan pemunduran tahap wajib diisi minimal 5 karakter.");
      return;
    }

    startTransition(async () => {
      const res = await updateTransactionStatus({
        transaksiId,
        leadId,
        version,
        tahapDetail: targetMundurStage as TahapDetail,
        fromDetail: currentTahapDetail as TahapDetail,
        catatanAdmin: `[MUNDUR TAHAP] ${alasan.trim()}`,
      });

      if (res.success) {
        toast.success(res.message || "Tahap transaksi berhasil dimundurkan.");
        onOpenChange(false);
        setAlasan("");
        router.refresh();
      } else {
        toast.error(res.error || "Gagal memundurkan tahap transaksi.");
      }
    });
  };

  const handleBatalTransaksi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!alasan.trim() || alasan.trim().length < 5) {
      toast.error("Alasan pembatalan transaksi wajib diisi minimal 5 karakter.");
      return;
    }

    startTransition(async () => {
      const res = await updateTransactionStatus({
        transaksiId,
        leadId,
        version,
        tahapDetail: "BATAL",
        fromDetail: currentTahapDetail as TahapDetail,
        catatanAdmin: `[BATAL TRANSAKSI] ${alasan.trim()}`,
      });

      if (res.success) {
        toast.success(res.message || "Transaksi berhasil dibatalkan.");
        onOpenChange(false);
        setAlasan("");
        router.refresh();
      } else {
        toast.error(res.error || "Gagal membatalkan transaksi.");
      }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-md sm:side-right sm:h-full">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-carbon-ink flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <SheetTitle>Opsi Lainnya & Koreksi Tahap</SheetTitle>
              <SheetDescription>
                Gunakan menu koreksi untuk memundurkan posisi transaksi atau membatalkan
                transaksi dengan catatan audit wajib.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Tab Selection */}
        <div className="flex items-center gap-1.5 p-1 bg-bone rounded-lg border border-mist mt-3">
          <button
            type="button"
            onClick={() => setActiveTab("MUNDUR")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "MUNDUR"
                ? "bg-white text-carbon-ink shadow-2xs"
                : "text-slate hover:text-carbon-ink"
            }`}
          >
            Mundur Tahap
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("BATAL")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === "BATAL"
                ? "bg-white text-rose-600 shadow-2xs"
                : "text-slate hover:text-rose-600"
            }`}
          >
            Batalkan Transaksi
          </button>
        </div>

        {/* Tab Content: Mundur Tahap */}
        {activeTab === "MUNDUR" && (
          <form onSubmit={handleMundurTahap} className="space-y-4 py-3">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                Aksi ini hanya untuk koreksi data jika ada tahapan sebelumnya yang keliru.
                Melihat atau membuka step di tampilan TIDAK memundurkan tahap server.
              </p>
            </div>

            {regressionStages.length === 0 ? (
              <p className="text-xs text-slate italic py-4 text-center">
                Transaksi masih berada di tahap awal, tidak ada tahap sebelumnya untuk dimundurkan.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-carbon-ink">
                    Pilih Tahap Sebelumnya <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetMundurStage}
                    onChange={(e) => setTargetMundurStage(e.target.value)}
                    disabled={isPending}
                    className="w-full h-10 px-3 rounded-lg border border-mist bg-white text-xs font-medium text-carbon-ink focus:border-deep-teal focus:ring-1 focus:ring-deep-teal outline-none"
                  >
                    <option value="">-- Pilih Tahap Tujuan --</option>
                    {regressionStages.map((stage) => (
                      <option key={stage.detail} value={stage.detail}>
                        {stage.label} ({stage.detail})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-carbon-ink">
                    Alasan Pemunduran Tahap <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                    placeholder="Contoh: Dokumen pemohon perlu diperbaiki ulang karena salah input..."
                    disabled={isPending}
                    className="w-full p-2.5 rounded-lg border border-mist bg-white text-xs font-medium text-carbon-ink focus:border-deep-teal focus:ring-1 focus:ring-deep-teal outline-none"
                  />
                  <p className="text-[11px] text-slate">
                    Wajib diisi minimal 5 karakter untuk keperluan audit trail.
                  </p>
                </div>

                <SheetFooter className="pt-3 border-t border-mist flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => onOpenChange(false)}
                    className="w-full sm:w-auto text-xs"
                  >
                    Tutup
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending || !targetMundurStage || alasan.trim().length < 5}
                    className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                        Simpan Mundur Tahap
                      </>
                    )}
                  </Button>
                </SheetFooter>
              </>
            )}
          </form>
        )}

        {/* Tab Content: Batal Transaksi */}
        {activeTab === "BATAL" && (
          <form onSubmit={handleBatalTransaksi} className="space-y-4 py-3">
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
              <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p>
                Pembatalan transaksi bersifat permanen. Status unit akan dikembalikan menjadi
                tersedia jika belum terikat transaksi lain.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-carbon-ink">
                Alasan Pembatalan Transaksi <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Contoh: Konsumen mengundurkan diri karena kendala keuangan keluarga..."
                disabled={isPending}
                className="w-full p-2.5 rounded-lg border border-mist bg-white text-xs font-medium text-carbon-ink focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
              />
              <p className="text-[11px] text-slate">
                Wajib diisi minimal 5 karakter untuk laporan manajemen.
              </p>
            </div>

            <SheetFooter className="pt-3 border-t border-mist flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto text-xs"
              >
                Tutup
              </Button>
              <Button
                type="submit"
                disabled={isPending || alasan.trim().length < 5}
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Membatalkan...
                  </>
                ) : (
                  <>
                    <Ban className="mr-1.5 h-3.5 w-3.5" />
                    Konfirmasi Batal Transaksi
                  </>
                )}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
