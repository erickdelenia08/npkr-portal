import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  User as UserIcon,
  Shield,
  Phone,
  KeyRound,
  CheckCircle2,
  AtSign,
} from "lucide-react";
import { ProfileInfoForm } from "@/components/forms/profile-info-form";
import { ChangePasswordForm } from "@/components/forms/change-password-form";

export const metadata: Metadata = {
  title: "Pengaturan Profil | NPKR Portal",
  description: "Kelola profil dan kredensial akun pengguna NPKR Property",
};

export default async function ProfileSettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userId = Number(session.user.id);
  const dbUser =
    Number.isSafeInteger(userId) && userId > 0
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            nama: true,
            username: true,
            no_hp: true,
            role: true,
            isActive: true,
          },
        })
      : null;

  if (dbUser && !dbUser.isActive) {
    redirect("/login");
  }

  const displayName = dbUser?.nama || session.user.name || "Pengguna Portal";
  const displayUsername = dbUser?.username || "";
  const displayRole = (dbUser?.role || session.user.role || "MARKETING").toUpperCase();
  const displayPhone = dbUser?.no_hp || "-";
  const initial = displayName.charAt(0).toUpperCase();

  const getRoleBadgeStyle = (role: string) => {
    switch (role.toUpperCase()) {
      case "ADMIN":
        return "bg-slate-100 text-slate-800 border-slate-300";
      case "MANAGER":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "DIRECTOR":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "DIGITAL_MARKETING":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "FIELD_SUPERVISOR":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      default:
        return "bg-teal-50 text-teal-700 border-teal-200";
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 font-sans">
      {/* ─── Header Section ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-mist pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-graphite tracking-tight">
            Pengaturan Akun &amp; Profil
          </h1>
          <p className="text-xs text-slate mt-1">
            Kelola data identitas pengguna, username, dan keamanan kredensial portal sistem.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeStyle(
              displayRole
            )}`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Role: {displayRole}</span>
          </span>
        </div>
      </div>

      {/* ─── Profile Overview Card ─── */}
      <div className="bg-white rounded-xl border border-mist shadow-subtle p-5 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar / Initials */}
          <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-2xl shrink-0 shadow-2xs">
            {initial}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-graphite truncate">
                {displayName}
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Sesi Aktif
              </span>
            </div>
            <p className="text-xs text-slate mt-0.5">
              ID Pengguna: <span className="font-mono text-graphite">{dbUser?.id || session.user.id}</span>
            </p>
          </div>
        </div>

        {/* Read-Only Identity Overview Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-mist/80">
          <div className="p-3 rounded-lg bg-bone/40 border border-mist space-y-1">
            <span className="text-[11px] font-semibold text-slate flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-steel" />
              Nama Terdaftar
            </span>
            <p className="text-xs font-bold text-graphite truncate">{displayName}</p>
          </div>

          <div className="p-3 rounded-lg bg-bone/40 border border-mist space-y-1">
            <span className="text-[11px] font-semibold text-slate flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-steel" />
              Username Aktif
            </span>
            <p className="text-xs font-mono font-medium text-graphite truncate">
              @{displayUsername}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-bone/40 border border-mist space-y-1">
            <span className="text-[11px] font-semibold text-slate flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-steel" />
              Nomor Handphone
            </span>
            <p className="text-xs font-mono font-medium text-graphite truncate">
              {displayPhone}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-bone/40 border border-mist space-y-1">
            <span className="text-[11px] font-semibold text-slate flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-steel" />
              Hak Akses Portal
            </span>
            <p className="text-xs font-bold text-graphite">{displayRole}</p>
          </div>
        </div>
      </div>

      {/* ─── Settings Forms Sections ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Section A: Informasi Akun */}
        <div className="bg-white rounded-xl border border-mist shadow-subtle p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-mist">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-graphite">Informasi Akun</h3>
              <p className="text-[11px] text-slate">
                Perbarui nama lengkap dan username akun portal Anda
              </p>
            </div>
          </div>

          <ProfileInfoForm
            initialData={{
              nama: displayName,
              username: displayUsername,
            }}
          />
        </div>

        {/* Section B: Keamanan & Kata Sandi */}
        <div className="bg-white rounded-xl border border-mist shadow-subtle p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-mist">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-graphite">Keamanan &amp; Kata Sandi</h3>
              <p className="text-[11px] text-slate">
                Ubah kata sandi untuk melindungi akses akun Anda
              </p>
            </div>
          </div>

          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
