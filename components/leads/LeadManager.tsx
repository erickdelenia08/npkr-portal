"use client";

import React, { useState, useTransition } from "react";
import {
  Users,
  PlusCircle,
  Search,
  Filter,
  Phone,
  Compass,
  Home,
  RefreshCw,
  X,
  Calendar,
} from "lucide-react";
import { CreateLeadForm } from "./CreateLeadForm";
import { getLeads, GetLeadsResponse, LeadCardData } from "@/actions/lead";
import { LeadTahap } from "@/lib/lead-utils";

interface LeadManagerProps {
  initialLeads: LeadCardData[];
  initialTotal: number;
  userRole?: string;
  userId?: number;
}

export function LeadManager({
  initialLeads,
  initialTotal,
  userRole,
  userId,
}: LeadManagerProps) {
  const [leads, setLeads] = useState<LeadCardData[]>(initialLeads);
  const [total, setTotal] = useState<number>(initialTotal);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [tahapFilter, setTahapFilter] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const refreshLeads = (query = search, status = tahapFilter) => {
    startTransition(async () => {
      const filterPayload: {
        search?: string;
        tahap?: string;
        marketing_id?: number;
      } = {
        search: query,
        tahap: status,
      };

      if (userRole === "MARKETING" && userId) {
        filterPayload.marketing_id = userId;
      }

      const res = await getLeads(filterPayload);
      if (res.success && res.data) {
        setLeads(res.data.leads);
        setTotal(res.data.total);
      }
    });
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    refreshLeads(val, tahapFilter);
  };

  const handleTahapChange = (val: string) => {
    setTahapFilter(val);
    refreshLeads(search, val);
  };

  const getTahapBadge = (tahap: LeadTahap | string) => {
    switch (tahap) {
      case "Lead Masuk":
      case "BARU":
      case "FOLLOW_UP":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "Survei Dijadwalkan":
      case "SURVEI_DIJADWALKAN":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Sudah Survei":
      case "SUDAH_SURVEI":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Closing":
      case "ITJ":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Lost":
      case "LOST":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-bone text-graphite border-mist";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-lg border border-mist shadow-subtle">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight">
            Manajemen Lead &amp; Prospek
          </h1>
          <p className="text-xs md:text-sm text-slate mt-0.5">
            Daftar prospek konsumen dan riwayat tindak lanjut penjualan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-prism-teal text-white text-xs md:text-sm font-semibold hover:bg-deep-teal transition-colors shadow-subtle cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah Lead Baru</span>
          </button>

          <button
            type="button"
            onClick={() => refreshLeads()}
            disabled={isPending}
            className="p-2 rounded-md border border-mist bg-white text-slate hover:text-graphite hover:bg-bone transition-colors disabled:opacity-50"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-mist shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari nama atau nomor HP..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-mist focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate">
          <Filter className="w-3.5 h-3.5" />
          <select
            value={tahapFilter}
            onChange={(e) => handleTahapChange(e.target.value)}
            className="px-2.5 py-1.5 rounded-md border border-mist bg-white text-xs text-graphite font-medium focus:outline-none focus:ring-2 focus:ring-prism-teal/20 focus:border-prism-teal"
          >
            <option value="">Semua Tahapan</option>
            <option value="BARU">BARU</option>
            <option value="FOLLOW_UP">FOLLOW UP</option>
            <option value="SURVEI_DIJADWALKAN">SURVEI DIJADWALKAN</option>
            <option value="SUDAH_SURVEI">SUDAH SURVEI</option>
            <option value="ITJ">ITJ</option>
            <option value="TERTUNDA">TERTUNDA</option>
            <option value="LOST">LOST</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg border border-mist shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bone/60 border-b border-mist text-slate font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Nama Konsumen</th>
                <th className="px-5 py-3.5">Nomor WhatsApp / HP</th>
                <th className="px-5 py-3.5">Sumber Lead</th>
                <th className="px-5 py-3.5">Minat Tipe</th>
                <th className="px-5 py-3.5">Tahap Prospek</th>
                <th className="px-5 py-3.5">Marketing PIC</th>
                <th className="px-5 py-3.5 text-right">Tanggal Masuk</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-mist">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate">
                    Belum ada data lead yang cocok. Klik &quot;Tambah Lead Baru&quot; untuk mencatat prospek.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-bone/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-carbon-ink text-sm">
                        {lead.nama}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate">
                      <a
                        href={`https://wa.me/${lead.no_hp.replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-deep-teal hover:underline font-semibold"
                      >
                        <Phone className="w-3.5 h-3.5 text-prism-teal" />
                        <span>{lead.no_hp}</span>
                      </a>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-slate font-medium">
                        <Compass className="w-3 h-3 text-steel" />
                        {lead.sumber}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-slate">
                      {lead.minat_tipe ? (
                        <span className="font-medium text-graphite">
                          {lead.minat_tipe}
                        </span>
                      ) : (
                        <span className="text-fog">-</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${getTahapBadge(
                          lead.tahap
                        )}`}
                      >
                        {lead.tahap}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-slate">
                      {lead.marketing ? (
                        <span className="font-medium text-graphite">
                          {lead.marketing.nama}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium italic">
                          Belum Dialokasikan
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right font-mono text-slate">
                      {new Date(lead.created_at).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-5 py-3 border-t border-mist bg-bone/30 flex items-center justify-between text-xs text-slate">
          <span>
            Total <strong className="text-carbon-ink">{total}</strong> prospek lead terdaftar
          </span>
        </div>
      </div>

      {/* Modal for Create Lead Form */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 z-10 p-1 rounded-md text-slate hover:text-graphite hover:bg-bone transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <CreateLeadForm
              onCancel={() => setIsModalOpen(false)}
              onSuccess={() => {
                setIsModalOpen(false);
                refreshLeads();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
