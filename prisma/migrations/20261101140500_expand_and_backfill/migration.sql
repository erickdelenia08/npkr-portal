-- 1. Drop existing foreign keys before renaming/modifying columns
ALTER TABLE `itj` DROP FOREIGN KEY `Itj_lead_id_fkey`;
ALTER TABLE `itj` DROP FOREIGN KEY `Itj_marketing_id_fkey`;
ALTER TABLE `pengajuankprlog` DROP FOREIGN KEY `PengajuanKPRLog_admin_id_fkey`;
ALTER TABLE `transaksi` DROP FOREIGN KEY `Transaksi_marketing_id_fkey`;
ALTER TABLE `transaksitahaplog` DROP FOREIGN KEY `TransaksiTahapLog_admin_id_fkey`;
ALTER TABLE `unittipelog` DROP FOREIGN KEY `UnitTipeLog_changed_by_fkey`;

-- 2. Drop obsolete indexes
DROP INDEX `Itj_lead_id_fkey` ON `itj`;
DROP INDEX `Itj_marketing_id_diajukan_at_idx` ON `itj`;
DROP INDEX `PengajuanKPRLog_admin_id_created_at_idx` ON `pengajuankprlog`;
DROP INDEX `Transaksi_closed_at_idx` ON `transaksi`;
DROP INDEX `Transaksi_marketing_id_closing_at_idx` ON `transaksi`;
DROP INDEX `Transaksi_status_transaksi_idx` ON `transaksi`;
DROP INDEX `TransaksiTahapLog_admin_id_fkey` ON `transaksitahaplog`;
DROP INDEX `UnitTipeLog_changed_by_fkey` ON `unittipelog`;

-- 3. Rename columns using RENAME COLUMN (preserves existing data!)
ALTER TABLE `itj` RENAME COLUMN `marketing_id` TO `closer_id`;
ALTER TABLE `pengajuankprlog` RENAME COLUMN `admin_id` TO `actor_id`;
ALTER TABLE `transaksi` RENAME COLUMN `marketing_id` TO `pic_id`;
ALTER TABLE `transaksitahaplog` RENAME COLUMN `admin_id` TO `actor_id`;
ALTER TABLE `unittipelog` RENAME COLUMN `changed_by` TO `actor_id`;
ALTER TABLE `user` RENAME COLUMN `isActive` TO `is_active`;

-- 4. Alter mastertipe
ALTER TABLE `mastertipe` MODIFY `luas_bangunan` INTEGER NOT NULL DEFAULT 0;

-- 5. Add new columns and modify types in transaksi
ALTER TABLE `transaksi`
    ADD COLUMN `active_unit_id` INTEGER NULL,
    ADD COLUMN `pengajuan_kpr_terpilih_id` INTEGER NULL,
    ADD COLUMN `rencana_akad_at` DATE NULL,
    ADD COLUMN `rencana_bast_at` DATE NULL,
    ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0,
    MODIFY `status_transaksi` ENUM('PEMBERKASAN', 'PROSES_BANK', 'PEMBAYARAN', 'AKAD_AJB', 'SERAH_TERIMA', 'BATAL') NULL DEFAULT 'PEMBERKASAN',
    MODIFY `tahap_detail` ENUM('PENGUMPULAN_DOKUMEN', 'PROSES_BANK', 'AKAD_KREDIT', 'PEMBERKASAN_LEGALITAS', 'MENUNGGU_PELUNASAN', 'PEMBERKASAN_PPJB', 'PEMBAYARAN_DP', 'CICILAN_BERJALAN', 'PELUNASAN', 'AJB', 'BAST', 'BATAL') NOT NULL,
    MODIFY `closing_at` DATE NOT NULL;

-- 6. Modify types in transaksitahaplog
ALTER TABLE `transaksitahaplog`
    MODIFY `tahap_sesudah` ENUM('PEMBERKASAN', 'PROSES_BANK', 'PEMBAYARAN', 'AKAD_AJB', 'SERAH_TERIMA', 'BATAL') NULL,
    MODIFY `detail_sebelum` ENUM('PENGUMPULAN_DOKUMEN', 'PROSES_BANK', 'AKAD_KREDIT', 'PEMBERKASAN_LEGALITAS', 'MENUNGGU_PELUNASAN', 'PEMBERKASAN_PPJB', 'PEMBAYARAN_DP', 'CICILAN_BERJALAN', 'PELUNASAN', 'AJB', 'BAST', 'BATAL') NULL,
    MODIFY `detail_sesudah` ENUM('PENGUMPULAN_DOKUMEN', 'PROSES_BANK', 'AKAD_KREDIT', 'PEMBERKASAN_LEGALITAS', 'MENUNGGU_PELUNASAN', 'PEMBERKASAN_PPJB', 'PEMBAYARAN_DP', 'CICILAN_BERJALAN', 'PELUNASAN', 'AJB', 'BAST', 'BATAL') NOT NULL;

