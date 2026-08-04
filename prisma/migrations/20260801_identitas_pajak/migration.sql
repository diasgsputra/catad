-- CreateEnum
CREATE TYPE "JenisWajibPajak" AS ENUM ('ORANG_PRIBADI', 'BADAN');

-- AlterTable
-- Identitas untuk kepala dokumen laporan pajak. Semuanya boleh kosong: toko
-- yang belum punya NPWP tetap bisa memakai laporannya untuk pembukuan sendiri.
-- Jenis wajib pajak diberi nilai bawaan ORANG_PRIBADI karena hampir seluruh
-- pengguna Catad adalah usaha perseorangan, dan itu pula yang menentukan
-- berlaku tidaknya fasilitas Rp500 juta bebas PPh.
ALTER TABLE "Toko" ADD COLUMN     "jenisWajibPajak" "JenisWajibPajak" NOT NULL DEFAULT 'ORANG_PRIBADI',
ADD COLUMN     "namaWajibPajak" TEXT,
ADD COLUMN     "npwp" TEXT;
