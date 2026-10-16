import React from "react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin Portal | NPKR",
  description: "Portal Administrasi, Validasi ITJ, & Transaksi NPKR Property",
};

export default async function AdminLayout({
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
