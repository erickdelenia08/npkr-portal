// app/marketing/transaksi/page.tsx
import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { getTransaksiByMarketing } from "@/actions/transaksi.action";
import { MarketingTransaksiClient } from "@/components/marketing/MarketingTransaksiClient";

export const metadata: Metadata = {
  title: "Daftar Transaksi Saya | NPKR Portal Marketing",
  description: "Daftar seluruh transaksi aktif dan closing penjualan marketing",
};

export default async function MarketingTransaksiListPage() {
  await connection();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userId = Number(session.user.id);
  const marketingName = session.user.name || undefined;

  const res = await getTransaksiByMarketing(userId);
  const initialData = res.success && res.data ? res.data : [];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      <MarketingTransaksiClient
        initialData={initialData}
        marketingName={marketingName}
      />
    </div>
  );
}
