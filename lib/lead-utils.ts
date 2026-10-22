// lib/lead-utils.ts
import { SumberLead } from "@/generated/prisma";

// export { SumberLead };

// export const SumberLead = {
//   WALK_IN: "WALK_IN",
//   FACEBOOK_ADS: "FACEBOOK_ADS",
//   TIKTOK: "TIKTOK",
//   INSTAGRAM: "INSTAGRAM",
//   WA_KANTOR: "WA_KANTOR",
//   REFERRAL: "REFERRAL",
//   LAINNYA: "LAINNYA",
// } as const;

export type LeadTahap =
  | "LEAD MASUK"
  | "SURVEI DIJADWALKAN"
  | "SUDAH SURVEI"
  | "ITJ DIAJUKAN"
  | "CLOSING"
  | "LOST"
  | "Lead Masuk"
  | "Survei Dijadwalkan"
  | "Sudah Survei"
  | "Closing"
  | "Lost";

export interface LeadMilestoneFields {
  survei_jadwal_at?: Date | string | null;
  survei_selesai_at?: Date | string | null;
  lost_at?: Date | string | null;
  lost_reason?: string | null;
}

export interface LeadTahapInput extends LeadMilestoneFields {
  itj?:
  | Array<{
    status: string;
    transaksi?: {
      closing_at?: Date | string | null;
      status_transaksi?: string | null;
    } | null;
  }>
  | {
    status: string;
    transaksi?: {
      closing_at?: Date | string | null;
      status_transaksi?: string | null;
    } | null;
  }
  | null;
  transaksi?: {
    closing_at?: Date | string | null;
    status_transaksi?: string | null;
  } | null;
  customer?: {
    transaksi?: Array<{
      closing_at?: Date | string | null;
      status_transaksi?: string | null;
    }> | null;
  } | null;
}

/**
 * Dynamically computes current stage of a Lead based on milestone date fields and relations.
 * Logic:
 * 1. If lost_at is not null -> return 'LOST'.
 * 2. If transaksi?.closing_at is not null (excluding BATAL) -> return 'CLOSING'.
 * 3. If itj exists and status is 'DIAJUKAN' -> return 'ITJ DIAJUKAN'.
 * 4. If survei_selesai_at is not null -> return 'SUDAH SURVEI'.
 * 5. If survei_jadwal_at is not null -> return 'SURVEI DIJADWALKAN'.
 * 6. Else -> return 'LEAD MASUK'.
 */
export function getLeadTahap(lead?: LeadTahapInput | null): LeadTahap {
  if (!lead) return "LEAD MASUK";

  // 1. If lost_at is not null -> return 'LOST'
  if (lead.lost_at != null) {
    return "LOST";
  }

  // 2. If transaksi?.closing_at is not null and not BATAL -> return 'CLOSING'
  if (lead.transaksi?.closing_at != null && lead.transaksi?.status_transaksi !== "BATAL") {
    return "CLOSING";
  }

  if (Array.isArray(lead.itj)) {
    const hasClosed = lead.itj.some(
      (item) => item.transaksi?.closing_at != null && item.transaksi?.status_transaksi !== "BATAL"
    );
    if (hasClosed) return "CLOSING";
  } else if (lead.itj?.transaksi?.closing_at != null && lead.itj?.transaksi?.status_transaksi !== "BATAL") {
    return "CLOSING";
  }

  if (lead.customer?.transaksi?.some((t) => t.closing_at != null && t.status_transaksi !== "BATAL")) {
    return "CLOSING";
  }

  // 3. If itj exists and status is 'DIAJUKAN' -> return 'ITJ DIAJUKAN'
  if (Array.isArray(lead.itj)) {
    const hasDiajukan = lead.itj.some((item) => item.status === "DIAJUKAN");
    if (hasDiajukan) return "ITJ DIAJUKAN";
  } else if (lead.itj?.status === "DIAJUKAN") {
    return "ITJ DIAJUKAN";
  }

  // 4. If survei_selesai_at is not null -> return 'SUDAH SURVEI'
  if (lead.survei_selesai_at != null) {
    return "SUDAH SURVEI";
  }

  // 5. If survei_jadwal_at is not null -> return 'SURVEI DIJADWALKAN'
  if (lead.survei_jadwal_at != null) {
    return "SURVEI DIJADWALKAN";
  }

  // Else -> return 'LEAD MASUK'
  return "LEAD MASUK";
}

export type FollowUpStatus =
  | "TERLAMBAT"
  | "HARI_INI"
  | "MENDATANG"
  | "BELUM_DIJADWAL";

export interface FollowUpInfo {
  status: FollowUpStatus;
  label: string;
  formattedDate: string;
  diffDays: number | null;
}

/**
 * Calculates follow-up status (Terlambat, Hari Ini, Mendatang, Belum Dijadwal)
 */
