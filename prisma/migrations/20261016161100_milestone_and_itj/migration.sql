-- AlterTable
ALTER TABLE `lead` DROP COLUMN `tahap`,
    ADD COLUMN `closing_at` DATETIME(3) NULL,
    ADD COLUMN `lost_at` DATETIME(3) NULL,
    ADD COLUMN `lost_reason` TEXT NULL,
    ADD COLUMN `survei_jadwal_at` DATETIME(3) NULL,
    ADD COLUMN `survei_selesai_at` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `Itj` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `status` ENUM('DIAJUKAN', 'PERLU_REVISI', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'DIAJUKAN',
    `nik` VARCHAR(191) NOT NULL,
    `nama_ktp` VARCHAR(191) NOT NULL,
    `nominal` DECIMAL(15, 2) NOT NULL,
    `target_dp` DECIMAL(15, 2) NOT NULL,
    `metode_bayar` ENUM('KPR', 'CASH_KERAS', 'CASH_TEMPO') NOT NULL,
    `tenor` INTEGER NULL,
    `diajukan_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `diputuskan_at` DATETIME(3) NULL,
    `diputuskan_oleh` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItjReview` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `itj_id` INTEGER NOT NULL,
    `reviewer_id` INTEGER NOT NULL,
    `keputusan` ENUM('DIAJUKAN', 'PERLU_REVISI', 'DISETUJUI', 'DITOLAK') NOT NULL,
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Itj` ADD CONSTRAINT `Itj_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Itj` ADD CONSTRAINT `Itj_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `MasterUnit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Itj` ADD CONSTRAINT `Itj_diputuskan_oleh_fkey` FOREIGN KEY (`diputuskan_oleh`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItjReview` ADD CONSTRAINT `ItjReview_itj_id_fkey` FOREIGN KEY (`itj_id`) REFERENCES `Itj`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItjReview` ADD CONSTRAINT `ItjReview_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
