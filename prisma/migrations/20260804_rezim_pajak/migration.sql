-- CreateEnum
CREATE TYPE "RezimPajak" AS ENUM ('FINAL_UMKM', 'NPPN', 'PEMBUKUAN_OP', 'PEMBUKUAN_BADAN', 'TANPA_HITUNG');

-- AlterTable
-- Parameter perhitungan pajak per toko. Nilai bawaannya sengaja sama dengan
-- perilaku sebelumnya (PPh Final 0,5% dengan fasilitas Rp500 juta), sehingga
-- toko yang sudah ada tidak berubah angkanya setelah migrasi ini.
--
-- Tarif disimpan sebagai basis poin (100 bps = 1%) agar tetap bilangan bulat.
ALTER TABLE "Toko" ADD COLUMN     "fasilitasBebas" INTEGER NOT NULL DEFAULT 500000000,
ADD COLUMN     "normaBps" INTEGER NOT NULL DEFAULT 2500,
ADD COLUMN     "pakai31E" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ptkpSetahun" INTEGER NOT NULL DEFAULT 54000000,
ADD COLUMN     "rezimPajak" "RezimPajak" NOT NULL DEFAULT 'FINAL_UMKM',
ADD COLUMN     "tarifBadanBps" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "tarifFinalBps" INTEGER NOT NULL DEFAULT 50;

-- Tarif badan bawaannya 22%, bukan nilai yang sama dengan tarif final.
ALTER TABLE "Toko" ALTER COLUMN "tarifBadanBps" SET DEFAULT 2200;
UPDATE "Toko" SET "tarifBadanBps" = 2200;

-- Toko yang jenis wajib pajaknya BADAN tidak berhak atas fasilitas Rp500 juta,
-- jadi nilainya dinolkan agar perhitungannya benar sejak awal.
UPDATE "Toko" SET "fasilitasBebas" = 0 WHERE "jenisWajibPajak" = 'BADAN';
