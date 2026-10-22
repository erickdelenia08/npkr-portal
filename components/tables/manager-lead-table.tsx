"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Phone,
  MessageCircle,
  Clock,
  Calendar,
  Compass,
  Home,
  UserPlus,
  ArrowRightLeft,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  LeadCardData,
  getLeads,
  reassignLead,
  updateLeadTahap,
} from "@/actions/lead";
import { LeadTahap } from "@/lib/lead-utils";
import { CreateLeadForm } from "@/components/leads/CreateLeadForm";

interface MarketingUserOption {
  id: number;
  nama: string;
  no_hp: string;
}

interface ManagerLeadTableProps {
  initialLeads: LeadCardData[];
  initialTotal: number;
  marketingUsers: MarketingUserOption[];
  userRole?: string;
  basePath?: string;
}

export function ManagerLeadTable({
  initialLeads,
  initialTotal,
  marketingUsers,
  userRole,
  basePath = "/manager",
}: ManagerLeadTableProps) {
  const [leads, setLeads] = useState<LeadCardData[]>(initialLeads);
  const [total, setTotal] = useState<number>(initialTotal);
  const [search, setSearch] = useState<string>("");
  const [tahapFilter, setTahapFilter] = useState<string>("");
  const [assignmentFilter, setAssignmentFilter] = useState<"ALL" | "UNASSIGNED" | "ASSIGNED">("ALL");
  const [selectedMarketingId, setSelectedMarketingId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [reassignModalLead, setReassignModalLead] = useState<LeadCardData | null>(null);
  const [targetMarketingId, setTargetMarketingId] = useState<string>("");
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  // Helper for WhatsApp link
  const formatWaLink = (noHp: string, nama: string): string => {
    let clean = noHp.replace(/[\s-+]/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }
    const message = encodeURIComponent(
      `Halo Bpk/Ibu ${nama}, saya dari tim marketing NPKR Property...`
    );
    return `https://wa.me/${clean}?text=${message}`;
  };

  // Helper for formatted date
  const formatDate = (val: Date | string | null | undefined): string => {
    if (!val) return "-";
    const date = typeof val === "string" ? new Date(val) : val;
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Helper for Tahap badge styling
  const getTahapBadge = (tahap: LeadTahap | string): string => {
    const norm = (tahap || "").toUpperCase().trim();
    switch (norm) {
      case "LEAD MASUK":
      case "BARU":
      case "FOLLOW_UP":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "SURVEI DIJADWALKAN":
      case "SURVEI_DIJADWALKAN":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "SUDAH SURVEI":
      case "SUDAH_SURVEI":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "ITJ DIAJUKAN":
      case "ITJ_DIAJUKAN":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "CLOSING":
      case "ITJ":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "LOST":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Refresh leads from Server Action
  const refreshLeads = (
    query = search,
    status = tahapFilter,
    assign = assignmentFilter,
    mId = selectedMarketingId
  ) => {
    startTransition(async () => {
      const res = await getLeads({
        search: query.trim() || undefined,
        tahap: status || undefined,
        unassigned_only: assign === "UNASSIGNED" ? true : undefined,
        marketing_id:
          assign === "ASSIGNED" && !mId
            ? undefined
            : mId
            ? Number(mId)
            : undefined,
      });

      if (res.success && res.data) {
        let resultLeads = res.data.leads;
        if (assign === "ASSIGNED" && !mId) {
          resultLeads = resultLeads.filter((l) => l.marketing_id !== null);
        }
        setLeads(resultLeads);
        setTotal(res.data.total);
      }
    });
  };

  // Count unassigned leads in currently loaded dataset
  const unassignedCount = useMemo(() => {
    return leads.filter((l) => l.marketing_id === null).length;
  }, [leads]);

  // Open Re-assign Modal
  const handleOpenReassign = (lead: LeadCardData) => {
    setReassignModalLead(lead);
    setTargetMarketingId(lead.marketing_id ? String(lead.marketing_id) : "");
  };

  // Submit Re-assign Lead
  const handleConfirmReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModalLead || !targetMarketingId) {
      toast.error("Pilih marketing tujuan terlebih dahulu");
      return;
    }

    setIsReassigning(true);
    try {
      const res = await reassignLead(reassignModalLead.id, Number(targetMarketingId));
      if (!res.success) {
        toast.error(res.message || res.error || "Gagal memindahkan lead");
        return;
      }

      toast.success(res.message);
      setReassignModalLead(null);
      refreshLeads();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Terjadi kesalahan saat memindahkan lead";
      toast.error(msg);
    } finally {
      setIsReassigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Metrics & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-mist shadow-subtle">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight">
              Manajemen &amp; Distribusi Lead
            </h1>
            {unassignedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                {unassignedCount} Belum Dialokasikan
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-slate mt-0.5">
            Kelola alokasi prospek marketing, pantau follow-up berkala, dan re-assign lead antar tim penjualan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refreshLeads()}
            disabled={isPending}
            className="p-2.5 rounded-lg border border-mist bg-white text-slate hover:text-graphite hover:bg-bone transition-colors disabled:opacity-50"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-prism-teal hover:bg-deep-teal text-white text-xs md:text-sm font-semibold shadow-subtle transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Lead Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-mist shadow-subtle space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 text-slate absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                refreshLeads(e.target.value, tahapFilter, assignmentFilter, selectedMarketingId);
              }}
              placeholder="Cari nama atau nomor HP..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-mist bg-white text-graphite placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
            />
          </div>

          {/* Filter Status/Tahap */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-steel shrink-0" />
            <select
              value={tahapFilter}
              onChange={(e) => {
                setTahapFilter(e.target.value);
                refreshLeads(search, e.target.value, assignmentFilter, selectedMarketingId);
              }}
              className="w-full px-2.5 py-2 rounded-lg border border-mist bg-white text-xs text-graphite font-medium focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal cursor-pointer"
            >
              <option value="">Semua Tahapan</option>
              <option value="Lead Masuk">Lead Masuk</option>
              <option value="Survei Dijadwalkan">Survei Dijadwalkan</option>
              <option value="Sudah Survei">Sudah Survei</option>
              <option value="Closing">Closing</option>
              <option value="Lost">Lost</option>
            </select>
          </div>

          {/* Filter Assignment */}
          <div className="flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5 text-steel shrink-0" />
            <select
              value={assignmentFilter}
              onChange={(e) => {
                const val = e.target.value as "ALL" | "UNASSIGNED" | "ASSIGNED";
                setAssignmentFilter(val);
                refreshLeads(search, tahapFilter, val, selectedMarketingId);
              }}
              className="w-full px-2.5 py-2 rounded-lg border border-mist bg-white text-xs text-graphite font-medium focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal cursor-pointer"
            >
              <option value="ALL">Semua Alokasi</option>
              <option value="UNASSIGNED">Belum Dialokasikan (Unassigned)</option>
              <option value="ASSIGNED">Sudah Ada Marketing PIC</option>
            </select>
          </div>

          {/* Filter Specific Marketing PIC */}
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-steel shrink-0" />
            <select
              value={selectedMarketingId}
              disabled={assignmentFilter === "UNASSIGNED"}
              onChange={(e) => {
                setSelectedMarketingId(e.target.value);
                refreshLeads(search, tahapFilter, assignmentFilter, e.target.value);
              }}
              className="w-full px-2.5 py-2 rounded-lg border border-mist bg-white text-xs text-graphite font-medium focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal disabled:bg-bone disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="">Semua Tim Marketing</option>
              {marketingUsers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Pill Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-mist/50">
          <button
            type="button"
            onClick={() => {
              setAssignmentFilter("ALL");
              setSelectedMarketingId("");
              refreshLeads(search, tahapFilter, "ALL", "");
            }}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              assignmentFilter === "ALL" && !selectedMarketingId
                ? "bg-carbon-ink text-white shadow-2xs"
                : "bg-bone text-slate hover:text-graphite"
            }`}
          >
            Semua ({total})
          </button>

          <button
            type="button"
            onClick={() => {
              setAssignmentFilter("UNASSIGNED");
              setSelectedMarketingId("");
              refreshLeads(search, tahapFilter, "UNASSIGNED", "");
            }}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              assignmentFilter === "UNASSIGNED"
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Belum Ditugaskan</span>
          </button>
        </div>
      </div>

      {/* Main Desktop Data Table */}
      <div className="bg-white rounded-xl border border-mist shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header */}
            <thead className="bg-bone/70 border-b border-mist text-slate font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Tanggal Masuk</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Nama Lead</th>
                <th className="px-5 py-3.5 whitespace-nowrap">No HP / WhatsApp</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Sumber</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Status / Tahap</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Follow-Up Terakhir</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Pemilik (Marketing)</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-mist">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate">
                    <div className="w-12 h-12 rounded-full bg-bone text-steel flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-carbon-ink">
                      Tidak ada data prospek lead yang cocok
                    </p>
                    <p className="text-xs text-slate mt-1 max-w-sm mx-auto">
                      Coba sesuaikan kata kunci pencarian atau ubah filter status dan tim marketing.
                    </p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isUnassigned = lead.marketing_id === null;
                  const waHref = formatWaLink(lead.no_hp, lead.nama);
                  const callHref = `tel:${lead.no_hp}`;

                  return (
                    <tr
                      key={lead.id}
                      className={`transition-colors ${
                        isUnassigned
                          ? "bg-amber-50/70 hover:bg-amber-100/60 border-l-4 border-l-amber-500"
                          : "hover:bg-bone/40"
                      }`}
                    >
                      {/* 1. Tanggal Masuk */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-slate">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-steel" />
                          <span>{formatDate(lead.created_at)}</span>
                        </div>
                      </td>

                      {/* 2. Nama Lead */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <Link
                            href={`${basePath}/lead/${lead.id}`}
                            className="font-bold text-carbon-ink hover:text-prism-teal text-sm inline-flex items-center gap-1 group"
                          >
                            <span>{lead.nama}</span>
                            <ExternalLink className="w-3 h-3 text-steel opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          {lead.minat_tipe && (
                            <p className="text-[11px] text-deep-teal flex items-center gap-1">
                              <Home className="w-3 h-3 text-prism-teal shrink-0" />
                              <span className="truncate max-w-xs">{lead.minat_tipe}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* 3. No HP */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono">
                        <div className="flex items-center gap-2">
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold"
                            title="Chat WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{lead.no_hp}</span>
                          </a>

                          <a
                            href={callHref}
                            className="p-1 rounded text-slate hover:text-graphite hover:bg-bone"
                            title="Telepon"
                          >
                            <Phone className="w-3 h-3 text-steel" />
                          </a>
                        </div>
                      </td>

                      {/* 4. Sumber */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-slate font-medium">
                          <Compass className="w-3.5 h-3.5 text-steel" />
                          <span>{lead.sumber}</span>
                        </span>
                      </td>

                      {/* 5. Status / Tahap */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${getTahapBadge(
                            lead.tahap
                          )}`}
                        >
                          {lead.tahap}
                        </span>
                      </td>

                      {/* 6. Follow-Up Terakhir */}
                      <td className="px-5 py-3.5">
                        {lead.tgl_aktivitas_terakhir || lead.tgl_follow_up ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] text-graphite font-semibold">
                              {lead.jenis_aktivitas_terakhir && (
                                <span className="px-1.5 py-0.2 rounded bg-bone border border-mist text-[10px] text-slate">
                                  {lead.jenis_aktivitas_terakhir}
                                </span>
                              )}
                              <span>
                                {lead.tgl_aktivitas_terakhir
                                  ? formatDate(lead.tgl_aktivitas_terakhir)
                                  : formatDate(lead.tgl_follow_up)}
                              </span>
                            </div>

                            {lead.catatan_terakhir && (
                              <p className="text-[11px] text-slate truncate max-w-xs italic">
                                &quot;{lead.catatan_terakhir}&quot;
                              </p>
                            )}

                            {lead.tgl_follow_up && (
                              <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-amber-600" />
                                <span>Jadwal: {formatDate(lead.tgl_follow_up)}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-fog text-[11px] italic">
                            Belum ada follow up
                          </span>
                        )}
                      </td>

                      {/* 7. Pemilik (Marketing) - HIGHLIGHT UNASSIGNED */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {lead.marketing ? (
                          <div className="space-y-0.5">
                            <p className="font-semibold text-carbon-ink text-xs">
                              {lead.marketing.nama}
                            </p>
                            <p className="text-[10px] font-mono text-slate">
                              {lead.marketing.no_hp}
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Belum Ditugaskan</span>
                          </span>
                        )}
                      </td>

                      {/* 8. Aksi (Pindahkan Lead) */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReassign(lead)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                              isUnassigned
                                ? "bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-subtle"
                                : "bg-white hover:bg-bone text-graphite border-mist hover:border-slate/40"
                            }`}
                            title="Pindahkan alokasi lead ke marketing lain"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>{isUnassigned ? "Tugaskan" : "Pindahkan"}</span>
                          </button>

                          <Link
                            href={`${basePath}/lead/${lead.id}`}
                            className="p-1.5 rounded-md text-slate hover:text-carbon-ink hover:bg-bone border border-transparent hover:border-mist transition-colors"
                            title="Buka Detail & Timeline Aktivitas"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-5 py-3.5 border-t border-mist bg-bone/30 flex items-center justify-between text-xs text-slate">
          <span>
            Menampilkan <strong className="text-carbon-ink font-semibold">{leads.length}</strong> dari{" "}
            <strong className="text-carbon-ink font-semibold">{total}</strong> total lead prospek
          </span>

          {unassignedCount > 0 && (
            <span className="text-amber-700 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{unassignedCount} lead menunggu penugasan PIC</span>
            </span>
          )}
        </div>
      </div>

      {/* Re-assign Modal */}
      {reassignModalLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-mist shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-mist bg-bone/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-prism-teal flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-carbon-ink">
                    Pindahkan Alokasi Lead
                  </h2>
                  <p className="text-[11px] text-slate">
                    Alihkan penanggung jawab prospek ke tim marketing lain
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReassignModalLead(null)}
                className="p-1.5 rounded-full text-slate hover:text-graphite hover:bg-bone transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmReassign} className="p-5 space-y-4">
              {/* Lead Summary Info */}
              <div className="p-3.5 rounded-xl bg-bone/50 border border-mist space-y-1.5">
                <span className="text-[10px] font-semibold text-slate uppercase tracking-wider">
                  Prospek Konsumen
                </span>
                <p className="text-sm font-bold text-carbon-ink">
                  {reassignModalLead.nama}
                </p>
                <div className="flex items-center gap-2 text-xs font-mono text-slate">
                  <span>{reassignModalLead.no_hp}</span>
                  <span className="text-fog">•</span>
                  <span>{reassignModalLead.sumber}</span>
                </div>

                <div className="pt-2 mt-2 border-t border-mist/70 flex items-center justify-between text-xs">
                  <span className="text-slate">PIC Saat Ini:</span>
                  <span className="font-semibold text-carbon-ink">
                    {reassignModalLead.marketing?.nama || "Belum Ditugaskan"}
                  </span>
                </div>
              </div>

              {/* Target Marketing Select */}
              <div>
                <label
                  htmlFor="targetMarketing"
                  className="block text-xs font-semibold text-graphite mb-1.5"
                >
                  Pilih Marketing Tujuan <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <select
                    id="targetMarketing"
                    value={targetMarketingId}
                    onChange={(e) => setTargetMarketingId(e.target.value)}
                    required
                    disabled={isReassigning}
                    className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-lg border border-mist bg-white text-graphite focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal cursor-pointer"
                  >
                    <option value="">-- Pilih Marketing Penerima --</option>
                    {marketingUsers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nama} — {m.no_hp}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-mist">
                <button
                  type="button"
                  onClick={() => setReassignModalLead(null)}
                  disabled={isReassigning}
                  className="px-4 py-2 text-xs font-semibold text-slate hover:text-graphite rounded-md hover:bg-bone transition-colors disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isReassigning || !targetMarketingId}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-prism-teal hover:bg-deep-teal rounded-md shadow-subtle transition-all cursor-pointer disabled:opacity-50"
                >
                  {isReassigning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memindahkan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Konfirmasi Pemindahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Create Lead Form (with Marketing Assignment capability) */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-mist shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 z-10 p-1.5 rounded-full text-slate hover:text-graphite hover:bg-bone transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto flex-1">
              <CreateLeadForm
                marketingUsers={marketingUsers}
                onCancel={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                  setIsCreateModalOpen(false);
                  refreshLeads();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
