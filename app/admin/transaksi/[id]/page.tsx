import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  User,
  Home,
  Receipt,
  Calendar,
  Phone,
  CreditCard,
  Banknote,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PembayaranModal } from "@/components/forms/pembayaran-modal";
import { DynamicActionPanel } from "@/components/forms/dynamic-action-panel";
import { QuickPrintActions } from "@/components/forms/quick-print-actions";

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
  const resolvedParams = await params;
  const trxId = Number(resolvedParams.id);

  if (!Number.isSafeInteger(trxId) || trxId <= 0) {
    notFound();
  }

  const transaksi = await prisma.transaksi.findUnique({
    where: { id: trxId },
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
      pembayaran: {
        include: {
          penerima: {
            select: {
              id: true,
              nama: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!transaksi) {
    notFound();
  }

  // Currency & Date formatters
  const formatCurrency = (val: number): string =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);

  const formatDate = (date: Date): string =>
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);

  // Financial calculations
  const hargaDeal = Number(transaksi.harga_deal);
  const targetItj = Number(transaksi.target_itj);
  const targetDp = Number(transaksi.target_dp);

  const itjPaid = transaksi.pembayaran
    .filter((p) => p.jenis_pembayaran === "ITJ")
    .reduce((sum, p) => sum + Number(p.nominal), 0);

  const dpPaid = transaksi.pembayaran
    .filter((p) => p.jenis_pembayaran === "DP")
    .reduce((sum, p) => sum + Number(p.nominal), 0);

  const cicilanPaid = transaksi.pembayaran
    .filter(
      (p) =>
        p.jenis_pembayaran === "CICILAN" || p.jenis_pembayaran === "PELUNASAN"
    )
    .reduce((sum, p) => sum + Number(p.nominal), 0);

  const totalPaid = transaksi.pembayaran.reduce(
    (sum, p) => sum + Number(p.nominal),
    0
  );

  const sisaItj = Math.max(0, targetItj - itjPaid);
  const sisaDp = Math.max(0, targetDp - dpPaid);
  const sisaPelunasan = Math.max(0, hargaDeal - totalPaid);

  const getJenisBayarBadge = (jenis: string) => {
    switch (jenis) {
      case "ITJ":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DP":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "CICILAN":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "PELUNASAN":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-bone text-graphite border-mist";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Breadcrumb Back Navigation ─── */}
      <div>
        <Link
          href="/admin/transaksi"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate hover:text-carbon-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Master Transaksi</span>
        </Link>
      </div>

      {/* ─── 1. HEADER CARD ─── */}
      <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-teal-50 text-deep-teal flex items-center justify-center shrink-0 mt-0.5">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight">
                {transaksi.customer.nama_ktp}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-bone text-carbon-ink border border-mist">
                Unit {transaksi.unit.blok}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-deep-teal border border-teal-200">
                {transaksi.status_transaksi}
              </span>
            </div>
            <p className="text-xs text-slate mt-1">
              Transaksi #{transaksi.id} • Dibuat pada{" "}
              {formatDate(transaksi.created_at)} • Marketing PIC:{" "}
              <span className="font-semibold text-carbon-ink">
                {transaksi.marketing.nama}
              </span>
            </p>
          </div>
        </div>

        {/* Quick Action Buttons (Placeholders for Cetak SPR & Cetak Kwitansi) */}
        <QuickPrintActions
          transaksiId={transaksi.id}
          hasPembayaran={transaksi.pembayaran.length > 0}
        />
      </div>

      {/* ─── 2. CUSTOMER & UNIT INFO CARD ─── */}
      <div className="bg-white rounded-lg border border-mist shadow-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-mist bg-bone/30 flex items-center gap-2">
          <User className="w-4 h-4 text-deep-teal" />
          <h2 className="text-sm font-bold text-carbon-ink uppercase tracking-wider">
            Informasi Konsumen & Unit Properti
          </h2>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Detail Konsumen */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-deep-teal border-b border-mist/80 pb-1">
              Data Identitas Konsumen
            </p>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate block text-[11px]">Nomor Induk Kependudukan (NIK)</span>
                <span className="font-mono font-semibold text-carbon-ink">
                  {transaksi.customer.nik}
                </span>
              </div>
              <div>
                <span className="text-slate block text-[11px]">Tempat, Tanggal Lahir (TTL)</span>
                <span className="font-medium text-carbon-ink">
                  {transaksi.customer.tempat_lahir},{" "}
                  {formatDate(transaksi.customer.tgl_lahir)}
                </span>
              </div>
              <div>
                <span className="text-slate block text-[11px]">Alamat Sesuai KTP</span>
                <span className="text-graphite leading-relaxed">
                  {transaksi.customer.alamat_ktp}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <Phone className="w-3.5 h-3.5 text-slate" />
                <span className="font-mono text-carbon-ink">
                  {transaksi.customer.no_hp}
                </span>
              </div>
            </div>
          </div>

          {/* Detail Unit Properti */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-deep-teal border-b border-mist/80 pb-1">
              Spesifikasi Unit Terpilih
            </p>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate block text-[11px]">Blok & Nomor Unit</span>
                <span className="font-mono font-bold text-sm text-carbon-ink">
                  {transaksi.unit.blok}
                </span>
              </div>
              <div>
                <span className="text-slate block text-[11px]">Tipe Properti</span>
                <span className="font-semibold text-carbon-ink">
                  {transaksi.unit.tipe.nama_tipe}
                </span>
              </div>
              <div>
                <span className="text-slate block text-[11px]">Kategori Unit</span>
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-bone text-graphite border border-mist mt-0.5">
                  {transaksi.unit.tipe.kategori}
                </span>
              </div>
              <div>
                <span className="text-slate block text-[11px]">Skema Transaksi</span>
                <span className="font-semibold text-carbon-ink">
                  {transaksi.metode_bayar.replace(/_/g, " ")}
                  {transaksi.tenor_bulan ? ` (${transaksi.tenor_bulan} Bulan)` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Nilai Transaksi & Target */}
          <div className="space-y-3 bg-bone/40 p-4 rounded-lg border border-mist">
            <p className="text-xs font-semibold text-deep-teal border-b border-mist/80 pb-1">
              Kesepakatan Finansial
            </p>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate">Harga Deal:</span>
                <span className="font-mono font-bold text-deep-teal text-sm">
                  {formatCurrency(hargaDeal)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-mist/60 pt-1.5">
                <span className="text-slate">Target ITJ:</span>
                <span className="font-mono font-semibold text-carbon-ink">
                  {formatCurrency(targetItj)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate">Target DP:</span>
                <span className="font-mono font-semibold text-carbon-ink">
                  {formatCurrency(targetDp)}
                </span>
              </div>

              {/* Progress Summary */}
              <div className="border-t border-mist/80 pt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate">Sisa ITJ:</span>
                  {sisaItj <= 0 ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Lunas
                    </span>
                  ) : (
                    <span className="font-mono font-semibold text-amber-600">
                      {formatCurrency(sisaItj)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate">Sisa DP:</span>
                  {sisaDp <= 0 ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Lunas
                    </span>
                  ) : (
                    <span className="font-mono font-semibold text-carbon-ink">
                      {formatCurrency(sisaDp)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. PAYMENT HISTORY CARD ─── */}
      <div className="bg-white rounded-lg border border-mist shadow-subtle overflow-hidden">
        <div className="p-5 border-b border-mist flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-carbon-ink">
                Riwayat Pembayaran & Kwitansi
              </h2>
              <p className="text-xs text-slate">
                Total Penerimaan Masuk:{" "}
                <span className="font-mono font-semibold text-emerald-600">
                  {formatCurrency(totalPaid)}
                </span>
              </p>
            </div>
          </div>

          {/* Button "+ Input Pembayaran" that opens Modal */}
          <PembayaranModal
            transaksiId={transaksi.id}
            sisaItj={sisaItj}
            sisaDp={sisaDp}
          />
        </div>

        {/* Payment History Table */}
        {transaksi.pembayaran.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-bone text-slate flex items-center justify-center mx-auto mb-3">
              <FileSpreadsheet className="w-6 h-6 text-steel" />
            </div>
            <h3 className="text-sm font-semibold text-carbon-ink">
              Belum ada data pembayaran
            </h3>
            <p className="text-xs text-slate mt-1 max-w-sm mx-auto">
              Klik tombol &quot;+ Input Pembayaran&quot; di atas untuk mencatat setoran
              tanda jadi (ITJ) atau uang muka (DP) dari konsumen.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bone/60 border-b border-mist text-slate font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Jenis Pembayaran</th>
                  <th className="px-5 py-3">Nominal</th>
                  <th className="px-5 py-3">Admin Penerima</th>
                  <th className="px-5 py-3">Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {transaksi.pembayaran.map((bayar) => (
                  <tr key={bayar.id} className="hover:bg-bone/30 transition-colors">
                    {/* Tanggal */}
                    <td className="px-5 py-3.5 text-slate font-medium whitespace-nowrap">
                      {formatDate(bayar.created_at)}
                    </td>

                    {/* Jenis Pembayaran */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${getJenisBayarBadge(
                          bayar.jenis_pembayaran
                        )}`}
                      >
                        {bayar.jenis_pembayaran}
                      </span>
                    </td>

                    {/* Nominal */}
                    <td className="px-5 py-3.5 font-mono font-bold text-deep-teal whitespace-nowrap">
                      {formatCurrency(Number(bayar.nominal))}
                    </td>

                    {/* Admin Penerima */}
                    <td className="px-5 py-3.5 text-slate font-medium">
                      {bayar.penerima?.nama ?? "Admin"}
                    </td>

                    {/* Catatan */}
                    <td className="px-5 py-3.5 text-graphite max-w-xs truncate">
                      {bayar.catatan || <span className="text-fog italic">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 4. DYNAMIC ACTION PANEL CARD ─── */}
      <DynamicActionPanel
        transaksiId={transaksi.id}
        leadId={transaksi.customer.lead_id}
        metodeBayar={transaksi.metode_bayar}
        kategoriUnit={transaksi.unit.tipe.kategori}
        currentStatus={transaksi.status_transaksi}
        initialBank={transaksi.nama_bank}
        initialNotaris={transaksi.nama_notaris}
        initialTglAkad={
          transaksi.tgl_akad ? transaksi.tgl_akad.toISOString() : null
        }
        initialCatatan={transaksi.catatan_admin}
      />
    </div>
  );
}
