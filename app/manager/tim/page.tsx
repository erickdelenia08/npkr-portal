// app/manager/tim/page.tsx
import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  MarketingTeamTable,
  SerializedMarketingUser,
} from "@/components/tables/marketing-team-table";
import { UserRole } from "@/schemas/user.schema";

export const metadata: Metadata = {
  title: "Manajemen Pengguna & Tim | NPKR Portal",
  description: "Kelola akun pengguna portal (Marketing, Admin, Manager), hak akses, dan status aktif.",
};

export default async function ManagerTeamPage() {
  await connection();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    redirect("/marketing/dashboard");
  }

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
    <div className="space-y-6 font-sans text-zinc-900">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Pengguna &amp; Tim
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
              {totalUsers} Pengguna
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Kelola kredensial akun, peranan (role), kontak telepon, serta izin akses login sistem.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Total Pengguna</span>
          <span className="text-xl font-semibold text-zinc-900 mt-1 block tabular-nums">
            {totalUsers}
          </span>
        </div>

        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Tim Marketing</span>
          <span className="text-xl font-semibold text-zinc-900 mt-1 block tabular-nums">
            {totalMarketing}
          </span>
        </div>

        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Admin &amp; Manager</span>
          <span className="text-xl font-semibold text-zinc-900 mt-1 block tabular-nums">
            {totalAdminManager}
          </span>
        </div>

        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Akun Non-aktif</span>
          <span className={`text-xl font-semibold mt-1 block tabular-nums ${inactiveUsers > 0 ? "text-amber-700" : "text-zinc-900"}`}>
            {inactiveUsers}
          </span>
        </div>
      </div>

      {/* User Table Component */}
      <MarketingTeamTable initialUsers={serialized} />
    </div>
  );
}