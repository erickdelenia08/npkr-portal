// import { Role } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
// import bcrypt from "bcryptjs";

// async function main() {
//     console.log("Memulai proses seeding...");

//     const saltRounds = 10;

//     const users = [
//         {
//             username: "nia",
//             nama: "Nia",
//             no_hp: "085895130517",
//             password: await bcrypt.hash("admin123", saltRounds),
//             role: Role.ADMIN,
//         },
//         {
//             username: "marketing",
//             nama: "Rigit",
//             no_hp: "089876543210",
//             password: await bcrypt.hash("marketing123", saltRounds),
//             role: Role.MARKETING,
//         },
//         {
//             username: "elin",
//             nama: "Elin",
//             no_hp: "08563157982",
//             password: await bcrypt.hash("manager123", saltRounds),
//             role: Role.MANAGER,
//         },
//         {
//             username: "manager",
//             nama: "Manager",
//             no_hp: "081234567891",
//             password: await bcrypt.hash("manager123", saltRounds),
//             role: Role.MANAGER,
//         },
//     ];

//     for (const user of users) {
//         await prisma.user.upsert({
//             where: {
//                 username: user.username,
//             },
//             update: {
//                 nama: user.nama,
//                 no_hp: user.no_hp,
//                 password: user.password,
//                 role: user.role,
//             },
//             create: user,
//         });

//         console.log(`User ${user.username} berhasil di-seed.`);
//     }

//     console.log("Seeding berhasil!");
// }

// main()
//     .then(async () => {
//         await prisma.$disconnect();
//     })
//     .catch(async (e) => {
//         console.error("Terjadi kesalahan saat seeding:", e);
//         await prisma.$disconnect();
//         process.exit(1);
//     });


import { KategoriUnit } from "../generated/prisma";

/**
 * Seed Master Tipe dan Master Unit New Puri Kencana.
 *
 * Lokasi file yang disarankan: prisma/seed-master-unit.ts
 * Import "../generated/prisma" mengikuti output generator pada schema.prisma.
 *
 * Aman dijalankan berulang kali:
 * - MasterTipe dicari berdasarkan kategori + luas bangunan + luas tanah.
 * - MasterUnit dicari berdasarkan kode blok.
 * - Status unit yang sudah ada TIDAK diubah.
 * - harga_khusus yang sudah ada TIDAK diubah.
 *
 * Harga yang belum diberikan:
 * - Kavling 84 m²: 0 (placeholder)
 * - Komersil 40/60: 0 (placeholder)
 */

type UnitSpec = {
    prefix: string;
    start: number;
    end: number;
    kategori: KategoriUnit;
    luasBangunan: number | null;
    luasTanah: number;
};

const HARGA = {
    SUBSIDI: "166000000",
    KOMERSIL_40_72: "280000000",
    KOMERSIL_36_72: "390000000",
    KAVLING_84: "50000000",
} as const;

