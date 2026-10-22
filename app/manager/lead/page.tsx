import React from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { getLeads, getMarketingUsers } from "@/actions/lead";
import { ManagerLeadTable } from "@/components/tables/manager-lead-table";

export const metadata: Metadata = {
  title: "Manajemen & Distribusi Lead | Manager Portal",
  description: "Dashboard distribusi, penugasan, dan evaluasi prospek lead penjualan",
};

export default async function ManagerLeadPage() {
  const session = await auth();

  // Parallel prefetch for leads and active marketing users
  const [leadsRes, marketingUsers] = await Promise.all([
    getLeads({}),
    getMarketingUsers(),
  ]);

  const initialLeads = leadsRes.success && leadsRes.data ? leadsRes.data.leads : [];
  const initialTotal = leadsRes.success && leadsRes.data ? leadsRes.data.total : 0;

  return (
    <ManagerLeadTable
      initialLeads={initialLeads}
      initialTotal={initialTotal}
      marketingUsers={marketingUsers}
      userRole={session?.user?.role}
      basePath="/manager"
    />
  );
}
