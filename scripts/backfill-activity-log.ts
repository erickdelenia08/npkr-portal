// scripts/backfill-activity-log.ts

import { prisma } from "@/lib/prisma";
import { ActivityAction } from "@/lib/activity/actions";
import { buildActivitySummary } from "@/lib/activity/summary";
import { toWibDay } from "@/lib/date/wib";
import { MAKRO_OF } from "@/lib/transaksi/stage-map";

async function runBackfill() {
  console.log("=== Starting ActivityLog Backfill ===");

  let totalBackfilled = 0;

  // 1. Backfill from Aktivitas (Lead interactions & Handover)
  const allAktivitas = await prisma.aktivitas.findMany({
    include: {
      lead: { select: { id: true, nama: true } },
      user: { select: { id: true, nama: true } },
    },
    orderBy: { created_at: "asc" },
  });

  console.log(`Found ${allAktivitas.length} Aktivitas records.`);

  for (const act of allAktivitas) {
    const isHandover = act.catatan?.includes("[HANDOVER PIC]");
    let action: ActivityAction = "LEAD_FOLLOWUP_LAINNYA";

    if (isHandover) {
      action = "LEAD_HANDOVER";
    } else if (act.jenis === "WHATSAPP") {
      action = "LEAD_FOLLOWUP_WHATSAPP";
    } else if (act.jenis === "TELEPON") {
      action = "LEAD_FOLLOWUP_TELEPON";
    } else if (act.jenis === "BERTEMU") {
      action = "LEAD_FOLLOWUP_BERTEMU";
    }

    // Check idempotency
    const existing = await prisma.activityLog.findFirst({
      where: {
        entity_type: "LEAD",
        entity_id: act.lead_id,
        created_at: act.created_at,
      },
    });

    if (existing) continue;

    const summary = buildActivitySummary(action, {
      actorName: act.user.nama,
      leadName: act.lead.nama,
      hasil: act.hasil,
      customText: act.catatan || undefined,
    });

    await prisma.activityLog.create({
      data: {
        entity_type: "LEAD",
        entity_id: act.lead_id,
        action,
        lead_id: act.lead_id,
        actor_id: act.user_id,
        summary,
        after: {
          jenis: act.jenis,
          hasil: act.hasil,
          tgl_follow_up: act.tgl_follow_up ? act.tgl_follow_up.toISOString() : null,
        },
        is_backfill: true,
        created_at: act.created_at,
      },
    });
    totalBackfilled++;
  }

  // 2. Backfill from TransaksiTahapLog
  const allTahapLogs = await prisma.transaksiTahapLog.findMany({
    include: {
      transaksi: {
        include: {
          unit: true,
          itj: true,
        },
      },
      actor: { select: { id: true, nama: true } },
    },
    orderBy: { created_at: "asc" },
  });

  console.log(`Found ${allTahapLogs.length} TransaksiTahapLog records.`);

  for (const log of allTahapLogs) {
    const existing = await prisma.activityLog.findFirst({
      where: {
        entity_type: "TRANSAKSI",
        entity_id: log.transaksi_id,
        created_at: log.created_at,
      },
    });

    if (existing) continue;

    let action: ActivityAction = "STAGE_ADVANCED";
    if (log.detail_sesudah === "BATAL") {
      action = "TRANSAKSI_CANCELLED";
    } else if (log.detail_sesudah === "AKAD_KREDIT" || log.detail_sesudah === "AJB") {
      action = "AKAD_CONFIRMED";
    } else if (log.detail_sesudah === "BAST") {
      action = "BAST_CONFIRMED";
    }

    const summary = buildActivitySummary(action, {
      actorName: log.actor?.nama,
      blok: log.transaksi.unit.blok,
      stageName: MAKRO_OF[log.detail_sesudah],
      prevStageName: log.detail_sebelum ? MAKRO_OF[log.detail_sebelum] : undefined,
      alasan: log.catatan || undefined,
    });

    await prisma.activityLog.create({
      data: {
        entity_type: "TRANSAKSI",
        entity_id: log.transaksi_id,
        action,
        lead_id: log.transaksi.itj?.lead_id || null,
        transaksi_id: log.transaksi_id,
        tahap_detail: log.detail_sesudah,
        actor_id: log.actor_id,
        summary,
        before: { tahap_detail: log.detail_sebelum },
        after: { tahap_detail: log.detail_sesudah },
        is_backfill: true,
        created_at: log.created_at,
      },
    });
    totalBackfilled++;
  }

  // 3. Backfill from PengajuanKPRLog
  const allKprLogs = await prisma.pengajuanKPRLog.findMany({
    include: {
      pengajuan: {
        include: {
          bank: true,
          transaksi: {
            include: { unit: true, itj: true },
          },
        },
      },
      actor: { select: { id: true, nama: true } },
    },
    orderBy: { created_at: "asc" },
  });

  console.log(`Found ${allKprLogs.length} PengajuanKPRLog records.`);

  for (const klog of allKprLogs) {
    const existing = await prisma.activityLog.findFirst({
      where: {
        entity_type: "PENGAJUAN_KPR",
        entity_id: klog.pengajuan_id,
        created_at: klog.created_at,
      },
    });

    if (existing) continue;

    const action: ActivityAction =
      klog.status_sesudah === "DITOLAK" ? "KPR_REJECTED" : "KPR_STATUS_CHANGED";

    const summary = buildActivitySummary(action, {
      actorName: klog.actor?.nama,
      bankName: klog.pengajuan.bank.nama,
      nomorPengajuan: klog.pengajuan.nomor_pengajuan,
      statusKpr: klog.status_sesudah,
      blok: klog.pengajuan.transaksi.unit.blok,
      alasan: klog.catatan || undefined,
    });

    await prisma.activityLog.create({
      data: {
        entity_type: "PENGAJUAN_KPR",
        entity_id: klog.pengajuan_id,
        action,
        lead_id: klog.pengajuan.transaksi.itj?.lead_id || null,
        transaksi_id: klog.pengajuan.transaksi_id,
        tahap_detail: klog.pengajuan.transaksi.tahap_detail,
        actor_id: klog.actor_id,
        summary,
        before: { status: klog.status_sebelum },
        after: { status: klog.status_sesudah },
        is_backfill: true,
        created_at: klog.created_at,
      },
    });
    totalBackfilled++;
  }

  // 4. Backfill from Pembayaran
  const allPayments = await prisma.pembayaran.findMany({
    include: {
      transaksi: {
        include: { unit: true, itj: true },
      },
      penerima: { select: { id: true, nama: true } },
      voider: { select: { id: true, nama: true } },
    },
    orderBy: { created_at: "asc" },
  });

  console.log(`Found ${allPayments.length} Pembayaran records.`);

  for (const pay of allPayments) {
    // Normal payment recorded
    const existingRecorded = await prisma.activityLog.findFirst({
      where: {
        entity_type: "PEMBAYARAN",
        entity_id: pay.id,
        action: "PAYMENT_RECORDED",
      },
    });

    if (!existingRecorded) {
      const summary = buildActivitySummary("PAYMENT_RECORDED", {
        actorName: pay.penerima?.nama,
        jenisBayar: pay.jenis_pembayaran,
        nominal: Number(pay.nominal),
        noKwitansi: pay.no_kwitansi,
        blok: pay.transaksi.unit.blok,
      });

      await prisma.activityLog.create({
        data: {
          entity_type: "PEMBAYARAN",
          entity_id: pay.id,
          action: "PAYMENT_RECORDED",
          lead_id: pay.transaksi.itj?.lead_id || null,
          transaksi_id: pay.transaksi_id,
          tahap_detail: pay.transaksi.tahap_detail,
          actor_id: pay.admin_id,
          summary,
          after: {
            pembayaran_id: pay.id,
            jenis_pembayaran: pay.jenis_pembayaran,
            nominal: Number(pay.nominal),
            no_kwitansi: pay.no_kwitansi,
            cara_bayar: pay.cara_bayar,
            tgl_bayar: toWibDay(pay.tgl_bayar),
          },
          is_backfill: true,
          created_at: pay.created_at,
        },
      });
      totalBackfilled++;
    }

    // If voided
    if (pay.is_void && pay.void_at) {
      const existingVoid = await prisma.activityLog.findFirst({
        where: {
          entity_type: "PEMBAYARAN",
          entity_id: pay.id,
          action: "PAYMENT_VOIDED",
        },
      });

      if (!existingVoid) {
        const summary = buildActivitySummary("PAYMENT_VOIDED", {
          actorName: pay.voider?.nama || "Admin",
          jenisBayar: pay.jenis_pembayaran,
          noKwitansi: pay.no_kwitansi,
          alasan: pay.void_reason || undefined,
          blok: pay.transaksi.unit.blok,
        });

        await prisma.activityLog.create({
          data: {
            entity_type: "PEMBAYARAN",
            entity_id: pay.id,
            action: "PAYMENT_VOIDED",
            lead_id: pay.transaksi.itj?.lead_id || null,
            transaksi_id: pay.transaksi_id,
            tahap_detail: pay.transaksi.tahap_detail,
            actor_id: pay.void_by,
            summary,
            before: { is_void: false },
            after: { is_void: true, void_reason: pay.void_reason },
            is_backfill: true,
            created_at: pay.void_at,
          },
        });
        totalBackfilled++;
      }
    }
  }

  console.log(`=== Backfill Complete! Added ${totalBackfilled} rows to ActivityLog. ===`);
}

runBackfill()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
