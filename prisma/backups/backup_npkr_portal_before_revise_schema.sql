-- MySQL dump 10.13  Distrib 8.0.30, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: npkr-portal
-- ------------------------------------------------------
-- Server version	8.0.30

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `npkr-portal`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `npkr-portal` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `npkr-portal`;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('6a8f74e4-52bd-455f-b664-c88e89a6fe76','52259a4693d6d8841a06a2df6bc5292ca6db0ebd5547d0a82c5f0bd5e75b12d7','2026-10-17 10:30:52.118','20261017103050_adjust_some_table',NULL,NULL,'2026-10-17 10:30:50.858',1),('6d67051d-7b08-44d0-8d67-da765391e285','936ce17b5936e6daff39247c1da27e7cbdcf13efd489a220f480c97e6071eaee','2026-10-17 04:47:05.729','20261016182738_init',NULL,NULL,'2026-10-17 04:47:02.601',1),('6db74867-c6c9-442d-ad03-3512ca024b4a','487c9b1d1d783721c9d4ef5431d36b7b51b87ede00d9a9a1d68c3c37fe417ab3','2026-10-17 04:47:49.200','20261017044748_adjust',NULL,NULL,'2026-10-17 04:47:48.562',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `aktivitas`
--

DROP TABLE IF EXISTS `aktivitas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aktivitas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int NOT NULL,
  `user_id` int NOT NULL,
  `jenis` enum('TELEPON','WHATSAPP','BERTEMU','LAINNYA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `hasil` enum('TERTARIK','MASIH_MIKIR','TIDAK_DIJAWAB','MINTA_INFO_LAGI','TIDAK_JADI') COLLATE utf8mb4_unicode_ci NOT NULL,
  `catatan` text COLLATE utf8mb4_unicode_ci,
  `tgl_follow_up` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Aktivitas_lead_id_tgl_follow_up_idx` (`lead_id`,`tgl_follow_up`),
  KEY `Aktivitas_user_id_idx` (`user_id`),
  CONSTRAINT `Aktivitas_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Aktivitas_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aktivitas`
--

LOCK TABLES `aktivitas` WRITE;
/*!40000 ALTER TABLE `aktivitas` DISABLE KEYS */;
INSERT INTO `aktivitas` VALUES (1,1,2,'BERTEMU','TERTARIK','Survei lokasi dijadwalkan pada Minggu, 18 Okt 2026, 10.00','2026-10-18 03:00:00.000','2026-10-17 04:59:33.788'),(2,1,2,'BERTEMU','TERTARIK','Survei lokasi selesai dilaksanakan pada 17 Okt 2026',NULL,'2026-10-17 04:59:35.340'),(3,1,2,'LAINNYA','TERTARIK','[PENGAJUAN ITJ] Blok F-1 sebesar Rp 300.000',NULL,'2026-10-17 05:00:07.711'),(4,1,1,'LAINNYA','TERTARIK','[ITJ DISETUJUI ADMIN] Unit Blok F-1 berstatus BOOKED. Kwitansi ITJ: KWT-ITJ-1792213273567. Transaksi masuk tahap Pemberkasan.',NULL,'2026-10-17 05:01:13.615'),(5,1,1,'LAINNYA','TERTARIK','[STATUS TRANSAKSI] Tahap: PENGUMPULAN_DOKUMEN (PEMBERKASAN)',NULL,'2026-10-17 05:12:10.260'),(6,1,1,'LAINNYA','TERTARIK','[STATUS TRANSAKSI] Tahap: PENGUMPULAN_DOKUMEN (PEMBERKASAN)',NULL,'2026-10-17 05:12:34.132'),(7,1,1,'LAINNYA','TERTARIK','[STATUS TRANSAKSI] PENGUMPULAN_DOKUMEN (PEMBERKASAN) • Catatan: sadfasdfsdf',NULL,'2026-10-17 07:05:45.271'),(8,1,1,'LAINNYA','TERTARIK','[STATUS TRANSAKSI] WAWANCARA (PROSES_BANK) • Catatan: sadfasdfsdf',NULL,'2026-10-17 07:06:06.458'),(9,1,1,'LAINNYA','TERTARIK','[STATUS TRANSAKSI] OTS (PROSES_BANK) • Catatan: sadfasdfsdf',NULL,'2026-10-17 07:06:13.697'),(10,1,1,'LAINNYA','TERTARIK','[STATUS TRANSAKSI] PENGUMPULAN_DOKUMEN (PEMBERKASAN) • Catatan: sadfasdfsdf',NULL,'2026-10-17 07:41:31.475'),(11,1,1,'LAINNYA','TERTARIK','[STATUS TRANSAKSI] OTS (PROSES_BANK) • Catatan: asdfasdf',NULL,'2026-10-17 07:42:57.546'),(12,1,1,'LAINNYA','TERTARIK','[STATUS TRANSAKSI] VERIFIKASI (PROSES_BANK) • Catatan: asdfasdf',NULL,'2026-10-17 07:56:35.425'),(13,1,1,'LAINNYA','TERTARIK','[STATUS TRANSAKSI] SP3K (PROSES_BANK) • Catatan: asdfasdf',NULL,'2026-10-17 07:56:54.271'),(14,1,1,'LAINNYA','TERTARIK','[STATUS TRANSAKSI] AKAD_KREDIT (AKAD_AJB) • Catatan: asdfasdf',NULL,'2026-10-17 07:58:07.170'),(15,1,1,'LAINNYA','TERTARIK','[STATUS TRANSAKSI] PEMBANGUNAN (PEMBANGUNAN) • Catatan: asdfasdf',NULL,'2026-10-17 08:01:06.150'),(16,1,1,'LAINNYA','TERTARIK','[STATUS TRANSAKSI] BAST (SERAH_TERIMA)',NULL,'2026-10-17 08:02:58.364');
/*!40000 ALTER TABLE `aktivitas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank`
--

DROP TABLE IF EXISTS `bank`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kode` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `catatan` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Bank_nama_key` (`nama`),
  UNIQUE KEY `Bank_kode_key` (`kode`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank`
--

LOCK TABLES `bank` WRITE;
/*!40000 ALTER TABLE `bank` DISABLE KEYS */;
INSERT INTO `bank` VALUES (1,'Bank BTN','BTN',1,NULL,'2026-10-17 05:01:34.558','2026-10-17 05:01:34.558'),(2,'Bank BTN Syariah','BTNS',1,NULL,'2026-10-17 05:01:34.558','2026-10-17 05:01:34.558'),(3,'Bank BSI (Bank Syariah Indonesia)','BSI',1,NULL,'2026-10-17 05:01:34.558','2026-10-17 05:01:34.558'),(4,'Bank Mandiri','MANDIRI',1,NULL,'2026-10-17 05:01:34.558','2026-10-17 05:01:34.558'),(5,'Bank BRI','BRI',1,NULL,'2026-10-17 05:01:34.558','2026-10-17 05:01:34.558'),(6,'Bank BNI','BNI',1,NULL,'2026-10-17 05:01:34.558','2026-10-17 05:01:34.558'),(7,'Bank BCA','BCA',1,NULL,'2026-10-17 05:01:34.558','2026-10-17 05:01:34.558');
/*!40000 ALTER TABLE `bank` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer`
--

DROP TABLE IF EXISTS `customer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_ktp` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nik` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tempat_lahir` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tgl_lahir` date NOT NULL,
  `alamat_ktp` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_hp` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Customer_nik_key` (`nik`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer`
--

LOCK TABLES `customer` WRITE;
/*!40000 ALTER TABLE `customer` DISABLE KEYS */;
INSERT INTO `customer` VALUES (1,'erick','1234123412341234','asdfasdf','2026-10-09','asdfasdf','09813241234','2026-10-17 05:00:07.678','2026-10-17 05:00:07.678');
/*!40000 ALTER TABLE `customer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dokumentransaksi`
--

DROP TABLE IF EXISTS `dokumentransaksi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dokumentransaksi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaksi_id` int NOT NULL,
  `jenis` enum('KTP_SUAMI_ISTRI','KARTU_KELUARGA','NPWP','BUKU_NIKAH','SLIP_GAJI','SURAT_KET_KERJA','REKENING_KORAN','SURAT_KET_BELUM_PUNYA_RUMAH','SKU_WIRAUSAHA','LAPORAN_KEUANGAN','LEGALITAS_LAINNYA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `kategori` enum('PEMBERKASAN','BAST','LEGALITAS_LAINNYA') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('BELUM_DIUNGGAH','MENUNGGU_VERIFIKASI','PERLU_REVISI','TERVERIFIKASI') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BELUM_DIUNGGAH',
  `file_url` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `catatan_verifikasi` text COLLATE utf8mb4_unicode_ci,
  `verified_by` int DEFAULT NULL,
  `verified_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `DokumenTransaksi_transaksi_id_jenis_key` (`transaksi_id`,`jenis`),
  KEY `DokumenTransaksi_transaksi_id_kategori_idx` (`transaksi_id`,`kategori`),
  KEY `DokumenTransaksi_verified_by_fkey` (`verified_by`),
  CONSTRAINT `DokumenTransaksi_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `transaksi` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `DokumenTransaksi_verified_by_fkey` FOREIGN KEY (`verified_by`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dokumentransaksi`
--

LOCK TABLES `dokumentransaksi` WRITE;
/*!40000 ALTER TABLE `dokumentransaksi` DISABLE KEYS */;
INSERT INTO `dokumentransaksi` VALUES (1,1,'KTP_SUAMI_ISTRI','PEMBERKASAN','TERVERIFIKASI',NULL,NULL,1,'2026-10-17 05:12:34.135','2026-10-17 05:12:10.274','2026-10-17 05:12:34.138'),(2,1,'NPWP','PEMBERKASAN','TERVERIFIKASI',NULL,NULL,1,'2026-10-17 05:12:34.142','2026-10-17 05:12:10.286','2026-10-17 05:12:34.145'),(3,1,'SLIP_GAJI','PEMBERKASAN','TERVERIFIKASI',NULL,NULL,1,'2026-10-17 05:12:34.155','2026-10-17 05:12:10.298','2026-10-17 05:12:34.158'),(4,1,'REKENING_KORAN','PEMBERKASAN','TERVERIFIKASI',NULL,NULL,1,'2026-10-17 05:12:34.168','2026-10-17 05:12:10.313','2026-10-17 05:12:34.170'),(5,1,'LEGALITAS_LAINNYA','PEMBERKASAN','TERVERIFIKASI',NULL,NULL,1,'2026-10-17 07:05:45.242','2026-10-17 05:12:10.321','2026-10-17 07:05:45.245'),(6,1,'SKU_WIRAUSAHA','PEMBERKASAN','TERVERIFIKASI',NULL,NULL,1,'2026-10-17 07:05:45.233','2026-10-17 05:12:10.330','2026-10-17 07:05:45.236'),(7,1,'SURAT_KET_KERJA','PEMBERKASAN','TERVERIFIKASI',NULL,NULL,1,'2026-10-17 07:05:45.225','2026-10-17 05:12:10.339','2026-10-17 07:05:45.227'),(8,1,'BUKU_NIKAH','PEMBERKASAN','TERVERIFIKASI',NULL,NULL,1,'2026-10-17 07:05:45.217','2026-10-17 05:12:10.349','2026-10-17 07:05:45.221'),(9,1,'LAPORAN_KEUANGAN','PEMBERKASAN','TERVERIFIKASI',NULL,NULL,1,'2026-10-17 05:12:34.193','2026-10-17 05:12:34.197','2026-10-17 05:12:34.197'),(10,1,'KARTU_KELUARGA','PEMBERKASAN','TERVERIFIKASI',NULL,NULL,1,'2026-10-17 07:05:45.209','2026-10-17 05:12:34.204','2026-10-17 07:05:45.211');
/*!40000 ALTER TABLE `dokumentransaksi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inspeksibast`
--

DROP TABLE IF EXISTS `inspeksibast`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inspeksibast` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaksi_id` int NOT NULL,
  `item` enum('PONDASI_STRUKTUR','DINDING_PLESTER_CAT','ATAP_PLAFON','LANTAI_KERAMIK','KUSEN_PINTU_JENDELA','KELISTRIKAN','SANITASI_AIR_POMPA','FASAD_KEBERSIHAN') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('BELUM_DICEK','SESUAI','PERLU_PERBAIKAN','SELESAI_DIPERBAIKI') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BELUM_DICEK',
  `catatan` text COLLATE utf8mb4_unicode_ci,
  `inspektur_id` int DEFAULT NULL,
  `diperiksa_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `InspeksiBAST_transaksi_id_item_key` (`transaksi_id`,`item`),
  KEY `InspeksiBAST_inspektur_id_fkey` (`inspektur_id`),
  CONSTRAINT `InspeksiBAST_inspektur_id_fkey` FOREIGN KEY (`inspektur_id`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `InspeksiBAST_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `transaksi` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inspeksibast`
--

LOCK TABLES `inspeksibast` WRITE;
/*!40000 ALTER TABLE `inspeksibast` DISABLE KEYS */;
INSERT INTO `inspeksibast` VALUES (1,1,'PONDASI_STRUKTUR','SESUAI',NULL,1,'2026-10-17 08:02:32.802'),(2,1,'DINDING_PLESTER_CAT','SESUAI',NULL,1,'2026-10-17 08:02:35.180'),(3,1,'ATAP_PLAFON','SESUAI',NULL,1,'2026-10-17 08:02:37.438'),(4,1,'KUSEN_PINTU_JENDELA','SESUAI',NULL,1,'2026-10-17 08:02:41.872'),(5,1,'LANTAI_KERAMIK','SESUAI',NULL,1,'2026-10-17 08:02:43.460'),(6,1,'KELISTRIKAN','SESUAI',NULL,1,'2026-10-17 08:02:45.570'),(7,1,'SANITASI_AIR_POMPA','SESUAI',NULL,1,'2026-10-17 08:02:47.690'),(8,1,'FASAD_KEBERSIHAN','SESUAI',NULL,1,'2026-10-17 08:02:53.235');
/*!40000 ALTER TABLE `inspeksibast` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inspeksibastlog`
--

DROP TABLE IF EXISTS `inspeksibastlog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inspeksibastlog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inspeksi_bast_id` int NOT NULL,
  `status_sebelum` enum('BELUM_DICEK','SESUAI','PERLU_PERBAIKAN','SELESAI_DIPERBAIKI') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_sesudah` enum('BELUM_DICEK','SESUAI','PERLU_PERBAIKAN','SELESAI_DIPERBAIKI') COLLATE utf8mb4_unicode_ci NOT NULL,
  `catatan` text COLLATE utf8mb4_unicode_ci,
  `inspektur_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `InspeksiBASTLog_inspeksi_bast_id_created_at_idx` (`inspeksi_bast_id`,`created_at`),
  KEY `InspeksiBASTLog_inspektur_id_fkey` (`inspektur_id`),
  CONSTRAINT `InspeksiBASTLog_inspeksi_bast_id_fkey` FOREIGN KEY (`inspeksi_bast_id`) REFERENCES `inspeksibast` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `InspeksiBASTLog_inspektur_id_fkey` FOREIGN KEY (`inspektur_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inspeksibastlog`
--

LOCK TABLES `inspeksibastlog` WRITE;
/*!40000 ALTER TABLE `inspeksibastlog` DISABLE KEYS */;
INSERT INTO `inspeksibastlog` VALUES (1,1,NULL,'SESUAI',NULL,1,'2026-10-17 08:02:24.746'),(2,1,'SESUAI','SESUAI',NULL,1,'2026-10-17 08:02:32.811'),(3,2,NULL,'SESUAI',NULL,1,'2026-10-17 08:02:35.190'),(4,3,NULL,'SESUAI',NULL,1,'2026-10-17 08:02:37.447'),(5,4,NULL,'SESUAI',NULL,1,'2026-10-17 08:02:41.882'),(6,5,NULL,'SESUAI',NULL,1,'2026-10-17 08:02:43.467'),(7,6,NULL,'SESUAI',NULL,1,'2026-10-17 08:02:45.580'),(8,7,NULL,'SESUAI',NULL,1,'2026-10-17 08:02:47.699'),(9,8,NULL,'SESUAI',NULL,1,'2026-10-17 08:02:53.246');
/*!40000 ALTER TABLE `inspeksibastlog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `itj`
--

DROP TABLE IF EXISTS `itj`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `itj` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int NOT NULL,
  `unit_id` int NOT NULL,
  `status` enum('DIAJUKAN','PERLU_REVISI','DISETUJUI','DITOLAK') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DIAJUKAN',
  `nik` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_ktp` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nominal` decimal(15,2) NOT NULL,
  `target_dp` decimal(15,2) NOT NULL,
  `metode_bayar` enum('KPR','CASH_KERAS','CASH_TEMPO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenor` int DEFAULT NULL,
  `diajukan_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `diputuskan_at` datetime(3) DEFAULT NULL,
  `diputuskan_oleh` int DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `marketing_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Itj_status_diajukan_at_idx` (`status`,`diajukan_at`),
  KEY `Itj_lead_id_fkey` (`lead_id`),
  KEY `Itj_diputuskan_oleh_fkey` (`diputuskan_oleh`),
  KEY `Itj_unit_id_status_idx` (`unit_id`,`status`),
  KEY `Itj_marketing_id_diajukan_at_idx` (`marketing_id`,`diajukan_at`),
  KEY `Itj_marketing_id_diputuskan_at_idx` (`marketing_id`,`diputuskan_at`),
  CONSTRAINT `Itj_diputuskan_oleh_fkey` FOREIGN KEY (`diputuskan_oleh`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Itj_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `lead` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Itj_marketing_id_fkey` FOREIGN KEY (`marketing_id`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Itj_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `masterunit` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `itj`
--

LOCK TABLES `itj` WRITE;
/*!40000 ALTER TABLE `itj` DISABLE KEYS */;
INSERT INTO `itj` VALUES (1,1,1,'DISETUJUI','1234123412341234','erick',300000.00,2000000.00,'CASH_KERAS',NULL,'2026-10-17 05:00:07.700','2026-10-17 05:01:13.580',1,'2026-10-17 05:00:07.703','2026-10-17 05:01:13.587',NULL);
/*!40000 ALTER TABLE `itj` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `itjreview`
--

DROP TABLE IF EXISTS `itjreview`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `itjreview` (
  `id` int NOT NULL AUTO_INCREMENT,
  `itj_id` int NOT NULL,
  `reviewer_id` int NOT NULL,
  `keputusan` enum('DIAJUKAN','PERLU_REVISI','DISETUJUI','DITOLAK') COLLATE utf8mb4_unicode_ci NOT NULL,
  `catatan` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `ItjReview_itj_id_fkey` (`itj_id`),
  KEY `ItjReview_reviewer_id_fkey` (`reviewer_id`),
  CONSTRAINT `ItjReview_itj_id_fkey` FOREIGN KEY (`itj_id`) REFERENCES `itj` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ItjReview_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `itjreview`
--

LOCK TABLES `itjreview` WRITE;
/*!40000 ALTER TABLE `itjreview` DISABLE KEYS */;
INSERT INTO `itjreview` VALUES (1,1,1,'DISETUJUI','Disetujui oleh Admin','2026-10-17 05:01:13.602');
/*!40000 ALTER TABLE `itjreview` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lead`
--

DROP TABLE IF EXISTS `lead`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lead` (
  `id` int NOT NULL AUTO_INCREMENT,
  `marketing_id` int DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `nama` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_hp` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sumber` enum('WALK_IN','FACEBOOK_ADS','TIKTOK','INSTAGRAM','WA_KANTOR','REFERRAL','LAINNYA') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LAINNYA',
  `minat_tipe` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `survei_jadwal_at` datetime(3) DEFAULT NULL,
  `survei_selesai_at` datetime(3) DEFAULT NULL,
  `lost_at` datetime(3) DEFAULT NULL,
  `lost_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `last_activity_at` datetime(3) DEFAULT NULL,
  `next_follow_up_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `Lead_no_hp_idx` (`no_hp`),
  KEY `Lead_marketing_id_created_at_idx` (`marketing_id`,`created_at`),
  KEY `Lead_sumber_idx` (`sumber`),
  KEY `Lead_customer_id_fkey` (`customer_id`),
  KEY `Lead_marketing_id_next_follow_up_at_idx` (`marketing_id`,`next_follow_up_at`),
  KEY `Lead_survei_jadwal_at_idx` (`survei_jadwal_at`),
  KEY `Lead_survei_selesai_at_idx` (`survei_selesai_at`),
  CONSTRAINT `Lead_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Lead_marketing_id_fkey` FOREIGN KEY (`marketing_id`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lead`
--

LOCK TABLES `lead` WRITE;
/*!40000 ALTER TABLE `lead` DISABLE KEYS */;
INSERT INTO `lead` VALUES (1,2,1,'erick','09813241234','WALK_IN',NULL,'2026-10-18 03:00:00.000','2026-10-17 04:59:35.316',NULL,NULL,'2026-10-17 04:58:45.084','2026-10-17 05:01:13.548',NULL,NULL);
/*!40000 ALTER TABLE `lead` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mastertipe`
--

DROP TABLE IF EXISTS `mastertipe`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mastertipe` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_tipe` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kategori` enum('SUBSIDI','KOMERSIL','KAVLING') COLLATE utf8mb4_unicode_ci NOT NULL,
  `luas_bangunan` int DEFAULT NULL,
  `luas_tanah` int NOT NULL,
  `harga_dasar` decimal(15,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mastertipe`
--

LOCK TABLES `mastertipe` WRITE;
/*!40000 ALTER TABLE `mastertipe` DISABLE KEYS */;
INSERT INTO `mastertipe` VALUES (1,'Komersil 36/72','KOMERSIL',36,72,200000000.00);
/*!40000 ALTER TABLE `mastertipe` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `masterunit`
--

DROP TABLE IF EXISTS `masterunit`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `masterunit` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipe_id` int NOT NULL,
  `blok` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_unit` enum('AVAILABLE','HOLD','BOOKED','SOLD') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'AVAILABLE',
  `harga_khusus` decimal(15,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `MasterUnit_blok_key` (`blok`),
  KEY `MasterUnit_tipe_id_fkey` (`tipe_id`),
  KEY `MasterUnit_status_unit_idx` (`status_unit`),
  CONSTRAINT `MasterUnit_tipe_id_fkey` FOREIGN KEY (`tipe_id`) REFERENCES `mastertipe` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `masterunit`
--

LOCK TABLES `masterunit` WRITE;
/*!40000 ALTER TABLE `masterunit` DISABLE KEYS */;
INSERT INTO `masterunit` VALUES (1,1,'F-1','BOOKED',NULL),(2,1,'F-2','AVAILABLE',NULL),(3,1,'F-3','AVAILABLE',NULL),(4,1,'F-4','AVAILABLE',NULL),(5,1,'F-5','AVAILABLE',NULL),(6,1,'F-6','AVAILABLE',NULL),(7,1,'F-7','AVAILABLE',NULL),(8,1,'F-8','AVAILABLE',NULL),(9,1,'F-9','AVAILABLE',NULL),(10,1,'F-10','AVAILABLE',NULL);
/*!40000 ALTER TABLE `masterunit` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pembayaran`
--

DROP TABLE IF EXISTS `pembayaran`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pembayaran` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaksi_id` int NOT NULL,
  `admin_id` int NOT NULL,
  `no_kwitansi` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `jenis_pembayaran` enum('ITJ','DP','CICILAN','PELUNASAN') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cara_bayar` enum('TUNAI','TRANSFER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TRANSFER',
  `nominal` decimal(15,2) NOT NULL,
  `tgl_bayar` date NOT NULL,
  `catatan` text COLLATE utf8mb4_unicode_ci,
  `is_void` tinyint(1) NOT NULL DEFAULT '0',
  `void_at` datetime(3) DEFAULT NULL,
  `void_by` int DEFAULT NULL,
  `void_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Pembayaran_no_kwitansi_key` (`no_kwitansi`),
  KEY `Pembayaran_transaksi_id_tgl_bayar_idx` (`transaksi_id`,`tgl_bayar`),
  KEY `Pembayaran_admin_id_fkey` (`admin_id`),
  KEY `Pembayaran_void_by_fkey` (`void_by`),
  KEY `Pembayaran_is_void_tgl_bayar_idx` (`is_void`,`tgl_bayar`),
  CONSTRAINT `Pembayaran_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Pembayaran_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `transaksi` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Pembayaran_void_by_fkey` FOREIGN KEY (`void_by`) REFERENCES `user` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pembayaran`
--

LOCK TABLES `pembayaran` WRITE;
/*!40000 ALTER TABLE `pembayaran` DISABLE KEYS */;
INSERT INTO `pembayaran` VALUES (1,1,1,'KWT-ITJ-1792213273567','ITJ','TRANSFER',300000.00,'2026-10-17','Pembayaran awal ITJ Blok F-1',0,NULL,NULL,NULL,'2026-10-17 05:01:13.572','2026-10-17 05:01:13.572');
/*!40000 ALTER TABLE `pembayaran` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pengajuankpr`
--

DROP TABLE IF EXISTS `pengajuankpr`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pengajuankpr` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaksi_id` int NOT NULL,
  `bank_id` int NOT NULL,
  `nomor_pengajuan` int NOT NULL,
  `status` enum('DIAJUKAN','WAWANCARA','OTS','VERIFIKASI','SP3K','DISETUJUI','DITOLAK','DIBATALKAN') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DIAJUKAN',
  `tanggal_ajukan` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `tanggal_keputusan` datetime(3) DEFAULT NULL,
  `alasan_penolakan` text COLLATE utf8mb4_unicode_ci,
  `catatan` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PengajuanKPR_transaksi_id_nomor_pengajuan_key` (`transaksi_id`,`nomor_pengajuan`),
  KEY `PengajuanKPR_transaksi_id_status_idx` (`transaksi_id`,`status`),
  KEY `PengajuanKPR_bank_id_status_idx` (`bank_id`,`status`),
  CONSTRAINT `PengajuanKPR_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `bank` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `PengajuanKPR_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `transaksi` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pengajuankpr`
--

LOCK TABLES `pengajuankpr` WRITE;
/*!40000 ALTER TABLE `pengajuankpr` DISABLE KEYS */;
INSERT INTO `pengajuankpr` VALUES (1,1,5,1,'DITOLAK','2026-10-17 06:14:49.276','2026-10-17 06:55:13.956','ditaolak profesi tidak sesuai',NULL,'2026-10-17 06:14:49.279','2026-10-17 06:55:13.963'),(2,1,5,2,'DITOLAK','2026-10-17 07:05:11.766','2026-10-17 07:41:18.502','dsfgsdfg',NULL,'2026-10-17 07:05:11.769','2026-10-17 07:41:18.505'),(3,1,6,3,'DISETUJUI','2026-10-17 07:41:42.931','2026-10-17 07:42:06.718',NULL,NULL,'2026-10-17 07:41:42.932','2026-10-17 07:42:06.720');
/*!40000 ALTER TABLE `pengajuankpr` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pengajuankprlog`
--

DROP TABLE IF EXISTS `pengajuankprlog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pengajuankprlog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pengajuan_id` int NOT NULL,
  `status_sebelum` enum('DIAJUKAN','WAWANCARA','OTS','VERIFIKASI','SP3K','DISETUJUI','DITOLAK','DIBATALKAN') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status_sesudah` enum('DIAJUKAN','WAWANCARA','OTS','VERIFIKASI','SP3K','DISETUJUI','DITOLAK','DIBATALKAN') COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_id` int NOT NULL,
  `catatan` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `PengajuanKPRLog_pengajuan_id_created_at_idx` (`pengajuan_id`,`created_at`),
  KEY `PengajuanKPRLog_admin_id_created_at_idx` (`admin_id`,`created_at`),
  CONSTRAINT `PengajuanKPRLog_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `PengajuanKPRLog_pengajuan_id_fkey` FOREIGN KEY (`pengajuan_id`) REFERENCES `pengajuankpr` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pengajuankprlog`
--

LOCK TABLES `pengajuankprlog` WRITE;
/*!40000 ALTER TABLE `pengajuankprlog` DISABLE KEYS */;
INSERT INTO `pengajuankprlog` VALUES (1,1,NULL,'DIAJUKAN',1,'Pengajuan KPR #1 diajukan ke Bank BRI','2026-10-17 06:14:49.286'),(2,1,'DIAJUKAN','WAWANCARA',1,'Status pengajuan KPR diubah menjadi WAWANCARA','2026-10-17 06:14:57.830'),(3,1,'WAWANCARA','DIAJUKAN',1,'Status pengajuan KPR diubah menjadi DIAJUKAN','2026-10-17 06:14:58.791'),(4,1,'DIAJUKAN','WAWANCARA',1,'Status pengajuan KPR diubah menjadi WAWANCARA','2026-10-17 06:15:05.222'),(5,1,'WAWANCARA','OTS',1,'Status pengajuan KPR diubah menjadi OTS','2026-10-17 06:15:07.978'),(6,1,'OTS','VERIFIKASI',1,'Status pengajuan KPR diubah menjadi VERIFIKASI','2026-10-17 06:15:10.297'),(7,1,'VERIFIKASI','DIAJUKAN',1,'Status pengajuan KPR diubah menjadi DIAJUKAN','2026-10-17 06:15:14.304'),(8,1,'DIAJUKAN','WAWANCARA',1,'Status pengajuan KPR diubah menjadi WAWANCARA','2026-10-17 06:40:02.424'),(9,1,'WAWANCARA','DIAJUKAN',1,'Status pengajuan KPR diubah menjadi DIAJUKAN','2026-10-17 06:40:05.277'),(10,1,'DIAJUKAN','WAWANCARA',1,'Status pengajuan KPR diubah menjadi WAWANCARA','2026-10-17 06:41:33.504'),(11,1,'WAWANCARA','OTS',1,'Status pengajuan KPR diubah menjadi OTS','2026-10-17 06:41:34.792'),(12,1,'OTS','VERIFIKASI',1,'Status pengajuan KPR diubah menjadi VERIFIKASI','2026-10-17 06:41:35.606'),(13,1,'VERIFIKASI','DIAJUKAN',1,'Status pengajuan KPR diubah menjadi DIAJUKAN','2026-10-17 06:41:36.537'),(14,1,'DIAJUKAN','WAWANCARA',1,'Status pengajuan KPR diubah menjadi WAWANCARA','2026-10-17 06:41:37.497'),(15,1,'WAWANCARA','VERIFIKASI',1,'Status pengajuan KPR diubah menjadi VERIFIKASI','2026-10-17 06:41:38.673'),(16,1,'VERIFIKASI','DISETUJUI',1,'Status pengajuan KPR diubah menjadi DISETUJUI','2026-10-17 06:41:39.742'),(17,1,'DISETUJUI','DIAJUKAN',1,'Status pengajuan KPR diubah menjadi DIAJUKAN','2026-10-17 06:41:42.721'),(18,1,'DIAJUKAN','WAWANCARA',1,'Status pengajuan KPR diubah menjadi WAWANCARA','2026-10-17 06:52:46.896'),(19,1,'WAWANCARA','DIAJUKAN',1,'Status pengajuan KPR diubah menjadi DIAJUKAN','2026-10-17 06:52:49.605'),(20,1,'DIAJUKAN','DITOLAK',1,'Ditolak oleh Bank BRI: ditaolak profesi tidak sesuai','2026-10-17 06:55:13.948'),(21,2,NULL,'DIAJUKAN',1,'Pengajuan KPR #2 diajukan ke Bank BRI','2026-10-17 07:05:11.783'),(22,2,'DIAJUKAN','WAWANCARA',1,'Status pengajuan KPR diubah menjadi WAWANCARA','2026-10-17 07:21:14.576'),(23,2,'WAWANCARA','VERIFIKASI',1,'Status pengajuan KPR diubah menjadi VERIFIKASI','2026-10-17 07:21:15.699'),(24,2,'VERIFIKASI','WAWANCARA',1,'Status pengajuan KPR diubah menjadi WAWANCARA','2026-10-17 07:21:18.308'),(25,2,'WAWANCARA','OTS',1,'Status pengajuan KPR diubah menjadi OTS','2026-10-17 07:21:19.635'),(26,2,'OTS','VERIFIKASI',1,'Status pengajuan KPR diubah menjadi VERIFIKASI','2026-10-17 07:21:21.173'),(27,2,'VERIFIKASI','SP3K',1,'Status pengajuan KPR diubah menjadi SP3K','2026-10-17 07:21:22.626'),(28,2,'SP3K','DIAJUKAN',1,'Status pengajuan KPR diubah menjadi DIAJUKAN','2026-10-17 07:21:25.142'),(29,2,'DIAJUKAN','WAWANCARA',1,'Status pengajuan KPR diubah menjadi WAWANCARA','2026-10-17 07:21:32.586'),(30,2,'WAWANCARA','OTS',1,'Status pengajuan KPR diubah menjadi OTS','2026-10-17 07:21:34.251'),(31,2,'OTS','VERIFIKASI',1,'Status pengajuan KPR diubah menjadi VERIFIKASI','2026-10-17 07:21:35.792'),(32,2,'VERIFIKASI','SP3K',1,'Status pengajuan KPR diubah menjadi SP3K','2026-10-17 07:21:36.828'),(33,2,'SP3K','DISETUJUI',1,'Status pengajuan KPR diubah menjadi DISETUJUI','2026-10-17 07:21:38.594'),(34,2,'DISETUJUI','SP3K',1,'Status pengajuan KPR diubah menjadi SP3K','2026-10-17 07:21:41.937'),(35,2,'SP3K','VERIFIKASI',1,'Status pengajuan KPR diubah menjadi VERIFIKASI','2026-10-17 07:21:45.214'),(36,2,'VERIFIKASI','OTS',1,'Status pengajuan KPR diubah menjadi OTS','2026-10-17 07:21:46.944'),(37,2,'OTS','WAWANCARA',1,'Status pengajuan KPR diubah menjadi WAWANCARA','2026-10-17 07:21:48.358'),(38,2,'WAWANCARA','DIAJUKAN',1,'Status pengajuan KPR diubah menjadi DIAJUKAN','2026-10-17 07:21:49.268'),(39,2,'DIAJUKAN','DITOLAK',1,'Ditolak oleh Bank BRI: dsfgsdfg','2026-10-17 07:41:18.493'),(40,3,NULL,'DIAJUKAN',1,'Pengajuan KPR #3 diajukan ke Bank BNI','2026-10-17 07:41:42.938'),(41,3,'DIAJUKAN','WAWANCARA',1,'Status pengajuan KPR diubah menjadi WAWANCARA','2026-10-17 07:41:48.128'),(42,3,'WAWANCARA','OTS',1,'Status pengajuan KPR diubah menjadi OTS','2026-10-17 07:41:52.393'),(43,3,'OTS','VERIFIKASI',1,'Status pengajuan KPR diubah menjadi VERIFIKASI','2026-10-17 07:41:55.260'),(44,3,'VERIFIKASI','SP3K',1,'Status pengajuan KPR diubah menjadi SP3K','2026-10-17 07:42:04.037'),(45,3,'SP3K','DISETUJUI',1,'Status pengajuan KPR diubah menjadi DISETUJUI','2026-10-17 07:42:06.714');
/*!40000 ALTER TABLE `pengajuankprlog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaksi`
--

DROP TABLE IF EXISTS `transaksi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaksi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `unit_id` int NOT NULL,
  `marketing_id` int NOT NULL,
  `itj_id` int NOT NULL,
  `metode_bayar` enum('KPR','CASH_KERAS','CASH_TEMPO') COLLATE utf8mb4_unicode_ci NOT NULL,
  `harga_deal` decimal(15,2) NOT NULL,
  `target_itj` decimal(15,2) NOT NULL,
  `target_dp` decimal(15,2) NOT NULL,
  `tenor_bulan` int DEFAULT NULL,
  `status_transaksi` enum('PEMBERKASAN','PROSES_BANK','PEMBAYARAN','AKAD_AJB','PEMBANGUNAN','SERAH_TERIMA','BATAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PEMBERKASAN',
  `tahap_detail` enum('PENGUMPULAN_DOKUMEN','WAWANCARA','OTS','VERIFIKASI','SP3K','AKAD_KREDIT','PEMBERKASAN_LEGALITAS','MENUNGGU_PELUNASAN','PEMBERKASAN_PPJB','PEMBAYARAN_DP','CICILAN_BERJALAN','PELUNASAN','AJB','PEMBANGUNAN','BAST','BATAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENGUMPULAN_DOKUMEN',
  `nama_bank` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nama_notaris` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tgl_akad` date DEFAULT NULL,
  `tgl_ajb` date DEFAULT NULL,
  `lunas_at` date DEFAULT NULL,
  `tgl_bast` date DEFAULT NULL,
  `closed_at` datetime(3) DEFAULT NULL,
  `cancelled_at` datetime(3) DEFAULT NULL,
  `alasan_batal` text COLLATE utf8mb4_unicode_ci,
  `catatan_admin` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `closing_at` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Transaksi_itj_id_key` (`itj_id`),
  KEY `Transaksi_status_transaksi_idx` (`status_transaksi`),
  KEY `Transaksi_closed_at_idx` (`closed_at`),
  KEY `Transaksi_customer_id_fkey` (`customer_id`),
  KEY `Transaksi_unit_id_fkey` (`unit_id`),
  KEY `Transaksi_closing_at_idx` (`closing_at`),
  KEY `Transaksi_marketing_id_closing_at_idx` (`marketing_id`,`closing_at`),
  CONSTRAINT `Transaksi_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Transaksi_itj_id_fkey` FOREIGN KEY (`itj_id`) REFERENCES `itj` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Transaksi_marketing_id_fkey` FOREIGN KEY (`marketing_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Transaksi_unit_id_fkey` FOREIGN KEY (`unit_id`) REFERENCES `masterunit` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaksi`
--

LOCK TABLES `transaksi` WRITE;
/*!40000 ALTER TABLE `transaksi` DISABLE KEYS */;
INSERT INTO `transaksi` VALUES (1,1,1,2,1,'KPR',200000000.00,300000.00,2000000.00,NULL,'SERAH_TERIMA','BAST','Bank BNI',NULL,'2026-10-20',NULL,NULL,'2026-10-17',NULL,NULL,NULL,NULL,'2026-10-17 05:01:13.561','2026-10-17 08:02:58.351',NULL);
/*!40000 ALTER TABLE `transaksi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transaksitahaplog`
--

DROP TABLE IF EXISTS `transaksitahaplog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transaksitahaplog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaksi_id` int NOT NULL,
  `tahap_sebelum` enum('PEMBERKASAN','PROSES_BANK','PEMBAYARAN','AKAD_AJB','PEMBANGUNAN','SERAH_TERIMA','BATAL') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tahap_sesudah` enum('PEMBERKASAN','PROSES_BANK','PEMBAYARAN','AKAD_AJB','PEMBANGUNAN','SERAH_TERIMA','BATAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `detail_sebelum` enum('PENGUMPULAN_DOKUMEN','WAWANCARA','OTS','VERIFIKASI','SP3K','AKAD_KREDIT','PEMBERKASAN_LEGALITAS','MENUNGGU_PELUNASAN','PEMBERKASAN_PPJB','PEMBAYARAN_DP','CICILAN_BERJALAN','PELUNASAN','AJB','PEMBANGUNAN','BAST','BATAL') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detail_sesudah` enum('PENGUMPULAN_DOKUMEN','WAWANCARA','OTS','VERIFIKASI','SP3K','AKAD_KREDIT','PEMBERKASAN_LEGALITAS','MENUNGGU_PELUNASAN','PEMBERKASAN_PPJB','PEMBAYARAN_DP','CICILAN_BERJALAN','PELUNASAN','AJB','PEMBANGUNAN','BAST','BATAL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_id` int NOT NULL,
  `catatan` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `TransaksiTahapLog_transaksi_id_created_at_idx` (`transaksi_id`,`created_at`),
  KEY `TransaksiTahapLog_admin_id_fkey` (`admin_id`),
  CONSTRAINT `TransaksiTahapLog_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `TransaksiTahapLog_transaksi_id_fkey` FOREIGN KEY (`transaksi_id`) REFERENCES `transaksi` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transaksitahaplog`
--

LOCK TABLES `transaksitahaplog` WRITE;
/*!40000 ALTER TABLE `transaksitahaplog` DISABLE KEYS */;
INSERT INTO `transaksitahaplog` VALUES (1,1,'PEMBERKASAN','PEMBERKASAN','PEMBERKASAN_LEGALITAS','PENGUMPULAN_DOKUMEN',1,NULL,'2026-10-17 05:12:10.253'),(2,1,'PEMBERKASAN','PEMBERKASAN','PENGUMPULAN_DOKUMEN','PENGUMPULAN_DOKUMEN',1,NULL,'2026-10-17 05:12:34.126'),(3,1,'PEMBERKASAN','PROSES_BANK','PENGUMPULAN_DOKUMEN','WAWANCARA',1,'Tahap dimajukan ke WAWANCARA seiring pengajuan KPR #1 ke Bank BRI','2026-10-17 06:14:49.306'),(4,1,'PROSES_BANK','PROSES_BANK','WAWANCARA','OTS',1,'Tahap diselaraskan ke OTS mengikuti progres KPR di Bank BRI (OTS)','2026-10-17 06:15:08.002'),(5,1,'PROSES_BANK','PROSES_BANK','OTS','VERIFIKASI',1,'Tahap diselaraskan ke VERIFIKASI mengikuti progres KPR di Bank BRI (VERIFIKASI)','2026-10-17 06:15:10.326'),(6,1,'PROSES_BANK','PROSES_BANK','VERIFIKASI','WAWANCARA',1,'Tahap diselaraskan ke WAWANCARA mengikuti progres KPR di Bank BRI (WAWANCARA)','2026-10-17 06:40:02.452'),(7,1,'PROSES_BANK','PROSES_BANK','WAWANCARA','OTS',1,'Tahap diselaraskan ke OTS mengikuti progres KPR di Bank BRI (OTS)','2026-10-17 06:41:34.813'),(8,1,'PROSES_BANK','PROSES_BANK','OTS','VERIFIKASI',1,'Tahap diselaraskan ke VERIFIKASI mengikuti progres KPR di Bank BRI (VERIFIKASI)','2026-10-17 06:41:35.625'),(9,1,'PROSES_BANK','PROSES_BANK','VERIFIKASI','WAWANCARA',1,'Tahap diselaraskan ke WAWANCARA mengikuti progres KPR di Bank BRI (WAWANCARA)','2026-10-17 06:41:37.513'),(10,1,'PROSES_BANK','PROSES_BANK','WAWANCARA','VERIFIKASI',1,'Tahap diselaraskan ke VERIFIKASI mengikuti progres KPR di Bank BRI (VERIFIKASI)','2026-10-17 06:41:38.703'),(11,1,'PROSES_BANK','PROSES_BANK','VERIFIKASI','SP3K',1,'Tahap diselaraskan ke SP3K mengikuti progres KPR di Bank BRI (DISETUJUI)','2026-10-17 06:41:39.770'),(12,1,'PROSES_BANK','PROSES_BANK','SP3K','WAWANCARA',1,'Tahap diselaraskan ke WAWANCARA mengikuti progres KPR di Bank BRI (WAWANCARA)','2026-10-17 06:52:46.936'),(13,1,'PROSES_BANK','PEMBERKASAN','WAWANCARA','PENGUMPULAN_DOKUMEN',1,'Pengajuan KPR #1 di Bank BRI DITOLAK. Tahap dimundurkan ke Pemberkasan Dokumen untuk pengajuan ulang ke bank lain.','2026-10-17 06:55:13.995'),(14,1,'PEMBERKASAN','PROSES_BANK','PENGUMPULAN_DOKUMEN','WAWANCARA',1,'Tahap dimajukan ke WAWANCARA seiring pengajuan KPR #2 ke Bank BRI','2026-10-17 07:05:11.803'),(15,1,'PROSES_BANK','PEMBERKASAN','WAWANCARA','PENGUMPULAN_DOKUMEN',1,'sadfasdfsdf','2026-10-17 07:05:45.264'),(16,1,'PEMBERKASAN','PROSES_BANK','PENGUMPULAN_DOKUMEN','WAWANCARA',1,'sadfasdfsdf','2026-10-17 07:06:06.453'),(17,1,'PROSES_BANK','PROSES_BANK','WAWANCARA','OTS',1,'sadfasdfsdf','2026-10-17 07:06:13.692'),(18,1,'PROSES_BANK','PROSES_BANK','OTS','WAWANCARA',1,'Tahap diselaraskan ke WAWANCARA mengikuti progres KPR di Bank BRI (WAWANCARA)','2026-10-17 07:21:14.598'),(19,1,'PROSES_BANK','PROSES_BANK','WAWANCARA','VERIFIKASI',1,'Tahap diselaraskan ke VERIFIKASI mengikuti progres KPR di Bank BRI (VERIFIKASI)','2026-10-17 07:21:15.718'),(20,1,'PROSES_BANK','PROSES_BANK','VERIFIKASI','WAWANCARA',1,'Tahap diselaraskan ke WAWANCARA mengikuti progres KPR di Bank BRI (WAWANCARA)','2026-10-17 07:21:18.326'),(21,1,'PROSES_BANK','PROSES_BANK','WAWANCARA','OTS',1,'Tahap diselaraskan ke OTS mengikuti progres KPR di Bank BRI (OTS)','2026-10-17 07:21:19.655'),(22,1,'PROSES_BANK','PROSES_BANK','OTS','VERIFIKASI',1,'Tahap diselaraskan ke VERIFIKASI mengikuti progres KPR di Bank BRI (VERIFIKASI)','2026-10-17 07:21:21.193'),(23,1,'PROSES_BANK','PROSES_BANK','VERIFIKASI','SP3K',1,'Tahap diselaraskan ke SP3K mengikuti progres KPR di Bank BRI (SP3K)','2026-10-17 07:21:22.649'),(24,1,'PROSES_BANK','PROSES_BANK','SP3K','WAWANCARA',1,'Tahap diselaraskan ke WAWANCARA mengikuti progres KPR di Bank BRI (WAWANCARA)','2026-10-17 07:21:32.606'),(25,1,'PROSES_BANK','PROSES_BANK','WAWANCARA','OTS',1,'Tahap diselaraskan ke OTS mengikuti progres KPR di Bank BRI (OTS)','2026-10-17 07:21:34.280'),(26,1,'PROSES_BANK','PROSES_BANK','OTS','VERIFIKASI',1,'Tahap diselaraskan ke VERIFIKASI mengikuti progres KPR di Bank BRI (VERIFIKASI)','2026-10-17 07:21:35.812'),(27,1,'PROSES_BANK','PROSES_BANK','VERIFIKASI','SP3K',1,'Tahap diselaraskan ke SP3K mengikuti progres KPR di Bank BRI (SP3K)','2026-10-17 07:21:36.849'),(28,1,'PROSES_BANK','PROSES_BANK','SP3K','VERIFIKASI',1,'Tahap diselaraskan ke VERIFIKASI mengikuti progres KPR di Bank BRI (VERIFIKASI)','2026-10-17 07:21:45.237'),(29,1,'PROSES_BANK','PROSES_BANK','VERIFIKASI','OTS',1,'Tahap diselaraskan ke OTS mengikuti progres KPR di Bank BRI (OTS)','2026-10-17 07:21:46.967'),(30,1,'PROSES_BANK','PROSES_BANK','OTS','WAWANCARA',1,'Tahap diselaraskan ke WAWANCARA mengikuti progres KPR di Bank BRI (WAWANCARA)','2026-10-17 07:21:48.382'),(31,1,'PROSES_BANK','PEMBERKASAN','WAWANCARA','PENGUMPULAN_DOKUMEN',1,'sadfasdfsdf','2026-10-17 07:41:31.471'),(32,1,'PEMBERKASAN','PROSES_BANK','PENGUMPULAN_DOKUMEN','WAWANCARA',1,'Tahap dimajukan ke WAWANCARA seiring pengajuan KPR #3 ke Bank BNI','2026-10-17 07:41:42.950'),(33,1,'PROSES_BANK','PROSES_BANK','WAWANCARA','OTS',1,'Tahap diselaraskan ke OTS mengikuti progres KPR di Bank BNI (OTS)','2026-10-17 07:41:52.415'),(34,1,'PROSES_BANK','PROSES_BANK','OTS','VERIFIKASI',1,'Tahap diselaraskan ke VERIFIKASI mengikuti progres KPR di Bank BNI (VERIFIKASI)','2026-10-17 07:41:55.291'),(35,1,'PROSES_BANK','PROSES_BANK','VERIFIKASI','SP3K',1,'Tahap diselaraskan ke SP3K mengikuti progres KPR di Bank BNI (SP3K)','2026-10-17 07:42:04.055'),(36,1,'PROSES_BANK','PROSES_BANK','SP3K','OTS',1,'asdfasdf','2026-10-17 07:42:57.542'),(37,1,'PROSES_BANK','PROSES_BANK','OTS','VERIFIKASI',1,'asdfasdf','2026-10-17 07:56:35.421'),(38,1,'PROSES_BANK','PROSES_BANK','VERIFIKASI','SP3K',1,'asdfasdf','2026-10-17 07:56:54.264'),(39,1,'PROSES_BANK','AKAD_AJB','SP3K','AKAD_KREDIT',1,'asdfasdf','2026-10-17 07:58:07.161'),(40,1,'AKAD_AJB','PEMBANGUNAN','AKAD_KREDIT','PEMBANGUNAN',1,'asdfasdf','2026-10-17 08:01:06.143'),(41,1,'PEMBANGUNAN','SERAH_TERIMA','PEMBANGUNAN','BAST',1,NULL,'2026-10-17 08:02:58.360');
/*!40000 ALTER TABLE `transaksitahaplog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `no_hp` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('MARKETING','ADMIN','MANAGER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_username_key` (`username`),
  UNIQUE KEY `User_no_hp_key` (`no_hp`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'admin','Ahmad Faisal','081234567890','$2b$10$M64Mw6bMyFPgjMBpyiC.2ej84Enc86/zOgiFKT2A4msDpa1MzTIpm','ADMIN',1,'2026-10-17 04:56:51.463','2026-10-17 04:56:51.463'),(2,'marketing','Budi Darmawan','089876543210','$2b$10$0WLZejb0PfY.vM3MDcyfG.XlHCvnu7j8.Nb/4U5MR/fkWyqk5sLVW','MARKETING',1,'2026-10-17 04:56:51.498','2026-10-17 04:56:51.498'),(3,'manager','Manager','081234567891','$2b$10$yTis8.fqoTN3.x4V1dNlo.so177oznZwrJSB6wuhQ741wmyBqQJ5O','MANAGER',1,'2026-10-17 04:56:51.519','2026-10-17 04:56:51.519');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-17 17:56:26
