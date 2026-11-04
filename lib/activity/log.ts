// lib/activity/log.ts

import { Prisma, ActivityEntity, TahapDetail } from "@/generated/prisma";
import { ActivityAction, activityActionSchema } from "./actions";
import { buildActivitySummary, SummaryContext } from "./summary";

export interface LogActivityInput {
  entityType: ActivityEntity;
  entityId: number;
  action: ActivityAction;
  leadId?: number | null;
  transaksiId?: number | null;
  tahapDetail?: TahapDetail | null;
  actorId?: number | null;
  summary?: string;
  summaryContext?: SummaryContext;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  isBackfill?: boolean;
  createdAt?: Date;
}

/**
 * Strips sensitive / PII fields from JSON before/after payloads to guarantee privacy.
 * Strict privacy rule: NEVER store NIK, alamat KTP, no_hp, password, or document content.
 */
function sanitizePayload(
  obj: Record<string, unknown> | null | undefined
): Prisma.InputJsonValue | undefined {
  if (!obj || typeof obj !== "object") return undefined;

  const forbiddenKeys = new Set([
    "nik",
    "password",
    "alamat_ktp",
    "alamat",
    "no_hp",
    "nomor_hp",
    "phone",
    "konten_dokumen",
    "file_data",
  ]);

  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    if (forbiddenKeys.has(key.toLowerCase())) {
      continue;
    }
    if (val instanceof Date) {
      sanitized[key] = val.toISOString();
    } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      sanitized[key] = sanitizePayload(val as Record<string, unknown>);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized as Prisma.InputJsonValue;
}

/**
 * Single source of truth for writing to ActivityLog.
 * Append-only: No function in the codebase should ever update or delete an ActivityLog row.
 * Must ALWAYS be executed inside a Prisma interactive transaction client (`tx`).
 */
export async function logActivity(
  tx: Prisma.TransactionClient,
  input: LogActivityInput
) {
  // Validate action enum
  activityActionSchema.parse(input.action);

  const summary =
    input.summary?.trim() ||
    buildActivitySummary(input.action, input.summaryContext || {});

  const beforeJson = sanitizePayload(input.before);
  const afterJson = sanitizePayload(input.after);

  return await tx.activityLog.create({
    data: {
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      lead_id: input.leadId || null,
      transaksi_id: input.transaksiId || null,
      tahap_detail: input.tahapDetail || null,
      actor_id: input.actorId || null,
      summary,
      before: beforeJson,
      after: afterJson,
      is_backfill: input.isBackfill ?? false,
      created_at: input.createdAt || new Date(),
    },
  });
}

