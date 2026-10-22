import {
    AlignmentType,
    BorderStyle,
    Document,
    ExternalHyperlink,
    HeightRule,
    HorizontalPositionRelativeFrom,
    ImageRun,
    LeaderType,
    Packer,
    Paragraph,
    Table,
    TableLayoutType,
    TableRow,
    TableCell,
    TabStopType,
    TextRun,
    TextWrappingType,
    VerticalPositionRelativeFrom,
    WidthType,
} from "docx";
import {
    CHECKBOX_CENTANG_B64,
    CHECKBOX_KOSONG_B64,
    KOTAK_PARAF_B64,
    LOGO_PERUSAHAAN_B64,
    LOGO_PROYEK_B64,
} from "@/lib/spr-assets";

export interface SprDocxData {
    sprNumber: string;
    dateFormatted: string;

    customerName: string;
    customerNik: string;
    customerTtl: string;
    customerAddress: string;
    customerPhone: string;

    projectName: string;
    /** Nama blok, mis. "G" atau "Blok G" (prefix "Blok" otomatis dibuang) */
    blockName: string;
    unitNumber: string | number;
    landArea: string;
    buildingArea: string;
    /** Menentukan kotak mana yang dicentang. null = dua-duanya kosong (diisi manual). */
    housingType: "SUBSIDI" | "KOMERSIL" | null;

    agreedPriceFormatted: string;
    dpFormatted: string;
    kprFormatted: string;
    /** Angka tenor dalam bulan, mis. "240". Pakai "-" bila tidak ada. */
    tenor: string;
}

// ---- Konstanta layout (diambil dari dokumen asli, satuan twip) ----
const PAGE = { width: 11910, height: 16840 }; // A4
const MARGIN = { top: 80, right: 425, bottom: 280, left: 992 };
const BODY_INDENT = 448; // BodyText: ind left
const COLON_TAB = 2608; // posisi ":" pada baris data
const VALUE_X = 2800; // posisi awal nilai (juga posisi baris sambungan)

const DEVELOPER_NAME = "PT. Simanduta Surya Sentosa";
const COMPANY_EMAIL = "simandutasuryasentosa.adm@gmail.com";

const img = (b64: string) => Buffer.from(b64, "base64");

/** "Blok G" -> "G" supaya hasilnya "G-8", bukan "Blok G-8" */
function cleanBlock(name: string): string {
    return name.replace(/^\s*blok\s+/i, "").trim();
}

/** Satu baris "Label  :  Nilai" dengan hanging indent supaya nilai panjang (alamat) rapi. */
function dataRow(label: string, value: string, before = 41): Paragraph {
    return new Paragraph({
        spacing: { before },
        indent: { left: VALUE_X, hanging: VALUE_X - BODY_INDENT },
        tabStops: [
            { type: TabStopType.LEFT, position: COLON_TAB },
            { type: TabStopType.LEFT, position: VALUE_X },
        ],
        children: [
            new TextRun(label),
            new TextRun({ children: ["\t", ":", "\t"] }),
            new TextRun(value),
        ],
    });
}

function blank(before = 0, left = BODY_INDENT): Paragraph {
    return new Paragraph({ spacing: { before }, indent: { left }, children: [] });
}

