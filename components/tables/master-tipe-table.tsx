"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Edit2,
  Trash2,
  Building2,
  Loader2,
  Lock,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { deleteMasterTipe } from "@/actions/master-unit.action";
import type { SerializedMasterTipe } from "@/actions/master-unit.action";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface MasterTipeTableProps {
  data: SerializedMasterTipe[];
  onEdit: (tipe: SerializedMasterTipe) => void;
  onRefresh: () => void;
  isAdmin?: boolean;
}

export function MasterTipeTable({
  data,
  onEdit,
  onRefresh,
  isAdmin = true,
}: MasterTipeTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<SerializedMasterTipe | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenDelete = (tipe: SerializedMasterTipe) => {
    const unitCount = tipe.jumlah_unit ?? tipe._count?.units ?? 0;
    if (unitCount > 0) {
      toast.error(
        `Tidak bisa menghapus: Tipe ini masih digunakan oleh ${unitCount} unit.`
      );
      return;
    }
    setDeleteTarget(tipe);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      try {
        const res = await deleteMasterTipe(deleteTarget.id);
        if (res.success) {
          toast.success(res.message);
          setDeleteTarget(null);
          onRefresh();
        } else {
          toast.error(res.message);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Gagal menghapus tipe";
        toast.error(msg);
      }
    });
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

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-mist p-12 text-center shadow-subtle">
        <div className="w-12 h-12 rounded-full bg-bone text-slate flex items-center justify-center mx-auto mb-3">
          <Building2 className="w-6 h-6 text-steel" />
        </div>
        <h3 className="text-sm font-semibold text-carbon-ink font-heading">
          Belum ada Tipe Unit
        </h3>
        <p className="text-xs text-slate mt-1 max-w-sm mx-auto">
          Mulai dengan membuat tipe unit terlebih dahulu agar blok unit pada siteplan dapat ditentukan.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-mist shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            {/* Table Header */}
            <thead className="bg-bone/60 border-b border-mist text-slate font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Nama Tipe</th>
                <th className="px-5 py-3.5">Kategori</th>
                <th className="px-5 py-3.5">Luas (Bangunan / Tanah)</th>
                <th className="px-5 py-3.5">Harga Dasar</th>
                <th className="px-5 py-3.5 text-center">Dipakai Unit</th>
                {isAdmin && <th className="px-5 py-3.5 text-right">Aksi</th>}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-mist">
              {data.map((tipe) => {
                const unitCount = tipe.jumlah_unit ?? tipe._count?.units ?? 0;
                const formattedPrice = new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(tipe.harga_dasar);

                return (
                  <tr
                    key={tipe.id}
                    className="hover:bg-bone/40 transition-colors"
                  >
                    {/* Nama Tipe */}
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-carbon-ink text-sm font-mono">
                        {tipe.nama_tipe}
                      </span>
                    </td>

                    {/* Kategori */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${getKategoriBadge(
                          tipe.kategori
                        )}`}
                      >
                        {tipe.kategori}
                      </span>
                    </td>

                    {/* Luas */}
                    <td className="px-5 py-3.5 text-slate font-medium">
                      {tipe.kategori === "KAVLING" ? (
                        <span>
                          <span className="text-fog">0 (Kavling)</span> / {tipe.luas_tanah} m²
                        </span>
                      ) : (
                        <span>
                          {tipe.luas_bangunan || 0} m² / {tipe.luas_tanah} m²
                        </span>
                      )}
                    </td>

                    {/* Harga Dasar */}
                    <td className="px-5 py-3.5 font-mono font-semibold text-deep-teal">
                      {formattedPrice}
                    </td>

                    {/* Jumlah Unit Dipakai */}
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          unitCount > 0
                            ? "bg-teal-50 text-deep-teal border border-teal-200"
                            : "bg-bone text-slate"
                        }`}
                      >
                        {unitCount > 0 && <Lock className="w-3 h-3" />}
                        <span>{unitCount} unit</span>
                      </span>
                    </td>

                    {/* Actions */}
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Buat unit dari tipe ini */}
                          <Link
                            href={`/admin/master-unit/setup?tipeId=${tipe.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100/80 text-deep-teal text-[11px] font-semibold transition-colors border border-teal-200/80"
                            title="Buat unit baru di wizard menggunakan tipe ini"
                          >
                            <PlusCircle className="w-3.5 h-3.5 text-prism-teal" />
                            <span>Buat Unit</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => onEdit(tipe)}
                            className="p-1.5 rounded-md text-slate hover:text-graphite hover:bg-bone transition-colors"
                            title="Edit Tipe"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(tipe)}
                            disabled={unitCount > 0}
                            className="p-1.5 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={
                              unitCount > 0
                                ? `Tidak bisa dihapus: masih digunakan oleh ${unitCount} unit`
                                : "Hapus Tipe"
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus Master Tipe"
        description={
          deleteTarget ? (
            <span>
              Apakah Anda yakin ingin menghapus tipe <strong>{deleteTarget.nama_tipe}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </span>
          ) : null
        }
        confirmLabel="Hapus Tipe"
        tone="danger"
        pending={isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
