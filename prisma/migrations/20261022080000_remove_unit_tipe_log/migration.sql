-- DropForeignKey
ALTER TABLE `UnitTipeLog` DROP FOREIGN KEY `UnitTipeLog_unit_id_fkey`;
ALTER TABLE `UnitTipeLog` DROP FOREIGN KEY `UnitTipeLog_tipe_lama_id_fkey`;
ALTER TABLE `UnitTipeLog` DROP FOREIGN KEY `UnitTipeLog_tipe_baru_id_fkey`;
ALTER TABLE `UnitTipeLog` DROP FOREIGN KEY `UnitTipeLog_changed_by_fkey`;

-- DropTable
DROP TABLE IF EXISTS `UnitTipeLog`;
