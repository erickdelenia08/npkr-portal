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
  simpanJadwalTransaksi,
} from "@/actions/transaksi.action";
import { updateChecklistBAST } from "@/actions/bast.action";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  KprSubmissionSection,
  type PengajuanKPRItem,
  type BankItem,
} from "@/components/forms/kpr-submission-section";

import type {
  TahapDetail,
  MetodeBayar,
  JenisDokumen,
  ItemBAST,
  StatusBAST,
  StatusPernikahan,
  StatusPekerjaan,
} from "@/generated/prisma";
import {
  type StageOption,
  type TahapMakro,
  getStagesByMetode,
  getFallbackStage,
  MACRO_STAGE_LABELS,
} from "@/lib/transaksi/stage-map";
import { todayWIB } from "@/lib/date/wib";
import {
  getRequiredDocuments,
  isDokumenTerverifikasi,
} from "@/lib/transaksi/document-rules";

// --------------------------------------------------
// Types & Defaults
// --------------------------------------------------

export interface ChecklistBastPropItem {
  item: ItemBAST;
  status: StatusBAST;
}

export type InspeksiBastPropItem = ChecklistBastPropItem;

interface ItemChecklistState {
  status: StatusBAST;
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

export interface DynamicActionPanelProps {
  transaksiId: number;
  leadId: number;
  version: number;
  metodeBayar: MetodeBayar;
  kategoriUnit: "SUBSIDI" | "KOMERSIL" | "KAVLING";
  currentTahapDetail: string;
  currentStatus?: string;
  initialNotaris: string | null;
  initialTglAkad: string | null;
  initialTglAjb?: string | null;
  initialTglBast?: string | null;
  initialLunasAt?: string | null;
  initialRencanaAkad?: string | null;
  initialRencanaBast?: string | null;
  initialPengajuanTerpilihId?: number | null;
  initialCatatan: string | null;
  initialVerifiedDocs?: string[];
  initialChecklistBast?: ChecklistBastPropItem[];
  initialInspeksiBast?: ChecklistBastPropItem[];
  initialPengajuanKpr?: PengajuanKPRItem[];
  masterBanks?: BankItem[];
  canEdit?: boolean;
  statusPernikahan?: StatusPernikahan | null;
  statusPekerjaan?: StatusPekerjaan | null;
  financialSummary?: FinancialSummaryProp;
}

export interface BastItemDef {
  key: ItemBAST;
  title: string;
  description: string;
}

export const MASTER_BAST_ITEMS: BastItemDef[] = [
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
const EMPTY_CHECKLIST: ChecklistBastPropItem[] = [];
const EMPTY_PENGAJUAN: PengajuanKPRItem[] = [];
const EMPTY_BANKS: BankItem[] = [];

function buildInitialChecklistMap(
  initial: ChecklistBastPropItem[] = []
): Record<ItemBAST, ItemChecklistState> {
  const map = {} as Record<ItemBAST, ItemChecklistState>;
  MASTER_BAST_ITEMS.forEach((def) => {
    const found = initial.find((x) => x.item === def.key);
    map[def.key] = {
      status: found?.status ?? "BELUM_LENGKAP",
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
  version,
  metodeBayar,
  kategoriUnit,
  currentStatus,
  currentTahapDetail,
  initialNotaris,
  initialTglAkad,
  initialTglAjb,
  initialTglBast,
  initialLunasAt,
  initialRencanaAkad,
  initialRencanaBast,
  initialPengajuanTerpilihId,
  initialCatatan,
  initialVerifiedDocs = EMPTY_STRINGS,
  initialChecklistBast,
  initialInspeksiBast,
  initialPengajuanKpr = EMPTY_PENGAJUAN,
  masterBanks = EMPTY_BANKS,
  canEdit = true,
  statusPernikahan: initialStatusPernikahan,
  statusPekerjaan: initialStatusPekerjaan,
  financialSummary,
}: DynamicActionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSavingJadwal, startJadwalTransition] = useTransition();

  const effectiveChecklistBast =
    initialChecklistBast ?? initialInspeksiBast ?? EMPTY_CHECKLIST;

  // ---------- Stages Map ----------
  const stages = useMemo(() => getStagesByMetode(metodeBayar), [metodeBayar]);
  const mainStages = useMemo(
    () => stages.filter((stage) => stage.detail !== "BATAL"),
    [stages]
  );

  const currentStage = useMemo(() => {
    if (currentTahapDetail) {
      const exact = stages.find((stage) => stage.detail === currentTahapDetail);
      if (exact) return exact;
    }
    return getFallbackStage(stages, currentStatus || "", metodeBayar).stage;
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

  // Macro steps: For KPR explicitly sequence PEMBERKASAN -> PROSES_BANK -> AKAD_AJB -> SERAH_TERIMA
  const isUnknownDbStage =
    Boolean(currentTahapDetail) &&
    !stages.some((stage) => stage.detail === currentTahapDetail);
  const macroSteps = useMemo(() => {
    if (metodeBayar === "KPR") {
      return [
        {
          macro: "PEMBERKASAN" as TahapMakro,
          label: MACRO_STAGE_LABELS.PEMBERKASAN,
          microStages: mainStages.filter((m) => m.macro === "PEMBERKASAN"),
        },
        {
          macro: "PROSES_BANK" as TahapMakro,
          label: MACRO_STAGE_LABELS.PROSES_BANK,
          microStages: mainStages.filter((m) => m.macro === "PROSES_BANK"),
        },
        {
          macro: "AKAD_AJB" as TahapMakro,
          label: MACRO_STAGE_LABELS.AKAD_AJB,
          microStages: mainStages.filter((m) => m.macro === "AKAD_AJB"),
        },
        {
          macro: "SERAH_TERIMA" as TahapMakro,
          label: MACRO_STAGE_LABELS.SERAH_TERIMA,
          microStages: mainStages.filter((m) => m.macro === "SERAH_TERIMA"),
        },
      ];
    }

    const seen = new Set<TahapMakro>();
    const steps: {
      macro: TahapMakro;
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
  }, [mainStages, metodeBayar]);

  const currentMacro = currentStage.macro;

  const currentMacroIndex = macroSteps.findIndex(
    (s) => s.macro === currentMacro
  );

  // ---------- State: Profile Konsumen ----------
  const [statusPernikahan, setStatusPernikahan] = useState<StatusPernikahan | null>(
    initialStatusPernikahan ?? null
  );
  const [statusPekerjaan, setStatusPekerjaan] = useState<StatusPekerjaan | null>(
    initialStatusPekerjaan ?? null
  );
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileFormPernikahan, setProfileFormPernikahan] = useState<StatusPekerjaan | StatusPernikahan | "">(
    initialStatusPernikahan ?? ""
  );
  const [profileFormPekerjaan, setProfileFormPekerjaan] = useState<StatusPekerjaan | StatusPernikahan | "">(
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
  const [rencanaAkadAt, setRencanaAkadAt] = useState(() =>
    initialRencanaAkad ? toDateInput(initialRencanaAkad) : ""
  );
  const [rencanaBastAt, setRencanaBastAt] = useState(() =>
    initialRencanaBast ? toDateInput(initialRencanaBast) : ""
  );
  const [selectedPengajuanId, setSelectedPengajuanId] = useState<number | null>(() => {
    if (initialPengajuanTerpilihId) return initialPengajuanTerpilihId;
    const firstSp3k = initialPengajuanKpr.find((p) => p.status === "SP3K");
    return firstSp3k?.id ?? null;
  });
  const [catatanAdmin, setCatatanAdmin] = useState(initialCatatan ?? "");
  const [verifiedDocs, setVerifiedDocs] = useState<string[]>(initialVerifiedDocs);
  const [checklistMap, setChecklistMap] = useState<Record<ItemBAST, ItemChecklistState>>(() =>
    buildInitialChecklistMap(effectiveChecklistBast)
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
    version,
    initialStatusPernikahan,
    initialStatusPekerjaan,
    initialNotaris,
    initialTglAkad,
    initialTglAjb,
    initialTglBast,
    initialLunasAt,
    initialRencanaAkad,
    initialRencanaBast,
    initialPengajuanTerpilihId,
    lastPaymentDate,
    initialCatatan,
    [...initialVerifiedDocs].sort(),
    effectiveChecklistBast
      .map((b) => `${b.item}:${b.status}`)
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
    setRencanaAkadAt(initialRencanaAkad ? toDateInput(initialRencanaAkad) : "");
    setRencanaBastAt(initialRencanaBast ? toDateInput(initialRencanaBast) : "");
    setSelectedPengajuanId(initialPengajuanTerpilihId ?? null);
    setCatatanAdmin(initialCatatan ?? "");
    setVerifiedDocs(initialVerifiedDocs);
    setChecklistMap(buildInitialChecklistMap(effectiveChecklistBast));
    setSavingItems({});
    setLahanChecked(false);
  }

  // Active KPR Pengajuan & SP3K
  const activeSubmissions = useMemo(
    () => initialPengajuanKpr.filter((p) => p.status !== "DITOLAK" && p.status !== "DIBATALKAN"),
    [initialPengajuanKpr]
  );
  const sp3kSubmissions = useMemo(
    () => activeSubmissions.filter((p) => p.status === "SP3K"),
    [activeSubmissions]
  );
  const hasSp3k = sp3kSubmissions.length > 0;
  const approvedBankNames = sp3kSubmissions.map((s) => s.bank.nama).join(", ");
  const effectiveSelectedPengajuanId = selectedPengajuanId ?? sp3kSubmissions[0]?.id ?? null;

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
  const allRequiredVerified = useMemo(() => {
    if (!isProfileComplete) return false;
    return blockingRequiredDocs.every((doc) =>
      isDokumenTerverifikasi(doc.key, verifiedDocs)
    );
  }, [isProfileComplete, blockingRequiredDocs, verifiedDocs]);

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
  const isProsesBank = currentStage.detail === "PROSES_BANK";
  const isAkadStage = currentStage.detail === "AKAD_KREDIT" || currentStage.detail === "AJB";

  // BAST completeness check
  const lengkapBastCount = useMemo(() => {
    return MASTER_BAST_ITEMS.filter((item) => {
      return checklistMap[item.key]?.status === "LENGKAP";
    }).length;
  }, [checklistMap]);

  const isSavingAnyItem = useMemo(() => {
    return Object.values(savingItems).some(Boolean);
  }, [savingItems]);

  const isBastFormComplete = isKavling
    ? lahanChecked
    : lengkapBastCount === MASTER_BAST_ITEMS.length;

  // ---------- Handlers: Document Toggle (Pemberkasan Checklist) ----------
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
        status: newVerified ? "LENGKAP" : "BELUM_LENGKAP",
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
        toast.error(res.error || "Gagal memperbarui checklist dokumen.");
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

  // ---------- Handlers: BAST Checklist Items ----------
  const handleToggleBastItem = async (key: ItemBAST) => {
    if (!canEdit || isPending || savingItems[key]) return;

    const currentItem = checklistMap[key] || { status: "BELUM_LENGKAP" };
    const newStatus: StatusBAST = currentItem.status === "LENGKAP" ? "BELUM_LENGKAP" : "LENGKAP";

    // Optimistic UI update
    setChecklistMap((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        status: newStatus,
      },
    }));
    setSavingItems((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await updateChecklistBAST({
        transaksiId,
        item: key,
        status: newStatus,
      });

      if (!res.success) {
        // Rollback
        setChecklistMap((prev) => ({ ...prev, [key]: currentItem }));
        toast.error(res.error || "Gagal memperbarui checklist serah terima.");
      } else {
        toast.success(res.message || "Status serah terima berhasil diperbarui.");
      }
    } catch (err: unknown) {
      // Rollback
      setChecklistMap((prev) => ({ ...prev, [key]: currentItem }));
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan sistem.";
      toast.error(msg);
    } finally {
      setSavingItems((prev) => ({ ...prev, [key]: false }));
    }
  };

  // ---------- Handlers: Simpan Jadwal Milestone (Agenda) ----------
  const handleSimpanJadwalAkad = () => {
    startJadwalTransition(async () => {
      try {
        const res = await simpanJadwalTransaksi({
          transaksiId,
          version,
          namaNotaris: namaNotaris.trim() || null,
          rencanaAkadAt: rencanaAkadAt || null,
        });

        if (!res.success) {
          if (res.error?.includes("telah diubah oleh pengguna lain")) {
            toast.error("Data transaksi telah diubah oleh pengguna lain. Halaman akan dimuat ulang.");
            router.refresh();
            return;
          }
          toast.error(res.error || "Gagal menyimpan jadwal akad.");
          return;
        }

        toast.success(res.message || "Rencana jadwal akad berhasil disimpan.");
        router.refresh();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
      }
    });
  };

  const handleSimpanJadwalBast = () => {
    startJadwalTransition(async () => {
      try {
        const res = await simpanJadwalTransaksi({
          transaksiId,
          version,
          rencanaBastAt: rencanaBastAt || null,
        });

        if (!res.success) {
          if (res.error?.includes("telah diubah oleh pengguna lain")) {
            toast.error("Data transaksi telah diubah oleh pengguna lain. Halaman akan dimuat ulang.");
            router.refresh();
            return;
          }
          toast.error(res.error || "Gagal menyimpan rencana serah terima (BAST).");
          return;
        }

        toast.success(res.message || "Rencana serah terima (BAST) berhasil disimpan.");
        router.refresh();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Terjadi kesalahan sistem.");
      }
    });
  };

  // ---------- Handlers: Advance Stage ----------
  const executeAdvance = (targetDetail: TahapDetail) => {
    startTransition(async () => {
      try {
        const isTargetAkad = targetDetail === "AKAD_KREDIT";
        const isTargetAjb = targetDetail === "AJB";
        const isTargetPelunasan = targetDetail === "PELUNASAN";
        const isTargetBast = targetDetail === "BAST";

        const result = await updateTransactionStatus({
          transaksiId,
          leadId,
          tahapDetail: targetDetail,
          fromDetail: currentStage.detail,
          version,
          namaNotaris: isTargetAkad || isTargetAjb || isAkadStage ? (namaNotaris.trim() || null) : null,
          tglAkad: (isTargetAkad || isTargetAjb || isAkadStage) && tglAkad ? tglAkad : null,
          tglAjb: isTargetAjb && tglAkad ? tglAkad : null,
          lunasAt: isTargetPelunasan || currentStage.detail === "PELUNASAN" ? (tglPelunasan || null) : null,
          tglBast: isTargetBast ? (tglBast || null) : null,
          rencanaAkadAt: rencanaAkadAt || null,
          rencanaBastAt: rencanaBastAt || null,
          pengajuanTerpilihId:
            isTargetAkad || currentStage.detail === "PROSES_BANK" ? effectiveSelectedPengajuanId : null,
          lahanConfirmed: isKavling && isTargetBast ? lahanChecked : null,
          catatanAdmin: catatanAdmin.trim() || null,
        });

        if (!result.success) {
          setPendingConfirm(null);
          if (result.error?.includes("telah diubah oleh pengguna lain")) {
            toast.error("Data transaksi telah diubah oleh pengguna lain. Halaman akan dimuat ulang.");
            router.refresh();
            return;
          }
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

    const errors: Record<string, string> = {};
    const today = todayWIB();

    // Validation for KPR SP3K -> AKAD_KREDIT
    if (isProsesBank && hasSp3k) {
      if (sp3kSubmissions.length > 1 && !effectiveSelectedPengajuanId) {
        errors.bank = "Pilih salah satu bank pembiaya (SP3K) terlebih dahulu.";
      }
      if (!namaNotaris.trim()) errors.notaris = "Nama notaris/PPAT wajib diisi.";
      if (!tglAkad) {
        errors.tglAkad = "Tanggal akad kredit aktual wajib diisi.";
      } else if (tglAkad > today) {
        errors.tglAkad = "Tanggal akad kredit aktual tidak boleh di masa depan.";
      }

      setFormErrors(errors);
      if (Object.keys(errors).length > 0) {
        if (errors.bank) toast.error(errors.bank);
        else if (errors.notaris) document.getElementById("fld-notaris")?.focus();
        else if (errors.tglAkad) document.getElementById("fld-tglAkad")?.focus();
        return;
      }

      executeAdvance("AKAD_KREDIT");
      return;
    }

    if (!nextStage) return;

    // Validation for Cash MENUNGGU_PELUNASAN -> PELUNASAN (Cash Keras)
    if (currentStage.detail === "MENUNGGU_PELUNASAN") {
      if ((financialSummary?.sisaPelunasan ?? 0) > 0) {
        errors.pelunasan = `Sisa tagihan ${formatRupiah(financialSummary?.sisaPelunasan)} belum lunas. Catat pembayaran di riwayat pembayaran terlebih dahulu.`;
      }
      if (!tglPelunasan) {
        errors.tglPelunasan = "Tanggal pelunasan wajib diisi.";
      } else if (tglPelunasan > today) {
        errors.tglPelunasan = "Tanggal pelunasan aktual tidak boleh di masa depan.";
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
      } else if (tglPelunasan > today) {
        errors.tglPelunasan = "Tanggal pelunasan aktual tidak boleh di masa depan.";
      }
    }

    // Validation for Cash PELUNASAN -> AJB (Persiapan Akad)
    if (currentStage.detail === "PELUNASAN") {
      if (!namaNotaris.trim()) errors.notaris = "Nama notaris/PPAT wajib diisi.";
      if (!tglAkad) {
        errors.tglAkad = "Tanggal pelaksanaan akad (AJB) aktual wajib diisi.";
      } else if (tglAkad > today) {
        errors.tglAkad = "Tanggal pelaksanaan akad (AJB) aktual tidak boleh di masa depan.";
      }
    }

    // Validation for Akad -> BAST
    if (nextStage.detail === "BAST") {
      if (!tglBast) {
        errors.tglBast = "Tanggal serah terima (BAST) aktual wajib diisi.";
      } else if (tglBast > today) {
        errors.tglBast = "Tanggal serah terima (BAST) aktual tidak boleh di masa depan.";
      }
      if (!isBastFormComplete) {
        if (isKavling) {
          errors.bast = "Centang konfirmasi serah terima fisik lahan terlebih dahulu.";
        } else {
          errors.bast = `Checklist serah terima belum lengkap: ${lengkapBastCount}/${MASTER_BAST_ITEMS.length} item lengkap. Seluruh ${MASTER_BAST_ITEMS.length} item wajib berstatus Lengkap sebelum BAST.`;
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
        toast.error(errors.bast);
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
    return stages.slice(0, currentIndex).filter((s) => s.detail !== "BATAL");
  }, [stages, currentIndex]);

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
              fromDetail: currentStage.detail,
              version,
              catatanAdmin: catatanMundur.trim(),
            });

            if (!res.success) {
              setPendingConfirm(null);
              if (res.error?.includes("telah diubah oleh pengguna lain")) {
                toast.error("Data transaksi telah diubah oleh pengguna lain. Halaman akan dimuat ulang.");
                router.refresh();
                return;
              }
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
              fromDetail: currentStage.detail,
              version,
              catatanAdmin: catatanBatal.trim(),
            });

            if (!res.success) {
              setPendingConfirm(null);
              if (res.error?.includes("telah diubah oleh pengguna lain")) {
                toast.error("Data transaksi telah diubah oleh pengguna lain. Halaman akan dimuat ulang.");
                router.refresh();
                return;
              }
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
  // Shared Document Checklist Renderer (Pemberkasan & Proses Bank)
  // --------------------------------------------------
  const renderDocumentChecklist = () => (
    <div className="space-y-4">
      {/* Profile Summary & Edit Control */}
      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-teal-700 shrink-0" />
          <span className="text-xs text-slate-600 font-medium">Profil Konsumen:</span>
          <span className="text-xs font-bold text-slate-900">
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
                Daftar dokumen persyaratan disesuaikan dengan status pernikahan dan status pekerjaan konsumen. Lengkapi profil terlebih dahulu untuk menampilkan checklist berkas yang sesuai.
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
                  Centang dokumen yang telah diterima secara fisik dari konsumen.
                </p>
                {/* {isKpr && (
                  <p className="text-[11px] text-slate-500">
                    Form FPPA berstatus <span className="font-semibold text-amber-700">Bisa menyusul</span> (tidak menghalangi pengajuan awal ke Bank).
                  </p>
                )} */}
              </div>
              <span className="rounded-md border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800 text-nowrap self-start sm:self-auto">
                {verifiedRequiredCount} dari {requiredDocs.length} Dokumen Diterima
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
                                Lengkap
                              </span>
                            ) : (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                Belum Lengkap
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
        </div>
      )}
    </div>
  );

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

        <div className="sm:text-right space-y-0.5">
          <p className="text-xs text-slate-600">Tahap Saat Ini</p>
          <p className="text-sm font-semibold text-slate-900">
            {isProsesBank ? "Proses Bank (KPR)" : currentStage.label}
          </p>
          <p className="text-xs text-slate-600">
            {isProsesBank ? "Proses Bank" : humanize(currentStage.macro)}
          </p>
          {rencanaAkadAt && !initialTglAkad && (
            <div className="flex items-center justify-start sm:justify-end gap-1.5 pt-0.5">
              <span className="text-[11px] text-slate-500">Rencana Akad: {rencanaAkadAt}</span>
              {rencanaAkadAt < todayWIB() && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-bold">
                  Terlambat
                </span>
              )}
            </div>
          )}
          {rencanaBastAt && !initialTglBast && (
            <div className="flex items-center justify-start sm:justify-end gap-1.5 pt-0.5">
              <span className="text-[11px] text-slate-500">Rencana BAST: {rencanaBastAt}</span>
              {rencanaBastAt < todayWIB() && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-bold">
                  Terlambat
                </span>
              )}
            </div>
          )}
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
                  Unit telah resmi diserahterimakan kepada konsumen. Seluruh tahapan transaksi telah selesai.
                </p>
              </div>
            </div>

            {/* Read-only BAST Checklist View */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Home className="h-4 w-4 text-teal-700" aria-hidden="true" />
                  Checklist Serah Terima Unit (BAST)
                </h4>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  {isKavling
                    ? "Lahan Terverifikasi"
                    : `${effectiveChecklistBast.filter((b) => b.status === "LENGKAP").length}/${MASTER_BAST_ITEMS.length} Item Lengkap`}
                </span>
              </div>

              {isKavling ? (
                <p className="text-xs text-slate-600">
                  Unit kavling telah selesai diserahterimakan beserta verifikasi patok batas lahan.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {MASTER_BAST_ITEMS.map((item) => {
                    const found = effectiveChecklistBast.find((b) => b.item === item.key);
                    const isLengkap = found?.status === "LENGKAP";

                    return (
                      <div
                        key={item.key}
                        className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs ${isLengkap
                            ? "border-emerald-200 bg-emerald-50/40 text-emerald-950"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}
                      >
                        <CheckCircle2
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isLengkap ? "text-emerald-600" : "text-slate-400"
                            }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-semibold">{item.title}</p>
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${isLengkap
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-100 text-slate-600"
                                }`}
                            >
                              {isLengkap ? "Lengkap" : "Belum Lengkap"}
                            </span>
                          </div>
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

        {/* ─── 1. READ-ONLY MACRO PROGRESS TRACKER ─── */}
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
                          {isProsesBank ? "Proses Pengajuan Bank" : currentStage.label}
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

        {/* ─── 2. "AKSI BERIKUTNYA" CARD ─── */}
        {!isTerminal && (
          <section className="rounded-xl border border-teal-200/80 bg-white p-5 shadow-sm space-y-5 ring-1 ring-teal-600/10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                  Aksi Berikutnya
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {isPemberkasan
                    ? "Checklist Penerimaan Dokumen Pemberkasan"
                    : isProsesBank
                      ? "Proses Pengajuan Bank & Kelengkapan Dokumen"
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

            {/* ── STAGE A: PEMBERKASAN (CHECKLIST PENERIMAAN FISIK) ── */}
            {isPemberkasan && (
              <div className="space-y-4">
                {renderDocumentChecklist()}

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
                          ? `Lengkapi seluruh ${blockingRequiredDocs.length} dokumen wajib di atas (selain FPPA) sebelum mengajukan berkas ke Bank.`
                          : undefined
                      }
                    />
                  </div>
                ) : (
                  /* CTA for Cash */
                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-500">
                      Setelah berkas lengkap, transaksi dapat dilanjutkan ke tahap pembayaran.
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

            {/* ── STAGE B: PROSES BANK (KPR) ── */}
            {isProsesBank && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800">
                        Pengajuan &amp; Status Bank Penyalur
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                        Status perbankan dikelola secara independen per bank. Anda dapat memproses beberapa bank secara paralel, mencatat penolakan, atau menambah bank penyalur lainnya.
                      </p>
                    </div>
                  </div>

                  <KprSubmissionSection
                    transaksiId={transaksiId}
                    initialPengajuan={initialPengajuanKpr}
                    masterBanks={masterBanks}
                    currentTahapDetail={currentStage.detail}
                    canEdit={canEdit}
                    hideHeader={true}
                  />

                  {/* Form Akad Kredit aktif jika minimal satu bank SP3K */}
                  {hasSp3k && (
                    <form
                      onSubmit={handlePrimarySubmit}
                      noValidate
                      className="space-y-4 rounded-xl border border-teal-300 bg-teal-50/50 p-4 shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-teal-200/80 pb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-teal-700" />
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-teal-800">
                              Persetujuan Bank (SP3K Terbit)
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                              Bank Pembiaya: {approvedBankNames}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-md border border-teal-300 bg-white px-2.5 py-1 text-xs font-bold text-teal-800">
                          Siap Akad Kredit
                        </span>
                      </div>

                      {/* Radio group jika lebih dari satu bank SP3K */}
                      {sp3kSubmissions.length > 1 && (
                        <div className="rounded-lg border border-teal-200 bg-white p-3 space-y-2">
                          <label className="block text-xs font-bold text-slate-800">
                            Pilih Bank Pembiaya Utama (SP3K Terpilih) <span className="text-red-600">*</span>
                          </label>
                          <p className="text-[11px] text-slate-600">
                            Terdapat {sp3kSubmissions.length} pengajuan berstatus SP3K. Pilih satu bank yang dipilih konsumen untuk pelaksanaan akad kredit.
                          </p>
                          <div className="space-y-2 pt-1">
                            {sp3kSubmissions.map((sub) => {
                              const isSelected = effectiveSelectedPengajuanId === sub.id;
                              return (
                                <label
                                  key={sub.id}
                                  className={`flex items-center justify-between rounded-lg border p-2.5 text-xs cursor-pointer transition-colors ${isSelected
                                      ? "border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-600/30"
                                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                                    }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <input
                                      type="radio"
                                      name="pengajuanTerpilihRadio"
                                      checked={isSelected}
                                      onChange={() => setSelectedPengajuanId(sub.id)}
                                      disabled={!canEdit || isPending}
                                      className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="font-semibold">{sub.bank.nama}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono text-emerald-700 text-xs font-semibold">
                                      SP3K #{sub.nomor_pengajuan}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

                        <Field id="fld-rencanaAkad" label="Rencana Tanggal Akad" error={formErrors.rencanaAkad}>
                          <input
                            id="fld-rencanaAkad"
                            type="date"
                            value={rencanaAkadAt}
                            disabled={!canEdit || isPending || isSavingJadwal}
                            onChange={(e) => setRencanaAkadAt(e.target.value)}
                            className={inputClass(false)}
                          />
                        </Field>

                        <Field id="fld-tglAkad" label="Tanggal Akad Kredit Aktual" required error={formErrors.tglAkad}>
                          <input
                            id="fld-tglAkad"
                            type="date"
                            max={todayWIB()}
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

                      <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 border-t border-teal-200/60">
                        {canEdit && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isPending || isSavingJadwal}
                              onClick={handleSimpanJadwalAkad}
                              className="text-xs font-semibold border-teal-400 text-teal-800 hover:bg-teal-100"
                            >
                              {isSavingJadwal ? (
                                <>
                                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  Menyimpan Jadwal...
                                </>
                              ) : (
                                "Simpan Jadwal Akad"
                              )}
                            </Button>
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
                                "Akad Sudah Terlaksana"
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </form>
                  )}
                </div>

                {/* Sub-section 2: Kelengkapan Berkas & Dokumen Konsumen */}
                <div className="pt-5 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800">
                        Kelengkapan Berkas &amp; Dokumen Konsumen
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Checklist dokumen tetap dapat diperbarui untuk melengkapi berkas yang menyusul (seperti FPPA) atau berkas tambahan selama proses bank berlangsung.
                      </p>
                    </div>
                  </div>

                  {renderDocumentChecklist()}
                </div>
              </div>
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

                  <Field id="fld-rencanaAkad" label="Rencana Tanggal AJB">
                    <input
                      id="fld-rencanaAkad"
                      type="date"
                      value={rencanaAkadAt}
                      disabled={!canEdit || isPending || isSavingJadwal}
                      onChange={(e) => setRencanaAkadAt(e.target.value)}
                      className={inputClass(false)}
                    />
                  </Field>

                  <Field id="fld-tglAkad" label="Tanggal Pelaksanaan AJB Aktual" required error={formErrors.tglAkad}>
                    <input
                      id="fld-tglAkad"
                      type="date"
                      max={todayWIB()}
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

                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                  {canEdit && nextStage && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending || isSavingJadwal}
                        onClick={handleSimpanJadwalAkad}
                        className="text-xs font-semibold border-teal-400 text-teal-800 hover:bg-teal-100"
                      >
                        {isSavingJadwal ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Menyimpan Jadwal...
                          </>
                        ) : (
                          "Simpan Jadwal AJB"
                        )}
                      </Button>
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
                          "AJB Sudah Terlaksana"
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </form>
            )}

            {/* ── STAGE E: AKAD -> BAST (KPR AKAD KREDIT ATAU CASH AJB) ── */}
            {isAkadStage && (
              <form onSubmit={handlePrimarySubmit} noValidate className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-lg">
                  <Field id="fld-rencanaBast" label="Rencana Tanggal Serah Terima">
                    <input
                      id="fld-rencanaBast"
                      type="date"
                      value={rencanaBastAt}
                      disabled={!canEdit || isPending || isSavingJadwal}
                      onChange={(e) => setRencanaBastAt(e.target.value)}
                      className={inputClass(false)}
                    />
                  </Field>

                  <Field id="fld-tglBast" label="Tanggal Serah Terima (BAST) Aktual" required error={formErrors.tglBast}>
                    <input
                      id="fld-tglBast"
                      type="date"
                      max={todayWIB()}
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

                <div className="pt-1 flex justify-start">
                  {canEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending || isSavingJadwal}
                      onClick={handleSimpanJadwalBast}
                      className="text-xs font-semibold border-teal-400 text-teal-800 hover:bg-teal-100"
                    >
                      {isSavingJadwal ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Menyimpan Rencana...
                        </>
                      ) : (
                        "Simpan Rencana BAST"
                      )}
                    </Button>
                  )}
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
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Checklist Serah Terima Fisik Unit
                        </h4>
                        <p className="text-xs text-slate-600">
                          Pastikan seluruh item berikut telah diterima dan diverifikasi fisik sebelum menyelesaikan BAST.
                        </p>
                      </div>
                      <span
                        className={`rounded-md border px-2.5 py-1 text-xs font-bold ${lengkapBastCount === MASTER_BAST_ITEMS.length
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                      >
                        {lengkapBastCount}/{MASTER_BAST_ITEMS.length} Lengkap
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {MASTER_BAST_ITEMS.map((item) => {
                        const itemState = checklistMap[item.key] || {
                          status: "BELUM_LENGKAP",
                          catatan: "",
                        };
                        const isSavingThis = Boolean(savingItems[item.key]);
                        const isLengkap = itemState.status === "LENGKAP";

                        return (
                          <div
                            key={item.key}
                            className={`flex flex-col justify-between rounded-lg border p-3.5 text-xs transition-colors ${isLengkap
                                ? "border-teal-300 bg-teal-50/40"
                                : "border-slate-200 bg-white"
                              }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-slate-900">
                                  {item.title}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isSavingThis && (
                                    <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                                  )}
                                  <span
                                    className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${isLengkap
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : "border-slate-200 bg-slate-100 text-slate-500"
                                      }`}
                                  >
                                    {isLengkap ? "Lengkap" : "Belum Lengkap"}
                                  </span>
                                </div>
                              </div>

                              <p className="mt-1 text-[11px] text-slate-500">
                                {item.description}
                              </p>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[11px] text-slate-500">
                                {isLengkap ? "Fisik telah diterima" : "Belum diperiksa/diterima"}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant={isLengkap ? "outline" : "default"}
                                disabled={!canEdit || isPending || isSavingThis}
                                onClick={() => handleToggleBastItem(item.key)}
                                className={`h-7 px-2.5 text-xs font-semibold ${isLengkap
                                    ? "border-slate-300 text-slate-700 hover:bg-slate-100"
                                    : "bg-teal-700 text-white hover:bg-teal-800"
                                  }`}
                              >
                                {isLengkap ? (
                                  <>
                                    <Check className="mr-1 h-3 w-3 text-emerald-600" />
                                    Tandai Belum Lengkap
                                  </>
                                ) : (
                                  <>
                                    <Check className="mr-1 h-3 w-3" />
                                    Tandai Lengkap
                                  </>
                                )}
                              </Button>
                            </div>
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
                            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
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
                          <Ban className="mr-1.5 h-3.5 w-3.5" />
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
