/**
 * Agregasi laporan.
 *
 * Bagian atas berisi fungsi murni (mudah diuji), bagian bawah pengambilan data
 * dari database. Setiap kueri WAJIB menerima `tokoId` supaya data antar tenant
 * tidak pernah bercampur.
 */

import { db } from "./db";
import {
  akhirHariWib,
  awalHariWib,
  hariMingguWib,
  kunciTanggal,
  namaHariIndeks,
  tambahHari,
} from "./format";

// ── Tipe ────────────────────────────────────────────────────────────────────

export type TransaksiRingkas = {
  id: string;
  total: number;
  subtotal: number;
  diskon: number;
  totalModal: number;
  laba: number;
  metodeBayar: string;
  dibuatPada: Date;
};

export type ItemRingkas = {
  produkId: string | null;
  namaProduk: string;
  satuan: string;
  qty: number;
  subtotal: number;
  modalSatuan: number;
  hargaSatuan: number;
  waktu: Date;
};

export type Agregat = {
  pendapatan: number;
  modal: number;
  labaKotor: number;
  diskon: number;
  jumlahTransaksi: number;
  rataKeranjang: number;
  /** Margin laba kotor dalam persen; null bila belum ada penjualan. */
  marginPersen: number | null;
};

// ── Fungsi murni ────────────────────────────────────────────────────────────

export function agregasi(transaksi: TransaksiRingkas[]): Agregat {
  let pendapatan = 0;
  let modal = 0;
  let laba = 0;
  let diskon = 0;

  for (const t of transaksi) {
    pendapatan += t.total;
    modal += t.totalModal;
    laba += t.laba;
    diskon += t.diskon;
  }

  const jumlahTransaksi = transaksi.length;

  return {
    pendapatan,
    modal,
    labaKotor: laba,
    diskon,
    jumlahTransaksi,
    rataKeranjang: jumlahTransaksi > 0 ? Math.round(pendapatan / jumlahTransaksi) : 0,
    marginPersen: pendapatan > 0 ? (laba / pendapatan) * 100 : null,
  };
}

export type TitikHarian = {
  kunci: string;
  tanggal: Date;
  label: string;
  pendapatan: number;
  laba: number;
  jumlahTransaksi: number;
};

/**
 * Menyusun seri harian lengkap dari `mulai` sampai `selesai`.
 * Hari tanpa transaksi tetap muncul dengan nilai 0 agar grafik tidak bolong.
 */
export function seriHarian(
  transaksi: TransaksiRingkas[],
  mulai: Date,
  selesai: Date,
): TitikHarian[] {
  const peta = new Map<string, TitikHarian>();

  let kursor = awalHariWib(mulai);
  const batas = awalHariWib(selesai);
  let pengaman = 0;

  while (kursor.getTime() <= batas.getTime() && pengaman < 400) {
    const kunci = kunciTanggal(kursor);
    peta.set(kunci, {
      kunci,
      tanggal: kursor,
      label: `${new Date(kursor).getUTCDate()}`,
      pendapatan: 0,
      laba: 0,
      jumlahTransaksi: 0,
    });
    kursor = tambahHari(kursor, 1);
    pengaman += 1;
  }

  for (const t of transaksi) {
    const titik = peta.get(kunciTanggal(t.dibuatPada));
    if (!titik) continue;
    titik.pendapatan += t.total;
    titik.laba += t.laba;
    titik.jumlahTransaksi += 1;
  }

  // Label tanggal memakai perhitungan WIB.
  for (const titik of peta.values()) {
    titik.label = kunciTanggal(titik.tanggal).slice(8);
  }

  return [...peta.values()];
}

export type PeringkatProduk = {
  produkId: string | null;
  nama: string;
  satuan: string;
  qty: number;
  pendapatan: number;
  laba: number;
};

export function peringkatProduk(item: ItemRingkas[], batas = 10): PeringkatProduk[] {
  const peta = new Map<string, PeringkatProduk>();

  for (const it of item) {
    const kunci = it.produkId ?? `nama:${it.namaProduk}`;
    const ada = peta.get(kunci);
    const laba = it.subtotal - it.modalSatuan * it.qty;

    if (ada) {
      ada.qty += it.qty;
      ada.pendapatan += it.subtotal;
      ada.laba += laba;
    } else {
      peta.set(kunci, {
        produkId: it.produkId,
        nama: it.namaProduk,
        satuan: it.satuan,
        qty: it.qty,
        pendapatan: it.subtotal,
        laba,
      });
    }
  }

  return [...peta.values()]
    .sort((a, b) => b.qty - a.qty || b.pendapatan - a.pendapatan)
    .slice(0, batas);
}

