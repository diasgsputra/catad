import type { Metadata } from "next";
import { db } from "@/lib/db";
import { konteks } from "@/lib/sesi";
import { KasirKlien, type ProdukKasir } from "./kasir-klien";

export const metadata: Metadata = { title: "Kasir" };
export const dynamic = "force-dynamic";

export default async function HalamanKasir() {
  const k = await konteks();

  const [produk, kategori] = await Promise.all([
    db.produk.findMany({
      where: { tokoId: k.toko.id, aktif: true },
      select: {
        id: true,
        nama: true,
        kode: true,
        satuan: true,
        hargaJual: true,
        stok: true,
        lacakStok: true,
        kategoriId: true,
        kategori: { select: { nama: true } },
      },
      orderBy: [{ nama: "asc" }],
    }),
    db.kategori.findMany({
      where: { tokoId: k.toko.id },
      select: { id: true, nama: true },
      orderBy: [{ urutan: "asc" }, { nama: "asc" }],
    }),
  ]);

  const daftar: ProdukKasir[] = produk.map((p) => ({
    id: p.id,
    nama: p.nama,
    kode: p.kode,
    satuan: p.satuan,
    hargaJual: p.hargaJual,
    stok: p.stok,
    lacakStok: p.lacakStok,
    kategoriId: p.kategoriId,
    kategoriNama: p.kategori?.nama ?? null,
  }));

  // Sembunyikan kategori yang tidak punya barang aktif agar bar filter ringkas.
  const kategoriTerpakai = kategori.filter((kt) => daftar.some((p) => p.kategoriId === kt.id));

  return (
    <KasirKlien
      produk={daftar}
      kategori={kategoriTerpakai}
      persenPajak={k.toko.persenPajak}
      namaToko={k.toko.nama}
    />
  );
}
