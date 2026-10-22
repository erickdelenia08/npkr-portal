"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, ArrowRightLeft, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getEligiblePICs, handoverLead, EligiblePIC } from "@/actions/lead-handover.action";

export interface HandoverDialogProps {
  leadId: number;
  currentMarketingId?: number | null;
  currentMarketingName?: string | null;
  buttonVariant?: "default" | "outline" | "secondary";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  customTrigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function HandoverDialog({
  leadId,
  currentMarketingId,
  currentMarketingName,
  buttonVariant = "outline",
  buttonSize = "sm",
  customTrigger,
  onSuccess,
}: HandoverDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [eligibleList, setEligibleList] = useState<EligiblePIC[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [catatan, setCatatan] = useState<string>("");
  const [loadingEligible, setLoadingEligible] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Load eligible candidates when modal opens
  useEffect(() => {
    if (open) {
      setLoadingEligible(true);
      setErrorMessage("");
      setSelectedUserId("");
      setCatatan("");

      getEligiblePICs()
        .then((res) => {
          if (res.success && res.data) {
            // Exclude current marketing from target list
            const filtered = res.data.filter((u) => u.id !== currentMarketingId);
            setEligibleList(filtered);
            if (filtered.length > 0) {
              setSelectedUserId(String(filtered[0].id));
            }
          } else {
            setErrorMessage(res.error || "Gagal memuat daftar personel PIC.");
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
          setErrorMessage(msg);
        })
        .finally(() => {
          setLoadingEligible(false);
        });
    }
  }, [open, currentMarketingId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = Number(selectedUserId);

    if (!Number.isSafeInteger(targetId) || targetId <= 0) {
      toast.error("Silakan pilih personel PIC baru.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await handoverLead(leadId, targetId, catatan);
        if (res.success) {
          toast.success(res.message || "PIC berhasil dialihkan.");
          setOpen(false);
          router.refresh();
          onSuccess?.();
        } else {
          toast.error(res.error || "Gagal mengalihkan PIC.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
        toast.error(msg);
      }
    });
  };

  return (
    <>
      <div onClick={() => setOpen(true)} className="inline-block">
        {customTrigger || (
          <Button
            type="button"
            variant={buttonVariant}
            size={buttonSize}
            className="inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Oper PIC / Handover</span>
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>

      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Oper PIC / Handover Beban Kerja
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Alihkan kepemilikan operasional prospek dan transaksi berjalan ke personel lain.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Current PIC banner */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
            <span className="text-slate-500 font-medium">PIC Saat Ini:</span>
            <span className="font-bold text-slate-800">
              {currentMarketingName || "Belum Ditugaskan"}
            </span>
          </div>

          {/* Target PIC selection */}
          <div className="space-y-1.5">
            <label
              htmlFor="target-pic-select"
              className="text-xs font-semibold text-slate-700 block"
            >
              Pilih Personel PIC Baru <span className="text-rose-500">*</span>
            </label>

            {loadingEligible ? (
              <div className="flex items-center gap-2 p-3 text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                <span>Memuat personel aktif...</span>
              </div>
            ) : errorMessage ? (
              <div className="p-3 text-xs text-rose-600 bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : eligibleList.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded-lg border border-slate-200">
                Tidak ada personel lain yang tersedia untuk serah terima.
              </p>
            ) : (
              <select
                id="target-pic-select"
                value={selectedUserId}
                disabled={isPending}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-100"
              >
                {eligibleList.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nama} ({user.role}) - {user.no_hp}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Notes textarea */}
          <div className="space-y-1.5">
            <label
              htmlFor="handover-notes"
              className="text-xs font-semibold text-slate-700 block"
            >
              Catatan Serah Terima / Instruksi <span className="text-slate-400 font-normal">(Opsional)</span>
            </label>
            <textarea
              id="handover-notes"
              rows={3}
              value={catatan}
              disabled={isPending}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Misal: Konsumen minta jadwal survei ulang hari Sabtu, berkas KTP sudah lengkap..."
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-100 resize-none"
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Setelah dialihkan, kontrol pengeditan pada transaksi dan prospek ini akan otomatis berpindah ke PIC baru.
            </span>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || loadingEligible || eligibleList.length === 0}
              className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Mengalihkan...
                </>
              ) : (
                "Konfirmasi Handover"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
