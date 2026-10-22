-- Step 1: Backfill NULL luas_bangunan to 0
UPDATE `MasterTipe` SET `luas_bangunan` = 0 WHERE `luas_bangunan` IS NULL;

-- Step 2: Recompute nama_tipe according to derived formula: ${kategori}-${luas_bangunan}/${luas_tanah}
UPDATE `MasterTipe`
SET `nama_tipe` = CONCAT(`kategori`, '-', `luas_bangunan`, '/', `luas_tanah`);

-- Step 3: Modify luas_bangunan column to INTEGER NOT NULL DEFAULT 0
ALTER TABLE `MasterTipe` MODIFY `luas_bangunan` INTEGER NOT NULL DEFAULT 0;

-- Step 4: Add unique index on (kategori, luas_bangunan, luas_tanah)
CREATE UNIQUE INDEX `MasterTipe_kategori_luas_bangunan_luas_tanah_key` ON `MasterTipe`(`kategori`, `luas_bangunan`, `luas_tanah`);

-- Step 5: Add blok_prefix and blok_nomor to MasterUnit
ALTER TABLE `MasterUnit` 
    ADD COLUMN `blok_nomor` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `blok_prefix` VARCHAR(191) NOT NULL DEFAULT '';

CREATE INDEX `MasterUnit_blok_prefix_blok_nomor_idx` ON `MasterUnit`(`blok_prefix`, `blok_nomor`);

-- Step 6: Create UnitTipeLog table
CREATE TABLE `UnitTipeLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `unit_id` INTEGER NOT NULL,
    `tipe_lama_id` INTEGER NOT NULL,
    `tipe_baru_id` INTEGER NOT NULL,
    `harga_khusus_direset` BOOLEAN NOT NULL DEFAULT false,
    `alasan` TEXT NOT NULL,
    `changed_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UnitTipeLog_unit_id_idx`(`unit_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 7: Foreign keys for UnitTipeLog
ALTER TABLE `UnitTipeLog` ADD CONSTRAINT `UnitTipeLog_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `MasterUnit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `UnitTipeLog` ADD CONSTRAINT `UnitTipeLog_tipe_lama_id_fkey` FOREIGN KEY (`tipe_lama_id`) REFERENCES `MasterTipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `UnitTipeLog` ADD CONSTRAINT `UnitTipeLog_tipe_baru_id_fkey` FOREIGN KEY (`tipe_baru_id`) REFERENCES `MasterTipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `UnitTipeLog` ADD CONSTRAINT `UnitTipeLog_changed_by_fkey` FOREIGN KEY (`changed_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
