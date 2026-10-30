"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Phone,
  MapPin,
  Calendar,
  Building,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Clock,
  Ban,
  Repeat2,
} from "lucide-react";
import { SerializedCustomerDetail } from "@/actions/customer.action";
import { EditCustomerModal } from "@/components/forms/edit-customer-modal";

interface CustomerDetailViewProps {
  initialCustomer: SerializedCustomerDetail;
  userRole: "ADMIN" | "MANAGER" | "DIRECTOR";
  backHref: string;
}

export function CustomerDetailView({
  initialCustomer,
  userRole,
  backHref,
}: CustomerDetailViewProps) {
  const [customer, setCustomer] = useState<SerializedCustomerDetail>(initialCustomer);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const isRepeatBuyer = customer.jumlah_unit > 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "AKAD_AJB":
      case "SERAH_TERIMA":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      case "BATAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Ban className="w-3.5 h-3.5" />
            BATAL
          </span>
        );
      case "PROSES_BANK":
      case "PEMBERKASAN":
      case "PEMBAYARAN":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate hover:text-carbon-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Buku Induk Customer</span>
        </Link>

        {isRepeatBuyer && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
            <Repeat2 className="w-3.5 h-3.5 text-purple-600" />
            <span>Repeat Buyer
              {/* ({customer.jumlah_unit} Unit Dimiliki) */}
            </span>
          </span>
        )}
      </div>

      {/* Main Split Layout: Profile Card & Owned Units Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Section 1: Customer Profile Card (1 col) */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-mist shadow-subtle overflow-hidden">
          {/* Card Header Banner */}
          <div className="bg-bone/70 px-5 py-4 border-b border-mist flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-carbon-ink text-white flex items-center justify-center font-bold text-base shadow-subtle">
                {customer.nama_ktp.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h1 className="text-base font-bold text-carbon-ink font-heading leading-tight">
                  {customer.nama_ktp}
                </h1>
                <span className="text-[11px] font-mono text-slate">
                  NIK: {customer.nik}
                </span>
              </div>
            </div>

            {/* Edit Button: Hidden for MANAGER role */}
            {userRole !== "MANAGER" && (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-mist bg-white text-xs font-semibold text-graphite hover:text-prism-teal hover:border-prism-teal transition-all shadow-2xs"
                title="Edit Identitas Customer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
          </div>

          {/* Card Details Body */}
          <div className="p-5 space-y-4 text-xs">
            {/* NIK */}
            <div>
              <span className="text-slate block text-[11px] font-medium mb-0.5">
                Nomor Induk Kependudukan (NIK)
              </span>
              <p className="font-mono font-bold text-sm text-carbon-ink bg-bone/50 px-2.5 py-1.5 rounded border border-mist inline-block w-full">
                {customer.nik}
              </p>
            </div>

            {/* Tempat & Tanggal Lahir */}
            <div>
              <span className="text-slate block text-[11px] font-medium mb-0.5">
                Tempat, Tanggal Lahir (TTL)
              </span>
              <div className="flex items-center gap-2 text-carbon-ink font-medium">
                <Calendar className="w-4 h-4 text-slate shrink-0" />
                <span>
                  {customer.tempat_lahir}, {customer.tgl_lahir}
                </span>
              </div>
            </div>

            {/* No HP */}
            <div>
              <span className="text-slate block text-[11px] font-medium mb-0.5">
                Nomor Handphone / WhatsApp
              </span>
              <div className="flex items-center gap-2 text-carbon-ink font-mono font-medium">
                <Phone className="w-4 h-4 text-slate shrink-0" />
                {customer.no_hp ? (
                  <a
                    href={`https://wa.me/${customer.no_hp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-prism-teal hover:underline"
                  >
                    {customer.no_hp}
                  </a>
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>

            {/* Alamat KTP */}
            <div>
              <span className="text-slate block text-[11px] font-medium mb-0.5">
                Alamat Sesuai KTP
              </span>
              <div className="flex items-start gap-2 text-carbon-ink font-medium">
                <MapPin className="w-4 h-4 text-slate shrink-0 mt-0.5" />
                <p className="leading-relaxed">{customer.alamat_ktp}</p>
              </div>
            </div>

            {/* Total Unit Summary */}
            <div className="pt-3 border-t border-mist flex items-center justify-between text-slate">
              <span>Total Unit Tercatat:</span>
              <span className="font-bold text-carbon-ink font-mono text-sm">
                {customer.jumlah_unit} Unit
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Daftar Aset / Unit Dimiliki (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-carbon-ink tracking-tight font-heading flex items-center gap-2">
                <Building className="w-4 h-4 text-prism-teal" />
                <span>Daftar Aset / Unit Dimiliki</span>
              </h2>
              <p className="text-xs text-slate mt-0.5">
                Riwayat unit properti yang dibeli atau sedang berjalan dalam proses transaksi
              </p>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-bone text-graphite font-mono md:block hidden">
              {customer.transaksi.length} Transaksi
            </span>
          </div>

          {/* Transactions / Owned Units Grid */}
          {customer.transaksi.length === 0 ? (
            <div className="bg-white rounded-lg border border-dashed border-mist p-10 text-center text-slate">
              <Building className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Belum ada transaksi unit untuk customer ini.</p>
              <p className="text-xs text-fog mt-1">
                Data unit akan muncul otomatis setelah ITJ diajukan dan transaksi dibuat.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.transaksi.map((t) => {
                const dealFormatted = new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(t.harga_deal);

                return (
                  <div
                    key={t.id}
                    className="bg-white rounded-lg border border-mist shadow-subtle p-5 hover:border-prism-teal/50 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Header: Blok & Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-semibold text-slate uppercase tracking-wider block">
                            Blok Unit
                          </span>
                          <span className="font-mono font-bold text-xl text-carbon-ink tracking-tight">
                            {t.unit.blok}
                          </span>
                        </div>
                        {getStatusBadge(t.status_transaksi)}
                      </div>

                      {/* Tipe & Kategori */}
                      <div className="flex items-center justify-between py-2 border-y border-mist text-xs">
                        <span className="text-slate">Tipe Properti:</span>
                        <div className="text-right">
                          <span className="font-semibold text-carbon-ink">
                            {t.unit.tipe.nama_tipe}
                          </span>
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-bone text-graphite font-medium">
                            {t.unit.tipe.kategori}
                          </span>
                        </div>
                      </div>

                      {/* Metode Bayar & Harga Deal */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate">Metode Bayar:</span>
                          <span className="font-medium text-graphite">
                            {t.metode_bayar === "CASH_KERAS"
                              ? "Cash Keras"
                              : t.metode_bayar === "CASH_TEMPO"
                                ? "Cash Tempo"
                                : "KPR"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate">Harga Deal:</span>
                          <span className="font-mono font-bold text-deep-teal text-sm">
                            {dealFormatted}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate pt-1">
                          <span>Tahapan Mikro:</span>
                          <span className="font-medium text-graphite font-mono">
                            {t.tahap_detail}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action: Kelola Transaksi */}
                    <div className="pt-4 mt-4 border-t border-mist">
                      <Link
                        href={`/admin/transaksi/${t.id}`}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-carbon-ink hover:bg-black text-white text-xs font-semibold transition-all shadow-subtle group"
                      >
                        <span>Kelola Transaksi</span>
                        <ExternalLink className="w-3.5 h-3.5 text-prism-teal group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Customer Modal */}
      {userRole !== "MANAGER" && (
        <EditCustomerModal
          key={customer.id}
          customer={customer}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={(updated) => setCustomer(updated)}
        />
      )}
    </div>
  );
}
