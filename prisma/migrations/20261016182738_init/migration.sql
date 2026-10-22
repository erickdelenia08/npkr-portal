-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `no_hp` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('MARKETING', 'ADMIN', 'MANAGER') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_no_hp_key`(`no_hp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MasterTipe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama_tipe` VARCHAR(191) NOT NULL,
    `kategori` ENUM('SUBSIDI', 'KOMERSIL', 'KAVLING') NOT NULL,
    `luas_bangunan` INTEGER NULL,
    `luas_tanah` INTEGER NOT NULL,
    `harga_dasar` DECIMAL(15, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MasterUnit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipe_id` INTEGER NOT NULL,
    `blok` VARCHAR(191) NOT NULL,
    `status_unit` ENUM('AVAILABLE', 'HOLD', 'BOOKED', 'SOLD') NOT NULL DEFAULT 'AVAILABLE',
    `harga_khusus` DECIMAL(15, 2) NULL,

    UNIQUE INDEX `MasterUnit_blok_key`(`blok`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lead` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `marketing_id` INTEGER NULL,
    `customer_id` INTEGER NULL,
    `nama` VARCHAR(191) NOT NULL,
    `no_hp` VARCHAR(191) NOT NULL,
    `sumber` ENUM('WALK_IN', 'FACEBOOK_ADS', 'TIKTOK', 'INSTAGRAM', 'WA_KANTOR', 'REFERRAL', 'LAINNYA') NOT NULL DEFAULT 'LAINNYA',
    `minat_tipe` VARCHAR(191) NULL,
    `survei_jadwal_at` DATETIME(3) NULL,
    `survei_selesai_at` DATETIME(3) NULL,
    `lost_at` DATETIME(3) NULL,
    `lost_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Lead_no_hp_idx`(`no_hp`),
    INDEX `Lead_marketing_id_created_at_idx`(`marketing_id`, `created_at`),
    INDEX `Lead_sumber_idx`(`sumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Aktivitas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `jenis` ENUM('TELEPON', 'WHATSAPP', 'BERTEMU', 'LAINNYA') NOT NULL,
    `hasil` ENUM('TERTARIK', 'MASIH_MIKIR', 'TIDAK_DIJAWAB', 'MINTA_INFO_LAGI', 'TIDAK_JADI') NOT NULL,
    `catatan` TEXT NULL,
    `tgl_follow_up` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Aktivitas_lead_id_tgl_follow_up_idx`(`lead_id`, `tgl_follow_up`),
    INDEX `Aktivitas_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

    INDEX `Itj_status_diajukan_at_idx`(`status`, `diajukan_at`),
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

-- CreateTable
CREATE TABLE `Customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama_ktp` VARCHAR(191) NOT NULL,
    `nik` VARCHAR(191) NOT NULL,
    `tempat_lahir` VARCHAR(191) NOT NULL,
    `tgl_lahir` DATETIME(3) NOT NULL,
    `alamat_ktp` TEXT NOT NULL,
    `no_hp` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_nik_key`(`nik`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaksi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `marketing_id` INTEGER NOT NULL,
    `itj_id` INTEGER NOT NULL,
    `metode_bayar` ENUM('KPR', 'CASH_KERAS', 'CASH_TEMPO') NOT NULL,
    `harga_deal` DECIMAL(15, 2) NOT NULL,
    `target_itj` DECIMAL(15, 2) NOT NULL,
    `target_dp` DECIMAL(15, 2) NOT NULL,
    `tenor_bulan` INTEGER NULL,
    `status_transaksi` ENUM('PEMBERKASAN', 'PROSES_BANK', 'AKAD_AJB', 'PEMBANGUNAN', 'SERAH_TERIMA', 'BATAL') NOT NULL DEFAULT 'PEMBERKASAN',
    `tahap_detail` ENUM('PENGUMPULAN_DOKUMEN', 'WAWANCARA', 'OTS', 'VERIFIKASI', 'SP3K', 'AKAD_KREDIT', 'PEMBERKASAN_LEGALITAS', 'MENUNGGU_PELUNASAN', 'PEMBERKASAN_PPJB', 'PEMBAYARAN_DP', 'CICILAN_BERJALAN', 'PELUNASAN', 'AJB', 'PEMBANGUNAN', 'BAST', 'BATAL') NOT NULL DEFAULT 'PENGUMPULAN_DOKUMEN',
    `nama_bank` VARCHAR(191) NULL,
    `nama_notaris` VARCHAR(191) NULL,
    `tgl_akad` DATETIME(3) NULL,
    `tgl_ajb` DATETIME(3) NULL,
    `lunas_at` DATETIME(3) NULL,
    `tgl_bast` DATETIME(3) NULL,
    `closed_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `alasan_batal` TEXT NULL,
    `catatan_admin` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Transaksi_itj_id_key`(`itj_id`),
    INDEX `Transaksi_status_transaksi_idx`(`status_transaksi`),
    INDEX `Transaksi_closed_at_idx`(`closed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransaksiTahapLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaksi_id` INTEGER NOT NULL,
    `tahap_sebelum` ENUM('PEMBERKASAN', 'PROSES_BANK', 'AKAD_AJB', 'PEMBANGUNAN', 'SERAH_TERIMA', 'BATAL') NULL,
    `tahap_sesudah` ENUM('PEMBERKASAN', 'PROSES_BANK', 'AKAD_AJB', 'PEMBANGUNAN', 'SERAH_TERIMA', 'BATAL') NOT NULL,
    `detail_sebelum` ENUM('PENGUMPULAN_DOKUMEN', 'WAWANCARA', 'OTS', 'VERIFIKASI', 'SP3K', 'AKAD_KREDIT', 'PEMBERKASAN_LEGALITAS', 'MENUNGGU_PELUNASAN', 'PEMBERKASAN_PPJB', 'PEMBAYARAN_DP', 'CICILAN_BERJALAN', 'PELUNASAN', 'AJB', 'PEMBANGUNAN', 'BAST', 'BATAL') NULL,
    `detail_sesudah` ENUM('PENGUMPULAN_DOKUMEN', 'WAWANCARA', 'OTS', 'VERIFIKASI', 'SP3K', 'AKAD_KREDIT', 'PEMBERKASAN_LEGALITAS', 'MENUNGGU_PELUNASAN', 'PEMBERKASAN_PPJB', 'PEMBAYARAN_DP', 'CICILAN_BERJALAN', 'PELUNASAN', 'AJB', 'PEMBANGUNAN', 'BAST', 'BATAL') NOT NULL,
    `admin_id` INTEGER NOT NULL,
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TransaksiTahapLog_transaksi_id_created_at_idx`(`transaksi_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DokumenTransaksi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaksi_id` INTEGER NOT NULL,
    `jenis` ENUM('KTP_SUAMI_ISTRI', 'KARTU_KELUARGA', 'NPWP', 'BUKU_NIKAH', 'SLIP_GAJI', 'SURAT_KET_KERJA', 'REKENING_KORAN', 'SURAT_KET_BELUM_PUNYA_RUMAH', 'SKU_WIRAUSAHA', 'LAPORAN_KEUANGAN', 'LEGALITAS_LAINNYA') NOT NULL,
    `kategori` ENUM('PEMBERKASAN', 'BAST', 'LEGALITAS_LAINNYA') NOT NULL,
    `status` ENUM('BELUM_DIUNGGAH', 'MENUNGGU_VERIFIKASI', 'PERLU_REVISI', 'TERVERIFIKASI') NOT NULL DEFAULT 'BELUM_DIUNGGAH',
    `file_url` VARCHAR(191) NULL,
    `catatan_verifikasi` TEXT NULL,
    `verified_by` INTEGER NULL,
    `verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `DokumenTransaksi_transaksi_id_kategori_idx`(`transaksi_id`, `kategori`),
    UNIQUE INDEX `DokumenTransaksi_transaksi_id_jenis_key`(`transaksi_id`, `jenis`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InspeksiBAST` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaksi_id` INTEGER NOT NULL,
    `item` ENUM('PONDASI_STRUKTUR', 'DINDING_PLESTER_CAT', 'ATAP_PLAFON', 'LANTAI_KERAMIK', 'KUSEN_PINTU_JENDELA', 'KELISTRIKAN', 'SANITASI_AIR_POMPA', 'FASAD_KEBERSIHAN') NOT NULL,
    `status` ENUM('BELUM_DICEK', 'SESUAI', 'PERLU_PERBAIKAN', 'SELESAI_DIPERBAIKI') NOT NULL DEFAULT 'BELUM_DICEK',
    `catatan` TEXT NULL,
    `inspektur_id` INTEGER NULL,
    `diperiksa_at` DATETIME(3) NULL,

    UNIQUE INDEX `InspeksiBAST_transaksi_id_item_key`(`transaksi_id`, `item`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InspeksiBASTLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inspeksi_bast_id` INTEGER NOT NULL,
    `status_sebelum` ENUM('BELUM_DICEK', 'SESUAI', 'PERLU_PERBAIKAN', 'SELESAI_DIPERBAIKI') NULL,
    `status_sesudah` ENUM('BELUM_DICEK', 'SESUAI', 'PERLU_PERBAIKAN', 'SELESAI_DIPERBAIKI') NOT NULL,
    `catatan` TEXT NULL,
    `inspektur_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InspeksiBASTLog_inspeksi_bast_id_created_at_idx`(`inspeksi_bast_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pembayaran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaksi_id` INTEGER NOT NULL,
    `admin_id` INTEGER NOT NULL,
    `no_kwitansi` VARCHAR(191) NOT NULL,
    `jenis_pembayaran` ENUM('ITJ', 'DP', 'CICILAN', 'PELUNASAN') NOT NULL,
    `cara_bayar` ENUM('TUNAI', 'TRANSFER') NOT NULL DEFAULT 'TRANSFER',
    `nominal` DECIMAL(15, 2) NOT NULL,
    `tgl_bayar` DATETIME(3) NOT NULL,
    `catatan` TEXT NULL,
    `is_void` BOOLEAN NOT NULL DEFAULT false,
    `void_at` DATETIME(3) NULL,
    `void_by` INTEGER NULL,
    `void_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Pembayaran_no_kwitansi_key`(`no_kwitansi`),
    INDEX `Pembayaran_transaksi_id_tgl_bayar_idx`(`transaksi_id`, `tgl_bayar`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MasterUnit` ADD CONSTRAINT `MasterUnit_tipe_id_fkey` FOREIGN KEY (`tipe_id`) REFERENCES `MasterTipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_marketing_id_fkey` FOREIGN KEY (`marketing_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Aktivitas` ADD CONSTRAINT `Aktivitas_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `Lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Aktivitas` ADD CONSTRAINT `Aktivitas_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE `Transaksi` ADD CONSTRAINT `Transaksi_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `Customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaksi` ADD CONSTRAINT `Transaksi_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `MasterUnit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaksi` ADD CONSTRAINT `Transaksi_marketing_id_fkey` FOREIGN KEY (`marketing_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaksi` ADD CONSTRAINT `Transaksi_itj_id_fkey` FOREIGN KEY (`itj_id`) REFERENCES `Itj`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransaksiTahapLog` ADD CONSTRAINT `TransaksiTahapLog_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `Transaksi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransaksiTahapLog` ADD CONSTRAINT `TransaksiTahapLog_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DokumenTransaksi` ADD CONSTRAINT `DokumenTransaksi_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `Transaksi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DokumenTransaksi` ADD CONSTRAINT `DokumenTransaksi_verified_by_fkey` FOREIGN KEY (`verified_by`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspeksiBAST` ADD CONSTRAINT `InspeksiBAST_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `Transaksi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspeksiBAST` ADD CONSTRAINT `InspeksiBAST_inspektur_id_fkey` FOREIGN KEY (`inspektur_id`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspeksiBASTLog` ADD CONSTRAINT `InspeksiBASTLog_inspeksi_bast_id_fkey` FOREIGN KEY (`inspeksi_bast_id`) REFERENCES `InspeksiBAST`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspeksiBASTLog` ADD CONSTRAINT `InspeksiBASTLog_inspektur_id_fkey` FOREIGN KEY (`inspektur_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `Transaksi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_void_by_fkey` FOREIGN KEY (`void_by`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
