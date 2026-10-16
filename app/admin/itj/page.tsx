// app/admin/itj/page.tsx
import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  FileCheck2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  ItjReviewTable,
  SerializedItjItem,
} from "@/components/tables/itj-review-table";

export const metadata: Metadata = {
  title: "Review & Validasi Pengajuan ITJ | NPKR Portal",
  description:
    "Dashboard review, persetujuan, dan revisi berkas Ikatan Tanda Jadi (ITJ) untuk Admin dan Branch Manager.",
};

export default async function AdminItjReviewPage() {
  const session = await auth();

  // Strict RBAC Enforcement
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") {
    redirect("/marketing/dashboard");
  }

  // Fetch all ITJs with rich relations
  const itjList = await prisma.itj.findMany({
    include: {
      lead: {
        include: {
          marketing: {
            select: {
              id: true,
              nama: true,
              no_hp: true,
            },
          },
          customer: {
            select: {
              tempat_lahir: true,
              tgl_lahir: true,
              alamat_ktp: true,
            },
          },
        },
      },
      unit: {
        include: {
          tipe: {
            select: {
              nama_tipe: true,
              kategori: true,
              harga_dasar: true,
            },
          },
        },
      },
      reviews: {
        orderBy: { created_at: "desc" },
        include: {
          reviewer: {
            select: {
              nama: true,
              role: true,
            },
          },
        },
      },
    },
    orderBy: { diajukan_at: "desc" },
  });

  // Serialize data safely for client component
  const serialized: SerializedItjItem[] = itjList.map((itj) => {
    const rawHargaDeal = itj.unit.harga_khusus ?? itj.unit.tipe.harga_dasar;

    return {
      id: itj.id,
      lead_id: itj.lead_id,
      unit_id: itj.unit_id,
      status: itj.status,
      nik: itj.nik,
      nama_ktp: itj.nama_ktp,
      nominal: Number(itj.nominal),
      target_dp: Number(itj.target_dp),
      metode_bayar: itj.metode_bayar,
      tenor: itj.tenor,
      diajukan_at: itj.diajukan_at.toISOString(),
      diputuskan_at: itj.diputuskan_at ? itj.diputuskan_at.toISOString() : null,
      lead: {
        id: itj.lead.id,
        nama: itj.lead.nama,
        no_hp: itj.lead.no_hp,
        marketing: itj.lead.marketing
          ? {
              id: itj.lead.marketing.id,
              nama: itj.lead.marketing.nama,
              no_hp: itj.lead.marketing.no_hp,
            }
          : null,
        customer: itj.lead.customer
          ? {
              tempat_lahir: itj.lead.customer.tempat_lahir,
              tgl_lahir: itj.lead.customer.tgl_lahir.toISOString(),
              alamat_ktp: itj.lead.customer.alamat_ktp,
            }
          : null,
      },
      unit: {
        id: itj.unit.id,
        blok: itj.unit.blok,
        status_unit: itj.unit.status_unit,
        harga_deal: Number(rawHargaDeal),
        tipe: itj.unit.tipe
          ? {
              nama_tipe: itj.unit.tipe.nama_tipe,
              kategori: itj.unit.tipe.kategori,
              harga_dasar: Number(itj.unit.tipe.harga_dasar),
            }
          : null,
      },
      reviews: itj.reviews.map((rev) => ({
        id: rev.id,
        reviewer_id: rev.reviewer_id,
        reviewer_nama: rev.reviewer.nama,
        reviewer_role: rev.reviewer.role,
        keputusan: rev.keputusan,
        catatan: rev.catatan,
        created_at: rev.created_at.toISOString(),
      })),
    };
  });

  const countPending = serialized.filter((i) => i.status === "DIAJUKAN").length;
  const countRevisi = serialized.filter((i) => i.status === "PERLU_REVISI").length;
  const countApproved = serialized.filter((i) => i.status === "DISETUJUI").length;
  const countRejected = serialized.filter((i) => i.status === "DITOLAK").length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-mist shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 text-prism-teal flex items-center justify-center shrink-0">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-carbon-ink tracking-tight">
                Review &amp; Validasi ITJ
              </h1>
              <p className="text-xs sm:text-sm text-slate mt-0.5">
                Pusat verifikasi transaksi Ikatan Tanda Jadi (ITJ) konsumen dari seluruh tim marketing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-mist shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Clock className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate font-bold uppercase tracking-wider">
              Menunggu Review
            </p>
            <p className="text-lg font-bold text-sky-950 tabular-nums">
              {countPending}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-mist shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate font-bold uppercase tracking-wider">
              Perlu Revisi
            </p>
            <p className="text-lg font-bold text-amber-950 tabular-nums">
              {countRevisi}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-mist shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate font-bold uppercase tracking-wider">
              Disetujui (Closing)
            </p>
            <p className="text-lg font-bold text-emerald-950 tabular-nums">
              {countApproved}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-mist shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <XCircle className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate font-bold uppercase tracking-wider">
              Ditolak
            </p>
            <p className="text-lg font-bold text-rose-950 tabular-nums">
              {countRejected}
            </p>
          </div>
        </div>
      </div>

      {/* Main ITJ Review Table & Interactive Tabs */}
      <ItjReviewTable initialItjs={serialized} />
    </div>
  );
}
