
import React, { Suspense } from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardSkeleton } from "@/components/admin/dashboard-skeleton";

export const metadata: Metadata = {
  title: "Marketing Portal | NPKR",
  description: "Portal Penjualan & Manajemen Lead Marketing NPKR Property",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MarketingLayoutContent>{children}</MarketingLayoutContent>
    </Suspense>
  );
}

async function MarketingLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <AppShell role="MARKETING" user={session?.user}>
      {children}
    </AppShell>
  );
}
