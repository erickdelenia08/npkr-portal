
import React, { Suspense } from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardSkeleton } from "@/components/admin/dashboard-skeleton";

export const metadata: Metadata = {
  title: "Admin Portal | NPKR",
  description:
    "Portal Administrasi, Validasi ITJ, & Transaksi NPKR Property",
};

async function AdminContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <AppShell role="ADMIN" user={session?.user}>
      {children}
    </AppShell>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AdminContent>{children}</AdminContent>
    </Suspense>
  );
}