export function komposisiMetodeBayar(transaksi: TransaksiRingkas[]) {
  const peta = new Map<string, { metode: string; jumlah: number; nilai: number }>();
  for (const t of transaksi) {
    const ada = peta.get(t.metodeBayar) ?? { metode: t.metodeBayar, jumlah: 0, nilai: 0 };
    ada.jumlah += 1;
    ada.nilai += t.total;
    peta.set(t.metodeBayar, ada);
  }
  const total = transaksi.reduce((t, x) => t + x.total, 0);
  return [...peta.values()]
    .map((x) => ({ ...x, persen: total > 0 ? Math.round((x.nilai / total) * 100) : 0 }))
    .sort((a, b) => b.nilai - a.nilai);
}

/** Rata-rata pendapatan per hari dalam seminggu (0 = Minggu). */
export function rataPerHariMinggu(seri: TitikHarian[]) {
  const jumlah = Array.from({ length: 7 }, () => ({ total: 0, hari: 0 }));

  for (const titik of seri) {
    const idx = hariMingguWib(titik.tanggal);
    jumlah[idx].total += titik.pendapatan;
    jumlah[idx].hari += 1;
  }

  return jumlah.map((x, idx) => ({
    indeks: idx,
    nama: namaHariIndeks(idx),
    rata: x.hari > 0 ? Math.round(x.total / x.hari) : 0,
  }));
}

export function hariTerbaik(seri: TitikHarian[]): { nama: string; rata: number } | null {
  const perHari = rataPerHariMinggu(seri).filter((x) => x.rata > 0);
  if (perHari.length < 2) return null;
  const terbaik = perHari.reduce((a, b) => (b.rata > a.rata ? b : a));
  return { nama: terbaik.nama, rata: terbaik.rata };
}

// ── Pengambilan data ────────────────────────────────────────────────────────

export async function ambilTransaksi(
  tokoId: string,
  mulai: Date,
  selesai: Date,
): Promise<TransaksiRingkas[]> {
  const baris = await db.transaksi.findMany({
    where: {
      tokoId,
      status: "SELESAI",
      dibuatPada: { gte: mulai, lte: selesai },
    },
    select: {
      id: true,
      total: true,
      subtotal: true,
      diskon: true,
      totalModal: true,
      laba: true,
      metodeBayar: true,
      dibuatPada: true,
    },
    orderBy: { dibuatPada: "asc" },
  });

  return baris.map((b) => ({ ...b, metodeBayar: String(b.metodeBayar) }));
}

export async function ambilItem(
  tokoId: string,
  mulai: Date,
  selesai: Date,
): Promise<ItemRingkas[]> {
  const baris = await db.itemTransaksi.findMany({
    where: {
      transaksi: {
        tokoId,
        status: "SELESAI",
        dibuatPada: { gte: mulai, lte: selesai },
      },
    },
    select: {
      produkId: true,
      namaProduk: true,
      satuan: true,
      qty: true,
      subtotal: true,
      modalSatuan: true,
      hargaSatuan: true,
      transaksi: { select: { dibuatPada: true } },
    },
  });

  return baris.map((b) => ({
    produkId: b.produkId,
    namaProduk: b.namaProduk,
    satuan: b.satuan,
    qty: b.qty,
    subtotal: b.subtotal,
    modalSatuan: b.modalSatuan,
    hargaSatuan: b.hargaSatuan,
    waktu: b.transaksi.dibuatPada,
  }));
}

export async function totalPengeluaran(
  tokoId: string,
  mulai: Date,
  selesai: Date,
): Promise<number> {
  const hasil = await db.pengeluaran.aggregate({
    where: { tokoId, tanggal: { gte: mulai, lte: selesai } },
    _sum: { jumlah: true },
  });
  return hasil._sum.jumlah ?? 0;
}

export type PaketLaporan = {
  mulai: Date;
  selesai: Date;
  transaksi: TransaksiRingkas[];
  item: ItemRingkas[];
  pengeluaran: number;
  agregat: Agregat;
  seri: TitikHarian[];
  produk: PeringkatProduk[];
  metode: ReturnType<typeof komposisiMetodeBayar>;
  labaBersih: number;
};

/** Satu paket laporan lengkap untuk sebuah rentang tanggal. */
export async function laporanRentang(
  tokoId: string,
  mulai: Date,
  selesai: Date,
): Promise<PaketLaporan> {
  const awal = awalHariWib(mulai);
  const akhir = akhirHariWib(selesai);

  const [transaksi, item, pengeluaran] = await Promise.all([
    ambilTransaksi(tokoId, awal, akhir),
    ambilItem(tokoId, awal, akhir),
    totalPengeluaran(tokoId, awal, akhir),
  ]);

  const agregat = agregasi(transaksi);

  return {
    mulai: awal,
    selesai: akhir,
    transaksi,
    item,
    pengeluaran,
    agregat,
    seri: seriHarian(transaksi, awal, akhir),
    produk: peringkatProduk(item, 10),
    metode: komposisiMetodeBayar(transaksi),
    labaBersih: agregat.labaKotor - pengeluaran,
  };
}
