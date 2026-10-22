ALTER TABLE `Transaksi` ADD INDEX `Transaksi_marketing_id_fkey` (`marketing_id`);
ALTER TABLE `Transaksi` DROP INDEX `Transaksi_closing_at_idx`, DROP INDEX `Transaksi_marketing_id_closing_at_idx`, DROP COLUMN `closing_at`,
  MODIFY `status_transaksi` ENUM('PEMBERKASAN', 'PROSES_BANK', 'AKAD_AJB', 'PEMBANGUNAN', 'SERAH_TERIMA', 'BATAL') NOT NULL DEFAULT 'PEMBERKASAN',
  MODIFY `tgl_akad` DATETIME(3) NULL,
  MODIFY `tgl_ajb` DATETIME(3) NULL,
  MODIFY `lunas_at` DATETIME(3) NULL,
  MODIFY `tgl_bast` DATETIME(3) NULL;
ALTER TABLE `TransaksiTahapLog`
  MODIFY `tahap_sebelum` ENUM('PEMBERKASAN', 'PROSES_BANK', 'AKAD_AJB', 'PEMBANGUNAN', 'SERAH_TERIMA', 'BATAL') NULL,
  MODIFY `tahap_sesudah` ENUM('PEMBERKASAN', 'PROSES_BANK', 'AKAD_AJB', 'PEMBANGUNAN', 'SERAH_TERIMA', 'BATAL') NOT NULL;
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261017103050_adjust_some_table';
