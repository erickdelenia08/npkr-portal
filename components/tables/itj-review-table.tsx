// components/tables/itj-review-table.tsx
"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  User,
  Home,
  CreditCard,
  History,
  Phone,
  MessageSquare,
  Loader2,
  X,
  Search,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { StatusItj } from "@/generated/prisma";
import { reviewItj } from "@/actions/itj";

export interface SerializedItjReviewItem {
  id: number;
  reviewer_id: number;
  reviewer_nama: string;
  reviewer_role: string;
  keputusan: StatusItj;
  catatan: string | null;
  created_at: string;
}

export interface SerializedItjItem {
  id: number;
  lead_id: number;
  unit_id: number;
  status: StatusItj;
  nik: string;
  nama_ktp: string;
  nominal: number;
  target_dp: number;
  metode_bayar: string;
  tenor: number | null;
  diajukan_at: string;
  diputuskan_at: string | null;
  lead: {
    id: number;
    nama: string;
    no_hp: string;
    marketing: {
      id: number;
      nama: string;
      no_hp: string;
    } | null;
    customer: {
      tempat_lahir: string;
      tgl_lahir: string;
      alamat_ktp: string;
    } | null;
  };
  unit: {
    id: number;
    blok: string;
    status_unit: string;
    harga_deal: number;
    tipe: {
      nama_tipe: string;
      kategori: string;
      harga_dasar: number;
    } | null;
  };
  reviews: SerializedItjReviewItem[];
}

interface ItjReviewTableProps {
  initialItjs: SerializedItjItem[];
}

type TabKey = "MENUNGGU" | "PERLU_REVISI" | "DISETUJUI" | "DITOLAK";

