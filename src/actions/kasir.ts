"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { konteks } from "@/lib/sesi";
import { skemaCheckout } from "@/lib/validasi";
import { akhirHariWib, awalHariWib, kunciTanggal } from "@/lib/format";
import { kodeAcak, nomorNota } from "@/lib/utils";

export type HasilCheckout =
  | {
      sukses: true;
      transaksi: { id: string; nomor: string; kodeNota: string; total: number; kembalian: number };
    }
  | { sukses: false; pesan: string };

export type ItemKirim = { produkId: string; qty: number; diskon?: number };

/**
 * Menyimpan satu penjualan.
 *
 * Seluruh langkah dijalankan dalam satu transaksi basis data supaya stok,
 * mutasi, dan nota tidak pernah setengah jadi. Semua kueri disaring dengan
 * tokoId dari sesi — id produk dari peramban tidak pernah dipercaya begitu saja.
 */
export async function simpanPenjualan(masukan: {
  item: ItemKirim[];
  diskon?: number;
  metodeBayar?: string;
  dibayar?: number;
  catatan?: string;
  namaPelangganBaru?: string;
}): Promise<HasilCheckout> {
  const k = await konteks();

  const hasil = skemaCheckout.safeParse({
    item: masukan.item,
    diskon: masukan.diskon ?? 0,
    metodeBayar: masukan.metodeBayar ?? "TUNAI",
    dibayar: masukan.dibayar ?? 0,
    catatan: masukan.catatan,
    namaPelangganBaru: masukan.namaPelangganBaru,
  });

  if (!hasil.success) {
    return { sukses: false, pesan: hasil.error.issues[0]?.message ?? "Data penjualan tidak valid." };
  }

  const data = hasil.data;

  // Gabungkan baris dengan produk yang sama agar stok terpotong sekali saja.
  const gabung = new Map<string, { qty: number; diskon: number }>();
  for (const it of data.item) {
    const ada = gabung.get(it.produkId);
    if (ada) {
      ada.qty += it.qty;
      ada.diskon += it.diskon;
    } else {
      gabung.set(it.produkId, { qty: it.qty, diskon: it.diskon });
    }
  }

  const idProduk = [...gabung.keys()];

  try {
    const transaksi = await db.$transaction(
      async (tx) => {
        const produk = await tx.produk.findMany({
          where: { id: { in: idProduk }, tokoId: k.toko.id, aktif: true },
          select: {
            id: true,
            nama: true,
            satuan: true,
            hargaJual: true,
            hargaModal: true,
            stok: true,
            lacakStok: true,
          },
        });

        if (produk.length !== idProduk.length) {
          throw new GagalKasir("Ada barang yang sudah tidak tersedia. Muat ulang halaman kasir.");
        }

        // Periksa kecukupan stok sebelum menyentuh apa pun.
        const kurang = produk
          .filter((p) => p.lacakStok && p.stok < (gabung.get(p.id)?.qty ?? 0))
          .map((p) => `${p.nama} (sisa ${p.stok})`);

        if (kurang.length > 0) {
          throw new GagalKasir(`Stok tidak cukup untuk ${kurang.join(", ")}.`);
        }

        // Hitung nilai transaksi.
        let subtotal = 0;
        let totalModal = 0;

        const barisItem = produk.map((p) => {
          const baris = gabung.get(p.id)!;
          const kotor = p.hargaJual * baris.qty;
          const diskonBaris = Math.min(baris.diskon, kotor);
          const bersih = kotor - diskonBaris;

          subtotal += bersih;
          totalModal += p.hargaModal * baris.qty;

          return {
            produkId: p.id,
            namaProduk: p.nama,
            satuan: p.satuan,
            hargaSatuan: p.hargaJual,
            modalSatuan: p.hargaModal,
            qty: baris.qty,
            diskon: diskonBaris,
            subtotal: bersih,
          };
        });

        const diskonNota = Math.min(data.diskon, subtotal);
        const setelahDiskon = subtotal - diskonNota;
        const pajak = Math.round((setelahDiskon * k.toko.persenPajak) / 100);
        const total = setelahDiskon + pajak;

        // Uang tunai yang kurang dianggap galat; non-tunai dianggap pas.
        const dibayar = data.metodeBayar === "TUNAI" ? Math.max(data.dibayar, 0) : total;
        if (data.metodeBayar === "TUNAI" && dibayar < total) {
          throw new GagalKasir("Uang yang dibayarkan kurang dari total belanja.");
        }

        const laba = setelahDiskon - totalModal;

        // Nomor nota berurutan per hari, per toko.
        const sekarang = new Date();
        const jumlahHariIni = await tx.transaksi.count({
          where: {
            tokoId: k.toko.id,
            dibuatPada: { gte: awalHariWib(sekarang), lte: akhirHariWib(sekarang) },
          },
        });

        let pelangganId: string | undefined;
        if (data.namaPelangganBaru && data.namaPelangganBaru.trim().length > 1) {
          const pelanggan = await tx.pelanggan.create({
            data: { tokoId: k.toko.id, nama: data.namaPelangganBaru.trim() },
            select: { id: true },
          });
          pelangganId = pelanggan.id;
        }

        const dibuat = await tx.transaksi.create({
          data: {
            tokoId: k.toko.id,
            penggunaId: k.sesi.uid,
            pelangganId,
            nomor: nomorNota(kunciTanggal(sekarang), jumlahHariIni + 1),
            kodeNota: kodeAcak(8),
            subtotal,
            diskon: diskonNota,
            pajak,
            total,
            totalModal,
            laba,
            metodeBayar: data.metodeBayar,
            dibayar,
            kembalian: Math.max(0, dibayar - total),
            catatan: data.catatan || null,
            item: { create: barisItem },
          },
          select: { id: true, nomor: true, kodeNota: true, total: true, kembalian: true },
        });

        // Potong stok + catat mutasi untuk setiap barang yang dilacak.
        for (const p of produk) {
          if (!p.lacakStok) continue;
          const qty = gabung.get(p.id)!.qty;

          await tx.produk.update({
            where: { id: p.id },
            data: { stok: { decrement: qty } },
          });

          await tx.mutasiStok.create({
            data: {
              tokoId: k.toko.id,
              produkId: p.id,
              penggunaId: k.sesi.uid,
              tipe: "PENJUALAN",
              qty: -qty,
              stokSebelum: p.stok,
              stokSesudah: p.stok - qty,
              refTransaksi: dibuat.id,
              catatan: dibuat.nomor,
            },
          });
        }

        return dibuat;
      },
      { timeout: 15_000 },
    );

    revalidatePath("/app");
    revalidatePath("/app/kasir");
    revalidatePath("/app/transaksi");
    revalidatePath("/app/stok");

    return { sukses: true, transaksi };
  } catch (galat) {
    if (galat instanceof GagalKasir) return { sukses: false, pesan: galat.message };

    // Bentrok nomor nota (dua kasir menyimpan bersamaan) — minta ulangi.
    if (galat instanceof Prisma.PrismaClientKnownRequestError && galat.code === "P2002") {
      return { sukses: false, pesan: "Ada transaksi lain tersimpan bersamaan. Coba tekan bayar sekali lagi." };
    }

    console.error("Gagal menyimpan penjualan:", galat);
    return { sukses: false, pesan: "Terjadi kesalahan saat menyimpan. Coba lagi." };
  }
}