function checkbox(checked: boolean): ImageRun {
    return new ImageRun({
        type: "png",
        data: img(checked ? CHECKBOX_CENTANG_B64 : CHECKBOX_KOSONG_B64),
        transformation: { width: 19, height: 16 },
        altText: { name: "checkbox", title: "checkbox", description: checked ? "dicentang" : "kosong" },
    });
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = {
    top: NO_BORDER,
    bottom: NO_BORDER,
    left: NO_BORDER,
    right: NO_BORDER,
};

function signatureTable(): Table {
    const LEFT_W = 4808;
    const RIGHT_W = 5034;

    const emptyLines = (n: number) =>
        Array.from({ length: n }, () => new Paragraph({ children: [] }));

    const leftCell = new TableCell({
        width: { size: LEFT_W, type: WidthType.DXA },
        borders: NO_BORDERS,
        margins: { left: 0, right: 0 },
        children: [
            new Paragraph({
                indent: { left: 923 },
                children: [new TextRun({ text: "Pembeli", bold: true })],
            }),
            ...emptyLines(7),
            new Paragraph({
                indent: { left: 50 },
                tabStops: [{ type: TabStopType.LEFT, position: 2818, leader: LeaderType.DOT }],
                children: [new TextRun({ children: ["(", "\t", ")"], bold: true })],
            }),
        ],
    });

    const rightCell = new TableCell({
        width: { size: RIGHT_W, type: WidthType.DXA },
        borders: NO_BORDERS,
        margins: { left: 0, right: 0 },
        children: [
            new Paragraph({
                indent: { left: 1920 },
                children: [new TextRun({ text: "PT. SIMANDUTA SURYA SENTOSA", bold: true })],
            }),
            ...emptyLines(7),
            new Paragraph({
                indent: { left: 2107 },
                tabStops: [{ type: TabStopType.LEFT, position: 4876, leader: LeaderType.DOT }],
                children: [new TextRun({ children: ["(", "\t", ")"], bold: true })],
            }),
        ],
    });

    return new Table({
        width: { size: LEFT_W + RIGHT_W, type: WidthType.DXA },
        columnWidths: [LEFT_W, RIGHT_W],
        layout: TableLayoutType.FIXED,
        indent: { size: 593, type: WidthType.DXA },
        borders: {
            ...NO_BORDERS,
            insideHorizontal: NO_BORDER,
            insideVertical: NO_BORDER,
        },
        rows: [
            new TableRow({
                height: { value: 2383, rule: HeightRule.ATLEAST },
                children: [leftCell, rightCell],
            }),
        ],
    });
}

export async function generateSprDocx(data: SprDocxData): Promise<Buffer> {
    const blokUnit = data.unitNumber
        ? `${cleanBlock(data.blockName)}-${data.unitNumber}`
        : cleanBlock(data.blockName);
    const tenorText = data.tenor && data.tenor !== "-" ? `${data.tenor} Bulan` : "-";
    const lbLt = `${data.buildingArea}/${data.landArea}`;

    const FOOT_INDENT = 6209;
    const FOOT_SIZE = 18; // 9pt

    const children = [
        // ===== Logo (kiri: perusahaan, kanan: proyek) =====
        new Paragraph({
            indent: { left: 56 },
            tabStops: [{ type: TabStopType.LEFT, position: 7906 }],
            children: [
                new ImageRun({
                    type: "png",
                    data: img(LOGO_PERUSAHAAN_B64),
                    transformation: { width: 108, height: 106 },
                    altText: { name: "logo-perusahaan", title: "Logo PT Simanduta Surya Sentosa", description: "Logo perusahaan" },
                }),
                new TextRun({ text: "\t", font: "Times New Roman", size: 20 }),
                new ImageRun({
                    type: "jpg",
                    data: img(LOGO_PROYEK_B64),
                    transformation: { width: 162, height: 134 },
                    altText: { name: "logo-proyek", title: "Logo New Puri Kencana Regency", description: "Logo proyek perumahan" },
                }),
            ],
        }),

        // ===== Judul =====
        new Paragraph({
            alignment: AlignmentType.CENTER,
            indent: { right: 566 },
            children: [new TextRun({ text: "SURAT PEMESANAN RUMAH", bold: true })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 31 },
            indent: { right: 566 },
            children: [new TextRun({ text: `Nomor SPR : ${data.sprNumber}`, bold: true })],
        }),

        blank(),
        blank(120),

        // ===== Data pembeli =====
        dataRow("Nama Lengkap", data.customerName, 1),
        dataRow("No. KTP", data.customerNik),
        dataRow("Alamat", data.customerAddress),
        dataRow("Tempat/Tanggal Lahir", data.customerTtl),
        dataRow("No. Telepon", data.customerPhone),

        blank(80),

        // ===== Data rumah =====
        new Paragraph({
            indent: { left: BODY_INDENT },
            children: [new TextRun("Dengan Ini Membeli Rumah :")],
        }),
        dataRow("Nama Developer", DEVELOPER_NAME),
        dataRow("Nama Perumahan", data.projectName),
        dataRow("Blok / Nomor Unit", blokUnit),

        new Paragraph({
            spacing: { before: 41 },
            indent: { left: BODY_INDENT },
            tabStops: [{ type: TabStopType.LEFT, position: 2224 }],
            children: [
                checkbox(data.housingType === "SUBSIDI"),
                new TextRun(" Subsidi"),
                new TextRun("\t"),
                checkbox(data.housingType === "KOMERSIL"),
                new TextRun(" Komersil"),
            ],
        }),

        dataRow("LB/LT", lbLt),
        dataRow("Harga Jual Rumah", data.agreedPriceFormatted),
        dataRow("DP", data.dpFormatted),
        dataRow("Plafond KPR", data.kprFormatted),
        dataRow("Tenor", tenorText),

        blank(41),
        blank(41),

        // ===== Pernyataan =====
        new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 276 },
            indent: { left: 0, right: 1010 },
            children: [
                new TextRun(
                    `Dengan ditandatangani Surat Pemesanan ini, maka pembeli bersedia memenuhi segala peraturan dan atau persyaratan dan atau ketentuan yang ditetapkan oleh ${DEVELOPER_NAME} selaku penjual.`
                ),
            ],
        }),

        blank(41, 0),

        new Paragraph({
            indent: { left: BODY_INDENT },
            children: [new TextRun(`Lumajang, ${data.dateFormatted}`)],
        }),

        blank(148, 0),

        // ===== Tanda tangan =====
        signatureTable(),

        blank(0, 0),
        blank(0, 0),
        blank(0, 0),
        blank(0, 0),
        blank(159, 0),

        // ===== Footer alamat kantor + kotak paraf =====
        new Paragraph({
            indent: { left: FOOT_INDENT },
            children: [
                new TextRun({ text: "PT. SIMANDUTA SURYA SENTOSA", bold: true, size: FOOT_SIZE }),
            ],
        }),
        new Paragraph({
            spacing: { before: 1 },
            indent: { left: FOOT_INDENT },
            children: [new TextRun({ text: "Kantor Lumajang", size: FOOT_SIZE })],
        }),
        new Paragraph({
            spacing: { before: 33, line: 276 },
            indent: { left: FOOT_INDENT, right: 847 },
            children: [
                // Kotak "Paraf" mengambang di kiri bawah, sama seperti dokumen asli
                new ImageRun({
                    type: "png",
                    data: img(KOTAK_PARAF_B64),
                    transformation: { width: 134, height: 29.5 },
                    floating: {
                        horizontalPosition: {
                            relative: HorizontalPositionRelativeFrom.PAGE,
                            offset: 922655,
                        },
                        verticalPosition: {
                            relative: VerticalPositionRelativeFrom.PARAGRAPH,
                            offset: 176652,
                        },
                        wrap: { type: TextWrappingType.NONE },
                        allowOverlap: true,
                    },
                    altText: { name: "kotak-paraf", title: "Kotak paraf", description: "Kotak paraf" },
                }),
                new TextRun({
                    text: "Jalan Pd. Kobong Dusun Pepe Desa Sidorejo Kec. Rowokangkung \u2013 Lumajang 67359 ",
                    size: FOOT_SIZE,
                }),
                new ExternalHyperlink({
                    link: `mailto:${COMPANY_EMAIL}`,
                    children: [
                        new TextRun({
                            text: COMPANY_EMAIL,
                            size: FOOT_SIZE,
                            color: "0462C1",
                            underline: {},
                        }),
                    ],
                }),
            ],
        }),
    ];

    const doc = new Document({
        creator: "PT. Simanduta Surya Sentosa",
        title: `Surat Pemesanan Rumah ${data.sprNumber}`,
        styles: {
            default: {
                document: { run: { font: "Calibri", size: 22 } },
            },
        },
        sections: [
            {
                properties: {
                    page: {
                        size: PAGE,
                        margin: { ...MARGIN, header: 720, footer: 720, gutter: 0 },
                    },
                },
                children,
            },
        ],
    });

    return Packer.toBuffer(doc);
}




