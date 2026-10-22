"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Workflow,
  CheckCircle2,
  FileCheck,
  Loader2,
  Home,
  AlertTriangle,
  Ban,
  LockKeyhole,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { updateTransactionStatus } from "@/actions/transaksi.action";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  KprSubmissionSection,
  type PengajuanKPRItem,
  type BankItem,
} from "@/components/forms/kpr-submission-section";

import type {
  TahapDetail,
  TahapTransaksi,
  MetodeBayar,
  JenisDokumen,
  ItemBAST,
} from "@/generated/prisma";
import {
  type StageOption,
  getStagesByMetode,
  getFallbackStage,
} from "@/lib/transaksi/stage-map";
import { todayWIB } from "@/lib/date/wib";

// --------------------------------------------------
// Types
// --------------------------------------------------

interface DokumenItemDef {
  key: JenisDokumen;
  label: string;
  kategoriUnit?: "SUBSIDI" | "KOMERSIL" | "SEMUA";
}

interface DynamicActionPanelProps {
  transaksiId: number;
  leadId: number;
  metodeBayar: MetodeBayar;
  kategoriUnit: "SUBSIDI" | "KOMERSIL" | "KAVLING";
  currentStatus: string;
  currentTahapDetail?: string;
  initialNotaris: string | null;
  initialTglAkad: string | null;
  initialTglAjb?: string | null;
  initialTglBast?: string | null;
  initialLunasAt?: string | null;
  initialCatatan: string | null;
  initialVerifiedDocs?: string[];
  initialBastItems?: string[];
  initialPengajuanKpr?: PengajuanKPRItem[];
  masterBanks?: BankItem[];
  canEdit?: boolean;
}

type FieldKey = "catatan" | "notaris" | "tglAkad" | "tglAjb" | "tglLunas" | "tglBast";
type FormErrors = Partial<Record<FieldKey | "stage", string>>;
type StepState = "done" | "current" | "next" | "locked";

interface BastItemDef {
  key: ItemBAST;
  title: string;
  description: string;
}

const MASTER_BAST_ITEMS: BastItemDef[] = [
  {
    key: "PONDASI_STRUKTUR",
    title: "Pondasi & Struktur",
    description: "Sloof, kolom praktis, ring balok, dan kestabilan struktur bangunan.",
  },
  {
    key: "DINDING_PLESTER_CAT",
    title: "Dinding, Plesteran & Cat",
    description: "Plesteran aci halus, kerapihan cat, bebas retak rambut, dan tidak lembab.",
  },
  {
    key: "ATAP_PLAFON",
    title: "Rangka Atap & Plafon",
    description: "Kerapihan plafon gypsum/GRC, rangka baja ringan, dan bebas kebocoran.",
  },
  {
    key: "LANTAI_KERAMIK",
    title: "Lantai & Keramik",
    description: "Keramik terpasang rata, nat terisi penuh, tidak ada keramik kopong / pecah.",
  },
  {
    key: "KUSEN_PINTU_JENDELA",
    title: "Kusen, Pintu & Jendela",
    description: "Engsel, handle, kunci berfungsi normal, daun pintu/jendela menutup presisi.",
  },
  {
    key: "KELISTRIKAN",
    title: "Kelistrikan & Penerangan",
    description: "Semua stop kontak, saklar, fiting lampu menyala normal, MCB aman.",
  },
  {
    key: "SANITASI_AIR_POMPA",
    title: "Sanitasi, Kran & Pompa Air",
    description: "Kran mengalir lancar, pompa berfungsi, closet, floor drain normal.",
  },
  {
    key: "FASAD_KEBERSIHAN",
    title: "Fasad & Kebersihan Akhir",
    description: "Tampilan eksterior rapih, sisa puing material dibersihkan, halaman siap huni.",
  },
];

// Konstanta stabil: default `= []` di destructuring membuat referensi baru tiap render
const EMPTY_STRINGS: string[] = [];
const EMPTY_PENGAJUAN: PengajuanKPRItem[] = [];
const EMPTY_BANKS: BankItem[] = [];

// --------------------------------------------------
// Master checklist dokumen
// --------------------------------------------------

