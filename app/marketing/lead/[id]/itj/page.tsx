// app/marketing/lead/[id]/itj/page.tsx
import React from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ItjWizard, UnitOption, ItjFormInitialData } from "@/components/itj/ItjWizard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const leadId = Number(id);

  if (isNaN(leadId) || leadId <= 0) {
    return { title: "Pengajuan ITJ | NPKR Portal" };
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { nama: true },
  });

  if (!lead) {
    return { title: "Pengajuan ITJ | NPKR Portal" };
  }

  return {
    title: `Pengajuan ITJ - ${lead.nama} | NPKR Portal`,
    description: `Formulir pengajuan Ikatan Tanda Jadi (ITJ) untuk konsumen ${lead.nama}`,
  };
}

export default async function ItjPage({ params }: PageProps) {
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

  // 1. Authorization: Only allow access if survei_selesai_at is NOT null, and the lead is not Lost/Closed
  if (!lead.survei_selesai_at || lead.lost_at !== null || lead.closing_at !== null) {
    redirect(`/marketing/lead/${lead.id}`);
  }

  // 2. Form Data Fetching:
  // Check if there is an existing ITJ record with status PERLU_REVISI
  const latestItj = lead.itj[0] || null;
  const isRevision = latestItj?.status === "PERLU_REVISI";
  const reviewerNote = isRevision ? latestItj?.reviews[0]?.catatan || null : null;

  // Fetch Available Units (include currently held unit if revising)
  const units = await prisma.masterUnit.findMany({
    where: {
      OR: [
        { status_unit: "AVAILABLE" },
        ...(isRevision && latestItj?.unit_id ? [{ id: latestItj.unit_id }] : []),
      ],
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

  // Auto-fill namaKtp from the Lead's name; pre-fill entire wizard if status is PERLU_REVISI
  const initialData: ItjFormInitialData = {
    namaKtp: isRevision && latestItj?.nama_ktp ? latestItj.nama_ktp : lead.nama,
    nik: isRevision && latestItj?.nik ? latestItj.nik : (lead.customer?.nik || ""),
    tempatLahir: lead.customer?.tempat_lahir || "",
    tglLahir: lead.customer?.tgl_lahir
      ? new Date(lead.customer.tgl_lahir).toISOString().split("T")[0]
      : "",
    alamatKtp: lead.customer?.alamat_ktp || "",
    unitId: isRevision && latestItj?.unit_id ? String(latestItj.unit_id) : "",
    nominalItj: isRevision && latestItj?.nominal ? String(Number(latestItj.nominal)) : "",
    targetDp: isRevision && latestItj?.target_dp !== undefined ? String(Number(latestItj.target_dp)) : "0",
    metodeBayar: (isRevision && latestItj?.metode_bayar ? latestItj.metode_bayar : "CASH_KERAS") as
      | "KPR"
      | "CASH_KERAS"
      | "CASH_TEMPO",
    tenor: isRevision && latestItj?.tenor ? String(latestItj.tenor) : "",
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      <ItjWizard
        leadId={String(lead.id)}
        unitOptions={unitOptions}
        initialData={initialData}
        reviewerNote={reviewerNote}
        isRevision={isRevision}
      />
    </div>
  );
}