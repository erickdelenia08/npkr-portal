"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Loader2, KeyRound, ShieldAlert } from "lucide-react";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/schemas/profile.schema";
import { changePasswordAction } from "@/actions/profile.action";

export function ChangePasswordForm() {
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: ChangePasswordInput) => {
    try {
      const response = await changePasswordAction(values);

      if (!response.success) {
        toast.error(response.error || "Gagal mengubah kata sandi.");
        return;
      }

      toast.success(response.message || "Kata sandi berhasil diperbarui!");

      // Clear all password inputs immediately
      reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Reset visibility states
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan yang tidak terduga saat memperbarui kata sandi.";
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Password Saat Ini */}
      <div>
        <label
          htmlFor="currentPassword"
          className="block text-xs font-semibold text-graphite mb-1.5"
        >
          Password Saat Ini <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="currentPassword"
            type={showCurrentPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Masukkan password saat ini"
            disabled={isSubmitting}
            {...register("currentPassword")}
            className="w-full pl-9 pr-10 py-2 text-xs md:text-sm rounded-lg border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 disabled:bg-bone disabled:cursor-not-allowed transition-all"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword((prev) => !prev)}
            disabled={isSubmitting}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate hover:text-graphite focus:outline-none"
            aria-label={showCurrentPassword ? "Sembunyikan password saat ini" : "Tampilkan password saat ini"}
          >
            {showCurrentPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {errors.currentPassword && (
          <p className="text-[11px] text-rose-500 mt-1">
            {errors.currentPassword.message}
          </p>
        )}
      </div>

      {/* Password Baru */}
      <div>
        <label
          htmlFor="newPassword"
          className="block text-xs font-semibold text-graphite mb-1.5"
        >
          Password Baru <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate">
            <KeyRound className="w-4 h-4" />
          </div>
          <input
            id="newPassword"
            type={showNewPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            disabled={isSubmitting}
            {...register("newPassword")}
            className="w-full pl-9 pr-10 py-2 text-xs md:text-sm rounded-lg border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 disabled:bg-bone disabled:cursor-not-allowed transition-all"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((prev) => !prev)}
            disabled={isSubmitting}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate hover:text-graphite focus:outline-none"
            aria-label={showNewPassword ? "Sembunyikan password baru" : "Tampilkan password baru"}
          >
            {showNewPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {errors.newPassword && (
          <p className="text-[11px] text-rose-500 mt-1">
            {errors.newPassword.message}
          </p>
        )}
      </div>

      {/* Konfirmasi Password Baru */}
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-xs font-semibold text-graphite mb-1.5"
        >
          Konfirmasi Password Baru <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Ulangi password baru"
            disabled={isSubmitting}
            {...register("confirmPassword")}
            className="w-full pl-9 pr-10 py-2 text-xs md:text-sm rounded-lg border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 disabled:bg-bone disabled:cursor-not-allowed transition-all"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            disabled={isSubmitting}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate hover:text-graphite focus:outline-none"
            aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
          >
            {showConfirmPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-[11px] text-rose-500 mt-1">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Ketentuan Keamanan Password */}
      <div className="p-3 rounded-lg bg-bone/50 border border-mist text-[11px] text-slate space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-graphite">
          <ShieldAlert className="w-3.5 h-3.5 text-steel" />
          <span>Ketentuan Keamanan:</span>
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
          <li>Minimal 8 karakter kombinasi.</li>
          <li>Tidak boleh sama dengan password saat ini.</li>
          <li>Konfirmasi password baru harus identik.</li>
        </ul>
      </div>

      {/* Tombol Submit Ubah Password */}
      <div className="pt-2 flex justify-end border-t border-mist/80">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-graphite text-white hover:bg-slate-800 active:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-slate-400/30"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Memperbarui Password...</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>Ubah Password</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

