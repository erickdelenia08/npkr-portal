import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  User,
  Receipt,
  Phone,
  CreditCard,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { formatDateOnly } from "@/lib/date/wib";
import { PembayaranModal } from "@/components/forms/pembayaran-modal";
import { DynamicActionPanel } from "@/components/forms/dynamic-action-panel";
import { QuickPrintActions } from "@/components/forms/quick-print-actions";
import { HandoverDialog } from "@/components/forms/handover-dialog";

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
              admin: {
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
      inspeksi_bast: {
        include: {
          inspektur: {
            select: {
              nama: true,
            },
          },
          logs: {
            include: {
              inspektur: {
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
      },
      unit: {
        include: {
          tipe: true,
        },
      },
      marketing: {
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
    (Number.isSafeInteger(currentUserId) && currentUserId === transaksi.marketing_id) ||
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
        { nama: "Bank BTN Syariah", kode: "BTNS" },
        { nama: "Bank BSI (Bank Syariah Indonesia)", kode: "BSI" },
        { nama: "Bank Mandiri", kode: "MANDIRI" },
        { nama: "Bank BRI", kode: "BRI" },
        { nama: "Bank BNI", kode: "BNI" },
        { nama: "Bank BCA", kode: "BCA" },
      ],
      skipDuplicates: true,
    });
    masterBanks = await prisma.bank.findMany({
      where: { is_active: true },
      orderBy: { nama: "asc" },
    });
  }

  // Currency & Date formatters
  const formatCurrency = (val: number): string =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);

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

  const getJenisBayarBadge = (jenis: string) => {
    switch (jenis) {
      case "ITJ":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DP":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "CICILAN":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "PELUNASAN":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-bone text-graphite border-mist";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── Breadcrumb Back Navigation ─── */}
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate hover:text-carbon-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backLabel}</span>
        </Link>
      </div>

      {/* ─── Read-Only Access Banner for non-PIC / non-Admin ─── */}
      {!canEdit && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">Mode Hanya Baca (Read-Only)</p>
            <p className="text-amber-800 mt-0.5">
              Anda tidak memiliki izin mengedit transaksi ini. Perubahan progres dan pencatatan pembayaran hanya dapat dilakukan oleh Marketing PIC (
              <span className="font-semibold">{transaksi.marketing.nama}</span>) atau Administrator.
            </p>
          </div>
        </div>
      )}

      {/* ─── 1. HEADER CARD ─── */}
      <div className="bg-white p-5 rounded-lg border border-mist shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          {/* <div className="w-11 h-11 rounded-lg bg-teal-50 text-deep-teal flex items-center justify-center shrink-0 mt-0.5">
            <Receipt className="w-6 h-6" />
          </div> */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-carbon-ink tracking-tight">
                {transaksi.customer.nama_ktp}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-mono font-bold bg-bone text-carbon-ink border border-mist">
                Unit {transaksi.unit.blok}
              </span>
              <span className="px-2.5 py-0.5 rounded-sm text-xs font-semibold bg-teal-50 text-deep-teal border border-teal-200">
                {transaksi.status_transaksi}
              </span>
            </div>
            <p className="text-xs text-slate mt-1">
              Transaksi #{transaksi.id} • Dibuat pada{" "}
              {formatDate(transaksi.created_at)} • Marketing PIC:{" "}
              <span className="font-semibold text-carbon-ink">
                {transaksi.marketing.nama}
              </span>
            </p>
          </div>
        </div>

        {/* Quick Action Buttons (Oper PIC, Cetak SPR & Cetak Kwitansi) */}
        <div className="flex items-center gap-2 flex-wrap">
          {canHandover && (
            <HandoverDialog
              leadId={transaksi.itj.lead_id}
              currentMarketingId={transaksi.marketing_id}
              currentMarketingName={transaksi.marketing.nama}
            />
          )}
          <QuickPrintActions
            transaksiId={transaksi.id}
            hasPembayaran={transaksi.pembayaran.length > 0}
          />
        </div>
      </div>

      {/* ─── 2. CUSTOMER & UNIT INFO CARD ─── */}
      <div className="bg-white rounded-lg border border-mist shadow-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-mist bg-bone/30 flex items-center gap-2">
          <User className="w-4 h-4 text-deep-teal" />
          <h2 className="text-sm font-bold text-carbon-ink uppercase tracking-wider">
            Informasi Konsumen & Unit Properti
          </h2>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Detail Konsumen */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-deep-teal border-b border-mist/80 pb-1">
              Data Identitas Konsumen
            </p>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate block text-[11px]">Nomor Induk Kependudukan (NIK)</span>
                <span className="font-mono font-semibold text-carbon-ink">
                  {transaksi.customer.nik}
                </span>
              </div>
              <div>
                <span className="text-slate block text-[11px]">Tempat, Tanggal Lahir (TTL)</span>
                <span className="font-medium text-carbon-ink">
                  {transaksi.customer.tempat_lahir},{" "}
                  {formatDateOnly(transaksi.customer.tgl_lahir)}
                </span>
              </div>
              <div>
                <span className="text-slate block text-[11px]">Alamat Sesuai KTP</span>
                <span className="text-graphite leading-relaxed">
                  {transaksi.customer.alamat_ktp}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <Phone className="w-3.5 h-3.5 text-slate" />
                <span className="font-mono text-carbon-ink">
                  {transaksi.customer.no_hp}
                </span>
              </div>
            </div>
          </div>

          {/* Detail Unit Properti */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-deep-teal border-b border-mist/80 pb-1">
              Spesifikasi Unit Terpilih
            </p>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate block text-[11px]">Blok & Nomor Unit</span>
                <span className="font-mono font-bold text-sm text-carbon-ink">
                  {transaksi.unit.blok}
                </span>
              </div>
              <div>
                <span className="text-slate block text-[11px]">Tipe Properti</span>
                <span className="font-semibold text-carbon-ink">
                  {transaksi.unit.tipe.nama_tipe}
                </span>
              </div>
              <div>
                <span className="text-slate block text-[11px]">Kategori Unit</span>
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-bone text-graphite border border-mist mt-0.5">
                  {transaksi.unit.tipe.kategori}
                </span>
              </div>
              <div>
                <span className="text-slate block text-[11px]">Skema Transaksi</span>
                <span className="font-semibold text-carbon-ink">
                  {transaksi.metode_bayar.replace(/_/g, " ")}
                  {transaksi.tenor_bulan ? ` (${transaksi.tenor_bulan} Bulan)` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Ringkasan Finansial Tagihan */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-deep-teal border-b border-mist/80 pb-1">
              Ringkasan Finansial Transaksi
            </p>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate">Harga Kesepakatan (Deal):</span>
                <span className="font-mono font-bold text-carbon-ink">
                  {formatCurrency(hargaDeal)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate">Target ITJ:</span>
                <span className="font-mono font-medium text-carbon-ink">
                  {formatCurrency(targetItj)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate">Target Uang Muka (DP):</span>
                <span className="font-mono font-medium text-carbon-ink">
                  {formatCurrency(targetDp)}
                </span>
              </div>
              <div className="pt-2 border-t border-mist/80 flex justify-between items-center">
                <span className="text-slate font-medium">Sisa Pelunasan:</span>
                <span className="font-mono font-bold text-rose-600">
                  {formatCurrency(sisaPelunasan)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Progress Bar */}
        <div className="px-5 py-3.5 bg-bone/40 border-t border-mist flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-deep-teal" />
            <span className="font-medium text-carbon-ink">
              Progress Pembayaran:
            </span>
            <span className="font-bold text-emerald-600 font-mono">
              {Math.min(100, Math.round((totalPaid / (hargaDeal || 1)) * 100))}%
            </span>
            <span className="text-slate">
              ({formatCurrency(totalPaid)} dari {formatCurrency(hargaDeal)})
            </span>
          </div>

          <div className="flex items-center gap-3">
            {sisaItj > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                Sisa ITJ: {formatCurrency(sisaItj)}
              </span>
            )}
            {sisaDp > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                Sisa DP: {formatCurrency(sisaDp)}
              </span>
            )}
            {sisaPelunasan === 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Lunas Penuh
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── 3. PAYMENT HISTORY CARD ─── */}
      <div
        id="riwayat-pembayaran"
        className="bg-white rounded-lg border border-mist shadow-subtle overflow-hidden"
      >
        <div className="p-5 border-b border-mist flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-carbon-ink">
                Riwayat Pembayaran & Kwitansi
              </h2>
              <p className="text-xs text-slate">
                Total Penerimaan Masuk:{" "}
                <span className="font-mono font-semibold text-emerald-600">
                  {formatCurrency(totalPaid)}
                </span>
              </p>
            </div>
          </div>

          {/* Button "+ Input Pembayaran" that opens Modal */}
          {canEdit && (
            <PembayaranModal
              transaksiId={transaksi.id}
              sisaItj={sisaItj}
              sisaDp={sisaDp}
            />
          )}
        </div>

        {/* Payment History Table */}
        {transaksi.pembayaran.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-bone text-slate flex items-center justify-center mx-auto mb-3">
              <FileSpreadsheet className="w-6 h-6 text-steel" />
            </div>
            <h3 className="text-sm font-semibold text-carbon-ink">
              Belum ada data pembayaran
            </h3>
            <p className="text-xs text-slate mt-1 max-w-sm mx-auto">
              Klik tombol &quot;+ Input Pembayaran&quot; di atas untuk mencatat setoran
              tanda jadi (ITJ) atau uang muka (DP) dari konsumen.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bone/60 border-b border-mist text-slate font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Jenis Pembayaran</th>
                  <th className="px-5 py-3">Nominal</th>
                  <th className="px-5 py-3">Admin Penerima</th>
                  <th className="px-5 py-3">Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {transaksi.pembayaran.map((bayar) => (
                  <tr
                    key={bayar.id}
                    className={`hover:bg-bone/30 transition-colors ${bayar.is_void ? "opacity-50 line-through bg-rose-50/30" : ""
                      }`}
                  >
                    {/* Tanggal */}
                    <td className="px-5 py-3.5 text-slate font-medium whitespace-nowrap">
                      {bayar.tgl_bayar ? formatDateOnly(bayar.tgl_bayar) : formatDate(bayar.created_at)}
                    </td>

                    {/* Jenis & Kwitansi */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getJenisBayarBadge(
                            bayar.jenis_pembayaran
                          )}`}
                        >
                          {bayar.jenis_pembayaran}
                        </span>
                        <span className="font-mono text-slate text-[11px]">
                          {bayar.no_kwitansi}
                        </span>
                        {bayar.is_void && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            VOID
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Nominal */}
                    <td className="px-5 py-3.5 font-mono font-bold text-carbon-ink whitespace-nowrap">
                      {formatCurrency(Number(bayar.nominal))}
                    </td>

                    {/* Admin Penerima */}
                    <td className="px-5 py-3.5 text-graphite whitespace-nowrap">
                      {bayar.penerima?.nama || "Admin"}
                    </td>

                    {/* Catatan / Keterangan */}
                    <td className="px-5 py-3.5 text-slate max-w-xs truncate">
                      {bayar.catatan || "-"}
                      {bayar.is_void && bayar.void_reason && (
                        <span className="block text-[11px] text-rose-600 italic mt-0.5">
                          Alasan Void: {bayar.void_reason}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── 4. DYNAMIC ACTION PANEL CARD ─── */}
      <DynamicActionPanel
        transaksiId={transaksi.id}
        leadId={transaksi.itj.lead_id}
        canEdit={canEdit}
        metodeBayar={transaksi.metode_bayar}
        kategoriUnit={transaksi.unit.tipe.kategori}
        statusPernikahan={transaksi.customer.status_pernikahan}
        statusPekerjaan={transaksi.customer.status_pekerjaan}
        currentStatus={transaksi.status_transaksi}
        currentTahapDetail={transaksi.tahap_detail}
        initialNotaris={transaksi.nama_notaris}
        initialTglAkad={
          transaksi.tgl_akad ? transaksi.tgl_akad.toISOString() : null
        }
        initialTglAjb={
          transaksi.tgl_akad ? transaksi.tgl_akad.toISOString() : null
        }
        initialTglBast={
          transaksi.tgl_bast ? transaksi.tgl_bast.toISOString() : null
        }
        initialLunasAt={
          transaksi.lunas_at ? transaksi.lunas_at.toISOString() : null
        }
        initialCatatan={transaksi.catatan_admin}
        initialVerifiedDocs={transaksi.dokumen
          .filter((d) => d.status === "TERVERIFIKASI")
          .map((d) => d.jenis)}
        initialInspeksiBast={transaksi.inspeksi_bast.map((b) => ({
          item: b.item,
          status: b.status,
          catatan: b.catatan,
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
  );
}
