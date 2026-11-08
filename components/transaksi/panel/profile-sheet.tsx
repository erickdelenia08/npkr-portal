"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserCheck, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { updateProfilPemberkasan } from "@/actions/transaksi.action";
import type { StatusPernikahan, StatusPekerjaan } from "@/generated/prisma";

export interface ProfileSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transaksiId: number;
  initialStatusPernikahan?: StatusPernikahan | null;
  initialStatusPekerjaan?: StatusPekerjaan | null;
  canEdit?: boolean;
  isReadOnly?: boolean;
}

export function ProfileSheet({
  isOpen,
  onOpenChange,
  transaksiId,
  initialStatusPernikahan,
  initialStatusPekerjaan,
  canEdit = true,
  isReadOnly = false,
}: ProfileSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [statusPernikahan, setStatusPernikahan] = useState<StatusPernikahan | "">(
    initialStatusPernikahan || ""
  );
  const [statusPekerjaan, setStatusPekerjaan] = useState<StatusPekerjaan | "">(
    initialStatusPekerjaan || ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || isReadOnly) return;

    startTransition(async () => {
      const res = await updateProfilPemberkasan({
        transaksiId,
        statusPernikahan: statusPernikahan ? statusPernikahan : null,
        statusPekerjaan: statusPekerjaan ? statusPekerjaan : null,
      });

      if (res.success) {
        toast.success(res.message || "Profil pemberkasan berhasil diperbarui.");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(res.error || "Gagal memperbarui profil pemberkasan.");
      }
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-md sm:side-right sm:h-full">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-deep-teal flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <SheetTitle>Profil Pemberkasan Konsumen</SheetTitle>
              <SheetDescription>
                Tentukan status pernikahan dan pekerjaan konsumen untuk memvalidasi
                daftar berkas yang dipersyaratkan.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Status Pernikahan */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-carbon-ink">
              Status Pernikahan <span className="text-rose-500">*</span>
            </label>
            <select
              value={statusPernikahan}
              onChange={(e) =>
                setStatusPernikahan(e.target.value as StatusPernikahan)
              }
              disabled={isPending || !canEdit || isReadOnly}
              className="w-full h-10 px-3 rounded-lg border border-mist bg-white text-xs font-medium text-carbon-ink focus:border-deep-teal focus:ring-1 focus:ring-deep-teal outline-none"
            >
              <option value="">-- Pilih Status Pernikahan --</option>
              <option value="MENIKAH">Menikah (KTP Suami Istri & Buku Nikah)</option>
              <option value="BELUM_MENIKAH">Belum Menikah (Surat Ket. Belum Menikah)</option>
              <option value="CERAI">Cerai (Akta Cerai / Kematian Pasangan)</option>
            </select>
          </div>

          {/* Status Pekerjaan */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-carbon-ink">
              Status Pekerjaan <span className="text-rose-500">*</span>
            </label>
            <select
              value={statusPekerjaan}
              onChange={(e) =>
                setStatusPekerjaan(e.target.value as StatusPekerjaan)
              }
              disabled={isPending || !canEdit || isReadOnly}
              className="w-full h-10 px-3 rounded-lg border border-mist bg-white text-xs font-medium text-carbon-ink focus:border-deep-teal focus:ring-1 focus:ring-deep-teal outline-none"
            >
              <option value="">-- Pilih Status Pekerjaan --</option>
              <option value="TETAP">Karyawan / Pegawai Tetap</option>
              <option value="TIDAK_TETAP">Wiraswasta / Pegawai Tidak Tetap</option>
            </select>
            <p className="text-[11px] text-slate">
              Catatan: Dokumen yang sebelumnya telah diverifikasi tidak akan dihapus
              jika profil diubah.
            </p>
          </div>

          <SheetFooter className="pt-4 border-t border-mist flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending || !canEdit || isReadOnly}
              className="w-full sm:w-auto bg-deep-teal hover:bg-teal-700 text-white text-xs font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Profil"
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

