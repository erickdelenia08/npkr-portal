"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { User, AtSign, Loader2, Save, Check } from "lucide-react";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/schemas/profile.schema";
import { updateProfileAction } from "@/actions/profile.action";

interface ProfileInfoFormProps {
  initialData: {
    nama: string;
    username: string;
  };
}

export function ProfileInfoForm({ initialData }: ProfileInfoFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      nama: initialData.nama,
      username: initialData.username,
    },
  });

  const onSubmit = async (values: UpdateProfileInput) => {
    setIsSaved(false);

    // Safeguard check for unchanged submission
    if (
      values.nama.trim() === initialData.nama.trim() &&
      values.username.trim().toLowerCase() === initialData.username.trim().toLowerCase()
    ) {
      toast.info("Tidak ada perubahan data profil.");
      return;
    }

    try {
      const response = await updateProfileAction(values);

      if (!response.success) {
        toast.error(response.error || "Gagal memperbarui informasi profil.");
        return;
      }

      toast.success(response.message || "Profil berhasil diperbarui!");
      setIsSaved(true);

      // Reset form default state with new values to mark clean (not dirty)
      reset({
        nama: response.data?.nama ?? values.nama.trim(),
        username: response.data?.username ?? values.username.trim().toLowerCase(),
      });

      // Synchronize client session and trigger server component revalidation
      if (typeof update === "function") {
        await update();
      }
      router.refresh();

      setTimeout(() => setIsSaved(false), 2500);
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan yang tidak diharapkan.";
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Nama Lengkap */}
      <div>
        <label
          htmlFor="nama"
          className="block text-xs font-semibold text-graphite mb-1.5"
        >
          Nama Lengkap <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate">
            <User className="w-4 h-4" />
          </div>
          <input
            id="nama"
            type="text"
            autoComplete="name"
            placeholder="Masukkan nama lengkap Anda"
            disabled={isSubmitting}
            {...register("nama")}
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm rounded-lg border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-bone disabled:cursor-not-allowed transition-all"
          />
        </div>
        {errors.nama ? (
          <p className="text-[11px] text-rose-500 mt-1">{errors.nama.message}</p>
        ) : (
          <p className="text-[11px] text-slate mt-1">
            Nama resmi yang ditampilkan pada sistem, laporan, dan dokumen operasional.
          </p>
        )}
      </div>

      {/* Username */}
      <div>
        <label
          htmlFor="username"
          className="block text-xs font-semibold text-graphite mb-1.5"
        >
          Username <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate">
            <AtSign className="w-4 h-4" />
          </div>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="nama_pengguna"
            disabled={isSubmitting}
            {...register("username")}
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm font-mono rounded-lg border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:bg-bone disabled:cursor-not-allowed transition-all"
          />
        </div>
        {errors.username ? (
          <p className="text-[11px] text-rose-500 mt-1">{errors.username.message}</p>
        ) : (
          <p className="text-[11px] text-slate mt-1">
            Username bersifat unik dan digunakan sebagai kredensial masuk login portal.
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center justify-between gap-3 border-t border-mist/80">
        <span className="text-[11px] text-slate">
          {isDirty ? (
            <span className="text-amber-600 font-medium">Ada perubahan belum disimpan</span>
          ) : (
            <span>Data profil tersinkronisasi</span>
          )}
        </span>

        <button
          type="submit"
          disabled={!isDirty || isSubmitting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : isSaved ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Tersimpan</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Perubahan</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

