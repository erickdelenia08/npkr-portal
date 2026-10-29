"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  MessageCircle,
  X,
  Loader2,
  ChevronRight,
  ExternalLink,
  Calendar,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  LeadCardData,
  getLeads,
  reassignLead,
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

  // Helper WhatsApp
  const formatWaLink = (noHp: string, nama: string): string => {
    let clean = noHp.replace(/[\s-+]/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }
    const message = encodeURIComponent(
      `Halo Bapak/Ibu ${nama}, perkenalkan saya dari tim marketing properti...`
    );
    return `https://wa.me/${clean}?text=${message}`;
  };

  // Helper Date
  const formatDate = (val: Date | string | null | undefined): string => {
    if (!val) return "—";
    const date = typeof val === "string" ? new Date(val) : val;
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Badge Status/Tahap yang tenang (subtle pill, monochrome border)
  const renderTahapBadge = (tahap: LeadTahap | string) => {
    const norm = (tahap || "").toUpperCase().trim();
    let style = "bg-zinc-100 text-zinc-700 border-zinc-200";

    if (norm.includes("BARU") || norm.includes("LEAD MASUK")) {
      style = "bg-blue-50 text-blue-700 border-blue-200";
    } else if (norm.includes("SURVEI")) {
      style = "bg-purple-50 text-purple-700 border-purple-200";
    } else if (norm.includes("CLOSING") || norm.includes("ITJ")) {
      style = "bg-emerald-50 text-emerald-800 border-emerald-200";
    } else if (norm.includes("LOST")) {
      style = "bg-zinc-100 text-zinc-500 border-zinc-200";
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
        {tahap}
      </span>
    );
  };

  // Fetch / Refresh Data
  const fetchLeads = (
    query: string,
    status: string,
    assign: "ALL" | "UNASSIGNED" | "ASSIGNED",
    mId: string
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
        let result = res.data.leads;
        if (assign === "ASSIGNED" && !mId) {
          result = result.filter((l) => l.marketing_id !== null);
        }
        setLeads(result);
        setTotal(res.data.total);
      }
    });
  };

  // Debounce search agar tidak spam request
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads(search, tahapFilter, assignmentFilter, selectedMarketingId);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleFilterChange = (
    status = tahapFilter,
    assign = assignmentFilter,
    mId = selectedMarketingId
  ) => {
    fetchLeads(search, status, assign, mId);
  };

  const unassignedCount = useMemo(() => {
    return leads.filter((l) => l.marketing_id === null).length;
  }, [leads]);

  const handleOpenReassign = (lead: LeadCardData) => {
    setReassignModalLead(lead);
    setTargetMarketingId(lead.marketing_id ? String(lead.marketing_id) : "");
  };

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
        toast.error(res.message || "Gagal memindahkan lead");
        return;
      }

      toast.success(res.message);
      setReassignModalLead(null);
      fetchLeads(search, tahapFilter, assignmentFilter, selectedMarketingId);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Terjadi kesalahan sistem");
    } finally {
      setIsReassigning(false);
    }
  };

  return (
    <div className="space-y-4 font-sans text-zinc-900">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Distribusi Lead
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
              {total} Total
            </span>
            {unassignedCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                {unassignedCount} Belum Dialokasikan
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manajemen alokasi prospek dan pemantauan aktivitas follow-up tim penjualan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchLeads(search, tahapFilter, assignmentFilter, selectedMarketingId)}
            disabled={isPending}
            className="p-2 rounded-md border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Lead</span>
          </button>
        </div>
      </div>

      {/* Control bar / Filters */}
      <div className="flex flex-wrap items-center gap-2.5 bg-zinc-50/60 p-2.5 rounded-lg border border-zinc-200">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau nomor HP..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-zinc-200 bg-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400"
          />
        </div>

        <select
          value={tahapFilter}
          onChange={(e) => {
            setTahapFilter(e.target.value);
            handleFilterChange(e.target.value, assignmentFilter, selectedMarketingId);
          }}
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="">Semua Tahapan</option>
          <option value="Lead Masuk">Lead Masuk</option>
          <option value="Survei Dijadwalkan">Survei Dijadwalkan</option>
          <option value="Sudah Survei">Sudah Survei</option>
          <option value="Closing">Closing</option>
          <option value="Lost">Lost</option>
        </select>

        <select
          value={assignmentFilter}
          onChange={(e) => {
            const val = e.target.value as "ALL" | "UNASSIGNED" | "ASSIGNED";
            setAssignmentFilter(val);
            handleFilterChange(tahapFilter, val, selectedMarketingId);
          }}
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        >
          <option value="ALL">Semua Penugasan</option>
          <option value="UNASSIGNED">Belum Ada PIC</option>
          <option value="ASSIGNED">Sudah Ada PIC</option>
        </select>

        <select
          value={selectedMarketingId}
          disabled={assignmentFilter === "UNASSIGNED"}
          onChange={(e) => {
            setSelectedMarketingId(e.target.value);
            handleFilterChange(tahapFilter, assignmentFilter, e.target.value);
          }}
          className="h-8 px-2.5 text-xs rounded-md border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:bg-zinc-100 disabled:text-zinc-400"
        >
          <option value="">Semua Marketing</option>
          {marketingUsers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nama}
            </option>
          ))}
        </select>
      </div>

      {/* Leads Table */}
      <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/75 text-zinc-500 font-medium">
                <th className="px-4 py-3 whitespace-nowrap">Prospek</th>
                <th className="px-4 py-3 whitespace-nowrap">Kontak</th>
                <th className="px-4 py-3 whitespace-nowrap">Tahap</th>
                <th className="px-4 py-3 whitespace-nowrap">Follow-up Terakhir</th>
                <th className="px-4 py-3 whitespace-nowrap">PIC Marketing</th>
                <th className="px-4 py-3 whitespace-nowrap">Masuk</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    <p className="text-sm font-medium text-zinc-900">Tidak ada data yang sesuai</p>
                    <p className="text-xs text-zinc-500 mt-1">Ubah kata kunci atau reset filter Anda.</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isUnassigned = lead.marketing_id === null;

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-zinc-50/70 transition-colors ${isUnassigned ? "bg-amber-50/30" : ""
                        }`}
                    >
                      {/* 1. Prospek & Minat */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <Link
                            href={`${basePath}/lead/${lead.id}`}
                            className="font-semibold text-zinc-900 hover:underline inline-flex items-center gap-1 group text-[13px]"
                          >
                            <span>{lead.nama}</span>
                            <ExternalLink className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          {lead.minat_tipe && (
                            <span className="text-[11px] text-zinc-500 truncate max-w-xs mt-0.5">
                              {lead.minat_tipe}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Kontak & WhatsApp */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                        <a
                          href={formatWaLink(lead.no_hp, lead.nama)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-zinc-700 hover:text-emerald-700 transition-colors"
                          title="Hubungi via WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-600" />
                          <span>{lead.no_hp}</span>
                        </a>
                      </td>

                      {/* 3. Tahap */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderTahapBadge(lead.tahap)}
                      </td>

                      {/* 4. Follow-up Terakhir */}
                      <td className="px-4 py-3">
                        {lead.tgl_aktivitas_terakhir || lead.tgl_follow_up ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              {lead.jenis_aktivitas_terakhir && (
                                <span className="px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 text-[10px] font-medium border border-zinc-200">
                                  {lead.jenis_aktivitas_terakhir}
                                </span>
                              )}
                              <span className="text-zinc-600">
                                {formatDate(lead.tgl_aktivitas_terakhir || lead.tgl_follow_up)}
                              </span>
                            </div>
                            {lead.catatan_terakhir && (
                              <p className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                                {lead.catatan_terakhir}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* 5. PIC Marketing */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {lead.marketing ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-zinc-800">{lead.marketing.nama}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">{lead.marketing.no_hp}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* 6. Tanggal Masuk */}
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-500 text-[11px] font-mono">
                        {formatDate(lead.created_at)}
                      </td>

                      {/* 7. Aksi */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenReassign(lead)}
                            className="px-2 py-1 rounded text-xs font-medium border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition-colors"
                          >
                            {isUnassigned ? "Tugaskan" : "Pindah PIC"}
                          </button>
                          <Link
                            href={`${basePath}/lead/${lead.id}`}
                            className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                            title="Detail"
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

        {/* Footer info */}
        <div className="px-4 py-2.5 border-t border-zinc-200 bg-zinc-50/50 flex items-center justify-between text-xs text-zinc-500">
          <span>
            Menampilkan <span className="font-medium text-zinc-800">{leads.length}</span> dari{" "}
            <span className="font-medium text-zinc-800">{total}</span> total lead
          </span>
        </div>
      </div>

      {/* Modal Re-assign */}
      {reassignModalLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white rounded-lg border border-zinc-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50/50">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
                Alokasi PIC Lead
              </h2>
              <button
                type="button"
                onClick={() => setReassignModalLead(null)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReassign} className="p-4 space-y-3.5">
              <div className="bg-zinc-50 p-3 rounded border border-zinc-200/80 space-y-1">
                <p className="text-xs font-semibold text-zinc-900">{reassignModalLead.nama}</p>
                <p className="text-xs font-mono text-zinc-500">{reassignModalLead.no_hp}</p>
                <p className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-200 mt-1">
                  PIC Saat Ini:{" "}
                  <span className="font-medium text-zinc-800">
                    {reassignModalLead.marketing?.nama || "Belum ada"}
                  </span>
                </p>
              </div>

              <div>
                <label htmlFor="targetMarketing" className="block text-xs font-medium text-zinc-700 mb-1">
                  Pilih Marketing Penerima
                </label>
                <select
                  id="targetMarketing"
                  value={targetMarketingId}
                  onChange={(e) => setTargetMarketingId(e.target.value)}
                  required
                  disabled={isReassigning}
                  className="w-full h-8 px-2.5 text-xs rounded border border-zinc-200 bg-white text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                >
                  <option value="">Pilih akun marketing...</option>
                  {marketingUsers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nama} ({m.no_hp})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setReassignModalLead(null)}
                  disabled={isReassigning}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isReassigning || !targetMarketingId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
                >
                  {isReassigning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Lead */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg bg-white rounded-lg border border-zinc-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-3.5 top-3.5 z-10 p-1 rounded text-zinc-400 hover:text-zinc-700"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="overflow-y-auto flex-1">
              <CreateLeadForm
                marketingUsers={marketingUsers}
                onCancel={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                  setIsCreateModalOpen(false);
                  fetchLeads(search, tahapFilter, assignmentFilter, selectedMarketingId);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}