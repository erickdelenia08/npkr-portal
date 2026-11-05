// app/manager/aktivitas/page.tsx
import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { getActivityFeed, getActivityActors } from "@/actions/activity";
import { ManagerActivityTable } from "@/components/tables/manager-activity-table";

export const metadata: Metadata = {
  title: "Audit Aktivitas Global | Manager Portal",
  description:
    "Log audit terpadu (append-only) untuk seluruh aktivitas prospek, transaksi, pembayaran, KPR, dan BAST.",
};

export default async function ManagerAktivitasPage() {
  await connection();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    redirect("/marketing/dashboard");
  }

  const [feedRes, actorsRes] = await Promise.all([
    getActivityFeed({
      page: 1,
      pageSize: 25,
      actionCategory: "SEMUA",
    }),
    getActivityActors(),
  ]);

  const initialResult = feedRes.success && feedRes.data
    ? feedRes.data
    : {
        items: [],
        stats: {
          totalActivities: 0,
          breakdown: {
            lead: 0,
            transaksi: 0,
            pembayaran: 0,
            kpr: 0,
            lainnya: 0,
          },
          mostActiveActor: null,
        },
        pagination: {
          page: 1,
          pageSize: 25,
          total: 0,
          totalPages: 1,
        },
        dateRange: {
          from: "",
          to: "",
        },
      };

  const actors = actorsRes.success && actorsRes.data ? actorsRes.data : [];

  return (
    <div className="space-y-6 font-sans text-zinc-900">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Audit Aktivitas
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
              Log Global Terpadu
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Riwayat kronologis operasional: interaksi prospek, progres tahap transaksi, pembayaran, status bank KPR, dan checklist BAST.
          </p>
        </div>
      </div>

      <ManagerActivityTable
        initialResult={initialResult}
        actors={actors}
        defaultDateFrom={initialResult.dateRange.from}
        defaultDateTo={initialResult.dateRange.to}
        basePath="/manager"
      />
    </div>
  );
}