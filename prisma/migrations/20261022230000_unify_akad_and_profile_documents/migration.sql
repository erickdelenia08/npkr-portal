-- AlterTable Customer
ALTER TABLE `Customer`
  ADD COLUMN `status_pernikahan` ENUM('MENIKAH', 'BELUM_MENIKAH', 'CERAI') NULL,
  ADD COLUMN `status_pekerjaan` ENUM('TETAP', 'TIDAK_TETAP') NULL;

-- AlterTable DokumenTransaksi (Update JenisDokumen enum)
ALTER TABLE `DokumenTransaksi`
  MODIFY COLUMN `jenis` ENUM(
    'KTP_SUAMI_ISTRI',
    'KTP_PEMOHON',
    'KTP_PASANGAN',
    'KARTU_KELUARGA',
    'NPWP',
    'BUKU_NIKAH',
    'SURAT_PERNYATAAN_BELUM_MENIKAH',
    'AKTA_CERAI',
    'SLIP_GAJI',
    'SURAT_KET_KERJA',
    'REKENING_KORAN',
    'SURAT_KET_BELUM_PUNYA_RUMAH',
    'SKU_WIRAUSAHA',
    'LAPORAN_KEUANGAN',
    'LEGALITAS_LAINNYA'
  ) NOT NULL;

-- Backfill tgl_akad = tgl_ajb for Cash transactions where tgl_akad is null
UPDATE `Transaksi`
  SET `tgl_akad` = `tgl_ajb`
  WHERE `tgl_akad` IS NULL AND `tgl_ajb` IS NOT NULL;

-- Backfill DokumenTransaksi: safe migration from KTP_SUAMI_ISTRI to KTP_PEMOHON
-- 1. Remove duplicate KTP_SUAMI_ISTRI if KTP_PEMOHON already exists for the transaction
DELETE d1 FROM `DokumenTransaksi` d1
  INNER JOIN `DokumenTransaksi` d2 ON d1.transaksi_id = d2.transaksi_id
  WHERE d1.jenis = 'KTP_SUAMI_ISTRI' AND d2.jenis = 'KTP_PEMOHON';

-- 2. Rename remaining KTP_SUAMI_ISTRI to KTP_PEMOHON
UPDATE `DokumenTransaksi`
  SET `jenis` = 'KTP_PEMOHON'
  WHERE `jenis` = 'KTP_SUAMI_ISTRI';
