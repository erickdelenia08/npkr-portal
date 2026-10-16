export type LeadTahap =
  | "Lead Masuk"
  | "Survei Dijadwalkan"
  | "Sudah Survei"
  | "Closing"
  | "Lost";

export interface LeadMilestoneFields {
  survei_jadwal_at?: Date | string | null;
  survei_selesai_at?: Date | string | null;
  closing_at?: Date | string | null;
  lost_at?: Date | string | null;
  lost_reason?: string | null;
}

/**
 * Dynamically computes current stage of a Lead based on milestone date fields.
 * Precedence:
 * 1. lost_at -> "Lost"
 * 2. closing_at -> "Closing"
 * 3. survei_selesai_at -> "Sudah Survei"
 * 4. survei_jadwal_at -> "Survei Dijadwalkan"
 * 5. Default -> "Lead Masuk"
 */
export function getLeadTahap(
  lead?: LeadMilestoneFields | null
): LeadTahap {
  if (!lead) return "Lead Masuk";
  if (lead.lost_at) return "Lost";
  if (lead.closing_at) return "Closing";
  if (lead.survei_selesai_at) return "Sudah Survei";
  if (lead.survei_jadwal_at) return "Survei Dijadwalkan";
  return "Lead Masuk";
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

export function getLeadSortPriority<T extends {
  tahap: LeadTahap;
  followUpInfo?: FollowUpInfo;
  tgl_follow_up?: Date | string | null;
  created_at: Date | string;
}>(lead: T): number {
  // Tier 5: Lost at very bottom
  if (lead.tahap === "Lost") return 50000;
  // Tier 4: Closing at bottom
  if (lead.tahap === "Closing") return 40000;

  const fuStatus = lead.followUpInfo?.status || (lead.tgl_follow_up ? "MENDATANG" : "BELUM_DIJADWAL");
  if (fuStatus === "TERLAMBAT") return 10000;
  if (fuStatus === "HARI_INI") return 20000;
  if (fuStatus === "MENDATANG") return 21000;
  return 30000; // Unscheduled
}

/**
 * Sorts leads according to Phase 2 business logic:
 * Overdue first -> upcoming/today -> unscheduled -> Closing/Lost at bottom.
 */
export function sortLeadsByDefaultPriority<T extends {
  tahap: LeadTahap;
  followUpInfo?: FollowUpInfo;
  tgl_follow_up?: Date | string | null;
  created_at: Date | string;
}>(leads: T[]): T[] {
  return [...leads].sort((a, b) => {
    const prioA = getLeadSortPriority(a);
    const prioB = getLeadSortPriority(b);
    if (prioA !== prioB) return prioA - prioB;

    // Overdue sub-sort: earliest overdue date first
    if (prioA === 10000 && a.tgl_follow_up && b.tgl_follow_up) {
      return new Date(a.tgl_follow_up).getTime() - new Date(b.tgl_follow_up).getTime();
    }
    // Upcoming sub-sort: earliest upcoming date first
    if ((prioA === 20000 || prioA === 21000) && a.tgl_follow_up && b.tgl_follow_up) {
      return new Date(a.tgl_follow_up).getTime() - new Date(b.tgl_follow_up).getTime();
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
