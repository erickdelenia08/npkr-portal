import {
    AlignmentType,
    BorderStyle,
    Document,
    ImageRun,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TabStopType,
    TextRun,
    VerticalAlign,
    WidthType,
} from "docx";
import { LOGO_PERUSAHAAN_B64, LOGO_PROYEK_B64 } from "@/lib/spr-assets";

export interface KwitansiDocxData {
    kwitansiNumber: string;
    customerName: string;
    amountFormatted: string;
    amountTerbilang: string;
    unitCode: string;
    projectName: string;
    paymentDate: string;
    paymentInstrument: string;
    adminName: string;
}

// ---- Konstanta Layout ----
const PAGE = { width: 11910, height: 16840 }; // A4
const MARGIN = { top: 720, right: 720, bottom: 720, left: 720 };
const COLON_TAB = 2800;
const VALUE_TAB = 3000;

const COMPANY_NAME = "PT. SIMANDUTA SURYA SENTOSA";
const COMPANY_ADDRESS = "JL. Pd Kobong Dusun Pepe Desa Sidorejo ROWOKANGKUNG, LUMAJANG 67359";
const COMPANY_PHONE = "TELP. 082333377053";

const img = (b64: string) => Buffer.from(b64, "base64");

function blankLine(size: number = 200): Paragraph {
    return new Paragraph({ spacing: { before: size }, children: [] });
}

function dataRow(label: string, value: string, isBold: boolean = false, isItalic: boolean = false): Paragraph {
    return new Paragraph({
        spacing: { before: 120, after: 120 },
        tabStops: [
            { type: TabStopType.LEFT, position: COLON_TAB },
            { type: TabStopType.LEFT, position: VALUE_TAB },
        ],
        children: [
            new TextRun({ text: label, size: 24 }),
            new TextRun({ text: "\t:\t", size: 24 }),
            new TextRun({ text: value, size: 24, bold: isBold, italics: isItalic }),
        ],
    });
}

function createHeader(showProjectLogo: boolean): Table {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 15, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                            new Paragraph({
                                children: [
                                    new ImageRun({
                                        type: "png",
                                        data: img(LOGO_PERUSAHAAN_B64),
                                        transformation: { width: 80, height: 78 },
                                    }),
                                ],
                            }),
                        ],
                    }),
                    new TableCell({
                        width: { size: showProjectLogo ? 70 : 85, type: WidthType.PERCENTAGE },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: "KWITANSI", bold: true, size: 36, underline: {} })],
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 60 },
                                children: [new TextRun({ text: COMPANY_NAME, bold: true, size: 28 })],
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: COMPANY_ADDRESS, size: 20 })],
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: COMPANY_PHONE, size: 20 })],
                            }),
                        ],
                    }),
                    ...(showProjectLogo
                        ? [
                            new TableCell({
                                width: { size: 15, type: WidthType.PERCENTAGE },
                                verticalAlign: VerticalAlign.CENTER,
                                children: [
                                    new Paragraph({
                                        alignment: AlignmentType.RIGHT,
                                        children: [
                                            new ImageRun({
                                                type: "jpg",
                                                data: img(LOGO_PROYEK_B64),
                                                transformation: { width: 100, height: 83 },
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ]
                        : []),
                ],
            }),
        ],
    });
}

function createSignatures(customerName: string, adminName: string, paymentDate: string): Table {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: " ", size: 24 })] }),
                            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Pembayar,", size: 24 })] }),
                            blankLine(800),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: `( ${customerName} )`, bold: true, size: 24 })],
                            }),
                        ],
                    }),
                    new TableCell({
                        width: { size: 50, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: `Lumajang, ${paymentDate}`, size: 24 })],
                            }),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: COMPANY_NAME, size: 24 })],
                            }),
                            blankLine(800),
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [new TextRun({ text: `( ${adminName} )`, bold: true, size: 24 })],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
}

function buildKwitansiSection(data: KwitansiDocxData, isCopy: boolean) {
    return [
        createHeader(isCopy),
        blankLine(300),
        new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: `Nomor : ${data.kwitansiNumber}`, bold: true, size: 24 })],
        }),
        blankLine(200),
        dataRow("Telah diterima dari", data.customerName, true),
        dataRow("Sejumlah uang", data.amountFormatted, true),
        dataRow("Untuk pembayaran", `Tanda Jadi Unit Blok ${data.unitCode} (${data.paymentInstrument})`),
        dataRow("Terbilang", `${data.amountTerbilang} Rupiah`, true, true),
        blankLine(400),
        createSignatures(data.customerName, data.adminName, data.paymentDate),
    ];
}

export async function generateKwitansiDocx(data: KwitansiDocxData): Promise<Buffer> {
    const doc = new Document({
        creator: COMPANY_NAME,
        title: `Kwitansi ${data.kwitansiNumber}`,
        styles: {
            default: {
                document: { run: { font: "Calibri", size: 24 } },
            },
        },
        sections: [
            {
                properties: {
                    page: {
                        size: PAGE,
                        margin: MARGIN,
                    },
                },
                children: [
                    // --- Bagian Atas (Lembar Asli) ---
                    ...buildKwitansiSection(data, false),

                    blankLine(400),
                    // Garis Potong (Dashed Line)
                    new Paragraph({
                        border: {
                            bottom: { color: "000000", space: 1, style: BorderStyle.DASHED, size: 6 },
                        },
                        children: [],
                    }),
                    blankLine(400),

                    // --- Bagian Bawah (Lembar Copy/Arsip) ---
                    ...buildKwitansiSection(data, true),
                ],
            },
        ],
    });

    return Packer.toBuffer(doc);
}