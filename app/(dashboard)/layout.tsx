import React, { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardSkeleton } from "@/components/admin/dashboard-skeleton";
import { RoleType } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Portal | NPKR",
  description: "Sistem Manajemen Portal NPKR Property",
};

async function SharedDashboardContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Ambil role secara dinamis dari session user tanpa hardcode role tertentu
  const dynamicRole = (session.user.role || "MARKETING") as RoleType;

  return (
    <SessionProvider session={session}>
      <AppShell role={dynamicRole} user={session.user}>
        {children}
      </AppShell>
    </SessionProvider>
  );
}

export default function SharedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <SharedDashboardContent>{children}</SharedDashboardContent>
    </Suspense>
  );
}
