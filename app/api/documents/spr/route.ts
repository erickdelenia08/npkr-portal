import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { generateSprDocx } from "@/lib/doc-generator/docx-generator";
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

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const transactionIdParam = searchParams.get("transactionId");

    if (!transactionIdParam) {
      return new NextResponse("Parameter transactionId diperlukan", { status: 400 });
    }

    const transactionId = parseInt(transactionIdParam, 10);
    if (isNaN(transactionId)) {
      return new NextResponse("transactionId harus berupa angka", { status: 400 });
    }

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
      },
    });

    if (!transaction) {
      return new NextResponse("Transaksi tidak ditemukan", { status: 404 });
    }

    const { customer, unit, itj } = transaction;

    // Tempat/Tanggal Lahir -> "Jember, 12-06-2001"
    let customerTtl = "-";
    if (customer.tempat_lahir || customer.tgl_lahir) {
      const place = customer.tempat_lahir || "";
      const date = customer.tgl_lahir
        ? format(new Date(customer.tgl_lahir), "dd-MM-yyyy")
        : "";
      customerTtl = place && date ? `${place}, ${date}` : place || date || "-";
    }

    // Tanggal surat -> "04 Agustus 2026"
    const dateFormatted = format(new Date(transaction.created_at), "dd MMMM yyyy", { locale: id });

    // Fallback nomor SPR
    const fallbackSprNumber = `SSS/NPKR/LMJ/${format(new Date(transaction.created_at), "MM/yyyy")}/${transaction.id}`;

    // Parsing blok & nomor unit
    let blockName = unit.blok;
    let unitNumber: string | number = "";
    if (unit.blok.includes("-")) {
      const parts = unit.blok.split("-");
      blockName = parts[0];
      unitNumber = parts.slice(1).join("-");
    }

    // Housing Type (SUBSIDI / KOMERSIL / null)
    const housingType: "SUBSIDI" | "KOMERSIL" | null =
      unit.tipe.kategori === "SUBSIDI"
        ? "SUBSIDI"
        : unit.tipe.kategori === "KOMERSIL"
        ? "KOMERSIL"
        : null;

    // Plafond KPR kalkulasi
    let kprFormatted = "-";
    if (transaction.metode_bayar === "KPR") {
      const kprNominal = Number(transaction.harga_deal) - Number(transaction.target_dp);
      kprFormatted = formatRupiah(kprNominal > 0 ? kprNominal : 0);
    }

    const tenor = transaction.tenor_bulan
      ? String(transaction.tenor_bulan)
      : itj?.tenor
      ? String(itj.tenor)
      : "-";

    const docxBuffer = await generateSprDocx({
      sprNumber: fallbackSprNumber,
      dateFormatted,

      customerName: customer.nama_ktp,
      customerNik: customer.nik || "-",
      customerTtl,
      customerAddress: customer.alamat_ktp || "-",
      customerPhone: customer.no_hp || "-",

      projectName: "New Puri Kencana Regency",
      blockName,
      unitNumber,
      landArea: formatArea(unit.tipe.luas_tanah),
      buildingArea: formatArea(unit.tipe.luas_bangunan),
      housingType,

      agreedPriceFormatted: formatRupiah(transaction.harga_deal),
      dpFormatted: formatRupiah(transaction.target_dp),
      kprFormatted,
      tenor,
    });

    const filename = `SPR-${unit.blok}.docx`;

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
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return new NextResponse(errorMessage, { status: 500 });
  }
}
