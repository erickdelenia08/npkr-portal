import React from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Manager Portal | NPKR",
  description: "Portal Eksekutif, Pantauan Transaksi & Tim Marketing NPKR Property",
};

export default async function ManagerLayout({
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