export function ItjReviewTable({ initialItjs }: ItjReviewTableProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("MENUNGGU");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItj, setSelectedItj] = useState<SerializedItjItem | null>(null);

  // Review Dialog State
  const [reviewAction, setReviewAction] = useState<"SETUJUI" | "PERLU_REVISI" | "DITOLAK" | null>(null);
  const [reviewCatatan, setReviewCatatan] = useState("");
  const [isPending, startTransition] = useTransition();

  // Helper Formatter
  const formatRupiah = (val: number): string => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatDateTime = (val: string | null | undefined): string => {
    if (!val) return "-";
    const d = new Date(val);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeElapsed = (dateStr: string): string => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return "Baru saja";
    if (diffMinutes < 60) return `${diffMinutes} mnt lalu`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  // Group ITJs by tab
  const pendingItjs = initialItjs.filter((i) => i.status === "DIAJUKAN");
  const revisiItjs = initialItjs.filter((i) => i.status === "PERLU_REVISI");
  const approvedItjs = initialItjs.filter((i) => i.status === "DISETUJUI");
  const rejectedItjs = initialItjs.filter((i) => i.status === "DITOLAK");

  const currentTabItems = React.useMemo(() => {
    let items: SerializedItjItem[] = [];
    switch (activeTab) {
      case "MENUNGGU":
        items = pendingItjs;
        break;
      case "PERLU_REVISI":
        items = revisiItjs;
        break;
      case "DISETUJUI":
        items = approvedItjs;
        break;
      case "DITOLAK":
        items = rejectedItjs;
        break;
    }

    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.nama_ktp.toLowerCase().includes(q) ||
        item.nik.includes(q) ||
        item.unit.blok.toLowerCase().includes(q) ||
        (item.lead.marketing?.nama || "").toLowerCase().includes(q)
    );
  }, [activeTab, initialItjs, pendingItjs, revisiItjs, approvedItjs, rejectedItjs, searchQuery]);

  const handleOpenAction = (action: "SETUJUI" | "PERLU_REVISI" | "DITOLAK") => {
    setReviewAction(action);
    setReviewCatatan("");
  };

  const handleSubmitReview = () => {
    if (!selectedItj || !reviewAction) return;

    if (
      (reviewAction === "PERLU_REVISI" || reviewAction === "DITOLAK") &&
      !reviewCatatan.trim()
    ) {
      toast.error(
        reviewAction === "PERLU_REVISI"
          ? "Catatan perbaikan revisi wajib diisi"
          : "Alasan penolakan ITJ wajib diisi"
      );
      return;
    }

    startTransition(async () => {
      try {
        const keputusan: StatusItj =
          reviewAction === "SETUJUI"
            ? "DISETUJUI"
            : reviewAction === "PERLU_REVISI"
            ? "PERLU_REVISI"
            : "DITOLAK";

        const res = await reviewItj(selectedItj.id, keputusan, reviewCatatan);
        if (!res.success) {
          toast.error(res.error || "Gagal memproses review ITJ");
          return;
        }

        toast.success(
          reviewAction === "SETUJUI"
            ? "Pengajuan ITJ berhasil disetujui. Unit resmi SOLD & Lead Closing!"
            : reviewAction === "PERLU_REVISI"
            ? "Permintaan revisi berhasil dikirim ke marketing."
            : "Pengajuan ITJ ditolak & unit dikembalikan ke status AVAILABLE."
        );

        setReviewAction(null);
        setSelectedItj(null);
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
        toast.error(msg);
      }
    });
  };

  const getStatusBadge = (status: StatusItj) => {
    switch (status) {
      case "DIAJUKAN":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "PERLU_REVISI":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DISETUJUI":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "DITOLAK":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Tabs Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-mist shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("MENUNGGU")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "MENUNGGU"
                ? "bg-carbon-ink text-white shadow-2xs"
                : "text-slate hover:text-graphite hover:bg-bone"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Menunggu</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "MENUNGGU"
                  ? "bg-white/20 text-white"
                  : "bg-sky-100 text-sky-800"
              }`}
            >
              {pendingItjs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("PERLU_REVISI")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "PERLU_REVISI"
                ? "bg-amber-600 text-white shadow-2xs"
                : "text-slate hover:text-graphite hover:bg-bone"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Perlu Revisi</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "PERLU_REVISI"
                  ? "bg-white/20 text-white"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {revisiItjs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DISETUJUI")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "DISETUJUI"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-slate hover:text-graphite hover:bg-bone"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Disetujui</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "DISETUJUI"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {approvedItjs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("DITOLAK")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === "DITOLAK"
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-slate hover:text-graphite hover:bg-bone"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Ditolak</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "DITOLAK"
                  ? "bg-white/20 text-white"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {rejectedItjs.length}
            </span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-fog" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pembeli, blok, PIC..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
          />
        </div>
      </div>

      {/* 2. Table Component */}
      <div className="bg-white rounded-2xl border border-mist shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-bone/70 border-b border-mist text-slate font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Calon Pembeli</th>
                <th className="py-3 px-4">Unit Dipesan</th>
                <th className="py-3 px-4">PIC Marketing</th>
                <th className="py-3 px-4">Nominal ITJ &amp; DP</th>
                <th className="py-3 px-4">Waktu Diajukan</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {currentTabItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      <p className="font-semibold text-graphite">Tidak ada data pengajuan ITJ</p>
                      <p className="text-[11px] text-slate-400">
                        {searchQuery
                          ? "Tidak ditemukan pengajuan ITJ yang cocok dengan kata kunci."
                          : `Belum ada pengajuan berstatus ${activeTab.toLowerCase().replace("_", " ")}.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentTabItems.map((itj) => (
                  <tr
                    key={itj.id}
                    onClick={() => setSelectedItj(itj)}
                    className="hover:bg-bone/40 transition-colors cursor-pointer group"
                  >
                    {/* Pembeli */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-carbon-ink group-hover:text-prism-teal transition-colors">
                        {itj.nama_ktp}
                      </div>
                      <div className="text-[10px] font-mono text-slate mt-0.5">
                        NIK: {itj.nik}
                      </div>
                    </td>

                    {/* Unit */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-carbon-ink flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                        <span>Blok {itj.unit.blok}</span>
                      </div>
                      <div className="text-[10px] text-slate mt-0.5">
                        {itj.unit.tipe?.nama_tipe || "Tipe"} • {itj.unit.tipe?.kategori || "SUBSIDI"}
                      </div>
                    </td>

                    {/* Marketing */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-carbon-ink flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{itj.lead.marketing?.nama || "Marketing"}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate mt-0.5">
                        {itj.lead.marketing?.no_hp || "-"}
                      </div>
                    </td>

                    {/* Nominal */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-carbon-ink">
                        {formatRupiah(itj.nominal)}
                      </div>
                      <div className="text-[10px] text-slate mt-0.5">
                        DP: {formatRupiah(itj.target_dp)} • {itj.metode_bayar}
                      </div>
                    </td>

                    {/* Time elapsed */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate">
                      <div className="font-semibold text-graphite">
                        {formatTimeElapsed(itj.diajukan_at)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {formatDateTime(itj.diajukan_at)}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          itj.status
                        )}`}
                      >
                        {itj.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItj(itj);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-mist bg-white text-slate hover:text-carbon-ink hover:border-slate-300 text-xs font-semibold shadow-2xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Detail View Modal */}
      {selectedItj && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-mist shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-mist bg-bone/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-prism-teal flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-carbon-ink">
                      Detail Pengajuan ITJ
                    </h2>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                        selectedItj.status
                      )}`}
                    >
                      {selectedItj.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate">
                    Diajukan {formatDateTime(selectedItj.diajukan_at)} ({formatTimeElapsed(selectedItj.diajukan_at)})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItj(null)}
                className="p-1.5 rounded-full text-slate hover:text-graphite hover:bg-bone transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Section 1: Calon Pembeli */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-carbon-ink uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-prism-teal" />
                  <span>1. Data Calon Pembeli</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-bone/50 border border-mist text-xs">
                  <div>
                    <span className="text-[10px] text-slate">Nama Sesuai KTP</span>
                    <p className="font-bold text-carbon-ink">{selectedItj.nama_ktp}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate">NIK</span>
                    <p className="font-mono font-bold text-carbon-ink">{selectedItj.nik}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate">Nomor HP</span>
                    <p className="font-mono font-bold text-carbon-ink">{selectedItj.lead.no_hp}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate">Tempat / Tgl Lahir</span>
                    <p className="font-medium text-graphite">
                      {selectedItj.lead.customer?.tempat_lahir || "-"}{" "}
                      {selectedItj.lead.customer?.tgl_lahir
                        ? `• ${new Date(selectedItj.lead.customer.tgl_lahir).toLocaleDateString("id-ID")}`
                        : ""}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate">Alamat KTP</span>
                    <p className="font-medium text-graphite">{selectedItj.lead.customer?.alamat_ktp || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Unit & Finansial */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-carbon-ink uppercase tracking-wider flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-prism-teal" />
                  <span>2. Unit Dipesan &amp; Finansial</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-bone/50 border border-mist text-xs">
                  <div>
                    <span className="text-[10px] text-slate">Blok Unit</span>
                    <p className="font-bold text-carbon-ink text-sm">Blok {selectedItj.unit.blok}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate">Tipe &amp; Kategori</span>
                    <p className="font-medium text-graphite">
                      {selectedItj.unit.tipe?.nama_tipe || "-"} ({selectedItj.unit.tipe?.kategori || "SUBSIDI"})
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate">Nominal Tanda Jadi (ITJ)</span>
                    <p className="font-bold text-teal-700 text-sm">{formatRupiah(selectedItj.nominal)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate">Target DP</span>
                    <p className="font-bold text-carbon-ink">{formatRupiah(selectedItj.target_dp)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate">Metode Bayar</span>
                    <p className="font-bold text-carbon-ink">{selectedItj.metode_bayar}</p>
                  </div>
                  {selectedItj.metode_bayar === "KPR" && (
                    <div>
                      <span className="text-[10px] text-slate">Tenor KPR</span>
                      <p className="font-bold text-carbon-ink">{selectedItj.tenor} Bulan</p>
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-slate">Status Unit Saat Ini</span>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      {selectedItj.unit.status_unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate">Halaman Lead</span>
                    <Link
                      href={`/marketing/lead/${selectedItj.lead_id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-prism-teal hover:underline mt-0.5"
                    >
                      <span>Lihat Lead</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Section 3: Marketing PIC */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-carbon-ink uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-prism-teal" />
                  <span>3. Marketing PIC</span>
                </h3>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-bone/50 border border-mist text-xs">
                  <div>
                    <p className="font-bold text-carbon-ink">
                      {selectedItj.lead.marketing?.nama || "Marketing Belum Ditugaskan"}
                    </p>
                    <p className="text-[11px] text-slate mt-0.5 font-mono">
                      {selectedItj.lead.marketing?.no_hp || "-"}
                    </p>
                  </div>
                  {selectedItj.lead.marketing?.no_hp && (
                    <a
                      href={`tel:${selectedItj.lead.marketing.no_hp}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-mist text-xs font-semibold text-slate hover:text-carbon-ink"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Hubungi PIC</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Section 4: Riwayat Review Sebelumnya */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-carbon-ink uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-prism-teal" />
                  <span>4. Riwayat Review ITJ ({selectedItj.reviews.length})</span>
                </h3>
                {selectedItj.reviews.length === 0 ? (
                  <div className="p-3 text-center rounded-xl bg-bone/30 border border-mist text-[11px] text-slate italic">
                    Belum ada catatan review sebelumnya.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedItj.reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-3 rounded-xl bg-bone/40 border border-mist text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(
                                rev.keputusan
                              )}`}
                            >
                              {rev.keputusan}
                            </span>
                            <span className="font-semibold text-carbon-ink">
                              oleh {rev.reviewer_nama} ({rev.reviewer_role})
                            </span>
                          </div>
                          <span className="text-[10px] text-slate font-mono">
                            {formatDateTime(rev.created_at)}
                          </span>
                        </div>
                        {rev.catatan && (
                          <p className="text-slate-700 italic bg-white p-2 rounded-lg border border-mist/60 text-[11px]">
                            &ldquo;{rev.catatan}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="px-6 py-4 border-t border-mist bg-bone/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedItj(null)}
                className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-xl hover:bg-bone transition-colors"
              >
                Tutup
              </button>

              {/* Action Buttons for Pending / Revisi */}
              {selectedItj.status === "DIAJUKAN" || selectedItj.status === "PERLU_REVISI" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAction("PERLU_REVISI")}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Minta Revisi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAction("DITOLAK")}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Tolak</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenAction("SETUJUI")}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Setujui ITJ</span>
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate italic">
                  Status ITJ sudah {selectedItj.status} (Selesai diputuskan).
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Action Confirmation Dialog (Setujui / Revisi / Tolak) */}
      {reviewAction && selectedItj && (
        <div
          className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-mist shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-mist">
              <div className="flex items-center gap-2">
                {reviewAction === "SETUJUI" ? (
                  <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : reviewAction === "PERLU_REVISI" ? (
                  <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                )}
                <h3 className="text-sm font-bold text-carbon-ink">
                  {reviewAction === "SETUJUI"
                    ? "Konfirmasi Setujui ITJ"
                    : reviewAction === "PERLU_REVISI"
                    ? "Kirim Permintaan Revisi"
                    : "Konfirmasi Tolak ITJ"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewAction(null)}
                className="p-1 rounded-full text-slate hover:text-graphite hover:bg-bone"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate">
                {reviewAction === "SETUJUI"
                  ? `Menyetujui ITJ untuk ${selectedItj.nama_ktp} (Blok ${selectedItj.unit.blok}) akan mengubah status unit menjadi SOLD dan menandai Lead resmi Closing.`
                  : reviewAction === "PERLU_REVISI"
                  ? `Pengajuan ITJ untuk ${selectedItj.nama_ktp} akan berstatus PERLU REVISI. Marketing dapat memperbaiki form berdasarkan catatan Anda.`
                  : `Menolak ITJ untuk ${selectedItj.nama_ktp} akan melepaskan Blok ${selectedItj.unit.blok} kembali ke status AVAILABLE.`}
              </p>

              <div>
                <label className="block text-xs font-semibold text-graphite mb-1.5 flex items-center justify-between">
                  <span>
                    {reviewAction === "SETUJUI" ? "Catatan Tambahan (Opsional)" : "Catatan Review"}
                  </span>
                  {reviewAction !== "SETUJUI" && (
                    <span className="text-[10px] text-rose-500 font-bold">* Wajib diisi</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={reviewCatatan}
                  onChange={(e) => setReviewCatatan(e.target.value)}
                  placeholder={
                    reviewAction === "SETUJUI"
                      ? "Contoh: Berkas tanda jadi telah diverifikasi dan dana masuk ke rekening..."
                      : reviewAction === "PERLU_REVISI"
                      ? "Contoh: Mohon perbaiki NIK dan lampirkan konfirmasi target DP yang benar..."
                      : "Contoh: Konsumen tidak memenuhi syarat verifikasi berkas perbankan..."
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-mist">
              <button
                type="button"
                onClick={() => setReviewAction(null)}
                disabled={isPending}
                className="px-3.5 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-lg hover:bg-bone transition-colors disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={
                  isPending ||
                  ((reviewAction === "PERLU_REVISI" || reviewAction === "DITOLAK") &&
                    !reviewCatatan.trim())
                }
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded-lg shadow-subtle transition-all disabled:opacity-50 cursor-pointer ${
                  reviewAction === "SETUJUI"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : reviewAction === "PERLU_REVISI"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>
                    {reviewAction === "SETUJUI"
                      ? "Setujui Sekarang"
                      : reviewAction === "PERLU_REVISI"
                      ? "Kirim Revisi"
                      : "Tolak ITJ"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
