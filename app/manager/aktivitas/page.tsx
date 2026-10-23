// app/manager/aktivitas/page.tsx
import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { getGlobalActivities, getActivityActors } from "@/actions/activity";
import { ManagerActivityTable } from "@/components/tables/manager-activity-table";
import { Activity, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Audit Aktivitas Global | Manager Portal",
  description:
    "Pantau log aktivitas follow-up, interaksi konsumen, dan pengalihan PIC seluruh tim secara global.",
};

export default async function ManagerAktivitasPage() {
  await connection();
  const session = await auth();

  // Strict RBAC Enforcement
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    redirect("/marketing/dashboard");
  }

  // Parallel prefetch for global activities and actor filter list
  const [activitiesRes, actorsRes] = await Promise.all([
    getGlobalActivities(),
    getActivityActors(),
  ]);

  const initialActivities = activitiesRes.success && activitiesRes.data ? activitiesRes.data : [];
  const actors = actorsRes.success && actorsRes.data ? actorsRes.data : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header Section ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-deep-teal flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-carbon-ink tracking-tight">
                Audit Aktivitas Global
              </h1>
              <p className="text-xs text-slate">
                Monitoring log follow-up tim penjualan, komunikasi prospek, dan audit pengalihan PIC (Oper PIC).
              </p>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-mist text-xs text-slate shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-deep-teal" />
          <span>Akses Monitoring Eksekutif</span>
        </div>
      </div>

      {/* ─── Main Activity Table & Filter Component ─── */}
      <ManagerActivityTable
        initialActivities={initialActivities}
        actors={actors}
        basePath="/manager"
      />
    </div>
  );
}
