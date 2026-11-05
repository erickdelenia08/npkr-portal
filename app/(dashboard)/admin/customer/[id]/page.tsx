import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerDetail } from "@/actions/customer.action";
import { CustomerDetailView } from "@/components/customers/customer-detail-view";
import { ArrowLeft, AlertCircle } from "lucide-react";

interface AdminCustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: AdminCustomerDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const res = await getCustomerDetail(Number(id));

  if (!res.success || !res.data) {
    return {
      title: "Detail Customer | NPKR Portal",
    };
  }

  return {
    title: `${res.data.nama_ktp} - Profil Customer | Admin NPKR`,
    description: `Profil identitas dan riwayat unit milik ${res.data.nama_ktp}`,
  };
}

export default async function AdminCustomerDetailPage({
  params,
}: AdminCustomerDetailPageProps) {
  const { id } = await params;
  const customerId = Number(id);

  if (isNaN(customerId) || customerId <= 0) {
    notFound();
  }

  const res = await getCustomerDetail(customerId);

  if (!res.success || !res.data) {
    return (
      <div className="bg-white p-8 rounded-lg border border-mist shadow-subtle text-center space-y-4 max-w-lg mx-auto mt-10">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h1 className="text-lg font-bold text-carbon-ink font-heading">
          Data Customer Tidak Ditemukan
        </h1>
        <p className="text-xs text-slate">{res.message}</p>
        <Link
          href="/admin/customer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-carbon-ink text-white text-xs font-semibold hover:bg-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Buku Induk Customer</span>
        </Link>
      </div>
    );
  }

  return (
    <CustomerDetailView
      initialCustomer={res.data}
      userRole="ADMIN"
      backHref="/admin/customer"
    />
  );
}
