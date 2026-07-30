/**
 * Pembuat data demo Catad.
 *
 * Dipakai dua jalur sekaligus, karena itu tinggal di sini dan bukan di dalam
 * skrip seed:
 *   1. `prisma/seed.ts` saat container migrasi berjalan dengan SEED_DEMO=true;
 *   2. tombol "coba akun demo" di halaman masuk, lewat server action.
 *
 * Semua angka dibangkitkan dari benih tetap, jadi isi toko demo selalu sama
 * bentuknya walau dibuat berkali-kali di server berbeda.
 */

import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AKUN_DEMO } from "./akun-demo";

const OFFSET_WIB = 7 * 60 * 60 * 1000;
const MS_HARI = 24 * 60 * 60 * 1000;

export { AKUN_DEMO };

/** Awal hari (00:00 WIB) sebagai Date UTC. */
function awalHariWib(tanggal: Date): Date {
  const w = new Date(tanggal.getTime() + OFFSET_WIB);
  return new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()) - OFFSET_WIB);
}

function kunciTanggal(tanggal: Date): string {
  const w = new Date(tanggal.getTime() + OFFSET_WIB);
  return `${w.getUTCFullYear()}-${String(w.getUTCMonth() + 1).padStart(2, "0")}-${String(
    w.getUTCDate(),
  ).padStart(2, "0")}`;
}

function nomorNota(kunci: string, urutan: number): string {
  return `TRX-${kunci.replace(/-/g, "")}-${String(urutan).padStart(4, "0")}`;
}

const ABJAD = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Pembangkit acak berbenih tetap. Dibuat sebagai factory supaya setiap
 * pemanggilan buatDataDemo() memulai deret yang sama persis.
 */
function pembangkitAcak(benihAwal = 20260725) {
  let benih = benihAwal;

  const acak = () => {
    benih = (benih * 1_103_515_245 + 12_345) % 2_147_483_648;
    return benih / 2_147_483_648;
  };

  return {
    acak,
    acakBulat: (min: number, maks: number) => Math.floor(acak() * (maks - min + 1)) + min,
    pilih: <T,>(daftar: readonly T[]): T => daftar[Math.floor(acak() * daftar.length)],
    kodeAcak: (panjang = 8) => {
      let hasil = "";
      for (let i = 0; i < panjang; i += 1) hasil += ABJAD[Math.floor(acak() * ABJAD.length)];
      return hasil;
    },
  };
}

// ── Katalog demo ────────────────────────────────────────────────────────────

const KATEGORI = [
  { nama: "Makanan", warna: "#C2680E" },
  { nama: "Minuman", warna: "#0F6B57" },
  { nama: "Sembako", warna: "#8A6D1F" },
  { nama: "Rokok", warna: "#7A4A3A" },
  { nama: "Lainnya", warna: "#4A5A6B" },
] as const;

type BarangDemo = {
  nama: string;
  kat: string;
  jual: number;
  modal: number;
  stok: number;
  min: number;
  satuan: string;
  /** Seberapa sering barang ini terjual. 0 = sengaja dibuat mandek. */
  bobot: number;
  lacak?: boolean;
};