class GagalKasir extends Error {}

/** Membatalkan transaksi dan mengembalikan stoknya. Khusus pemilik. */
export async function batalkanTransaksi(id: string): Promise<{ sukses: boolean; pesan: string }> {
  const k = await konteks();
  if (k.sesi.peran !== "PEMILIK") {
    return { sukses: false, pesan: "Hanya pemilik yang bisa membatalkan transaksi." };
  }

  try {
    await db.$transaction(async (tx) => {
      const trx = await tx.transaksi.findFirst({
        where: { id, tokoId: k.toko.id },
        select: {
          id: true,
          nomor: true,
          status: true,
          item: { select: { produkId: true, qty: true } },
        },
      });

      if (!trx) throw new GagalKasir("Transaksi tidak ditemukan.");
      if (trx.status === "DIBATALKAN") throw new GagalKasir("Transaksi ini sudah dibatalkan.");

      for (const it of trx.item) {
        if (!it.produkId) continue;

        const p = await tx.produk.findFirst({
          where: { id: it.produkId, tokoId: k.toko.id },
          select: { id: true, stok: true, lacakStok: true },
        });
        if (!p || !p.lacakStok) continue;

        await tx.produk.update({ where: { id: p.id }, data: { stok: { increment: it.qty } } });
        await tx.mutasiStok.create({
          data: {
            tokoId: k.toko.id,
            produkId: p.id,
            penggunaId: k.sesi.uid,
            tipe: "PEMBATALAN",
            qty: it.qty,
            stokSebelum: p.stok,
            stokSesudah: p.stok + it.qty,
            refTransaksi: trx.id,
            catatan: `Pembatalan ${trx.nomor}`,
          },
        });
      }

      await tx.transaksi.update({ where: { id: trx.id }, data: { status: "DIBATALKAN" } });
    });

    revalidatePath("/app/transaksi");
    revalidatePath("/app/stok");
    revalidatePath("/app");

    return { sukses: true, pesan: "Transaksi dibatalkan dan stok dikembalikan." };
  } catch (galat) {
    if (galat instanceof GagalKasir) return { sukses: false, pesan: galat.message };
    console.error("Gagal membatalkan transaksi:", galat);
    return { sukses: false, pesan: "Gagal membatalkan transaksi." };
  }
}
