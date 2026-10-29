// app/manager/aktivitas/page.tsx
import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { getGlobalActivities, getActivityActors } from "@/actions/activity";
import { ManagerActivityTable } from "@/components/tables/manager-activity-table";

export const metadata: Metadata = {
  title: "Audit Aktivitas Global | Manager Portal",
  description: "Log aktivitas follow-up, komunikasi prospek, dan audit pengalihan PIC.",
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

  const [activitiesRes, actorsRes] = await Promise.all([
    getGlobalActivities(),
    getActivityActors(),
  ]);

  const initialActivities = activitiesRes.success && activitiesRes.data ? activitiesRes.data : [];
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
              Log Global
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Pencatatan interaksi prospek, riwayat follow-up sales, dan riwayat delegasi PIC unit.
          </p>
        </div>
      </div>

      <ManagerActivityTable
        initialActivities={initialActivities}
        actors={actors}
        basePath="/manager"
      />
    </div>
  );
}