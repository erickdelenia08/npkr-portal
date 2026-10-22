// app/admin/lead/[id]/itj/page.tsx
import React from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ItjWizard, UnitOption, ItjFormInitialData } from "@/components/itj/ItjWizard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const leadId = Number(id);

  if (isNaN(leadId) || leadId <= 0) {
    return { title: "Pengajuan ITJ | Admin Portal" };
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { nama: true },
  });

  if (!lead) {
    return { title: "Pengajuan ITJ | Admin Portal" };
  }

  return {
    title: `Pengajuan ITJ - ${lead.nama} | Admin Portal`,
    description: `Formulir pengajuan Ikatan Tanda Jadi (ITJ) untuk konsumen ${lead.nama}`,
  };
}

export default async function AdminItjPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const leadId = Number(rawId);

  if (isNaN(leadId) || leadId <= 0) {
    notFound();
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      customer: true,
      itj: {
        orderBy: { id: "desc" },
        take: 1,
        include: {
          reviews: {
            orderBy: { id: "desc" },
            take: 1,
          },
          unit: {
            include: {
              tipe: true,
            },
          },
        },
      },
    },
  });

  if (!lead) {
    notFound();
  }

  // Authorization: Only allow access if survei_selesai_at is NOT null, and the lead is not Lost
  if (!lead.survei_selesai_at || lead.lost_at !== null) {
    redirect(`/admin/lead/${lead.id}`);
  }

  // Fetch Available Units
  const units = await prisma.masterUnit.findMany({
    where: {
      status_unit: "AVAILABLE",
    },
    include: {
      tipe: true,
    },
    orderBy: {
      blok: "asc",
    },
  });

  const unitOptions: UnitOption[] = units.map((u) => ({
    id: String(u.id),
    name: String(u.blok ?? "Unit"),
    price: Number(u.harga_khusus ?? u.tipe?.harga_dasar ?? 0),
    kategori: String(u.tipe?.kategori ?? ""),
  }));

  // Auto-fill namaKtp from the Lead's name
  const initialData: ItjFormInitialData = {
    namaKtp: lead.nama,
    nik: lead.customer?.nik || "",
    tempatLahir: lead.customer?.tempat_lahir || "",
    tglLahir: lead.customer?.tgl_lahir
      ? new Date(lead.customer.tgl_lahir).toISOString().split("T")[0]
      : "",
    alamatKtp: lead.customer?.alamat_ktp || "",
    unitId: "",
    hargaDeal: "",
    targetItj: "",
    nominalDibayar: "",
    targetDp: "0",
    metodeBayar: "KPR",
    tenor: "",
  };

  const session = await auth();
  const userRole = session?.user?.role;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      <ItjWizard
        leadId={String(lead.id)}
        unitOptions={unitOptions}
        initialData={initialData}
        userRole={userRole}
        basePath="/admin"
      />
    </div>
  );
}
