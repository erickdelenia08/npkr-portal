
import React, { Suspense } from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardSkeleton } from "@/components/admin/dashboard-skeleton";

export const metadata: Metadata = {
  title: "Manager Portal | NPKR",
  description:
    "Portal Eksekutif, Pantauan Transaksi & Tim Marketing NPKR Property",
};

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={<DashboardSkeleton />}
    >
      <ManagerLayoutContent>{children}</ManagerLayoutContent>
    </Suspense>
  );
}

async function ManagerLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <AppShell role="MANAGER" user={session?.user}>
      {children}
    </AppShell>
  );
}
