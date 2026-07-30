-- AlterTable
-- Blokir toko. Datanya tidak pernah dihapus, hanya aksesnya ditutup.
ALTER TABLE "Toko" ADD COLUMN     "alasanBlokir" TEXT,
ADD COLUMN     "diblokir" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "diblokirPada" TIMESTAMP(3);

-- AlterTable
-- Penanda pendapatan. Sengaja kolom waktu tersendiri, bukan diturunkan dari
-- kolom status: status berubah sepanjang umur baris (AKTIF lalu KEDALUWARSA
-- atau DIBATALKAN), jadi pendapatan yang dihitung dari status akan menghilang
-- begitu masa berlakunya lewat.
ALTER TABLE "Langganan" ADD COLUMN     "dibayarPada" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "kataSandiHash" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "masukTerakhir" TIMESTAMP(3),
    "gagalMasuk" INTEGER NOT NULL DEFAULT 0,
    "terkunciSampai" TIMESTAMP(3),
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JejakOperator" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT,
    "operatorNama" TEXT NOT NULL,
    "aksi" TEXT NOT NULL,
    "tokoId" TEXT,
    "tokoNama" TEXT,
    "rincian" TEXT,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JejakOperator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PengaturanLayanan" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "bankNama" TEXT NOT NULL DEFAULT 'BCA',
    "bankRekening" TEXT NOT NULL DEFAULT '',
    "bankPemilik" TEXT,
    "waNomor" TEXT NOT NULL DEFAULT '',
    "catatanPembayaran" TEXT,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PengaturanLayanan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Langganan_dibayarPada_idx" ON "Langganan"("dibayarPada");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_email_key" ON "Operator"("email");

-- CreateIndex
CREATE INDEX "Operator_email_idx" ON "Operator"("email");

-- CreateIndex
CREATE INDEX "JejakOperator_dibuatPada_idx" ON "JejakOperator"("dibuatPada");

-- CreateIndex
CREATE INDEX "JejakOperator_tokoId_idx" ON "JejakOperator"("tokoId");

-- AddForeignKey
ALTER TABLE "JejakOperator" ADD CONSTRAINT "JejakOperator_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Baris pengaturan langsung diisi dengan tujuan pembayaran yang sedang
-- berlaku. Kalau dibiarkan kosong, halaman langganan pelanggan kehilangan
-- nomor rekeningnya sejak deploy ini sampai ada operator yang mengisi formulir
-- — perilaku yang hari ini sudah berjalan tidak boleh mundur karena
-- pemindahan tempat penyimpanan. Sesudah ini nilainya diubah lewat panel.
INSERT INTO "PengaturanLayanan" ("id", "bankNama", "bankRekening", "waNomor", "diubahPada")
VALUES ('global', 'BCA', '0375553291', '081329732838', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
