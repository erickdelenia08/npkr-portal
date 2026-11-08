// lib/transaksi/apply-stage.ts

import { prisma } from "@/lib/prisma";
import {
  TahapDetail,
  Prisma,
  ItemBAST,
  StatusBAST,
  JenisDokumen,
} from "@/generated/prisma";
import {
  MAKRO_OF,
  getAllowedDetailsForMetode,
} from "@/lib/transaksi/stage-map";
import {
  todayWIB,
  toWibDay,
  parseDateOnlyUTC,
  todayDateOnlyUTC,
} from "@/lib/date/wib";
import {
  getRequiredDocuments,
  summarizeDocuments,
} from "@/lib/transaksi/document-rules";
import { logActivity } from "@/lib/activity/log";
import { ActivityAction } from "@/lib/activity/actions";

export interface ApplyStageParams {
  transaksiId: number;
  fromDetail: TahapDetail;
  toDetail: TahapDetail;
  version: number;
  actorId: number;
  userRole?: string;
  catatanAdmin?: string | null;
  namaNotaris?: string | null;
  tglAkad?: string | null;
  tglBast?: string | null;
  lunasAt?: string | null;
  rencanaAkadAt?: string | null;
  rencanaBastAt?: string | null;
  alasanBatal?: string | null;
  pengajuanTerpilihId?: number | null;
  documents?: string[] | null;
}