const BERKAS_ITEMS: DokumenItemDef[] = [
  { key: "KTP_SUAMI_ISTRI", label: "KTP suami dan istri", kategoriUnit: "SEMUA" },
  { key: "KARTU_KELUARGA", label: "Kartu Keluarga (KK)", kategoriUnit: "SEMUA" },
  { key: "NPWP", label: "NPWP pribadi", kategoriUnit: "SEMUA" },
  { key: "BUKU_NIKAH", label: "Buku nikah / akta cerai", kategoriUnit: "SEMUA" },
  { key: "SLIP_GAJI", label: "Slip gaji 3 bulan terakhir", kategoriUnit: "SEMUA" },
  { key: "SURAT_KET_KERJA", label: "Surat keterangan kerja", kategoriUnit: "SEMUA" },
  { key: "REKENING_KORAN", label: "Rekening koran 3–6 bulan", kategoriUnit: "SEMUA" },
  {
    key: "SURAT_KET_BELUM_PUNYA_RUMAH",
    label: "Surat keterangan belum memiliki rumah",
    kategoriUnit: "SUBSIDI",
  },
  { key: "SKU_WIRAUSAHA", label: "Surat keterangan usaha", kategoriUnit: "SEMUA" },
  { key: "LAPORAN_KEUANGAN", label: "Laporan keuangan usaha", kategoriUnit: "KOMERSIL" },
  { key: "LEGALITAS_LAINNYA", label: "Dokumen legalitas tambahan", kategoriUnit: "SEMUA" },
];

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const humanize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

