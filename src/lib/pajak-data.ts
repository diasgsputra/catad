import { db } from "./db";
import { kunciTanggal } from "./format";
import {
  hitungPajak,
  peredaranBrutoTransaksi,
  ringkasLabaRugi,
  type HasilPajak,
  type KonfigurasiPajak,
  type RingkasanLabaRugi,
} from "./pajak";

/**
 * Menyiapkan angka satu tahun pajak dari basis data untuk mesin hitung di
 * `pajak.ts`. Semua keputusan perhitungan ada di sana; berkas ini hanya
 * mengambil dan mengelompokkan.
 */

export type BulanKeuangan = {
  bulan: number;
  peredaranBruto: number;
  hargaPokokPenjualan: number;
  biayaOperasional: number;
  jumlahTransaksi: number;
};

export type DataPajakTahunan = {
  tahun: number;
  bulan: BulanKeuangan[];
  pajak: HasilPajak;
  labaRugi: RingkasanLabaRugi;
  /** Pajak daerah (PB1/PBJT) yang dipungut dari pembeli sepanjang tahun. */
  pajakDaerahDipungut: number;
};

/**
 * Rentang UTC yang pasti memuat seluruh tahun pajak menurut WIB.
 *
 * Sengaja dilebihkan sehari di kedua ujung, lalu penyaringan sesungguhnya
 * dilakukan dengan kunci tanggal WIB. Menghitung batas UTC yang persis untuk
 * WIB gampang meleset beberapa jam, dan transaksi tanggal 1 Januari pukul
 * 00.30 WIB akan jatuh ke tahun sebelumnya kalau batasnya salah.
 */
function rentangLonggar(tahun: number): { mulai: Date; selesai: Date } {
  return {
    mulai: new Date(Date.UTC(tahun - 1, 11, 30)),
    selesai: new Date(Date.UTC(tahun + 1, 0, 2)),
  };
}

/** True bila tanggal tersebut jatuh pada tahun WIB yang diminta. */
function diTahun(tanggal: Date, tahun: number): boolean {
  return kunciTanggal(tanggal).startsWith(String(tahun));
}

/** Indeks bulan 0–11 menurut WIB. */
function indeksBulan(tanggal: Date): number {
  return Number(kunciTanggal(tanggal).slice(5, 7)) - 1;
}

export async function dataPajakTahunan({
  tokoId,
  tahun,
  konfigurasi,
}: {
  tokoId: string;
  tahun: number;
  konfigurasi: KonfigurasiPajak;
}): Promise<DataPajakTahunan> {
  const { mulai, selesai } = rentangLonggar(tahun);

  const [transaksi, pengeluaran] = await Promise.all([
    db.transaksi.findMany({
      // Transaksi yang dibatalkan tidak pernah menjadi penghasilan, jadi tidak
      // boleh ikut menaikkan peredaran bruto maupun pajak terutang.
      where: { tokoId, status: "SELESAI", dibuatPada: { gte: mulai, lte: selesai } },
      select: {
        subtotal: true,
        diskon: true,
        pajak: true,
        totalModal: true,
        dibuatPada: true,
      },
    }),
    db.pengeluaran.findMany({
      where: { tokoId, tanggal: { gte: mulai, lte: selesai } },
      select: { jumlah: true, tanggal: true },
    }),
  ]);

  const bulan: BulanKeuangan[] = Array.from({ length: 12 }, (_, i) => ({
    bulan: i + 1,
    peredaranBruto: 0,
    hargaPokokPenjualan: 0,
    biayaOperasional: 0,
    jumlahTransaksi: 0,
  }));

  let pajakDaerahDipungut = 0;

  for (const t of transaksi) {
    if (!diTahun(t.dibuatPada, tahun)) continue;
    const b = bulan[indeksBulan(t.dibuatPada)];
    b.peredaranBruto += peredaranBrutoTransaksi(t);
    b.hargaPokokPenjualan += t.totalModal;
    b.jumlahTransaksi += 1;
    pajakDaerahDipungut += t.pajak;
  }

  for (const p of pengeluaran) {
    if (!diTahun(p.tanggal, tahun)) continue;
    bulan[indeksBulan(p.tanggal)].biayaOperasional += p.jumlah;
  }

  // Laba rugi dihitung lebih dulu: rezim pembukuan memakai laba bersih sebagai
  // dasar pengenaan, jadi urutannya tidak bisa dibalik.
  const labaRugi = ringkasLabaRugi({
    peredaranBruto: bulan.reduce((j, b) => j + b.peredaranBruto, 0),
    hargaPokokPenjualan: bulan.reduce((j, b) => j + b.hargaPokokPenjualan, 0),
    biayaOperasional: bulan.reduce((j, b) => j + b.biayaOperasional, 0),
  });

  const pajak = hitungPajak({
    omzetBulanan: bulan.map((b) => b.peredaranBruto),
    konfigurasi,
    tahun,
    labaBersih: labaRugi.labaBersih,
  });

  return { tahun, bulan, pajak, labaRugi, pajakDaerahDipungut };
}

/**
 * Menyusun konfigurasi perhitungan dari baris Toko.
 *
 * Dipisah supaya halaman, rute unduhan, dan pengujian memakai pemetaan yang
 * sama persis — konfigurasi pajak yang berbeda antara layar dan PDF adalah
 * kesalahan yang tidak akan disadari sampai dokumennya sudah dilaporkan.
 */
export function konfigurasiDariToko(toko: {
  rezimPajak: KonfigurasiPajak["rezim"];
  tarifFinalBps: number;
  fasilitasBebas: number;
  normaBps: number;
  ptkpSetahun: number;
  tarifBadanBps: number;
  pakai31E: boolean;
}): KonfigurasiPajak {
  return {
    rezim: toko.rezimPajak,
    tarifFinalBps: toko.tarifFinalBps,
    fasilitasBebas: toko.fasilitasBebas,
    normaBps: toko.normaBps,
    ptkp: toko.ptkpSetahun,
    tarifBadanBps: toko.tarifBadanBps,
    pakai31E: toko.pakai31E,
  };
}

/**
 * Tahun-tahun yang sudah punya transaksi, terbaru lebih dulu.
 * Dipakai untuk mengisi pilihan tahun pajak tanpa menawarkan tahun kosong.
 */
export async function tahunBertransaksi(tokoId: string): Promise<number[]> {
  const batas = await db.transaksi.aggregate({
    where: { tokoId, status: "SELESAI" },
    _min: { dibuatPada: true },
    _max: { dibuatPada: true },
  });

  const paling = batas._min.dibuatPada;
  const terbaru = batas._max.dibuatPada;
  if (!paling || !terbaru) return [];

  const awal = Number(kunciTanggal(paling).slice(0, 4));
  const akhir = Number(kunciTanggal(terbaru).slice(0, 4));

  const tahun: number[] = [];
  for (let t = akhir; t >= awal; t -= 1) tahun.push(t);
  return tahun;
}
