"use client";

import React, { useState, useEffect, useMemo, useId, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Layers,
  Building2,
  AlertTriangle,
  FileSpreadsheet,
  MapPin,
  Loader2,
  ChevronDown,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import {
  previewSetupUnits,
  commitSetupUnits,
  getMasterTipeList,
} from "@/actions/master-unit.action";
import type {
  SerializedMasterTipe,
  SetupPreviewResult,
} from "@/actions/master-unit.action";
import {
  normalizeBlok,
  parseExcludeList,
  expandRow,
  detectRowOverlaps,
  SetupRowInput,
  OverlapConflict,
} from "@/lib/unit-setup";
import { MasterTipeForm } from "@/components/forms/master-tipe-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import siteplanData from "@/components/shared/siteplan-data.json";

export interface WizardRow {
  id: string;
  prefix: string;
  nomorMulai: number | string;
  nomorAkhir: number | string;
  kecualiText: string;
  tipeId: number;
}

interface SetupWizardClientProps {
  initialTipeList: SerializedMasterTipe[];
  initialTipeId?: number;
}

export function SetupWizardClient({
  initialTipeList,
  initialTipeId,
}: SetupWizardClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(
    initialTipeList.length === 0 ? 1 : 2
  );
  const [tipeList, setTipeList] = useState<SerializedMasterTipe[]>(initialTipeList);

  // Modal states for creating new tipe
  const [isTipeModalOpen, setIsTipeModalOpen] = useState(false);
  const [targetRowForNewTipe, setTargetRowForNewTipe] = useState<string | null>(null);

  // Excel paste modal state
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelPasteText, setExcelPasteText] = useState("");

  // Wizard Rows in Step 2
  const [rows, setRows] = useState<WizardRow[]>(() => [
    {
      id: "row-1",
      prefix: "A",
      nomorMulai: 1,
      nomorAkhir: 10,
      kecualiText: "",
      tipeId: initialTipeId || 0,
    },
  ]);

  // Expanded row details preview in Step 3
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Server Preview and Commit state
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<SetupPreviewResult | null>(null);
  const [isCommitPending, startCommitTransition] = useTransition();
  const [commitSuccess, setCommitSuccess] = useState<{ count: number } | null>(null);

  // Warn before leaving with unsaved data
  const hasUnsavedChanges = rows.length > 0 && !commitSuccess;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleBackNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (hasUnsavedChanges) {
      if (!window.confirm("Perubahan yang belum disimpan akan hilang. Lanjutkan kembali?")) {
        e.preventDefault();
      }
    }
  };

  const refreshTipeList = async () => {
    const res = await getMasterTipeList();
    if (res.success && res.data) {
      setTipeList(res.data);
    }
  };

  // Convert row to SetupRowInput
  const parsedRows = useMemo((): {
    rowInputs: SetupRowInput[];
    rawList: { rowId: string; bloks: string[]; error?: string }[];
    totalBloks: number;
    hasErrors: boolean;
  } => {
    let total = 0;
    let hasErr = false;

    const rowInputs: SetupRowInput[] = [];
    const rawList: { rowId: string; bloks: string[]; error?: string }[] = [];

    for (const r of rows) {
      const cleanPrefix = r.prefix.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3);
      const mulai = Number(r.nomorMulai);
      const akhir = Number(r.nomorAkhir);

      if (!cleanPrefix || isNaN(mulai) || isNaN(akhir) || mulai < 1 || akhir < mulai) {
        hasErr = true;
        rawList.push({
          rowId: r.id,
          bloks: [],
          error: "Prefix atau rentang nomor tidak valid",
        });
        continue;
      }

      let kec: number[] = [];
      if (r.kecualiText && r.kecualiText.trim()) {
        try {
          kec = parseExcludeList(r.kecualiText);
        } catch {
          hasErr = true;
          rawList.push({
            rowId: r.id,
            bloks: [],
            error: "Format daftar nomor yang dikecualikan tidak valid",
          });
          continue;
        }
      }

      if (!r.tipeId || r.tipeId === 0) {
        hasErr = true;
      }

      const bloks = expandRow({
        prefix: cleanPrefix,
        nomorMulai: mulai,
        nomorAkhir: akhir,
        kecuali: kec,
      });

      total += bloks.length;
      rawList.push({ rowId: r.id, bloks });
      rowInputs.push({
        prefix: cleanPrefix,
        nomorMulai: mulai,
        nomorAkhir: akhir,
        kecuali: kec,
        tipeId: r.tipeId,
      });
    }

    return { rowInputs, rawList, totalBloks: total, hasErrors: hasErr };
  }, [rows]);

  // Check row overlaps
  const overlapConflicts = useMemo(() => {
    return detectRowOverlaps(parsedRows.rowInputs);
  }, [parsedRows.rowInputs]);

  // Add / Duplicate / Remove rows
  const handleAddRow = () => {
    const newId = `row-${Date.now()}`;
    setRows((prev) => [
      ...prev,
      {
        id: newId,
        prefix: "",
        nomorMulai: 1,
        nomorAkhir: 10,
        kecualiText: "",
        tipeId: 0,
      },
    ]);
  };

  const handleDuplicateRow = (rowId: string) => {
    const target = rows.find((r) => r.id === rowId);
    if (!target) return;
    const newId = `row-${Date.now()}`;
    const nextStart = Number(target.nomorAkhir) + 1;
    const count = Number(target.nomorAkhir) - Number(target.nomorMulai);
    const nextEnd = nextStart + count;

    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === rowId);
      const duplicate: WizardRow = {
        ...target,
        id: newId,
        nomorMulai: nextStart > 0 ? nextStart : 1,
        nomorAkhir: nextEnd > 0 ? nextEnd : 10,
      };
      const copy = [...prev];
      copy.splice(idx + 1, 0, duplicate);
      return copy;
    });
  };

  const handleRemoveRow = (rowId: string) => {
    if (rows.length <= 1) {
      toast.error("Minimal harus ada satu baris konfigurasi blok.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleRowChange = <K extends keyof WizardRow>(
    rowId: string,
    field: K,
    val: WizardRow[K]
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: val } : r))
    );
  };

  // Step 2 to Step 3 transition: Fetch preview
  const handleProceedToReview = async () => {
    if (parsedRows.hasErrors) {
      toast.error("Pastikan semua baris memiliki prefix, nomor valid, dan tipe terpilih.");
      return;
    }

    if (parsedRows.totalBloks === 0) {
      toast.error("Tidak ada nomor unit yang dihasilkan.");
      return;
    }

    if (parsedRows.totalBloks > 500) {
      toast.error(`Total unit (${parsedRows.totalBloks}) melebihi batas maksimal 500 unit per setup.`);
      return;
    }

    if (overlapConflicts.length > 0) {
      toast.error(`Terdapat konflik tumpang tindih nomor blok pada prefix ${overlapConflicts[0].prefix}.`);
      return;
    }

    setIsPreviewLoading(true);
    setCurrentStep(3);

    try {
      const res = await previewSetupUnits(parsedRows.rowInputs);
      if (res.success && res.data) {
        setPreviewData(res.data);
      } else {
        toast.error(res.message || "Gagal melakukan pratinjau setup unit");
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Final Commit
  const handleCommit = () => {
    if (!previewData || !previewData.canCommit) {
      toast.error("Masih terdapat konflik data unit. Perbaiki data sebelum menyimpan.");
      return;
    }

    startCommitTransition(async () => {
      try {
        const res = await commitSetupUnits(parsedRows.rowInputs);
        if (res.success) {
          toast.success(res.message);
          setCommitSuccess({ count: previewData.totalBloks });
        } else {
          toast.error(res.message);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal menyimpan unit";
        toast.error(msg);
      }
    });
  };

  // Parse TSV/CSV from Excel
  const handleApplyExcelPaste = () => {
    if (!excelPasteText.trim()) return;

    const lines = excelPasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const newRows: WizardRow[] = [];
    const unmatchedTipes: string[] = [];

    lines.forEach((line, idx) => {
      // Split by tab or comma
      const parts = line.includes("\t")
        ? line.split("\t").map((p) => p.trim())
        : line.split(",").map((p) => p.trim());

      if (parts.length < 3) return;

      const prefix = parts[0].replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3);
      const mulai = parseInt(parts[1], 10);
      const akhir = parseInt(parts[2], 10);
      const namaTipeRaw = parts[3] || "";

      let matchedTipeId = 0;
      if (namaTipeRaw) {
        const found = tipeList.find(
          (t) => t.nama_tipe.toLowerCase() === namaTipeRaw.toLowerCase()
        );
        if (found) {
          matchedTipeId = found.id;
        } else {
          unmatchedTipes.push(namaTipeRaw);
        }
      }

      if (prefix && !isNaN(mulai) && !isNaN(akhir)) {
        newRows.push({
          id: `excel-${Date.now()}-${idx}`,
          prefix,
          nomorMulai: mulai,
          nomorAkhir: akhir,
          kecualiText: parts[4] || "",
          tipeId: matchedTipeId,
        });
      }
    });

    if (newRows.length === 0) {
      toast.error("Format data Excel tidak valid. Gunakan: prefix, mulai, akhir, nama_tipe");
      return;
    }

    setRows(newRows);
    setIsExcelModalOpen(false);
    setExcelPasteText("");

    if (unmatchedTipes.length > 0) {
      toast.warning(
        `${newRows.length} baris diimpor. Perhatian: tipe '${unmatchedTipes.slice(0, 3).join(", ")}' tidak ditemukan di database dan perlu dipilih manual.`
      );
    } else {
      toast.success(`Berhasil mengimpor ${newRows.length} baris dari Excel.`);
    }
  };

  // Unregistered plots from siteplan map
  const unregisteredSiteplanBloks = useMemo(() => {
    const existingBlokSet = new Set<string>();
    // Collect all bloks from existing units
    // (siteplanData has 367 plots)
    return siteplanData.plotPolygons.map((p) => p.blok);
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-mist pb-4">
        <div>
          <Link
            href="/admin/master-unit"
            onClick={handleBackNavigation}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate hover:text-carbon-ink transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Master Unit</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-carbon-ink tracking-tight font-heading">
            Wizard Setup Siteplan Unit
          </h1>
          <p className="text-xs text-slate">
            Inisialisasi nomor unit kavling secara terstruktur dalam 3 langkah mudah
          </p>
        </div>

        {/* Stepper Progress */}
        <div className="flex items-center gap-2">
          {[
            { step: 1, label: "1. Spesifikasi Tipe" },
            { step: 2, label: "2. Konfigurasi Blok" },
            { step: 3, label: "3. Tinjau & Simpan" },
          ].map((item, idx) => (
            <React.Fragment key={item.step}>
              {idx > 0 && <ChevronRight className="w-4 h-4 text-mist shrink-0" />}
              <button
                type="button"
                disabled={commitSuccess !== null || (item.step === 3 && currentStep !== 3)}
                onClick={() => {
                  if (item.step === 1) setCurrentStep(1);
                  if (item.step === 2) setCurrentStep(2);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${currentStep === item.step
                  ? "bg-prism-teal text-white shadow-xs"
                  : currentStep > item.step
                    ? "bg-teal-50 text-deep-teal hover:bg-teal-100/70"
                    : "bg-bone text-slate opacity-60"
                  }`}
              >
                <span>{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* SUCCESS STATE */}
      {commitSuccess ? (
        <div className="bg-white rounded-xl border border-teal-200 shadow-md p-8 sm:p-12 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-carbon-ink font-heading">
              Setup Unit Berhasil Disimpan!
            </h2>
            <p className="text-sm text-slate max-w-md mx-auto">
              Sebanyak <strong>{commitSuccess.count} unit baru</strong> telah berhasil dibuat
              secara permanen dengan status awal <strong>AVAILABLE</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href="/admin/master-unit?tab=daftar"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-prism-teal hover:bg-deep-teal text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <span>Lihat Daftar Unit</span>
            </Link>
            <Link
              href="/admin/master-unit?tab=siteplan"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-bone hover:bg-mist/40 text-carbon-ink text-xs font-semibold border border-mist transition-colors"
            >
              <span>Lihat Peta Siteplan</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* STEP 1: TIPE UNIT */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-mist shadow-xs p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-mist pb-4">
                  <div>
                    <h2 className="text-base font-bold text-carbon-ink font-heading">
                      Daftar Master Tipe Unit
                    </h2>
                    <p className="text-xs text-slate">
                      Pastikan tipe unit yang dibutuhkan untuk blok siteplan sudah terdaftar
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetRowForNewTipe(null);
                      setIsTipeModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-prism-teal hover:bg-deep-teal text-white text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Tipe Baru</span>
                  </button>
                </div>

                {tipeList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate space-y-3">
                    <Building2 className="w-10 h-10 text-slate/30 mx-auto" />
                    <p className="font-semibold text-graphite text-sm">
                      Belum Ada Tipe Unit Terdaftar
                    </p>
                    <p className="max-w-md mx-auto text-slate">
                      Anda harus menambahkan minimal satu tipe unit terlebih dahulu sebelum dapat
                      menginisialisasi nomor blok unit siteplan.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsTipeModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-prism-teal text-white text-xs font-semibold hover:bg-deep-teal transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Buat Tipe Pertama</span>
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-mist rounded-md">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-bone/60 border-b border-mist text-slate font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-2.5">Nama Tipe</th>
                          <th className="px-4 py-2.5">Kategori</th>
                          <th className="px-4 py-2.5">LB / LT</th>
                          <th className="px-4 py-2.5">Harga Dasar</th>
                          <th className="px-4 py-2.5 text-center">Unit Terdaftar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-mist text-graphite">
                        {tipeList.map((t) => (
                          <tr key={t.id} className="hover:bg-bone/30 transition-colors">
                            <td className="px-4 py-2.5 font-mono font-bold text-deep-teal">
                              {t.nama_tipe}
                            </td>
                            <td className="px-4 py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${t.kategori === "SUBSIDI"
                                  ? "bg-amber-100 text-amber-800"
                                  : t.kategori === "KOMERSIL"
                                    ? "bg-teal-100 text-teal-800"
                                    : "bg-slate-200 text-slate-800"
                                  }`}
                              >
                                {t.kategori}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              {t.luas_bangunan} m² / {t.luas_tanah} m²
                            </td>
                            <td className="px-4 py-2.5 font-mono">
                              Rp {t.harga_dasar.toLocaleString("id-ID")}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono font-semibold">
                              {t.jumlah_unit ?? t._count?.units ?? 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bottom Navigation */}
              <div className="flex items-center justify-between">
                <Link
                  href="/admin/master-unit"
                  onClick={handleBackNavigation}
                  className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors"
                >
                  Batal
                </Link>
                <button
                  type="button"
                  disabled={tipeList.length === 0}
                  onClick={() => setCurrentStep(2)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-prism-teal hover:bg-deep-teal text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Lanjut ke Konfigurasi Blok</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: KONFIGURASI BLOK */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Optional Excel Paste bar & Plot Helper */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-teal-50/50 border border-teal-200/80 rounded-lg p-3.5">
                <div className="flex items-center gap-2 text-xs text-deep-teal">
                  {/* <Sparkles className="w-4 h-4 text-prism-teal" /> */}
                  <span>
                    Atur rentang nomor blok per baris. Tanda hubung &apos;-&apos; otomatis ditambahkan pada prefix.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsExcelModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-teal-200 text-deep-teal hover:bg-teal-50 text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
                    <span>Tempel dari Excel</span>
                  </button>
                </div>
              </div>

              {/* Overlap warnings banner */}
              {overlapConflicts.length > 0 && (
                <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Konflik Tumpang Tindih Rentang Blok Terdeteksi:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-700">
                    {overlapConflicts.map((c, idx) => (
                      <li key={idx}>
                        Prefix <strong>{c.prefix}</strong> memiliki nomor yang bertabrakan:{" "}
                        <span className="font-mono">{c.overlappingNumbers.join(", ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Block Setup Table */}
              <div className="bg-white rounded-lg border border-mist shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bone/70 border-b border-mist text-slate font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5 w-24">Prefix</th>
                        <th className="px-3 py-2.5 w-24">No. Mulai</th>
                        <th className="px-3 py-2.5 w-24">No. Akhir</th>
                        <th className="px-3 py-2.5 min-w-[140px]">Kecualikan</th>
                        <th className="px-3 py-2.5 min-w-[200px]">Tipe Unit</th>
                        <th className="px-3 py-2.5 w-20 text-center">Jumlah</th>
                        <th className="px-3 py-2.5 w-24 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mist text-graphite">
                      {rows.map((row, index) => {
                        const parsed = parsedRows.rawList[index];
                        const count = parsed?.bloks.length || 0;
                        const hasRowError = Boolean(parsed?.error);

                        return (
                          <tr
                            key={row.id}
                            className={`hover:bg-bone/20 transition-colors ${hasRowError ? "bg-rose-50/40" : ""
                              }`}
                          >
                            {/* Prefix */}
                            <td className="px-3 py-2">
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  maxLength={3}
                                  placeholder="A"
                                  aria-label={`Prefix Blok Baris ${index + 1}`}
                                  value={row.prefix}
                                  onChange={(e) => {
                                    const clean = e.target.value
                                      .replace(/[^A-Za-z0-9]/g, "")
                                      .toUpperCase()
                                      .slice(0, 3);
                                    handleRowChange(row.id, "prefix", clean);
                                  }}
                                  className="w-full px-2 py-1.5 pr-5 font-mono font-bold uppercase rounded border border-mist text-xs focus:ring-1 focus:ring-prism-teal focus:border-prism-teal text-carbon-ink"
                                />
                                <span className="absolute right-2 text-xs font-bold text-slate pointer-events-none">
                                  -
                                </span>
                              </div>
                            </td>

                            {/* Nomor Mulai */}
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={1}
                                aria-label={`Nomor Mulai Baris ${index + 1}`}
                                value={row.nomorMulai}
                                onChange={(e) =>
                                  handleRowChange(row.id, "nomorMulai", e.target.value)
                                }
                                className="w-full px-2 py-1.5 font-mono rounded border border-mist text-xs focus:ring-1 focus:ring-prism-teal focus:border-prism-teal"
                              />
                            </td>

                            {/* Nomor Akhir */}
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={1}
                                aria-label={`Nomor Akhir Baris ${index + 1}`}
                                value={row.nomorAkhir}
                                onChange={(e) =>
                                  handleRowChange(row.id, "nomorAkhir", e.target.value)
                                }
                                className="w-full px-2 py-1.5 font-mono rounded border border-mist text-xs focus:ring-1 focus:ring-prism-teal focus:border-prism-teal"
                              />
                            </td>

                            {/* Kecualikan */}
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                placeholder="cth: 13, 14, 20-22"
                                aria-label={`Kecualikan Nomor Baris ${index + 1}`}
                                value={row.kecualiText}
                                onChange={(e) =>
                                  handleRowChange(row.id, "kecualiText", e.target.value)
                                }
                                className="w-full px-2 py-1.5 text-xs rounded border border-mist focus:ring-1 focus:ring-prism-teal focus:border-prism-teal font-mono"
                              />
                            </td>

                            {/* Tipe Unit */}
                            <td className="px-3 py-2">
                              <div className="space-y-1">
                                <select
                                  aria-label={`Pilih Tipe Baris ${index + 1}`}
                                  value={row.tipeId}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "create-new") {
                                      setTargetRowForNewTipe(row.id);
                                      setIsTipeModalOpen(true);
                                    } else {
                                      handleRowChange(row.id, "tipeId", Number(val));
                                    }
                                  }}
                                  className="w-full px-2 py-1.5 text-xs rounded border border-mist bg-white focus:ring-1 focus:ring-prism-teal focus:border-prism-teal font-medium"
                                >
                                  <option value={0}>-- Pilih Tipe --</option>
                                  {tipeList.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.nama_tipe} ({t.kategori})
                                    </option>
                                  ))}
                                  <option value="create-new" className="font-bold text-prism-teal">
                                    + Buat tipe baru...
                                  </option>
                                </select>
                              </div>
                            </td>

                            {/* Jumlah Unit */}
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${count > 0
                                  ? "bg-teal-50 text-deep-teal border border-teal-200"
                                  : "bg-bone text-slate"
                                  }`}
                              >
                                {count}
                              </span>
                            </td>

                            {/* Action Buttons */}
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateRow(row.id)}
                                  title="Duplikat baris ini (nomor otomatis berlanjut)"
                                  className="p-1.5 text-slate hover:text-graphite rounded hover:bg-bone transition-colors"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(row.id)}
                                  title="Hapus baris ini"
                                  className="p-1.5 text-slate hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer: Add row & Total calculation */}
                <div className="px-4 py-3 bg-bone/30 border-t border-mist flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-mist text-graphite hover:bg-bone text-xs font-semibold shadow-2xs transition-colors self-start"
                  >
                    <Plus className="w-3.5 h-3.5 text-prism-teal" />
                    <span>Tambah Baris Rentang</span>
                  </button>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate">Total Unit yang Dihasilkan:</span>
                    <span className="font-mono font-bold text-xs text-deep-teal bg-teal-100/70 px-2.5 py-0.5 rounded border border-teal-200">
                      {parsedRows.totalBloks} Unit
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors"
                >
                  Kembali ke Tipe
                </button>
                <button
                  type="button"
                  disabled={
                    parsedRows.hasErrors ||
                    parsedRows.totalBloks === 0 ||
                    overlapConflicts.length > 0 ||
                    parsedRows.totalBloks > 500
                  }
                  onClick={handleProceedToReview}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-prism-teal hover:bg-deep-teal text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Lanjut ke Tinjau &amp; Simpan</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: TINJAU & SIMPAN */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {isPreviewLoading ? (
                <div className="bg-white rounded-lg border border-mist p-12 text-center text-xs text-slate space-y-3">
                  <Loader2 className="w-6 h-6 animate-spin text-prism-teal mx-auto" />
                  <p className="font-medium text-graphite">
                    Memvalidasi data unit dengan database...
                  </p>
                  <p className="text-[11px]">
                    Memeriksa duplikasi blok, nomor yang sudah ada, dan relasi tipe.
                  </p>
                </div>
              ) : previewData ? (
                <div className="space-y-6">
                  {/* Validation Status Banner */}
                  {previewData.canCommit ? (
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <strong className="block font-bold text-sm text-emerald-900">
                            Validasi Berhasil: Siap Disimpan
                          </strong>
                          <span>
                            Semua {previewData.totalBloks} nomor unit valid, tidak ada duplikasi
                            maupun konflik dengan database.
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-base text-emerald-800 bg-white px-3 py-1 rounded border border-emerald-300">
                        {previewData.totalBloks} Unit
                      </span>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Ditemukan Konflik yang Menghalangi Penyimpanan</span>
                      </div>
                      <p className="text-[11px] text-rose-700">
                        Perbaiki konfigurasi blok pada langkah sebelumnya sebelum dapat menyimpan:
                      </p>

                      {previewData.existingBloks.length > 0 && (
                        <div className="pt-1">
                          <span className="font-semibold block">
                            Nomor unit berikut sudah ada di database ({previewData.existingBloks.length} unit):
                          </span>
                          <span className="font-mono text-[11px] block text-rose-900 bg-white/80 p-2 rounded border border-rose-200 mt-1">
                            {previewData.existingBloks.slice(0, 15).join(", ")}
                            {previewData.existingBloks.length > 15 &&
                              ` ... dan ${previewData.existingBloks.length - 15} lainnya`}
                          </span>
                        </div>
                      )}

                      {previewData.batchDuplicates.length > 0 && (
                        <div className="pt-1">
                          <span className="font-semibold block">
                            Duplikasi internal dalam batch konfigurasi:
                          </span>
                          <span className="font-mono text-[11px] block text-rose-900 bg-white/80 p-2 rounded border border-rose-200 mt-1">
                            {previewData.batchDuplicates.join(", ")}
                          </span>
                        </div>
                      )}

                      {previewData.invalidTipes.length > 0 && (
                        <div className="pt-1">
                          <span className="font-semibold block text-rose-900">
                            Terdapat baris dengan Tipe Unit tidak valid atau belum dipilih.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary Breakdown per Tipe */}
                  <div className="bg-white rounded-lg border border-mist shadow-xs p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate">
                      Ringkasan Unit per Tipe
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {previewData.perTipe.map((item) => (
                        <div
                          key={item.tipeId}
                          className="p-3.5 rounded-lg border border-mist bg-bone/30 space-y-1"
                        >
                          <span className="font-mono font-bold text-sm text-deep-teal block">
                            {item.nama_tipe}
                          </span>
                          <div className="flex items-center justify-between text-xs text-slate">
                            <span>Kategori: {item.kategori}</span>
                            <span className="font-mono font-bold text-carbon-ink">
                              {item.count} Unit
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expandable Rows Preview */}
                  <div className="bg-white rounded-lg border border-mist shadow-xs p-5 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate">
                      Rincian Nomor Unit per Baris
                    </h3>
                    <div className="space-y-2">
                      {previewData.perRow.map((rc, idx) => {
                        const isExpanded = expandedRowId === `row-rev-${idx}`;
                        return (
                          <div
                            key={idx}
                            className="border border-mist rounded-md overflow-hidden text-xs"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRowId(isExpanded ? null : `row-rev-${idx}`)
                              }
                              className="w-full px-4 py-2.5 bg-bone/40 hover:bg-bone flex items-center justify-between transition-colors text-left"
                            >
                              <div className="flex items-center gap-2.5 font-mono">
                                <span className="font-bold text-carbon-ink">
                                  Blok Prefix {rc.prefix}
                                </span>
                                {rc.tipe && (
                                  <span className="text-[11px] text-slate">
                                    ({rc.tipe.nama_tipe})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-deep-teal">
                                  {rc.count} Unit
                                </span>
                                <ChevronDown
                                  className={`w-4 h-4 text-slate transition-transform ${isExpanded ? "rotate-180" : ""
                                    }`}
                                />
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="p-3 bg-white border-t border-mist/70">
                                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                                  {rc.bloks.map((b) => (
                                    <span
                                      key={b}
                                      className="px-2 py-0.5 rounded bg-bone border border-mist font-mono text-[11px] text-carbon-ink"
                                    >
                                      {b}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Commit Navigation */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={isCommitPending}
                      onClick={() => setCurrentStep(2)}
                      className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors disabled:opacity-50"
                    >
                      Kembali ke Konfigurasi
                    </button>
                    <button
                      type="button"
                      disabled={!previewData.canCommit || isCommitPending}
                      onClick={handleCommit}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-prism-teal hover:bg-deep-teal text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCommitPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Menyimpan {previewData.totalBloks} Unit...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Simpan {previewData.totalBloks} Unit ke Database</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}

      {/* MODAL: Tambah Tipe In Place */}
      <MasterTipeForm
        isOpen={isTipeModalOpen}
        onClose={() => {
          setIsTipeModalOpen(false);
          setTargetRowForNewTipe(null);
        }}
        onSuccess={async () => {
          await refreshTipeList();
        }}
        onCreated={(newTipe) => {
          if (targetRowForNewTipe) {
            handleRowChange(targetRowForNewTipe, "tipeId", newTipe.id);
          }
          setTargetRowForNewTipe(null);
        }}
        existingTipeList={tipeList}
      />

      {/* MODAL: Tempel dari Excel */}
      <Dialog open={isExcelModalOpen} onOpenChange={setIsExcelModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-mist bg-bone/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-carbon-ink font-heading">
                  Tempel Baris dari Excel / Spreadsheet
                </DialogTitle>
                <DialogDescription className="text-xs text-slate">
                  Salin kolom dari spreadsheet lalu tempel teksnya di bawah ini
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="p-3 rounded-md bg-bone/50 border border-mist text-xs text-slate space-y-1">
              <span className="font-semibold text-graphite block">
                Format kolom per baris (dipisah Tab atau Koma):
              </span>
              <p className="font-mono text-[11px] text-deep-teal">
                prefix, no_mulai, no_akhir, nama_tipe, kecualikan(opsional)
              </p>
              <p className="text-[10px] text-slate">
                Contoh: <code className="font-mono">A, 1, 20, KOMERSIL-36/72, 13</code>
              </p>
            </div>

            <textarea
              rows={6}
              value={excelPasteText}
              onChange={(e) => setExcelPasteText(e.target.value)}
              placeholder="A&#9;1&#9;20&#9;KOMERSIL-36/72&#10;B&#9;1&#9;15&#9;SUBSIDI-30/60"
              className="w-full p-3 font-mono text-xs rounded-md border border-mist focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal outline-none transition-all"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-mist">
              <button
                type="button"
                onClick={() => setIsExcelModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyExcelPaste}
                disabled={!excelPasteText.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-2xs transition-colors disabled:opacity-50"
              >
                Terapkan ke Tabel
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
