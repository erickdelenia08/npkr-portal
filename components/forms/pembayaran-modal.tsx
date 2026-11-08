"use client";

import React, { useState, useTransition } from "react";
import { Loader2, Banknote } from "lucide-react";
import { toast } from "sonner";
import { createPembayaran } from "@/actions/transaksi.action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface PembayaranModalProps {
  transaksiId: number;
  sisaItj?: number;
  sisaDp?: number;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PembayaranModal({
  transaksiId,
  sisaItj,
  sisaDp,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: PembayaranModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;
  const [isPending, startTransition] = useTransition();

  const [jenisBayar, setJenisBayar] = useState<
    "ITJ" | "DP" | "CICILAN" | "PELUNASAN"
  >("ITJ");
  const [nominal, setNominal] = useState<string>("");
  const [catatan, setCatatan] = useState<string>("");

  const formatRupiahInput = (val: string) => {
    const raw = val.replace(/\D/g, "");
    if (!raw) return "";
    return new Intl.NumberFormat("id-ID").format(Number(raw));
  };

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanNumber = e.target.value.replace(/\D/g, "");
    setNominal(cleanNumber);
  };

  const setSuggestedNominal = (amount: number) => {
    if (amount > 0) {
      setNominal(String(amount));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericNominal = Number(nominal);
    if (!numericNominal || numericNominal <= 0) {
      toast.error("Nominal pembayaran harus lebih besar dari 0");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createPembayaran({
          transaksiId,
          jenisBayar,
          nominal: numericNominal,
          catatan: catatan.trim() || undefined,
        });

        if (res.success) {
          toast.success(res.message || "Pembayaran berhasil dicatat.");
          setNominal("");
          setCatatan("");
          setOpen(false);
        } else {
          toast.error(res.error || "Gagal mencatat pembayaran.");
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
        toast.error(msg);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger
          render={
            <Button
              size="sm"
              className="inline-flex items-center gap-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-xs"
            />
          }
        >
          {/* <PlusCircle className="w-3.5 h-3.5 text-teal-400" /> */}
          <span>Input Pembayaran</span>
        </DialogTrigger>
      )}

      <DialogContent className="p-0 overflow-hidden bg-white border-slate-200 shadow-xl flex flex-col max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-w-none max-sm:w-full max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:border-b-0 max-sm:max-h-[92dvh] sm:max-w-md sm:rounded-xl sm:max-h-[85vh]">
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-2.5 pb-0.5 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Dialog Header */}
        <DialogHeader className="px-5 sm:px-6 pt-2 sm:pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-200/70 flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 tracking-tight">
                Input Pembayaran Konsumen
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Catat penerimaan tanda jadi, uang muka (DP), atau cicilan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-4">
            {/* Jenis Pembayaran */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Jenis Pembayaran <span className="text-rose-500">*</span>
              </label>
              <select
                value={jenisBayar}
                onChange={(e) =>
                  setJenisBayar(
                    e.target.value as "ITJ" | "DP" | "CICILAN" | "PELUNASAN"
                  )
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-medium transition-colors"
              >
                <option value="ITJ">ITJ (Iuran Tanda Jadi)</option>
                <option value="DP">Uang Muka (DP)</option>
                <option value="CICILAN">Cicilan / Angsuran</option>
                <option value="PELUNASAN">Pelunasan</option>
              </select>
            </div>

            {/* Nominal Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Nominal Pembayaran <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-mono font-bold text-slate-400 select-none">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatRupiahInput(nominal)}
                  onChange={handleNominalChange}
                  placeholder="0"
                  required
                  className="w-full pl-11 pr-4 py-2.5 text-base sm:text-lg font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all placeholder:text-slate-300"
                />
              </div>

              {/* Quick Shortcuts for Remaining Amounts */}
              {((sisaItj !== undefined && sisaItj > 0 && jenisBayar === "ITJ") ||
                (sisaDp !== undefined && sisaDp > 0 && jenisBayar === "DP")) && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[11px] font-medium text-slate-500">
                      Saran:
                    </span>
                    {jenisBayar === "ITJ" && sisaItj && sisaItj > 0 && (
                      <button
                        type="button"
                        onClick={() => setSuggestedNominal(sisaItj)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 hover:bg-teal-100 border border-teal-200/80 text-teal-800 text-[11px] font-mono font-semibold transition-colors active:scale-95 cursor-pointer"
                      >
                        <span>Sisa ITJ:</span>
                        <span className="font-bold">
                          Rp {new Intl.NumberFormat("id-ID").format(sisaItj)}
                        </span>
                      </button>
                    )}
                    {jenisBayar === "DP" && sisaDp && sisaDp > 0 && (
                      <button
                        type="button"
                        onClick={() => setSuggestedNominal(sisaDp)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-teal-50 hover:bg-teal-100 border border-teal-200/80 text-teal-800 text-[11px] font-mono font-semibold transition-colors active:scale-95 cursor-pointer"
                      >
                        <span>Sisa DP:</span>
                        <span className="font-bold">
                          Rp {new Intl.NumberFormat("id-ID").format(sisaDp)}
                        </span>
                      </button>
                    )}
                  </div>
                )}
            </div>

            {/* Catatan Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Catatan / Keterangan (Opsional)
              </label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Transfer Bank BCA an. Budi, Kwitansi No #01"
                rows={2}
                className="w-full px-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all resize-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Sticky Pinned Footer */}
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto h-9 text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !nominal || Number(nominal) <= 0}
              className="w-full sm:w-auto h-9 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-xs disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Pembayaran"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
