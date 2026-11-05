// app/admin/lead/[id]/page.tsx
import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getLeadDetail } from "@/actions/activity";
import { LeadDetailClient } from "@/components/leads/LeadDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const leadId = Number(id);

  if (isNaN(leadId) || leadId <= 0) {
    return {
      title: "Detail Lead | Admin Portal",
    };
  }

  const res = await getLeadDetail(leadId);
  if (res.success && res.data) {
    return {
      title: `${res.data.nama} - Detail Lead | Admin Portal`,
      description: `Detail prospek dan riwayat aktivitas follow-up untuk ${res.data.nama}`,
    };
  }

  return {
    title: "Detail Lead | Admin Portal",
  };
}

export default async function AdminLeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const leadId = Number(id);

  if (isNaN(leadId) || leadId <= 0) {
    notFound();
  }

  const session = await auth();
  const currentUserId = Number(session?.user?.id);
  const currentUserRole = session?.user?.role;

  const res = await getLeadDetail(leadId);

  if (!res.success || !res.data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      <LeadDetailClient
        initialLead={res.data}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        basePath="/admin"
      />
    </div>
  );
}
