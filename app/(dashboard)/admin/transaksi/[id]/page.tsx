import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { TransactionDetailView } from "@/components/shared/transaction-detail-view";

interface DetailTransaksiPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Detail Transaksi & Dokumen | NPKR Portal",
  description:
    "Kelola riwayat pembayaran konsumen, kelengkapan berkas, dan progress transaksi.",
};

export default async function DetailTransaksiPage({
  params,
}: DetailTransaksiPageProps) {
  await connection();
  const resolvedParams = await params;
  const trxId = Number(resolvedParams.id);

  if (!Number.isSafeInteger(trxId) || trxId <= 0) {
    notFound();
  }

  return (
    <TransactionDetailView
      trxId={trxId}
      backHref="/admin/transaksi"
      backLabel="Kembali ke Pantauan Transaksi"
    />
  );
}
