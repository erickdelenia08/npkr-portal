-- Migration 2: Contract Cleanup & MasterTipe luas_bangunan Nullable

-- 1. Modify MasterTipe.luas_bangunan to be nullable
ALTER TABLE `mastertipe` MODIFY `luas_bangunan` INTEGER NULL DEFAULT NULL;
UPDATE `mastertipe` SET `luas_bangunan` = NULL WHERE `kategori` = 'KAVLING';

-- 2. Drop legacy columns from transaksi
ALTER TABLE `transaksi` DROP COLUMN `status_transaksi`, DROP COLUMN `closed_at`;

-- 3. Drop legacy macro columns from transaksitahaplog
ALTER TABLE `transaksitahaplog` DROP COLUMN `tahap_sebelum`, DROP COLUMN `tahap_sesudah`;

