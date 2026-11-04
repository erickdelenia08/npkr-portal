"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  ArrowRightLeft,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Lock,
  Building2,
  Users,
} from "lucide-react";
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
import { handoverTransaksi } from "@/actions/transaksi-handover.action";

/* ─────────────────────────────────────────────────────────────────────────────
 * 1. HANDOVER PIC LEAD DIALOG
 * ───────────────────────────────────────────────────────────────────────────── */

export interface HandoverLeadDialogProps {
  leadId: number;
  leadName?: string | null;
  currentMarketingId?: number | null;
  currentMarketingName?: string | null;
  isLocked?: boolean;
  lockedReason?: string;
  buttonVariant?: "default" | "outline" | "secondary";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  customTrigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function HandoverLeadDialog({
  leadId,
  leadName,
  currentMarketingId,
  currentMarketingName,
  isLocked = false,
  lockedReason = "Lead yang sudah mencapai tahap ITJ / Closing tidak dapat dialihkan (handover terkunci).",
  buttonVariant = "outline",
  buttonSize = "sm",
  customTrigger,
  onSuccess,
}: HandoverLeadDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [eligibleList, setEligibleList] = useState<EligiblePIC[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [catatan, setCatatan] = useState<string>("");
  const [loadingEligible, setLoadingEligible] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && !isLocked) {
      setLoadingEligible(true);
      setErrorMessage("");
      setSelectedUserId("");
      setCatatan("");

      getEligiblePICs()
        .then((res) => {
          if (res.success && res.data) {
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
  }, [open, currentMarketingId, isLocked]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      toast.error(lockedReason);
      return;
    }

    const targetId = Number(selectedUserId);
    if (!Number.isSafeInteger(targetId) || targetId <= 0) {
      toast.error("Silakan pilih personel PIC baru.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await handoverLead(leadId, targetId, catatan);
        if (res.success) {
          toast.success(res.message || "PIC lead berhasil dialihkan.");
          setOpen(false);
          router.refresh();
          onSuccess?.();
        } else {
          toast.error(res.error || "Gagal mengalihkan PIC lead.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
        toast.error(msg);
      }
    });
  };

  if (isLocked) {
    return (
      <div className="inline-block" title={lockedReason}>
        {customTrigger || (
          <Button
            type="button"
            variant={buttonVariant}
            size={buttonSize}
            disabled
            className="inline-flex items-center gap-1.5 text-xs font-semibold opacity-60 cursor-not-allowed"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Oper PIC (Terkunci)</span>
          </Button>
        )}
      </div>
    );
  }

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
            <span>Oper PIC Lead</span>
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Oper PIC Prospek Lead
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Alihkan tanggung jawab prospek lead ke marketing lain sebelum tahap ITJ.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {leadName && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                <span className="text-slate-500 font-medium">Nama Lead:</span>
                <span className="font-bold text-slate-800">{leadName}</span>
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
              <span className="text-slate-500 font-medium">PIC Lead Saat Ini:</span>
              <span className="font-bold text-slate-800">
                {currentMarketingName || "Belum Ditugaskan"}
              </span>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="target-pic-lead-select"
                className="text-xs font-semibold text-slate-700 block"
              >
                Pilih Marketing PIC Baru <span className="text-rose-500">*</span>
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
                  id="target-pic-lead-select"
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

            <div className="space-y-1.5">
              <label
                htmlFor="handover-lead-notes"
                className="text-xs font-semibold text-slate-700 block"
              >
                Catatan Serah Terima Lead <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <textarea
                id="handover-lead-notes"
                rows={3}
                value={catatan}
                disabled={isPending}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Misal: Konsumen minta survei hari Sabtu, tertarik unit tipe 36..."
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-100 resize-none"
              />
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span>
                Pengalihan PIC Lead hanya memindahkan hak follow-up lead ini sebelum tahap ITJ / closing.
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
                  "Konfirmasi Handover Lead"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 2. HANDOVER PIC TRANSAKSI DIALOG
 * ───────────────────────────────────────────────────────────────────────────── */

export interface HandoverTransaksiDialogProps {
  transaksiId: number;
  blokUnit?: string;
  currentPicId?: number | null;
  currentPicName?: string | null;
  isLocked?: boolean;
  lockedReason?: string;
  buttonVariant?: "default" | "outline" | "secondary";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  customTrigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function HandoverTransaksiDialog({
  transaksiId,
  blokUnit,
  currentPicId,
  currentPicName,
  isLocked = false,
  lockedReason = "Transaksi telah selesai (BAST) atau dibatalkan sehingga PIC tidak dapat dialihkan.",
  buttonVariant = "outline",
  buttonSize = "sm",
  customTrigger,
  onSuccess,
}: HandoverTransaksiDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [eligibleList, setEligibleList] = useState<EligiblePIC[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [catatan, setCatatan] = useState<string>("");
  const [loadingEligible, setLoadingEligible] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open && !isLocked) {
      setLoadingEligible(true);
      setErrorMessage("");
      setSelectedUserId("");
      setCatatan("");

      getEligiblePICs()
        .then((res) => {
          if (res.success && res.data) {
            const filtered = res.data.filter((u) => u.id !== currentPicId);
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
  }, [open, currentPicId, isLocked]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      toast.error(lockedReason);
      return;
    }

    const targetId = Number(selectedUserId);
    if (!Number.isSafeInteger(targetId) || targetId <= 0) {
      toast.error("Silakan pilih personel PIC baru.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await handoverTransaksi(transaksiId, targetId, catatan);
        if (res.success) {
          toast.success(res.message || "PIC transaksi berhasil dialihkan.");
          setOpen(false);
          router.refresh();
          onSuccess?.();
        } else {
          toast.error(res.error || "Gagal mengalihkan PIC transaksi.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
        toast.error(msg);
      }
    });
  };

  if (isLocked) {
    return (
      <div className="inline-block" title={lockedReason}>
        {customTrigger || (
          <Button
            type="button"
            variant={buttonVariant}
            size={buttonSize}
            disabled
            className="inline-flex items-center gap-1.5 text-xs font-semibold opacity-60 cursor-not-allowed"
          >
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Oper PIC (Terkunci)</span>
          </Button>
        )}
      </div>
    );
  }

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
            <span>Oper PIC Transaksi</span>
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Oper PIC Transaksi
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Alihkan tanggung jawab operasional penanganan transaksi {blokUnit ? `unit ${blokUnit}` : ""} ke staf lain.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
              <span className="text-slate-500 font-medium">PIC Transaksi Saat Ini:</span>
              <span className="font-bold text-slate-800">
                {currentPicName || "Belum Ditugaskan"}
              </span>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="target-pic-trx-select"
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
                  id="target-pic-trx-select"
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

            <div className="space-y-1.5">
              <label
                htmlFor="handover-trx-notes"
                className="text-xs font-semibold text-slate-700 block"
              >
                Catatan Serah Terima Transaksi <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <textarea
                id="handover-trx-notes"
                rows={3}
                value={catatan}
                disabled={isPending}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Misal: Berkas KTP dan KK sudah lengkap, konsumen siap akad minggu depan..."
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-slate-100 resize-none"
              />
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Aturan Bisnis:</strong> Handover PIC transaksi <strong>HANYA</strong> mengalihkan penanganan berkas dan proses transaksi ini. PIC Lead dan atribusi closing marketing tetap tidak berubah.
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
                  "Konfirmasi Handover Transaksi"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 3. BACKWARD-COMPATIBLE ALIAS
 * ───────────────────────────────────────────────────────────────────────────── */

export type HandoverDialogProps = HandoverLeadDialogProps;
export const HandoverDialog = HandoverLeadDialog;
