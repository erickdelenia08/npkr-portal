import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { generateKwitansiDocx } from "@/lib/doc-generator/kwitansi-generator";
import { formatTerbilangRupiah } from "@/lib/doc-generator/terbilang";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Validasi Autentikasi
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 2. Ambil Parameter
    const { searchParams } = new URL(req.url);
    const transactionIdParam = searchParams.get("transactionId");
    const pembayaranIdParam = searchParams.get("pembayaranId");

    if (!transactionIdParam) {
      return new NextResponse("Parameter transactionId diperlukan", { status: 400 });
    }

    const transactionId = parseInt(transactionIdParam, 10);
    if (isNaN(transactionId)) {
      return new NextResponse("transactionId harus berupa angka", { status: 400 });
    }

    // 3. Tarik Data dari Database
    const transaction = await prisma.transaksi.findUnique({
      where: { id: transactionId },
      include: {
        customer: true,
        unit: {
          include: {
            tipe: true,
          },
        },
        itj: true,
        pembayaran: {
          where: { is_void: false },
          include: { penerima: true },
          orderBy: { tgl_bayar: "desc" },
        },
      },
    });

    if (!transaction) {
      return new NextResponse("Transaksi tidak ditemukan", { status: 404 });
    }

    // 4. Pilih Data Pembayaran
    let selectedPayment = null;
    if (pembayaranIdParam) {
      const pId = parseInt(pembayaranIdParam, 10);
      selectedPayment = transaction.pembayaran.find((p) => p.id === pId) || null;
    }

    if (!selectedPayment) {
      // Prioritaskan pembayaran ITJ, fallback ke pembayaran non-void pertama
      selectedPayment =
        transaction.pembayaran.find((p) => p.jenis_pembayaran === "ITJ") ||
        transaction.pembayaran[0] ||
        null;
    }

    // Ambil nominal ITJ/Pembayaran
    const nominal = selectedPayment
      ? Number(selectedPayment.nominal)
      : Number(transaction.target_itj || transaction.itj?.nominal || 0);

    if (!nominal || nominal <= 0) {
      return new NextResponse("Nominal pembayaran belum diset atau bernilai 0", { status: 400 });
    }

    // Format Nominal & Terbilang
    const amountFormatted = `Rp ${new Intl.NumberFormat("id-ID").format(nominal)}`;
    const amountTerbilang = formatTerbilangRupiah(nominal);

    // Format Tanggal
    const paymentDateObj =
      selectedPayment?.tgl_bayar ||
      transaction.itj?.diajukan_at ||
      transaction.created_at;
    const paymentDateStr = format(new Date(paymentDateObj), "dd MMMM yyyy", { locale: id });

    // Tentukan Instrumen Pembayaran
    const paymentInstrument = selectedPayment
      ? selectedPayment.cara_bayar === "TRANSFER"
        ? "Transfer Bank"
        : "Tunai"
      : transaction.itj?.metode_bayar === "KPR"
      ? "Transfer Bank"
      : "Tunai";

    // Tentukan Nama Admin
    const adminName =
      selectedPayment?.penerima?.nama || session.user.name || "Admin Keuangan";

    // Nomor Kwitansi
    const fallbackKwitansiNumber =
      selectedPayment?.no_kwitansi ||
      `SSS/NPKR.LMJ/KWT/${format(new Date(paymentDateObj), "MM")}/${transaction.id}`;

    // 5. Generate Dokumen Docx
    const docxBuffer = await generateKwitansiDocx({
      kwitansiNumber: fallbackKwitansiNumber,
      customerName: transaction.customer?.nama_ktp || "-",
      amountFormatted,
      amountTerbilang,
      unitCode: transaction.unit?.blok || "-",
      projectName: "New Puri Kencana Regency",
      paymentDate: paymentDateStr,
      paymentInstrument,
      adminName,
    });

    // 6. Return response sebagai lampiran file
    const filename = `Kwitansi-ITJ-${transaction.unit?.blok || "Unit"}.docx`;

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    console.error("Error generating kwitansi docx:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return new NextResponse(errorMessage, { status: 500 });
  }
}
