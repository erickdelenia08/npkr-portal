import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getCurrentUserRole,
  getMasterTipeList,
} from "@/actions/master-unit.action";
import { SetupWizardClient } from "@/components/forms/setup-wizard";

export const metadata: Metadata = {
  title: "Setup Siteplan Unit | Admin Portal NPKR",
  description: "Wizard inisialisasi nomor unit kavling siteplan",
};

interface SetupPageProps {
  searchParams: Promise<{ tipeId?: string }>;
}

export default async function MasterUnitSetupPage({ searchParams }: SetupPageProps) {
  const role = await getCurrentUserRole();
  if (!role.isAdmin) {
    redirect("/admin/master-unit");
  }

  const params = await searchParams;
  const preselectedTipeId = params.tipeId ? Number(params.tipeId) : undefined;

  const tipeRes = await getMasterTipeList();
  const tipeList = tipeRes.success && tipeRes.data ? tipeRes.data : [];

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <SetupWizardClient
        initialTipeList={tipeList}
        initialTipeId={preselectedTipeId}
      />
    </div>
  );
}
