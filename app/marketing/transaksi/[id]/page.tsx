import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { TransactionDetailView } from "@/components/shared/transaction-detail-view";

interface MarketingTransaksiPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Detail Transaksi Konsumen | NPKR Portal Marketing",
  description:
    "Pantau progress berkas, pembayaran, dan tahapan transaksi konsumen Anda.",
};

export default async function MarketingTransaksiPage({
  params,
}: MarketingTransaksiPageProps) {
  await connection();
  const resolvedParams = await params;
  const trxId = Number(resolvedParams.id);

  if (!Number.isSafeInteger(trxId) || trxId <= 0) {
    notFound();
  }

  return (
    <TransactionDetailView
      trxId={trxId}
      backHref="/marketing/transaksi"
      backLabel="Kembali ke Daftar Transaksi"
    />
  );
}
