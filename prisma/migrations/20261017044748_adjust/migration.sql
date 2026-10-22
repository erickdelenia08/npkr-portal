-- CreateTable
CREATE TABLE `Bank` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Bank_nama_key`(`nama`),
    UNIQUE INDEX `Bank_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PengajuanKPR` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaksi_id` INTEGER NOT NULL,
    `bank_id` INTEGER NOT NULL,
    `nomor_pengajuan` INTEGER NOT NULL,
    `status` ENUM('DIAJUKAN', 'WAWANCARA', 'OTS', 'VERIFIKASI', 'SP3K', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN') NOT NULL DEFAULT 'DIAJUKAN',
    `tanggal_ajukan` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tanggal_keputusan` DATETIME(3) NULL,
    `alasan_penolakan` TEXT NULL,
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `PengajuanKPR_transaksi_id_status_idx`(`transaksi_id`, `status`),
    INDEX `PengajuanKPR_bank_id_status_idx`(`bank_id`, `status`),
    UNIQUE INDEX `PengajuanKPR_transaksi_id_nomor_pengajuan_key`(`transaksi_id`, `nomor_pengajuan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PengajuanKPRLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pengajuan_id` INTEGER NOT NULL,
    `status_sebelum` ENUM('DIAJUKAN', 'WAWANCARA', 'OTS', 'VERIFIKASI', 'SP3K', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN') NULL,
    `status_sesudah` ENUM('DIAJUKAN', 'WAWANCARA', 'OTS', 'VERIFIKASI', 'SP3K', 'DISETUJUI', 'DITOLAK', 'DIBATALKAN') NOT NULL,
    `admin_id` INTEGER NOT NULL,
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PengajuanKPRLog_pengajuan_id_created_at_idx`(`pengajuan_id`, `created_at`),
    INDEX `PengajuanKPRLog_admin_id_created_at_idx`(`admin_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PengajuanKPR` ADD CONSTRAINT `PengajuanKPR_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `Transaksi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengajuanKPR` ADD CONSTRAINT `PengajuanKPR_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `Bank`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengajuanKPRLog` ADD CONSTRAINT `PengajuanKPRLog_pengajuan_id_fkey` FOREIGN KEY (`pengajuan_id`) REFERENCES `PengajuanKPR`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PengajuanKPRLog` ADD CONSTRAINT `PengajuanKPRLog_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
