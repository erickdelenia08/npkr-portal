import React from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  TransaksiTable,
  type SerializedTransaksi,
} from "@/components/tables/transaksi-table";

export const metadata: Metadata = {
  title: "Manajemen Transaksi | Admin Portal",
  description:
    "Monitoring progres transaksi, administrasi pembayaran konsumen, dan berkas unit properti.",
};

export default async function AdminTransaksiPage() {
  await connection();

  const transaksi = await prisma.transaksi.findMany({
    include: {
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
          no_hp: true,
        },
      },
      pembayaran: true,
    },
    orderBy: { created_at: "desc" },
  });

  const serialized: SerializedTransaksi[] = transaksi.map((trx) => ({
    id: trx.id,
    customer_id: trx.customer_id,
    unit_id: trx.unit_id,
    marketing_id: trx.marketing_id,
    metode_bayar: trx.metode_bayar,
    harga_deal: Number(trx.harga_deal),
    target_itj: Number(trx.target_itj),
    target_dp: Number(trx.target_dp),
    tenor_bulan: trx.tenor_bulan,
    status_transaksi: trx.status_transaksi,
    nama_bank: trx.nama_bank,
    nama_notaris: trx.nama_notaris,
    tgl_akad: trx.tgl_akad ? trx.tgl_akad.toISOString() : null,
    tgl_bast: trx.tgl_bast ? trx.tgl_bast.toISOString() : null,
    catatan_admin: trx.catatan_admin,
    created_at: trx.created_at.toISOString(),
    updated_at: trx.updated_at.toISOString(),
    customer: {
      id: trx.customer.id,
      nama_ktp: trx.customer.nama_ktp,
      no_hp: trx.customer.no_hp,
      nik: trx.customer.nik,
    },
    unit: {
      id: trx.unit.id,
      blok: trx.unit.blok,
      tipe: {
        id: trx.unit.tipe.id,
        nama_tipe: trx.unit.tipe.nama_tipe,
        kategori: trx.unit.tipe.kategori,
      },
    },
    marketing: {
      id: trx.marketing.id,
      nama: trx.marketing.nama,
      no_hp: trx.marketing.no_hp,
    },
    pembayaran: trx.pembayaran.map((p) => ({
      id: p.id,
      nominal: Number(p.nominal),
      jenis_pembayaran: p.jenis_pembayaran as "ITJ" | "DP" | "CICILAN" | "PELUNASAN",
      catatan: p.catatan,
      is_void: p.is_void,
      created_at: p.created_at.toISOString(),
    })),
  }));

  const totalTransaksi = serialized.length;
  const countKpr = serialized.filter((t) => t.metode_bayar === "KPR").length;
  const countCash = serialized.filter(
    (t) => t.metode_bayar === "CASH_KERAS" || t.metode_bayar === "CASH_TEMPO"
  ).length;
  const totalNilaiDeal = serialized.reduce((sum, t) => sum + t.harga_deal, 0);

  const formattedTotalDeal = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(totalNilaiDeal);

  return (
    <div className="space-y-6 font-sans text-zinc-900">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Transaksi &amp; Pembayaran
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
              {totalTransaksi} Transaksi
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Kelola tahapan pembayaran (ITJ, DP, KPR, Pelunasan) dan verifikasi progres transaksi unit konsumen.
          </p>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[11px] text-zinc-400 font-medium block">
            Total Nilai Transaksi
          </span>
          <span className="text-lg font-semibold text-zinc-900 font-mono tracking-tight">
            {formattedTotalDeal}
          </span>
        </div>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Total Unit Terjual</span>
          <span className="text-xl font-semibold text-zinc-900 mt-1 block tabular-nums">
            {totalTransaksi}
          </span>
        </div>

        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Skema KPR</span>
          <span className="text-xl font-semibold text-zinc-900 mt-1 block tabular-nums">
            {countKpr}
          </span>
        </div>

        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Skema Cash (Keras/Tempo)</span>
          <span className="text-xl font-semibold text-zinc-900 mt-1 block tabular-nums">
            {countCash}
          </span>
        </div>

        <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
          <span className="text-[11px] font-medium text-zinc-500 block">Rata-rata Nilai / Unit</span>
          <span className="text-sm font-semibold text-zinc-900 font-mono mt-2 block truncate">
            {totalTransaksi > 0
              ? new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(totalNilaiDeal / totalTransaksi)
              : "Rp 0"}
          </span>
        </div>
      </div>

      {/* Main Table */}
      <TransaksiTable data={serialized} />
    </div>
  );
}