import React from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { getLeads, getMarketingUsers } from "@/actions/lead";
import { ManagerLeadTable } from "@/components/tables/manager-lead-table";

export const metadata: Metadata = {
  title: "Manajemen Lead | Admin Portal",
  description: "Database seluruh prospek lead dan penugasan marketing",
};

export default async function AdminLeadPage() {
  const session = await auth();

  // Prefetch leads and marketing users
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
    />
  );
}