/** Ambil tanggal kalender tersimpan tanpa konversi UTC. */
function toDateInput(value?: string | null): string {
  if (!value) return "";

  const datePart = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const inputClass = (invalid: boolean) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 ${invalid
    ? "border-red-400 focus:border-red-500 focus:ring-red-400/25"
    : "border-slate-300 focus:border-teal-600 focus:ring-teal-500/20"
  }`;

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold text-slate-700"
      >
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

// --------------------------------------------------
// Component
// --------------------------------------------------

export function DynamicActionPanel({
  transaksiId,
  leadId,
  metodeBayar,
  kategoriUnit,
  currentStatus,
  currentTahapDetail,
  initialNotaris,
  initialTglAkad,
  initialTglAjb,
  initialTglBast,
  initialLunasAt,
  initialCatatan,
  initialVerifiedDocs = EMPTY_STRINGS,
  initialBastItems = EMPTY_STRINGS,
  initialPengajuanKpr = EMPTY_PENGAJUAN,
  masterBanks = EMPTY_BANKS,
  canEdit = true,
}: DynamicActionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const stages = useMemo(() => getStagesByMetode(metodeBayar), [metodeBayar]);
  const mainStages = useMemo(
    () => stages.filter((stage) => stage.detail !== "BATAL"),
    [stages]
  );
  const hasCancelStage = stages.some((stage) => stage.detail === "BATAL");

  const { stage: currentStage, isUnknown: isUnknownDbStage } = useMemo(() => {
    if (currentTahapDetail) {
      const exact = stages.find((stage) => stage.detail === currentTahapDetail);
      if (exact) return { stage: exact, isUnknown: false };
    }
    return getFallbackStage(stages, currentStatus, metodeBayar);
  }, [stages, currentTahapDetail, currentStatus, metodeBayar]);

  const currentIndex = stages.findIndex(
    (stage) => stage.detail === currentStage.detail
  );
  const nextStage = currentIndex >= 0 ? stages[currentIndex + 1] : undefined;
  const nextMainStage =
    nextStage && nextStage.detail !== "BATAL" ? nextStage : undefined;

  const isTerminal =
    currentStage.detail === "BATAL" || currentStage.detail === "BAST";
  const isCompleted = currentStage.detail === "BAST";
  const isCancelled = currentStage.detail === "BATAL";

  // ---------- Local form state ----------
  const [selectedDetail, setSelectedDetail] = useState<TahapDetail>(
    currentStage.detail
  );
  const [namaNotaris, setNamaNotaris] = useState(initialNotaris ?? "");
  const [tglAkadKredit, setTglAkadKredit] = useState(() =>
    initialTglAkad ? toDateInput(initialTglAkad) : todayWIB()
  );
  const [tglAjb, setTglAjb] = useState(() =>
    initialTglAjb ? toDateInput(initialTglAjb) : todayWIB()
  );
  const [tglPelunasan, setTglPelunasan] = useState(() =>
    initialLunasAt ? toDateInput(initialLunasAt) : todayWIB()
  );
  const [tglBast, setTglBast] = useState(() =>
    initialTglBast ? toDateInput(initialTglBast) : todayWIB()
  );
  const [catatanAdmin, setCatatanAdmin] = useState(initialCatatan ?? "");
  const [selectedDocs, setSelectedDocs] = useState<string[]>(initialVerifiedDocs);
  const [selectedBastItems, setSelectedBastItems] = useState<string[]>(initialBastItems);
  const [lahanChecked, setLahanChecked] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Sinkronisasi dengan server berdasarkan ISI data, bukan referensi array.
  // Dengan begitu router.refresh() tidak mereset input yang belum disimpan
  // selama data tersimpan di server memang tidak berubah.
  const serverKey = JSON.stringify([
    currentStage.detail,
    initialNotaris,
    initialTglAkad,
    initialTglAjb,
    initialTglBast,
    initialLunasAt,
    initialCatatan,
    [...initialVerifiedDocs].sort(),
    [...initialBastItems].sort(),
  ]);
  const [prevServerKey, setPrevServerKey] = useState(serverKey);

  if (prevServerKey !== serverKey) {
    setPrevServerKey(serverKey);
    setSelectedDetail(currentStage.detail);
    setNamaNotaris(initialNotaris ?? "");
    setTglAkadKredit(initialTglAkad ? toDateInput(initialTglAkad) : todayWIB());
    setTglAjb(initialTglAjb ? toDateInput(initialTglAjb) : todayWIB());
    setTglPelunasan(initialLunasAt ? toDateInput(initialLunasAt) : todayWIB());
    setTglBast(initialTglBast ? toDateInput(initialTglBast) : todayWIB());
    setCatatanAdmin(initialCatatan ?? "");
    setSelectedDocs(initialVerifiedDocs);
    setSelectedBastItems(initialBastItems);
    setLahanChecked(true);
    setErrors({});
    setConfirmOpen(false);
  }

  // ---------- Derived ----------
  const selectedIndex = stages.findIndex((stage) => stage.detail === selectedDetail);
  const selectedStage =
    stages.find((stage) => stage.detail === selectedDetail) ?? currentStage;

  const isPemberkasan = [
    "PENGUMPULAN_DOKUMEN",
    "PEMBERKASAN_LEGALITAS",
    "PEMBERKASAN_PPJB",
  ].includes(selectedDetail);
  const isAkadKredit = selectedDetail === "AKAD_KREDIT";
  const isAjb = selectedDetail === "AJB";
  const isAkadOrAjb = isAkadKredit || isAjb;
  const isPelunasan = selectedDetail === "PELUNASAN";
  const isBast = selectedDetail === "BAST";
  const isBatal = selectedDetail === "BATAL";
  const isKpr = metodeBayar === "KPR";

  const isKavling = kategoriUnit === "KAVLING";

  const filteredDocs = BERKAS_ITEMS.filter(
    (item) => item.kategoriUnit === "SEMUA" || item.kategoriUnit === kategoriUnit
  );
  const verifiedDocCount = filteredDocs.filter((doc) =>
    selectedDocs.includes(doc.key)
  ).length;

  const verifiedBastCount = selectedBastItems.length;
  const isBastComplete = isKavling
    ? lahanChecked
    : verifiedBastCount >= MASTER_BAST_ITEMS.length;

  const isCurrentStage = selectedDetail === currentStage.detail;
  const isNextStage = selectedDetail === nextStage?.detail;
  const isRegression = currentIndex >= 0 && selectedIndex < currentIndex && !isBatal;
  const isAllowedSelection =
    !isTerminal && (isCurrentStage || isNextStage || isRegression || isBatal);
  const needsConfirm = isBatal || isBast || isRegression;

  const getStepState = (index: number): StepState => {
    if (index < currentIndex) return "done";
    if (index === currentIndex) return isCompleted ? "done" : "current";
    if (index === currentIndex + 1) return "next";
    return "locked";
  };

  // ---------- Handlers ----------
  const clearError = (key: FieldKey) =>
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const { [key]: _removed, ...rest } = previous;
      void _removed;
      return rest;
    });

  const selectStage = (detail: TahapDetail) => {
    setSelectedDetail(detail);
    setErrors({});
  };

  const toggleDoc = (key: string) => {
    setSelectedDocs((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key]
    );
  };

  const toggleBastItem = (key: string) => {
    setSelectedBastItems((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key]
    );
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    const note = catatanAdmin.trim();

    if (isTerminal) {
      next.stage = "Transaksi sudah selesai atau dibatalkan dan tidak bisa diubah.";
    } else if (!isAllowedSelection) {
      next.stage = "Tahap yang dipilih tidak tersedia dari progres saat ini.";
    }

    if ((isRegression || isBatal) && note.length < 5) {
      next.catatan = isBatal
        ? "Tulis alasan pembatalan, minimal 5 karakter."
        : "Tulis alasan memundurkan tahap, minimal 5 karakter.";
    }

    if (isAkadKredit && !tglAkadKredit) next.tglAkad = "Tanggal akad kredit wajib diisi.";
    if (isAjb && !tglAjb) next.tglAjb = "Tanggal AJB wajib diisi.";
    if (isAkadOrAjb && !namaNotaris.trim()) next.notaris = "Nama notaris/PPAT wajib diisi.";
    if (isPelunasan && !tglPelunasan) next.tglLunas = "Tanggal pelunasan wajib diisi.";

    if (isBast) {
      if (!tglBast) {
        next.tglBast = "Tanggal serah terima (BAST) wajib diisi.";
      }
      if (!isBastComplete) {
        next.stage = isKavling
          ? "Centang konfirmasi serah terima fisik lahan terlebih dahulu."
          : `Serah terima belum bisa dilakukan: ${MASTER_BAST_ITEMS.length - verifiedBastCount} dari ${MASTER_BAST_ITEMS.length} item checklist BAST belum dicentang.`;
      }
    }

    setErrors(next);

    const order: FieldKey[] = ["notaris", "tglAkad", "tglAjb", "tglLunas", "tglBast", "catatan"];
    const firstInvalid = order.find((key) => next[key]);
    if (firstInvalid) {
      requestAnimationFrame(() =>
        document.getElementById(`fld-${firstInvalid}`)?.focus()
      );
    }

    return Object.keys(next).length === 0;
  };

  const runSave = () => {
    startTransition(async () => {
      try {
        const result = await updateTransactionStatus({
          transaksiId,
          leadId,
          tahapDetail: selectedDetail,
          namaNotaris: isAkadOrAjb ? namaNotaris.trim() : null,
          tglAkad: isAkadKredit ? tglAkadKredit : null,
          tglAjb: isAjb ? tglAjb : null,
          lunasAt: isPelunasan ? tglPelunasan : null,
          tglBast: isBast ? tglBast || todayWIB() : null,
          catatanAdmin: catatanAdmin.trim() || null,
          documents: isPemberkasan ? selectedDocs : null,
          bastItems: isBast && !isKavling ? selectedBastItems : null,
        });

        if (!result.success) {
          setConfirmOpen(false);
          toast.error(result.error || "Gagal memperbarui transaksi.");
          return;
        }

        setConfirmOpen(false);
        toast.success(result.message || "Progres transaksi berhasil disimpan.");
        router.refresh();
      } catch (error: unknown) {
        setConfirmOpen(false);
        toast.error(
          error instanceof Error ? error.message : "Terjadi kesalahan sistem."
        );
      }
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    if (needsConfirm) {
      setConfirmOpen(true);
      return;
    }

    runSave();
  };

  // ---------- Dynamic copy ----------
  const submitLabel = isBatal
    ? "Batalkan transaksi"
    : isRegression
      ? `Mundur ke ${selectedStage.label}`
      : isNextStage
        ? `Lanjut ke ${selectedStage.label}`
        : "Simpan perubahan";

  const confirmCopy = isBatal
    ? {
      title: "Batalkan transaksi ini?",
      description:
        "Pembatalan bersifat final dan tidak bisa diubah lagi. Status unit akan ditentukan sistem berdasarkan kondisi transaksi.",
      label: "Ya, batalkan transaksi",
      tone: "danger" as const,
    }
    : isBast
      ? {
        title: "Selesaikan serah terima?",
        description:
          "Setelah BAST disimpan, transaksi dinyatakan selesai dan tidak bisa diubah lagi.",
        label: "Ya, selesaikan",
        tone: "default" as const,
      }
      : {
        title: `Mundurkan ke ${selectedStage.label}?`,
        description:
          "Progres transaksi akan kembali ke tahap tersebut. Alasan yang Anda tulis tercatat di riwayat audit.",
        label: "Ya, mundurkan tahap",
        tone: "default" as const,
      };

  const stepClass = (state: StepState, selected: boolean) => {
    const base =
      "flex min-h-14 w-full items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600";

    if (selected) return `${base} border-teal-700 bg-teal-700 text-white`;
    if (state === "current") return `${base} border-teal-600 bg-teal-50 text-teal-900`;
    if (state === "next") return `${base} border-teal-300 bg-white text-slate-800 hover:bg-teal-50`;
    if (state === "done") return `${base} border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100`;
    return `${base} cursor-not-allowed border-dashed border-slate-200 bg-white text-slate-500`;
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {!canEdit && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900">
          <LockKeyhole className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span>
            Mode Baca Saja: Hanya PIC Marketing penanggung jawab atau Admin yang dapat memperbarui tahapan transaksi ini.
          </span>
        </div>
      )}

      {/* Header: satu-satunya tempat "tahap saat ini" ditampilkan */}
      <header className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Workflow className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Progress transaksi</h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Skema {humanize(metodeBayar)} · Unit {humanize(kategoriUnit)}
            </p>
          </div>
        </div>

        <div className="sm:text-right">
          <p className="text-xs text-slate-600">Tahap saat ini</p>
          <p className="text-sm font-semibold text-slate-900">
            {currentStage.label}
          </p>
          <p className="text-xs text-slate-600">{humanize(currentStage.macro)}</p>
        </div>
      </header>

      <div className="space-y-5 p-5">
        {/* Banner status akhir */}
        {isCompleted && (
          <div className="space-y-4">
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-lg border border-teal-300 bg-teal-50 p-4"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden="true" />
              <div className="text-sm leading-6 text-teal-950">
                <p className="font-semibold">Transaksi selesai — serah terima (BAST)</p>
                <p className="text-teal-900">
                  Unit sudah diserahterimakan. Data transaksi ini final.
                </p>
              </div>
            </div>

            {/* Read-only BAST Checklist View */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Home className="h-4 w-4 text-teal-700" aria-hidden="true" />
                  Status Inspeksi & Serah Terima Unit
                </h4>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {isKavling ? "Lahan Terverifikasi" : `${initialBastItems.length}/${MASTER_BAST_ITEMS.length} Item Sesuai`}
                </span>
              </div>

              {isKavling ? (
                <p className="text-xs text-slate-600">
                  Unit kategori Kavling/Tanah telah selesai diserahterimakan kepada konsumen beserta pengecekan patok batas lahan.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {MASTER_BAST_ITEMS.map((item) => {
                    const isPassed = initialBastItems.includes(item.key);
                    return (
                      <div
                        key={item.key}
                        className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs ${
                          isPassed
                            ? "border-emerald-200 bg-emerald-50/40 text-emerald-950"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        <CheckCircle2
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                            isPassed ? "text-emerald-600" : "text-slate-400"
                          }`}
                        />
                        <div>
                          <p className="font-semibold">{item.title}</p>
                          <p className="text-[11px] opacity-75">{item.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {isCancelled && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-lg border border-red-300 bg-red-50 p-4"
          >
            <Ban className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
            <div className="text-sm leading-6 text-red-950">
              <p className="font-semibold">Transaksi dibatalkan</p>
              <p className="text-red-900">
                Transaksi ini final. Alasan pembatalan ada di riwayat audit.
              </p>
            </div>
          </div>
        )}

        {/* Peringatan tahap tidak dikenal */}
        {isUnknownDbStage && !isTerminal && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-4"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="text-sm leading-6 text-amber-950">
              <p className="font-semibold">Tahap di database perlu disesuaikan</p>
              <p className="text-amber-900">
                Nilai tersimpan <code>{currentTahapDetail || currentStatus}</code>{" "}
                tidak terdaftar pada skema {humanize(metodeBayar)}. Panel
                menampilkan <strong>{currentStage.label}</strong> sebagai
                acuan. Periksa lalu pilih tahap yang benar dan simpan.
              </p>
            </div>
          </div>
        )}

        {/* Stepper */}
        {!isCancelled && (
          <section aria-labelledby="stage-heading">
            <h3 id="stage-heading" className="text-sm font-semibold text-slate-900">
              Alur tahapan
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              {isTerminal
                ? "Semua tahap sudah selesai."
                : "Pilih tahap berikutnya untuk maju, atau tahap sebelumnya untuk revisi."}
            </p>

            <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {mainStages.map((stage, index) => {
                const state = getStepState(index);
                const clickable = !isTerminal && state !== "locked" && canEdit;
                const selected = selectedDetail === stage.detail;

                const title =
                  state === "locked"
                    ? "Selesaikan tahap sebelumnya terlebih dahulu"
                    : state === "done" && !isTerminal
                      ? "Kembali ke tahap ini (wajib menulis alasan)"
                      : undefined;

                return (
                  <li key={stage.detail}>
                    <button
                      type="button"
                      disabled={!clickable || isPending}
                      onClick={() => selectStage(stage.detail)}
                      aria-pressed={selected}
                      aria-current={state === "current" ? "step" : undefined}
                      title={title}
                      className={stepClass(state, selected)}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selected ? "bg-white/20" : "bg-black/5"
                          }`}
                      >
                        {state === "done" ? (
                          <Check className="h-3.5 w-3.5" aria-label="Selesai" />
                        ) : state === "locked" ? (
                          <LockKeyhole className="h-3 w-3" aria-label="Terkunci" />
                        ) : (
                          index + 1
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{stage.label}</span>
                        <span
                          className={`block text-xs ${selected ? "text-white/80" : "text-slate-600"
                            }`}
                        >
                          {humanize(stage.macro)}
                        </span>
                      </span>

                      {state === "current" && !selected && (
                        <span className="shrink-0 rounded-full bg-teal-700 px-2 py-0.5 text-xs font-semibold text-white">
                          Saat ini
                        </span>
                      )}
                      {state === "next" && !selected && (
                        <span className="shrink-0 rounded-full border border-teal-300 px-2 py-0.5 text-xs font-semibold text-teal-800">
                          Berikutnya
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>

            {isKpr && !isTerminal && (
              <p className="mt-2 text-xs text-slate-600">
                Status tiap bank dikelola pada kartu Pengajuan KPR di bawah.
                Tahap di atas adalah progres transaksi secara keseluruhan.
              </p>
            )}
          </section>
        )}

        {/* Aksi pembatalan dipisah dari alur normal */}
        {!isTerminal && hasCancelStage && canEdit && (
          <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-700">
              Transaksi tidak dilanjutkan oleh konsumen atau developer?
            </p>
            {isBatal ? (
              <button
                type="button"
                onClick={() => selectStage(currentStage.detail)}
                className="self-start text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900 sm:self-auto"
              >
                Tidak jadi membatalkan
              </button>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={() => selectStage("BATAL")}
                className="inline-flex items-center gap-1.5 self-start rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:self-auto"
              >
                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                Batalkan transaksi
              </button>
            )}
          </div>
        )}

        {/* Notice sesuai pilihan */}
        {isRegression && !isTerminal && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            <p className="text-sm leading-6 text-amber-900">
              <span className="font-semibold">
                Mundur ke {selectedStage.label}.
              </span>{" "}
              Tulis alasannya di catatan progress (misal bank menolak atau
              berkas perlu revisi).
            </p>
          </div>
        )}

        {isBatal && !isTerminal && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
            <p className="text-sm leading-6 text-red-900">
              <span className="font-semibold">Pembatalan bersifat final.</span>{" "}
              Tulis alasan yang jelas di catatan progress.
            </p>
          </div>
        )}

        {/* Pengajuan KPR (di luar <form> agar tidak ada form bersarang) */}
        {isKpr && !isCancelled && (
          <KprSubmissionSection
            transaksiId={transaksiId}
            initialPengajuan={initialPengajuanKpr}
            masterBanks={masterBanks}
            currentTahapDetail={currentStage.detail}
            canEdit={canEdit}
          />
        )}

        {/* Form progres */}
        {!isTerminal && (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Checklist dokumen */}
            {isPemberkasan && (
              <fieldset className="rounded-lg border border-slate-200 p-4">
                <legend className="px-1 text-sm font-semibold text-slate-900">
                  <span className="inline-flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-teal-700" aria-hidden="true" />
                    Dokumen pemberkasan
                  </span>
                </legend>

                <p className="mb-3 text-xs text-slate-600">
                  Centang dokumen yang sudah diterima dan diverifikasi.{" "}
                  <span className="font-semibold text-slate-800">
                    {verifiedDocCount} dari {filteredDocs.length} terverifikasi.
                  </span>
                </p>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {filteredDocs.map((document) => {
                    const checked = selectedDocs.includes(document.key);
                    const id = `doc-${document.key}`;

                    return (
                      <label
                        key={document.key}
                        htmlFor={id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${checked
                            ? "border-teal-300 bg-teal-50/60"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                      >
                        <input
                          id={id}
                          type="checkbox"
                          checked={checked}
                          disabled={!canEdit || isPending}
                          onChange={() => toggleDoc(document.key)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                        <span className="leading-5 text-slate-800">
                          {document.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {/* Akad kredit / AJB */}
            {isAkadOrAjb && (
              <fieldset className="rounded-lg border border-slate-200 p-4">
                <legend className="px-1 text-sm font-semibold text-slate-900">
                  {isAkadKredit ? "Data akad kredit" : "Data akta jual beli (AJB)"}
                </legend>

                <p className="mb-4 text-xs text-slate-600">
                  {isAkadKredit
                    ? "Akad kredit adalah closing penjualan resmi untuk KPR. Unit otomatis ditandai SOLD, pengajuan bank disetujui, dan tanggal closing tercatat."
                    : "AJB adalah closing penjualan resmi untuk Cash. Unit otomatis ditandai SOLD dan tanggal closing tercatat (pembayaran harus lunas 100%)."}
                </p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id="fld-notaris" label="Notaris / PPAT" required error={errors.notaris}>
                    <input
                      id="fld-notaris"
                      type="text"
                      value={namaNotaris}
                      disabled={!canEdit || isPending}
                      onChange={(event) => {
                        setNamaNotaris(event.target.value);
                        clearError("notaris");
                      }}
                      placeholder="Nama notaris / PPAT"
                      maxLength={150}
                      aria-invalid={Boolean(errors.notaris)}
                      aria-describedby={errors.notaris ? "fld-notaris-error" : undefined}
                      className={`${inputClass(Boolean(errors.notaris))} disabled:bg-slate-100 disabled:cursor-not-allowed`}
                    />
                  </Field>

                  {isAkadKredit ? (
                    <Field id="fld-tglAkad" label="Tanggal akad kredit" required error={errors.tglAkad}>
                      <input
                        id="fld-tglAkad"
                        type="date"
                        value={tglAkadKredit}
                        disabled={!canEdit || isPending}
                        onChange={(event) => {
                          setTglAkadKredit(event.target.value);
                          clearError("tglAkad");
                        }}
                        aria-invalid={Boolean(errors.tglAkad)}
                        aria-describedby={errors.tglAkad ? "fld-tglAkad-error" : undefined}
                        className={`${inputClass(Boolean(errors.tglAkad))} disabled:bg-slate-100 disabled:cursor-not-allowed`}
                      />
                    </Field>
                  ) : (
                    <Field id="fld-tglAjb" label="Tanggal AJB" required error={errors.tglAjb}>
                      <input
                        id="fld-tglAjb"
                        type="date"
                        value={tglAjb}
                        disabled={!canEdit || isPending}
                        onChange={(event) => {
                          setTglAjb(event.target.value);
                          clearError("tglAjb");
                        }}
                        aria-invalid={Boolean(errors.tglAjb)}
                        aria-describedby={errors.tglAjb ? "fld-tglAjb-error" : undefined}
                        className={`${inputClass(Boolean(errors.tglAjb))} disabled:bg-slate-100 disabled:cursor-not-allowed`}
                      />
                    </Field>
                  )}
                </div>
              </fieldset>
            )}

            {/* Pelunasan */}
            {isPelunasan && (
              <fieldset className="rounded-lg border border-slate-200 p-4">
                <legend className="px-1 text-sm font-semibold text-slate-900">
                  Konfirmasi pelunasan
                </legend>
                <p className="mb-3 text-xs text-slate-600">
                  Hanya bisa dicatat jika pembayaran konsumen sudah masuk 100%
                  dari harga deal.
                </p>
                <div className="max-w-sm">
                  <Field id="fld-tglLunas" label="Tanggal pelunasan" required error={errors.tglLunas}>
                    <input
                      id="fld-tglLunas"
                      type="date"
                      value={tglPelunasan}
                      disabled={!canEdit || isPending}
                      onChange={(event) => {
                        setTglPelunasan(event.target.value);
                        clearError("tglLunas");
                      }}
                      aria-invalid={Boolean(errors.tglLunas)}
                      aria-describedby={errors.tglLunas ? "fld-tglLunas-error" : undefined}
                      className={`${inputClass(Boolean(errors.tglLunas))} disabled:bg-slate-100 disabled:cursor-not-allowed`}
                    />
                  </Field>
                </div>
              </fieldset>
            )}

            {/* Verifikasi & Checklist BAST */}
            {isBast && (
              <fieldset className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
                <legend className="px-1 text-sm font-semibold text-slate-900">
                  <span className="inline-flex items-center gap-1.5">
                    <Home className="h-4 w-4 text-teal-700" aria-hidden="true" />
                    Serah Terima Bangunan & Lahan (BAST)
                  </span>
                </legend>

                {/* Input Tanggal BAST */}
                <div className="max-w-sm">
                  <Field id="fld-tglBast" label="Tanggal Serah Terima (BAST)" required error={errors.tglBast}>
                    <input
                      id="fld-tglBast"
                      type="date"
                      value={tglBast}
                      disabled={!canEdit || isPending}
                      onChange={(event) => {
                        setTglBast(event.target.value);
                        clearError("tglBast");
                      }}
                      aria-invalid={Boolean(errors.tglBast)}
                      aria-describedby={errors.tglBast ? "fld-tglBast-error" : undefined}
                      className={`${inputClass(Boolean(errors.tglBast))} disabled:bg-slate-100 disabled:cursor-not-allowed`}
                    />
                  </Field>
                </div>

                {/* KAVLING EXCEPTION */}
                {isKavling ? (
                  <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-teal-950">
                          Unit Kategori Kavling / Tanah
                        </h4>
                        <p className="text-xs text-teal-900 mt-0.5">
                          Unit kavling tidak memiliki struktur bangunan fisik. Pengecekan difokuskan pada patok batas lahan dan aksesibilitas.
                        </p>
                      </div>
                    </div>

                    <label
                      htmlFor="bast-kavling-check"
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-teal-300 bg-white p-3 text-sm transition-colors hover:bg-slate-50"
                    >
                      <input
                        id="bast-kavling-check"
                        type="checkbox"
                        checked={lahanChecked}
                        disabled={!canEdit || isPending}
                        onChange={(e) => setLahanChecked(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-800">
                          Konfirmasi Serah Terima Fisik Lahan
                        </span>
                        <span className="block text-xs text-slate-600">
                          Patok batas kavling telah diverifikasi dan siap diserahterimakan kepada konsumen.
                        </span>
                      </div>
                    </label>
                  </div>
                ) : (
                  /* PHYSICAL BUILDING CHECKLIST (SUBSIDI / KOMERSIL) */
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-600">
                          Centang seluruh 8 item fisik bangunan yang telah lolos inspeksi mutu.
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-bold ${
                          isBastComplete
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-amber-200 bg-amber-50 text-amber-900"
                        }`}
                      >
                        {verifiedBastCount}/{MASTER_BAST_ITEMS.length} Item Terverifikasi
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {MASTER_BAST_ITEMS.map((item) => {
                        const checked = selectedBastItems.includes(item.key);
                        const id = `bast-${item.key}`;

                        return (
                          <label
                            key={item.key}
                            htmlFor={id}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                              checked
                                ? "border-teal-300 bg-teal-50/60"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <input
                              id={id}
                              type="checkbox"
                              checked={checked}
                              disabled={!canEdit || isPending}
                              onChange={() => toggleBastItem(item.key)}
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="block font-medium text-slate-800">
                                {item.title}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {item.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    {!isBastComplete && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                        Tombol simpan serah terima akan aktif setelah seluruh 8 item fisik bangunan di atas dicentang (100% lolos).
                      </p>
                    )}
                  </div>
                )}
              </fieldset>
            )}

            {/* Catatan progress */}
            <Field
              id="fld-catatan"
              label={
                isBatal || isRegression
                  ? "Catatan progress (wajib, minimal 5 karakter)"
                  : "Catatan progress (opsional)"
              }
              error={errors.catatan}
            >
              <textarea
                id="fld-catatan"
                value={catatanAdmin}
                disabled={!canEdit || isPending}
                onChange={(event) => {
                  setCatatanAdmin(event.target.value);
                  clearError("catatan");
                }}
                placeholder={
                  !canEdit
                    ? "Tidak ada catatan progres baru"
                    : isBatal
                      ? "Tulis alasan pembatalan"
                      : isRegression
                        ? "Tulis alasan mundur, misal: bank menolak atau berkas kurang"
                        : "Catatan progres atau instruksi tindak lanjut"
                }
                rows={3}
                maxLength={3000}
                aria-invalid={Boolean(errors.catatan)}
                aria-describedby={errors.catatan ? "fld-catatan-error" : undefined}
                className={`${inputClass(Boolean(errors.catatan))} resize-y placeholder:text-slate-500 disabled:bg-slate-100 disabled:cursor-not-allowed`}
              />
              <p className="mt-1 text-right text-xs text-slate-600">
                {catatanAdmin.length}/3000
              </p>
            </Field>

            {errors.stage && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"
              >
                {errors.stage}
              </p>
            )}

            {/* Footer */}
            <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-600">
                {!canEdit
                  ? "Panel dalam mode hanya baca (Read-Only). Anda tidak memiliki otorisasi untuk mengubah transaksi ini."
                  : isBast && !isBastComplete
                    ? (isKavling
                        ? "Centang konfirmasi serah terima lahan untuk mengaktifkan tombol simpan."
                        : `Centang seluruh ${MASTER_BAST_ITEMS.length} item fisik BAST (${verifiedBastCount}/${MASTER_BAST_ITEMS.length}) untuk mengaktifkan tombol serah terima.`)
                    : "Setiap perubahan tercatat di riwayat audit transaksi dan aktivitas lead."}
              </p>

              {canEdit && (
                <Button
                  type="submit"
                  disabled={isPending || !isAllowedSelection || (isBast && !isBastComplete)}
                  className={
                    isBatal
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-teal-700 text-white hover:bg-teal-800"
                  }
                >
                  {isPending && !confirmOpen ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      {isBatal ? (
                        <Ban className="mr-2 h-4 w-4" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      )}
                      {submitLabel}
                    </>
                  )}
                </Button>
              )}
            </footer>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        pending={isPending}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.label}
        tone={confirmCopy.tone}
        onConfirm={runSave}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* nextMainStage dipakai agar tidak ada warning variabel tak terpakai bila stepper diubah */}
      <span className="sr-only">
        {nextMainStage ? `Tahap berikutnya: ${nextMainStage.label}` : ""}
      </span>
    </section>
  );
}