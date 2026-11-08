"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { simpanJadwalTransaksi } from "@/actions/transaksi.action";
import { toWibDay } from "@/lib/date/wib";

export interface RencanaJadwalSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transaksiId: number;
  version: number;
  initialNotaris?: string | null;
  initialRencanaAkad?: string | null;
  initialRencanaBast?: string | null;
  canEdit?: boolean;
}

export function RencanaJadwalSheet({
  isOpen,
  onOpenChange,
  transaksiId,
  version,
  initialNotaris = "",
  initialRencanaAkad = "",
  initialRencanaBast = "",
  canEdit = true,
}: RencanaJadwalSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [notaris, setNotaris] = useState(initialNotaris || "");
  const [rencanaAkad, setRencanaAkad] = useState(
    initialRencanaAkad ? toWibDay(initialRencanaAkad) : ""
  );
  const [rencanaBast, setRencanaBast] = useState(
    initialRencanaBast ? toWibDay(initialRencanaBast) : ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    startTransition(async () => {
      const res = await simpanJadwalTransaksi({
        transaksiId,
        version,
        namaNotaris: notaris.trim() || undefined,
        rencanaAkadAt: rencanaAkad || undefined,
        rencanaBastAt: rencanaBast || undefined,
      });

      if (res.success) {
        toast.success(res.message || "Rencana jadwal berhasil disimpan.");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error || "Gagal menyimpan jadwal transaksi.");
      }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-md sm:side-right sm:h-full">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-deep-teal flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <SheetTitle>Rencana Jadwal Akad</SheetTitle>
              <SheetDescription>
                Simpan estimasi tanggal rencana akad
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-carbon-ink">
              Rencana Tanggal Akad
            </label>
            <input
              type="date"
              value={rencanaAkad}
              onChange={(e) => setRencanaAkad(e.target.value)}
              disabled={isPending || !canEdit}
              className="w-full h-10 px-3 rounded-lg border border-mist bg-white text-xs font-mono font-medium text-carbon-ink focus:border-deep-teal focus:ring-1 focus:ring-deep-teal outline-none"
            />
          </div>

          {/* <div className="space-y-1.5">
            <label className="text-xs font-semibold text-carbon-ink">
              Rencana Tanggal BAST (Serah Terima)
            </label>
            <input
              type="date"
              value={rencanaBast}
              onChange={(e) => setRencanaBast(e.target.value)}
              disabled={isPending || !canEdit}
              className="w-full h-10 px-3 rounded-lg border border-mist bg-white text-xs font-mono font-medium text-carbon-ink focus:border-deep-teal focus:ring-1 focus:ring-deep-teal outline-none"
            />
          </div> */}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-carbon-ink">
              Nama Notaris / PPAT (Estimasi)
            </label>
            <input
              type="text"
              value={notaris}
              onChange={(e) => setNotaris(e.target.value)}
              placeholder="Contoh: Notaris Hj. Siti Aminah, S.H."
              disabled={isPending || !canEdit}
              className="w-full h-10 px-3 rounded-lg border border-mist bg-white text-xs font-medium text-carbon-ink focus:border-deep-teal focus:ring-1 focus:ring-deep-teal outline-none"
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
              disabled={isPending || !canEdit}
              className="w-full sm:w-auto bg-deep-teal hover:bg-teal-700 text-white text-xs font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Rencana"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

