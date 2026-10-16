import React from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { getLeads } from "@/actions/lead";
import { MarketingLeadClientView } from "@/components/leads/MarketingLeadClientView";

export const metadata: Metadata = {
  title: "Daftar Lead Marketing | NPKR Portal",
  description: "Daftar prospek dan tindak lanjut lead konsumen marketing",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MarketingLeadPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : undefined;

  // Await searchParams in Next.js 15
  const resolvedParams = await searchParams;

  const rawTahap = resolvedParams.tahap;
  const tahap = typeof rawTahap === "string" ? rawTahap : undefined;

  const rawSumber = resolvedParams.sumber;
  const sumber = typeof rawSumber === "string" ? rawSumber : undefined;

  const rawFollowUp = resolvedParams.follow_up;
  const follow_up = typeof rawFollowUp === "string" ? rawFollowUp : undefined;

  const rawQuery = resolvedParams.q || resolvedParams.search;
  const search = typeof rawQuery === "string" ? rawQuery : undefined;

  // Server-side Data Fetching with searchParams filters
  const res = await getLeads({
    marketing_id: userId,
    tahap,
    sumber,
    follow_up,
    search,
  });

  const leads = res.success && res.data ? res.data.leads : [];
  const total = res.success && res.data ? res.data.total : 0;

  return (
    <MarketingLeadClientView
      leads={leads}
      total={total}
      userId={userId}
    />
  );
}
