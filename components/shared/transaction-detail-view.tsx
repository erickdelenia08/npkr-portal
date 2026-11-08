import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { toWibDay } from "@/lib/date/wib";
import { MAKRO_OF } from "@/lib/transaksi/stage-map";
import { DynamicActionPanel } from "@/components/forms/dynamic-action-panel";
import { QuickPrintActions } from "@/components/forms/quick-print-actions";
import { HandoverTransaksiDialog } from "@/components/forms/handover-dialog";
import { getTransactionHistory, type ActivityLogFeedItem } from "@/actions/activity";
import { TransactionAuditTrail } from "@/components/shared/transaction-audit-trail";
import { TransactionCustomerUnitAccordions } from "@/components/shared/transaction-customer-unit-accordions";
import {
  TransactionFinancialSummary,
  TransactionPaymentTable,
  type PlainPaymentItem,
} from "@/components/shared/transaction-financial-summary";

export interface TransactionDetailViewProps {
  trxId: number;
  backHref?: string;
  backLabel?: string;
}

export async function TransactionDetailView({
  trxId,
  backHref = "/admin/transaksi",
  backLabel = "Kembali ke Pantauan Transaksi",
}: TransactionDetailViewProps) {
  if (!Number.isSafeInteger(trxId) || trxId <= 0) {
    notFound();
  }

  const session = await auth();
  const currentUserId = Number(session?.user?.id);
  const currentUserRole = session?.user?.role;
  const isManager = currentUserRole === "MANAGER";

  const transaksi = await prisma.transaksi.findUnique({
    where: { id: trxId },
    include: {
      customer: true,
      itj: {
        select: {
          id: true,
          lead_id: true,
        },
      },
      dokumen: true,
      pengajuan_kpr: {
        include: {
          bank: true,
          logs: {
            include: {
              actor: {
                select: {
                  nama: true,
                },
              },
            },
            orderBy: {
              created_at: "desc",
            },
          },
        },
        orderBy: {
          nomor_pengajuan: "desc",
        },
      },
      checklist_bast: true,
      unit: {
        include: {
          tipe: true,
        },
      },
      pic: {
        select: {
          id: true,
          nama: true,
          no_hp: true,
        },
      },
      pembayaran: {
        include: {
          penerima: {
            select: {
              id: true,
              nama: true,
            },
          },
        },
        orderBy: [{ tgl_bayar: "desc" }, { id: "desc" }],
      },
    },
  });

  if (!transaksi) {
    notFound();
  }

  // PIC-based Access Control
  const canEdit =
    (Number.isSafeInteger(currentUserId) && currentUserId === transaksi.pic_id) ||
    currentUserRole === "ADMIN";

  const canHandover = canEdit || currentUserRole === "MANAGER";

  // Fetch or auto-seed master bank list
  let masterBanks = await prisma.bank.findMany({
    where: { is_active: true },
    orderBy: { nama: "asc" },
  });

  if (masterBanks.length === 0) {
    await prisma.bank.createMany({
      data: [
        { nama: "Bank BTN", kode: "BTN" },
        // { nama: "Bank BTN Syariah", kode: "BTNS" },
        // { nama: "Bank BSI (Bank Syariah Indonesia)", kode: "BSI" },
        // { nama: "Bank Mandiri", kode: "MANDIRI" },
        { nama: "Bank BRI", kode: "BRI" },
        { nama: "Bank BNI", kode: "BNI" },
        // { nama: "Bank BCA", kode: "BCA" },
      ],
      skipDuplicates: true,
    });
    masterBanks = await prisma.bank.findMany({
      where: { is_active: true },
      orderBy: { nama: "asc" },
    });
  }

  let auditLogs: ActivityLogFeedItem[] = [];
  if (isManager) {
    const historyRes = await getTransactionHistory(transaksi.id);
    auditLogs = historyRes.success && historyRes.data ? historyRes.data : [];
  }

  const formatDate = (date: Date): string =>
    new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);

  // Financial calculations (excluding voided payments)
  const hargaDeal = Number(transaksi.harga_deal);
  const targetItj = Number(transaksi.target_itj);
  const targetDp = Number(transaksi.target_dp);

  const validPayments = transaksi.pembayaran.filter((p) => !p.is_void);

  const itjPaid = validPayments
    .filter((p) => p.jenis_pembayaran === "ITJ")
    .reduce((sum, p) => sum + Number(p.nominal), 0);

  const dpPaid = validPayments
    .filter((p) => p.jenis_pembayaran === "DP")
    .reduce((sum, p) => sum + Number(p.nominal), 0);

  const totalPaid = validPayments.reduce(
    (sum, p) => sum + Number(p.nominal),
    0
  );

  const sisaItj = Math.max(0, targetItj - itjPaid);
  const sisaDp = Math.max(0, targetDp - dpPaid);
  const sisaPelunasan = Math.max(0, hargaDeal - totalPaid);

  const lastPayment =
    validPayments.length > 0
      ? [...validPayments].sort(
        (a, b) =>
          new Date(b.tgl_bayar).getTime() - new Date(a.tgl_bayar).getTime()
      )[0]
      : null;
  const lastPaymentDate = lastPayment
    ? lastPayment.tgl_bayar.toISOString()
    : null;

  const payments: PlainPaymentItem[] = transaksi.pembayaran.map((p) => ({
    id: p.id,
    tanggal: p.tgl_bayar ? p.tgl_bayar.toISOString() : p.created_at.toISOString(),
    jenis: p.jenis_pembayaran,
    noKwitansi: p.no_kwitansi,
    nominal: Number(p.nominal),
    penerima: p.penerima?.nama || "Admin",
    catatan: p.catatan || "",
    isVoid: p.is_void,
    voidReason: p.void_reason || null,
  }));

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* ─── 1. HEADER & READ-ONLY BANNER ─── */}
      <div className="order-1 space-y-4">
        {/* Read-Only Access Banner for non-PIC / non-Admin */}
        {!canEdit && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Mode Hanya Baca (Read-Only)</p>
              <p className="text-amber-800 mt-0.5">
                Perubahan progres dan pencatatan pembayaran hanya dapat dilakukan oleh Marketing PIC (
                <span className="font-semibold">{transaksi.pic.nama}</span>) atau Administrator.
              </p>
            </div>
          </div>
        )}

        {/* Back Navigation Link */}
        {/* {backHref && (
          <div>
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate hover:text-carbon-ink transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{backLabel}</span>
            </Link>
          </div>
        )} */}

        {/* Header Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-mist shadow-subtle flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Bagian Kiri: Informasi Konsumen, Unit & Status */}
          <div className="space-y-1.5">
            <div className="flex flex-row justify-between sm:items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-carbon-ink tracking-tight">
                {transaksi.customer.nama_ktp}
              </h1>

              {/* Badge Unit & Status dalam satu baris fleksibel */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-teal-50 text-deep-teal border border-teal-200">
                  {MAKRO_OF[transaksi.tahap_detail]}
                </span>
              </div>
            </div>

            {/* Metadata Tanggal & PIC */}
            <p className="text-xs text-slate font-light">
              dibuat pada {formatDate(transaksi.created_at)} • PIC:{" "}
              <span className="font-semibold text-carbon-ink">
                {transaksi.pic.nama}
              </span>
            </p>
          </div>

          {/* Bagian Kanan: Quick Action Buttons (Responsive Layout) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-mist">
            {canHandover && (
              <div className="w-full sm:w-auto">
                <HandoverTransaksiDialog
                  transaksiId={transaksi.id}
                  blokUnit={transaksi.unit.blok}
                  currentPicId={transaksi.pic_id}
                  currentPicName={transaksi.pic.nama}
                  isLocked={
                    transaksi.tahap_detail === "BAST" ||
                    transaksi.tgl_bast !== null ||
                    transaksi.tahap_detail === "BATAL" ||
                    transaksi.cancelled_at !== null
                  }
                  lockedReason={
                    transaksi.tahap_detail === "BATAL" || transaksi.cancelled_at !== null
                      ? "Transaksi telah dibatalkan sehingga penugasan PIC terkunci."
                      : "Transaksi telah selesai (BAST) sehingga penugasan PIC terkunci."
                  }
                />
              </div>
            )}
            <QuickPrintActions
              transaksiId={transaksi.id}
              hasPembayaran={transaksi.pembayaran.length > 0}
            />
          </div>
        </div>
      </div>

      {/* ─── 2. CUSTOMER & UNIT INFO ACCORDIONS ─── */}
      {/* Mobile: Urutan 4 | Desktop: Urutan 2 */}
      <div className="order-4 lg:order-2">
        <TransactionCustomerUnitAccordions
          customer={{
            nama_ktp: transaksi.customer.nama_ktp,
            nik: transaksi.customer.nik,
            tempat_lahir: transaksi.customer.tempat_lahir,
            tgl_lahir: transaksi.customer.tgl_lahir,
            alamat_ktp: transaksi.customer.alamat_ktp,
            no_hp: transaksi.customer.no_hp,
          }}
          unit={{
            blok: transaksi.unit.blok,
            tipe: {
              nama_tipe: transaksi.unit.tipe.nama_tipe,
              kategori: transaksi.unit.tipe.kategori,
            },
            metode_bayar: transaksi.metode_bayar,
            tenor_bulan: transaksi.tenor_bulan,
          }}
        />
      </div>

      {/* ─── 3. KARTU PEMBAYARAN KOMPAK (DENGAN SHEET RIWAYAT MOBILE) ─── */}
      {/* Mobile: Urutan 2 | Desktop: Urutan 3 */}
      <div className="order-2 lg:order-3">
        <TransactionFinancialSummary
          transaksiId={transaksi.id}
          hargaDeal={hargaDeal}
          targetItj={targetItj}
          targetDp={targetDp}
          sisaPelunasan={sisaPelunasan}
          totalPaid={totalPaid}
          sisaItj={sisaItj}
          sisaDp={sisaDp}
          payments={payments}
          canEdit={canEdit}
        />
      </div>

      {/* ─── 4. PANEL PROGRES TRANSAKSI ─── */}
      {/* Mobile: Urutan 3 | Desktop: Urutan 4 */}
      <div className="order-3 lg:order-4">
        <DynamicActionPanel
          transaksiId={transaksi.id}
          leadId={transaksi.itj.lead_id}
          version={transaksi.version}
          canEdit={canEdit}
          metodeBayar={transaksi.metode_bayar}
          kategoriUnit={transaksi.unit.tipe.kategori}
          statusPernikahan={transaksi.customer.status_pernikahan}
          statusPekerjaan={transaksi.customer.status_pekerjaan}
          currentTahapDetail={transaksi.tahap_detail}
          initialNotaris={transaksi.nama_notaris}
          initialTglAkad={
            transaksi.tgl_akad ? transaksi.tgl_akad.toISOString() : null
          }
          initialTglBast={
            transaksi.tgl_bast ? transaksi.tgl_bast.toISOString() : null
          }
          initialLunasAt={
            transaksi.lunas_at ? transaksi.lunas_at.toISOString() : null
          }
          initialRencanaAkad={
            transaksi.rencana_akad_at ? transaksi.rencana_akad_at.toISOString() : null
          }
          initialRencanaBast={
            transaksi.rencana_bast_at ? transaksi.rencana_bast_at.toISOString() : null
          }
          initialPengajuanTerpilihId={transaksi.pengajuan_kpr_terpilih_id}
          initialCatatan={transaksi.catatan_admin}
          initialVerifiedDocs={transaksi.dokumen
            .filter((d) => d.status === "LENGKAP")
            .map((d) => d.jenis)}
          initialDokumenInfo={transaksi.dokumen.map((d) => ({
            jenis: d.jenis,
            diterima_at: d.diterima_at ? toWibDay(d.diterima_at) : null,
          }))}
          initialChecklistBast={transaksi.checklist_bast.map((b) => ({
            item: b.item,
            status: b.status,
          }))}
          initialPengajuanKpr={transaksi.pengajuan_kpr}
          masterBanks={masterBanks}
          financialSummary={{
            hargaDeal,
            totalPaid,
            targetDp,
            dpPaid,
            sisaPelunasan,
            sisaDp,
            lastPaymentDate,
          }}
        />
      </div>

      {/* ─── 5. TABEL RIWAYAT PEMBAYARAN (DESKTOP INLINE) ─── */}
      {/* Mobile: Hidden | Desktop: Urutan 5 */}
      <div className="hidden lg:block lg:order-5">
        <TransactionPaymentTable
          transaksiId={transaksi.id}
          sisaItj={sisaItj}
          sisaDp={sisaDp}
          totalPaid={totalPaid}
          payments={payments}
          canEdit={canEdit}
        />
      </div>

      {/* ─── 6. AUDIT TRAIL / RIWAYAT AKTIVITAS (Hanya untuk MANAGER) ─── */}
      {/* Mobile: Urutan 5 | Desktop: Urutan 6 */}
      {isManager && (
        <div className="order-5 lg:order-6">
          <TransactionAuditTrail
            logs={auditLogs}
            transaksiId={transaksi.id}
          />
        </div>
      )}
    </div>
  );
}
