"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Workflow,
  CheckCircle2,
  Loader2,
  Home,
  AlertTriangle,
  Ban,
  LockKeyhole,
  Check,
  ChevronDown,
  UserCheck,
  Edit2,
  Undo2,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

import {
  updateTransactionStatus,
  verifyDokumenTransaksi,
  updateProfilPemberkasan,
} from "@/actions/transaksi.action";
import { updateInspeksiBAST } from "@/actions/bast.action";
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
  StatusInspeksi,
  StatusPernikahan,
  StatusPekerjaan,
} from "@/generated/prisma";
import {
  type StageOption,
  getStagesByMetode,
  getFallbackStage,
  MACRO_STAGE_LABELS,
} from "@/lib/transaksi/stage-map";
import {
  getRequiredDocuments,
  isDokumenTerverifikasi,
} from "@/lib/transaksi/document-rules";

// --------------------------------------------------
// Types & Defaults
// --------------------------------------------------

export interface InspeksiBastPropItem {
  item: ItemBAST;
  status: StatusInspeksi;
  catatan?: string | null;
}

interface ItemInspectionState {
  status: StatusInspeksi;
  catatan: string;
  isPerluPerbaikanOpen: boolean;
  error?: string;
}

export interface FinancialSummaryProp {
  hargaDeal: number;
  totalPaid: number;
  targetDp: number;
  dpPaid: number;
  sisaPelunasan: number;
  sisaDp: number;
  lastPaymentDate: string | null;
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
  initialInspeksiBast?: InspeksiBastPropItem[];
  initialPengajuanKpr?: PengajuanKPRItem[];
  masterBanks?: BankItem[];
  canEdit?: boolean;
  statusPernikahan?: StatusPernikahan | null;
  statusPekerjaan?: StatusPekerjaan | null;
  financialSummary?: FinancialSummaryProp;
}

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

const EMPTY_STRINGS: string[] = [];
const EMPTY_INSPEKSI: InspeksiBastPropItem[] = [];
const EMPTY_PENGAJUAN: PengajuanKPRItem[] = [];
const EMPTY_BANKS: BankItem[] = [];

