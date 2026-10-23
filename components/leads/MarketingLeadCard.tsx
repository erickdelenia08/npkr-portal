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
  Calendar,
  AlertCircle,
  Clock,
  Compass,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import { LeadCardData } from "@/actions/lead";
import { LeadTahap, formatWhatsAppUrl } from "@/lib/lead-utils";

interface MarketingLeadCardProps {
  lead: LeadCardData;
}

export function MarketingLeadCard({ lead }: MarketingLeadCardProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success(`Nomor ${phone} disalin`);
      setIsDropdownOpen(false);
    } catch {
      toast.error("Gagal menyalin nomor");
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

  const waUrl = formatWhatsAppUrl(lead.no_hp, lead.nama);
  const fu = lead.followUpInfo;
  const canBuatItj =
    lead.tahap === "Sudah Survei" || lead.survei_selesai_at !== null;
  const isClosing = lead.tahap === "Closing" || lead.closing_at !== null;

  return (
    <div className="bg-white rounded-lg border border-mist p-4 shadow-subtle flex flex-col justify-between gap-3 relative transition-all">
      {/* Top Header: Nama & Tahap Badge */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link
            href={`/marketing/lead/${lead.id}`}
            className="text-sm font-bold text-carbon-ink hover:text-prism-teal transition-colors"
          >
            {lead.nama}
          </Link>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate">
            <span className="font-mono text-[11px] text-slate-600">
              {lead.no_hp}
            </span>
          </div>
        </div>

        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${getTahapBadgeClass(
            lead.tahap
          )}`}
        >
          {lead.tahap}
        </span>
      </div>

      {/* Meta Details: Sumber & Minat Tipe */}
      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-mist/60">
        <div className="flex items-center gap-1.5 text-slate truncate">
          <Compass className="w-3.5 h-3.5 text-steel shrink-0" />
          <span className="truncate">{lead.sumber}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate truncate">
          <Home className="w-3.5 h-3.5 text-steel shrink-0" />
          <span className="truncate">{lead.minat_tipe || "Unit Umum"}</span>
        </div>
      </div>

      {/* Follow-up status row */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[11px] font-medium text-slate">Follow-up:</span>

        {!fu || fu.status === "BELUM_DIJADWAL" ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
            <Clock className="w-3 h-3 text-amber-600" />
            Belum dijadwalkan
          </span>
        ) : fu.status === "TERLAMBAT" ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            {fu.formattedDate} ({fu.label})
          </span>
        ) : fu.status === "HARI_INI" ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-semibold">
            <Calendar className="w-3 h-3 text-prism-teal" />
            Hari Ini ({fu.formattedDate})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-medium">
            <Calendar className="w-3 h-3 text-slate-500" />
            {fu.formattedDate}
          </span>
        )}
      </div>

      {/* Action Row */}
      <div className="flex items-center justify-between pt-1 gap-2">
        {/* WhatsApp primary CTA */}
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Kirim WhatsApp</span>
        </a>

        {/* 3-dot dropdown menu */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(!isDropdownOpen);
            }}
            className={`p-2 rounded-md border text-slate hover:text-carbon-ink hover:bg-bone transition-colors ${
              isDropdownOpen
                ? "bg-bone border-mist text-carbon-ink"
                : "border-mist bg-white"
            }`}
            title="Aksi Lainnya"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isDropdownOpen && (
            <div
              ref={dropdownRef}
              className="absolute right-0 bottom-full mb-1.5 w-48 bg-white rounded-lg border border-mist shadow-lg py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
            >
              <Link
                href={`/marketing/lead/${lead.id}`}
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2 text-xs text-graphite hover:bg-bone transition-colors font-medium"
              >
                <Eye className="w-4 h-4 text-steel" />
                <span>Lihat Detail</span>
              </Link>

              {canBuatItj && !isClosing && (
                <Link
                  href={`/marketing/lead/${lead.id}/itj`}
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors font-semibold"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Buat ITJ</span>
                </Link>
              )}

              {isClosing && lead.transaksi_id && (
                <Link
                  href={`/marketing/transaksi/${lead.transaksi_id}`}
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors font-semibold"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Buka Transaksi</span>
                </Link>
              )}

              <a
                href={`tel:${lead.no_hp}`}
                onClick={() => setIsDropdownOpen(false)}
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
    </div>
  );
}
