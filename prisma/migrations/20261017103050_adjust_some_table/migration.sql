-- AlterTable
ALTER TABLE `customer` MODIFY `tgl_lahir` DATE NOT NULL;

-- AlterTable
ALTER TABLE `itj` ADD COLUMN `marketing_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `lead` ADD COLUMN `last_activity_at` DATETIME(3) NULL,
    ADD COLUMN `next_follow_up_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `pembayaran` MODIFY `tgl_bayar` DATE NOT NULL;

-- AlterTable
ALTER TABLE `transaksi` ADD COLUMN `closing_at` DATE NULL,
    MODIFY `status_transaksi` ENUM('PEMBERKASAN', 'PROSES_BANK', 'PEMBAYARAN', 'AKAD_AJB', 'PEMBANGUNAN', 'SERAH_TERIMA', 'BATAL') NOT NULL DEFAULT 'PEMBERKASAN',
    MODIFY `tgl_akad` DATE NULL,
    MODIFY `tgl_ajb` DATE NULL,
    MODIFY `lunas_at` DATE NULL,
    MODIFY `tgl_bast` DATE NULL;

-- AlterTable
ALTER TABLE `transaksitahaplog` MODIFY `tahap_sebelum` ENUM('PEMBERKASAN', 'PROSES_BANK', 'PEMBAYARAN', 'AKAD_AJB', 'PEMBANGUNAN', 'SERAH_TERIMA', 'BATAL') NULL,
    MODIFY `tahap_sesudah` ENUM('PEMBERKASAN', 'PROSES_BANK', 'PEMBAYARAN', 'AKAD_AJB', 'PEMBANGUNAN', 'SERAH_TERIMA', 'BATAL') NOT NULL;

-- CreateIndex
CREATE INDEX `Itj_unit_id_status_idx` ON `Itj`(`unit_id`, `status`);

-- CreateIndex
CREATE INDEX `Itj_marketing_id_diajukan_at_idx` ON `Itj`(`marketing_id`, `diajukan_at`);

-- CreateIndex
CREATE INDEX `Itj_marketing_id_diputuskan_at_idx` ON `Itj`(`marketing_id`, `diputuskan_at`);

-- CreateIndex
CREATE INDEX `Lead_marketing_id_next_follow_up_at_idx` ON `Lead`(`marketing_id`, `next_follow_up_at`);

-- CreateIndex
CREATE INDEX `Lead_survei_jadwal_at_idx` ON `Lead`(`survei_jadwal_at`);

-- CreateIndex
CREATE INDEX `Lead_survei_selesai_at_idx` ON `Lead`(`survei_selesai_at`);

-- CreateIndex
CREATE INDEX `MasterUnit_status_unit_idx` ON `MasterUnit`(`status_unit`);

-- CreateIndex
CREATE INDEX `Pembayaran_is_void_tgl_bayar_idx` ON `Pembayaran`(`is_void`, `tgl_bayar`);

-- CreateIndex
CREATE INDEX `Transaksi_closing_at_idx` ON `Transaksi`(`closing_at`);

-- CreateIndex
CREATE INDEX `Transaksi_marketing_id_closing_at_idx` ON `Transaksi`(`marketing_id`, `closing_at`);

-- AddForeignKey
ALTER TABLE `Itj` ADD CONSTRAINT `Itj_marketing_id_fkey` FOREIGN KEY (`marketing_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
