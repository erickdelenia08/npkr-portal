import React from "react";
import Link from "next/link";
import {
  Users,
  Building2,
  FileCheck2,
  TrendingUp,
  PlusCircle,
  ArrowRight,
} from "lucide-react";

export default function MarketingDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Top Welcome Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-lg border border-mist shadow-subtle">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight">
            Dashboard Marketing
          </h1>
          <p className="text-sm text-slate mt-0.5">
            Selamat datang di Portal Marketing NPKR. Pantau prospek dan penjualan unit Anda.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/marketing/lead"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-prism-teal text-white text-xs md:text-sm font-semibold hover:bg-deep-teal transition-colors shadow-subtle"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Lead</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate uppercase tracking-wider">
              Total Lead Saya
            </span>
            <div className="w-8 h-8 rounded-md bg-teal-50 text-prism-teal flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-carbon-ink tracking-tight">
              24
            </span>
            <p className="text-xs text-slate mt-1">3 prospek baru hari ini</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate uppercase tracking-wider">
              Unit Tersedia
            </span>
            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-carbon-ink tracking-tight">
              48
            </span>
            <p className="text-xs text-slate mt-1">Subsidi & Komersil</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate uppercase tracking-wider">
              ITJ Diajukan
            </span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-carbon-ink tracking-tight">
              5
            </span>
            <p className="text-xs text-slate mt-1">Menunggu verifikasi admin</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate uppercase tracking-wider">
              Target Bulan Ini
            </span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-carbon-ink tracking-tight">
              80%
            </span>
            <p className="text-xs text-slate mt-1">4 dari 5 unit tercapai</p>
          </div>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle">
          <h2 className="text-sm font-semibold text-carbon-ink mb-3">
            Akses Cepat Fitur Marketing
          </h2>
          <div className="space-y-2">
            <Link
              href="/marketing/unit"
              className="flex items-center justify-between p-3 rounded-md bg-bone/50 hover:bg-bone border border-mist/50 transition-colors text-xs md:text-sm text-graphite"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-prism-teal" />
                <span>Katalog Unit Properti & Status Blok</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate" />
            </Link>

            <Link
              href="/marketing/itj"
              className="flex items-center justify-between p-3 rounded-md bg-bone/50 hover:bg-bone border border-mist/50 transition-colors text-xs md:text-sm text-graphite"
            >
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="w-4 h-4 text-prism-teal" />
                <span>Input Pengajuan ITJ Baru</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate" />
            </Link>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle">
          <h2 className="text-sm font-semibold text-carbon-ink mb-3">
            Tips Lapangan Hari Ini
          </h2>
          <p className="text-xs md:text-sm text-slate leading-relaxed">
            Pastikan bukti transfer tanda jadi (ITJ) konsumen difoto secara jelas dan
            segera diajukan melalui sistem agar status blok langsung terkunci (HOLD).
          </p>
        </div>
      </div>
    </div>
  );
}
