"use client";

import React, { useState, useTransition } from "react";
import {
  Edit2,
  Trash2,
  Building2,
  Layers,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import {
  SerializedMasterTipe,
  deleteMasterTipe,
} from "@/actions/master-unit.action";

interface MasterTipeTableProps {
  data: SerializedMasterTipe[];
  onEdit: (tipe: SerializedMasterTipe) => void;
  onRefresh: () => void;
}

export function MasterTipeTable({
  data,
  onEdit,
  onRefresh,
}: MasterTipeTableProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (tipe: SerializedMasterTipe) => {
    if (tipe._count && tipe._count.units > 0) {
      toast.error(
        `Tidak bisa menghapus: Tipe ini masih digunakan oleh ${tipe._count.units} unit.`
      );
      return;
    }

    if (
      !window.confirm(
        `Apakah Anda yakin ingin menghapus tipe '${tipe.nama_tipe}'?`
      )
    ) {
      return;
    }

    setDeleteId(tipe.id);
    startTransition(async () => {
      try {
        const res = await deleteMasterTipe(tipe.id);
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
        <h3 className="text-sm font-semibold text-carbon-ink">
          Belum ada Tipe Unit
        </h3>
        <p className="text-xs text-slate mt-1 max-w-sm mx-auto">
          Klik tombol &quot;Tambah Tipe Unit&quot; untuk menambahkan tipe perumahan
          atau kavling pertama Anda.
        </p>
      </div>
    );
  }

  return (
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
              <th className="px-5 py-3.5 text-center">Unit Terdaftar</th>
              <th className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-mist">
            {data.map((tipe) => {
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
                    <span className="font-semibold text-carbon-ink text-sm">
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
                        <span className="text-fog">-</span> / {tipe.luas_tanah} m²
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

                  {/* Jumlah Unit */}
                  <td className="px-5 py-3.5 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-bone text-graphite text-xs font-semibold">
                      {tipe._count?.units || 0} unit
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
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
                        onClick={() => handleDelete(tipe)}
                        disabled={isPending && deleteId === tipe.id}
                        className="p-1.5 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
                        title="Hapus Tipe"
                      >
                        {isPending && deleteId === tipe.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
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
  );
}
