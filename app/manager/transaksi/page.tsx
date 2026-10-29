// app/manager/transaksi/page.tsx
import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ManagerTransaksiTable,
  SerializedManagerTransaksi,
} from "@/components/tables/manager-transaksi-table";

export const metadata: Metadata = {
  title: "Pantauan Transaksi | Manager Portal",
  description: "Monitoring alur transaksi konsumen, proses pemberkasan, approval bank, hingga akad dan BAST.",
};

export default async function ManagerTransaksiPage() {
  await connection();
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    redirect("/marketing/dashboard");
  }

  const rawTransaksi = await prisma.transaksi.findMany({
    include: {
      itj: {
        select: {
          diajukan_at: true,
        },
      },
      customer: true,
      unit: {
        include: {
          tipe: true,
        },
      },
      marketing: {
        select: {
          id: true,
          nama: true,
          username: true,
          no_hp: true,
        },
      },
      pengajuan_kpr: {
        include: {
          bank: true,
        },
        orderBy: {
          nomor_pengajuan: "desc",
        },
      },
      pembayaran: {
        where: {
          is_void: false,
        },
        orderBy: [{ tgl_bayar: "asc" }, { id: "asc" }],
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  const serialized: SerializedManagerTransaksi[] = rawTransaksi.map((trx) => {
    const approvedItjDate = trx.itj?.diajukan_at;
    const tglItjIso = approvedItjDate
      ? approvedItjDate.toISOString()
      : trx.created_at.toISOString();

    const activeKpr = trx.pengajuan_kpr?.find((k) => k.status !== "DITOLAK");
    const activeBank = activeKpr?.bank?.nama || trx.nama_bank;

    return {
      id: trx.id,
      metode_bayar: trx.metode_bayar,
      harga_deal: Number(trx.harga_deal),
      target_itj: Number(trx.target_itj),
      target_dp: Number(trx.target_dp),
      tenor_bulan: trx.tenor_bulan,
      status_transaksi: trx.status_transaksi,
      nama_bank: activeBank,
      nama_notaris: trx.nama_notaris,
      tgl_akad: trx.tgl_akad ? trx.tgl_akad.toISOString() : null,
      tgl_bast: trx.tgl_bast ? trx.tgl_bast.toISOString() : null,
      catatan_admin: trx.catatan_admin,
      created_at: trx.created_at.toISOString(),
      tgl_itj: tglItjIso,
      customer: {
        id: trx.customer.id,
        nama_ktp: trx.customer.nama_ktp,
        no_hp: trx.customer.no_hp,
        nik: trx.customer.nik,
        alamat_ktp: trx.customer.alamat_ktp,
      },
      unit: {
        id: trx.unit.id,
        blok: trx.unit.blok,
        tipe: {
          nama_tipe: trx.unit.tipe.nama_tipe,
          kategori: trx.unit.tipe.kategori,
        },
      },
      marketing: {
        id: trx.marketing.id,
        nama: trx.marketing.nama,
        username: trx.marketing.username,
        no_hp: trx.marketing.no_hp,
      },
      pembayaran: trx.pembayaran.map((p) => ({
        id: p.id,
        nominal: Number(p.nominal),
        jenis_pembayaran: p.jenis_pembayaran,
        catatan: p.catatan,
        is_void: p.is_void,
        created_at: p.created_at.toISOString(),
      })),
    };
  });

  const totalTransaksi = serialized.length;
  const countPemberkasan = serialized.filter((t) => {
    const s = t.status_transaksi.toUpperCase();
    return s.includes("BERKAS") || s.includes("PEMBERKASAN") || s.includes("DOKUMEN");
  }).length;
  const countProsesBank = serialized.filter((t) => {
    const s = t.status_transaksi.toUpperCase();
    return s.includes("BI CHECKING") || s.includes("SP3K") || s.includes("BANK") || s.includes("SLIK");
  }).length;
  const countAkadBast = serialized.filter((t) => {
    const s = t.status_transaksi.toUpperCase();
    return s.includes("AKAD") || s.includes("BAST") || s.includes("LUNAS") || s.includes("SELESAI");
  }).length;

  const totalNilaiPipeline = serialized.reduce((sum, t) => sum + t.harga_deal, 0);
  const formattedTotalNilai = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(totalNilaiPipeline);

  return (
    <div className="space-y-6 font-sans text-zinc-900">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Pantauan Transaksi
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
              Read-Only
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Monitoring tahapan berkas, evaluasi perbankan, hingga akad dan serah terima unit (BAST).
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[11px] text-zinc-400 font-medium block">
            Total Nilai Transaksi
          </span>
          <span className="text-lg font-semibold text-zinc-900 font-mono tracking-tight">
            {formattedTotalNilai}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Total Transaksi</span>
          <span className="text-xl font-semibold text-zinc-900 mt-1 block tabular-nums">
            {totalTransaksi}
          </span>
        </div>

        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Pemberkasan</span>
          <span className="text-xl font-semibold text-amber-700 mt-1 block tabular-nums">
            {countPemberkasan}
          </span>
        </div>

        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Proses Bank / SP3K</span>
          <span className="text-xl font-semibold text-blue-700 mt-1 block tabular-nums">
            {countProsesBank}
          </span>
        </div>

        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Akad &amp; BAST</span>
          <span className="text-xl font-semibold text-emerald-700 mt-1 block tabular-nums">
            {countAkadBast}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <ManagerTransaksiTable data={serialized} />
    </div>
  );
}