-- 7. BACKFILL DATA
-- Backfill luas_bangunan
UPDATE `mastertipe` SET `luas_bangunan` = 0 WHERE `luas_bangunan` IS NULL;

-- Backfill active_unit_id: untuk setiap transaksi yang belum BATAL, isi dengan unit_id
UPDATE `transaksi` SET `active_unit_id` = `unit_id` WHERE `tahap_detail` <> 'BATAL';

-- Transaksi KPR yang macet di PENGUMPULAN_DOKUMEN padahal status_transaksi = PROSES_BANK
UPDATE `transaksi` SET `tahap_detail` = 'PROSES_BANK' WHERE `status_transaksi` = 'PROSES_BANK' AND `tahap_detail` = 'PENGUMPULAN_DOKUMEN';
UPDATE `transaksitahaplog` SET `detail_sesudah` = 'PROSES_BANK' WHERE `tahap_sesudah` = 'PROSES_BANK' AND `detail_sesudah` = 'PENGUMPULAN_DOKUMEN';
UPDATE `transaksitahaplog` SET `detail_sebelum` = 'PROSES_BANK' WHERE `tahap_sebelum` = 'PROSES_BANK' AND `detail_sebelum` = 'PENGUMPULAN_DOKUMEN';

-- Pastikan closing_at terisi dari diajukan_at ITJ bila ada yang kosong
UPDATE `transaksi` t JOIN `itj` i ON t.itj_id = i.id SET t.closing_at = DATE(CONVERT_TZ(i.diajukan_at, '+00:00', '+07:00')) WHERE t.closing_at IS NULL;

-- 8. Add Indexes and Constraints after backfill
CREATE INDEX `Itj_closer_id_diajukan_at_idx` ON `itj`(`closer_id`, `diajukan_at`);
CREATE INDEX `PengajuanKPRLog_actor_id_created_at_idx` ON `pengajuankprlog`(`actor_id`, `created_at`);
CREATE UNIQUE INDEX `Transaksi_active_unit_id_key` ON `transaksi`(`active_unit_id`);
CREATE UNIQUE INDEX `Transaksi_pengajuan_kpr_terpilih_id_key` ON `transaksi`(`pengajuan_kpr_terpilih_id`);
CREATE INDEX `Transaksi_tahap_detail_updated_at_idx` ON `transaksi`(`tahap_detail`, `updated_at`);
CREATE INDEX `Transaksi_tahap_detail_rencana_akad_at_idx` ON `transaksi`(`tahap_detail`, `rencana_akad_at`);
CREATE INDEX `Transaksi_tahap_detail_rencana_bast_at_idx` ON `transaksi`(`tahap_detail`, `rencana_bast_at`);
CREATE INDEX `Transaksi_pic_id_tahap_detail_idx` ON `transaksi`(`pic_id`, `tahap_detail`);

-- 9. Add Foreign Keys
ALTER TABLE `unittipelog` ADD CONSTRAINT `UnitTipeLog_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `itj` ADD CONSTRAINT `Itj_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `itj` ADD CONSTRAINT `Itj_closer_id_fkey` FOREIGN KEY (`closer_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `transaksi` ADD CONSTRAINT `Transaksi_active_unit_id_fkey` FOREIGN KEY (`active_unit_id`) REFERENCES `masterunit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `transaksi` ADD CONSTRAINT `Transaksi_pic_id_fkey` FOREIGN KEY (`pic_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `transaksi` ADD CONSTRAINT `Transaksi_pengajuan_kpr_terpilih_id_fkey` FOREIGN KEY (`pengajuan_kpr_terpilih_id`) REFERENCES `pengajuankpr`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `pengajuankprlog` ADD CONSTRAINT `PengajuanKPRLog_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `transaksitahaplog` ADD CONSTRAINT `TransaksiTahapLog_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

