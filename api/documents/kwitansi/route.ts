import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { generateKwitansiDocx } from "@/lib/kwitansi-generator";
import { formatTerbilangRupiah } from "@/lib/terbilang"; // Asumsi fungsi ini sudah kamu buat
import { format } from "date-fns";
import { id } from "date-fns/locale";

export async function GET(req: NextRequest) {
    try {
        // 1. Validasi Autentikasi
        const session = await auth();
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // 2. Ambil Parameter
        const { searchParams } = new URL(req.url);
        const transactionId = searchParams.get("transactionId");

        if (!transactionId) {
            return new NextResponse("Missing transactionId", { status: 400 });
        }

        // 3. Tarik Data dari Database
        const transaction = await prisma.bookingTransaction.findUnique({
            where: { id: transactionId },
            include: {
                customer: true,
                unit: {
                    include: {
                        project: true,
                        block: true,
                    }
                },
                payments: {
                    where: { paymentType: "ITJ" },
                    include: { receivedBy: true },
                    orderBy: { paymentDate: "desc" },
                    take: 1
                }
            }
        });

        if (!transaction) {
            return new NextResponse("Transaksi tidak ditemukan", { status: 404 });
        }

        // 4. Proses Logika Data
        const itjPayment = transaction.payments[0];

        // Ambil nominal ITJ (Prioritaskan dari tabel payment, fallback ke tabel transaksi)
        const itjAmount = Number(itjPayment?.amount || transaction.agreedItjAmount || 0);
        if (itjAmount === 0) {
            return new NextResponse("Nominal ITJ belum diset atau bernilai 0", { status: 400 });
        }

        // Format Nominal & Terbilang (Menggunakan Intl untuk format Rupiah yang lebih standar)
        const amountFormatted = `Rp ${new Intl.NumberFormat("id-ID").format(itjAmount)}`;
        const amountTerbilang = formatTerbilangRupiah(itjAmount);

        // Format Tanggal
        const paymentDateObj = itjPayment?.paymentDate || transaction.createdAt;
        const paymentDateStr = format(new Date(paymentDateObj), "dd MMMM yyyy", { locale: id });

        // Tentukan Instrumen Pembayaran
        const paymentInstrument = itjPayment?.paymentInstrument === "BANK_TRANSFER"
            ? "Transfer Bank"
            : "Tunai";

        // Tentukan Nama Admin (Prioritaskan yang menerima payment, fallback ke user session)
        const adminName = itjPayment?.receivedBy?.name || session.user.name || "Admin Keuangan";

        // Fallback Nomor Kwitansi (Sesuai format dokumen: SSS/NPKR.LMJ/KWT/07/...)
        const fallbackKwitansiNumber = `SSS/NPKR.LMJ/KWT/${format(new Date(paymentDateObj), "MM")}/...`;

        // 5. Generate Dokumen Docx
        // Note: Pastikan kamu menggunakan `await` jika fungsi docx-nya berbasis promise (meskipun Packer.toBuffer berjalan sync/async tergantung implementasi)
        const docxBuffer = await generateKwitansiDocx({
            kwitansiNumber: transaction.kwitansiNumber || fallbackKwitansiNumber,
            customerName: transaction.customer?.name || "-",
            amountFormatted,
            amountTerbilang,
            unitCode: transaction.unit?.code || "-",
            projectName: transaction.unit?.project?.name || "New Puri Kencana Regency",
            paymentDate: paymentDateStr,
            paymentInstrument,
            adminName,
        });

        // 6. Return response sebagai lampiran file (Attachment)
        const filename = `Kwitansi-ITJ-${transaction.unit?.code || "Unit"}.docx`;

        return new NextResponse(new Uint8Array(docxBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error: unknown) {
        console.error("Error generating kwitansi docx:", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal Server Error",
            { status: 500 }
        );
    }
}