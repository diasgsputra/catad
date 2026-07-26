"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { konteks } from "@/lib/sesi";
import { skemaKategori, skemaPenyesuaianStok, skemaProduk, galatForm } from "@/lib/validasi";
import { pesanBatas } from "@/lib/plan";

export type HasilAksi = {
  sukses?: boolean;
  pesan?: string;
  galat?: Record<string, string>;
};

/** Menambah atau memperbarui satu barang. */
export async function simpanProduk(_sebelum: HasilAksi, data: FormData): Promise<HasilAksi> {
  const k = await konteks();

  const hasil = skemaProduk.safeParse({
    id: data.get("id") || undefined,
    nama: data.get("nama"),
    kode: data.get("kode") || undefined,
    kategoriId: data.get("kategoriId") || undefined,
    satuan: data.get("satuan") || "pcs",
    hargaJual: data.get("hargaJual"),
    hargaModal: data.get("hargaModal") || 0,
    stok: data.get("stok") || 0,
    stokMinimum: data.get("stokMinimum") || 5,
    // Kotak centang: ada di FormData hanya bila tercentang.
    lacakStok: data.get("lacakStok") !== null,
    aktif: data.get("aktif") !== null,
  });

  if (!hasil.success) return { galat: galatForm(hasil.error) };
  const d = hasil.data;

  // Kategori harus milik toko ini.
  let kategoriId: string | null = null;
  if (d.kategoriId) {
    const kt = await db.kategori.findFirst({
      where: { id: d.kategoriId, tokoId: k.toko.id },
      select: { id: true },
    });
    kategoriId = kt?.id ?? null;
  }

  const kode = d.kode?.trim() ? d.kode.trim() : null;

  try {
    if (d.id) {
      // ── Ubah ──
      const ada = await db.produk.findFirst({
        where: { id: d.id, tokoId: k.toko.id },
        select: { id: true, stok: true },
      });
      if (!ada) return { galat: { _: "Barang tidak ditemukan." } };

      await db.produk.update({
        where: { id: ada.id },
        data: {
          nama: d.nama,
          kode,
          kategoriId,
          satuan: d.satuan,
          hargaJual: d.hargaJual,
          hargaModal: d.hargaModal,
          stokMinimum: d.stokMinimum,
          lacakStok: d.lacakStok,
          aktif: d.aktif,
        },
      });

      // Perubahan stok lewat form dicatat sebagai penyesuaian.
      if (d.lacakStok && d.stok !== ada.stok) {
        const selisih = d.stok - ada.stok;
        await db.$transaction([
          db.produk.update({ where: { id: ada.id }, data: { stok: d.stok } }),
          db.mutasiStok.create({
            data: {
              tokoId: k.toko.id,
              produkId: ada.id,
              penggunaId: k.sesi.uid,
              tipe: "PENYESUAIAN",
              qty: selisih,
              stokSebelum: ada.stok,
              stokSesudah: d.stok,
              catatan: "Diubah lewat form barang",
            },
          }),
        ]);
      }
    } else {
      // ── Tambah ──
      const jumlah = await db.produk.count({ where: { tokoId: k.toko.id } });
      if (jumlah >= k.paket.batas.maksProduk) {
        return { galat: { _: pesanBatas("produk", k.paket.batas) } };
      }

      const produkBaru = await db.produk.create({
        data: {
          tokoId: k.toko.id,
          nama: d.nama,
          kode,
          kategoriId,
          satuan: d.satuan,
          hargaJual: d.hargaJual,
          hargaModal: d.hargaModal,
          stok: d.lacakStok ? d.stok : 0,
          stokMinimum: d.stokMinimum,
          lacakStok: d.lacakStok,
          aktif: d.aktif,
        },
        select: { id: true },
      });

      if (d.lacakStok && d.stok > 0) {
        await db.mutasiStok.create({
          data: {
            tokoId: k.toko.id,
            produkId: produkBaru.id,
            penggunaId: k.sesi.uid,
            tipe: "MASUK",
            qty: d.stok,
            stokSebelum: 0,
            stokSesudah: d.stok,
            catatan: "Stok awal",
          },
        });
      }
    }
  } catch (galat) {
    if (galat instanceof Prisma.PrismaClientKnownRequestError && galat.code === "P2002") {
      return { galat: { kode: "Kode barang ini sudah dipakai barang lain." } };
    }
    console.error("Gagal menyimpan produk:", galat);
    return { galat: { _: "Gagal menyimpan barang. Coba lagi." } };
  }

  revalidatePath("/app/produk");
  revalidatePath("/app/kasir");
  revalidatePath("/app/stok");
  revalidatePath("/app/insight");

  return { sukses: true, pesan: d.id ? "Barang diperbarui." : "Barang ditambahkan." };
}

/**
 * Menghapus barang. Bila sudah pernah terjual, barang hanya dinonaktifkan
 * supaya riwayat transaksi tetap utuh.
 */
