-- AlterEnum
-- Status baru untuk pengajuan langganan yang pembayarannya belum dikonfirmasi.
-- Ditambahkan di ujung daftar supaya cukup satu ALTER TYPE tanpa perlu
-- membangun ulang tipe enum beserta seluruh kolom yang memakainya.
-- IF NOT EXISTS supaya migrasi ini aman dijalankan ulang pada basis data yang
-- sudah pernah menerimanya (mis. lingkungan pengembangan).
ALTER TYPE "StatusLangganan" ADD VALUE IF NOT EXISTS 'MENUNGGU';

-- AlterTable
-- Pembayaran tidak lagi disimulasikan, jadi nilai bawaannya ikut diperbarui.
-- Baris lama sengaja tidak diubah: riwayat harus tetap menyebut apa adanya.
ALTER TABLE "Langganan" ALTER COLUMN "metode" SET DEFAULT 'TRANSFER_BCA';