const UNIT_SPECS: UnitSpec[] = [
    // A-B: Kavling 84 m²
    { prefix: "A", start: 1, end: 26, kategori: "KAVLING", luasBangunan: null, luasTanah: 84 },
    { prefix: "B", start: 1, end: 19, kategori: "KAVLING", luasBangunan: null, luasTanah: 84 },

    // C
    { prefix: "C", start: 1, end: 1, kategori: "KOMERSIL", luasBangunan: 36, luasTanah: 72 },
    { prefix: "C", start: 2, end: 27, kategori: "KOMERSIL", luasBangunan: 40, luasTanah: 72 },
    { prefix: "C", start: 28, end: 28, kategori: "KOMERSIL", luasBangunan: 36, luasTanah: 72 },

    // D
    { prefix: "D", start: 1, end: 1, kategori: "KOMERSIL", luasBangunan: 36, luasTanah: 72 },
    { prefix: "D", start: 2, end: 14, kategori: "KOMERSIL", luasBangunan: 40, luasTanah: 72 },
    { prefix: "D", start: 15, end: 15, kategori: "KOMERSIL", luasBangunan: 36, luasTanah: 72 },

    // E
    { prefix: "E", start: 1, end: 1, kategori: "KOMERSIL", luasBangunan: 36, luasTanah: 72 },
    { prefix: "E", start: 2, end: 14, kategori: "KOMERSIL", luasBangunan: 40, luasTanah: 72 },
    { prefix: "E", start: 15, end: 15, kategori: "KOMERSIL", luasBangunan: 36, luasTanah: 72 },

    // F
    { prefix: "F", start: 1, end: 7, kategori: "KOMERSIL", luasBangunan: 36, luasTanah: 72 },
    { prefix: "F", start: 8, end: 13, kategori: "SUBSIDI", luasBangunan: 30, luasTanah: 72 },
    { prefix: "F", start: 14, end: 16, kategori: "KOMERSIL", luasBangunan: 40, luasTanah: 72 },

    // G
    { prefix: "G", start: 1, end: 1, kategori: "KOMERSIL", luasBangunan: 40, luasTanah: 72 },
    { prefix: "G", start: 2, end: 13, kategori: "SUBSIDI", luasBangunan: 30, luasTanah: 72 },
    { prefix: "G", start: 14, end: 16, kategori: "KOMERSIL", luasBangunan: 40, luasTanah: 72 },

    // H
    { prefix: "H", start: 1, end: 1, kategori: "KOMERSIL", luasBangunan: 40, luasTanah: 72 },
    { prefix: "H", start: 2, end: 13, kategori: "SUBSIDI", luasBangunan: 30, luasTanah: 72 },
    { prefix: "H", start: 14, end: 16, kategori: "KOMERSIL", luasBangunan: 40, luasTanah: 72 },

    // I: I-1 sampai I-3 komersil, I-4 sampai I-11 subsidi
    { prefix: "I", start: 1, end: 3, kategori: "KOMERSIL", luasBangunan: 40, luasTanah: 72 },
    { prefix: "I", start: 4, end: 11, kategori: "SUBSIDI", luasBangunan: 30, luasTanah: 60 },

    // J
    { prefix: "J", start: 1, end: 11, kategori: "KOMERSIL", luasBangunan: 36, luasTanah: 72 },
    { prefix: "J", start: 12, end: 22, kategori: "SUBSIDI", luasBangunan: 30, luasTanah: 72 },

    // K
    { prefix: "K", start: 1, end: 8, kategori: "SUBSIDI", luasBangunan: 30, luasTanah: 72 },

    // L
    { prefix: "L", start: 1, end: 15, kategori: "KOMERSIL", luasBangunan: 36, luasTanah: 72 },
    { prefix: "L", start: 16, end: 30, kategori: "SUBSIDI", luasBangunan: 30, luasTanah: 60 },

    // M-R
    { prefix: "M", start: 1, end: 30, kategori: "SUBSIDI", luasBangunan: 30, luasTanah: 60 },
    { prefix: "N", start: 1, end: 28, kategori: "SUBSIDI", luasBangunan: 30, luasTanah: 60 },
    { prefix: "O", start: 1, end: 29, kategori: "SUBSIDI", luasBangunan: 30, luasTanah: 60 },
    { prefix: "P", start: 1, end: 17, kategori: "SUBSIDI", luasBangunan: 30, luasTanah: 60 },
    { prefix: "Q", start: 1, end: 18, kategori: "SUBSIDI", luasBangunan: 30, luasTanah: 60 },
    { prefix: "R", start: 1, end: 7, kategori: "KOMERSIL", luasBangunan: 40, luasTanah: 72 },
    { prefix: "R", start: 8, end: 20, kategori: "SUBSIDI", luasBangunan: 30, luasTanah: 60 },
];

