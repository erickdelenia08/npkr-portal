-- AddForeignKey
ALTER TABLE `Itj` ADD CONSTRAINT `Itj_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `MasterUnit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Itj` ADD CONSTRAINT `Itj_marketing_id_fkey` FOREIGN KEY (`marketing_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
