"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  XCircle,
  History,
  Send,
  Loader2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import {
  ajukanKPR,
  updateStatusPengajuanKPR,
  tolakPengajuanKPR,
} from "@/actions/kpr.action";
import { ALLOWED_KPR_STATUS_TRANSITIONS } from "@/schemas/kpr.schema";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { StatusPengajuanKPR } from "@/generated/prisma";

export interface BankItem {
  id: number;
  nama: string;
  kode?: string | null;
  is_active: boolean;
}

export interface PengajuanKPRLogItem {
  id: number;
  status_sebelum: StatusPengajuanKPR | null;
  status_sesudah: StatusPengajuanKPR;
  actor?: { nama: string } | null;
  admin?: { nama: string } | null;
  catatan?: string | null;
  created_at: string | Date;
}

export interface PengajuanKPRItem {
  id: number;
  transaksi_id: number;
  bank_id: number;
  nomor_pengajuan: number;
  status: StatusPengajuanKPR;
  tanggal_ajukan: string | Date;
  tanggal_keputusan?: string | Date | null;
  alasan_penolakan?: string | null;
  catatan?: string | null;
  bank: {
    id: number;
    nama: string;
    kode?: string | null;
  };
  logs?: PengajuanKPRLogItem[];
}

interface KprSubmissionSectionProps {
  transaksiId: number;
  initialPengajuan: PengajuanKPRItem[];
  masterBanks: BankItem[];
  currentTahapDetail?: string;
  canEdit?: boolean;
  disabledNew?: boolean;
  disabledNewReason?: string;
  readOnlyActions?: boolean;
  hideHeader?: boolean;
}

const STATUS_LABEL: Record<StatusPengajuanKPR, string> = {
  DIAJUKAN: "Diajukan",
  WAWANCARA: "Wawancara",
  OTS: "OTS (Survey)",
  VERIFIKASI: "Verifikasi",
  SP3K: "SP3K Terbit",
  DITOLAK: "Ditolak",
  DIBATALKAN: "Dibatalkan",
};

const STATUS_BADGE_STYLE: Record<StatusPengajuanKPR, string> = {
  DIAJUKAN: "bg-blue-50 text-blue-700 border-blue-200",
  WAWANCARA: "bg-sky-50 text-sky-700 border-sky-200",
  OTS: "bg-indigo-50 text-indigo-700 border-indigo-200",
  VERIFIKASI: "bg-amber-50 text-amber-800 border-amber-200",
  SP3K: "bg-teal-50 text-teal-800 border-teal-200 font-bold",
  DITOLAK: "bg-rose-50 text-rose-700 border-rose-200",
  DIBATALKAN: "bg-slate-100 text-slate-600 border-slate-200",
};

