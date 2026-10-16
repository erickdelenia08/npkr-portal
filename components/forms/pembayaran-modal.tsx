"use client";

import React, { useState, useTransition } from "react";
import { PlusCircle, Loader2, Banknote, DollarSign } from "lucide-react";
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

interface PembayaranModalProps {
  transaksiId: number;
  sisaItj?: number;
  sisaDp?: number;
}

export function PembayaranModal({
  transaksiId,
  sisaItj,
  sisaDp,
}: PembayaranModalProps) {
  const [open, setOpen] = useState(false);
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
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="inline-flex items-center gap-1.5 bg-carbon-ink text-white hover:bg-carbon-ink/90 text-xs font-semibold shadow-subtle"
          />
        }
      >
        <PlusCircle className="w-3.5 h-3.5 text-prism-teal" />
        <span>+ Input Pembayaran</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-white border border-mist shadow-lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-50 text-deep-teal flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-carbon-ink">
                Input Pembayaran Konsumen
              </DialogTitle>
              <DialogDescription className="text-xs text-slate mt-0.5">
                Catat penerimaan uang tanda jadi, DP, atau cicilan dari konsumen.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Jenis Pembayaran */}
          <div>
            <label className="block text-xs font-semibold text-carbon-ink mb-1.5">
              Jenis Pembayaran <span className="text-rose-500">*</span>
            </label>
            <select
              value={jenisBayar}
              onChange={(e) =>
                setJenisBayar(
                  e.target.value as "ITJ" | "DP" | "CICILAN" | "PELUNASAN"
                )
              }
              className="w-full px-3 py-2 text-xs bg-bone/50 border border-mist rounded-md text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal font-medium"
            >
              <option value="ITJ">ITJ (Iuran Tanda Jadi)</option>
              <option value="DP">Uang Muka (DP)</option>
              <option value="CICILAN">Cicilan / Angsuran</option>
              <option value="PELUNASAN">Pelunasan</option>
            </select>
          </div>

          {/* Quick Shortcuts for Remaining Amounts */}
          {(sisaItj !== undefined && sisaItj > 0 && jenisBayar === "ITJ") ||
          (sisaDp !== undefined && sisaDp > 0 && jenisBayar === "DP") ? (
            <div className="flex items-center gap-2 text-[11px] text-slate bg-bone/70 p-2 rounded border border-mist">
              <span>Saran nominal:</span>
              {jenisBayar === "ITJ" && sisaItj && sisaItj > 0 && (
                <button
                  type="button"
                  onClick={() => setSuggestedNominal(sisaItj)}
                  className="px-2 py-0.5 rounded bg-white border border-mist text-deep-teal font-mono font-semibold hover:bg-mist transition-colors"
                >
                  Sisa ITJ: Rp {new Intl.NumberFormat("id-ID").format(sisaItj)}
                </button>
              )}
              {jenisBayar === "DP" && sisaDp && sisaDp > 0 && (
                <button
                  type="button"
                  onClick={() => setSuggestedNominal(sisaDp)}
                  className="px-2 py-0.5 rounded bg-white border border-mist text-deep-teal font-mono font-semibold hover:bg-mist transition-colors"
                >
                  Sisa DP: Rp {new Intl.NumberFormat("id-ID").format(sisaDp)}
                </button>
              )}
            </div>
          ) : null}

          {/* Nominal Input */}
          <div>
            <label className="block text-xs font-semibold text-carbon-ink mb-1.5">
              Nominal (Rp) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate">
                Rp
              </span>
              <input
                type="text"
                value={formatRupiahInput(nominal)}
                onChange={handleNominalChange}
                placeholder="0"
                required
                className="w-full pl-9 pr-3 py-2 text-sm font-mono font-semibold text-graphite bg-bone/50 border border-mist rounded-md focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
              />
            </div>
          </div>

          {/* Catatan Input */}
          <div>
            <label className="block text-xs font-semibold text-carbon-ink mb-1.5">
              Catatan / Referensi (Opsional)
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Transfer Bank BCA an. Budi, Kwitansi No #01"
              rows={2}
              className="w-full px-3 py-2 text-xs text-graphite bg-bone/50 border border-mist rounded-md focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-mist">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !nominal || Number(nominal) <= 0}
              className="bg-deep-teal hover:bg-deep-teal/90 text-white font-semibold text-xs"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
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
