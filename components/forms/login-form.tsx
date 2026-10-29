"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { loginSchema, LoginInput } from "@/schemas/auth.schema";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);

    try {
      // Call NextAuth signIn with credentials provider.
      // Strictly pass 'username' and 'password' as requested.
      const res = await signIn("credentials", {
        username: data.username.trim(),
        password: data.password,
        redirect: false,
      });

      if (res?.error) {
        toast.error("Username atau password salah. Silakan periksa kembali kredensial Anda.");
        setIsLoading(false);
        return;
      }

      toast.success("Login berhasil! Mengalihkan ke dashboard...");

      // Reload page to let proxy.ts middleware evaluate session and route automatically
      window.location.reload();
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error ? error.message : "Terjadi kesalahan saat proses login";
      toast.error(errorMsg);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Username Field */}
      <div>
        <label
          htmlFor="username"
          className="block text-xs font-semibold text-graphite mb-1.5"
        >
          Username <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate">
            <User className="w-4 h-4" />
          </div>
          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="Masukkan username Anda"
            disabled={isLoading}
            {...register("username")}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal disabled:bg-bone disabled:cursor-not-allowed transition-all"
          />
        </div>
        {errors.username && (
          <p className="text-xs text-rose-500 mt-1">{errors.username.message}</p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-graphite"
          >
            Password <span className="text-rose-500">*</span>
          </label>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Masukkan password Anda"
            disabled={isLoading}
            {...register("password")}
            className="w-full pl-9 pr-10 py-2 text-sm rounded-md border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal disabled:bg-bone disabled:cursor-not-allowed transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={isLoading}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate hover:text-graphite transition-colors"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 text-slate" />
            ) : (
              <Eye className="w-4 h-4 text-slate" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>
        )}
      </div>

      {/* Sign In Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-prism-teal text-white text-sm font-semibold hover:bg-deep-teal shadow-subtle transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-prism-teal/30"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Memverifikasi Kredensial...</span>
            </>
          ) : (
            <>
              <span>Sign In ke Portal</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* System Security Notice */}
      <div className="pt-3 border-mist/70 flex items-center justify-center gap-1.5 text-[11px] text-slate">
        {/* <ShieldCheck className="w-3.5 h-3.5 text-prism-teal shrink-0" />
        <span>Akses Terenkripsi &amp; Terproteksi RBAC</span> */}
        <p>© 2026 PT. Simanduta Surya Sentosa.</p>
      </div>
    </form>
  );
}
