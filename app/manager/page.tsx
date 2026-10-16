// app/manager/page.tsx
import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  AlertTriangle,
  UserPlus,
  Trophy,
  TrendingUp,
  Users,
  Compass,
  CheckCircle2,
  Calendar,
  Phone,
  MessageCircle,
  ArrowRight,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  ArrowUpRight,
  Flame,
  AlertCircle,
  Layers,
  ChevronRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Manager Command Center | NPKR Portal",
  description:
    "Dashboard Eksekutif & Supervisi Penjualan: Lead Lampu Merah, Distribusi Prospek, Leaderboard Marketing, dan Funnel Global.",
};

// Interface for Neglected Leads (Lampu Merah)
interface NeglectedLead {
  id: number;
  nama: string;
  no_hp: string;
  sumber: string;
  minat_tipe: string | null;
  marketing: {
    id: number;
    nama: string;
    no_hp: string;
  } | null;
  alasanTipe: "OVERDUE_FOLLOW_UP" | "NO_ACTIVITY_7_DAYS" | "NO_ACTIVITY_NEW";
  alasanLabel: string;
  hariTerlewat: number;
  tanggalAcuan: Date;
}

// Interface for Leaderboard Marketing
interface MarketingLeaderboardItem {
  id: number;
  nama: string;
  username: string;
  no_hp: string;
  totalItjApproved: number;
  totalNominalItj: number;
  totalClosing: number;
}