export async function hapusProduk(id: string): Promise<HasilAksi> {
  const k = await konteks();

  const produk = await db.produk.findFirst({
    where: { id, tokoId: k.toko.id },
    select: { id: true, nama: true, _count: { select: { item: true } } },
  });
  if (!produk) return { pesan: "Barang tidak ditemukan." };

  if (produk._count.item > 0) {
    await db.produk.update({ where: { id: produk.id }, data: { aktif: false } });
    revalidatePath("/app/produk");
    revalidatePath("/app/kasir");
    return {
      sukses: true,
      pesan: `${produk.nama} diarsipkan karena sudah punya riwayat penjualan.`,
    };
  }

  await db.produk.delete({ where: { id: produk.id } });
  revalidatePath("/app/produk");
  revalidatePath("/app/kasir");
  revalidatePath("/app/stok");

  return { sukses: true, pesan: `${produk.nama} dihapus.` };
}

export async function ubahAktifProduk(id: string, aktif: boolean): Promise<HasilAksi> {
  const k = await konteks();
  const hasil = await db.produk.updateMany({
    where: { id, tokoId: k.toko.id },
    data: { aktif },
  });
  if (hasil.count === 0) return { pesan: "Barang tidak ditemukan." };

  revalidatePath("/app/produk");
  revalidatePath("/app/kasir");
  return { sukses: true, pesan: aktif ? "Barang diaktifkan." : "Barang diarsipkan." };
}

// ── Kategori ────────────────────────────────────────────────────────────────

export async function simpanKategori(_sebelum: HasilAksi, data: FormData): Promise<HasilAksi> {
  const k = await konteks();

  const hasil = skemaKategori.safeParse({
    nama: data.get("nama"),
    warna: data.get("warna") || "#12695A",
  });
  if (!hasil.success) return { galat: galatForm(hasil.error) };

  try {
    await db.kategori.create({
      data: { tokoId: k.toko.id, nama: hasil.data.nama, warna: hasil.data.warna },
    });
  } catch (galat) {
    if (galat instanceof Prisma.PrismaClientKnownRequestError && galat.code === "P2002") {
      return { galat: { nama: "Kategori dengan nama ini sudah ada." } };
    }
    return { galat: { _: "Gagal menyimpan kategori." } };
  }

  revalidatePath("/app/produk");
  revalidatePath("/app/kasir");
  return { sukses: true, pesan: "Kategori ditambahkan." };
}

export async function hapusKategori(id: string): Promise<HasilAksi> {
  const k = await konteks();
  const hasil = await db.kategori.deleteMany({ where: { id, tokoId: k.toko.id } });
  if (hasil.count === 0) return { pesan: "Kategori tidak ditemukan." };

  revalidatePath("/app/produk");
  revalidatePath("/app/kasir");
  return { sukses: true, pesan: "Kategori dihapus. Barangnya tidak ikut terhapus." };
}

// ── Penyesuaian stok ────────────────────────────────────────────────────────

export async function sesuaikanStok(_sebelum: HasilAksi, data: FormData): Promise<HasilAksi> {
  const k = await konteks();

  const hasil = skemaPenyesuaianStok.safeParse({
    produkId: data.get("produkId"),
    tipe: data.get("tipe"),
    qty: data.get("qty"),
    catatan: data.get("catatan") || undefined,
  });
  if (!hasil.success) return { galat: galatForm(hasil.error) };
  const d = hasil.data;

  const produk = await db.produk.findFirst({
    where: { id: d.produkId, tokoId: k.toko.id },
    select: { id: true, nama: true, stok: true, lacakStok: true },
  });
  if (!produk) return { galat: { _: "Barang tidak ditemukan." } };
  if (!produk.lacakStok) return { galat: { _: `${produk.nama} tidak memakai pelacakan stok.` } };

  // PENYESUAIAN = stok diset ke angka baru, MASUK/KELUAR = ditambah/dikurangi.
  const stokSesudah =
    d.tipe === "MASUK"
      ? produk.stok + d.qty
      : d.tipe === "KELUAR"
        ? produk.stok - d.qty
        : d.qty;

  if (stokSesudah < 0) {
    return { galat: { qty: `Stok tidak cukup. Sisa sekarang ${produk.stok}.` } };
  }

  await db.$transaction([
    db.produk.update({ where: { id: produk.id }, data: { stok: stokSesudah } }),
    db.mutasiStok.create({
      data: {
        tokoId: k.toko.id,
        produkId: produk.id,
        penggunaId: k.sesi.uid,
        tipe: d.tipe,
        qty: stokSesudah - produk.stok,
        stokSebelum: produk.stok,
        stokSesudah,
        catatan: d.catatan || null,
      },
    }),
  ]);

  revalidatePath("/app/stok");
  revalidatePath("/app/produk");
  revalidatePath("/app/kasir");
  revalidatePath("/app/insight");

  return {
    sukses: true,
    pesan: `Stok ${produk.nama} kini ${stokSesudah}.`,
  };
}
