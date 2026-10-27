/*
  Warnings:

  - The values [DISETUJUI] on the enum `PengajuanKPRLog_status_sesudah` will be removed. If these variants are still used in the database, this will fail.
  - The values [DISETUJUI] on the enum `PengajuanKPRLog_status_sesudah` will be removed. If these variants are still used in the database, this will fail.
  - The values [DISETUJUI] on the enum `PengajuanKPRLog_status_sesudah` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `PengajuanKPR` MODIFY `status` ENUM('DIAJUKAN', 'WAWANCARA', 'OTS', 'VERIFIKASI', 'SP3K', 'DITOLAK', 'DIBATALKAN') NOT NULL DEFAULT 'DIAJUKAN';

-- AlterTable
ALTER TABLE `PengajuanKPRLog` MODIFY `status_sebelum` ENUM('DIAJUKAN', 'WAWANCARA', 'OTS', 'VERIFIKASI', 'SP3K', 'DITOLAK', 'DIBATALKAN') NULL,
    MODIFY `status_sesudah` ENUM('DIAJUKAN', 'WAWANCARA', 'OTS', 'VERIFIKASI', 'SP3K', 'DITOLAK', 'DIBATALKAN') NOT NULL;
