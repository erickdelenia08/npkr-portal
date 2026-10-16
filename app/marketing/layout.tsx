import React from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Marketing Portal | NPKR",
  description: "Portal Penjualan & Manajemen Lead Marketing NPKR Property",
};

export default async function MarketingLayout({
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