function buildInitialInspeksiMap(
  initial: InspeksiBastPropItem[] = []
): Record<ItemBAST, ItemInspectionState> {
  const map = {} as Record<ItemBAST, ItemInspectionState>;
  MASTER_BAST_ITEMS.forEach((def) => {
    const found = initial.find((x) => x.item === def.key);
    const status = found?.status ?? "BELUM_DICEK";
    map[def.key] = {
      status,
      catatan: found?.catatan ?? "",
      isPerluPerbaikanOpen:
        status === "PERLU_PERBAIKAN" || status === "SELESAI_DIPERBAIKI",
    };
  });
  return map;
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const humanize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatRupiah = (val?: number | null): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(val ?? 0);

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

function getDefaultLunasDate(
  initialLunasAt?: string | null,
  lastPaymentDate?: string | null
): string {
  if (initialLunasAt) return toDateInput(initialLunasAt);
  if (lastPaymentDate) return toDateInput(lastPaymentDate);
  return toDateInput(new Date().toISOString());
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
  initialInspeksiBast = EMPTY_INSPEKSI,
  initialPengajuanKpr = EMPTY_PENGAJUAN,
  masterBanks = EMPTY_BANKS,
  canEdit = true,
  statusPernikahan: initialStatusPernikahan,
  statusPekerjaan: initialStatusPekerjaan,
  financialSummary,
}: DynamicActionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ---------- Stages Map ----------
  const stages = useMemo(() => getStagesByMetode(metodeBayar), [metodeBayar]);
  const mainStages = useMemo(
    () => stages.filter((stage) => stage.detail !== "BATAL"),
    [stages]
  );

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

  const isTerminal =
    currentStage.detail === "BATAL" || currentStage.detail === "BAST";
  const isCompleted = currentStage.detail === "BAST";
  const isCancelled = currentStage.detail === "BATAL";
  const isKpr = metodeBayar === "KPR";
  const isKavling = kategoriUnit === "KAVLING";

  // Macro stages de-duplicated in order
  const macroSteps = useMemo(() => {
    const seen = new Set<TahapTransaksi>();
    const steps: {
      macro: TahapTransaksi;
      label: string;
      microStages: StageOption[];
    }[] = [];
    for (const s of mainStages) {
      if (!seen.has(s.macro)) {
        seen.add(s.macro);
        steps.push({
          macro: s.macro,
          label: MACRO_STAGE_LABELS[s.macro] || humanize(s.macro),
          microStages: mainStages.filter((m) => m.macro === s.macro),
        });
      }
    }
    return steps;
  }, [mainStages]);

  const currentMacroIndex = macroSteps.findIndex(
    (s) => s.macro === currentStage.macro
  );

  // ---------- State: Profile Konsumen ----------
  const [statusPernikahan, setStatusPernikahan] = useState<StatusPernikahan | null>(
    initialStatusPernikahan ?? null
  );
  const [statusPekerjaan, setStatusPekerjaan] = useState<StatusPekerjaan | null>(
    initialStatusPekerjaan ?? null
  );
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileFormPernikahan, setProfileFormPernikahan] = useState<StatusPernikahan | "">(
    initialStatusPernikahan ?? ""
  );
  const [profileFormPekerjaan, setProfileFormPekerjaan] = useState<StatusPekerjaan | "">(
    initialStatusPekerjaan ?? ""
  );

  // Default lunas date helper
  const lastPaymentDate = financialSummary?.lastPaymentDate ?? null;
  const defaultLunasDate = useMemo(
    () => getDefaultLunasDate(initialLunasAt, lastPaymentDate),
    [initialLunasAt, lastPaymentDate]
  );

  // ---------- State: Form Data ----------
  const [namaNotaris, setNamaNotaris] = useState(initialNotaris ?? "");
  const [tglAkad, setTglAkad] = useState(() =>
    initialTglAkad ? toDateInput(initialTglAkad) : (initialTglAjb ? toDateInput(initialTglAjb) : "")
  );
  const [tglPelunasan, setTglPelunasan] = useState(() => defaultLunasDate);
  const [tglBast, setTglBast] = useState(() =>
    initialTglBast ? toDateInput(initialTglBast) : ""
  );
  const [catatanAdmin, setCatatanAdmin] = useState(initialCatatan ?? "");
  const [verifiedDocs, setVerifiedDocs] = useState<string[]>(initialVerifiedDocs);
  const [inspeksiMap, setInspeksiMap] = useState<Record<ItemBAST, ItemInspectionState>>(() =>
    buildInitialInspeksiMap(initialInspeksiBast)
  );
  const [savingItems, setSavingItems] = useState<Partial<Record<ItemBAST, boolean>>>({});
  const [lahanChecked, setLahanChecked] = useState(false); // default false for Kavling BAST

  // ---------- State: Opsi Lainnya (Mundur / Batal) ----------
  const [showOtherOptions, setShowOtherOptions] = useState(false);
  const [selectedRegressionDetail, setSelectedRegressionDetail] = useState<TahapDetail | "">("");
  const [catatanMundur, setCatatanMundur] = useState("");
  const [catatanBatal, setCatatanBatal] = useState("");

  // ---------- State: Confirmation Dialog ----------
  const [pendingConfirm, setPendingConfirm] = useState<{
    action: () => void;
    title: string;
    description: React.ReactNode;
    confirmLabel: string;
    tone?: "default" | "danger";
  } | null>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Sync state if server data changes
  const serverKey = JSON.stringify([
    currentStage.detail,
    initialStatusPernikahan,
    initialStatusPekerjaan,
    initialNotaris,
    initialTglAkad,
    initialTglAjb,
    initialTglBast,
    initialLunasAt,
    lastPaymentDate,
    initialCatatan,
    [...initialVerifiedDocs].sort(),
    initialInspeksiBast
      .map((b) => `${b.item}:${b.status}:${b.catatan ?? ""}`)
      .sort(),
  ]);
  const [prevServerKey, setPrevServerKey] = useState(serverKey);

  if (prevServerKey !== serverKey) {
    setPrevServerKey(serverKey);
    setStatusPernikahan(initialStatusPernikahan ?? null);
    setStatusPekerjaan(initialStatusPekerjaan ?? null);
    setNamaNotaris(initialNotaris ?? "");
    setTglAkad(initialTglAkad ? toDateInput(initialTglAkad) : (initialTglAjb ? toDateInput(initialTglAjb) : ""));
    setTglPelunasan(defaultLunasDate);
    setTglBast(initialTglBast ? toDateInput(initialTglBast) : "");
    setCatatanAdmin(initialCatatan ?? "");
    setVerifiedDocs(initialVerifiedDocs);
    setInspeksiMap(buildInitialInspeksiMap(initialInspeksiBast));
    setSavingItems({});
    setLahanChecked(false);
  }

  // Active KPR Pengajuan
  const activePengajuan = useMemo(
    () => initialPengajuanKpr.find((p) => p.status !== "DITOLAK" && p.status !== "DIBATALKAN"),
    [initialPengajuanKpr]
  );

  // ---------- Rule-based Documents Calculation ----------
  const ruleResult = useMemo(() => {
    return getRequiredDocuments({
      metode: metodeBayar,
      kategori: kategoriUnit,
      statusPernikahan,
      statusPekerjaan,
    });
  }, [metodeBayar, kategoriUnit, statusPernikahan, statusPekerjaan]);

  const isProfileComplete = ruleResult.isProfileComplete;
  const ruleDocs = ruleResult.documents;

  const requiredDocs = useMemo(() => ruleDocs.filter((d) => d.required), [ruleDocs]);
  const blockingRequiredDocs = useMemo(
    () => ruleDocs.filter((d) => d.required && !d.bisaMenyusul),
    [ruleDocs]
  );
  const verifiedRequiredCount = useMemo(
    () => requiredDocs.filter((d) => isDokumenTerverifikasi(d.key, verifiedDocs)).length,
    [requiredDocs, verifiedDocs]
  );
  const verifiedBlockingCount = useMemo(
    () => blockingRequiredDocs.filter((d) => isDokumenTerverifikasi(d.key, verifiedDocs)).length,
    [blockingRequiredDocs, verifiedDocs]
  );
  const allRequiredVerified = isProfileComplete && verifiedBlockingCount >= blockingRequiredDocs.length;

  const groupedDocs = useMemo(() => {
    const groups: { name: string; items: typeof ruleDocs }[] = [];
    ruleDocs.forEach((doc) => {
      const gName = doc.group || "Lainnya";
      let existing = groups.find((g) => g.name === gName);
      if (!existing) {
        existing = { name: gName, items: [] };
        groups.push(existing);
      }
      existing.items.push(doc);
    });
    return groups;
  }, [ruleDocs]);

  // ---------- Stage Identifiers ----------
  const isPemberkasan = currentStage.macro === "PEMBERKASAN";
  const isKprMicroStage = isKpr && ["WAWANCARA", "OTS", "VERIFIKASI"].includes(currentStage.detail);
  const isKprSp3k = isKpr && currentStage.detail === "SP3K";
  const isAkadStage = currentStage.detail === "AKAD_KREDIT" || currentStage.detail === "AJB";

  // BAST completeness check
  const okCount = useMemo(() => {
    return MASTER_BAST_ITEMS.filter((item) => {
      const s = inspeksiMap[item.key]?.status;
      return s === "SESUAI" || s === "SELESAI_DIPERBAIKI";
    }).length;
  }, [inspeksiMap]);

  const perluPerbaikanCount = useMemo(() => {
    return MASTER_BAST_ITEMS.filter((item) => {
      const s = inspeksiMap[item.key]?.status;
      return s === "PERLU_PERBAIKAN";
    }).length;
  }, [inspeksiMap]);

  const belumDicekCount = MASTER_BAST_ITEMS.length - okCount - perluPerbaikanCount;

  const isSavingAnyItem = useMemo(() => {
    return Object.values(savingItems).some(Boolean);
  }, [savingItems]);

  const isBastFormComplete = isKavling
    ? lahanChecked
    : okCount === MASTER_BAST_ITEMS.length;

  // ---------- Handlers: Document Toggle (Optimistic) ----------
  const handleToggleDoc = async (docKey: JenisDokumen, currentChecked: boolean) => {
    if (!canEdit || isPending) return;
    const newVerified = !currentChecked;

    // Optimistic UI update
    setVerifiedDocs((prev) =>
      newVerified ? [...prev, docKey] : prev.filter((k) => k !== docKey)
    );

    try {
      const res = await verifyDokumenTransaksi({
        transaksiId,
        jenis: docKey,
        status: newVerified ? "TERVERIFIKASI" : "BELUM_DIUNGGAH",
        verified: newVerified,
      });

      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        // Rollback
        setVerifiedDocs((prev) =>
          currentChecked ? [...prev, docKey] : prev.filter((k) => k !== docKey)
        );
        toast.error(res.error || "Gagal memperbarui verifikasi dokumen.");
      }
    } catch (err: unknown) {
      // Rollback
      setVerifiedDocs((prev) =>
        currentChecked ? [...prev, docKey] : prev.filter((k) => k !== docKey)
      );
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
    }
  };

  // ---------- Handlers: Update Profil Konsumen ----------
  const handleSaveProfile = () => {
    if (isKpr && (!profileFormPernikahan || !profileFormPekerjaan)) {
      toast.error("Pilih status pernikahan dan status pekerjaan konsumen untuk skema KPR.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateProfilPemberkasan({
          transaksiId,
          statusPernikahan: (profileFormPernikahan as StatusPernikahan) || null,
          statusPekerjaan: (profileFormPekerjaan as StatusPekerjaan) || null,
        });

        if (res.success) {
          setStatusPernikahan((profileFormPernikahan as StatusPernikahan) || null);
          setStatusPekerjaan((profileFormPekerjaan as StatusPekerjaan) || null);
          setProfileDialogOpen(false);
          toast.success(res.message);
          router.refresh();
        } else {
          toast.error(res.error || "Gagal memperbarui profil konsumen.");
        }
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
      }
    });
  };

  // ---------- Handlers: BAST Inspection Items ----------
  const handleMarkSesuai = async (key: ItemBAST) => {
    if (!canEdit || isPending || savingItems[key]) return;

    const prevState = inspeksiMap[key];
    // Optimistic UI update
    setInspeksiMap((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        status: "SESUAI",
        isPerluPerbaikanOpen: false,
        error: undefined,
      },
    }));
    setSavingItems((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await updateInspeksiBAST({
        transaksiId,
        itemId: key,
        newStatus: "SESUAI",
        note: prevState?.catatan?.trim() || null,
      });

      if (!res.success) {
        // Rollback
        setInspeksiMap((prev) => ({ ...prev, [key]: prevState }));
        toast.error(res.error || "Gagal memperbarui status inspeksi.");
      } else {
        toast.success(res.message || "Item inspeksi ditandai Sesuai.");
      }
    } catch (err: unknown) {
      // Rollback
      setInspeksiMap((prev) => ({ ...prev, [key]: prevState }));
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
      toast.error(msg);
    } finally {
      setSavingItems((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleOpenPerluPerbaikan = (key: ItemBAST) => {
    if (!canEdit || isPending || savingItems[key]) return;
    setInspeksiMap((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        isPerluPerbaikanOpen: true,
        error: undefined,
      },
    }));
    setTimeout(() => {
      document.getElementById(`bast-catatan-${key}`)?.focus();
    }, 50);
  };

  const handleCatatanChange = (key: ItemBAST, val: string) => {
    setInspeksiMap((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        catatan: val,
        error: prev[key]?.error && val.trim().length >= 3 ? undefined : prev[key]?.error,
      },
    }));
  };

  const handleSavePerluPerbaikan = async (key: ItemBAST) => {
    if (!canEdit || isPending || savingItems[key]) return;

    const currentItem = inspeksiMap[key];
    const cleanNote = currentItem.catatan.trim();
    if (cleanNote.length < 3) {
      setInspeksiMap((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          error: "Catatan perbaikan wajib diisi minimal 3 karakter.",
        },
      }));
      document.getElementById(`bast-catatan-${key}`)?.focus();
      return;
    }

    const prevState = currentItem;
    // Optimistic UI update
    setInspeksiMap((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        status: "PERLU_PERBAIKAN",
        error: undefined,
      },
    }));
    setSavingItems((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await updateInspeksiBAST({
        transaksiId,
        itemId: key,
        newStatus: "PERLU_PERBAIKAN",
        note: cleanNote,
      });

      if (!res.success) {
        // Rollback
        setInspeksiMap((prev) => ({ ...prev, [key]: prevState }));
        toast.error(res.error || "Gagal menyimpan catatan perbaikan.");
      } else {
        toast.success(res.message || "Status perlu perbaikan dan catatan berhasil disimpan.");
      }
    } catch (err: unknown) {
      setInspeksiMap((prev) => ({ ...prev, [key]: prevState }));
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
      toast.error(msg);
    } finally {
      setSavingItems((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleMarkSudahDiperbaiki = async (key: ItemBAST) => {
    if (!canEdit || isPending || savingItems[key]) return;

    const currentItem = inspeksiMap[key];
    const cleanNote = currentItem.catatan.trim();
    const prevState = currentItem;

    // Optimistic UI update
    setInspeksiMap((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        status: "SELESAI_DIPERBAIKI",
        error: undefined,
      },
    }));
    setSavingItems((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await updateInspeksiBAST({
        transaksiId,
        itemId: key,
        newStatus: "SELESAI_DIPERBAIKI",
        note: cleanNote || null,
      });

      if (!res.success) {
        // Rollback
        setInspeksiMap((prev) => ({ ...prev, [key]: prevState }));
        toast.error(res.error || "Gagal memperbarui status perbaikan.");
      } else {
        toast.success(res.message || "Item inspeksi ditandai sudah selesai diperbaiki.");
      }
    } catch (err: unknown) {
      setInspeksiMap((prev) => ({ ...prev, [key]: prevState }));
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
      toast.error(msg);
    } finally {
      setSavingItems((prev) => ({ ...prev, [key]: false }));
    }
  };

  // ---------- Handlers: Advance Stage ----------
  const executeAdvance = (targetDetail: TahapDetail) => {
    startTransition(async () => {
      try {
        const isTargetAjb = targetDetail === "AJB";
        const isTargetPelunasan = targetDetail === "PELUNASAN";
        const isTargetBast = targetDetail === "BAST";

        const result = await updateTransactionStatus({
          transaksiId,
          leadId,
          tahapDetail: targetDetail,
          namaNotaris: isAkadStage || isKprSp3k || isTargetAjb ? namaNotaris.trim() : null,
          tglAkad: (isAkadStage || isKprSp3k || isTargetAjb) && tglAkad ? tglAkad : null,
          tglAjb: isTargetAjb && tglAkad ? tglAkad : null,
          lunasAt: isTargetPelunasan || currentStage.detail === "PELUNASAN" ? (tglPelunasan || null) : null,
          tglBast: isTargetBast ? (tglBast || null) : null,
          lahanConfirmed: isKavling && isTargetBast ? lahanChecked : null,
          catatanAdmin: catatanAdmin.trim() || null,
        });

        if (!result.success) {
          setPendingConfirm(null);
          toast.error(result.error || "Gagal memperbarui transaksi.");
          return;
        }

        setPendingConfirm(null);
        toast.success(result.message || "Progres transaksi berhasil disimpan.");
        router.refresh();
      } catch (err: unknown) {
        setPendingConfirm(null);
        toast.error(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
      }
    });
  };

  // Validate and submit for primary action
  const handlePrimarySubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!nextStage) return;

    const errors: Record<string, string> = {};

    // Validation for KPR SP3K -> AKAD_KREDIT
    if (isKprSp3k) {
      if (!namaNotaris.trim()) errors.notaris = "Nama notaris/PPAT wajib diisi.";
      if (!tglAkad) errors.tglAkad = "Tanggal akad kredit wajib diisi.";
    }

    // Validation for Cash MENUNGGU_PELUNASAN -> PELUNASAN (Cash Keras)
    if (currentStage.detail === "MENUNGGU_PELUNASAN") {
      if ((financialSummary?.sisaPelunasan ?? 0) > 0) {
        errors.pelunasan = `Sisa tagihan ${formatRupiah(financialSummary?.sisaPelunasan)} belum lunas. Catat pembayaran di riwayat pembayaran terlebih dahulu.`;
      }
      if (!tglPelunasan) {
        errors.tglPelunasan = "Tanggal pelunasan wajib diisi.";
      }
    }

    // Validation for Cash PEMBAYARAN_DP -> CICILAN_BERJALAN (Cash Tempo)
    if (currentStage.detail === "PEMBAYARAN_DP") {
      if ((financialSummary?.sisaDp ?? 0) > 0) {
        errors.dp = `Pembayaran DP belum memenuhi target. Kurang ${formatRupiah(financialSummary?.sisaDp)}. Catat pembayaran DP terlebih dahulu.`;
      }
    }

    // Validation for Cash CICILAN_BERJALAN -> PELUNASAN (Cash Tempo)
    if (currentStage.detail === "CICILAN_BERJALAN") {
      if ((financialSummary?.sisaPelunasan ?? 0) > 0) {
        errors.pelunasan = `Sisa tagihan ${formatRupiah(financialSummary?.sisaPelunasan)} belum lunas. Catat pembayaran di riwayat pembayaran terlebih dahulu.`;
      }
      if (!tglPelunasan) {
        errors.tglPelunasan = "Tanggal pelunasan wajib diisi.";
      }
    }

    // Validation for Cash PELUNASAN -> AJB (Persiapan Akad)
    if (currentStage.detail === "PELUNASAN") {
      if (!namaNotaris.trim()) errors.notaris = "Nama notaris/PPAT wajib diisi.";
      if (!tglAkad) errors.tglAkad = "Tanggal pelaksanaan akad (AJB) wajib diisi.";
    }

    // Validation for Akad -> BAST
    if (nextStage.detail === "BAST") {
      if (!tglBast) errors.tglBast = "Tanggal serah terima (BAST) wajib diisi.";
      if (!isBastFormComplete) {
        if (isKavling) {
          errors.bast = "Centang konfirmasi serah terima fisik lahan terlebih dahulu.";
        } else {
          const parts: string[] = [];
          if (perluPerbaikanCount > 0) {
            parts.push(`${perluPerbaikanCount} item masih perlu perbaikan`);
          }
          if (belumDicekCount > 0) {
            parts.push(`${belumDicekCount} item belum diperiksa`);
          }
          errors.bast = `Inspeksi BAST belum tuntas: ${parts.join(" dan ")}. Seluruh ${MASTER_BAST_ITEMS.length} item wajib berstatus Sesuai atau Selesai Diperbaiki.`;
        }
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      if (errors.pelunasan || errors.dp) {
        toast.error(errors.pelunasan || errors.dp);
        return;
      }
      if (errors.tglPelunasan) {
        document.getElementById("fld-tglPelunasan")?.focus();
        return;
      }
      if (errors.notaris) {
        document.getElementById("fld-notaris")?.focus();
        return;
      }
      if (errors.tglAkad) {
        document.getElementById("fld-tglAkad")?.focus();
        return;
      }
      if (errors.tglBast) {
        document.getElementById("fld-tglBast")?.focus();
        return;
      }
      if (errors.bast) {
        if (isKavling) {
          document.getElementById("bast-kavling-check")?.focus();
        } else {
          const firstIncomplete = MASTER_BAST_ITEMS.find((item) => {
            const s = inspeksiMap[item.key]?.status;
            return s !== "SESUAI" && s !== "SELESAI_DIPERBAIKI";
          });
          if (firstIncomplete) {
            const el =
              document.getElementById(`bast-catatan-${firstIncomplete.key}`) ||
              document.getElementById(`btn-sesuai-${firstIncomplete.key}`) ||
              document.getElementById(`bast-item-${firstIncomplete.key}`);
            el?.focus();
          }
        }
        return;
      }
      const firstKey = Object.keys(errors)[0];
      document.getElementById(`fld-${firstKey}`)?.focus();
      return;
    }

    // Confirm dialog for critical next stage (Akad or BAST)
    if (nextStage.detail === "BAST") {
      setPendingConfirm({
        action: () => executeAdvance(nextStage.detail),
        title: "Selesaikan Serah Terima (BAST)?",
        description: (
          <p>
            Setelah BAST disimpan, transaksi dinyatakan <strong>SELESAI</strong> dan tidak dapat diubah lagi. Pastikan serah terima fisik unit telah dilakukan.
          </p>
        ),
        confirmLabel: "Ya, Selesaikan BAST",
        tone: "default",
      });
      return;
    }

    executeAdvance(nextStage.detail);
  };

  // ---------- Handlers: Regression (Mundur Tahap) ----------
  const availableRegressionStages = useMemo(() => {
    if (currentIndex <= 0) return [];
    // Only return stages prior to currentIndex that are allowed
    return stages.slice(0, currentIndex).filter((s) => {
      // Direct move into WAWANCARA, OTS, VERIFIKASI, SP3K via updateTransactionStatus is not allowed
      // except regression from AKAD_KREDIT to SP3K
      if (isKpr) {
        if (["WAWANCARA", "OTS", "VERIFIKASI"].includes(s.detail)) return false;
        if (s.detail === "SP3K" && currentStage.detail !== "AKAD_KREDIT") return false;
      }
      return true;
    });
  }, [stages, currentIndex, isKpr, currentStage.detail]);

  const handleRegressionSubmit = () => {
    if (!selectedRegressionDetail) {
      toast.error("Pilih tahap tujuan mundur terlebih dahulu.");
      return;
    }
    if (catatanMundur.trim().length < 5) {
      toast.error("Alasan memundurkan tahap wajib diisi, minimal 5 karakter.");
      return;
    }

    const targetStageObj = stages.find((s) => s.detail === selectedRegressionDetail);
    setPendingConfirm({
      action: () => {
        startTransition(async () => {
          try {
            const res = await updateTransactionStatus({
              transaksiId,
              leadId,
              tahapDetail: selectedRegressionDetail,
              catatanAdmin: catatanMundur.trim(),
            });

            if (!res.success) {
              setPendingConfirm(null);
              toast.error(res.error || "Gagal memundurkan tahap.");
              return;
            }

            setPendingConfirm(null);
            setShowOtherOptions(false);
            setCatatanMundur("");
            toast.success(res.message || "Tahap transaksi berhasil dimundurkan.");
            router.refresh();
          } catch (err: unknown) {
            setPendingConfirm(null);
            toast.error(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
          }
        });
      },
      title: `Konfirmasi Mundur ke ${targetStageObj?.label}?`,
      description: (
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            Progres transaksi akan dikembalikan ke tahap{" "}
            <strong>{targetStageObj?.label}</strong>.
          </p>
          <p className="rounded bg-slate-100 p-2 text-xs italic text-slate-600">
            &quot;{catatanMundur.trim()}&quot;
          </p>
          {isKpr && currentStage.detail === "AKAD_KREDIT" && selectedRegressionDetail === "SP3K" && (
            <p className="text-xs text-amber-800">
              Pengajuan KPR bank akan dikembalikan ke status SP3K dan status unit dikembalikan ke BOOKED.
            </p>
          )}
        </div>
      ),
      confirmLabel: "Ya, Mundurkan Tahap",
      tone: "default",
    });
  };

  // ---------- Handlers: Cancellation (Batal Transaksi) ----------
  const handleCancelSubmit = () => {
    if (catatanBatal.trim().length < 5) {
      toast.error("Alasan pembatalan transaksi wajib diisi, minimal 5 karakter.");
      return;
    }

    setPendingConfirm({
      action: () => {
        startTransition(async () => {
          try {
            const res = await updateTransactionStatus({
              transaksiId,
              leadId,
              tahapDetail: "BATAL",
              catatanAdmin: catatanBatal.trim(),
            });

            if (!res.success) {
              setPendingConfirm(null);
              toast.error(res.error || "Gagal membatalkan transaksi.");
              return;
            }

            setPendingConfirm(null);
            setShowOtherOptions(false);
            setCatatanBatal("");
            toast.success(res.message || "Transaksi berhasil dibatalkan.");
            router.refresh();
          } catch (err: unknown) {
            setPendingConfirm(null);
            toast.error(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
          }
        });
      },
      title: "Batalkan Transaksi Ini?",
      description: (
        <div className="space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-rose-700">
            Pembatalan bersifat permanen dan tidak dapat diubah kembali.
          </p>
          <p>Status unit akan otomatis diperbarui dan dicatat dalam riwayat audit.</p>
          <p className="rounded bg-slate-100 p-2 text-xs italic text-slate-600">
            &quot;{catatanBatal.trim()}&quot;
          </p>
        </div>
      ),
      confirmLabel: "Ya, Batalkan Transaksi",
      tone: "danger",
    });
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm space-y-5">
      {/* Read-Only Notice */}
      {!canEdit && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900">
          <LockKeyhole className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span>
            Mode Baca Saja: Hanya PIC Marketing atau Admin yang dapat memperbarui tahapan transaksi ini.
          </span>
        </div>
      )}

      {/* Header Panel */}
      <header className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Workflow className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Progress Transaksi</h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Skema {humanize(metodeBayar)} · Unit {humanize(kategoriUnit)}
            </p>
          </div>
        </div>

        <div className="sm:text-right">
          <p className="text-xs text-slate-600">Tahap Saat Ini</p>
          <p className="text-sm font-semibold text-slate-900">{currentStage.label}</p>
          <p className="text-xs text-slate-600">{humanize(currentStage.macro)}</p>
        </div>
      </header>

      <div className="space-y-6 px-5 pb-5">
        {/* Terminal Banners */}
        {isCompleted && (
          <div className="space-y-4">
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-lg border border-teal-300 bg-teal-50 p-4"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden="true" />
              <div className="text-sm leading-6 text-teal-950">
                <p className="font-semibold">Transaksi Selesai — Serah Terima (BAST)</p>
                <p className="text-teal-900">
                  Unit telah resmi diserahterimakan kepada konsumen. Seluruh tahapan selesai.
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
                  {isKavling
                    ? "Lahan Terverifikasi"
                    : `${initialInspeksiBast.filter(
                      (b) =>
                        b.status === "SESUAI" ||
                        b.status === "SELESAI_DIPERBAIKI"
                    ).length
                    }/${MASTER_BAST_ITEMS.length} Item Selesai`}
                </span>
              </div>

              {isKavling ? (
                <p className="text-xs text-slate-600">
                  Unit kavling telah selesai diserahterimakan beserta verifikasi patok batas lahan.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {MASTER_BAST_ITEMS.map((item) => {
                    const found = initialInspeksiBast.find((b) => b.item === item.key);
                    const isPassed =
                      found?.status === "SESUAI" ||
                      found?.status === "SELESAI_DIPERBAIKI";

                    return (
                      <div
                        key={item.key}
                        className={`flex flex-col gap-1.5 rounded-lg border p-2.5 text-xs ${isPassed
                          ? "border-emerald-200 bg-emerald-50/40 text-emerald-950"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}
                      >
                        <div className="flex items-start gap-2">
                          <CheckCircle2
                            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isPassed ? "text-emerald-600" : "text-slate-400"
                              }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-semibold">{item.title}</p>
                              {found?.status && (
                                <span
                                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${found.status === "SESUAI"
                                    ? "border-teal-200 bg-teal-50 text-teal-700"
                                    : found.status === "SELESAI_DIPERBAIKI"
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : found.status === "PERLU_PERBAIKAN"
                                        ? "border-rose-200 bg-rose-50 text-rose-700"
                                        : "border-slate-200 bg-slate-100 text-slate-600"
                                    }`}
                                >
                                  {found.status === "SESUAI"
                                    ? "Sesuai"
                                    : found.status === "SELESAI_DIPERBAIKI"
                                      ? "Selesai Diperbaiki"
                                      : found.status === "PERLU_PERBAIKAN"
                                        ? "Perlu Perbaikan"
                                        : "Belum Dicek"}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] opacity-75">{item.description}</p>
                            {found?.catatan && (
                              <p className="mt-1.5 rounded border border-slate-200/60 bg-white/80 p-1.5 text-[11px] italic text-slate-700">
                                Catatan: {found.catatan}
                              </p>
                            )}
                          </div>
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
              <p className="font-semibold">Transaksi Dibatalkan</p>
              <p className="text-red-900">
                Transaksi ini telah dibatalkan. Riwayat alasan pembatalan tercatat di audit log.
              </p>
            </div>
          </div>
        )}

        {/* Warning Tahap Tidak Dikenal */}
        {isUnknownDbStage && !isTerminal && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-4"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="text-sm leading-6 text-amber-950">
              <p className="font-semibold">Tahap di database perlu disesuaikan</p>
              <p className="text-amber-900">
                Nilai tersimpan <code>{currentTahapDetail || currentStatus}</code> tidak cocok dengan alur {humanize(metodeBayar)}.
              </p>
            </div>
          </div>
        )}

        {/* ─── 1. READ-ONLY MACRO PROGRESS TRACKER (NO CLICK HANDLERS) ─── */}
        {!isCancelled && (
          <section aria-labelledby="macro-stepper-heading" className="space-y-2">
            <h3 id="macro-stepper-heading" className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Alur Tahapan Utama
            </h3>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {macroSteps.map((step, idx) => {
                const isStepDone = idx < currentMacroIndex || isCompleted;
                const isStepCurrent = idx === currentMacroIndex && !isCompleted;

                return (
                  <div
                    key={step.macro}
                    className={`flex min-h-14 items-center gap-2.5 rounded-lg border p-3 text-sm transition-colors ${isStepCurrent
                      ? "border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-600/30"
                      : isStepDone
                        ? "border-slate-200 bg-slate-50/80 text-slate-700"
                        : "border-slate-200 bg-white text-slate-400"
                      }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isStepDone
                        ? "bg-teal-700 text-white"
                        : isStepCurrent
                          ? "bg-teal-600 text-white"
                          : "bg-slate-100 text-slate-500"
                        }`}
                    >
                      {isStepDone ? (
                        <Check className="h-3.5 w-3.5" aria-label="Selesai" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs leading-4">{step.label}</p>
                      {isStepCurrent && (
                        <p className="text-[11px] font-medium text-teal-700 mt-0.5 truncate">
                          {currentStage.label}
                        </p>
                      )}
                    </div>
                    {isStepCurrent && (
                      <span className="shrink-0 rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Aktif
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── 2. "AKSI BERIKUTNYA" CARD (ONE PRIMARY ACTION AREA PER STAGE) ─── */}
        {!isTerminal && (
          <section className="rounded-xl border border-teal-200/80 bg-white p-5 shadow-sm space-y-5 ring-1 ring-teal-600/10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                  Aksi Berikutnya
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {isPemberkasan
                    ? "Kelengkapan Dokumen Pemberkasan"
                    : isKprMicroStage
                      ? "Proses Pengajuan Bank (Wawancara / Verifikasi / SP3K)"
                      : isKprSp3k
                        ? "Pelaksanaan Akad Kredit"
                        : currentStage.detail === "MENUNGGU_PELUNASAN"
                          ? "Konfirmasi Pelunasan (Cash Keras)"
                          : currentStage.detail === "PEMBAYARAN_DP"
                            ? "Pemenuhan Uang Muka DP (Cash Tempo)"
                            : currentStage.detail === "CICILAN_BERJALAN"
                              ? "Progres Cicilan & Pelunasan (Cash Tempo)"
                              : currentStage.detail === "PELUNASAN"
                                ? "Pelaksanaan Akad / AJB"
                                : currentStage.detail === "AKAD_KREDIT" || currentStage.detail === "AJB"
                                  ? "Serah Terima Bangunan & Lahan (BAST)"
                                  : `Lanjut ke ${nextStage?.label ?? "Tahap Berikutnya"}`}
                </h3>
              </div>
            </div>

            {/* ── STAGE A: PEMBERKASAN (ALL METHODS) ── */}
            {isPemberkasan && (
              <div className="space-y-4">
                {/* Profile Summary & Edit Control */}
                <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-teal-700 shrink-0" />
                    <span className="text-xs text-slate-600 font-medium">Profil Konsumen:</span>
                    <span className="text-xs font-bold text-slate-900">
                      {/* {metodeBayar === "KPR" ? "KPR" : humanize(metodeBayar)} · {humanize(kategoriUnit)} ·{" "} */}
                      {statusPernikahan ? humanize(statusPernikahan) : (isKpr ? "Pernikahan (?)" : "Pernikahan (-)")} ·{" "}
                      {statusPekerjaan ? (statusPekerjaan === "TETAP" ? "Pegawai Tetap" : "Wirausaha") : (isKpr ? "Pekerjaan (?)" : "Pekerjaan (-)")}
                    </span>
                  </div>

                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProfileFormPernikahan(statusPernikahan ?? "");
                        setProfileFormPekerjaan(statusPekerjaan ?? "");
                        setProfileDialogOpen(true);
                      }}
                      className="h-7 text-xs font-semibold border-slate-300 text-teal-700 hover:bg-teal-50"
                    >
                      <Edit2 className="mr-1 h-3 w-3" />
                      Ubah Profil
                    </Button>
                  )}
                </div>

                {/* Profile Incomplete Gate */}
                {!isProfileComplete ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-950">
                          Profil Konsumen Belum Lengkap
                        </h4>
                        <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                          Daftar dokumen persyaratan bersifat dinamis berdasarkan status pernikahan dan status pekerjaan konsumen. Lengkapi profil terlebih dahulu untuk menampilkan daftar checklist berkas yang sesuai.
                        </p>
                      </div>
                    </div>

                    {canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setProfileFormPernikahan(statusPernikahan ?? "");
                          setProfileFormPekerjaan(statusPekerjaan ?? "");
                          setProfileDialogOpen(true);
                        }}
                        className="bg-amber-700 text-xs font-semibold text-white hover:bg-amber-800"
                      >
                        Lengkapi Profil Konsumen
                      </Button>
                    )}
                  </div>
                ) : (
                  /* Rule-based Checklist */
                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-medium text-slate-800">
                            Centang berkas yang telah diverifikasi fisik dan validitasnya.
                          </p>
                          {isKpr && (
                            <p className="text-[11px] text-slate-500">
                              Form FPPA berstatus <span className="font-semibold text-amber-700">Bisa menyusul</span> (tidak menghalangi pengajuan KPR awal).
                            </p>
                          )}
                        </div>
                        <span className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800 text-nowrap self-start sm:self-auto">
                          {verifiedRequiredCount} dari {requiredDocs.length} Dokumen Terverifikasi
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {groupedDocs.map((grp) => (
                        <div key={grp.name} className="space-y-2">
                          <div className="flex items-center gap-2 pt-1 pb-0.5">
                            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              {grp.name}
                            </h5>
                            <div className="h-px flex-1 bg-slate-200" />
                          </div>

                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            {grp.items.map((doc) => {
                              const checked = isDokumenTerverifikasi(doc.key, verifiedDocs);
                              const id = `doc-${doc.key}`;

                              return (
                                <label
                                  key={doc.key}
                                  htmlFor={id}
                                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs transition-colors ${checked
                                    ? "border-teal-300 bg-teal-50/50"
                                    : "border-slate-200 bg-white hover:bg-slate-50"
                                    }`}
                                >
                                  <input
                                    id={id}
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!canEdit || isPending}
                                    onChange={() => handleToggleDoc(doc.key, checked)}
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-700 focus:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-slate-900">{doc.label}</span>
                                      {doc.bisaMenyusul ? (
                                        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                          Bisa menyusul
                                        </span>
                                      ) : doc.required ? (
                                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                                          Wajib
                                        </span>
                                      ) : (
                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                          Opsional
                                        </span>
                                      )}
                                      {checked ? (
                                        <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">
                                          Terverifikasi
                                        </span>
                                      ) : (
                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                          Belum verifikasi
                                        </span>
                                      )}
                                    </div>
                                    {doc.description && (
                                      <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
                                        {doc.description}
                                      </p>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* CTA Area for Pemberkasan */}
                    {isKpr ? (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <KprSubmissionSection
                          transaksiId={transaksiId}
                          initialPengajuan={initialPengajuanKpr}
                          masterBanks={masterBanks}
                          currentTahapDetail={currentStage.detail}
                          canEdit={canEdit}
                          hideHeader={true}
                          disabledNew={!allRequiredVerified}
                          disabledNewReason={
                            !allRequiredVerified
                              ? `Lengkapi dan verifikasi seluruh ${blockingRequiredDocs.length} dokumen wajib di atas (selain FPPA) sebelum mengajukan berkas ke Bank.`
                              : undefined
                          }
                        />
                      </div>
                    ) : (
                      /* CTA for Cash */
                      <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-slate-500">
                          Setelah berkas lengkap, transaksi dapat dilanjutkan ke tahap berikutnya.
                        </p>
                        {canEdit && nextStage && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={!allRequiredVerified || isPending}
                            onClick={() => executeAdvance(nextStage.detail)}
                            className="bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                          >
                            {isPending ? (
                              <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                Memproses...
                              </>
                            ) : (
                              `Lanjut ke ${nextStage.label}`
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── STAGE B: KPR WAWANCARA / OTS / VERIFIKASI ── */}
            {isKprMicroStage && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600">
                  Tahapan proses bank dikelola secara langsung melalui kartu pengajuan bank di bawah. Klik tombol aksi status bank untuk memajukan, mencatat penolakan, atau membatalkan pengajuan.
                </p>

                <KprSubmissionSection
                  transaksiId={transaksiId}
                  initialPengajuan={initialPengajuanKpr}
                  masterBanks={masterBanks}
                  currentTahapDetail={currentStage.detail}
                  canEdit={canEdit}
                  hideHeader={true}
                />
              </div>
            )}

            {/* ── STAGE C: KPR SP3K (AKAD FORM) ── */}
            {isKprSp3k && (
              <form onSubmit={handlePrimarySubmit} noValidate className="space-y-4">
                <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-5 w-5 text-teal-700" />
                    <div>
                      <p className="text-xs font-semibold text-teal-900">
                        Bank Pembiaya KPR Disetujui (SP3K Terbit)
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {activePengajuan ? activePengajuan.bank.nama : "Bank Utama"}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md border border-teal-300 bg-white px-2 py-0.5 text-xs font-bold text-teal-800">
                    SP3K Terbit
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id="fld-notaris" label="Notaris / PPAT" required error={formErrors.notaris}>
                    <input
                      id="fld-notaris"
                      type="text"
                      value={namaNotaris}
                      disabled={!canEdit || isPending}
                      onChange={(e) => {
                        setNamaNotaris(e.target.value);
                        if (formErrors.notaris) setFormErrors((p) => ({ ...p, notaris: "" }));
                      }}
                      placeholder="Nama Notaris / PPAT Rekanan"
                      className={inputClass(Boolean(formErrors.notaris))}
                    />
                  </Field>

                  <Field id="fld-tglAkad" label="Tanggal Akad Kredit" required error={formErrors.tglAkad}>
                    <input
                      id="fld-tglAkad"
                      type="date"
                      value={tglAkad}
                      disabled={!canEdit || isPending}
                      onChange={(e) => {
                        setTglAkad(e.target.value);
                        if (formErrors.tglAkad) setFormErrors((p) => ({ ...p, tglAkad: "" }));
                      }}
                      className={inputClass(Boolean(formErrors.tglAkad))}
                    />
                  </Field>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  {canEdit && (
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        "Lanjut ke Akad Kredit"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            )}

            {/* ── STAGE CASH 1: MENUNGGU PELUNASAN (CASH KERAS) ── */}
            {!isKpr && currentStage.detail === "MENUNGGU_PELUNASAN" && (
              <form onSubmit={handlePrimarySubmit} noValidate className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Ringkasan Tagihan & Pelunasan</span>
                    {financialSummary && financialSummary.sisaPelunasan === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Lunas 100%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        Belum Lunas
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
                    <div className="rounded border border-slate-200 bg-white p-2.5">
                      <span className="block text-slate-500 text-[11px]">Harga Kesepakatan</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(financialSummary?.hargaDeal)}
                      </span>
                    </div>
                    <div className="rounded border border-slate-200 bg-white p-2.5">
                      <span className="block text-slate-500 text-[11px]">Total Masuk (Sah)</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatRupiah(financialSummary?.totalPaid)}
                      </span>
                    </div>
                    <div className="rounded border border-slate-200 bg-white p-2.5">
                      <span className="block text-slate-500 text-[11px]">Sisa Pelunasan</span>
                      <span
                        className={`font-mono font-bold ${(financialSummary?.sisaPelunasan ?? 0) > 0 ? "text-rose-600" : "text-emerald-700"
                          }`}
                      >
                        {formatRupiah(financialSummary?.sisaPelunasan)}
                      </span>
                    </div>
                  </div>

                  {(financialSummary?.sisaPelunasan ?? 0) > 0 && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                      <div>
                        <span>Sisa tagihan <strong>{formatRupiah(financialSummary?.sisaPelunasan)}</strong> belum lunas. Catat pembayaran di </span>
                        <Link href="#riwayat-pembayaran" className="font-bold underline text-amber-950 hover:text-black">
                          Riwayat Pembayaran
                        </Link>
                        <span> terlebih dahulu untuk dapat melanjutkan ke tahap berikutnya.</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="max-w-sm">
                  <Field id="fld-tglPelunasan" label="Tanggal Pelunasan (100%)" required error={formErrors.tglPelunasan}>
                    <input
                      id="fld-tglPelunasan"
                      type="date"
                      value={tglPelunasan}
                      disabled={!canEdit || isPending || (financialSummary?.sisaPelunasan ?? 0) > 0}
                      onChange={(e) => {
                        setTglPelunasan(e.target.value);
                        if (formErrors.tglPelunasan) setFormErrors((p) => ({ ...p, tglPelunasan: "" }));
                      }}
                      className={inputClass(Boolean(formErrors.tglPelunasan))}
                    />
                  </Field>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  {canEdit && nextStage && (
                    <Button
                      type="submit"
                      disabled={isPending || (financialSummary?.sisaPelunasan ?? 0) > 0 || !tglPelunasan}
                      className="bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        `Lanjut ke ${nextStage.label}`
                      )}
                    </Button>
                  )}
                </div>
              </form>
            )}

            {/* ── STAGE CASH 2: PEMBAYARAN DP (CASH TEMPO) ── */}
            {!isKpr && currentStage.detail === "PEMBAYARAN_DP" && (
              <form onSubmit={handlePrimarySubmit} noValidate className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Progress Pemenuhan Uang Muka (DP)</span>
                    {financialSummary && financialSummary.sisaDp === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        DP Terpenuhi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        DP Belum Terpenuhi
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
                    <div className="rounded border border-slate-200 bg-white p-2.5">
                      <span className="block text-slate-500 text-[11px]">Target Uang Muka (DP)</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(financialSummary?.targetDp)}
                      </span>
                    </div>
                    <div className="rounded border border-slate-200 bg-white p-2.5">
                      <span className="block text-slate-500 text-[11px]">DP Terbayar (Sah)</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatRupiah(financialSummary?.dpPaid)}
                      </span>
                    </div>
                    <div className="rounded border border-slate-200 bg-white p-2.5">
                      <span className="block text-slate-500 text-[11px]">Sisa Target DP</span>
                      <span
                        className={`font-mono font-bold ${(financialSummary?.sisaDp ?? 0) > 0 ? "text-rose-600" : "text-emerald-700"
                          }`}
                      >
                        {formatRupiah(financialSummary?.sisaDp)}
                      </span>
                    </div>
                  </div>

                  {(financialSummary?.sisaDp ?? 0) > 0 && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                      <div>
                        <span>Pembayaran DP kurang <strong>{formatRupiah(financialSummary?.sisaDp)}</strong> dari target. Catat penerimaan DP di </span>
                        <Link href="#riwayat-pembayaran" className="font-bold underline text-amber-950 hover:text-black">
                          Riwayat Pembayaran
                        </Link>
                        <span> untuk melanjutkan ke tahap cicilan.</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  {canEdit && nextStage && (
                    <Button
                      type="submit"
                      disabled={isPending || (financialSummary?.sisaDp ?? 0) > 0}
                      className="bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        `Lanjut ke ${nextStage.label}`
                      )}
                    </Button>
                  )}
                </div>
              </form>
            )}

            {/* ── STAGE CASH 3: CICILAN BERJALAN (CASH TEMPO) ── */}
            {!isKpr && currentStage.detail === "CICILAN_BERJALAN" && (
              <form onSubmit={handlePrimarySubmit} noValidate className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Progress Cicilan & Pelunasan</span>
                    {financialSummary && financialSummary.sisaPelunasan === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Lunas 100%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        Cicilan Berjalan
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-xs">
                    <div className="rounded border border-slate-200 bg-white p-2.5">
                      <span className="block text-slate-500 text-[11px]">Harga Kesepakatan</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatRupiah(financialSummary?.hargaDeal)}
                      </span>
                    </div>
                    <div className="rounded border border-slate-200 bg-white p-2.5">
                      <span className="block text-slate-500 text-[11px]">Total Masuk (Sah)</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatRupiah(financialSummary?.totalPaid)}
                      </span>
                    </div>
                    <div className="rounded border border-slate-200 bg-white p-2.5">
                      <span className="block text-slate-500 text-[11px]">Sisa Pelunasan</span>
                      <span
                        className={`font-mono font-bold ${(financialSummary?.sisaPelunasan ?? 0) > 0 ? "text-rose-600" : "text-emerald-700"
                          }`}
                      >
                        {formatRupiah(financialSummary?.sisaPelunasan)}
                      </span>
                    </div>
                  </div>

                  {(financialSummary?.sisaPelunasan ?? 0) > 0 && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                      <div>
                        <span>Sisa tagihan cicilan <strong>{formatRupiah(financialSummary?.sisaPelunasan)}</strong> belum lunas. Catat pembayaran di </span>
                        <Link href="#riwayat-pembayaran" className="font-bold underline text-amber-950 hover:text-black">
                          Riwayat Pembayaran
                        </Link>
                        <span> hingga mencapai pelunasan 100%.</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="max-w-sm">
                  <Field id="fld-tglPelunasan" label="Tanggal Pelunasan (100%)" required error={formErrors.tglPelunasan}>
                    <input
                      id="fld-tglPelunasan"
                      type="date"
                      value={tglPelunasan}
                      disabled={!canEdit || isPending || (financialSummary?.sisaPelunasan ?? 0) > 0}
                      onChange={(e) => {
                        setTglPelunasan(e.target.value);
                        if (formErrors.tglPelunasan) setFormErrors((p) => ({ ...p, tglPelunasan: "" }));
                      }}
                      className={inputClass(Boolean(formErrors.tglPelunasan))}
                    />
                  </Field>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  {canEdit && nextStage && (
                    <Button
                      type="submit"
                      disabled={isPending || (financialSummary?.sisaPelunasan ?? 0) > 0 || !tglPelunasan}
                      className="bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        `Lanjut ke ${nextStage.label}`
                      )}
                    </Button>
                  )}
                </div>
              </form>
            )}

            {/* ── STAGE CASH 4: PELUNASAN -> AJB (PERSIAPAN AKAD) ── */}
            {!isKpr && currentStage.detail === "PELUNASAN" && (
              <form onSubmit={handlePrimarySubmit} noValidate className="space-y-4">
                <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-teal-700" />
                    <div>
                      <p className="text-xs font-semibold text-teal-900">
                        Pembayaran Lunas 100%
                      </p>
                      <p className="text-xs text-slate-600">
                        Tentukan Notaris/PPAT dan jadwal pelaksanaan Akad (AJB) untuk melanjutkan.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md border border-teal-300 bg-white px-2 py-0.5 text-xs font-bold text-teal-800">
                    Lunas
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field id="fld-notaris" label="Notaris / PPAT" required error={formErrors.notaris}>
                    <input
                      id="fld-notaris"
                      type="text"
                      value={namaNotaris}
                      disabled={!canEdit || isPending}
                      onChange={(e) => {
                        setNamaNotaris(e.target.value);
                        if (formErrors.notaris) setFormErrors((p) => ({ ...p, notaris: "" }));
                      }}
                      placeholder="Nama Notaris / PPAT"
                      className={inputClass(Boolean(formErrors.notaris))}
                    />
                  </Field>

                  <Field id="fld-tglAkad" label="Tanggal Pelaksanaan Akad (AJB)" required error={formErrors.tglAkad}>
                    <input
                      id="fld-tglAkad"
                      type="date"
                      value={tglAkad}
                      disabled={!canEdit || isPending}
                      onChange={(e) => {
                        setTglAkad(e.target.value);
                        if (formErrors.tglAkad) setFormErrors((p) => ({ ...p, tglAkad: "" }));
                      }}
                      className={inputClass(Boolean(formErrors.tglAkad))}
                    />
                  </Field>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  {canEdit && nextStage && (
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        `Lanjut ke ${nextStage.label}`
                      )}
                    </Button>
                  )}
                </div>
              </form>
            )}

            {/* ── STAGE E: AKAD -> BAST (KPR AKAD KREDIT ATAU CASH AJB) ── */}
            {(currentStage.detail === "AKAD_KREDIT" || currentStage.detail === "AJB") && (
              <form onSubmit={handlePrimarySubmit} noValidate className="space-y-4">
                <div className="max-w-sm">
                  <Field id="fld-tglBast" label="Tanggal Serah Terima (BAST)" required error={formErrors.tglBast}>
                    <input
                      id="fld-tglBast"
                      type="date"
                      value={tglBast}
                      disabled={!canEdit || isPending}
                      onChange={(e) => {
                        setTglBast(e.target.value);
                        if (formErrors.tglBast) setFormErrors((p) => ({ ...p, tglBast: "" }));
                      }}
                      className={inputClass(Boolean(formErrors.tglBast))}
                    />
                  </Field>
                </div>

                {isKavling ? (
                  <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-teal-700 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-teal-950">Unit Kategori Kavling / Tanah</h4>
                        <p className="text-xs text-teal-900 mt-0.5">
                          Unit kavling tidak memiliki struktur bangunan fisik. Verifikasi difokuskan pada patok batas lahan dan aksesibilitas.
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
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-slate-600">
                        Inspeksi fisik per item sebelum serah terima. Catat temuan jika perlu perbaikan.
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-md border px-2.5 py-1 text-xs font-bold ${okCount === MASTER_BAST_ITEMS.length
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                        >
                          {okCount}/{MASTER_BAST_ITEMS.length} OK
                        </span>
                        {perluPerbaikanCount > 0 && (
                          <span className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                            · {perluPerbaikanCount} perlu perbaikan
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {MASTER_BAST_ITEMS.map((item) => {
                        const itemState = inspeksiMap[item.key] || {
                          status: "BELUM_DICEK",
                          catatan: "",
                          isPerluPerbaikanOpen: false,
                        };
                        const isSavingThis = Boolean(savingItems[item.key]);
                        const isOk =
                          itemState.status === "SESUAI" ||
                          itemState.status === "SELESAI_DIPERBAIKI";
                        const isPerlu = itemState.status === "PERLU_PERBAIKAN";
                        const isSelesai = itemState.status === "SELESAI_DIPERBAIKI";
                        const showCatatanInput =
                          itemState.isPerluPerbaikanOpen || isPerlu || isSelesai;

                        return (
                          <div
                            key={item.key}
                            id={`bast-item-${item.key}`}
                            tabIndex={-1}
                            className={`flex flex-col justify-between rounded-lg border p-3.5 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${isOk
                              ? "border-teal-200 bg-teal-50/30"
                              : isPerlu
                                ? "border-rose-200 bg-rose-50/30"
                                : "border-slate-200 bg-white"
                              }`}
                          >
                            <div>
                              {/* Header & Status Badge */}
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-slate-900">
                                  {item.title}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isSavingThis && (
                                    <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                                  )}
                                  <span
                                    className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${itemState.status === "SESUAI"
                                      ? "border-teal-200 bg-teal-50 text-teal-800"
                                      : itemState.status === "SELESAI_DIPERBAIKI"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : itemState.status === "PERLU_PERBAIKAN"
                                          ? "border-rose-200 bg-rose-50 text-rose-800"
                                          : "border-slate-200 bg-slate-100 text-slate-500"
                                      }`}
                                  >
                                    {itemState.status === "SESUAI"
                                      ? "Sesuai"
                                      : itemState.status === "SELESAI_DIPERBAIKI"
                                        ? "Selesai Diperbaiki"
                                        : itemState.status === "PERLU_PERBAIKAN"
                                          ? "Perlu Perbaikan"
                                          : "Belum Dicek"}
                                  </span>
                                </div>
                              </div>

                              <p className="mt-1 text-[11px] text-slate-500">
                                {item.description}
                              </p>

                              {/* Action Buttons: Sesuai & Perlu Perbaikan */}
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  type="button"
                                  id={`btn-sesuai-${item.key}`}
                                  aria-label={`Tandai ${item.title} sesuai`}
                                  disabled={!canEdit || isPending || isSavingThis}
                                  onClick={() => handleMarkSesuai(item.key)}
                                  className={`flex-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${itemState.status === "SESUAI"
                                    ? "border-teal-700 bg-teal-700 text-white shadow-sm"
                                    : "border-slate-300 bg-white text-slate-700 hover:border-teal-500 hover:bg-teal-50/50"
                                    }`}
                                >
                                  <span className="flex items-center justify-center gap-1">
                                    <Check className="h-3.5 w-3.5" />
                                    Sesuai
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  aria-label={`Tandai ${item.title} perlu perbaikan`}
                                  disabled={!canEdit || isPending || isSavingThis}
                                  onClick={() => handleOpenPerluPerbaikan(item.key)}
                                  className={`flex-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${isPerlu
                                    ? "border-rose-600 bg-rose-600 text-white shadow-sm"
                                    : itemState.isPerluPerbaikanOpen && !isOk
                                      ? "border-rose-400 bg-rose-50 text-rose-800"
                                      : "border-slate-300 bg-white text-slate-700 hover:border-rose-400 hover:bg-rose-50/50"
                                    }`}
                                >
                                  <span className="flex items-center justify-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Perlu Perbaikan
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* Section Catatan & Tombol Sudah Diperbaiki */}
                            {showCatatanInput && (
                              <div className="mt-3 border-t border-slate-200/80 pt-2.5 space-y-2">
                                <div>
                                  <label
                                    htmlFor={`bast-catatan-${item.key}`}
                                    className="block text-[11px] font-semibold text-slate-700 mb-1"
                                  >
                                    Catatan Temuan / Cacat Fisik{" "}
                                    <span className="text-red-600">*</span>
                                  </label>
                                  <textarea
                                    id={`bast-catatan-${item.key}`}
                                    aria-label={`Catatan perbaikan ${item.title}`}
                                    value={itemState.catatan}
                                    readOnly={isSelesai || !canEdit || isSavingThis}
                                    onChange={(e) =>
                                      handleCatatanChange(item.key, e.target.value)
                                    }
                                    placeholder="Jelaskan bagian yang cacat / perlu diperbaiki (min. 3 karakter)..."
                                    rows={2}
                                    className={`w-full rounded-md border p-2 text-xs outline-none focus:ring-1 ${isSelesai
                                      ? "bg-slate-100 text-slate-600 border-slate-300 cursor-not-allowed"
                                      : itemState.error
                                        ? "border-red-400 focus:border-red-500 focus:ring-red-400/25 bg-red-50/30"
                                        : "border-slate-300 focus:border-teal-600 focus:ring-teal-500/20 bg-white"
                                      }`}
                                  />
                                  {itemState.error && (
                                    <p
                                      role="alert"
                                      className="mt-1 text-[11px] font-medium text-red-600"
                                    >
                                      {itemState.error}
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                                  {!isSelesai && (
                                    <button
                                      type="button"
                                      aria-label={`Simpan catatan perbaikan ${item.title}`}
                                      disabled={!canEdit || isPending || isSavingThis}
                                      onClick={() => handleSavePerluPerbaikan(item.key)}
                                      className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50 transition-colors"
                                    >
                                      {isPerlu ? "Perbarui Catatan" : "Simpan Catatan Temuan"}
                                    </button>
                                  )}

                                  {isPerlu && (
                                    <button
                                      type="button"
                                      aria-label={`Tandai perbaikan ${item.title} sudah selesai`}
                                      disabled={!canEdit || isPending || isSavingThis}
                                      onClick={() => handleMarkSudahDiperbaiki(item.key)}
                                      className="flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-sm"
                                    >
                                      <CheckCircle2 className="h-3 w-3" />
                                      Sudah diperbaiki
                                    </button>
                                  )}

                                  {isSelesai && (
                                    <div className="flex w-full items-center justify-between text-[11px] text-emerald-800 font-medium">
                                      <span className="flex items-center gap-1">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                        Perbaikan terverifikasi selesai
                                      </span>
                                      {canEdit && (
                                        <button
                                          type="button"
                                          aria-label={`Buka kembali catatan ${item.title}`}
                                          onClick={() => handleOpenPerluPerbaikan(item.key)}
                                          className="text-slate-500 hover:text-slate-800 underline text-[10px]"
                                        >
                                          Ubah Catatan
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {formErrors.bast && (
                  <p
                    id="fld-bast"
                    tabIndex={-1}
                    role="alert"
                    className="text-xs font-medium text-red-700 bg-red-50 p-2.5 rounded-md border border-red-200 outline-none"
                  >
                    {formErrors.bast}
                  </p>
                )}

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  {canEdit && (
                    <Button
                      type="submit"
                      disabled={isPending || isSavingAnyItem || !isBastFormComplete || !tglBast}
                      className="bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        "Selesaikan Serah Terima (BAST)"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            )}

            {/* ─── 3. "⋯ OPSI LAINNYA" (MUNDUR TAHAP & BATALKAN TRANSAKSI) ─── */}
            {canEdit && (
              <div className="border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowOtherOptions((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  <span>⋯ Opsi lainnya</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${showOtherOptions ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {showOtherOptions && (
                  <div className="mt-3 space-y-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                    {/* Opsi 1: Mundur ke Tahap Sebelumnya */}
                    {availableRegressionStages.length > 0 && (
                      <div className="space-y-3 pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <Undo2 className="h-4 w-4 text-amber-700 shrink-0" />
                          <h4 className="text-xs font-bold text-slate-900">
                            Mundur ke Tahap Sebelumnya
                          </h4>
                        </div>
                        <p className="text-xs text-slate-600">
                          Gunakan jika berkas perlu revisi atau hasil keputusan perbankan mengharuskan evaluasi ulang.
                        </p>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              Pilih Tahap Mundur <span className="text-red-600">*</span>
                            </label>
                            <select
                              value={selectedRegressionDetail}
                              onChange={(e) =>
                                setSelectedRegressionDetail(e.target.value as TahapDetail)
                              }
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                            >
                              <option value="">Pilih tahap sebelumnya</option>
                              {availableRegressionStages.map((s) => (
                                <option key={s.detail} value={s.detail}>
                                  {s.label} ({humanize(s.macro)})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                              Alasan Mundur (min 5 karakter) <span className="text-red-600">*</span>
                            </label>
                            <input
                              type="text"
                              value={catatanMundur}
                              onChange={(e) => setCatatanMundur(e.target.value)}
                              placeholder="Misal: berkas SP3K revisi atau syarat bank belum lengkap"
                              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              !selectedRegressionDetail ||
                              catatanMundur.trim().length < 5 ||
                              isPending
                            }
                            onClick={handleRegressionSubmit}
                            className="h-8 text-xs font-semibold border-amber-300 text-amber-800 hover:bg-amber-50"
                          >
                            <Undo2 className="mr-1 h-3.5 w-3.5" />
                            Mundur ke Tahap Dipilih
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Opsi 2: Batalkan Transaksi */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Ban className="h-4 w-4 text-rose-700 shrink-0" />
                        <h4 className="text-xs font-bold text-slate-900">
                          Batalkan Transaksi
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600">
                        Pembatalan bersifat permanen. Tuliskan alasan pembatalan secara jelas untuk pencatatan audit log.
                      </p>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                          Alasan Pembatalan (min 5 karakter) <span className="text-red-600">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={catatanBatal}
                          onChange={(e) => setCatatanBatal(e.target.value)}
                          placeholder="Misal: konsumen mengundurkan diri atau BI checking ditolak seluruh bank"
                          className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs focus:border-rose-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          type="button"
                          size="sm"
                          disabled={catatanBatal.trim().length < 5 || isPending}
                          onClick={handleCancelSubmit}
                          className="h-8 bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          <Ban className="mr-1 h-3.5 w-3.5" />
                          Batalkan Transaksi
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* ─── 4. DIALOG EDIT PROFIL PEMBERKASAN KONSUMEN ─── */}
      {profileDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-teal-700" />
                <h4 className="text-sm font-bold text-slate-900">
                  Profil Pemberkasan Konsumen
                </h4>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Tentukan status pernikahan dan pekerjaan konsumen untuk memuat aturan kelengkapan berkas yang akurat.
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Status Pernikahan {isKpr && <span className="text-red-600">*</span>}
                  {!isKpr && <span className="text-slate-400 font-normal ml-1">(Opsional untuk Cash)</span>}
                </label>
                <select
                  value={profileFormPernikahan}
                  onChange={(e) => setProfileFormPernikahan(e.target.value as StatusPernikahan)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                >
                  <option value="">Pilih status pernikahan</option>
                  <option value="BELUM_MENIKAH">Belum Menikah</option>
                  <option value="MENIKAH">Menikah</option>
                  <option value="CERAI">Cerai</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Status Pekerjaan {isKpr && <span className="text-red-600">*</span>}
                  {!isKpr && <span className="text-slate-400 font-normal ml-1">(Opsional untuk Cash)</span>}
                </label>
                <select
                  value={profileFormPekerjaan}
                  onChange={(e) => setProfileFormPekerjaan(e.target.value as StatusPekerjaan)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                >
                  <option value="">Pilih status pekerjaan</option>
                  <option value="TETAP">Pegawai Tetap (Karyawan)</option>
                  <option value="TIDAK_TETAP">Wirausaha / Tidak Tetap / Profesional</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => setProfileDialogOpen(false)}
                className="h-8 text-xs"
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={
                  (isKpr && (!profileFormPernikahan || !profileFormPekerjaan)) ||
                  isPending
                }
                onClick={handleSaveProfile}
                className="h-8 bg-teal-700 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Profil"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. DIALOG KONFIRMASI GLOBAL ─── */}
      <ConfirmDialog
        open={pendingConfirm !== null}
        pending={isPending}
        title={pendingConfirm?.title ?? ""}
        description={pendingConfirm?.description ?? null}
        confirmLabel={pendingConfirm?.confirmLabel ?? "Ya, Lanjutkan"}
        tone={pendingConfirm?.tone ?? "default"}
        onConfirm={() => {
          if (pendingConfirm) pendingConfirm.action();
        }}
        onCancel={() => setPendingConfirm(null)}
      />
    </section>
  );
}