const PRODUK: BarangDemo[] = [
  { nama: "Beras Pandan Wangi 5kg", kat: "Sembako", jual: 72_000, modal: 65_000, stok: 14, min: 6, satuan: "sak", bobot: 7 },
  { nama: "Minyak Goreng 1L", kat: "Sembako", jual: 18_500, modal: 16_000, stok: 6, min: 12, satuan: "pcs", bobot: 12 },
  { nama: "Gula Pasir 1kg", kat: "Sembako", jual: 16_000, modal: 13_500, stok: 0, min: 10, satuan: "kg", bobot: 11 },
  { nama: "Telur Ayam", kat: "Sembako", jual: 29_000, modal: 26_000, stok: 9, min: 8, satuan: "kg", bobot: 9 },
  { nama: "Tepung Terigu 1kg", kat: "Sembako", jual: 13_000, modal: 11_000, stok: 22, min: 8, satuan: "pcs", bobot: 4 },
  { nama: "Garam Halus", kat: "Sembako", jual: 4_000, modal: 2_800, stok: 40, min: 10, satuan: "pcs", bobot: 3 },

  { nama: "Indomie Goreng", kat: "Makanan", jual: 3_800, modal: 3_100, stok: 96, min: 30, satuan: "pcs", bobot: 22 },
  { nama: "Indomie Kuah Ayam Bawang", kat: "Makanan", jual: 3_600, modal: 2_950, stok: 74, min: 30, satuan: "pcs", bobot: 15 },
  { nama: "Roti Tawar", kat: "Makanan", jual: 15_000, modal: 12_500, stok: 8, min: 5, satuan: "pcs", bobot: 6 },
  { nama: "Biskuit Kaleng", kat: "Makanan", jual: 42_000, modal: 36_000, stok: 7, min: 3, satuan: "pcs", bobot: 1 },
  { nama: "Gorengan (per biji)", kat: "Makanan", jual: 2_000, modal: 1_100, stok: 0, min: 0, satuan: "pcs", bobot: 18, lacak: false },

  { nama: "Es Teh Manis", kat: "Minuman", jual: 4_000, modal: 1_400, stok: 0, min: 0, satuan: "gelas", bobot: 26, lacak: false },
  { nama: "Kopi Sachet", kat: "Minuman", jual: 2_500, modal: 1_800, stok: 120, min: 40, satuan: "pcs", bobot: 20 },
  { nama: "Air Mineral 600ml", kat: "Minuman", jual: 4_000, modal: 2_900, stok: 48, min: 24, satuan: "pcs", bobot: 17 },
  { nama: "Teh Kotak", kat: "Minuman", jual: 5_500, modal: 4_300, stok: 30, min: 12, satuan: "pcs", bobot: 10 },
  { nama: "Susu Kental Manis", kat: "Minuman", jual: 12_500, modal: 10_500, stok: 18, min: 6, satuan: "pcs", bobot: 5 },
  { nama: "Sirup Markisa", kat: "Minuman", jual: 24_000, modal: 20_000, stok: 11, min: 4, satuan: "pcs", bobot: 0 },

  { nama: "Rokok Filter 12", kat: "Rokok", jual: 23_000, modal: 21_500, stok: 24, min: 10, satuan: "bks", bobot: 14 },
  { nama: "Rokok Kretek 12", kat: "Rokok", jual: 21_000, modal: 19_800, stok: 16, min: 10, satuan: "bks", bobot: 9 },

  { nama: "Sabun Mandi Batang", kat: "Lainnya", jual: 5_500, modal: 4_200, stok: 36, min: 12, satuan: "pcs", bobot: 7 },
  { nama: "Deterjen Sachet", kat: "Lainnya", jual: 3_000, modal: 2_200, stok: 60, min: 20, satuan: "pcs", bobot: 11 },
  { nama: "Gas LPG 3kg (isi ulang)", kat: "Lainnya", jual: 23_000, modal: 20_000, stok: 5, min: 4, satuan: "tabung", bobot: 6 },
  { nama: "Baterai AA (isi 2)", kat: "Lainnya", jual: 9_000, modal: 6_500, stok: 14, min: 6, satuan: "pak", bobot: 0 },
  { nama: "Pulsa Listrik 20rb", kat: "Lainnya", jual: 22_000, modal: 20_000, stok: 0, min: 0, satuan: "voucher", bobot: 8, lacak: false },
];

const METODE = ["TUNAI", "TUNAI", "TUNAI", "TUNAI", "QRIS", "QRIS", "TRANSFER"] as const;

/**
 * Hanya biaya operasional. Kulakan barang sengaja tidak dicatat: modalnya
 * sudah terhitung lewat hargaModal di setiap penjualan, jadi mencatatnya lagi
 * akan menghitung modal dua kali.
 */
const PENGELUARAN = [
  { kategori: "Sewa tempat", jumlah: 700_000, keterangan: "Sewa kios bulan ini", hariLalu: 20 },
  { kategori: "Gaji & upah", jumlah: 500_000, keterangan: "Upah bantu jaga warung", hariLalu: 7 },
  { kategori: "Listrik & air", jumlah: 245_000, keterangan: "Token listrik + PDAM", hariLalu: 5 },
  { kategori: "Transport", jumlah: 120_000, keterangan: "Bensin ambil barang", hariLalu: 3 },
  { kategori: "Kemasan", jumlah: 80_000, keterangan: "Kantong plastik & kertas bungkus", hariLalu: 12 },
  { kategori: "Pajak & retribusi", jumlah: 50_000, keterangan: "Retribusi kebersihan", hariLalu: 14 },
];

// ── Pembuatan ───────────────────────────────────────────────────────────────

export type RingkasanToko = {
  toko: string;
  produk: number;
  transaksi: number;
  omzet: number;
};

