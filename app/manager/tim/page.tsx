// app/manager/tim/page.tsx
import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Users, UserCheck, UserX, ShieldCheck, Briefcase } from "lucide-react";
import {
  MarketingTeamTable,
  SerializedMarketingUser,
} from "@/components/tables/marketing-team-table";
import { UserRole } from "@/schemas/user.schema";

export const metadata: Metadata = {
  title: "Manajemen Pengguna & Tim | NPKR Portal",
  description:
    "Kelola akun seluruh pengguna portal (Marketing, Admin, Manager), atur hak akses, kontak, dan status aktif akun.",
};

export default async function ManagerTeamPage() {
  const session = await auth();

  // Strict RBAC Enforcement
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    redirect("/marketing/dashboard");
  }

  // Fetch ALL users from database (no role filter)
  const allUsers = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          leads: true,
          transaksi: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  // Safe Serialization for Client Component
  const serialized: SerializedMarketingUser[] = allUsers.map((user) => ({
    id: user.id,
    nama: user.nama,
    username: user.username,
    no_hp: user.no_hp,
    role: user.role as UserRole,
    isActive: user.isActive,
    created_at: user.created_at.toISOString(),
    _count: {
      leads: user._count.leads,
      transaksi: user._count.transaksi,
    },
  }));

  const totalUsers = serialized.length;
  const totalMarketing = serialized.filter((u) => u.role === "MARKETING").length;
  const totalAdminManager = serialized.filter(
    (u) => u.role === "ADMIN" || u.role === "MANAGER"
  ).length;
  const inactiveUsers = serialized.filter((u) => !u.isActive).length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ─── Page Header ─── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-mist shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 text-prism-teal flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-carbon-ink tracking-tight">
                Manajemen Pengguna &amp; Tim
              </h1>
              <p className="text-xs sm:text-sm text-slate mt-0.5">
                Kelola seluruh akun pengguna portal (Marketing, Admin, &amp; Manager), atur peran, kontak, dan kendali hak akses login.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Summary KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Pengguna */}
        <div className="bg-white p-4 rounded-xl border border-mist shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-prism-teal flex items-center justify-center shrink-0">
            <Users className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate font-bold uppercase tracking-wider">
              Total Pengguna
            </p>
            <p className="text-lg font-bold text-carbon-ink tabular-nums">
              {totalUsers}
            </p>
          </div>
        </div>

        {/* Tim Marketing */}
        <div className="bg-white p-4 rounded-xl border border-mist shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate font-bold uppercase tracking-wider">
              Tim Marketing
            </p>
            <p className="text-lg font-bold text-emerald-950 tabular-nums">
              {totalMarketing}
            </p>
          </div>
        </div>

        {/* Admin & Manager */}
        <div className="bg-white p-4 rounded-xl border border-mist shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate font-bold uppercase tracking-wider">
              Admin &amp; Manager
            </p>
            <p className="text-lg font-bold text-blue-950 tabular-nums">
              {totalAdminManager}
            </p>
          </div>
        </div>

        {/* Akun Non-aktif */}
        <div className="bg-white p-4 rounded-xl border border-mist shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <UserX className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate font-bold uppercase tracking-wider">
              Non-aktif
            </p>
            <p className="text-lg font-bold text-rose-950 tabular-nums">
              {inactiveUsers}
            </p>
          </div>
        </div>
      </div>

      {/* ─── User Management Data Table ─── */}
      <MarketingTeamTable initialUsers={serialized} />
    </div>
  );
}
