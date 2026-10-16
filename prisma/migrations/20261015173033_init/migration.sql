-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `no_hp` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('MARKETING', 'ADMIN', 'MANAGER') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_no_hp_key`(`no_hp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MasterTipe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama_tipe` VARCHAR(191) NOT NULL,
    `kategori` ENUM('SUBSIDI', 'KOMERSIL', 'KAVLING') NOT NULL,
    `luas_bangunan` INTEGER NULL,
    `luas_tanah` INTEGER NOT NULL,
    `harga_dasar` DECIMAL(15, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MasterUnit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipe_id` INTEGER NOT NULL,
    `blok` VARCHAR(191) NOT NULL,
    `status_unit` ENUM('AVAILABLE', 'HOLD', 'SOLD') NOT NULL DEFAULT 'AVAILABLE',
    `harga_khusus` DECIMAL(15, 2) NULL,

    UNIQUE INDEX `MasterUnit_blok_key`(`blok`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lead` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `marketing_id` INTEGER NULL,
    `nama` VARCHAR(191) NOT NULL,
    `no_hp` VARCHAR(191) NOT NULL,
    `sumber` VARCHAR(191) NOT NULL,
    `minat_tipe` VARCHAR(191) NULL,
    `tahap` ENUM('BARU', 'FOLLOW_UP', 'SURVEI_DIJADWALKAN', 'SUDAH_SURVEI', 'ITJ', 'TERTUNDA', 'LOST') NOT NULL DEFAULT 'BARU',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Lead_no_hp_key`(`no_hp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Aktivitas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `jenis` ENUM('TELEPON', 'WHATSAPP', 'BERTEMU', 'SURVEI_LOKASI', 'LAINNYA') NOT NULL,
    `hasil` ENUM('TERTARIK', 'MASIH_MIKIR', 'TIDAK_DIJAWAB', 'MINTA_INFO_LAGI', 'TIDAK_JADI') NOT NULL,
    `catatan` TEXT NULL,
    `tgl_follow_up` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `nama_ktp` VARCHAR(191) NOT NULL,
    `nik` VARCHAR(191) NOT NULL,
    `tempat_lahir` VARCHAR(191) NOT NULL,
    `tgl_lahir` DATETIME(3) NOT NULL,
    `alamat_ktp` TEXT NOT NULL,
    `no_hp` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_lead_id_key`(`lead_id`),
    UNIQUE INDEX `Customer_nik_key`(`nik`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaksi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `marketing_id` INTEGER NOT NULL,
    `metode_bayar` ENUM('KPR', 'CASH_KERAS', 'CASH_TEMPO') NOT NULL,
    `harga_deal` DECIMAL(15, 2) NOT NULL,
    `target_itj` DECIMAL(15, 2) NOT NULL,
    `target_dp` DECIMAL(15, 2) NOT NULL,
    `tenor_bulan` INTEGER NULL,
    `status_transaksi` VARCHAR(191) NOT NULL,
    `nama_bank` VARCHAR(191) NULL,
    `nama_notaris` VARCHAR(191) NULL,
    `tgl_akad` DATETIME(3) NULL,
    `tgl_bast` DATETIME(3) NULL,
    `catatan_admin` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pembayaran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaksi_id` INTEGER NOT NULL,
    `admin_id` INTEGER NOT NULL,
    `jenis_pembayaran` ENUM('ITJ', 'DP', 'CICILAN', 'PELUNASAN') NOT NULL,
    `nominal` DECIMAL(15, 2) NOT NULL,
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MasterUnit` ADD CONSTRAINT `MasterUnit_tipe_id_fkey` FOREIGN KEY (`tipe_id`) REFERENCES `MasterTipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_marketing_id_fkey` FOREIGN KEY (`marketing_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Aktivitas` ADD CONSTRAINT `Aktivitas_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaksi` ADD CONSTRAINT `Transaksi_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaksi` ADD CONSTRAINT `Transaksi_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `MasterUnit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaksi` ADD CONSTRAINT `Transaksi_marketing_id_fkey` FOREIGN KEY (`marketing_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `Transaksi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
