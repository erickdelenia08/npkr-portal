// app/manager/transaksi/page.tsx
import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ReceiptText,
  Building2,
  Banknote,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  ManagerTransaksiTable,
  SerializedManagerTransaksi,
} from "@/components/tables/manager-transaksi-table";

export const metadata: Metadata = {
  title: "Pantauan Transaksi (Read-Only) | Manager Portal",
  description:
    "Monitoring alur transaksi konsumen, proses pemberkasan bank, approval SP3K, hingga akad dan BAST.",
};

export default async function ManagerTransaksiPage() {
  await connection();
  const session = await auth();

  // Strict RBAC Enforcement
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    redirect("/marketing/dashboard");
  }

  // Fetch all Transaksi records with required relations
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

  // Safe Serialization for Client Component
  const serialized: SerializedManagerTransaksi[] = rawTransaksi.map((trx) => {
    // Tanggal ITJ: ambil dari ITJ disetujui atau fallback ke trx.created_at
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

  // Calculate Quick Executive Metrics
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─── Header Banner ─── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-mist shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 text-prism-teal flex items-center justify-center shrink-0">
              <ReceiptText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-carbon-ink tracking-tight">
                  Pantauan Transaksi &amp; Akad
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Read-Only Mode
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate mt-0.5">
                Pengawasan langsung status tahapan transaksi oleh Admin: Pemberkasan, BI Checking/SP3K Bank, hingga Akad Kredit &amp; BAST.
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate font-bold uppercase tracking-wider block">
              Total Nilai Transaksi
            </span>
            <span className="text-lg sm:text-xl font-bold text-carbon-ink font-mono">
              {formattedTotalNilai}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Summary Metric Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Transaksi */}
        <div className="bg-white p-4 rounded-xl border border-mist shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 text-prism-teal flex items-center justify-center shrink-0">
            <ReceiptText className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate font-bold uppercase tracking-wider">
              Total Transaksi
            </p>
            <p className="text-lg font-bold text-carbon-ink tabular-nums">
              {totalTransaksi}
            </p>
          </div>
        </div>

        {/* Tahap Pemberkasan */}
        <div className="bg-white p-4 rounded-xl border border-mist shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate font-bold uppercase tracking-wider">
              Pemberkasan (Orange)
            </p>
            <p className="text-lg font-bold text-amber-950 tabular-nums">
              {countPemberkasan}
            </p>
          </div>
        </div>

        {/* Proses Bank / SP3K */}
        <div className="bg-white p-4 rounded-xl border border-mist shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate font-bold uppercase tracking-wider">
              Bank / SP3K (Blue)
            </p>
            <p className="text-lg font-bold text-blue-950 tabular-nums">
              {countProsesBank}
            </p>
          </div>
        </div>

        {/* Akad / BAST Selesai */}
        <div className="bg-white p-4 rounded-xl border border-mist shadow-2xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4.5 h-4.5" />
          </div>
          <div>
            <p className="text-[10px] text-slate font-bold uppercase tracking-wider">
              Akad / BAST (Green)
            </p>
            <p className="text-lg font-bold text-emerald-950 tabular-nums">
              {countAkadBast}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Manager Read-Only Data Table ─── */}
      <ManagerTransaksiTable data={serialized} />
    </div>
  );
}