export async function applyStage(params: ApplyStageParams) {
  const {
    transaksiId,
    fromDetail,
    toDetail,
    version,
    actorId,
    userRole,
    catatanAdmin,
    namaNotaris,
    tglAkad,
    tglBast,
    lunasAt,
    rencanaAkadAt,
    rencanaBastAt,
    alasanBatal,
    pengajuanTerpilihId,
    documents,
  } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current transaction with relations
    const existingTrx = await tx.transaksi.findUnique({
      where: { id: transaksiId },
      include: {
        customer: true,
        unit: {
          include: { tipe: true },
        },
        itj: true,
        pembayaran: {
          where: { is_void: false },
        },
        pengajuan_kpr: {
          orderBy: { nomor_pengajuan: "desc" },
          include: { bank: true },
        },
        checklist_bast: true,
        dokumen: true,
      },
    });

    if (!existingTrx) {
      throw new Error("Transaksi tidak ditemukan.");
    }

    const actorUser = actorId
      ? await tx.user.findUnique({
          where: { id: actorId },
          select: { id: true, nama: true },
        })
      : null;

    // 2. Concurrency check against current DB state
    if (existingTrx.tahap_detail !== fromDetail || existingTrx.version !== version) {
      throw new Error(
        "Data transaksi telah diubah oleh pengguna lain. Halaman akan dimuat ulang."
      );
    }

    // 3. Terminal state guards
    if (existingTrx.tahap_detail === "BATAL") {
      throw new Error("Transaksi yang sudah BATAL tidak dapat diubah statusnya lagi.");
    }

    if (existingTrx.tahap_detail === "BAST" && toDetail !== "BAST") {
      throw new Error("Transaksi yang sudah menyelesaikan serah terima (BAST) telah tuntas.");
    }

    // 4. Validate allowed stages for method
    const allowedList = getAllowedDetailsForMetode(existingTrx.metode_bayar);
    if (!allowedList.includes(toDetail)) {
      throw new Error(
        `Tahap detail "${toDetail}" tidak valid untuk metode pembayaran ${existingTrx.metode_bayar}.`
      );
    }

    const currentIndex = allowedList.indexOf(fromDetail);
    const targetIndex = allowedList.indexOf(toDetail);
    const isCancellation = toDetail === "BATAL";
    const isSameStage = toDetail === fromDetail;
    const isRegression = targetIndex < currentIndex && !isCancellation;
    const isAdvancing = targetIndex > currentIndex && !isCancellation;

    // 5. Directional transition rules
    if (isCancellation) {
      const finalAlasan = (alasanBatal || catatanAdmin || "").trim();
      if (!finalAlasan || finalAlasan.length < 5) {
        throw new Error("Alasan pembatalan transaksi wajib diisi (minimal 5 karakter).");
      }
    }

    if (isRegression) {
      const note = (catatanAdmin || "").trim();
      if (!note || note.length < 5) {
        throw new Error(
          "Alasan pemunduran tahap transaksi wajib diisi pada catatan progress (minimal 5 karakter)."
        );
      }
    }

    if (isAdvancing) {
      const stepDiff = targetIndex - currentIndex;
      if (stepDiff > 1) {
        const nextExpected = allowedList[currentIndex + 1];
        throw new Error(
          `Perpindahan tahap tidak valid: Tidak dapat melompati tahap. Tahap berikutnya adalah "${nextExpected}".`
        );
      }
    }

    // 6. Handle document verification sync (if passed)
    const verifiedDocKeys = new Set(
      existingTrx.dokumen
        .filter((d) => d.status === "LENGKAP")
        .map((d) => d.jenis)
    );

    if (documents !== undefined && documents !== null) {
      const submittedDocKeys = new Set(documents);
      const allowedDocTypes: JenisDokumen[] = [
        "KTP_SUAMI_ISTRI",
        "KTP_PEMOHON",
        "KTP_PASANGAN",
        "KARTU_KELUARGA",
        "NPWP",
        "BUKU_NIKAH",
        "SLIP_GAJI",
        "SURAT_KET_KERJA",
        "REKENING_KORAN",
        "SURAT_KET_BELUM_PUNYA_RUMAH",
        "SKU_WIRAUSAHA",
        "LAPORAN_KEUANGAN",
        "LEGALITAS_LAINNYA",
      ];

      for (const docKey of allowedDocTypes) {
        const isChecked = submittedDocKeys.has(docKey);
        const existingDoc = existingTrx.dokumen.find((d) => d.jenis === docKey);

        if (isChecked) {
          verifiedDocKeys.add(docKey);
          if (!existingDoc || existingDoc.status !== "LENGKAP") {
            await tx.dokumenTransaksi.upsert({
              where: {
                transaksi_id_jenis: {
                  transaksi_id: existingTrx.id,
                  jenis: docKey,
                },
              },
              create: {
                transaksi_id: existingTrx.id,
                jenis: docKey,
                status: "LENGKAP",
              },
              update: {
                status: "LENGKAP",
              },
            });
          }
        } else if (existingDoc && existingDoc.status === "LENGKAP") {
          verifiedDocKeys.delete(docKey);
          await tx.dokumenTransaksi.update({
            where: { id: existingDoc.id },
            data: { status: "BELUM_LENGKAP" },
          });
        }
      }
    }

    // 7. Gate checks when advancing
    // A. Documentation Gate (Leaving index 0 - Pemberkasan)
    if (isAdvancing && currentIndex === 0 && targetIndex > 0) {
      const docEvaluation = getRequiredDocuments({
        metode: existingTrx.metode_bayar,
        kategori: existingTrx.unit.tipe.kategori,
        statusPernikahan: existingTrx.customer.status_pernikahan,
        statusPekerjaan: existingTrx.customer.status_pekerjaan,
      });

      if (!docEvaluation.isProfileComplete) {
        throw new Error(`Pemberkasan belum lengkap: ${docEvaluation.message}`);
      }

      const summary = summarizeDocuments(
        docEvaluation.documents,
        Array.from(verifiedDocKeys)
      );

      if (summary.missingForPengajuan.length > 0) {
        const missingLabels = summary.missingForPengajuan
          .map((d) => d.label)
          .join(", ");
        throw new Error(
          `Dokumen pemberkasan belum lengkap: Dokumen [${missingLabels}] wajib diverifikasi sebelum dapat melanjutkan tahap transaksi.`
        );
      }
    }

    // A2. Documentation Gate before Akad (AKAD_KREDIT / AJB)
    const isTargetAkad = toDetail === "AKAD_KREDIT" || toDetail === "AJB";
    if (isAdvancing && isTargetAkad && !isRegression) {
      const docEvaluation = getRequiredDocuments({
        metode: existingTrx.metode_bayar,
        kategori: existingTrx.unit.tipe.kategori,
        statusPernikahan: existingTrx.customer.status_pernikahan,
        statusPekerjaan: existingTrx.customer.status_pekerjaan,
      });

      if (!docEvaluation.isProfileComplete) {
        throw new Error(`Pemberkasan belum lengkap: ${docEvaluation.message}`);
      }

      const summary = summarizeDocuments(
        docEvaluation.documents,
        Array.from(verifiedDocKeys)
      );

      if (
        summary.missingForPengajuan.length > 0 ||
        summary.missingForAkad.length > 0
      ) {
        const allMissing = [
          ...summary.missingForPengajuan,
          ...summary.missingForAkad,
        ];
        const missingLabels = allMissing.map((d) => d.label).join(", ");
        throw new Error(
          `Akad belum dapat diproses: Dokumen persyaratan [${missingLabels}] wajib diverifikasi lengkap sebelum Akad.`
        );
      }
    }

    // B. KPR Gates
    let chosenPengajuanId = existingTrx.pengajuan_kpr_terpilih_id;
    if (existingTrx.metode_bayar === "KPR") {
      if (toDetail === "AKAD_KREDIT") {
        const sp3kApps = existingTrx.pengajuan_kpr.filter(
          (p) => p.status === "SP3K"
        );

        if (sp3kApps.length === 0 && !isSameStage) {
          throw new Error(
            "Akad Kredit KPR belum dapat diproses: Memerlukan minimal satu Pengajuan KPR yang telah berstatus SP3K Terbit dari Bank."
          );
        }

        if (sp3kApps.length === 1) {
          chosenPengajuanId = sp3kApps[0].id;
        } else if (sp3kApps.length > 1) {
          const selectedId =
            pengajuanTerpilihId || existingTrx.pengajuan_kpr_terpilih_id;
          if (!selectedId || !sp3kApps.some((p) => p.id === selectedId)) {
            throw new Error(
              "Terdapat lebih dari satu SP3K yang terbit. Silakan pilih bank pembiaya sebelum melanjutkan ke Akad Kredit."
            );
          }
          chosenPengajuanId = selectedId;
        }

        if (chosenPengajuanId) {
          const chosenApp = existingTrx.pengajuan_kpr.find(
            (p) => p.id === chosenPengajuanId
          );
          if (!chosenApp || chosenApp.status !== "SP3K") {
            throw new Error(
              "Akad Kredit KPR belum dapat diproses: Bank pembiaya yang dipilih harus berstatus SP3K Terbit dari Bank."
            );
          }
        }

        if (!tglAkad?.trim() && !existingTrx.tgl_akad) {
          throw new Error("Tanggal Akad Kredit wajib diisi.");
        }

        if (!namaNotaris?.trim() && !existingTrx.nama_notaris) {
          throw new Error("Nama Notaris/PPAT rekanan bank wajib diisi.");
        }

        // Cancel other active pengajuan when advancing to AKAD_KREDIT
        if (chosenPengajuanId && !isSameStage) {
          const othersToCancel = existingTrx.pengajuan_kpr.filter(
            (p) =>
              p.id !== chosenPengajuanId &&
              p.status !== "DITOLAK" &&
              p.status !== "DIBATALKAN"
          );

          for (const other of othersToCancel) {
            await tx.pengajuanKPR.update({
              where: { id: other.id },
              data: {
                status: "DIBATALKAN",
                catatan: "Tidak dipilih sebagai bank pembiaya",
                tanggal_keputusan: new Date(),
              },
            });

            await tx.pengajuanKPRLog.create({
              data: {
                pengajuan_id: other.id,
                status_sebelum: other.status,
                status_sesudah: "DIBATALKAN",
                actor_id: actorId,
                catatan: "Tidak dipilih sebagai bank pembiaya",
              },
            });
          }

          const chosenApp = existingTrx.pengajuan_kpr.find(
            (p) => p.id === chosenPengajuanId
          );
          const chosenBankName = chosenApp?.bank?.nama || "Bank";

          await logActivity(tx, {
            entityType: "PENGAJUAN_KPR",
            entityId: chosenPengajuanId,
            action: "KPR_BANK_SELECTED",
            leadId: existingTrx.itj?.lead_id || null,
            transaksiId: existingTrx.id,
            tahapDetail: toDetail,
            actorId,
            summaryContext: {
              actorName: actorUser?.nama,
              bankName: chosenBankName,
              cancelledCount: othersToCancel.length,
              blok: existingTrx.unit?.blok,
            },
            after: {
              pengajuan_id: chosenPengajuanId,
              bank_nama: chosenBankName,
              cancelled_count: othersToCancel.length,
            },
          });
        }
      }
    }

    // C. Payment Settlement Gates (Cash)
    const totalPaid = existingTrx.pembayaran.reduce(
      (sum, p) => sum + Number(p.nominal),
      0
    );
    const hargaDeal = Number(existingTrx.harga_deal);

    if (toDetail === "PEMBAYARAN_DP" && existingTrx.metode_bayar === "CASH_TEMPO") {
      const dpPaid = existingTrx.pembayaran
        .filter((p) => p.jenis_pembayaran === "DP" || p.jenis_pembayaran === "ITJ")
        .reduce((sum, p) => sum + Number(p.nominal), 0);
      const targetDp = Number(existingTrx.target_dp);
      if (dpPaid < targetDp) {
        throw new Error(
          `Tahap Pembayaran DP belum tercapai: Pembayaran DP yang masuk (Rp ${dpPaid.toLocaleString(
            "id-ID"
          )}) belum memenuhi target DP (Rp ${targetDp.toLocaleString("id-ID")}).`
        );
      }
    }

    if (toDetail === "PELUNASAN") {
      if (totalPaid < hargaDeal) {
        const sisa = hargaDeal - totalPaid;
        throw new Error(
          `Tahap Pelunasan belum dapat dicatat: Total penerimaan yang sah (Rp ${totalPaid.toLocaleString(
            "id-ID"
          )}) belum melunasi harga deal (Rp ${hargaDeal.toLocaleString(
            "id-ID"
          )}). Sisa tagihan: Rp ${sisa.toLocaleString("id-ID")}.`
        );
      }
    }

    if (toDetail === "AJB") {
      if (totalPaid < hargaDeal) {
        throw new Error(
          `Akad (Cash) belum dapat diproses: Pembayaran belum lunas 100%. Sisa tagihan: Rp ${(
            hargaDeal - totalPaid
          ).toLocaleString("id-ID")}.`
        );
      }

      if (!tglAkad?.trim() && !existingTrx.tgl_akad) {
        throw new Error("Tanggal Akad wajib diisi.");
      }

      if (!namaNotaris?.trim() && !existingTrx.nama_notaris) {
        throw new Error("Nama Notaris / PPAT pembuat akta wajib diisi.");
      }
    }

    // D. BAST Handover Checklist Gates
    if (toDetail === "BAST") {
      if (userRole && userRole !== "ADMIN") {
        throw new Error("Hanya Admin yang berwenang menyelesaikan serah terima (BAST).");
      }

      const isKavling = existingTrx.unit?.tipe?.kategori === "KAVLING";
      if (isKavling) {
        if (!tglBast?.trim() && !existingTrx.tgl_bast) {
          throw new Error("Tanggal serah terima (BAST) fisik lahan wajib diisi.");
        }
      } else {
        const allItemEnums = Object.values(ItemBAST);
        const currentChecklists = await tx.checklistBAST.findMany({
          where: { transaksi_id: existingTrx.id },
        });
        const checklistMap = new Map<ItemBAST, StatusBAST>(
          currentChecklists.map((b) => [b.item, b.status])
        );
        const incomplete = allItemEnums.filter(
          (item) => checklistMap.get(item) !== "LENGKAP"
        );
        if (incomplete.length > 0) {
          throw new Error(
            `Serah Terima (BAST) gagal: Masih terdapat ${incomplete.length} dari ${allItemEnums.length} item checklist serah terima unit yang belum lengkap.`
          );
        }
      }
    }

    // 8. Actual Date Milestone Validation
    const todayStr = todayWIB();
    const closingStr = toWibDay(existingTrx.closing_at);

    if (tglAkad?.trim()) {
      const akadStr = tglAkad.trim();
      if (akadStr > todayStr) {
        throw new Error("Tanggal pelaksanaan Akad/AJB tidak boleh di masa depan.");
      }
      if (closingStr && akadStr < closingStr) {
        throw new Error(
          `Tanggal Akad/AJB (${akadStr}) tidak boleh mendahului tanggal closing ITJ (${closingStr}).`
        );
      }
    }

    if (tglBast?.trim()) {
      const bastStr = tglBast.trim();
      if (bastStr > todayStr) {
        throw new Error("Tanggal pelaksanaan BAST tidak boleh di masa depan.");
      }
      const effectiveAkad = tglAkad?.trim() || toWibDay(existingTrx.tgl_akad);
      if (effectiveAkad && bastStr < effectiveAkad) {
        throw new Error(
          `Tanggal BAST (${bastStr}) tidak boleh mendahului tanggal Akad/AJB (${effectiveAkad}).`
        );
      }
      if (closingStr && bastStr < closingStr) {
        throw new Error(
          `Tanggal BAST (${bastStr}) tidak boleh mendahului tanggal closing ITJ (${closingStr}).`
        );
      }
    }

    if (lunasAt?.trim()) {
      const lunasStr = lunasAt.trim();
      if (lunasStr > todayStr) {
        throw new Error("Tanggal pelunasan tidak boleh di masa depan.");
      }
    }

    // 9. Build Transaksi Update Payload
    const updateData: Prisma.TransaksiUpdateInput = {
      tahap_detail: toDetail,
    };

    if (namaNotaris !== undefined) {
      updateData.nama_notaris = namaNotaris?.trim() || null;
    }

    if (catatanAdmin !== undefined) {
      updateData.catatan_admin = catatanAdmin?.trim() || null;
    }

    if (rencanaAkadAt !== undefined) {
      updateData.rencana_akad_at = rencanaAkadAt?.trim()
        ? parseDateOnlyUTC(rencanaAkadAt)
        : null;
    }

    if (rencanaBastAt !== undefined) {
      updateData.rencana_bast_at = rencanaBastAt?.trim()
        ? parseDateOnlyUTC(rencanaBastAt)
        : null;
    }

    // Set actual milestone dates when entering corresponding stages
    if (toDetail === "AKAD_KREDIT" || toDetail === "AJB") {
      const actualAkad = tglAkad?.trim()
        ? parseDateOnlyUTC(tglAkad)
        : existingTrx.tgl_akad || todayDateOnlyUTC();
      updateData.tgl_akad = actualAkad;
      updateData.pengajuan_kpr_terpilih = chosenPengajuanId
        ? { connect: { id: chosenPengajuanId } }
        : undefined;
    }

    if (toDetail === "PELUNASAN") {
      const actualLunas = lunasAt?.trim()
        ? parseDateOnlyUTC(lunasAt)
        : existingTrx.lunas_at || todayDateOnlyUTC();
      updateData.lunas_at = actualLunas;
    }

    if (toDetail === "BAST") {
      const actualBast = tglBast?.trim()
        ? parseDateOnlyUTC(tglBast)
        : existingTrx.tgl_bast || todayDateOnlyUTC();
      updateData.tgl_bast = actualBast;
    }

    // If regressing backwards, reset dates beyond target
    if (isRegression) {
      if (toDetail !== "BAST") {
        updateData.tgl_bast = null;
      }
      if (
        toDetail !== "AKAD_KREDIT" &&
        toDetail !== "AJB" &&
        toDetail !== "BAST"
      ) {
        updateData.tgl_akad = null;
        updateData.pengajuan_kpr_terpilih = { disconnect: true };
      }
      if (
        toDetail === "PEMBERKASAN_LEGALITAS" ||
        toDetail === "MENUNGGU_PELUNASAN" ||
        toDetail === "PEMBERKASAN_PPJB" ||
        toDetail === "PEMBAYARAN_DP" ||
        toDetail === "CICILAN_BERJALAN"
      ) {
        updateData.lunas_at = null;
      }
    }

    // Cancellation side effects
    if (isCancellation) {
      updateData.cancelled_at = new Date();
      updateData.alasan_batal = (alasanBatal || catatanAdmin || "").trim() || "Dibatalkan";
      updateData.active_unit = { disconnect: true };
    }

    // 10. Execute atomic update with Concurrency Guard
    const affected = await tx.transaksi.updateMany({
      where: {
        id: transaksiId,
        tahap_detail: fromDetail,
        version: version,
      },
      data: {
        tahap_detail: toDetail,
        tahap_since: isSameStage ? undefined : new Date(),
        nama_notaris: updateData.nama_notaris,
        catatan_admin: updateData.catatan_admin,
        rencana_akad_at: updateData.rencana_akad_at,
        rencana_bast_at: updateData.rencana_bast_at,
        tgl_akad: updateData.tgl_akad,
        lunas_at: updateData.lunas_at,
        tgl_bast: updateData.tgl_bast,
        cancelled_at: updateData.cancelled_at,
        alasan_batal: updateData.alasan_batal,
        active_unit_id: isCancellation ? null : existingTrx.active_unit_id,
        pengajuan_kpr_terpilih_id:
          toDetail === "AKAD_KREDIT"
            ? chosenPengajuanId
            : isRegression && toDetail !== "BAST"
              ? null
              : existingTrx.pengajuan_kpr_terpilih_id,
        version: { increment: 1 },
      },
    });

    if (affected.count !== 1) {
      throw new Error(
        "Data transaksi telah diubah oleh pengguna lain. Halaman akan dimuat ulang."
      );
    }

    // 11. Unit Inventory Status Management
    if (toDetail === "AKAD_KREDIT" || toDetail === "AJB") {
      await tx.masterUnit.update({
        where: { id: existingTrx.unit_id },
        data: { status_unit: "SOLD" },
      });
    }

    if (
      (existingTrx.tahap_detail === "AKAD_KREDIT" || existingTrx.tahap_detail === "AJB") &&
      isRegression
    ) {
      await tx.masterUnit.update({
        where: { id: existingTrx.unit_id },
        data: { status_unit: "BOOKED" },
      });
    }

    if (isCancellation) {
      const otherActive = await tx.transaksi.findFirst({
        where: {
          unit_id: existingTrx.unit_id,
          id: { not: existingTrx.id },
          tahap_detail: { not: "BATAL" },
        },
      });

      if (!otherActive) {
        await tx.masterUnit.update({
          where: { id: existingTrx.unit_id },
          data: { status_unit: "AVAILABLE" },
        });
      } else {
        const isSold =
          otherActive.tahap_detail === "AKAD_KREDIT" ||
          otherActive.tahap_detail === "AJB" ||
          otherActive.tahap_detail === "BAST";
        await tx.masterUnit.update({
          where: { id: existingTrx.unit_id },
          data: { status_unit: isSold ? "SOLD" : "BOOKED" },
        });
      }
    }

    // 12. Audit Logging: TransaksiTahapLog & Aktivitas
    if (!isSameStage || isCancellation) {
      let finalLogCatatan = (catatanAdmin || "").trim() || null;
      if (toDetail === "BAST" && existingTrx.unit?.tipe?.kategori === "KAVLING") {
        const kavlingNote =
          "Serah terima fisik lahan dikonfirmasi: patok batas dan aksesibilitas lahan terverifikasi.";
        finalLogCatatan = finalLogCatatan
          ? `${finalLogCatatan} • ${kavlingNote}`
          : kavlingNote;
      }

      await tx.transaksiTahapLog.create({
        data: {
          transaksi_id: existingTrx.id,
          actor_id: actorId,
          detail_sebelum: fromDetail,
          detail_sesudah: toDetail,
          catatan: finalLogCatatan,
        },
      });

      const actualLeadId = existingTrx.itj?.lead_id;
      if (actualLeadId) {
        const activityNotes = [
          `[STATUS TRANSAKSI] ${toDetail} (${MAKRO_OF[toDetail]})`,
          catatanAdmin ? `Catatan: ${catatanAdmin.trim()}` : null,
        ]
          .filter(Boolean)
          .join(" • ");

        await tx.aktivitas.create({
          data: {
            lead_id: actualLeadId,
            user_id: actorId,
            jenis: "LAINNYA",
            hasil: isCancellation ? "TIDAK_JADI" : "TERTARIK",
            catatan: activityNotes,
          },
        });
      }

      // Record Unified ActivityLog
      let stageAction: ActivityAction = "STAGE_ADVANCED";
      if (isCancellation) {
        stageAction = "TRANSAKSI_CANCELLED";
      } else if (isRegression) {
        stageAction = "STAGE_REVERTED";
      } else if (toDetail === "AKAD_KREDIT" || toDetail === "AJB") {
        stageAction = "AKAD_CONFIRMED";
      } else if (toDetail === "BAST") {
        stageAction = "BAST_CONFIRMED";
      }

      const toIsoOrNull = (val: unknown): string | null => {
        if (!val) return null;
        if (val instanceof Date) return val.toISOString();
        if (typeof val === "string") return val;
        return null;
      };

      const toWibOrNull = (val: unknown): string | null => {
        if (!val) return null;
        if (val instanceof Date || typeof val === "string") return toWibDay(val);
        return null;
      };

      await logActivity(tx, {
        entityType: "TRANSAKSI",
        entityId: existingTrx.id,
        action: stageAction,
        leadId: actualLeadId || null,
        transaksiId: existingTrx.id,
        tahapDetail: toDetail,
        actorId,
        summaryContext: {
          actorName: actorUser?.nama,
          blok: existingTrx.unit?.blok,
          stageName: MAKRO_OF[toDetail],
          prevStageName: MAKRO_OF[fromDetail],
          alasan: alasanBatal || catatanAdmin,
          isKavling: existingTrx.unit?.tipe?.kategori === "KAVLING",
        },
        before: {
          tahap_detail: fromDetail,
        },
        after: {
          tahap_detail: toDetail,
          tgl_akad: toWibOrNull(updateData.tgl_akad),
          lunas_at: toWibOrNull(updateData.lunas_at),
          tgl_bast: toWibOrNull(updateData.tgl_bast),
          cancelled_at: toIsoOrNull(updateData.cancelled_at),
        },
      });
    }

    // Return updated transaction
    return await tx.transaksi.findUniqueOrThrow({
      where: { id: transaksiId },
      include: {
        customer: true,
        unit: { include: { tipe: true } },
        itj: true,
        pengajuan_kpr_terpilih: { include: { bank: true } },
      },
    });
  });
}
