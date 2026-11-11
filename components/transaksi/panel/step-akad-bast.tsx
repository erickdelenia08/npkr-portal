"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Home,
  CheckCircle2,
  Calendar,
  SlidersHorizontal,
  Loader2,
  ArrowRight,
  Check,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StickyActionBar } from "./sticky-action-bar";
import {
  updateTransactionStatus,
  simpanJadwalTransaksi,
} from "@/actions/transaksi.action";
import { updateChecklistBAST } from "@/actions/bast.action";
import { todayWIB, toWibDay } from "@/lib/date/wib";
import type {
  TahapDetail,
  MetodeBayar,
  ItemBAST,
  StatusBAST,
} from "@/generated/prisma";
import type { PengajuanKPRItem } from "@/components/forms/kpr-submission-section";
import type { ChecklistBastPropItem } from "@/components/forms/dynamic-action-panel";

export interface BastItemDef {
  key: ItemBAST;
  title: string;
  description: string;
}

export const MASTER_BAST_ITEMS: BastItemDef[] = [
  {
    key: "PONDASI_STRUKTUR",
    title: "Pondasi & Struktur",
    description:
      "Sloof, kolom praktis, ring balok, dan kestabilan struktur bangunan.",
  },
  {
    key: "DINDING_PLESTER_CAT",
    title: "Dinding, Plesteran & Cat",
    description:
      "Plesteran aci halus, kerapihan cat, bebas retak rambut, dan tidak lembab.",
  },
  {
    key: "ATAP_PLAFON",
    title: "Rangka Atap & Plafon",
    description:
      "Kerapihan plafon gypsum/GRC, rangka baja ringan, dan bebas kebocoran.",
  },
  {
    key: "LANTAI_KERAMIK",
    title: "Lantai & Keramik",
    description:
      "Keramik terpasang rata, nat terisi penuh, tidak ada keramik kopong / pecah.",
  },
  {
    key: "KUSEN_PINTU_JENDELA",
    title: "Kusen, Pintu & Jendela",
    description:
      "Engsel, handle, kunci berfungsi normal, daun pintu/jendela menutup presisi.",
  },
  {
    key: "KELISTRIKAN",
    title: "Kelistrikan & Penerangan",
    description:
      "Semua stop kontak, saklar, fiting lampu menyala normal, MCB aman.",
  },
  {
    key: "SANITASI_AIR_POMPA",
    title: "Sanitasi, Kran & Pompa Air",
    description:
      "Kran mengalir lancar, pompa berfungsi, closet, floor drain normal.",
  },
  {
    key: "FASAD_KEBERSIHAN",
    title: "Fasad & Kebersihan Akhir",
    description:
      "Tampilan eksterior rapih, sisa puing material dibersihkan, halaman siap huni.",
  },
];

export interface StepAkadBastProps {
  transaksiId: number;
  leadId: number;
  version: number;
  metodeBayar: MetodeBayar;
  kategoriUnit: "SUBSIDI" | "KOMERSIL" | "KAVLING";
  currentTahapDetail: TahapDetail | string;
  isViewStepActive: boolean;
  canEdit?: boolean;
  initialNotaris?: string | null;
  initialTglAkad?: string | null;
  initialTglAjb?: string | null;
  initialTglBast?: string | null;
  initialRencanaBast?: string | null;
  initialPengajuanTerpilihId?: number | null;
  initialPengajuanKpr?: PengajuanKPRItem[];
  initialChecklistBast?: ChecklistBastPropItem[];
  onOpenOtherOptions: () => void;
  onReturnToActive: () => void;
}

