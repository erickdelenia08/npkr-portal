"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  MessageCircle,
  MoreVertical,
  Eye,
  FileText,
  Phone,
  Copy,
  Check,
  Calendar,
  AlertCircle,
  Clock,
  Compass,
} from "lucide-react";
import { toast } from "sonner";
import { LeadCardData } from "@/actions/lead";
import { LeadTahap, formatWhatsAppUrl } from "@/lib/lead-utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface MarketingLeadTableProps {
  leads: LeadCardData[];
}

export function MarketingLeadTable({ leads }: MarketingLeadTableProps) {
  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdownId(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveDropdownId(null);
      }
    }

    if (activeDropdownId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDropdownId]);

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success(`Nomor ${phone} berhasil disalin!`);
      setActiveDropdownId(null);
    } catch {
      toast.error("Gagal menyalin nomor HP");
    }
  };

  const getTahapBadgeClass = (tahap: LeadTahap): string => {
    switch (tahap) {
      case "Lead Masuk":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "Survei Dijadwalkan":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Sudah Survei":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Closing":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Lost":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-bone text-graphite border-mist";
    }
  };

  const renderFollowUpCell = (lead: LeadCardData) => {
    const fu = lead.followUpInfo;
    if (!fu || fu.status === "BELUM_DIJADWAL") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          Belum dijadwalkan
        </span>
      );
    }

    if (fu.status === "TERLAMBAT") {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <div className="flex flex-col">
            <span className="text-rose-700">{fu.formattedDate}</span>
            <span className="text-[10px] text-rose-600 font-bold tracking-tight">
              {fu.label}
            </span>
          </div>
        </div>
      );
    }

    if (fu.status === "HARI_INI") {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
          <Calendar className="w-3.5 h-3.5 text-prism-teal shrink-0" />
          <div className="flex flex-col">
            <span>{fu.formattedDate}</span>
            <span className="text-[10px] text-deep-teal font-bold tracking-tight">
              Hari Ini
            </span>
          </div>
        </div>
      );
    }

    // MENDATANG / Scheduled in future
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium">
        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span>{fu.formattedDate}</span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-mist shadow-subtle overflow-visible">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Nama Konsumen</TableHead>
            <TableHead className="w-[18%]">Tahap Prospek</TableHead>
            <TableHead className="w-[18%]">Sumber</TableHead>
            <TableHead className="w-[20%]">Jadwal Follow-Up</TableHead>
            <TableHead className="w-[14%] text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {leads.map((lead) => {
            const isDropdownOpen = activeDropdownId === lead.id;
            const waUrl = formatWhatsAppUrl(lead.no_hp, lead.nama);
            const canAjukanItj =
              lead.tahap === "Sudah Survei" || lead.survei_selesai_at !== null;
            const isClosing = lead.tahap === "Closing" || lead.closing_at !== null;

            return (
              <TableRow key={lead.id} className="group">
                {/* 1. Nama & No HP */}
                <TableCell>
                  <div className="space-y-0.5">
                    <Link
                      href={`/marketing/lead/${lead.id}`}
                      className="font-semibold text-carbon-ink hover:text-prism-teal text-sm transition-colors"
                    >
                      {lead.nama}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-slate">
                      <span className="font-mono text-[11px] text-slate-600">
                        {lead.no_hp}
                      </span>
                      {lead.minat_tipe && (
                        <>
                          <span className="text-mist">•</span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                            {lead.minat_tipe}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* 2. Tahap Badge */}
                <TableCell>
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getTahapBadgeClass(
                      lead.tahap
                    )}`}
                  >
                    {lead.tahap}
                  </span>
                </TableCell>

                {/* 3. Sumber */}
                <TableCell>
                  <div className="inline-flex items-center gap-1.5 text-xs text-graphite font-medium">
                    <Compass className="w-3.5 h-3.5 text-steel shrink-0" />
                    <span>{lead.sumber}</span>
                  </div>
                </TableCell>

                {/* 4. Follow-up Column */}
                <TableCell>{renderFollowUpCell(lead)}</TableCell>

                {/* 5. Aksi */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5 relative">
                    {/* Direct WhatsApp link button */}
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Kirim Pesan WhatsApp"
                      className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WA</span>
                    </a>

                    {/* 3-dot dropdown menu trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(isDropdownOpen ? null : lead.id);
                        }}
                        className={`p-1.5 rounded-md border text-slate hover:text-carbon-ink hover:bg-bone transition-colors ${
                          isDropdownOpen
                            ? "bg-bone border-mist text-carbon-ink"
                            : "border-transparent"
                        }`}
                        title="Aksi Cepat"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu Panel */}
                      {isDropdownOpen && (
                        <div
                          ref={dropdownRef}
                          className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-lg border border-mist shadow-lg py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
                        >
                          <Link
                            href={`/marketing/lead/${lead.id}`}
                            onClick={() => setActiveDropdownId(null)}
                            className="flex items-center gap-2 px-3.5 py-2 text-xs text-graphite hover:bg-bone hover:text-carbon-ink transition-colors font-medium"
                          >
                            <Eye className="w-4 h-4 text-steel" />
                            <span>Lihat Detail Lead</span>
                          </Link>

                          {canAjukanItj && !isClosing && (
                            <Link
                              href={`/marketing/lead/${lead.id}/itj`}
                              onClick={() => setActiveDropdownId(null)}
                              className="flex items-center gap-2 px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors font-semibold"
                            >
                              <FileText className="w-4 h-4 text-emerald-600" />
                              <span>Ajukan ITJ</span>
                            </Link>
                          )}

                          <a
                            href={`tel:${lead.no_hp}`}
                            onClick={() => setActiveDropdownId(null)}
                            className="flex items-center gap-2 px-3.5 py-2 text-xs text-graphite hover:bg-bone transition-colors font-medium"
                          >
                            <Phone className="w-4 h-4 text-steel" />
                            <span>Panggil Telepon</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleCopyPhone(lead.no_hp)}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-graphite hover:bg-bone transition-colors font-medium text-left"
                          >
                            <Copy className="w-4 h-4 text-steel" />
                            <span>Salin Nomor HP</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
