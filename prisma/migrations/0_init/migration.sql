-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Paket" AS ENUM ('GRATIS', 'PRO');

-- CreateEnum
CREATE TYPE "Peran" AS ENUM ('PEMILIK', 'KASIR');

-- CreateEnum
CREATE TYPE "MetodeBayar" AS ENUM ('TUNAI', 'QRIS', 'TRANSFER', 'KARTU');

-- CreateEnum
CREATE TYPE "StatusTransaksi" AS ENUM ('SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "TipeMutasi" AS ENUM ('MASUK', 'KELUAR', 'PENJUALAN', 'PENYESUAIAN', 'PEMBATALAN');

-- CreateEnum
CREATE TYPE "StatusLangganan" AS ENUM ('AKTIF', 'KEDALUWARSA', 'DIBATALKAN');

-- CreateTable
CREATE TABLE "Toko" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "jenisUsaha" TEXT NOT NULL DEFAULT 'Warung / Toko Kelontong',
    "alamat" TEXT,
    "telepon" TEXT,
    "paket" "Paket" NOT NULL DEFAULT 'GRATIS',
    "trialSampai" TIMESTAMP(3),
    "proSampai" TIMESTAMP(3),
    "catatanNota" TEXT DEFAULT 'Terima kasih sudah berbelanja 🙏',
    "persenPajak" INTEGER NOT NULL DEFAULT 0,
    "waToko" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Toko_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengguna" (
    "id" TEXT NOT NULL,
    "tokoId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "kataSandiHash" TEXT NOT NULL,
    "peran" "Peran" NOT NULL DEFAULT 'KASIR',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "masukTerakhir" TIMESTAMP(3),
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kategori" (
    "id" TEXT NOT NULL,
    "tokoId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "warna" TEXT NOT NULL DEFAULT '#12695A',
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produk" (
    "id" TEXT NOT NULL,
    "tokoId" TEXT NOT NULL,
    "kategoriId" TEXT,
    "nama" TEXT NOT NULL,
    "kode" TEXT,
    "satuan" TEXT NOT NULL DEFAULT 'pcs',
    "hargaJual" INTEGER NOT NULL,
    "hargaModal" INTEGER NOT NULL DEFAULT 0,
    "stok" INTEGER NOT NULL DEFAULT 0,
    "stokMinimum" INTEGER NOT NULL DEFAULT 5,
    "lacakStok" BOOLEAN NOT NULL DEFAULT true,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pelanggan" (
    "id" TEXT NOT NULL,
    "tokoId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "telepon" TEXT,
    "catatan" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pelanggan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaksi" (
    "id" TEXT NOT NULL,
    "tokoId" TEXT NOT NULL,
    "penggunaId" TEXT,
    "pelangganId" TEXT,
    "nomor" TEXT NOT NULL,
    "kodeNota" TEXT NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "diskon" INTEGER NOT NULL DEFAULT 0,
    "pajak" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "totalModal" INTEGER NOT NULL DEFAULT 0,
    "laba" INTEGER NOT NULL DEFAULT 0,
    "metodeBayar" "MetodeBayar" NOT NULL DEFAULT 'TUNAI',
    "dibayar" INTEGER NOT NULL DEFAULT 0,
    "kembalian" INTEGER NOT NULL DEFAULT 0,
    "catatan" TEXT,
    "status" "StatusTransaksi" NOT NULL DEFAULT 'SELESAI',
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTransaksi" (
    "id" TEXT NOT NULL,
    "transaksiId" TEXT NOT NULL,
    "produkId" TEXT,
    "namaProduk" TEXT NOT NULL,
    "satuan" TEXT NOT NULL DEFAULT 'pcs',
    "hargaSatuan" INTEGER NOT NULL,
    "modalSatuan" INTEGER NOT NULL DEFAULT 0,
    "qty" INTEGER NOT NULL,
    "diskon" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "ItemTransaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MutasiStok" (
    "id" TEXT NOT NULL,
    "tokoId" TEXT NOT NULL,
    "produkId" TEXT NOT NULL,
    "penggunaId" TEXT,
    "tipe" "TipeMutasi" NOT NULL,
    "qty" INTEGER NOT NULL,
    "stokSebelum" INTEGER NOT NULL,
    "stokSesudah" INTEGER NOT NULL,
    "catatan" TEXT,
    "refTransaksi" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MutasiStok_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengeluaran" (
    "id" TEXT NOT NULL,
    "tokoId" TEXT NOT NULL,
    "penggunaId" TEXT,
    "kategori" TEXT NOT NULL,
    "keterangan" TEXT,
    "jumlah" INTEGER NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pengeluaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Langganan" (
    "id" TEXT NOT NULL,
    "tokoId" TEXT NOT NULL,
    "paket" "Paket" NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "periodeMulai" TIMESTAMP(3) NOT NULL,
    "periodeSelesai" TIMESTAMP(3) NOT NULL,
    "status" "StatusLangganan" NOT NULL DEFAULT 'AKTIF',
    "metode" TEXT NOT NULL DEFAULT 'SIMULASI',
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Langganan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Toko_slug_key" ON "Toko"("slug");

-- CreateIndex
CREATE INDEX "Toko_slug_idx" ON "Toko"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Pengguna_email_key" ON "Pengguna"("email");

-- CreateIndex
CREATE INDEX "Pengguna_tokoId_idx" ON "Pengguna"("tokoId");

-- CreateIndex
CREATE INDEX "Pengguna_email_idx" ON "Pengguna"("email");

-- CreateIndex
CREATE INDEX "Kategori_tokoId_idx" ON "Kategori"("tokoId");

-- CreateIndex
CREATE UNIQUE INDEX "Kategori_tokoId_nama_key" ON "Kategori"("tokoId", "nama");

-- CreateIndex
CREATE INDEX "Produk_tokoId_idx" ON "Produk"("tokoId");

-- CreateIndex
CREATE INDEX "Produk_tokoId_aktif_idx" ON "Produk"("tokoId", "aktif");

-- CreateIndex
CREATE INDEX "Produk_kategoriId_idx" ON "Produk"("kategoriId");

-- CreateIndex
CREATE UNIQUE INDEX "Produk_tokoId_kode_key" ON "Produk"("tokoId", "kode");

-- CreateIndex
CREATE INDEX "Pelanggan_tokoId_idx" ON "Pelanggan"("tokoId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaksi_kodeNota_key" ON "Transaksi"("kodeNota");

-- CreateIndex
CREATE INDEX "Transaksi_tokoId_dibuatPada_idx" ON "Transaksi"("tokoId", "dibuatPada");

-- CreateIndex
CREATE INDEX "Transaksi_tokoId_status_idx" ON "Transaksi"("tokoId", "status");

-- CreateIndex
CREATE INDEX "Transaksi_kodeNota_idx" ON "Transaksi"("kodeNota");

-- CreateIndex
CREATE UNIQUE INDEX "Transaksi_tokoId_nomor_key" ON "Transaksi"("tokoId", "nomor");

-- CreateIndex
CREATE INDEX "ItemTransaksi_transaksiId_idx" ON "ItemTransaksi"("transaksiId");

-- CreateIndex
CREATE INDEX "ItemTransaksi_produkId_idx" ON "ItemTransaksi"("produkId");

-- CreateIndex
CREATE INDEX "MutasiStok_tokoId_dibuatPada_idx" ON "MutasiStok"("tokoId", "dibuatPada");

-- CreateIndex
CREATE INDEX "MutasiStok_produkId_dibuatPada_idx" ON "MutasiStok"("produkId", "dibuatPada");

-- CreateIndex
CREATE INDEX "Pengeluaran_tokoId_tanggal_idx" ON "Pengeluaran"("tokoId", "tanggal");

-- CreateIndex
CREATE INDEX "Langganan_tokoId_dibuatPada_idx" ON "Langganan"("tokoId", "dibuatPada");

-- AddForeignKey
ALTER TABLE "Pengguna" ADD CONSTRAINT "Pengguna_tokoId_fkey" FOREIGN KEY ("tokoId") REFERENCES "Toko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kategori" ADD CONSTRAINT "Kategori_tokoId_fkey" FOREIGN KEY ("tokoId") REFERENCES "Toko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produk" ADD CONSTRAINT "Produk_tokoId_fkey" FOREIGN KEY ("tokoId") REFERENCES "Toko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produk" ADD CONSTRAINT "Produk_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "Kategori"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pelanggan" ADD CONSTRAINT "Pelanggan_tokoId_fkey" FOREIGN KEY ("tokoId") REFERENCES "Toko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_tokoId_fkey" FOREIGN KEY ("tokoId") REFERENCES "Toko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_pelangganId_fkey" FOREIGN KEY ("pelangganId") REFERENCES "Pelanggan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransaksi" ADD CONSTRAINT "ItemTransaksi_transaksiId_fkey" FOREIGN KEY ("transaksiId") REFERENCES "Transaksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransaksi" ADD CONSTRAINT "ItemTransaksi_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutasiStok" ADD CONSTRAINT "MutasiStok_tokoId_fkey" FOREIGN KEY ("tokoId") REFERENCES "Toko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutasiStok" ADD CONSTRAINT "MutasiStok_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutasiStok" ADD CONSTRAINT "MutasiStok_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengeluaran" ADD CONSTRAINT "Pengeluaran_tokoId_fkey" FOREIGN KEY ("tokoId") REFERENCES "Toko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengeluaran" ADD CONSTRAINT "Pengeluaran_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Langganan" ADD CONSTRAINT "Langganan_tokoId_fkey" FOREIGN KEY ("tokoId") REFERENCES "Toko"("id") ON DELETE CASCADE ON UPDATE CASCADE;

