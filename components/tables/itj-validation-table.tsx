"use client";

import React, { useState, useTransition, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  FileCheck2,
  Clock,
  User,
  MapPin,
  Banknote,
  CreditCard,
  X,
  MessageSquareWarning,
} from "lucide-react";
import { toast } from "sonner";
import { approveITJ, rejectITJ } from "@/actions/itj";

// ── Serialized data shape coming from the server page ──

export interface ITJLeadRow {
  id: number;
  nama: string;
  updated_at: string; // ISO string (serialized Date)
  marketing: {
    id: number;
    nama: string;
  } | null;
  customer: {
    transaksi: Array<{
      id: number;
      unit_id: number;
      target_itj: string; // serialized Decimal
      metode_bayar: "KPR" | "CASH_KERAS" | "CASH_TEMPO";
      unit: {
        blok: string;
      };
    }>;
  } | null;
}

interface ITJValidationTableProps {
  data: ITJLeadRow[];
}

// ── Helpers ──

const formatCurrency = (value: string | number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const metodeBadge: Record<string, { label: string; className: string }> = {
  KPR: {
    label: "KPR",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  CASH_KERAS: {
    label: "Cash Keras",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CASH_TEMPO: {
    label: "Cash Tempo",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

// ── Component ──

export function ITJValidationTable({ data }: ITJValidationTableProps) {
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeAction, setActiveAction] = useState<"approve" | "reject" | null>(
    null
  );

  // Rejection dialog state
  const [rejectTarget, setRejectTarget] = useState<ITJLeadRow | null>(null);
  const [catatan, setCatatan] = useState("");

  // ── Approve Handler ──
  const handleApprove = useCallback(
    (lead: ITJLeadRow) => {
      if (
        !window.confirm(
          `Setujui pengajuan ITJ dari "${lead.nama}"? Unit akan dikunci (SOLD).`
        )
      ) {
        return;
      }

      setActiveId(lead.id);
      setActiveAction("approve");

      startTransition(async () => {
        try {
          const res = await approveITJ(lead.id);

          if (res.success) {
            toast.success(`ITJ "${lead.nama}" berhasil disetujui.`);
          } else {
            toast.error(res.error ?? "Gagal menyetujui ITJ.");
          }
        } catch (error: unknown) {
          const msg =
            error instanceof Error ? error.message : "Gagal menyetujui ITJ.";
          toast.error(msg);
        } finally {
          setActiveId(null);
          setActiveAction(null);
        }
      });
    },
    [startTransition]
  );

  // ── Reject Dialog Opener ──
  const openRejectDialog = useCallback((lead: ITJLeadRow) => {
    setRejectTarget(lead);
    setCatatan("");
  }, []);

  // ── Reject Confirm Handler ──
  const handleRejectConfirm = useCallback(() => {
    if (!rejectTarget) return;

    if (!catatan.trim()) {
      toast.error("Catatan penolakan wajib diisi.");
      return;
    }

    setActiveId(rejectTarget.id);
    setActiveAction("reject");

    startTransition(async () => {
      try {
        const res = await rejectITJ(rejectTarget.id, catatan.trim());

        if (res.success) {
          toast.success(
            `ITJ "${rejectTarget.nama}" ditolak. Unit dikembalikan.`
          );
          setRejectTarget(null);
          setCatatan("");
        } else {
          toast.error(res.error ?? "Gagal menolak ITJ.");
        }
      } catch (error: unknown) {
        const msg =
          error instanceof Error ? error.message : "Gagal menolak ITJ.";
        toast.error(msg);
      } finally {
        setActiveId(null);
        setActiveAction(null);
      }
    });
  }, [rejectTarget, catatan, startTransition]);

  // ── Empty State ──
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-mist p-16 text-center shadow-subtle">
        <div className="w-14 h-14 rounded-full bg-bone text-slate flex items-center justify-center mx-auto mb-4">
          <FileCheck2 className="w-7 h-7 text-steel" />
        </div>
        <h3 className="text-sm font-semibold text-carbon-ink">
          Belum ada pengajuan ITJ baru
        </h3>
        <p className="text-xs text-slate mt-1.5 max-w-md mx-auto leading-relaxed">
          Pengajuan ITJ dari tim marketing akan muncul di sini setelah mereka
          mengirimkan data tanda jadi (ITJ).
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ─── Data Table ─── */}
      <div className="bg-white rounded-lg border border-mist shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            {/* Header */}
            <thead className="bg-bone/60 border-b border-mist text-slate font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Tgl. Pengajuan
                  </span>
                </th>
                <th className="px-5 py-3.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Nama Prospek
                  </span>
                </th>
                <th className="px-5 py-3.5 whitespace-nowrap">Marketing PIC</th>
                <th className="px-5 py-3.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Blok Unit
                  </span>
                </th>
                <th className="px-5 py-3.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5" />
                    Nominal ITJ
                  </span>
                </th>
                <th className="px-5 py-3.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    Metode Bayar
                  </span>
                </th>
                <th className="px-5 py-3.5 text-center whitespace-nowrap">
                  Aksi
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-mist">
              {data.map((lead) => {
                const trx = lead.customer?.transaksi[0];
                const isLoading = isPending && activeId === lead.id;
                const metode = trx
                  ? metodeBadge[trx.metode_bayar] ?? {
                      label: trx.metode_bayar,
                      className: "bg-bone text-graphite border-mist",
                    }
                  : null;

                return (
                  <tr
                    key={lead.id}
                    className="hover:bg-bone/40 transition-colors"
                  >
                    {/* Tanggal Pengajuan */}
                    <td className="px-5 py-3.5 text-slate font-medium whitespace-nowrap">
                      {formatDate(lead.updated_at)}
                    </td>

                    {/* Nama Prospek */}
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-carbon-ink text-sm">
                        {lead.nama}
                      </span>
                    </td>

                    {/* Marketing PIC */}
                    <td className="px-5 py-3.5 text-slate font-medium whitespace-nowrap">
                      {lead.marketing?.nama ?? (
                        <span className="text-fog italic">Belum ada</span>
                      )}
                    </td>

                    {/* Blok Unit */}
                    <td className="px-5 py-3.5">
                      {trx ? (
                        <span className="inline-flex px-2 py-0.5 rounded bg-bone text-graphite text-[11px] font-mono font-semibold border border-mist">
                          {trx.unit.blok}
                        </span>
                      ) : (
                        <span className="text-fog">-</span>
                      )}
                    </td>

                    {/* Nominal ITJ */}
                    <td className="px-5 py-3.5 font-mono font-semibold text-deep-teal whitespace-nowrap">
                      {trx ? formatCurrency(trx.target_itj) : "-"}
                    </td>

                    {/* Metode Bayar */}
                    <td className="px-5 py-3.5">
                      {metode ? (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${metode.className}`}
                        >
                          {metode.label}
                        </span>
                      ) : (
                        <span className="text-fog">-</span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        {/* Terima */}
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleApprove(lead)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold
                            bg-emerald-50 text-emerald-700 border border-emerald-200
                            hover:bg-emerald-100 hover:border-emerald-300
                            active:bg-emerald-200
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-colors"
                        >
                          {isLoading && activeAction === "approve" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Terima
                        </button>

                        {/* Tolak */}
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => openRejectDialog(lead)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold
                            bg-rose-50 text-rose-600 border border-rose-200
                            hover:bg-rose-100 hover:border-rose-300
                            active:bg-rose-200
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-colors"
                        >
                          {isLoading && activeAction === "reject" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          Tolak
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Rejection Dialog (Overlay) ─── */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRejectTarget(null);
            }
          }}
        >
          <div className="bg-white rounded-lg border border-mist shadow-lg w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-mist">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                  <MessageSquareWarning className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-carbon-ink">
                    Tolak Pengajuan ITJ
                  </h3>
                  <p className="text-[11px] text-slate mt-0.5">
                    {rejectTarget.nama}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="p-1 rounded-md text-slate hover:text-graphite hover:bg-bone transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <label
                htmlFor="rejection-note"
                className="block text-xs font-semibold text-carbon-ink mb-1.5"
              >
                Catatan Penolakan <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="rejection-note"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Jelaskan alasan penolakan ITJ ini..."
                rows={3}
                className="w-full px-3 py-2 text-sm text-graphite bg-bone/50 border border-mist rounded-md
                  placeholder:text-fog
                  focus:outline-none focus:ring-2 focus:ring-prism-teal/30 focus:border-prism-teal
                  transition-colors resize-none"
              />
              <p className="text-[11px] text-slate mt-1">
                Catatan akan dicatat di log aktivitas lead.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-mist bg-bone/30">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                disabled={isPending}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate
                  border border-mist hover:bg-bone
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={isPending || !catatan.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold
                  bg-rose-600 text-white
                  hover:bg-rose-700 active:bg-rose-800
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors"
              >
                {isPending && activeAction === "reject" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