const formatDate = (value: string | Date) => {
  const d = new Date(value);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value: string | Date) => {
  const d = new Date(value);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

// Stable key to track server data changes
const buildSubmissionKey = (items: PengajuanKPRItem[]) =>
  items
    .map(
      (item) =>
        `${item.id}:${item.status}:${item.logs?.length ?? 0}:${item.alasan_penolakan ?? ""}`
    )
    .join("|");

export function KprSubmissionSection({
  transaksiId,
  initialPengajuan,
  masterBanks,
  canEdit = true,
  disabledNew = false,
  disabledNewReason,
  readOnlyActions = false,
  hideHeader = false,
}: KprSubmissionSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [submissions, setSubmissions] =
    useState<PengajuanKPRItem[]>(initialPengajuan);

  // Sync state with server updates
  const serverKey = buildSubmissionKey(initialPengajuan);
  const [prevKey, setPrevKey] = useState(serverKey);
  if (prevKey !== serverKey) {
    setPrevKey(serverKey);
    setSubmissions(initialPengajuan);
  }

  // Expanded log accordions by submission ID
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});

  // Toggle past submissions list
  const [showPastList, setShowPastList] = useState(false);

  // Toggle new submission form when active submissions exist
  const [showAddForm, setShowAddForm] = useState(false);

  // Form pengajuan baru
  const [selectedBankId, setSelectedBankId] = useState<number | "">("");
  const [catatanBaru, setCatatanBaru] = useState("");
  const [bankError, setBankError] = useState<string | null>(null);

  // Form penolakan inline
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [alasanPenolakan, setAlasanPenolakan] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Dialog konfirmasi untuk status kritis (SP3K, DIBATALKAN)
  const [pendingStatus, setPendingStatus] = useState<{
    id: number;
    status: StatusPengajuanKPR;
    bankName: string;
    fromStatus: StatusPengajuanKPR;
  } | null>(null);

  const activeSubmissions = submissions.filter(
    (s) => s.status !== "DITOLAK" && s.status !== "DIBATALKAN"
  );
  const pastSubmissions = submissions.filter(
    (s) => s.status === "DITOLAK" || s.status === "DIBATALKAN"
  );
  const hasMultipleActive = activeSubmissions.length > 1;

  const toggleLogAccordion = (id: number) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const executeKprAction = (
    actionFn: () => Promise<{
      success: boolean;
      message?: string;
      error?: string;
      data?: unknown;
    }>,
    onSuccess?: (data: unknown) => void
  ) => {
    startTransition(async () => {
      try {
        const res = await actionFn();
        if (res.success) {
          if (res.message) toast.success(res.message);
          if (onSuccess) onSuccess(res.data);
          router.refresh();
        } else {
          toast.error(res.error || "Operasi pengajuan KPR gagal.");
        }
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Terjadi kesalahan sistem."
        );
      }
    });
  };

  const replaceSubmission = (id: number, updated: unknown) => {
    if (!updated) return;
    setSubmissions((prev) =>
      prev.map((item) =>
        item.id === id ? (updated as PengajuanKPRItem) : item
      )
    );
  };

  const handleAjukanBaru = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedBankId || typeof selectedBankId !== "number") {
      setBankError("Pilih bank penyalur KPR terlebih dahulu.");
      document.getElementById("kpr-bank-select")?.focus();
      return;
    }

    setBankError(null);

    executeKprAction(
      () =>
        ajukanKPR({
          transaksiId,
          bankId: selectedBankId,
          catatan: catatanBaru.trim() || null,
        }),
      (created) => {
        if (created) {
          setSubmissions((prev) => [created as PengajuanKPRItem, ...prev]);
        }
        setSelectedBankId("");
        setCatatanBaru("");
        setShowAddForm(false);
      }
    );
  };

  const handleRequestStatusChange = (
    submission: PengajuanKPRItem,
    nextStatus: StatusPengajuanKPR
  ) => {
    // Critical transitions require confirmation
    const isCritical =
      nextStatus === "SP3K" || nextStatus === "DIBATALKAN";

    if (isCritical) {
      setPendingStatus({
        id: submission.id,
        status: nextStatus,
        bankName: submission.bank.nama,
        fromStatus: submission.status,
      });
      return;
    }

    // Routine steps execute directly
    executeKprAction(
      () =>
        updateStatusPengajuanKPR({
          pengajuanId: submission.id,
          status: nextStatus,
        }),
      (updated) => {
        replaceSubmission(submission.id, updated);
      }
    );
  };

  const confirmUpdateStatus = () => {
    if (!pendingStatus) return;
    const { id, status } = pendingStatus;

    executeKprAction(
      () => updateStatusPengajuanKPR({ pengajuanId: id, status }),
      (updated) => {
        replaceSubmission(id, updated);
        setPendingStatus(null);
      }
    );
  };

  const handleTolak = (submissionId: number) => {
    if (alasanPenolakan.trim().length < 3) {
      setRejectError("Alasan penolakan wajib diisi, minimal 3 karakter.");
      document.getElementById(`kpr-reject-${submissionId}`)?.focus();
      return;
    }

    setRejectError(null);

    executeKprAction(
      () =>
        tolakPengajuanKPR({
          pengajuanId: submissionId,
          alasanPenolakan: alasanPenolakan.trim(),
        }),
      (updated) => {
        replaceSubmission(submissionId, updated);
        setRejectingId(null);
        setAlasanPenolakan("");
      }
    );
  };

  const closeRejectForm = () => {
    setRejectingId(null);
    setAlasanPenolakan("");
    setRejectError(null);
  };

  return (
    <div className="space-y-4">
      {/* ─── 1. HEADER RINGKASAN PENGAJUAN BANK ─── */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 ring-1 ring-teal-200/60 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Ringkasan Pengajuan Bank
              </h3>
              <p className="text-xs text-slate-500">
                Kelola status berkas dan persetujuan KPR per bank penyalur.
              </p>
            </div>
          </div>

          {pastSubmissions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPastList((v) => !v)}
              aria-expanded={showPastList}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span>
                {showPastList
                  ? "Sembunyikan Riwayat Lalu"
                  : `Riwayat Lalu (${pastSubmissions.length})`}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Multiple Active Submissions Parallel Notice */}
      {hasMultipleActive && (
        <div
          role="status"
          className="flex items-start sm:items-center gap-2.5 rounded-lg border border-teal-200/80 bg-teal-50/60 px-3.5 py-2.5 text-xs text-teal-900"
        >
          <Building2
            className="w-4 h-4 shrink-0 text-teal-700 mt-0.5 sm:mt-0"
            aria-hidden="true"
          />
          <div className="leading-relaxed">
            <span className="font-bold">
              {activeSubmissions.length} pengajuan bank aktif
            </span>{" "}
            berjalan secara paralel. Setiap bank diproses secara independen hingga SP3K terbit.
          </div>
        </div>
      )}

      {/* ─── 2. DAFTAR KARTU PENGAJUAN BANK AKTIF ─── */}
      {activeSubmissions.length > 0 && (
        <div className="space-y-3">
          {activeSubmissions.map((submission) => {
            const allowedNext =
              ALLOWED_KPR_STATUS_TRANSITIONS[submission.status] || [];
            const forwardOptions = allowedNext.filter(
              (st) => st !== "DITOLAK" && st !== "DIBATALKAN"
            );
            const canReject = allowedNext.includes("DITOLAK");
            const canCancel = allowedNext.includes("DIBATALKAN");
            const isRejectingThis = rejectingId === submission.id;
            const isExpanded = Boolean(expandedLogs[submission.id]);
            const logs = submission.logs || [];

            return (
              <article
                key={submission.id}
                className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs space-y-3.5"
              >
                {/* Header Card: Bank Name, Status Badge, Metadata */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                        {submission.bank.nama}
                      </h4>
                      {submission.bank.kode && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 font-semibold">
                          {submission.bank.kode}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        • Pengajuan #{submission.nomor_pengajuan}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>
                        Diajukan:{" "}
                        <strong className="text-slate-700 font-medium">
                          {formatDate(submission.tanggal_ajukan)}
                        </strong>
                      </span>
                      {submission.tanggal_keputusan && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>
                            Keputusan:{" "}
                            <strong className="text-slate-700 font-medium">
                              {formatDate(submission.tanggal_keputusan)}
                            </strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${
                        STATUS_BADGE_STYLE[submission.status]
                      }`}
                    >
                      {STATUS_LABEL[submission.status]}
                    </span>
                  </div>
                </div>

                {/* Catatan pengajuan jika ada */}
                {submission.catatan && (
                  <div className="rounded-lg bg-slate-50 border-l-2 border-slate-300 px-3 py-1.5 text-xs text-slate-600 italic">
                    Catatan: &quot;{submission.catatan}&quot;
                  </div>
                )}

                {/* Toggle Riwayat Status Accordion */}
                {logs.length > 0 && (
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => toggleLogAccordion(submission.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5 text-slate-400" />
                      <span>{logs.length} riwayat perubahan status</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>
                )}

                {/* Status Action Buttons Bar */}
                {!isRejectingThis && canEdit && !readOnlyActions && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-t border-slate-100 pt-3">
                    {/* Primary Forward Step */}
                    <div className="w-full sm:w-auto">
                      {forwardOptions.length === 0 ? (
                        submission.status === "SP3K" ? (
                          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                            <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                            <span>SP3K terbit. Lanjutkan ke proses Akad Kredit.</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Tidak ada tahap lanjutan.
                          </span>
                        )
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {forwardOptions.map((stage) => {
                            const isSuccessStep = stage === "SP3K";
                            return (
                              <Button
                                key={stage}
                                type="button"
                                size="sm"
                                disabled={isPending}
                                onClick={() =>
                                  handleRequestStatusChange(submission, stage)
                                }
                                className={`h-8.5 px-3.5 text-xs font-semibold rounded-lg shadow-2xs w-full sm:w-auto justify-center ${
                                  isSuccessStep
                                    ? "bg-teal-700 hover:bg-teal-800 text-white"
                                    : "bg-white border border-slate-300 text-slate-800 hover:bg-slate-50"
                                }`}
                              >
                                <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                                Lanjut ke {STATUS_LABEL[stage]}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Secondary & Negative Actions (Tolak / Batalkan) */}
                    <div className="flex items-center justify-end gap-1.5 self-end sm:self-auto">
                      {canReject && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => {
                            setRejectingId(submission.id);
                            setAlasanPenolakan("");
                            setRejectError(null);
                          }}
                          className="h-8 px-2.5 text-xs font-medium text-rose-700 hover:bg-rose-50 hover:text-rose-800 rounded-md"
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          Tolak
                        </Button>
                      )}
                      {canCancel && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            handleRequestStatusChange(submission, "DIBATALKAN")
                          }
                          className="h-8 px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-md"
                        >
                          <Ban className="mr-1 h-3.5 w-3.5" />
                          Batalkan
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Inline Rejection Form */}
                {isRejectingThis && (
                  <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                      <span>Catat Penolakan KPR dari {submission.bank.nama}</span>
                    </div>

                    <div>
                      <label
                        htmlFor={`kpr-reject-${submission.id}`}
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Alasan penolakan bank <span className="text-rose-600">*</span>
                      </label>
                      <textarea
                        id={`kpr-reject-${submission.id}`}
                        value={alasanPenolakan}
                        onChange={(event) => {
                          setAlasanPenolakan(event.target.value);
                          if (rejectError) setRejectError(null);
                        }}
                        rows={2}
                        aria-invalid={Boolean(rejectError)}
                        aria-describedby={
                          rejectError ? `kpr-reject-err-${submission.id}` : undefined
                        }
                        placeholder="Contoh: BI Checking kol 3, kemampuan angsuran kurang, kuota habis"
                        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
                      />
                      {rejectError && (
                        <p
                          id={`kpr-reject-err-${submission.id}`}
                          role="alert"
                          className="mt-1 text-xs font-medium text-rose-700"
                        >
                          {rejectError}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={closeRejectForm}
                        className="h-8 text-xs font-medium border-slate-300 text-slate-700"
                      >
                        Batal
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleTolak(submission.id)}
                        className="h-8 bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-2xs"
                      >
                        {isPending ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          "Simpan Penolakan"
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status Logs Accordion */}
                {isExpanded && logs.length > 0 && (
                  <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      <span>Riwayat Status ({submission.bank.nama})</span>
                    </div>
                    <ul className="divide-y divide-slate-200/60 max-h-48 overflow-y-auto pr-1 space-y-1">
                      {logs.map((log) => (
                        <li key={log.id} className="pt-2 pb-1 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-semibold text-slate-800">
                              {log.status_sebelum
                                ? STATUS_LABEL[log.status_sebelum]
                                : "Awal"}{" "}
                              →{" "}
                              <span className="text-teal-700 font-bold">
                                {STATUS_LABEL[log.status_sesudah]}
                              </span>
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {formatDateTime(log.created_at)}
                            </span>
                          </div>
                          {log.catatan && (
                            <p className="rounded bg-white p-1.5 text-[11px] text-slate-600 border border-slate-200/60 italic">
                              &quot;{log.catatan}&quot;
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400">
                            Petugas: {log.actor?.nama || log.admin?.nama || "Admin"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ─── 2b. TOMBOL & FORM PENGAJUAN BANK BARU ─── */}
      {canEdit && (
        <div className="pt-1">
          {activeSubmissions.length > 0 && !showAddForm ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending || disabledNew}
                onClick={() => {
                  setShowAddForm(true);
                  setBankError(null);
                }}
                className="h-8.5 px-3.5 text-xs font-semibold border-teal-300 text-teal-800 hover:bg-teal-50 shadow-2xs rounded-lg"
              >
                <Send className="mr-1.5 h-3.5 w-3.5 text-teal-700" />
                + Ajukan ke Bank Lain
              </Button>
            </div>
          ) : activeSubmissions.length === 0 || showAddForm ? (
            <form
              onSubmit={handleAjukanBaru}
              noValidate
              className="space-y-4 rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs"
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 tracking-tight">
                  <Send className="w-4 h-4 text-teal-700" aria-hidden="true" />
                  {activeSubmissions.length > 0
                    ? "Ajukan KPR ke Bank Tambahan (Paralel)"
                    : "Ajukan KPR ke Bank Penyalur"}
                </h4>
                {activeSubmissions.length === 0 ? (
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800 hidden sm:inline-block">
                    Belum ada pengajuan aktif
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedBankId("");
                      setCatatanBaru("");
                      setBankError(null);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
                  >
                    Batal
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="kpr-bank-select"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Bank Penyalur <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="kpr-bank-select"
                    value={selectedBankId}
                    onChange={(event) => {
                      setSelectedBankId(
                        event.target.value ? Number(event.target.value) : ""
                      );
                      if (bankError) setBankError(null);
                    }}
                    aria-invalid={Boolean(bankError)}
                    aria-describedby={bankError ? "kpr-bank-error" : undefined}
                    className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 ${
                      bankError
                        ? "border-rose-400 focus:ring-rose-400/20"
                        : "border-slate-200 focus:border-teal-600 focus:ring-teal-500/20"
                    }`}
                  >
                    <option value="">Pilih bank mitra...</option>
                    {masterBanks.map((bank) => {
                      const isAlreadyActive = activeSubmissions.some(
                        (s) => s.bank_id === bank.id
                      );
                      return (
                        <option
                          key={bank.id}
                          value={bank.id}
                          disabled={isAlreadyActive}
                        >
                          {bank.nama}
                          {bank.kode ? ` (${bank.kode})` : ""}
                          {isAlreadyActive ? " — (Sedang Aktif)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  {bankError && (
                    <p
                      id="kpr-bank-error"
                      role="alert"
                      className="mt-1 text-xs font-medium text-rose-700"
                    >
                      {bankError}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="kpr-catatan-baru"
                    className="mb-1.5 block text-xs font-semibold text-slate-800"
                  >
                    Catatan Pengajuan (Opsional)
                  </label>
                  <input
                    id="kpr-catatan-baru"
                    type="text"
                    value={catatanBaru}
                    onChange={(event) => setCatatanBaru(event.target.value)}
                    placeholder="Misal: berkas lengkap diserahkan ke AO Bank"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {disabledNew && disabledNewReason && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
                  <span className="font-semibold">{disabledNewReason}</span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2 border-t border-slate-100">
                {showAddForm && activeSubmissions.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddForm(false);
                      setSelectedBankId("");
                      setCatatanBaru("");
                      setBankError(null);
                    }}
                    className="h-9 text-xs font-medium border-slate-300 text-slate-700 w-full sm:w-auto"
                  >
                    Batal
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || disabledNew}
                  className="h-9 px-4 bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50 shadow-xs w-full sm:w-auto"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Mengajukan...
                    </>
                  ) : (
                    <>
                      <Send className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                      Ajukan ke Bank
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
      )}

      {/* ─── 3. RIWAYAT PENGAJUAN SEBELUMNYA (DITOLAK / DIBATALKAN) ─── */}
      {showPastList && pastSubmissions.length > 0 && (
        <div className="space-y-3 rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Riwayat Pengajuan Lalu ({pastSubmissions.length})</span>
            </h4>
            <span className="text-[11px] text-slate-400">
              Arsip keputusan perbankan
            </span>
          </div>

          <ul className="divide-y divide-slate-100">
            {pastSubmissions.map((item) => (
              <li key={item.id} className="py-3 space-y-1.5 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">
                      {item.bank.nama}
                    </span>
                    <span className="text-slate-400 text-xs">
                      (Pengajuan #{item.nomor_pengajuan})
                    </span>
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                        STATUS_BADGE_STYLE[item.status]
                      }`}
                    >
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-mono">
                    Diajukan: {formatDate(item.tanggal_ajukan)}
                  </span>
                </div>

                {item.alasan_penolakan && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-2.5 text-rose-900 text-xs">
                    <span className="font-bold">Alasan Penolakan: </span>
                    {item.alasan_penolakan}
                  </div>
                )}

                {item.logs && item.logs.length > 0 && (
                  <ul className="space-y-1 border-l-2 border-slate-200 pl-3 text-slate-600 text-[11px] pt-1">
                    {item.logs.map((log) => (
                      <li key={log.id}>
                        <span className="text-slate-400 font-mono">
                          {formatDateTime(log.created_at)}
                        </span>
                        :{" "}
                        <span className="font-semibold text-slate-800">
                          {STATUS_LABEL[log.status_sesudah]}
                        </span>
                        {log.catatan ? ` — "${log.catatan}"` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── 4. DIALOG KONFIRMASI STATUS KRITIS ─── */}
      <ConfirmDialog
        open={pendingStatus !== null}
        pending={isPending}
        title={
          pendingStatus
            ? `Konfirmasi Perubahan ke ${STATUS_LABEL[pendingStatus.status]}?`
            : ""
        }
        description={
          pendingStatus ? (
            <div className="space-y-2">
              <p>
                Status pengajuan KPR pada <strong>{pendingStatus.bankName}</strong>{" "}
                akan diubah dari{" "}
                <span className="font-semibold">
                  {STATUS_LABEL[pendingStatus.fromStatus]}
                </span>{" "}
                menjadi{" "}
                <span className="font-semibold text-teal-800">
                  {STATUS_LABEL[pendingStatus.status]}
                </span>
                .
              </p>
              {pendingStatus.status === "SP3K" && (
                <p className="text-xs text-slate-600">
                  Penerbitan SP3K menandakan bank telah menyetujui plafon kredit.
                  Pastikan dokumen SP3K fisik telah diterima dari bank.
                </p>
              )}
              {pendingStatus.status === "DIBATALKAN" && (
                <p className="text-xs text-rose-700 font-medium">
                  Pengajuan yang dibatalkan tidak dapat diproses kembali.
                </p>
              )}
            </div>
          ) : null
        }
        confirmLabel="Ya, Lanjutkan"
        tone={pendingStatus?.status === "DIBATALKAN" ? "danger" : "default"}
        onConfirm={confirmUpdateStatus}
        onCancel={() => setPendingStatus(null)}
      />
    </div>
  );
}
