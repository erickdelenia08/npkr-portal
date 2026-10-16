"use client";

import React from "react";
import {
  PhoneCall,
  MessageCircle,
  Users,
  MapPin,
  MoreHorizontal,
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";
import { SerializedAktivitas } from "@/actions/activity";
import { JenisAktivitas, HasilAktivitas } from "@/generated/prisma";

interface ActivityTimelineProps {
  activities: SerializedAktivitas[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const getJenisConfig = (jenis: JenisAktivitas) => {
    switch (jenis) {
      case "TELEPON":
        return {
          icon: PhoneCall,
          colorClass: "bg-sky-50 text-sky-600 border-sky-200",
          label: "Panggilan Telepon",
        };
      case "WHATSAPP":
        return {
          icon: MessageCircle,
          colorClass: "bg-emerald-50 text-emerald-600 border-emerald-200",
          label: "Pesan WhatsApp",
        };
      case "BERTEMU":
        return {
          icon: Users,
          colorClass: "bg-purple-50 text-purple-600 border-purple-200",
          label: "Pertemuan Tatap Muka",
        };
      case "SURVEI_LOKASI":
        return {
          icon: MapPin,
          colorClass: "bg-amber-50 text-amber-600 border-amber-200",
          label: "Survei Lokasi / Perumahan",
        };
      case "LAINNYA":
      default:
        return {
          icon: MoreHorizontal,
          colorClass: "bg-slate-100 text-slate-600 border-slate-200",
          label: "Aktivitas Lainnya",
        };
    }
  };

  const getHasilBadge = (hasil: HasilAktivitas) => {
    switch (hasil) {
      case "TERTARIK":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "MASIH_MIKIR":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "TIDAK_DIJAWAB":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "MINTA_INFO_LAGI":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "TIDAK_JADI":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-bone text-graphite border-mist";
    }
  };

  const formatHasilLabel = (hasil: HasilAktivitas): string => {
    switch (hasil) {
      case "TERTARIK":
        return "Tertarik";
      case "MASIH_MIKIR":
        return "Masih Pertimbangkan";
      case "TIDAK_DIJAWAB":
        return "Tidak Dijawab / Sibuk";
      case "MINTA_INFO_LAGI":
        return "Minta Info Brosur/Pricelist";
      case "TIDAK_JADI":
        return "Tidak Jadi / Batal Minat";
      default:
        return hasil;
    }
  };

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-mist p-8 text-center shadow-subtle">
        <div className="w-12 h-12 rounded-full bg-teal-50 text-prism-teal flex items-center justify-center mx-auto mb-3">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-carbon-ink">
          Belum Ada Riwayat Aktivitas
        </h3>
        <p className="text-xs text-slate mt-1 max-w-xs mx-auto leading-relaxed">
          Belum ada rekaman follow up untuk konsumen ini. Tekan tombol &quot;+ Catat Aktivitas&quot;
          untuk mencatat riwayat telepon, chat WhatsApp, atau survei.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-mist p-4 sm:p-6 shadow-subtle space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-mist">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-prism-teal" />
          <h2 className="text-sm font-bold text-carbon-ink uppercase tracking-wider">
            Riwayat Aktivitas &amp; Follow-Up
          </h2>
        </div>
        <span className="text-xs font-mono font-medium text-slate">
          {activities.length} aktivitas
        </span>
      </div>

      {/* Vertical Timeline Tree */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-mist">
        {activities.map((act) => {
          const config = getJenisConfig(act.jenis);
          const IconComponent = config.icon;

          return (
            <div key={act.id} className="relative group">
              {/* Timeline Node Dot / Icon */}
              <div
                className={`absolute -left-6 sm:-left-8 top-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center shadow-2xs transition-transform group-hover:scale-110 ${config.colorClass}`}
              >
                <IconComponent className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>

              {/* Activity Card */}
              <div className="bg-bone/40 rounded-lg border border-mist p-3.5 sm:p-4 space-y-2 hover:bg-bone/70 transition-colors">
                {/* Header row: Jenis + Hasil + Time */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-carbon-ink">
                      {config.label}
                    </span>

                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-semibold border ${getHasilBadge(
                        act.hasil
                      )}`}
                    >
                      {formatHasilLabel(act.hasil)}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate font-mono">
                    {new Date(act.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Catatan Field */}
                {act.catatan && (
                  <p className="text-xs text-graphite bg-white p-2.5 rounded-md border border-mist/70 leading-relaxed font-sans">
                    {act.catatan}
                  </p>
                )}

                {/* Next Follow-Up Badge (if specified) */}
                {act.tgl_follow_up && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-medium w-fit">
                    <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Jadwal Follow-up:{" "}
                      {new Date(act.tgl_follow_up).toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
