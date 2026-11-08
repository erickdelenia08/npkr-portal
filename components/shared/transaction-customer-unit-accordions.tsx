"use client";

import React, { useState, useEffect } from "react";
import { User, Home, Phone, ChevronDown, MessageCircle } from "lucide-react";
import { formatDateOnly } from "@/lib/date/wib";

export interface TransactionCustomerInfo {
  nama_ktp: string;
  nik: string;
  tempat_lahir: string;
  tgl_lahir: Date | string;
  alamat_ktp: string;
  no_hp: string | null;
}

export interface TransactionUnitInfo {
  blok: string;
  tipe: {
    nama_tipe: string;
    kategori: string;
  };
  metode_bayar: string;
  tenor_bulan: number | null;
}

export interface TransactionCustomerUnitAccordionsProps {
  customer: TransactionCustomerInfo;
  unit: TransactionUnitInfo;
}

export function TransactionCustomerUnitAccordions({
  customer,
  unit,
}: TransactionCustomerUnitAccordionsProps) {
  // Desktop (>= 768px): default open; Mobile (< 768px): default closed
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [isUnitOpen, setIsUnitOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    setIsCustomerOpen(mediaQuery.matches);
    setIsUnitOpen(mediaQuery.matches);
    setHasMounted(true);

    const handler = (e: MediaQueryListEvent) => {
      setIsCustomerOpen(e.matches);
      setIsUnitOpen(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const transitionClass = hasMounted
    ? "transition-[grid-template-rows,opacity] duration-200 ease-in-out"
    : "";

  const cleanPhone = customer.no_hp ? customer.no_hp.replace(/[^0-9+]/g, "") : "";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
      {/* ─── SECTION A: INFORMASI KONSUMEN ─── */}
      <div className="bg-white rounded-lg border border-mist shadow-subtle overflow-hidden flex flex-col justify-between">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsCustomerOpen((prev) => !prev)}
          aria-expanded={isCustomerOpen}
          aria-controls="accordion-customer-content"
          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-bone/40 active:bg-bone/70 transition-colors cursor-pointer select-none min-h-[50px]"
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-7 h-7 rounded-md bg-teal-50 text-deep-teal flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold text-carbon-ink uppercase tracking-wider truncate">
                Informasi Konsumen
              </span>
              {!isCustomerOpen && (
                <span className="block text-[11px] text-slate truncate">
                  {customer.nama_ktp}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate hidden sm:inline-block">
              {isCustomerOpen ? "Tutup" : "Lihat Detail"}
            </span>
            <div
              className={`p-1 rounded-md text-slate hover:text-carbon-ink transition-transform duration-200 ${isCustomerOpen ? "rotate-180" : "rotate-0"
                }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Accordion Collapsible Panel */}
        <div
          id="accordion-customer-content"
          className={`grid ${transitionClass} ${isCustomerOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
        >
          <div className="overflow-hidden min-h-0">
            <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-mist/80 bg-white space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* NIK */}
                <div>
                  <span className="text-slate block text-[11px] mb-0.5">
                    Nomor Induk Kependudukan (NIK)
                  </span>
                  <span className="font-mono font-semibold text-carbon-ink text-xs sm:text-sm tracking-wide select-all break-all">
                    {customer.nik}
                  </span>
                </div>

                {/* Tempat, Tanggal Lahir */}
                <div>
                  <span className="text-slate block text-[11px] mb-0.5">
                    Tempat, Tanggal Lahir (TTL)
                  </span>
                  <span className="font-medium text-carbon-ink block">
                    {customer.tempat_lahir},{" "}
                    {formatDateOnly(customer.tgl_lahir)}
                  </span>
                </div>
              </div>

              {/* Alamat KTP */}
              <div>
                <span className="text-slate block text-[11px] mb-0.5">
                  Alamat Sesuai KTP
                </span>
                <span className="text-graphite leading-relaxed break-words block">
                  {customer.alamat_ktp}
                </span>
              </div>

              {/* Nomor HP */}
              <div className="pt-2 border-t border-mist/60 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-slate text-[11px]">Nomor Handphone</span>
                {customer.no_hp ? (
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono font-semibold text-deep-teal hover:underline text-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-deep-teal" />
                    <span>{customer.no_hp}</span>
                  </a>
                ) : (
                  <span className="font-mono text-slate text-xs">-</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION B: INFORMASI UNIT ─── */}
      <div className="bg-white rounded-lg border border-mist shadow-subtle overflow-hidden flex flex-col justify-between">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsUnitOpen((prev) => !prev)}
          aria-expanded={isUnitOpen}
          aria-controls="accordion-unit-content"
          className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-bone/40 active:bg-bone/70 transition-colors cursor-pointer select-none min-h-[50px]"
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-7 h-7 rounded-md bg-teal-50 text-deep-teal flex items-center justify-center shrink-0">
              <Home className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold text-carbon-ink uppercase tracking-wider truncate">
                Informasi Unit
              </span>
              {!isUnitOpen && (
                <span className="block text-[11px] text-slate truncate">
                  Unit {unit.blok} • {unit.tipe.nama_tipe}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate hidden sm:inline-block">
              {isUnitOpen ? "Tutup" : "Lihat Detail"}
            </span>
            <div
              className={`p-1 rounded-md text-slate hover:text-carbon-ink transition-transform duration-200 ${isUnitOpen ? "rotate-180" : "rotate-0"
                }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </button>

        {/* Accordion Collapsible Panel */}
        <div
          id="accordion-unit-content"
          className={`grid ${transitionClass} ${isUnitOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
        >
          <div className="overflow-hidden min-h-0">
            <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-mist/80 bg-white space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Blok dan nomor unit */}
                <div>
                  <span className="text-slate block text-[11px] mb-0.5">
                    Blok & Nomor Unit
                  </span>
                  <span className="font-mono font-bold text-sm text-carbon-ink block">
                    {unit.blok}
                  </span>
                </div>

                {/* Tipe Properti */}
                <div>
                  <span className="text-slate block text-[11px] mb-0.5">
                    Tipe Properti
                  </span>
                  <span className="font-semibold text-carbon-ink block">
                    {unit.tipe.nama_tipe}
                  </span>
                </div>

                {/* Kategori Unit */}
                <div>
                  <span className="text-slate block text-[11px] mb-0.5">
                    Kategori Unit
                  </span>
                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-bone text-graphite border border-mist mt-0.5">
                    {unit.tipe.kategori}
                  </span>
                </div>

                {/* Skema Transaksi dan Tenor */}
                <div>
                  <span className="text-slate block text-[11px] mb-0.5">
                    Skema Transaksi
                  </span>
                  <span className="font-semibold text-carbon-ink block">
                    {unit.metode_bayar.replace(/_/g, " ")}
                    {unit.tenor_bulan ? ` (${unit.tenor_bulan} Bulan)` : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

