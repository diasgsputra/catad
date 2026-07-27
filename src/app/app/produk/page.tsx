import type { Metadata } from "next";
import { db } from "@/lib/db";
import { konteks } from "@/lib/sesi";
import { JudulHalaman } from "@/components/ui";
import { ProdukKlien, type BarisProduk, type KategoriPilihan } from "./produk-klien";

export const metadata: Metadata = { title: "Daftar barang" };
export const dynamic = "force-dynamic";

export default async function HalamanProduk() {
  const k = await konteks();

  const [produk, kategori] = await Promise.all([
    db.produk.findMany({
      where: { tokoId: k.toko.id },
      select: {
        id: true,
        nama: true,
        kode: true,
        satuan: true,
        hargaJual: true,
        hargaModal: true,
        stok: true,
        stokMinimum: true,
        lacakStok: true,
        aktif: true,
        kategoriId: true,
        kategori: { select: { nama: true } },
        _count: { select: { item: true } },
      },
      orderBy: [{ aktif: "desc" }, { nama: "asc" }],
    }),
    db.kategori.findMany({
      where: { tokoId: k.toko.id },
      select: {
        id: true,
        nama: true,
        warna: true,
        _count: { select: { produk: true } },
      },
      orderBy: [{ urutan: "asc" }, { nama: "asc" }],
    }),
  ]);

  const baris: BarisProduk[] = produk.map((p) => ({
    id: p.id,
    nama: p.nama,
    kode: p.kode,
    satuan: p.satuan,
    hargaJual: p.hargaJual,
    hargaModal: p.hargaModal,
    stok: p.stok,
    stokMinimum: p.stokMinimum,
    lacakStok: p.lacakStok,
    aktif: p.aktif,
    kategoriId: p.kategoriId,
    kategoriNama: p.kategori?.nama ?? null,
    pernahTerjual: p._count.item > 0,
  }));

  const pilihanKategori: KategoriPilihan[] = kategori.map((kt) => ({
    id: kt.id,
    nama: kt.nama,
    warna: kt.warna,
    jumlah: kt._count.produk,
  }));

  return (
    <div className="p-4 sm:p-6">
      <JudulHalaman
        judul="Daftar barang"
        keterangan="Seluruh barang yang dijual di toko Anda, lengkap dengan harga modal dan stok."
      />

      <div className="mt-5">
        <ProdukKlien
          produk={baris}
          kategori={pilihanKategori}
          batasProduk={k.paket.batas.maksProduk}
          paketAktif={k.paket.aktif}
        />
      </div>
    </div>
  );
}