export function getFollowUpInfo(
  tglFollowUp?: Date | string | null,
  referenceDate = new Date()
): FollowUpInfo {
  if (!tglFollowUp) {
    return {
      status: "BELUM_DIJADWAL",
      label: "Belum dijadwalkan",
      formattedDate: "Belum dijadwalkan",
      diffDays: null,
    };
  }

  const dateObj = typeof tglFollowUp === "string" ? new Date(tglFollowUp) : tglFollowUp;
  if (isNaN(dateObj.getTime())) {
    return {
      status: "BELUM_DIJADWAL",
      label: "Belum dijadwalkan",
      formattedDate: "Belum dijadwalkan",
      diffDays: null,
    };
  }

  const todayMid = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  ).getTime();

  const targetMid = new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate()
  ).getTime();

  const diffDays = Math.round((targetMid - todayMid) / (1000 * 60 * 60 * 24));

  const formattedDate = dateObj.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      status: "TERLAMBAT",
      label: `Terlambat (${overdueDays} hr)`,
      formattedDate,
      diffDays,
    };
  }

  if (diffDays === 0) {
    return {
      status: "HARI_INI",
      label: "Hari Ini",
      formattedDate,
      diffDays: 0,
    };
  }

  return {
    status: "MENDATANG",
    label: `Mendatang (${diffDays} hr)`,
    formattedDate,
    diffDays,
  };
}

export function getLeadSortPriority<
  T extends {
    tahap: LeadTahap | string;
    followUpInfo?: FollowUpInfo;
    tgl_follow_up?: Date | string | null;
    created_at: Date | string;
  }
>(lead: T): number {
  const norm = (lead.tahap || "").toUpperCase();

  // Tier 5: Lost at very bottom
  if (norm === "LOST") return 50000;
  // Tier 4: Closing at bottom
  if (norm === "CLOSING") return 40000;
  // Tier 3.5: ITJ Diajukan
  if (norm === "ITJ DIAJUKAN") return 35000;

  const fuStatus =
    lead.followUpInfo?.status ||
    (lead.tgl_follow_up ? "MENDATANG" : "BELUM_DIJADWAL");
  if (fuStatus === "TERLAMBAT") return 10000;
  if (fuStatus === "HARI_INI") return 20000;
  if (fuStatus === "MENDATANG") return 21000;
  return 30000; // Unscheduled
}

/**
 * Sorts leads according to Phase 2 business logic:
 * Overdue first -> upcoming/today -> unscheduled -> Closing/Lost at bottom.
 */
export function sortLeadsByDefaultPriority<
  T extends {
    tahap: LeadTahap | string;
    followUpInfo?: FollowUpInfo;
    tgl_follow_up?: Date | string | null;
    created_at: Date | string;
  }
>(leads: T[]): T[] {
  return [...leads].sort((a, b) => {
    const prioA = getLeadSortPriority(a);
    const prioB = getLeadSortPriority(b);
    if (prioA !== prioB) return prioA - prioB;

    // Overdue sub-sort: earliest overdue date first
    if (prioA === 10000 && a.tgl_follow_up && b.tgl_follow_up) {
      return (
        new Date(a.tgl_follow_up).getTime() -
        new Date(b.tgl_follow_up).getTime()
      );
    }
    // Upcoming sub-sort: earliest upcoming date first
    if (
      (prioA === 20000 || prioA === 21000) &&
      a.tgl_follow_up &&
      b.tgl_follow_up
    ) {
      return (
        new Date(a.tgl_follow_up).getTime() -
        new Date(b.tgl_follow_up).getTime()
      );
    }
    // Fallback: newest created first
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/**
 * Clean & normalize phone number for WhatsApp URL
 */
export function formatWhatsAppUrl(phone: string, nama: string): string {
  let clean = phone.replace(/[\s-+]/g, "");
  if (clean.startsWith("0")) clean = "62" + clean.slice(1);
  const msg = encodeURIComponent(
    `Halo Bpk/Ibu ${nama}, saya dari tim marketing NPKR Property. Terkait informasi perumahan yang Anda minati...`
  );
  return `https://wa.me/${clean}?text=${msg}`;
}

/**
 * Map string input to the SumberLead Enum
 */
export function mapToSumberLead(sumberStr?: string | null): SumberLead {
  if (!sumberStr) return "LAINNYA";
  const s = sumberStr.trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (s.includes("WALK")) return "WALK_IN";
  if (s.includes("FACEBOOK") || s.includes("FB")) return "FACEBOOK_ADS";
  if (s.includes("TIKTOK") || s.includes("TIK_TOK")) return "TIKTOK";
  if (s.includes("INSTAGRAM") || s.includes("IG")) return "INSTAGRAM";
  if (s.includes("WA") || s.includes("WHATSAPP")) return "WA_KANTOR";
  if (s.includes("REFERRAL") || s.includes("REKOMENDASI")) return "REFERRAL";

  const validEnums: SumberLead[] = [
    "WALK_IN",
    "FACEBOOK_ADS",
    "TIKTOK",
    "INSTAGRAM",
    "WA_KANTOR",
    "REFERRAL",
    "LAINNYA",
  ];
  if (validEnums.includes(s as SumberLead)) {
    return s as SumberLead;
  }

  return "LAINNYA";
}
