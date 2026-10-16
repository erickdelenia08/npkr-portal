import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { generateSprDocx } from "@/lib/docx-generator";
import { format } from "date-fns";
import { id } from "date-fns/locale";

/** 166000000 -> "Rp. 166.000.000" (format sesuai dokumen SPR). Nilai 0/kosong -> "-" */
function formatRupiah(value: unknown): string {
    const n = Math.round(Number(value ?? 0));
    if (!n) return "-";
    return `Rp. ${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** Angka luas: 36, "36.00" -> "36"; 36.5 -> "36.5" */
function formatArea(value: unknown): string {
    if (value === null || value === undefined || value === "") return "-";
    const n = Number(value);
    return Number.isFinite(n) ? String(n) : String(value);
}

/**
 * Tentukan kotak Subsidi / Komersil.
 * Sesuaikan dengan field yang benar di schema kamu (mis. kategori produk / tipe unit).
 * Kalau tidak terdeteksi -> null (dua kotak dibiarkan kosong, bisa dicentang manual).
 */
function detectHousingType(...sources: Array<string | null | undefined>): "SUBSIDI" | "KOMERSIL" | null {
    const text = sources.filter(Boolean).join(" ").toLowerCase();
    if (text.includes("subsidi")) return "SUBSIDI";
    if (text.includes("komersil") || text.includes("komersial")) return "KOMERSIL";
    return null;
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const transactionId = searchParams.get("transactionId");

        if (!transactionId) {
            return new NextResponse("Missing transactionId", { status: 400 });
        }

        const transaction = await prisma.bookingTransaction.findUnique({
            where: { id: transactionId },
            include: {
                customer: true,
                unit: {
                    include: {
                        project: true,
                        block: true,
                        unitType: true,
                    },
                },
            },
        });

        if (!transaction) {
            return new NextResponse("Transaksi tidak ditemukan", { status: 404 });
        }

        const { customer, unit } = transaction;

        // Tempat/Tanggal Lahir -> "Jember, 12-06-2001"
        let customerTtl = "-";
        if (customer.birthPlace || customer.birthDate) {
            const place = customer.birthPlace || "";
            const date = customer.birthDate
                ? format(new Date(customer.birthDate), "dd-MM-yyyy")
                : "";
            customerTtl = place && date ? `${place}, ${date}` : place || date || "-";
        }

        // Tanggal surat -> "04 Agustus 2026"
        const dateFormatted = format(new Date(transaction.createdAt), "dd MMMM yyyy", { locale: id });

        // Fallback nomor SPR (dikosongkan pada bagian urut agar diisi manual, bukan angka palsu)
        const fallbackSprNumber = `SSS/NPKR/LMJ/${format(new Date(transaction.createdAt), "MM/yyyy")}/....`;

        const docxBuffer = await generateSprDocx({
            sprNumber: transaction.sprNumber || fallbackSprNumber,
            dateFormatted,

            customerName: customer.name,
            customerNik: customer.nik || "-",
            customerTtl,
            customerAddress: customer.address || "-",
            customerPhone: customer.phone || "-",

            projectName: unit.project.name,
            blockName: unit.block.name,
            unitNumber: unit.number,
            landArea: formatArea(unit.landArea || unit.unitType.landArea),
            buildingArea: formatArea(unit.buildingArea || unit.unitType.buildingArea),
            housingType: detectHousingType(unit.unitType.name, transaction.purchaseScheme),

            agreedPriceFormatted: formatRupiah(transaction.agreedPrice),
            dpFormatted: formatRupiah(transaction.dpAmount),
            kprFormatted: formatRupiah(transaction.plafondKpr),
            tenor: transaction.tenor ? String(transaction.tenor) : "-",
        });

        const filename = `SPR-${unit.code}.docx`;

        return new NextResponse(new Uint8Array(docxBuffer), {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error: unknown) {
        console.error("Error generating SPR docx:", error);
        return new NextResponse(
            error instanceof Error ? error.message : "Internal Server Error",
            { status: 500 }
        );
    }
}