type OpsiToko = {
  namaToko: string;
  slug: string;
  jenisUsaha: string;
  alamat: string;
  telepon: string;
  pro: boolean;
  hariTransaksi: number;
  pemilik: { nama: string; email: string; sandi: string };
  kasir?: { nama: string; email: string; sandi: string };
};

async function buatToko(
  db: PrismaClient,
  rng: ReturnType<typeof pembangkitAcak>,
  o: OpsiToko,
): Promise<RingkasanToko> {
  const { acak, acakBulat, pilih, kodeAcak } = rng;
  const sekarang = new Date();

  const toko = await db.toko.create({
    data: {
      nama: o.namaToko,
      slug: o.slug,
      jenisUsaha: o.jenisUsaha,
      alamat: o.alamat,
      telepon: o.telepon,
      waToko: o.telepon.replace(/^0/, "62"),
      paket: o.pro ? "PRO" : "GRATIS",
      proSampai: o.pro ? new Date(sekarang.getTime() + 335 * MS_HARI) : null,
      // Toko gratis: uji cobanya sudah lewat, supaya tampilan "terkunci" ikut teruji.
      trialSampai: o.pro
        ? new Date(sekarang.getTime() + 300 * MS_HARI)
        : new Date(sekarang.getTime() - 3 * MS_HARI),
      persenPajak: 0,
      catatanNota: "Terima kasih sudah berbelanja",
      dibuatPada: new Date(sekarang.getTime() - (o.hariTransaksi + 4) * MS_HARI),
    },
  });

  if (o.pro) {
    await db.langganan.create({
      data: {
        tokoId: toko.id,
        paket: "PRO",
        jumlah: 470_000,
        periodeMulai: new Date(sekarang.getTime() - 30 * MS_HARI),
        periodeSelesai: new Date(sekarang.getTime() + 335 * MS_HARI),
        status: "AKTIF",
        metode: "DEMO",
      },
    });
  }

  const kategori: Record<string, string> = {};
  for (const [i, k] of KATEGORI.entries()) {
    const dibuat = await db.kategori.create({
      data: { tokoId: toko.id, nama: k.nama, warna: k.warna, urutan: i },
    });
    kategori[k.nama] = dibuat.id;
  }

  const orang: Array<{ id: string }> = [];
  orang.push(
    await db.pengguna.create({
      data: {
        tokoId: toko.id,
        nama: o.pemilik.nama,
        email: o.pemilik.email,
        kataSandiHash: await bcrypt.hash(o.pemilik.sandi, 10),
        peran: "PEMILIK",
        masukTerakhir: sekarang,
      },
      select: { id: true },
    }),
  );

  if (o.kasir) {
    orang.push(
      await db.pengguna.create({
        data: {
          tokoId: toko.id,
          nama: o.kasir.nama,
          email: o.kasir.email,
          kataSandiHash: await bcrypt.hash(o.kasir.sandi, 10),
          peran: "KASIR",
          masukTerakhir: new Date(sekarang.getTime() - 2 * MS_HARI),
        },
        select: { id: true },
      }),
    );
  }

  // Stok yang tersimpan adalah stok AKHIR. Karena transaksi demo dibuat di masa
  // lalu, stok awal dihitung = stok akhir + total yang terjual, lalu dikurangi
  // seiring transaksi dibuat. Dengan begitu mutasi stok tetap konsisten.
  const produk: Array<BarangDemo & { id: string; lacak: boolean; stokAkhir: number; terjual: number }> = [];
  for (const p of PRODUK) {
    const lacak = p.lacak !== false;
    const dibuat = await db.produk.create({
      data: {
        tokoId: toko.id,
        kategoriId: kategori[p.kat],
        nama: p.nama,
        kode: `${o.slug.slice(0, 3).toUpperCase()}${String(produk.length + 1).padStart(3, "0")}`,
        satuan: p.satuan,
        hargaJual: p.jual,
        hargaModal: p.modal,
        stok: 0,
        stokMinimum: p.min,
        lacakStok: lacak,
      },
      select: { id: true },
    });
    produk.push({ ...p, id: dibuat.id, lacak, stokAkhir: p.stok, terjual: 0 });
  }

  // ── Rencana waktu transaksi ──
  const rencana: Date[] = [];
  for (let hariLalu = o.hariTransaksi - 1; hariLalu >= 0; hariLalu -= 1) {
    const tanggal = awalHariWib(new Date(sekarang.getTime() - hariLalu * MS_HARI));
    const hariMinggu = new Date(tanggal.getTime() + OFFSET_WIB).getUTCDay();

    // Akhir pekan lebih ramai; hari ini hanya sampai jam sekarang.
    const dasar = hariMinggu === 0 || hariMinggu === 6 ? 22 : 15;
    let jumlahTrx = acakBulat(dasar - 5, dasar + 6);
    if (hariLalu === 0) jumlahTrx = Math.max(3, Math.round(jumlahTrx * 0.55));

    for (let i = 0; i < jumlahTrx; i += 1) {
      // Jam ramai: pagi 07-09 dan sore 16-19.
      const gugus = acak();
      const jam =
        gugus < 0.3
          ? acakBulat(7, 9)
          : gugus < 0.5
            ? acakBulat(10, 15)
            : gugus < 0.9
              ? acakBulat(16, 19)
              : acakBulat(20, 21);
      const menit = acakBulat(0, 59);

      const waktu = new Date(tanggal.getTime() + jam * 3_600_000 + menit * 60_000);
      if (waktu > sekarang) continue;

      rencana.push(waktu);
    }
  }

  rencana.sort((a, b) => a.getTime() - b.getTime());

  // Kandidat barang berdasarkan bobot penjualan.
  const kantong: typeof produk = [];
  for (const p of produk) {
    for (let i = 0; i < p.bobot; i += 1) kantong.push(p);
  }

  const transaksiPerHari = new Map<string, number>();
  const rencanaItem: Array<{
    waktu: Date;
    nomor: string;
    kodeNota: string;
    subtotal: number;
    diskon: number;
    total: number;
    totalModal: number;
    laba: number;
    metode: (typeof METODE)[number];
    dibayar: number;
    kembalian: number;
    penggunaId: string;
    baris: Array<{
      produkId: string;
      namaProduk: string;
      satuan: string;
      hargaSatuan: number;
      modalSatuan: number;
      qty: number;
      diskon: number;
      subtotal: number;
    }>;
  }> = [];

  for (const waktu of rencana) {
    const kunci = kunciTanggal(waktu);
    const urutan = (transaksiPerHari.get(kunci) ?? 0) + 1;
    transaksiPerHari.set(kunci, urutan);

    const jumlahBaris = acak() < 0.45 ? 1 : acak() < 0.8 ? acakBulat(2, 3) : acakBulat(4, 6);
    const dipilih = new Map<string, { p: (typeof produk)[number]; qty: number }>();

    for (let i = 0; i < jumlahBaris; i += 1) {
      const p = pilih(kantong);
      if (!p) continue;
      const qty = p.jual >= 40_000 ? 1 : acak() < 0.7 ? 1 : acakBulat(2, 4);
      dipilih.set(p.id, { p, qty: (dipilih.get(p.id)?.qty ?? 0) + qty });
    }

    if (dipilih.size === 0) continue;

    const baris = [...dipilih.values()].map(({ p, qty }) => {
      p.terjual += qty;
      return {
        produkId: p.id,
        namaProduk: p.nama,
        satuan: p.satuan,
        hargaSatuan: p.jual,
        modalSatuan: p.modal,
        qty,
        diskon: 0,
        subtotal: p.jual * qty,
      };
    });

    const subtotal = baris.reduce((t, b) => t + b.subtotal, 0);
    const totalModal = baris.reduce((t, b) => t + b.modalSatuan * b.qty, 0);

    // Sesekali beri diskon kecil.
    const diskon = acak() < 0.08 ? Math.min(subtotal, acakBulat(1, 5) * 1_000) : 0;
    const total = subtotal - diskon;
    const metode = pilih(METODE);
    const dibayar = metode === "TUNAI" ? Math.ceil(total / 5_000) * 5_000 : total;

    rencanaItem.push({
      waktu,
      nomor: nomorNota(kunci, urutan),
      kodeNota: kodeAcak(8),
      subtotal,
      diskon,
      total,
      totalModal,
      laba: total - totalModal,
      metode,
      dibayar,
      kembalian: dibayar - total,
      penggunaId: orang.length > 1 && acak() < 0.35 ? orang[1].id : orang[0].id,
      baris,
    });
  }

  // Sekarang stok awal bisa dihitung: stok akhir + seluruh yang terjual.
  for (const p of produk) {
    if (!p.lacak) continue;
    const stokAwal = p.stokAkhir + p.terjual;
    await db.produk.update({ where: { id: p.id }, data: { stok: stokAwal } });
    await db.mutasiStok.create({
      data: {
        tokoId: toko.id,
        produkId: p.id,
        penggunaId: orang[0].id,
        tipe: "MASUK",
        qty: stokAwal,
        stokSebelum: 0,
        stokSesudah: stokAwal,
        catatan: "Stok awal",
        dibuatPada: new Date(sekarang.getTime() - (o.hariTransaksi + 1) * MS_HARI),
      },
    });
  }

  const stokBerjalan = new Map(produk.map((p) => [p.id, p.lacak ? p.stokAkhir + p.terjual : 0]));

  for (const t of rencanaItem) {
    const trx = await db.transaksi.create({
      data: {
        tokoId: toko.id,
        penggunaId: t.penggunaId,
        nomor: t.nomor,
        kodeNota: t.kodeNota,
        subtotal: t.subtotal,
        diskon: t.diskon,
        pajak: 0,
        total: t.total,
        totalModal: t.totalModal,
        laba: t.laba,
        metodeBayar: t.metode,
        dibayar: t.dibayar,
        kembalian: t.kembalian,
        status: "SELESAI",
        dibuatPada: t.waktu,
        item: { create: t.baris },
      },
      select: { id: true },
    });

    for (const b of t.baris) {
      const p = produk.find((x) => x.id === b.produkId);
      if (!p || !p.lacak) continue;

      const sebelum = stokBerjalan.get(p.id) ?? 0;
      const sesudah = sebelum - b.qty;
      stokBerjalan.set(p.id, sesudah);

      await db.mutasiStok.create({
        data: {
          tokoId: toko.id,
          produkId: p.id,
          penggunaId: t.penggunaId,
          tipe: "PENJUALAN",
          qty: -b.qty,
          stokSebelum: sebelum,
          stokSesudah: sesudah,
          refTransaksi: trx.id,
          catatan: t.nomor,
          dibuatPada: t.waktu,
        },
      });
    }
  }

  // Samakan stok akhir dengan angka yang direncanakan.
  for (const p of produk) {
    if (!p.lacak) continue;
    await db.produk.update({ where: { id: p.id }, data: { stok: p.stokAkhir } });
  }

  if (o.pro) {
    for (const x of PENGELUARAN) {
      await db.pengeluaran.create({
        data: {
          tokoId: toko.id,
          penggunaId: orang[0].id,
          kategori: x.kategori,
          jumlah: x.jumlah,
          keterangan: x.keterangan,
          tanggal: awalHariWib(new Date(sekarang.getTime() - x.hariLalu * MS_HARI)),
        },
      });
    }
  }

  return {
    toko: toko.nama,
    produk: produk.length,
    transaksi: rencanaItem.length,
    omzet: rencanaItem.reduce((t, x) => t + x.total, 0),
  };
}

