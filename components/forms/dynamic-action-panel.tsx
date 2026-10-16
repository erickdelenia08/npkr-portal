"use client";

import React, { useState, useTransition } from "react";
import {
  Workflow,
  CheckCircle2,
  Calendar,
  Building,
  Scale,
  FileCheck,
  Loader2,
  Home,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { updateTransactionStatus } from "@/actions/transaksi.action";
import { Button } from "@/components/ui/button";

// Master Data Checklist
const BERKAS_UMUM = ["Focotopy KTP Suami Istri", "Fotocopy KK", "Fotocopy NPWP", "Buku Nikah / Surat Cerai", "Pas Foto 3x4"];
const BERKAS_SUBSIDI = [...BERKAS_UMUM, "Surat Ket. Belum Memiliki Rumah", "Slip Gaji (Maks. 4-8 Juta)", "SKU (Jika Wirausaha)", "Rekening Koran 3 Bulan"];
const BERKAS_KOMERSIL = [...BERKAS_UMUM, "Slip Gaji / Bukti Penghasilan", "Rekening Koran 6 Bulan"];

const BAST_CHECKLIST = [
  "Pondasi & Struktur (Sloof, Ring Balok)",
  "Dinding (Plester, Aci, Cat Rapih)",
  "Rangka Atap & Plafon",
  "Lantai & Keramik (Tidak Ngangkat)",
  "Kusen, Pintu & Jendela (Bisa Dikunci)",
  "Kelistrikan (Saklar, Lampu Menyala)",
  "Sanitasi & Air (Kran, Pompa, Septictank)",
  "Fasad & Kebersihan Sisa Puing"
];

interface DynamicActionPanelProps {
  transaksiId: number;
  leadId: number; // Dibutuhkan backend untuk mencatat ke tabel Aktivitas
  metodeBayar: "KPR" | "CASH_KERAS" | "CASH_TEMPO";
  kategoriUnit: "SUBSIDI" | "KOMERSIL" | "KAVLING"; // Untuk menentukan checklist berkas
  currentStatus: string;
  initialBank: string | null;
  initialNotaris: string | null;
  initialTglAkad: string | null;
  initialCatatan: string | null;
}

export function DynamicActionPanel({
  transaksiId,
  leadId,
  metodeBayar,
  kategoriUnit,
  currentStatus,
  initialBank,
  initialNotaris,
  initialTglAkad,
  initialCatatan,
}: DynamicActionPanelProps) {
  const [isPending, startTransition] = useTransition();

  // Status options yang diperluas sesuai SOP KPR
  const getOptions = () => {
    switch (metodeBayar) {
      case "KPR":
        return ["Pemberkasan", "BI Checking", "Wawancara & OTS", "Verifikasi", "SP3K", "Akad", "BAST"];
      case "CASH_KERAS":
        return ["Pemberkasan Notaris", "Menunggu Pelunasan", "AJB", "BAST"];
      case "CASH_TEMPO":
        return ["Pemberkasan PPJB", "Cicilan Berjalan", "Lunas & AJB", "BAST"];
      default:
        return ["Pemberkasan", "Akad", "BAST"];
    }
  };

  const statusOptions = getOptions();
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus || statusOptions[0]);

  // State Form
  const [namaBank, setNamaBank] = useState<string>(initialBank || "");
  const [namaNotaris, setNamaNotaris] = useState<string>(initialNotaris || "");
  const [tglAkad, setTglAkad] = useState<string>(() => initialTglAkad ? new Date(initialTglAkad).toISOString().split("T")[0] : "");
  const [catatanAdmin, setCatatanAdmin] = useState<string>(initialCatatan || "");

  // State Checklists (Disimpan dalam bentuk Array string yang dicentang)
  const [berkasChecked, setBerkasChecked] = useState<string[]>([]);
  const [bastChecked, setBastChecked] = useState<string[]>([]);

  // Logika Kondisional UI
  const isAkadOrAjb = selectedStatus.toLowerCase().includes("akad") || selectedStatus.toLowerCase().includes("ajb");
  const isPemberkasan = selectedStatus.includes("Pemberkasan");
  const isBast = selectedStatus === "BAST";
  const isKpr = metodeBayar === "KPR";

  // Penentuan List Berkas
  const currentBerkasList = kategoriUnit === "SUBSIDI" ? BERKAS_SUBSIDI : (kategoriUnit === "KOMERSIL" ? BERKAS_KOMERSIL : BERKAS_UMUM);

  // Validasi BAST wajib 100%
  const isBastComplete = isBast ? bastChecked.length === BAST_CHECKLIST.length : true;

  const toggleChecklist = (item: string, type: "BERKAS" | "BAST") => {
    if (type === "BERKAS") {
      setBerkasChecked(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    } else {
      setBastChecked(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBast && !isBastComplete) {
      toast.error("Serah terima (BAST) gagal: Checklist kelengkapan bangunan wajib 100%!");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateTransactionStatus({
          transaksiId,
          leadId, // Dikirim agar backend bisa bikin log Aktivitas
          status: selectedStatus,
          namaBank: isKpr && isAkadOrAjb ? namaBank.trim() || null : null,
          namaNotaris: isAkadOrAjb ? namaNotaris.trim() || null : null,
          tglAkad: isAkadOrAjb && tglAkad ? tglAkad : null,
          catatanAdmin: catatanAdmin.trim() || null,
          berkas: isPemberkasan ? berkasChecked : null, // Backend bisa simpan ini sebagai JSON
          bast: isBast ? bastChecked : null,
        });

        if (res.success) {
          toast.success("Status berhasil diperbarui & Log aktivitas tercatat.");
        } else {
          toast.error(res.error || "Gagal memperbarui status.");
        }
      } catch (err: unknown) {
        toast.error("Terjadi kesalahan sistem.");
      }
    });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
            <Workflow className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Progress Transaksi</h2>
            <p className="text-xs text-slate-500">Jalur: {metodeBayar.replace(/_/g, " ")} | Kategori: {kategoriUnit}</p>
          </div>
        </div>
      </div>

      {/* Progress Steps Indicator */}
      <div className="py-4 border-b border-slate-100 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {statusOptions.map((opt, idx) => {
            const isSelected = selectedStatus === opt;
            const isCurrent = currentStatus === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setSelectedStatus(opt)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${isSelected ? "bg-slate-800 text-white border-slate-800"
                  : isCurrent ? "bg-teal-50 text-teal-700 border-teal-200"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                  }`}
              >
                <span className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center bg-black/10">{idx + 1}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSave} className="space-y-5 pt-4">

        {/* --- DYNAMIC UI: CHECKLIST PEMBERKASAN --- */}
        {isPemberkasan && (
          <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100">
            <h3 className="text-xs font-bold text-indigo-800 mb-3 flex items-center gap-1.5"><FileCheck className="w-4 h-4" /> Checklist Berkas {kategoriUnit}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentBerkasList.map((berkas) => (
                <label key={berkas} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={berkasChecked.includes(berkas)} onChange={() => toggleChecklist(berkas, "BERKAS")} className="rounded text-indigo-600 focus:ring-indigo-500" />
                  {berkas}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* --- DYNAMIC UI: FIELD AKAD & AJB --- */}
        {isAkadOrAjb && (
          <div className="p-4 rounded-lg bg-teal-50/40 border border-teal-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {isKpr && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Bank KPR <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input type="text" value={namaBank} onChange={(e) => setNamaBank(e.target.value)} placeholder="Contoh: Bank BTN" required className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notaris / PPAT <span className="text-red-500">*</span></label>
              <div className="relative">
                <Scale className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input type="text" value={namaNotaris} onChange={(e) => setNamaNotaris(e.target.value)} placeholder="Nama Notaris" required className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Akad <span className="text-red-500">*</span></label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input type="date" value={tglAkad} onChange={(e) => setTglAkad(e.target.value)} required className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500" />
              </div>
            </div>
          </div>
        )}

        {/* --- DYNAMIC UI: CHECKLIST BAST --- */}
        {isBast && (
          <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-200">
            <h3 className="text-xs font-bold text-amber-800 mb-3 flex items-center gap-1.5"><Home className="w-4 h-4" /> Checklist Kelengkapan Unit (Wajib 100%)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BAST_CHECKLIST.map((item) => (
                <label key={item} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={bastChecked.includes(item)} onChange={() => toggleChecklist(item, "BAST")} className="rounded text-amber-600 focus:ring-amber-500" />
                  {item}
                </label>
              ))}
            </div>
            {!isBastComplete && (
              <p className="text-[10px] text-red-500 mt-2 font-semibold flex items-center gap-1"><CheckSquare className="w-3 h-3" /> Semua poin BAST harus dicentang sebelum serah terima.</p>
            )}
          </div>
        )}

        {/* Catatan Admin Bebas */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Catatan Progress (Opsional - Akan masuk ke riwayat Marketing)</label>
          <textarea value={catatanAdmin} onChange={(e) => setCatatanAdmin(e.target.value)} placeholder="Contoh: Dokumen KPR masuk ke BTN hari ini..." rows={2} className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none" />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isPending || (isBast && !isBastComplete)} className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold">
            {isPending ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Menyimpan...</> : "Update Status & Catat Aktivitas"}
          </Button>
        </div>
      </form>
    </div>
  );
}