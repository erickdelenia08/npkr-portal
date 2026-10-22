import React from "react";
import type { Metadata } from "next";
import { ReceiptText, Building2, Banknote, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  TransaksiTable,
  type SerializedTransaksi,
} from "@/components/tables/transaksi-table";

export const metadata: Metadata = {
  title: "Dashboard Transaksi | NPKR Portal",
  description:
    "Manajemen data transaksi, monitoring progres pembayaran konsumen, dan berkas properti.",
};

export default async function AdminTransaksiPage() {
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

  // Serialize Date & Decimal values for Client Component
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
      jenis_pembayaran: p.jenis_pembayaran,
      catatan: p.catatan,
      is_void: p.is_void,
      created_at: p.created_at.toISOString(),
    })),
  }));

  // Quick statistics
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
    <div className="space-y-6">
      {/* ─── Header Banner ─── */}
      <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-deep-teal flex items-center justify-center shrink-0 mt-0.5">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight">
              Manajemen Transaksi & Dokumen
            </h1>
            <p className="text-sm text-slate mt-0.5">
              Kelola tahapan pembayaran (ITJ, DP, KPR, Pelunasan) dan pantau
              progres transaksi unit konsumen.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Summary Metrics Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ReceiptText className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[11px] text-slate font-medium uppercase tracking-wider">
              Total Transaksi
            </p>
            <p className="text-lg font-bold text-carbon-ink tabular-nums">
              {totalTransaksi}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[11px] text-slate font-medium uppercase tracking-wider">
              Skema KPR
            </p>
            <p className="text-lg font-bold text-carbon-ink tabular-nums">
              {countKpr}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Banknote className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[11px] text-slate font-medium uppercase tracking-wider">
              Skema Cash
            </p>
            <p className="text-lg font-bold text-carbon-ink tabular-nums">
              {countCash}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-deep-teal flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
          <div className="truncate">
            <p className="text-[11px] text-slate font-medium uppercase tracking-wider">
              Total Nilai Deal
            </p>
            <p className="text-base font-bold text-carbon-ink font-mono truncate">
              {formattedTotalDeal}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Data Table with Filter Tabs ─── */}
      <TransaksiTable data={serialized} />
    </div>
  );
}