export function StepAkadBast({
  transaksiId,
  leadId,
  version,
  metodeBayar,
  kategoriUnit,
  currentTahapDetail,
  isViewStepActive,
  canEdit = true,
  initialNotaris,
  initialTglAkad,
  initialTglAjb,
  initialTglBast,
  initialRencanaBast,
  initialPengajuanTerpilihId,
  initialPengajuanKpr = [],
  initialChecklistBast = [],
  onOpenOtherOptions,
  onReturnToActive,
}: StepAkadBastProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSavingJadwal, startJadwalTransition] = useTransition();

  const isCompleted = currentTahapDetail === "BAST";
  const isCancelled = currentTahapDetail === "BATAL";
  const isKavling = kategoriUnit === "KAVLING";
  const today = todayWIB();

  const [tglBast, setTglBast] = useState(
    initialTglBast ? toWibDay(initialTglBast) : today
  );
  const [rencanaBastAt, setRencanaBastAt] = useState(
    initialRencanaBast ? toWibDay(initialRencanaBast) : ""
  );
  const [lahanChecked, setLahanChecked] = useState(isCompleted);

  const [checklistMap, setChecklistMap] = useState<
    Record<ItemBAST, { status: StatusBAST }>
  >(() => {
    const map = {} as Record<ItemBAST, { status: StatusBAST }>;
    MASTER_BAST_ITEMS.forEach((def) => {
      const found = initialChecklistBast.find((x) => x.item === def.key);
      map[def.key] = {
        status: found?.status ?? "BELUM_LENGKAP",
      };
    });
    return map;
  });

  const [savingItems, setSavingItems] = useState<
    Partial<Record<ItemBAST, boolean>>
  >({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const bankTerpilih = useMemo(() => {
    if (initialPengajuanTerpilihId) {
      return initialPengajuanKpr.find((p) => p.id === initialPengajuanTerpilihId);
    }
    return initialPengajuanKpr.find((p) => p.status === "SP3K");
  }, [initialPengajuanKpr, initialPengajuanTerpilihId]);

  const tglAkadDisplay = initialTglAkad
    ? toWibDay(initialTglAkad)
    : initialTglAjb
      ? toWibDay(initialTglAjb)
      : "-";

  const lengkapBastCount = useMemo(() => {
    return MASTER_BAST_ITEMS.filter(
      (item) => checklistMap[item.key]?.status === "LENGKAP"
    ).length;
  }, [checklistMap]);

  const isBastFormComplete = isKavling
    ? lahanChecked
    : lengkapBastCount === MASTER_BAST_ITEMS.length;

  const handleToggleBastItem = async (key: ItemBAST) => {
    if (!canEdit || isPending || isCompleted || isCancelled || savingItems[key])
      return;

    const currentItem = checklistMap[key] || { status: "BELUM_LENGKAP" };
    const newStatus: StatusBAST =
      currentItem.status === "LENGKAP" ? "BELUM_LENGKAP" : "LENGKAP";

    // Optimistic UI update
    setChecklistMap((prev) => ({
      ...prev,
      [key]: { status: newStatus },
    }));
    setSavingItems((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await updateChecklistBAST({
        transaksiId,
        item: key,
        status: newStatus,
      });

      if (!res.success) {
        setChecklistMap((prev) => ({ ...prev, [key]: currentItem }));
        toast.error(res.error || "Gagal memperbarui checklist serah terima.");
      } else {
        toast.success(res.message || "Status serah terima berhasil diperbarui.");
      }
    } catch (err: unknown) {
      setChecklistMap((prev) => ({ ...prev, [key]: currentItem }));
      toast.error(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem."
      );
    } finally {
      setSavingItems((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSaveRencanaBast = () => {
    if (!canEdit) return;

    startJadwalTransition(async () => {
      try {
        const res = await simpanJadwalTransaksi({
          transaksiId,
          version,
          rencanaBastAt: rencanaBastAt || null,
        });

        if (!res.success) {
          toast.error(res.error || "Gagal menyimpan rencana BAST.");
          return;
        }

        toast.success(res.message || "Rencana tanggal BAST berhasil disimpan.");
        router.refresh();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Terjadi kesalahan sistem."
        );
      }
    });
  };

  const handleExecuteBast = () => {
    setConfirmOpen(false);
    startTransition(async () => {
      try {
        const res = await updateTransactionStatus({
          transaksiId,
          leadId,
          tahapDetail: "BAST",
          fromDetail: currentTahapDetail as TahapDetail,
          version,
          tglBast: tglBast || null,
          lahanConfirmed: isKavling ? lahanChecked : null,
        });

        if (!res.success) {
          toast.error(res.error || "Gagal menyelesaikan serah terima (BAST).");
          return;
        }

        toast.success(
          res.message || "Serah terima (BAST) berhasil diselesaikan! Transaksi selesai."
        );
        router.refresh();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Terjadi kesalahan sistem."
        );
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* ─── Completion Banner if BAST ─── */}
      {isCompleted && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-950">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold">
              Transaksi Selesai — Serah Terima Unit (BAST)
            </h3>
            <p className="text-xs text-emerald-900 mt-0.5 leading-relaxed">
              Unit telah resmi diserahterimakan kepada konsumen beserta kunci dan berita acara serah terima. Seluruh tahapan transaksi telah tuntas.
            </p>
          </div>
        </div>
      )}

      {/* ─── Akad / AJB Execution Summary ─── */}
      <div className="bg-white rounded-xl border border-mist p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-mist/70 pb-3">
          <h3 className="text-sm font-bold text-carbon-ink flex items-center gap-2">
            <Award className="w-4 h-4 text-deep-teal" />
            <span>Realisasi Akad / AJB</span>
          </h3>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Terlaksana
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-lg border border-mist bg-bone/30">
            <span className="block text-[11px] text-slate font-medium">
              Tanggal Pelaksanaan
            </span>
            <span className="font-mono font-bold text-carbon-ink">
              {tglAkadDisplay}
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-mist bg-bone/30">
            <span className="block text-[11px] text-slate font-medium">
              Notaris / PPAT
            </span>
            <span className="font-semibold text-carbon-ink">
              {initialNotaris || "-"}
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-mist bg-bone/30">
            <span className="block text-[11px] text-slate font-medium">
              {metodeBayar === "KPR" ? "Bank Pembiaya (SP3K)" : "Skema Transaksi"}
            </span>
            <span className="font-semibold text-carbon-ink">
              {metodeBayar === "KPR"
                ? bankTerpilih?.bank.nama || "Bank SP3K"
                : metodeBayar}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Inspection Checklist (BAST) ─── */}
      <div className="bg-white rounded-xl border border-mist p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-mist/70 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-carbon-ink tracking-tight flex items-center gap-2">
              <Home className="w-4 h-4 text-deep-teal" />
              <span>Verifikasi Fisik Serah Terima Unit (BAST)</span>
            </h3>
            <p className="text-xs text-slate mt-0.5">
              {isKavling
                ? "Konfirmasi verifikasi patok batas lahan dan aksesibilitas kavling."
                : "Seluruh item fisik wajib berstatus Lengkap sebelum penandatanganan Berita Acara."}
            </p>
          </div>

          <span
            className={`px-2.5 py-1 rounded-md text-xs font-bold border shrink-0 ${isBastFormComplete
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-bone text-graphite border-mist"
              }`}
          >
            {isKavling
              ? lahanChecked
                ? "Lahan Terkonfirmasi"
                : "Belum Dikonfirmasi"
              : `${lengkapBastCount}/${MASTER_BAST_ITEMS.length} Item Lengkap`}
          </span>
        </div>

        {isKavling ? (
          <div className="rounded-xl space-y-3">
            <label
              htmlFor="bast-kavling-check"
              className="flex items-start gap-3 p-3 rounded-lg border border-mist bg-white cursor-pointer hover:bg-bone/40 transition-colors"
            >
              <input
                id="bast-kavling-check"
                type="checkbox"
                checked={lahanChecked}
                disabled={!canEdit || isPending || isCompleted}
                onChange={(e) => setLahanChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-deep-teal focus:ring-deep-teal disabled:opacity-60"
              />
              <div className="text-xs">
                <span className="font-bold text-carbon-ink block">
                  Konfirmasi Serah Terima Fisik Lahan Kavling
                </span>
                <span className="text-slate block mt-0.5">
                  Patok batas tanah kavling telah diverifikasi di lapangan bersama konsumen dan siap diserahterimakan.
                </span>
              </div>
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MASTER_BAST_ITEMS.map((item) => {
              const itemState = checklistMap[item.key] || {
                status: "BELUM_LENGKAP",
              };
              const isSavingThis = Boolean(savingItems[item.key]);
              const isLengkap = itemState.status === "LENGKAP";

              return (
                <div
                  key={item.key}
                  className={`flex flex-col justify-between p-3.5 rounded-lg border transition-all text-xs ${isLengkap
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-mist bg-white"
                    }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-carbon-ink">
                        {item.title}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSavingThis && (
                          <Loader2 className="w-3 h-3 animate-spin text-steel" />
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${isLengkap
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-bone text-steel border-mist"
                            }`}
                        >
                          {isLengkap ? "Lengkap" : "Belum Lengkap"}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {!isCompleted && canEdit && (
                    <div className="mt-3 pt-2.5 border-t border-mist/70 flex items-center justify-between">
                      <span className="text-[11px] text-slate">
                        {isLengkap ? "Fisik terverifikasi" : "Belum diperiksa"}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant={isLengkap ? "outline" : "default"}
                        disabled={isPending || isSavingThis}
                        onClick={() => handleToggleBastItem(item.key)}
                        className={`h-7 px-2.5 text-xs font-semibold ${isLengkap
                          ? "border-mist text-graphite hover:bg-bone"
                          : "bg-deep-teal hover:bg-teal-900 text-white"
                          }`}
                      >
                        {isLengkap ? (
                          <>
                            <Check className="mr-1 w-3 h-3 text-emerald-600" />
                            Tandai Belum
                          </>
                        ) : (
                          <>
                            <Check className="mr-1 w-3 h-3" />
                            Tandai Lengkap
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Schedule & Actual Date Input ─── */}
      {!isCompleted && (
        <div className="bg-white rounded-xl border border-mist p-4 sm:p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-carbon-ink flex items-center gap-2">
            <Calendar className="w-4 h-4 text-deep-teal" />
            <span>Jadwal Serah Terima Unit</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div className="space-y-1.5">
              <label
                htmlFor="fld-rencanaBast"
                className="block text-xs font-semibold text-carbon-ink"
              >
                Rencana Tanggal BAST
              </label>
              <input
                id="fld-rencanaBast"
                type="date"
                value={rencanaBastAt}
                disabled={!canEdit || isPending || isSavingJadwal}
                onChange={(e) => setRencanaBastAt(e.target.value)}
                className="w-full rounded-lg border border-mist bg-white px-3 py-2 text-xs focus:border-deep-teal focus:outline-none"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canEdit || isPending || isSavingJadwal}
                onClick={handleSaveRencanaBast}
                className="text-xs h-7 mt-1 border-mist text-graphite"
              >
                {isSavingJadwal ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : null}
                <span>Simpan Rencana</span>
              </Button>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="fld-tglBast"
                className="block text-xs font-semibold text-carbon-ink"
              >
                Tanggal BAST Aktual <span className="text-rose-600">*</span>
              </label>
              <input
                id="fld-tglBast"
                type="date"
                max={today}
                value={tglBast}
                disabled={!canEdit || isPending}
                onChange={(e) => setTglBast(e.target.value)}
                className="w-full rounded-lg border border-mist bg-white px-3 py-2 text-xs focus:border-deep-teal focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}


      <ConfirmDialog
        open={confirmOpen}
        pending={isPending}
        title="Selesaikan Serah Terima (BAST)?"
        description={
          <div className="space-y-2 text-xs text-graphite">
            <p>
              Setelah BAST disimpan, transaksi dinyatakan{" "}
              <strong className="text-carbon-ink font-bold">SELESAI</strong> dan tidak dapat diubah lagi.
            </p>
            <p>
              Pastikan serah terima fisik unit dan penandatanganan Berita Acara Serah Terima telah dilakukan bersama konsumen.
            </p>
          </div>
        }
        confirmLabel="Ya, Selesaikan BAST"
        tone="default"
        onConfirm={handleExecuteBast}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* ─── Sticky Action Bar ─── */}
      <StickyActionBar
        statusText={
          isCompleted ? (
            <span className="text-emerald-700 font-medium">
              ✓ Transaksi Selesai (BAST Terbit)
            </span>
          ) : isBastFormComplete ? (
            <span className="text-emerald-700 font-medium">
              ✓ Verifikasi fisik unit lengkap ({lengkapBastCount}/{MASTER_BAST_ITEMS.length})
            </span>
          ) : (
            <span className="text-amber-700 font-medium">
              {isKavling
                ? "Konfirmasi serah terima lahan belum dicentang"
                : `${MASTER_BAST_ITEMS.length - lengkapBastCount} item inspeksi fisik belum lengkap`}
            </span>
          )
        }
        secondaryAction={
          <>
            {canEdit && !isCompleted && !isCancelled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenOtherOptions}
                className="text-xs h-8 text-graphite border-mist gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-steel" />
              </Button>
            )}
          </>
        }
      >
        {isViewStepActive ? (
          canEdit && !isCompleted && !isCancelled ? (
            <Button
              type="button"
              size="sm"
              disabled={!isBastFormComplete || !tglBast || isPending}
              onClick={() => setConfirmOpen(true)}
              className="bg-deep-teal hover:bg-teal-900 text-white text-xs h-8 font-semibold gap-1.5 shadow-2xs disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Home className="w-3.5 h-3.5" />
              )}
              <span>Selesaikan Serah Terima (BAST)</span>
            </Button>
          ) : null
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={onReturnToActive}
            className="bg-deep-teal hover:bg-teal-900 text-white text-xs h-8 font-semibold gap-1.5 shadow-2xs"
          >
            <span>Kembali ke Tahap Aktif</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </StickyActionBar>
      {/* <span className=" fixed -bottom-[0%] w-full h-20 z-999999 bg-yellow-300">anjiirr</span> */}
    </div>
  );
}
