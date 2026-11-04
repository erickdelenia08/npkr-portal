-- AlterTable
ALTER TABLE `transaksi` ADD COLUMN `tahap_since` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entity_type` ENUM('LEAD', 'TRANSAKSI', 'DOKUMEN', 'BAST_ITEM', 'PEMBAYARAN', 'PENGAJUAN_KPR', 'UNIT') NOT NULL,
    `entity_id` INTEGER NOT NULL,
    `action` VARCHAR(48) NOT NULL,
    `lead_id` INTEGER NULL,
    `transaksi_id` INTEGER NULL,
    `tahap_detail` ENUM('PENGUMPULAN_DOKUMEN', 'PROSES_BANK', 'AKAD_KREDIT', 'PEMBERKASAN_LEGALITAS', 'MENUNGGU_PELUNASAN', 'PEMBERKASAN_PPJB', 'PEMBAYARAN_DP', 'CICILAN_BERJALAN', 'PELUNASAN', 'AJB', 'BAST', 'BATAL') NULL,
    `actor_id` INTEGER NULL,
    `summary` TEXT NOT NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `is_backfill` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ActivityLog_transaksi_id_created_at_idx`(`transaksi_id`, `created_at`),
    INDEX `ActivityLog_lead_id_created_at_idx`(`lead_id`, `created_at`),
    INDEX `ActivityLog_actor_id_created_at_idx`(`actor_id`, `created_at`),
    INDEX `ActivityLog_action_created_at_idx`(`action`, `created_at`),
    INDEX `ActivityLog_entity_type_created_at_idx`(`entity_type`, `created_at`),
    INDEX `ActivityLog_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `Transaksi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill tahap_since from latest TransaksiTahapLog per transaksi, or created_at
UPDATE `transaksi` t
LEFT JOIN (
    SELECT `transaksi_id`, MAX(`created_at`) AS `last_log_time`
    FROM `transaksitahaplog`
    GROUP BY `transaksi_id`
) l ON t.`id` = l.`transaksi_id`
SET t.`tahap_since` = COALESCE(l.`last_log_time`, t.`created_at`);

