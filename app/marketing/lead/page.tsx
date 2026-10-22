import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, SumberLead } from "@/generated/prisma";
import {
  getLeadTahap,
  formatWhatsAppUrl,
  mapToSumberLead,
} from "@/lib/lead-utils";
import {
  Users,
  Search,
  MessageCircle,
  Clock,
  AlertCircle,
  Calendar,
  Filter,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Phone,
  Home,
  CheckCircle2,
} from "lucide-react";
import { CreateLeadModalButton } from "@/components/leads/create-lead-modal-button";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Daftar Lead Marketing | NPKR Portal",
  description: "Daftar prospek dan tindak lanjut lead konsumen marketing",
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const SUMBER_OPTIONS = [
  { value: "ALL", label: "Semua Sumber" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "FACEBOOK_ADS", label: "Facebook Ads" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "WA_KANTOR", label: "WA Kantor" },
  { value: "REFERRAL", label: "Referral / Teman" },
  { value: "LAINNYA", label: "Lainnya" },
];

function formatDateIndo(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

function getTahapBadge(tahap: string) {
  const norm = tahap.toUpperCase();
  switch (norm) {
    case "LOST":
      return {
        label: "LOST",
        className: "bg-red-50 text-red-700 border-red-200",
      };
    case "CLOSING":
      return {
        label: "CLOSING",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "ITJ DIAJUKAN":
      return {
        label: "ITJ DIAJUKAN",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "SUDAH SURVEI":
      return {
        label: "SUDAH SURVEI",
        className: "bg-indigo-50 text-indigo-700 border-indigo-200",
      };
    case "SURVEI DIJADWALKAN":
      return {
        label: "SURVEI DIJADWALKAN",
        className: "bg-purple-50 text-purple-700 border-purple-200",
      };
    case "LEAD MASUK":
    default:
      return {
        label: "LEAD MASUK",
        className: "bg-sky-50 text-sky-700 border-sky-200",
      };
  }
}

export default async function MarketingLeadPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : undefined;
  const role = session?.user?.role;

  // 1. Await Next.js 15 searchParams (Strict URL Query String State Management)
  const resolvedParams = await searchParams;

  const rawSumber =
    typeof resolvedParams.sumber === "string" ? resolvedParams.sumber : undefined;
  const rawFollowUp =
    typeof resolvedParams.follow_up === "string"
      ? resolvedParams.follow_up.toLowerCase()
      : undefined;
  const rawSearch =
    typeof (resolvedParams.q || resolvedParams.search) === "string"
      ? String(resolvedParams.q || resolvedParams.search).trim()
      : undefined;

  // 2. Server-side Data Fetching
  const where: Prisma.LeadWhereInput = {};

  if (role === "MARKETING" && userId) {
    where.marketing_id = userId;
  }

  if (rawSumber && rawSumber !== "ALL") {
    where.sumber = mapToSumberLead(rawSumber);
  }

  if (rawSearch) {
    where.OR = [
      { nama: { contains: rawSearch } },
      { no_hp: { contains: rawSearch } },
      { minat_tipe: { contains: rawSearch } },
    ];
  }

  const rawLeads = await prisma.lead.findMany({
    where,
    include: {
      aktivitas: {
        orderBy: { created_at: "desc" },
        take: 1,
      },
      customer: {
        include: {
          transaksi: {
            select: {
              closing_at: true,
              status_transaksi: true,
            },
          },
        },
      },
      itj: {
        orderBy: { created_at: "desc" },
        take: 1,
        include: {
          transaksi: {
            select: {
              closing_at: true,
              status_transaksi: true,
            },
          },
        },
      },
      marketing: {
        select: {
          id: true,
          nama: true,
          no_hp: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  // Date Boundaries for Follow-Up Evaluation
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  // Map and evaluate follow-up info & stages
  const evaluatedLeads = rawLeads.map((lead) => {
    const latestAktivitas = lead.aktivitas[0] || null;
    const rawFollowUpDate = lead.next_follow_up_at || latestAktivitas?.tgl_follow_up;
    const tglFollowUp = rawFollowUpDate
      ? new Date(rawFollowUpDate)
      : null;

    let followUpType: "OVERDUE" | "TODAY" | "UPCOMING" | "MISSING";
    let followUpLabel: string;
    let followUpClass: string;

    if (!tglFollowUp) {
      followUpType = "MISSING";
      followUpLabel = "Belum Dijadwalkan";
      // Yellow text if missing
      followUpClass = "text-amber-700 bg-amber-50 border-amber-200 font-medium";
    } else if (tglFollowUp < startOfToday) {
      followUpType = "OVERDUE";
      followUpLabel = `Terlambat (${formatDateIndo(tglFollowUp)})`;
      // Red text if overdue
      followUpClass = "text-red-700 bg-red-50 border-red-200 font-semibold";
    } else if (tglFollowUp >= startOfToday && tglFollowUp <= endOfToday) {
      followUpType = "TODAY";
      followUpLabel = "Hari Ini";
      followUpClass = "text-teal-800 bg-teal-50 border-teal-200 font-semibold";
    } else {
      followUpType = "UPCOMING";
      followUpLabel = formatDateIndo(tglFollowUp);
      // Standard text if upcoming
      followUpClass = "text-slate-600 bg-slate-50 border-slate-200";
    }

    const computedTahap = getLeadTahap(lead);

    return {
      ...lead,
      tglFollowUp,
      followUpType,
      followUpLabel,
      followUpClass,
      computedTahap,
      latestAktivitas,
    };
  });

  // Calculate urgency metrics for tabs before filtering by follow_up
  const countAll = evaluatedLeads.length;
  const countTerlambat = evaluatedLeads.filter(
    (l) => l.followUpType === "OVERDUE"
  ).length;
  const countHariIni = evaluatedLeads.filter(
    (l) => l.followUpType === "TODAY"
  ).length;
  const countBelumDijadwal = evaluatedLeads.filter(
    (l) => l.followUpType === "MISSING"
  ).length;

  // Filter list by follow_up status if selected in searchParams
  let filteredLeads = evaluatedLeads;
  if (rawFollowUp && rawFollowUp !== "all") {
    filteredLeads = evaluatedLeads.filter((item) => {
      if (rawFollowUp === "terlambat") return item.followUpType === "OVERDUE";
      if (rawFollowUp === "hari_ini") return item.followUpType === "TODAY";
      if (rawFollowUp === "belum_dijadwal") return item.followUpType === "MISSING";
      return true;
    });
  }

  // URL Helper to build query strings preserving other active filters
  const buildQueryUrl = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      sumber: rawSumber,
      follow_up: rawFollowUp,
      q: rawSearch,
      ...updates,
    };

    Object.entries(merged).forEach(([k, v]) => {
      if (v && v !== "ALL" && v !== "all" && v.trim() !== "") {
        params.set(k, v);
      }
    });

    const qs = params.toString();
    return qs ? `/marketing/lead?${qs}` : "/marketing/lead";
  };

  const hasActiveFilters = Boolean(
    (rawSumber && rawSumber !== "ALL") ||
      (rawFollowUp && rawFollowUp !== "all") ||
      rawSearch
  );

  return (
    <div className="space-y-4 md:space-y-5">
      {/* ─── 1. PAGE HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 md:p-5 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">
                Daftar Lead &amp; Prospek
              </h1>
              <p className="text-xs text-slate-500">
                Kelola prospek konsumen, atur jadwal survei, dan tindak lanjuti prospek
              </p>
            </div>
          </div>
        </div>

        {/* Modal Button: Tambah Lead */}
        <CreateLeadModalButton />
      </div>

      {/* ─── 2. STRICT QUERY STRING FILTER BAR (NO useState) ─── */}
      <div className="bg-white rounded-lg border border-slate-200 p-3.5 md:p-4 shadow-xs space-y-3">
        {/* Follow-up Quick Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <Link
            href={buildQueryUrl({ follow_up: undefined })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors shrink-0 ${
              !rawFollowUp || rawFollowUp === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>Semua</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {countAll}
            </span>
          </Link>

          <Link
            href={buildQueryUrl({ follow_up: "terlambat" })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors shrink-0 ${
              rawFollowUp === "terlambat"
                ? "bg-red-700 text-white"
                : countTerlambat > 0
                ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Terlambat</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-200/50">
              {countTerlambat}
            </span>
          </Link>

          <Link
            href={buildQueryUrl({ follow_up: "hari_ini" })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors shrink-0 ${
              rawFollowUp === "hari_ini"
                ? "bg-teal-700 text-white"
                : countHariIni > 0
                ? "bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Hari Ini</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-200/50">
              {countHariIni}
            </span>
          </Link>

          <Link
            href={buildQueryUrl({ follow_up: "belum_dijadwal" })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors shrink-0 ${
              rawFollowUp === "belum_dijadwal"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Belum Dijadwal</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200/50">
              {countBelumDijadwal}
            </span>
          </Link>
        </div>

        {/* Search & Sumber GET Form (Native URL Submission) */}
        <form
          method="GET"
          action="/marketing/lead"
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-slate-100"
        >
          {/* Preserve follow_up query in hidden input */}
          {rawFollowUp && (
            <input type="hidden" name="follow_up" value={rawFollowUp} />
          )}

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="q"
              defaultValue={rawSearch || ""}
              placeholder="Cari nama, no. HP, atau tipe unit..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
            />
          </div>

          {/* Sumber Dropdown */}
          <div className="sm:w-48">
            <select
              name="sumber"
              defaultValue={rawSumber || "ALL"}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
            >
              {SUMBER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Search Button */}
          <Button
            type="submit"
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-1.5 h-auto shrink-0"
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            <span>Filter</span>
          </Button>

          {/* Reset Filters Link */}
          {hasActiveFilters && (
            <Link
              href="/marketing/lead"
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Link>
          )}
        </form>
      </div>

      {/* ─── 3. LEADS LIST: DESKTOP TABLE & MOBILE CARDS ─── */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-10 md:p-14 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Tidak Ada Data Lead Ditemukan
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Tidak ada prospek yang sesuai dengan kriteria filter yang dipilih.
            </p>
          </div>
          {hasActiveFilters && (
            <Link
              href="/marketing/lead"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Semua Filter</span>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* ─── DESKTOP DATA TABLE (md:block) ─── */}
          <div className="hidden md:block bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th scope="col" className="px-4 py-3.5">
                      Konsumen / Lead
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Sumber
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Minat Tipe
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Tahap Milestone
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Jadwal Follow-Up
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      Aksi Cepat
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((lead) => {
                    const badge = getTahapBadge(lead.computedTahap);
                    const waUrl = formatWhatsAppUrl(lead.no_hp, lead.nama);

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Nama & Kontak */}
                        <td className="px-4 py-3">
                          <Link
                            href={`/marketing/lead/${lead.id}`}
                            className="font-bold text-slate-800 hover:text-teal-700 text-sm block"
                          >
                            {lead.nama}
                          </Link>
                          <span className="text-slate-500 text-[11px] font-mono">
                            {lead.no_hp}
                          </span>
                        </td>

                        {/* Sumber */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {lead.sumber.replace(/_/g, " ")}
                          </span>
                        </td>

                        {/* Minat Tipe */}
                        <td className="px-4 py-3">
                          <span className="text-slate-700 font-medium">
                            {lead.minat_tipe || "-"}
                          </span>
                        </td>

                        {/* Tahap Milestone Badge */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        {/* Follow-Up Column: Red if overdue, Yellow if missing, standard text if upcoming */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${lead.followUpClass}`}
                          >
                            {lead.followUpType === "OVERDUE" && (
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                            )}
                            {lead.followUpType === "MISSING" && (
                              <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                            )}
                            {lead.followUpType === "TODAY" && (
                              <Calendar className="w-3.5 h-3.5 shrink-0 text-teal-700" />
                            )}
                            <span>{lead.followUpLabel}</span>
                          </span>
                        </td>

                        {/* Aksi Cepat: wa.me Button & Detail Link */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick wa.me Button */}
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-2xs"
                              title="Chat WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>

                            {/* Detail Link */}
                            <Link
                              href={`/marketing/lead/${lead.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                            >
                              <span>Detail</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── MOBILE VERTICAL CARDS (md:hidden) ─── */}
          <div className="md:hidden space-y-3">
            {filteredLeads.map((lead) => {
              const badge = getTahapBadge(lead.computedTahap);
              const waUrl = formatWhatsAppUrl(lead.no_hp, lead.nama);

              return (
                <div
                  key={lead.id}
                  className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3"
                >
                  {/* Card Header: Nama & Milestone Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/marketing/lead/${lead.id}`}
                        className="font-bold text-slate-900 text-sm hover:text-teal-700"
                      >
                        {lead.nama}
                      </Link>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {lead.no_hp}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Card Metadata: Sumber & Minat Tipe */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Sumber
                      </span>
                      <span className="font-medium text-slate-700">
                        {lead.sumber.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Minat Tipe
                      </span>
                      <span className="font-medium text-slate-700">
                        {lead.minat_tipe || "-"}
                      </span>
                    </div>
                  </div>

                  {/* Follow-Up Status Row */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Jadwal Follow-Up:
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs border ${lead.followUpClass}`}
                    >
                      {lead.followUpType === "OVERDUE" && (
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                      )}
                      {lead.followUpType === "MISSING" && (
                        <Clock className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      )}
                      {lead.followUpType === "TODAY" && (
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-teal-700" />
                      )}
                      <span>{lead.followUpLabel}</span>
                    </span>
                  </div>

                  {/* Card Footer: Quick wa.me button & Detail Link */}
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-2xs"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Chat WhatsApp</span>
                    </a>

                    <Link
                      href={`/marketing/lead/${lead.id}`}
                      className="inline-flex items-center justify-center gap-1 py-2 px-3.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      <span>Detail</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
