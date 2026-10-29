"use client";

import React, { useState, useTransition } from "react";
import { X, Loader2, UserCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  SerializedCustomerDetail,
  updateCustomerIdentity,
} from "@/actions/customer.action";

interface EditCustomerModalProps {
  customer: SerializedCustomerDetail;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: SerializedCustomerDetail) => void;
}

export function EditCustomerModal({
  customer,
  isOpen,
  onClose,
  onSuccess,
}: EditCustomerModalProps) {
  const [namaKtp, setNamaKtp] = useState<string>(customer.nama_ktp);
  const [nik, setNik] = useState<string>(customer.nik);
  const [tempatLahir, setTempatLahir] = useState<string>(customer.tempat_lahir);
  const [tglLahir, setTglLahir] = useState<string>(customer.tgl_lahir);
  const [alamatKtp, setAlamatKtp] = useState<string>(customer.alamat_ktp);
  const [noHp, setNoHp] = useState<string>(customer.no_hp || "");
  const [formError, setFormError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!/^\d{16}$/.test(nik.trim())) {
      setFormError("NIK harus terdiri tepat 16 digit angka.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateCustomerIdentity(customer.id, {
          nama_ktp: namaKtp.trim(),
          nik: nik.trim(),
          tempat_lahir: tempatLahir.trim(),
          tgl_lahir: tglLahir.trim(),
          alamat_ktp: alamatKtp.trim(),
          no_hp: noHp.trim(),
        });

        if (res.success && res.data) {
          toast.success(res.message);
          onSuccess(res.data);
          onClose();
        } else {
          setFormError(res.message);
          toast.error(res.message);
        }
      } catch (error: unknown) {
        const msg =
          error instanceof Error ? error.message : "Terjadi kesalahan sistem";
        setFormError(msg);
        toast.error(msg);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white rounded-lg border border-mist shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-mist bg-bone/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-carbon-ink text-white flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-prism-teal" />
            </div>
            <div>
              <h2 className="text-base font-bold text-carbon-ink tracking-tight font-heading">
                Edit Identitas Customer
              </h2>
              <p className="text-xs text-slate">
                Perbarui data KTP dan kontak resmi di Buku Induk Customer
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate hover:text-graphite hover:bg-bone transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* NIK & No HP in 2 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-graphite mb-1.5">
                NIK (16 Digit) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={16}
                value={nik}
                onChange={(e) => setNik(e.target.value.replace(/\D/g, ""))}
                placeholder="16 digit NIK"
                className="w-full px-3 py-2 text-sm font-mono rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-graphite mb-1.5">
                Nomor Handphone / WA <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="08123456789"
                className="w-full px-3 py-2 text-sm font-mono rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
              />
            </div>
          </div>

          {/* Nama KTP */}
          <div>
            <label className="block text-xs font-semibold text-graphite mb-1.5">
              Nama Lengkap (Sesuai KTP) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={namaKtp}
              onChange={(e) => setNamaKtp(e.target.value)}
              placeholder="Contoh: Ahmad Fauzi"
              className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
            />
          </div>

          {/* Tempat & Tanggal Lahir */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-graphite mb-1.5">
                Tempat Lahir <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={tempatLahir}
                onChange={(e) => setTempatLahir(e.target.value)}
                placeholder="Contoh: Lumajang"
                className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-graphite mb-1.5">
                Tanggal Lahir <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={tglLahir}
                onChange={(e) => setTglLahir(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
              />
            </div>
          </div>

          {/* Alamat KTP */}
          <div>
            <label className="block text-xs font-semibold text-graphite mb-1.5">
              Alamat Lengkap (Sesuai KTP) <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={alamatKtp}
              onChange={(e) => setAlamatKtp(e.target.value)}
              placeholder="Jl. Merdeka No. 12, RT 01 / RW 02, Kelurahan..."
              className="w-full px-3 py-2 text-sm rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all resize-none"
            />
          </div>

          {/* Error Message */}
          {formError && (
            <div className="p-3 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-mist">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Identitas</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
