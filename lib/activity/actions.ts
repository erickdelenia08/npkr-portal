// lib/activity/actions.ts

import { z } from "zod";
import { ActivityEntity } from "@/generated/prisma";

export const ACTIVITY_ACTIONS = [
  "LEAD_CREATED",
  "LEAD_FOLLOWUP_WHATSAPP",
  "LEAD_FOLLOWUP_TELEPON",
  "LEAD_FOLLOWUP_BERTEMU",
  "LEAD_FOLLOWUP_LAINNYA",
  "LEAD_HANDOVER",
  "LEAD_SURVEY_SCHEDULED",
  "LEAD_SURVEY_COMPLETED",
  "LEAD_LOST",
  "ITJ_SUBMITTED",
  "STAGE_ADVANCED",
  "STAGE_REVERTED",
  "TRANSAKSI_CANCELLED",
  "TRANSAKSI_HANDOVER",
  "SCHEDULE_UPDATED",
  "AKAD_CONFIRMED",
  "BAST_CONFIRMED",
  "PROFILE_UPDATED",
  "DOC_CHECKED",
  "DOC_UNCHECKED",
  "BAST_ITEM_CHECKED",
  "BAST_ITEM_UNCHECKED",
  "PAYMENT_RECORDED",
  "PAYMENT_VOIDED",
  "KPR_SUBMITTED",
  "KPR_STATUS_CHANGED",
  "KPR_REJECTED",
  "KPR_BANK_SELECTED",
  "UNIT_TYPE_CHANGED",
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const activityActionSchema = z.enum(ACTIVITY_ACTIONS);

export type ActivityCategory = "LEAD" | "TRANSAKSI" | "KEUANGAN" | "DOKUMEN";

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  "LEAD",
  "TRANSAKSI",
  "KEUANGAN",
  "DOKUMEN",
];

/**
 * Maps an ActivityEntity to one of the four UI feed tabs/categories.
 */
export function getCategoryForEntity(entityType: ActivityEntity): ActivityCategory {
  switch (entityType) {
    case "LEAD":
      return "LEAD";
    case "TRANSAKSI":
    case "UNIT":
      return "TRANSAKSI";
    case "PEMBAYARAN":
    case "PENGAJUAN_KPR":
      return "KEUANGAN";
    case "DOKUMEN":
    case "BAST_ITEM":
      return "DOKUMEN";
    default:
      return "TRANSAKSI";
  }
}

/**
 * Maps an ActivityAction directly to one of the four categories.
 */
export function getCategoryForAction(action: ActivityAction): ActivityCategory {
  if (action.startsWith("LEAD_")) return "LEAD";
  if (action.startsWith("PAYMENT_") || action.startsWith("KPR_")) {
    return "KEUANGAN";
  }
  if (action.startsWith("DOC_") || action.startsWith("BAST_ITEM_")) {
    return "DOKUMEN";
  }
  return "TRANSAKSI";
}

