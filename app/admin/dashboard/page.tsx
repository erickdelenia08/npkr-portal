import React from "react";
import Link from "next/link";
import {
  FileCheck2,
  ReceiptText,
  Users,
  Building2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Top Welcome Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-lg border border-mist shadow-subtle">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight">
            Dashboard Administrasi & Keuangan
          </h1>
          <p className="text-sm text-slate mt-0.5">
            Kelola verifikasi berkas ITJ, pantau transaksi pelanggan, dan master data unit.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/validasi-itj"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-carbon-ink text-white text-xs md:text-sm font-semibold hover:bg-carbon-ink/90 transition-colors shadow-subtle"
          >
            <ShieldCheck className="w-4 h-4 text-prism-teal" />
            <span>Validasi ITJ Masuk</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate uppercase tracking-wider">
              Antrean Validasi ITJ
            </span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-carbon-ink tracking-tight">
              7
            </span>
            <p className="text-xs text-slate mt-1">Perlu pengecekan mutasi bank</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate uppercase tracking-wider">
              Total Transaksi Aktif
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-carbon-ink tracking-tight">
              32
            </span>
            <p className="text-xs text-slate mt-1">Fase berkas & akad notaris</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate uppercase tracking-wider">
              Lead Masuk
            </span>
            <div className="w-8 h-8 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-carbon-ink tracking-tight">
              140
            </span>
            <p className="text-xs text-slate mt-1">Total database lead CRM</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate uppercase tracking-wider">
              Total Unit Terdaftar
            </span>
            <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-carbon-ink tracking-tight">
              120
            </span>
            <p className="text-xs text-slate mt-1">Blok A sampai F</p>
          </div>
        </div>
      </div>

      {/* Admin Modules Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle">
          <h2 className="text-sm font-semibold text-carbon-ink mb-3">
            Menu Operasional Admin
          </h2>
          <div className="space-y-2">
            <Link
              href="/admin/validasi-itj"
              className="flex items-center justify-between p-3 rounded-md bg-bone/50 hover:bg-bone border border-mist/50 transition-colors text-xs md:text-sm text-graphite"
            >
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="w-4 h-4 text-prism-teal" />
                <span>Pemeriksaan Bukti Transfer & Acc ITJ</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate" />
            </Link>

            <Link
              href="/admin/transaksi"
              className="flex items-center justify-between p-3 rounded-md bg-bone/50 hover:bg-bone border border-mist/50 transition-colors text-xs md:text-sm text-graphite"
            >
              <div className="flex items-center gap-2.5">
                <ReceiptText className="w-4 h-4 text-prism-teal" />
                <span>Proses Pemberkasan, KPR & Kwitansi</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate" />
            </Link>

            <Link
              href="/admin/master-unit"
              className="flex items-center justify-between p-3 rounded-md bg-bone/50 hover:bg-bone border border-mist/50 transition-colors text-xs md:text-sm text-graphite"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-prism-teal" />
                <span>Pengaturan Master Unit & Harga Blok</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate" />
            </Link>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle">
          <h2 className="text-sm font-semibold text-carbon-ink mb-3">
            Prosedur Standar Administrasi
          </h2>
          <p className="text-xs md:text-sm text-slate leading-relaxed">
            Unit yang telah berstatus HOLD setelah pengajuan ITJ oleh marketing wajib
            diverifikasi dalam 1x24 jam. Jika transfer dana telah masuk ke rekening giro
            kantor, ubah status menjadi SOLD dan cetak Surat Pesanan Rumah (SPR).
          </p>
        </div>
      </div>
    </div>
  );
}