/** True bila akun demo utama sudah ada. */
export async function dataDemoAda(db: PrismaClient): Promise<boolean> {
  const ada = await db.pengguna.findUnique({
    where: { email: AKUN_DEMO.pemilik.email },
    select: { id: true },
  });
  return ada !== null;
}

/**
 * Membuat dua toko demo yang saling terpisah:
 *   1. Warung Bu Sari    — paket Pro, 21 hari transaksi, punya akun kasir;
 *   2. Kedai Tenda Biru  — paket Gratis, data tipis, untuk menguji tampilan
 *                          fitur yang terkunci sekaligus isolasi antar tenant.
 */
export async function buatDataDemo(db: PrismaClient): Promise<RingkasanToko[]> {
  const rng = pembangkitAcak();

  const utama = await buatToko(db, rng, {
    namaToko: "Warung Bu Sari",
    slug: "warung-bu-sari",
    jenisUsaha: "Warung / Toko Kelontong",
    alamat: "Jl. Melati No. 12, Bandung",
    telepon: "081234567890",
    pro: true,
    hariTransaksi: 21,
    pemilik: { ...AKUN_DEMO.pemilik },
    kasir: { ...AKUN_DEMO.kasir },
  });

  const kedua = await buatToko(db, rng, {
    namaToko: "Kedai Tenda Biru",
    slug: "kedai-tenda-biru",
    jenisUsaha: "Kedai Kopi / Kafe",
    alamat: "Jl. Cendana No. 3, Bandung",
    telepon: "081298765432",
    pro: false,
    hariTransaksi: 6,
    pemilik: { ...AKUN_DEMO.kedua },
  });

  return [utama, kedua];
}