function getHargaDasar(spec: UnitSpec): string {
    if (spec.kategori === "KAVLING") return HARGA.KAVLING_84;
    if (spec.kategori === "SUBSIDI") return HARGA.SUBSIDI;

    if (spec.luasBangunan === 36 && spec.luasTanah === 72) {
        return HARGA.KOMERSIL_36_72;
    }

    if (spec.luasBangunan === 40 && spec.luasTanah === 72) {
        return HARGA.KOMERSIL_40_72;
    }

    throw new Error(
        `Harga dasar belum dipetakan untuk ${spec.kategori} ${spec.luasBangunan}/${spec.luasTanah}`,
    );
}

function getNamaTipe(spec: UnitSpec): string {
    if (spec.kategori === "KAVLING") return `Kavling ${spec.luasTanah}`;
    return `${spec.kategori === "SUBSIDI" ? "Subsidi" : "Komersil"} ${spec.luasBangunan}/${spec.luasTanah}`;
}

async function main() {
    const tipeIdByKey = new Map<string, number>();

    // Buat atau perbarui MasterTipe terlebih dahulu.
    for (const spec of UNIT_SPECS) {
        const key = `${spec.kategori}-${spec.luasBangunan ?? "NULL"}-${spec.luasTanah}`;
        if (tipeIdByKey.has(key)) continue;

        const existingTipe = await prisma.masterTipe.findFirst({
            where: {
                kategori: spec.kategori,
                luas_bangunan: spec.luasBangunan,
                luas_tanah: spec.luasTanah,
            },
        });

        const tipeData = {
            nama_tipe: getNamaTipe(spec),
            kategori: spec.kategori,
            luas_bangunan: spec.luasBangunan,
            luas_tanah: spec.luasTanah,
            harga_dasar: getHargaDasar(spec),
        };

        const tipe = existingTipe
            ? await prisma.masterTipe.update({
                where: { id: existingTipe.id },
                data: tipeData,
            })
            : await prisma.masterTipe.create({ data: tipeData });

        tipeIdByKey.set(key, tipe.id);
    }

    // Buat atau sinkronkan unit. Status unit existing sengaja tidak disentuh.
    let created = 0;
    let updated = 0;

    for (const spec of UNIT_SPECS) {
        const key = `${spec.kategori}-${spec.luasBangunan ?? "NULL"}-${spec.luasTanah}`;
        const tipeId = tipeIdByKey.get(key);

        if (!tipeId) {
            throw new Error(`Master tipe tidak ditemukan untuk ${key}`);
        }

        for (let nomor = spec.start; nomor <= spec.end; nomor++) {
            const blok = `${spec.prefix}-${nomor}`;
            const existingUnit = await prisma.masterUnit.findUnique({
                where: { blok },
            });

            const unitData = {
                tipe_id: tipeId,
                blok_prefix: spec.prefix,
                blok_nomor: nomor,
            };

            if (existingUnit) {
                await prisma.masterUnit.update({
                    where: { id: existingUnit.id },
                    data: unitData,
                });
                updated++;
            } else {
                await prisma.masterUnit.create({
                    data: {
                        ...unitData,
                        blok,
                        // status_unit mengikuti default schema: AVAILABLE
                    },
                });
                created++;
            }
        }
    }

    const total = UNIT_SPECS.reduce(
        (sum, spec) => sum + (spec.end - spec.start + 1),
        0,
    );

    console.log("Seed Master Unit selesai.");
    console.log(`Total unit pada konfigurasi: ${total}`);
    console.log(`Unit baru dibuat: ${created}`);
    console.log(`Unit existing disinkronkan: ${updated}`);
    console.log(`Master tipe digunakan: ${tipeIdByKey.size}`);
    console.log(
        "Catatan: harga Kavling 84 dan Komersil 40/60 masih 0 (placeholder).",
    );
}

main()
    .catch((error) => {
        console.error("Seed Master Unit gagal:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
