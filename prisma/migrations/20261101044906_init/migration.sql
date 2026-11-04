-- CreateTable
CREATE TABLE `aktivitas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `jenis` ENUM('TELEPON', 'WHATSAPP', 'BERTEMU', 'LAINNYA') NOT NULL,
    `hasil` ENUM('TERTARIK', 'MASIH_MIKIR', 'TIDAK_DIJAWAB', 'MINTA_INFO_LAGI', 'TIDAK_JADI') NOT NULL,
    `catatan` TEXT NULL,
    `tgl_follow_up` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Aktivitas_lead_id_tgl_follow_up_idx`(`lead_id` ASC, `tgl_follow_up` ASC),
    INDEX `Aktivitas_user_id_idx`(`user_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Bank_kode_key`(`kode` ASC),
    UNIQUE INDEX `Bank_nama_key`(`nama` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `checklistbast` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaksi_id` INTEGER NOT NULL,
    `item` ENUM('PONDASI_STRUKTUR', 'DINDING_PLESTER_CAT', 'ATAP_PLAFON', 'LANTAI_KERAMIK', 'KUSEN_PINTU_JENDELA', 'KELISTRIKAN', 'SANITASI_AIR_POMPA', 'FASAD_KEBERSIHAN') NOT NULL,
    `status` ENUM('BELUM_LENGKAP', 'LENGKAP') NOT NULL DEFAULT 'BELUM_LENGKAP',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ChecklistBAST_transaksi_id_idx`(`transaksi_id` ASC),
    UNIQUE INDEX `ChecklistBAST_transaksi_id_item_key`(`transaksi_id` ASC, `item` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama_ktp` VARCHAR(191) NOT NULL,
    `nik` VARCHAR(191) NOT NULL,
    `tempat_lahir` VARCHAR(191) NOT NULL,
    `tgl_lahir` DATE NOT NULL,
    `alamat_ktp` TEXT NOT NULL,
    `no_hp` VARCHAR(191) NULL,
    `status_pernikahan` ENUM('MENIKAH', 'BELUM_MENIKAH', 'CERAI') NULL,
    `status_pekerjaan` ENUM('TETAP', 'TIDAK_TETAP') NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_nik_key`(`nik` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dokumentransaksi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaksi_id` INTEGER NOT NULL,
    `jenis` ENUM('KTP_SUAMI_ISTRI', 'KTP_PEMOHON', 'KTP_PASANGAN', 'KARTU_KELUARGA', 'NPWP', 'BUKU_NIKAH', 'SURAT_PERNYATAAN_BELUM_MENIKAH', 'AKTA_CERAI', 'SLIP_GAJI', 'SURAT_KET_KERJA', 'REKENING_KORAN', 'SURAT_KET_BELUM_PUNYA_RUMAH', 'SKU_WIRAUSAHA', 'LAPORAN_KEUANGAN', 'LEGALITAS_LAINNYA', 'FORM_APLIKASI_KPR', 'FORM_FPPA', 'PAS_FOTO', 'FOTO_TEMPAT_USAHA', 'DENAH_LOKASI_USAHA', 'FOTO_LOKASI_KERJA', 'DENAH_LOKASI_KERJA', 'BUKU_TABUNGAN_BTN', 'REKENING_KORAN_USAHA_6BLN', 'SPT_TAHUNAN', 'SURAT_PENAWARAN_RUMAH', 'SURAT_LUNAS_UANG_MUKA', 'BROSUR_SITEPLAN', 'SERTIFIKAT_IMB') NOT NULL,
    `status` ENUM('BELUM_LENGKAP', 'LENGKAP') NOT NULL DEFAULT 'BELUM_LENGKAP',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `DokumenTransaksi_transaksi_id_idx`(`transaksi_id` ASC),
    UNIQUE INDEX `DokumenTransaksi_transaksi_id_jenis_key`(`transaksi_id` ASC, `jenis` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `itj` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lead_id` INTEGER NOT NULL,
    `unit_id` INTEGER NOT NULL,
    `marketing_id` INTEGER NULL,
    `nik` VARCHAR(191) NOT NULL,
    `nama_ktp` VARCHAR(191) NOT NULL,
    `nominal` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `metode_bayar` ENUM('KPR', 'CASH_KERAS', 'CASH_TEMPO') NOT NULL,
    `tenor` INTEGER NULL,
    `diajukan_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Itj_lead_id_fkey`(`lead_id` ASC),
    INDEX `Itj_marketing_id_diajukan_at_idx`(`marketing_id` ASC, `diajukan_at` ASC),
    INDEX `Itj_unit_id_idx`(`unit_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `marketing_id` INTEGER NULL,
    `customer_id` INTEGER NULL,
    `nama` VARCHAR(191) NOT NULL,
    `no_hp` VARCHAR(191) NULL,
    `sumber` ENUM('WALK_IN', 'FACEBOOK_ADS', 'TIKTOK', 'INSTAGRAM', 'WA_KANTOR', 'REFERRAL', 'LAINNYA') NOT NULL DEFAULT 'LAINNYA',
    `minat_tipe` VARCHAR(191) NULL,
    `survei_jadwal_at` DATETIME(3) NULL,
    `survei_selesai_at` DATETIME(3) NULL,
    `lost_at` DATETIME(3) NULL,
    `lost_reason` TEXT NULL,
    `last_activity_at` DATETIME(3) NULL,
    `next_follow_up_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Lead_customer_id_fkey`(`customer_id` ASC),
    INDEX `Lead_marketing_id_created_at_idx`(`marketing_id` ASC, `created_at` ASC),
    INDEX `Lead_marketing_id_next_follow_up_at_idx`(`marketing_id` ASC, `next_follow_up_at` ASC),
    INDEX `Lead_no_hp_idx`(`no_hp` ASC),
    INDEX `Lead_sumber_idx`(`sumber` ASC),
    INDEX `Lead_survei_jadwal_at_idx`(`survei_jadwal_at` ASC),
    INDEX `Lead_survei_selesai_at_idx`(`survei_selesai_at` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mastertipe` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama_tipe` VARCHAR(191) NOT NULL,
    `kategori` ENUM('SUBSIDI', 'KOMERSIL', 'KAVLING') NOT NULL,
    `luas_bangunan` INTEGER NULL,
    `luas_tanah` INTEGER NOT NULL,
    `harga_dasar` DECIMAL(15, 2) NOT NULL,

    UNIQUE INDEX `MasterTipe_kategori_luas_bangunan_luas_tanah_key`(`kategori` ASC, `luas_bangunan` ASC, `luas_tanah` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `masterunit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipe_id` INTEGER NOT NULL,
    `blok` VARCHAR(191) NOT NULL,
    `blok_prefix` VARCHAR(191) NOT NULL DEFAULT '',
    `blok_nomor` INTEGER NOT NULL DEFAULT 0,
    `status_unit` ENUM('AVAILABLE', 'HOLD', 'BOOKED', 'SOLD') NOT NULL DEFAULT 'AVAILABLE',
    `harga_khusus` DECIMAL(15, 2) NULL,

    UNIQUE INDEX `MasterUnit_blok_key`(`blok` ASC),
    INDEX `MasterUnit_status_unit_idx`(`status_unit` ASC),
    INDEX `MasterUnit_tipe_id_fkey`(`tipe_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pembayaran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaksi_id` INTEGER NOT NULL,
    `admin_id` INTEGER NOT NULL,
    `no_kwitansi` VARCHAR(191) NOT NULL,
    `jenis_pembayaran` ENUM('ITJ', 'DP', 'CICILAN', 'PELUNASAN') NOT NULL,
    `cara_bayar` ENUM('TUNAI', 'TRANSFER') NOT NULL DEFAULT 'TRANSFER',
    `nominal` DECIMAL(15, 2) NOT NULL,
    `tgl_bayar` DATE NOT NULL,
    `catatan` TEXT NULL,
    `is_void` BOOLEAN NOT NULL DEFAULT false,
    `void_at` DATETIME(3) NULL,
    `void_by` INTEGER NULL,
    `void_reason` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Pembayaran_admin_id_fkey`(`admin_id` ASC),
    INDEX `Pembayaran_is_void_tgl_bayar_idx`(`is_void` ASC, `tgl_bayar` ASC),
    UNIQUE INDEX `Pembayaran_no_kwitansi_key`(`no_kwitansi` ASC),
    INDEX `Pembayaran_transaksi_id_tgl_bayar_idx`(`transaksi_id` ASC, `tgl_bayar` ASC),
    INDEX `Pembayaran_void_by_fkey`(`void_by` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pengajuankpr` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaksi_id` INTEGER NOT NULL,
    `bank_id` INTEGER NOT NULL,
    `nomor_pengajuan` INTEGER NOT NULL,
    `status` ENUM('DIAJUKAN', 'WAWANCARA', 'OTS', 'VERIFIKASI', 'SP3K', 'DITOLAK', 'DIBATALKAN') NOT NULL DEFAULT 'DIAJUKAN',
    `tanggal_ajukan` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tanggal_keputusan` DATETIME(3) NULL,
    `alasan_penolakan` TEXT NULL,
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `PengajuanKPR_bank_id_status_idx`(`bank_id` ASC, `status` ASC),
    UNIQUE INDEX `PengajuanKPR_transaksi_id_nomor_pengajuan_key`(`transaksi_id` ASC, `nomor_pengajuan` ASC),
    INDEX `PengajuanKPR_transaksi_id_status_idx`(`transaksi_id` ASC, `status` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pengajuankprlog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pengajuan_id` INTEGER NOT NULL,
    `status_sebelum` ENUM('DIAJUKAN', 'WAWANCARA', 'OTS', 'VERIFIKASI', 'SP3K', 'DITOLAK', 'DIBATALKAN') NULL,
    `status_sesudah` ENUM('DIAJUKAN', 'WAWANCARA', 'OTS', 'VERIFIKASI', 'SP3K', 'DITOLAK', 'DIBATALKAN') NOT NULL,
    `admin_id` INTEGER NOT NULL,
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PengajuanKPRLog_admin_id_created_at_idx`(`admin_id` ASC, `created_at` ASC),
    INDEX `PengajuanKPRLog_pengajuan_id_created_at_idx`(`pengajuan_id` ASC, `created_at` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaksi` (
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
    `status_transaksi` ENUM('PEMBERKASAN', 'PROSES_BANK', 'PEMBAYARAN', 'AKAD_AJB', 'SERAH_TERIMA', 'BATAL') NOT NULL DEFAULT 'PEMBERKASAN',
    `tahap_detail` ENUM('PENGUMPULAN_DOKUMEN', 'AKAD_KREDIT', 'PEMBERKASAN_LEGALITAS', 'MENUNGGU_PELUNASAN', 'PEMBERKASAN_PPJB', 'PEMBAYARAN_DP', 'CICILAN_BERJALAN', 'PELUNASAN', 'AJB', 'BAST', 'BATAL') NOT NULL,
    `nama_notaris` VARCHAR(191) NULL,
    `tgl_akad` DATE NULL,
    `lunas_at` DATE NULL,
    `tgl_bast` DATE NULL,
    `closing_at` DATE NULL,
    `closed_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `alasan_batal` TEXT NULL,
    `catatan_admin` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `Transaksi_closed_at_idx`(`closed_at` ASC),
    INDEX `Transaksi_closing_at_idx`(`closing_at` ASC),
    INDEX `Transaksi_customer_id_fkey`(`customer_id` ASC),
    UNIQUE INDEX `Transaksi_itj_id_key`(`itj_id` ASC),
    INDEX `Transaksi_marketing_id_closing_at_idx`(`marketing_id` ASC, `closing_at` ASC),
    INDEX `Transaksi_status_transaksi_idx`(`status_transaksi` ASC),
    INDEX `Transaksi_unit_id_fkey`(`unit_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaksitahaplog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaksi_id` INTEGER NOT NULL,
    `tahap_sebelum` ENUM('PEMBERKASAN', 'PROSES_BANK', 'PEMBAYARAN', 'AKAD_AJB', 'SERAH_TERIMA', 'BATAL') NULL,
    `tahap_sesudah` ENUM('PEMBERKASAN', 'PROSES_BANK', 'PEMBAYARAN', 'AKAD_AJB', 'SERAH_TERIMA', 'BATAL') NOT NULL,
    `detail_sebelum` ENUM('PENGUMPULAN_DOKUMEN', 'AKAD_KREDIT', 'PEMBERKASAN_LEGALITAS', 'MENUNGGU_PELUNASAN', 'PEMBERKASAN_PPJB', 'PEMBAYARAN_DP', 'CICILAN_BERJALAN', 'PELUNASAN', 'AJB', 'BAST', 'BATAL') NULL,
    `detail_sesudah` ENUM('PENGUMPULAN_DOKUMEN', 'AKAD_KREDIT', 'PEMBERKASAN_LEGALITAS', 'MENUNGGU_PELUNASAN', 'PEMBERKASAN_PPJB', 'PEMBAYARAN_DP', 'CICILAN_BERJALAN', 'PELUNASAN', 'AJB', 'BAST', 'BATAL') NOT NULL,
    `admin_id` INTEGER NOT NULL,
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TransaksiTahapLog_admin_id_fkey`(`admin_id` ASC),
    INDEX `TransaksiTahapLog_transaksi_id_created_at_idx`(`transaksi_id` ASC, `created_at` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `unittipelog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `unit_id` INTEGER NULL,
    `blok` VARCHAR(191) NOT NULL,
    `tipe_lama_id` INTEGER NOT NULL,
    `tipe_baru_id` INTEGER NOT NULL,
    `harga_khusus_lama` DECIMAL(15, 2) NULL,
    `harga_khusus_direset` BOOLEAN NOT NULL DEFAULT false,
    `alasan` TEXT NOT NULL,
    `changed_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UnitTipeLog_blok_idx`(`blok` ASC),
    INDEX `UnitTipeLog_changed_by_fkey`(`changed_by` ASC),
    INDEX `UnitTipeLog_tipe_baru_id_fkey`(`tipe_baru_id` ASC),
    INDEX `UnitTipeLog_tipe_lama_id_fkey`(`tipe_lama_id` ASC),
    INDEX `UnitTipeLog_unit_id_created_at_idx`(`unit_id` ASC, `created_at` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `no_hp` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` ENUM('MARKETING', 'ADMIN', 'MANAGER') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_no_hp_key`(`no_hp` ASC),
    UNIQUE INDEX `User_username_key`(`username` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `aktivitas` ADD CONSTRAINT `Aktivitas_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aktivitas` ADD CONSTRAINT `Aktivitas_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `checklistbast` ADD CONSTRAINT `ChecklistBAST_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `transaksi`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dokumentransaksi` ADD CONSTRAINT `DokumenTransaksi_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `transaksi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itj` ADD CONSTRAINT `Itj_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itj` ADD CONSTRAINT `Itj_marketing_id_fkey` FOREIGN KEY (`marketing_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `itj` ADD CONSTRAINT `Itj_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `masterunit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `Lead_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead` ADD CONSTRAINT `Lead_marketing_id_fkey` FOREIGN KEY (`marketing_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `masterunit` ADD CONSTRAINT `MasterUnit_tipe_id_fkey` FOREIGN KEY (`tipe_id`) REFERENCES `mastertipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pembayaran` ADD CONSTRAINT `Pembayaran_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pembayaran` ADD CONSTRAINT `Pembayaran_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `transaksi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pembayaran` ADD CONSTRAINT `Pembayaran_void_by_fkey` FOREIGN KEY (`void_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengajuankpr` ADD CONSTRAINT `PengajuanKPR_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `bank`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengajuankpr` ADD CONSTRAINT `PengajuanKPR_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `transaksi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengajuankprlog` ADD CONSTRAINT `PengajuanKPRLog_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pengajuankprlog` ADD CONSTRAINT `PengajuanKPRLog_pengajuan_id_fkey` FOREIGN KEY (`pengajuan_id`) REFERENCES `pengajuankpr`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaksi` ADD CONSTRAINT `Transaksi_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaksi` ADD CONSTRAINT `Transaksi_itj_id_fkey` FOREIGN KEY (`itj_id`) REFERENCES `itj`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaksi` ADD CONSTRAINT `Transaksi_marketing_id_fkey` FOREIGN KEY (`marketing_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaksi` ADD CONSTRAINT `Transaksi_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `masterunit`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaksitahaplog` ADD CONSTRAINT `TransaksiTahapLog_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaksitahaplog` ADD CONSTRAINT `TransaksiTahapLog_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `transaksi`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unittipelog` ADD CONSTRAINT `UnitTipeLog_changed_by_fkey` FOREIGN KEY (`changed_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unittipelog` ADD CONSTRAINT `UnitTipeLog_tipe_baru_id_fkey` FOREIGN KEY (`tipe_baru_id`) REFERENCES `mastertipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unittipelog` ADD CONSTRAINT `UnitTipeLog_tipe_lama_id_fkey` FOREIGN KEY (`tipe_lama_id`) REFERENCES `mastertipe`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `unittipelog` ADD CONSTRAINT `UnitTipeLog_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `masterunit`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

