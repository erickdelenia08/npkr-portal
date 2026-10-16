"use client";

import React, { useState, useTransition } from "react";
import {
  Search,
  Filter,
  Trash2,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Ban,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import {
  SerializedMasterUnit,
  SerializedMasterTipe,
  deleteMasterUnit,
  updateMasterUnit,
} from "@/actions/master-unit.action";

interface MasterUnitTableProps {
  units: SerializedMasterUnit[];
  tipeList: SerializedMasterTipe[];
  total: number;
  currentPage: number;
  totalPages: number;
  search: string;
  statusFilter: string;
  tipeFilter: number;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: string) => void;
  onTipeChange: (tipeId: number) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
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
  onSearchChange,
  onStatusChange,
  onTipeChange,
  onPageChange,
  onRefresh,
}: MasterUnitTableProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (unit: SerializedMasterUnit) => {
    if (unit.status_unit !== "AVAILABLE") {
      toast.error(
        `Unit berstatus '${unit.status_unit}' tidak dapat dihapus langsung.`
      );
      return;
    }

    if (!window.confirm(`Yakin ingin menghapus unit blok '${unit.blok}'?`)) {
      return;
    }

    setDeleteId(unit.id);
    startTransition(async () => {
      try {
        const res = await deleteMasterUnit(unit.id);
        if (res.success) {
          toast.success(res.message);
          onRefresh();
        } else {
          toast.error(res.message);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal menghapus";
        toast.error(msg);
      } finally {
        setDeleteId(null);
      }
    });
  };

  const handleStatusQuickChange = (
    unitId: number,
    newStatus: "AVAILABLE" | "HOLD" | "SOLD"
  ) => {
    setUpdatingId(unitId);
    startTransition(async () => {
      try {
        const res = await updateMasterUnit(unitId, { status_unit: newStatus });
        if (res.success) {
          toast.success(`Status berhasil diubah ke ${newStatus}`);
          onRefresh();
        } else {
          toast.error(res.message);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal mengubah status";
        toast.error(msg);
      } finally {
        setUpdatingId(null);
      }
    });
  };

  const getStatusBadge = (status: string) => {
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
      case "SOLD":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            SOLD
          </span>
        );
      default:
        return <span>{status}</span>;
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
            placeholder="Cari nama blok (cth: F-1, A-1)..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all font-mono"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-mist bg-white text-xs text-graphite font-medium focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
            >
              <option value="">Semua Status</option>
              <option value="AVAILABLE">AVAILABLE (Tersedia)</option>
              <option value="HOLD">HOLD (Pengajuan ITJ)</option>
              <option value="SOLD">SOLD (Terjual)</option>
            </select>
          </div>

          {/* Tipe Filter */}
          <div>
            <select
              value={tipeFilter}
              onChange={(e) => onTipeChange(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-md border border-mist bg-white text-xs text-graphite font-medium focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal max-w-[180px] truncate"
            >
              <option value="0">Semua Tipe Unit</option>
              {tipeList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama_tipe}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Units Table */}
      <div className="bg-white rounded-lg border border-mist shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bone/60 border-b border-mist text-slate font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Nama Blok</th>
                <th className="px-5 py-3.5">Tipe & Kategori</th>
                <th className="px-5 py-3.5">Harga Dasar</th>
                <th className="px-5 py-3.5">Harga Khusus</th>
                <th className="px-5 py-3.5">Status Unit</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-mist">
              {units.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate">
                    Tidak ada unit yang sesuai dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                units.map((unit) => {
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
                      className="hover:bg-bone/40 transition-colors"
                    >
                      {/* Blok */}
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold text-sm text-carbon-ink">
                          {unit.blok}
                        </span>
                      </td>

                      {/* Tipe & Kategori */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-graphite">
                            {unit.tipe.nama_tipe}
                          </span>
                          <span className="text-[10px] text-slate font-medium">
                            {unit.tipe.kategori}
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
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-deep-teal font-medium border border-teal-100">
                              Khusus
                            </span>
                          </div>
                        ) : (
                          <span className="text-fog">-</span>
                        )}
                      </td>

                      {/* Status & Quick Change */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(unit.status_unit)}

                          {/* Inline status switcher */}
                          <select
                            value={unit.status_unit}
                            disabled={updatingId === unit.id}
                            onChange={(e) =>
                              handleStatusQuickChange(
                                unit.id,
                                e.target.value as "AVAILABLE" | "HOLD" | "SOLD"
                              )
                            }
                            className="text-[11px] py-0.5 px-1 rounded border border-mist bg-white text-slate hover:text-graphite cursor-pointer focus:outline-none"
                            title="Ganti status langsung"
                          >
                            <option value="AVAILABLE">AVAILABLE</option>
                            <option value="HOLD">HOLD</option>
                            <option value="SOLD">SOLD</option>
                          </select>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(unit)}
                          disabled={isPending && deleteId === unit.id}
                          className="p-1.5 rounded-md text-slate hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                          title="Hapus Unit"
                        >
                          {isPending && deleteId === unit.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
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
            Total <strong className="text-carbon-ink">{total}</strong> unit
            terdaftar
          </span>

          <div className="flex items-center gap-2">
            <span>
              Halaman {currentPage} dari {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1 rounded border border-mist bg-white text-slate hover:text-graphite hover:bg-bone disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1 rounded border border-mist bg-white text-slate hover:text-graphite hover:bg-bone disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