// Helper: Format Rupiah
function formatRupiah(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)} M`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)} Jt`;
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper: Clean WhatsApp Link
function getWhatsAppUrl(phone: string, message?: string): string {
  let clean = phone.replace(/[\s-+]/g, "");
  if (clean.startsWith("0")) {
    clean = "62" + clean.slice(1);
  }
  const base = `https://wa.me/${clean}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Helper: Format Indonesian Date
function formatIndoDate(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ManagerDashboardPage() {
  const session = await auth();

  // Strict RBAC Enforcement
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    redirect("/marketing/dashboard");
  }

  const now = new Date();
  const currentMonthName = now.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ─── PARALLEL DATA FETCHING ───
  const [
    leadsThisMonthCount,
    surveysThisMonthCount,
    closingThisMonthCount,
    totalActiveLeadsCount,
    rawActiveLeads,
    unassignedLeads,
    unassignedCount,
    rawMarketingUsers,
  ] = await Promise.all([
    // Widget 4: Funnel Counts
    prisma.lead.count({
      where: {
        created_at: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    }),
    prisma.lead.count({
      where: {
        survei_selesai_at: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    }),
    prisma.lead.count({
      where: {
        closing_at: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    }),
    prisma.lead.count({
      where: {
        closing_at: null,
        lost_at: null,
      },
    }),

    // Widget 1: Active leads for "Lampu Merah" calculation
    prisma.lead.findMany({
      where: {
        closing_at: null,
        lost_at: null,
      },
      include: {
        marketing: {
          select: {
            id: true,
            nama: true,
            no_hp: true,
          },
        },
        aktivitas: {
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
      orderBy: { created_at: "desc" },
    }),

    // Widget 2: "Lead Belum Bertuan" (Unassigned)
    prisma.lead.findMany({
      where: {
        marketing_id: null,
        closing_at: null,
        lost_at: null,
      },
      select: {
        id: true,
        nama: true,
        no_hp: true,
        sumber: true,
        minat_tipe: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
      take: 5,
    }),
    prisma.lead.count({
      where: {
        marketing_id: null,
        closing_at: null,
        lost_at: null,
      },
    }),

    // Widget 3: Leaderboard Marketing
    prisma.user.findMany({
      where: {
        role: "MARKETING",
        isActive: true,
      },
      select: {
        id: true,
        nama: true,
        username: true,
        no_hp: true,
        leads: {
          select: {
            id: true,
            closing_at: true,
            itj: {
              where: {
                status: "DISETUJUI",
                OR: [
                  {
                    diputuskan_at: {
                      gte: startOfMonth,
                      lte: endOfMonth,
                    },
                  },
                  {
                    diputuskan_at: null,
                    diajukan_at: {
                      gte: startOfMonth,
                      lte: endOfMonth,
                    },
                  },
                ],
              },
              select: {
                id: true,
                nominal: true,
                status: true,
              },
            },
          },
        },
      },
    }),
  ]);

  // ─── 1. PROCESS WIDGET 1: LAMPU MERAH (Neglected Leads) ───
  const neglectedLeads: NeglectedLead[] = [];

  for (const lead of rawActiveLeads) {
    const latestAct = lead.aktivitas[0];

    if (!latestAct) {
      // Belum ada aktivitas sama sekali
      const leadCreated = new Date(lead.created_at);
      if (leadCreated < sevenDaysAgo) {
        const days = Math.max(
          1,
          Math.floor((now.getTime() - leadCreated.getTime()) / (1000 * 60 * 60 * 24))
        );
        neglectedLeads.push({
          id: lead.id,
          nama: lead.nama,
          no_hp: lead.no_hp,
          sumber: lead.sumber,
          minat_tipe: lead.minat_tipe,
          marketing: lead.marketing,
          alasanTipe: "NO_ACTIVITY_NEW",
          alasanLabel: `Belum difollow-up (${days} hari sejak input)`,
          hariTerlewat: days,
          tanggalAcuan: leadCreated,
        });
      }
    } else if (latestAct.tgl_follow_up) {
      // Ada jadwal follow up yang sudah terlewat
      const followUpDate = new Date(latestAct.tgl_follow_up);
      if (followUpDate < now) {
        const days = Math.max(
          1,
          Math.floor((now.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24))
        );
        neglectedLeads.push({
          id: lead.id,
          nama: lead.nama,
          no_hp: lead.no_hp,
          sumber: lead.sumber,
          minat_tipe: lead.minat_tipe,
          marketing: lead.marketing,
          alasanTipe: "OVERDUE_FOLLOW_UP",
          alasanLabel: `Jadwal follow-up terlewat ${days} hari`,
          hariTerlewat: days,
          tanggalAcuan: followUpDate,
        });
      }
    } else {
      // Tidak ada tanggal follow up terjadwal, dan aktivitas terakhir > 7 hari yang lalu
      const actCreated = new Date(latestAct.created_at);
      if (actCreated < sevenDaysAgo) {
        const days = Math.max(
          1,
          Math.floor((now.getTime() - actCreated.getTime()) / (1000 * 60 * 60 * 24))
        );
        neglectedLeads.push({
          id: lead.id,
          nama: lead.nama,
          no_hp: lead.no_hp,
          sumber: lead.sumber,
          minat_tipe: lead.minat_tipe,
          marketing: lead.marketing,
          alasanTipe: "NO_ACTIVITY_7_DAYS",
          alasanLabel: `Tidak ada interaksi ${days} hari`,
          hariTerlewat: days,
          tanggalAcuan: actCreated,
        });
      }
    }
  }

  // Sort neglected leads: most overdue first
  neglectedLeads.sort((a, b) => b.hariTerlewat - a.hariTerlewat);

  // ─── 2. PROCESS WIDGET 3: MARKETING LEADERBOARD ───
  const leaderboard: MarketingLeaderboardItem[] = rawMarketingUsers.map((user) => {
    let totalItjApproved = 0;
    let totalNominalItj = 0;
    let totalClosing = 0;

    for (const lead of user.leads) {
      if (
        lead.closing_at &&
        new Date(lead.closing_at) >= startOfMonth &&
        new Date(lead.closing_at) <= endOfMonth
      ) {
        totalClosing += 1;
      }

      for (const itj of lead.itj) {
        totalItjApproved += 1;
        totalNominalItj += Number(itj.nominal);
      }
    }

    return {
      id: user.id,
      nama: user.nama,
      username: user.username,
      no_hp: user.no_hp,
      totalItjApproved,
      totalNominalItj,
      totalClosing,
    };
  });

  // Sort by total ITJ approved descending, then by nominal descending
  leaderboard.sort((a, b) => {
    if (b.totalItjApproved !== a.totalItjApproved) {
      return b.totalItjApproved - a.totalItjApproved;
    }
    return b.totalNominalItj - a.totalNominalItj;
  });

  const maxItj = leaderboard[0]?.totalItjApproved || 1;

  // ─── 3. PROCESS WIDGET 4: FUNNEL GLOBAL METRICS ───
  const surveyRate =
    leadsThisMonthCount > 0
      ? Math.round((surveysThisMonthCount / leadsThisMonthCount) * 100)
      : 0;
  const closingRate =
    surveysThisMonthCount > 0
      ? Math.round((closingThisMonthCount / surveysThisMonthCount) * 100)
      : 0;
  const overallWinRate =
    leadsThisMonthCount > 0
      ? Math.round((closingThisMonthCount / leadsThisMonthCount) * 100)
      : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ─── 1. COMMAND CENTER HEADER ─── */}
      <div className="bg-white rounded-2xl border border-mist shadow-2xs p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-prism-teal text-xs font-bold tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Manager Command Center</span>
              <span className="text-teal-300">•</span>
              <span className="text-graphite font-medium capitalize">
                Periode: {currentMonthName}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-carbon-ink tracking-tight">
              Dashboard Eksekutif &amp; Penjualan
            </h1>
            <p className="text-xs sm:text-sm text-slate max-w-2xl">
              Pantau status lampu merah prospek terabaikan, distribusi lead, konversi funnel bulanan, dan evaluasi pencapaian tim marketing.
            </p>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/manager/lead"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-bone border border-mist text-slate hover:text-carbon-ink text-xs font-bold shadow-2xs transition-all"
            >
              <Users className="w-4 h-4 text-prism-teal" />
              <span>Distribusi Lead</span>
            </Link>

            <Link
              href="/manager/tim"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-bone border border-mist text-slate hover:text-carbon-ink text-xs font-bold shadow-2xs transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Kelola Tim</span>
            </Link>

            <Link
              href="/manager/transaksi"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-carbon-ink hover:bg-slate-800 text-white text-xs font-bold shadow-subtle transition-all"
            >
              <span>Pantau Transaksi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 2. WIDGET 4: FUNNEL GLOBAL (Stat Cards & Funnel Flow) ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-prism-teal flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-carbon-ink">
              Funnel Global Prospek (Bulan Ini)
            </h2>
          </div>
          <span className="text-xs text-slate font-medium hidden sm:inline">
            Update real-time dari seluruh cabang
          </span>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Card 1: Lead Masuk */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-mist shadow-2xs relative overflow-hidden group hover:border-prism-teal/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate uppercase tracking-wider">
                1. Lead Masuk
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-extrabold text-carbon-ink tabular-nums">
                {leadsThisMonthCount}
              </p>
              <p className="text-[11px] text-slate">
                Dari brosur, walk-in, FB &amp; WA kantor
              </p>
            </div>
          </div>

          {/* Card 2: Survei Selesai */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-mist shadow-2xs relative overflow-hidden group hover:border-prism-teal/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate uppercase tracking-wider">
                2. Survei Selesai
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Compass className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-extrabold text-carbon-ink tabular-nums">
                {surveysThisMonthCount}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <span>{surveyRate}%</span>
                <span className="text-slate font-normal">dari lead berhasil diajak survei</span>
              </p>
            </div>
          </div>

          {/* Card 3: Closing Unit */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-mist shadow-2xs relative overflow-hidden group hover:border-prism-teal/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate uppercase tracking-wider">
                3. Unit Closing
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-950 tabular-nums">
                {closingThisMonthCount}
              </p>
              <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <span>{closingRate}%</span>
                <span className="text-slate font-normal">konversi dari pengunjung survei</span>
              </p>
            </div>
          </div>

          {/* Card 4: Total Lead Aktif */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-mist shadow-2xs relative overflow-hidden group hover:border-prism-teal/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate uppercase tracking-wider">
                Pipeline Aktif
              </span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-prism-teal flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl sm:text-3xl font-extrabold text-prism-teal tabular-nums">
                {totalActiveLeadsCount}
              </p>
              <p className="text-[11px] text-slate">
                Lead yang sedang berjalan (In-Pipeline)
              </p>
            </div>
          </div>
        </div>

        {/* Funnel Visual Pathway */}
        <div className="bg-bone/70 rounded-2xl p-4 border border-mist/70">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-mist shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                  1
                </div>
                <div>
                  <p className="text-xs font-bold text-carbon-ink">Tahap Input Prospek</p>
                  <p className="text-[11px] text-slate">{leadsThisMonthCount} Prospek Terdaftar</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-fog hidden md:block" />
            </div>

            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-mist shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center">
                  2
                </div>
                <div>
                  <p className="text-xs font-bold text-carbon-ink">Kunjungan Survei</p>
                  <p className="text-[11px] text-slate">{surveysThisMonthCount} Telah Cek Lokasi ({surveyRate}%)</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-fog hidden md:block" />
            </div>

            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-mist shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center">
                  3
                </div>
                <div>
                  <p className="text-xs font-bold text-carbon-ink">Closing &amp; Sahabat NPKR</p>
                  <p className="text-[11px] text-emerald-800 font-bold">{closingThisMonthCount} Unit Terkunci ({overallWinRate}% Win Rate)</p>
                </div>
              </div>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. PRIMARY TWO-COLUMN EXECUTIVE GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ─── LEFT COLUMN (7 Cols): WIDGET 1 "LAMPU MERAH" (Neglected Leads) ─── */}
        <section className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-mist shadow-2xs overflow-hidden">
            {/* Header Lampu Merah */}
            <div className="p-5 border-b border-mist flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-linear-to-r from-rose-50/50 via-white to-white">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-carbon-ink tracking-tight">
                      Lampu Merah: Lead Terabaikan
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                      {neglectedLeads.length} Kritis
                    </span>
                  </div>
                  <p className="text-xs text-slate">
                    Jadwal follow-up terlewat atau tidak ada aktivitas lebih dari 7 hari
                  </p>
                </div>
              </div>

              <Link
                href="/manager/lead"
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Lihat Semua Lead</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* List / Table Content */}
            {neglectedLeads.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-carbon-ink">
                  Kondisi Prima! Tidak Ada Lead Terabaikan
                </p>
                <p className="text-xs text-slate max-w-sm mx-auto">
                  Seluruh lead aktif saat ini terpantau difollow-up tepat waktu oleh tim marketing.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-bone/80 border-b border-mist text-slate font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Konsumen</th>
                      <th className="py-3 px-4">PIC Marketing</th>
                      <th className="py-3 px-4">Status &amp; Keterlambatan</th>
                      <th className="py-3 px-4 text-right">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist">
                    {neglectedLeads.slice(0, 8).map((lead) => (
                      <tr
                        key={lead.id}
                        className="hover:bg-rose-50/20 transition-colors"
                      >
                        {/* Konsumen */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <p className="font-bold text-carbon-ink text-xs">
                              {lead.nama}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate">
                              <span className="font-mono">{lead.no_hp}</span>
                              <span>•</span>
                              <span className="px-1.5 py-0.2 rounded bg-bone text-graphite border border-mist/80">
                                {lead.sumber}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* PIC Marketing */}
                        <td className="py-3 px-4">
                          {lead.marketing ? (
                            <div>
                              <p className="font-semibold text-carbon-ink">
                                {lead.marketing.nama}
                              </p>
                              {lead.marketing.no_hp && (
                                <Link
                                  href={getWhatsAppUrl(
                                    lead.marketing.no_hp,
                                    `Halo ${lead.marketing.nama}, mohon segera follow up konsumen ${lead.nama} (${lead.no_hp}) yang saat ini masuk status Lampu Merah di portal manager.`
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-teal-700 hover:underline font-mono"
                                >
                                  <MessageCircle className="w-2.5 h-2.5" />
                                  <span>Tegur PIC</span>
                                </Link>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>Belum Ditugaskan</span>
                            </span>
                          )}
                        </td>

                        {/* Status Terlambat */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                              <Clock className="w-3 h-3 text-rose-600" />
                              <span>{lead.alasanLabel}</span>
                            </span>
                            <p className="text-[10px] text-slate font-mono">
                              Acuan: {formatIndoDate(lead.tanggalAcuan)}
                            </p>
                          </div>
                        </td>

                        {/* Aksi Cepat */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Direct WhatsApp to Customer */}
                            <Link
                              href={getWhatsAppUrl(
                                lead.no_hp,
                                `Halo Bpk/Ibu ${lead.nama}, perkenalkan saya dari Manajemen NPKR Property. Bagaimana kabar rencana kepemilikan unit rumah Anda?`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs transition-colors"
                              title="Hubungi Konsumen via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </Link>

                            {/* View Detail Link */}
                            <Link
                              href={`/marketing/lead/${lead.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-bone border border-mist text-slate hover:text-carbon-ink text-[11px] font-bold shadow-2xs transition-colors"
                              title="Buka Lembar Kerja Lead"
                            >
                              <span>Detail</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {neglectedLeads.length > 8 && (
                  <div className="p-3 text-center border-t border-mist bg-bone/30">
                    <Link
                      href="/manager/lead"
                      className="text-xs font-bold text-prism-teal hover:underline"
                    >
                      Lihat {neglectedLeads.length - 8} lead terlambat lainnya di Manajemen Lead ➔
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ─── RIGHT COLUMN (5 Cols): WIDGET 2 & WIDGET 3 ─── */}
        <div className="lg:col-span-5 space-y-6">
          {/* ─── WIDGET 2: LEAD BELUM BERTUAN (Unassigned Leads) ─── */}
          <section className="bg-white rounded-2xl border border-mist shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-mist flex items-center justify-between bg-linear-to-r from-amber-50/50 via-white to-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <UserPlus className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-carbon-ink tracking-tight">
                      Lead Belum Bertuan
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                      {unassignedCount} Antrean
                    </span>
                  </div>
                  <p className="text-[11px] text-slate">
                    Prospek baru yang belum dialokasikan ke marketing
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {unassignedLeads.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <p className="font-semibold text-graphite">Semua lead sudah terbagi!</p>
                  <p className="text-[11px]">Tidak ada prospek baru yang menganggur.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {unassignedLeads.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-mist bg-bone/40 hover:bg-bone transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-carbon-ink">{item.nama}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate font-mono">
                          <span>{item.no_hp}</span>
                          <span>•</span>
                          <span className="font-sans px-1.5 py-0.2 rounded bg-white border border-mist text-graphite">
                            {item.sumber}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] text-slate font-mono shrink-0">
                        {formatIndoDate(new Date(item.created_at))}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Button: Route to Lead Management */}
              <Link
                href="/manager/lead"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold shadow-subtle transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Bagi Prospek di Manajemen Lead ({unassignedCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>

          {/* ─── WIDGET 3: LEADERBOARD MARKETING (Bulan Ini) ─── */}
          <section className="bg-white rounded-2xl border border-mist shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-mist flex items-center justify-between bg-linear-to-r from-teal-50/50 via-white to-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-prism-teal flex items-center justify-center shrink-0">
                  <Trophy className="w-4.5 h-4.5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-carbon-ink tracking-tight">
                    Leaderboard Tim Marketing
                  </h2>
                  <p className="text-[11px] text-slate">
                    Peringkat ITJ disetujui periode {currentMonthName}
                  </p>
                </div>
              </div>

              <Link
                href="/manager/tim"
                className="text-xs font-bold text-prism-teal hover:underline flex items-center gap-1"
              >
                <span>Lihat Tim</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-5 space-y-4">
              {leaderboard.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate space-y-1">
                  <Users className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="font-semibold text-graphite">Belum ada data marketing aktif</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((item, index) => {
                    const rank = index + 1;
                    const progressPercent =
                      maxItj > 0 ? Math.round((item.totalItjApproved / maxItj) * 100) : 0;

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-mist/80 bg-white hover:bg-bone/40 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {/* Rank Badge */}
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                rank === 1
                                  ? "bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs"
                                  : rank === 2
                                  ? "bg-slate-200 text-slate-800 border border-slate-300"
                                  : rank === 3
                                  ? "bg-amber-700/10 text-amber-900 border border-amber-700/30"
                                  : "bg-bone text-slate font-medium"
                              }`}
                            >
                              {rank === 1 ? (
                                <Flame className="w-4 h-4 text-amber-600" />
                              ) : (
                                `#${rank}`
                              )}
                            </div>

                            <div>
                              <p className="font-bold text-carbon-ink text-xs">
                                {item.nama}
                              </p>
                              <p className="text-[10px] text-slate font-mono">
                                @{item.username}
                              </p>
                            </div>
                          </div>

                          {/* Stats ITJ */}
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-carbon-ink tabular-nums">
                              <span>{item.totalItjApproved}</span>
                              <span className="text-[10px] text-slate font-normal uppercase">
                                ITJ
                              </span>
                            </span>
                            <p className="text-[10px] text-prism-teal font-semibold font-mono">
                              {formatRupiah(item.totalNominalItj)}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar relative to Top Leader */}
                        <div className="w-full bg-bone rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              rank === 1
                                ? "bg-amber-500"
                                : rank === 2
                                ? "bg-slate-400"
                                : "bg-prism-teal"
                            }`}
                            style={{
                              width: `${Math.max(6, progressPercent)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
