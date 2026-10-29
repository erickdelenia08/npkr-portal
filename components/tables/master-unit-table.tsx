"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  Trash2,
  Lock,
  MoreVertical,
  History,
  Tag,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { deleteMasterUnit } from "@/actions/master-unit.action";
import type {
  SerializedMasterUnit,
  SerializedMasterTipe,
} from "@/actions/master-unit.action";
import { SetHargaKhususModal } from "@/components/forms/set-harga-khusus-modal";
import { BulkChangeTipeDrawer } from "@/components/forms/bulk-change-tipe-drawer";
import { UnitTipeHistoryDrawer } from "@/components/forms/unit-tipe-history-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface MasterUnitTableProps {
  units: SerializedMasterUnit[];
  tipeList: SerializedMasterTipe[];
  total: number;
  currentPage: number;
  totalPages: number;
  search: string;
  statusFilter: string;
  tipeFilter: number;
  kategoriFilter: string;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: string) => void;
  onTipeChange: (tipeId: number) => void;
  onKategoriChange: (kategori: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onChangeTipe: (unit: SerializedMasterUnit) => void;
  isAdmin?: boolean;
  isLoading?: boolean;
}

export function MasterUnitTable({
  units,
  tipeList,
  total,
  currentPage,
  totalPages,
  search,
  statusFilter,
  tipeFilter,
  kategoriFilter,
  onSearchChange,
  onStatusChange,
  onTipeChange,
  onKategoriChange,
  onPageChange,
  onRefresh,
  onChangeTipe,
  isAdmin = true,
  isLoading = false,
}: MasterUnitTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<SerializedMasterUnit | null>(null);
  const [isPending, startTransition] = useTransition();

  // Modals / Drawers state
  const [hargaKhususUnit, setHargaKhususUnit] = useState<SerializedMasterUnit | null>(null);
  const [historyUnit, setHistoryUnit] = useState<SerializedMasterUnit | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkDrawerOpen, setIsBulkDrawerOpen] = useState<boolean>(false);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Reset selection when page or filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, search, statusFilter, tipeFilter, kategoriFilter]);

  // Selectable units on the current page: only AVAILABLE and not locked
  const selectableUnits = units.filter(
    (u) => u.status_unit === "AVAILABLE" && !u.isLocked
  );

  const isAllSelectableSelected =
    selectableUnits.length > 0 &&
    selectableUnits.every((u) => selectedIds.has(u.id));

  const isPartiallySelected =
    selectableUnits.some((u) => selectedIds.has(u.id)) && !isAllSelectableSelected;

  // Set indeterminate state on select-all checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);

  const toggleSelectAll = () => {
    if (isAllSelectableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableUnits.map((u) => u.id)));
    }
  };

  const toggleSelectOne = (id: number) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const selectedUnits = units.filter((u) => selectedIds.has(u.id));

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      try {
        const res = await deleteMasterUnit(deleteTarget.id);
        if (res.success) {
          toast.success(res.message);
          setDeleteTarget(null);
          onRefresh();
        } else {
          toast.error(res.message);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal menghapus unit";
        toast.error(msg);
      }
    });
  };

  const getStatusBadge = (status: string, isLocked: boolean) => {
    switch (status) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            AVAILABLE
          </span>
        );
      case "HOLD":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            HOLD
          </span>
        );
      case "BOOKED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            BOOKED
          </span>
        );
      case "SOLD":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Lock className="w-3 h-3 text-slate-500" />
            <span>SOLD (Terkunci)</span>
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getKategoriBadge = (kategori: string) => {
    switch (kategori) {
      case "SUBSIDI":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "KOMERSIL":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "KAVLING":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-bone text-graphite border-mist";
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search & Filters */}
      <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama blok (cth: M-1, F-10, A-1)..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all font-mono"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Kategori Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={kategoriFilter}
              onChange={(e) => onKategoriChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-mist bg-white text-xs text-graphite font-medium focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
            >
              <option value="">Semua Kategori</option>
              <option value="SUBSIDI">SUBSIDI</option>
              <option value="KOMERSIL">KOMERSIL</option>
              <option value="KAVLING">KAVLING</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-mist bg-white text-xs text-graphite font-medium focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
            >
              <option value="">Semua Status</option>
              <option value="AVAILABLE">AVAILABLE (Tersedia)</option>
              <option value="PROSES">PROSES (HOLD + BOOKED)</option>
              <option value="HOLD">HOLD (Pengajuan ITJ)</option>
              <option value="BOOKED">BOOKED (Dipesan)</option>
              <option value="SOLD">SOLD (Terjual)</option>
            </select>
          </div>

          {/* Tipe Filter */}
          <div>
            <select
              value={tipeFilter}
              onChange={(e) => onTipeChange(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-md border border-mist bg-white text-xs text-graphite font-medium focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal max-w-[200px] truncate"
            >
              <option value="0">Semua Tipe Unit</option>
              {tipeList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama_tipe} ({t.kategori})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Units Table */}
      <div className="bg-white rounded-lg border border-mist shadow-subtle overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bone/60 border-b border-mist text-slate font-semibold uppercase tracking-wider">
              <tr>
                {isAdmin && (
                  <th className="px-4 py-3.5 w-8">
                    <input
                      ref={selectAllCheckboxRef}
                      type="checkbox"
                      aria-label="Pilih semua unit di halaman ini"
                      checked={isAllSelectableSelected}
                      disabled={selectableUnits.length === 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-prism-teal focus:ring-prism-teal border-mist cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </th>
                )}
                <th className="px-5 py-3.5">Nama Blok</th>
                <th className="px-5 py-3.5">Kategori</th>
                <th className="px-5 py-3.5">Tipe &amp; Dimensi</th>
                <th className="px-5 py-3.5">Harga Dasar</th>
                <th className="px-5 py-3.5">Harga Khusus</th>
                <th className="px-5 py-3.5">Status Unit</th>
                {isAdmin && <th className="px-5 py-3.5 text-right">Aksi</th>}
              </tr>
            </thead>

            <tbody
              className={`divide-y divide-mist transition-opacity duration-150 ${isLoading && units.length > 0 ? "opacity-50 pointer-events-none" : "opacity-100"
                }`}
            >
              {isLoading && units.length === 0 ? (
                // Skeleton loading rows ONLY on initial load
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {isAdmin && (
                      <td className="px-4 py-4 w-8">
                        <div className="w-4 h-4 bg-mist rounded" />
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <div className="h-4 w-12 bg-mist rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-16 bg-mist rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-28 bg-mist rounded mb-1" />
                      <div className="h-3 w-16 bg-mist/60 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-20 bg-mist rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-12 bg-mist rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-5 w-20 bg-mist rounded-full" />
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-4 text-right">
                        <div className="h-7 w-24 bg-mist rounded ml-auto" />
                      </td>
                    )}
                  </tr>
                ))
              ) : units.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-5 py-12 text-center text-slate">
                    Tidak ada unit yang sesuai dengan kriteria pencarian atau filter.
                  </td>
                </tr>
              ) : (
                units.map((unit) => {
                  const isAvailable = unit.status_unit === "AVAILABLE" && !unit.isLocked;
                  const isSelected = selectedIds.has(unit.id);

                  const basePriceFormatted = new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    maximumFractionDigits: 0,
                  }).format(unit.tipe.harga_dasar);

                  const specialPriceFormatted = unit.harga_khusus
                    ? new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }).format(unit.harga_khusus)
                    : null;

                  return (
                    <tr
                      key={unit.id}
                      className={`hover:bg-bone/40 transition-colors ${isSelected ? "bg-teal-50/30" : ""
                        }`}
                    >
                      {/* Checkbox: disabled if not available */}
                      {isAdmin && (
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isAvailable}
                            onChange={() => toggleSelectOne(unit.id)}
                            className="w-4 h-4 rounded text-prism-teal focus:ring-prism-teal border-mist cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                            title={
                              !isAvailable
                                ? "Hanya unit AVAILABLE tanpa transaksi yang dapat dipilih massal"
                                : `Pilih unit ${unit.blok}`
                            }
                          />
                        </td>
                      )}

                      {/* Blok */}
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-sm text-carbon-ink">
                          {unit.blok}
                        </span>
                      </td>

                      {/* Kategori Badge */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${getKategoriBadge(
                            unit.tipe.kategori
                          )}`}
                        >
                          {unit.tipe.kategori}
                        </span>
                      </td>

                      {/* Tipe with LB/LT underneath */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          {/* <span className="font-mono font-bold text-xs text-graphite">
                            {unit.tipe.nama_tipe}
                          </span> */}
                          <span className="text-[11px] text-slate font-medium">
                            {unit.tipe.kategori === "KAVLING" ? (
                              <span>LT: {unit.tipe.luas_tanah} m² (Kavling)</span>
                            ) : (
                              <span>
                                LB: {unit.tipe.luas_bangunan} m² / LT: {unit.tipe.luas_tanah} m²
                              </span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Harga Dasar */}
                      <td className="px-5 py-3.5 font-mono text-slate">
                        {basePriceFormatted}
                      </td>

                      {/* Harga Khusus */}
                      <td className="px-5 py-3.5 font-mono">
                        {specialPriceFormatted ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-deep-teal">
                              {specialPriceFormatted}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-50 text-deep-teal font-medium border border-teal-100">
                              Khusus
                            </span>
                          </div>
                        ) : (
                          <span className="text-fog">-</span>
                        )}
                      </td>

                      {/* Status (Read-Only Badge) */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(unit.status_unit, unit.isLocked)}
                          {unit.isLocked && unit.status_unit !== "SOLD" && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                              title="Unit memiliki transaksi atau pengajuan ITJ aktif."
                            >
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>Terkunci</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      {isAdmin && (
                        <td className="px-5 py-3.5 text-right relative">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {/* Primary Action: Ganti Tipe Button */}
                            <button
                              type="button"
                              onClick={() => onChangeTipe(unit)}
                              disabled={!isAvailable}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md border border-prism-teal/40 text-deep-teal bg-teal-50/50 hover:bg-teal-50 hover:border-prism-teal transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                              title={
                                !isAvailable
                                  ? unit.status_unit !== "AVAILABLE"
                                    ? `Unit berstatus '${unit.status_unit}', tipe tidak bisa diganti`
                                    : "Unit memiliki transaksi aktif, tipe tidak bisa diganti"
                                  : "Ganti tipe unit ini"
                              }
                            >
                              Ganti Tipe
                            </button>

                            {/* Accessible Radix / Base-UI DropdownMenu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className="p-1 rounded-md text-slate hover:text-graphite hover:bg-bone transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                aria-label={`Menu opsi blok ${unit.blok}`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => setHistoryUnit(unit)}
                                  className="gap-2 cursor-pointer text-xs"
                                >
                                  <History className="w-3.5 h-3.5 text-prism-teal" />
                                  <span>Riwayat Perubahan</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => setHargaKhususUnit(unit)}
                                  className="gap-2 cursor-pointer text-xs"
                                >
                                  <Tag className="w-3.5 h-3.5 text-slate" />
                                  <span>Atur Harga Khusus</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  disabled={!isAvailable}
                                  onClick={() => setDeleteTarget(unit)}
                                  className="gap-2 cursor-pointer text-xs text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus Blok</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3 border-t border-mist bg-bone/30 flex items-center justify-between text-xs text-slate">
          <span>
            Total <strong className="text-carbon-ink font-mono">{total}</strong> blok unit terdaftar
          </span>

          <div className="flex items-center gap-2">
            <span>
              Halaman {currentPage} dari {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="p-1 rounded border border-mist bg-white text-slate hover:text-graphite hover:bg-bone disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                className="p-1 rounded border border-mist bg-white text-slate hover:text-graphite hover:bg-bone disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bulk Selection Bar */}
      {selectedUnits.length > 0 && isAdmin && (
        <div className="sticky bottom-4 z-30 p-3.5 bg-carbon-ink text-white rounded-lg shadow-xl border border-carbon-ink/80 flex items-center justify-between animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-prism-teal text-white">
              {selectedUnits.length} Unit Terpilih
            </span>
            <span className="text-xs text-fog hidden sm:inline">
              Pilih tindakan massal untuk unit-unit AVAILABLE di atas.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded text-xs text-fog hover:text-white hover:bg-white/10 transition-colors"
            >
              Batal Pilih
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-prism-teal hover:bg-deep-teal text-white text-xs font-semibold shadow-subtle transition-colors"
            >
              {/* <Sparkles className="w-3.5 h-3.5" /> */}
              <span>Ganti Tipe Massal ({selectedUnits.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Set Harga Khusus */}
      <SetHargaKhususModal
        unit={hargaKhususUnit}
        isOpen={Boolean(hargaKhususUnit)}
        onClose={() => setHargaKhususUnit(null)}
        onSuccess={onRefresh}
      />

      {/* Drawer: Riwayat Perubahan Tipe */}
      <UnitTipeHistoryDrawer
        unit={historyUnit}
        isOpen={Boolean(historyUnit)}
        onClose={() => setHistoryUnit(null)}
      />

      {/* Drawer: Bulk Change Tipe */}
      <BulkChangeTipeDrawer
        selectedUnits={selectedUnits}
        tipeList={tipeList}
        isOpen={isBulkDrawerOpen}
        onClose={() => setIsBulkDrawerOpen(false)}
        onSuccess={() => {
          setSelectedIds(new Set());
          onRefresh();
        }}
      />

      {/* Confirm Delete Unit Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Blok Unit"
        description={
          deleteTarget ? (
            <span>
              Apakah Anda yakin ingin menghapus unit blok <strong>{deleteTarget.blok}</strong>?
              Riwayat perubahan tipe unit ini akan tetap diarsipkan dalam database.
            </span>
          ) : null
        }
        confirmLabel="Hapus Unit"
        tone="danger"
        pending={isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
