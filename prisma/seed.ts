import { Role } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
    console.log("Memulai proses seeding...");

    const saltRounds = 10;

    const users = [
        {
            username: "admin",
            nama: "Ahmad Faisal",
            no_hp: "081234567890",
            password: await bcrypt.hash("admin123", saltRounds),
            role: Role.ADMIN,
        },
        {
            username: "marketing",
            nama: "Budi Darmawan",
            no_hp: "089876543210",
            password: await bcrypt.hash("marketing123", saltRounds),
            role: Role.MARKETING,
        },
        {
            username: "manager",
            nama: "Manager",
            no_hp: "081234567891",
            password: await bcrypt.hash("manager123", saltRounds),
            role: Role.MANAGER,
        },
    ];

    for (const user of users) {
        await prisma.user.upsert({
            where: {
                username: user.username,
            },
            update: {
                nama: user.nama,
                no_hp: user.no_hp,
                password: user.password,
                role: user.role,
            },
            create: user,
        });

        console.log(`User ${user.username} berhasil di-seed.`);
    }

    console.log("Seeding berhasil!");
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error("Terjadi kesalahan saat seeding:", e);
        await prisma.$disconnect();
        process.exit(1);
    });