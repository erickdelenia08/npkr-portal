import React from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { TransactionDetailView } from "@/components/shared/transaction-detail-view";

interface ManagerTransaksiDetailPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Detail Transaksi (Read-Only) | Manager Portal",
  description:
    "Monitoring detail transaksi konsumen, kelengkapan berkas, pembayaran, dan oper PIC.",
};

export default async function ManagerTransaksiDetailPage({
  params,
}: ManagerTransaksiDetailPageProps) {
  await connection();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    redirect("/marketing/dashboard");
  }

  const resolvedParams = await params;
  const trxId = Number(resolvedParams.id);

  if (!Number.isSafeInteger(trxId) || trxId <= 0) {
    notFound();
  }

  return (
    <TransactionDetailView
      trxId={trxId}
      backHref="/manager/transaksi"
      backLabel="Kembali ke Pantauan Transaksi"
    />
  );
}
