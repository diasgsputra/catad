/**
 * Menjembatani database dengan mesin Catad Insight.
 *
 * Semua data 30 hari terakhir diambil sekali, lalu dipotong-potong di memori.
 * Untuk skala UMKM ini jauh lebih murah daripada belasan kueri agregat, dan
 * membuat seluruh perhitungan bisa diuji tanpa database.
 */

import { db } from "./db";
import {
  akhirHariWib,
  awalHariWib,
  kunciTanggal,
  selisihPersen,
  tambahHari,
} from "./format";
import {
  briefingHarian,
  daftarBelanja,
  deteksiStokMati,
  distribusiJam,
  hitungVelositas,
  prediksiStok,
  ringkasStatusStok,
  type BarisPenjualan,
  type ProdukRingkas,
} from "./insight";
import { agregasi, hariTerbaik, peringkatProduk, seriHarian, type TransaksiRingkas } from "./laporan";

export const JENDELA_VELOSITAS = 14;
const JENDELA_PANJANG = 30;

export type PaketInsight = Awaited<ReturnType<typeof siapkanInsight>>;

export async function siapkanInsight(tokoId: string, sekarang: Date = new Date()) {
  const awalHariIni = awalHariWib(sekarang);
  const akhirHariIni = akhirHariWib(sekarang);
  const awal30 = awalHariWib(tambahHari(sekarang, -(JENDELA_PANJANG - 1)));
  const awal14 = awalHariWib(tambahHari(sekarang, -(JENDELA_VELOSITAS - 1)));
  const awalBulan = awalHariWib(
    new Date(Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth(), 1)),
  );

  const [produkMentah, transaksiMentah, itemMentah, pengeluaranBulan] = await Promise.all([
    db.produk.findMany({
      where: { tokoId, aktif: true },
      select: {
        id: true,
        nama: true,
        satuan: true,
        stok: true,
        stokMinimum: true,
        hargaJual: true,
        hargaModal: true,
        lacakStok: true,
      },
    }),
    db.transaksi.findMany({
      where: { tokoId, status: "SELESAI", dibuatPada: { gte: awal30, lte: akhirHariIni } },
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
    }),
    db.itemTransaksi.findMany({
      where: {
        transaksi: {
          tokoId,
          status: "SELESAI",
          dibuatPada: { gte: awal30, lte: akhirHariIni },
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
    }),
    db.pengeluaran.aggregate({
      where: { tokoId, tanggal: { gte: awalBulan, lte: akhirHariIni } },
      _sum: { jumlah: true },
    }),
  ]);

  const produk: ProdukRingkas[] = produkMentah;

  const transaksi: TransaksiRingkas[] = transaksiMentah.map((t) => ({
    ...t,
    metodeBayar: String(t.metodeBayar),
  }));

  const item = itemMentah.map((it) => ({
    produkId: it.produkId,
    namaProduk: it.namaProduk,
    satuan: it.satuan,
    qty: it.qty,
    subtotal: it.subtotal,
    modalSatuan: it.modalSatuan,
    hargaSatuan: it.hargaSatuan,
    waktu: it.transaksi.dibuatPada,
  }));

  // ── Potongan waktu ──
  const dalam = (t: { dibuatPada: Date }, mulai: Date, selesai: Date) =>
    t.dibuatPada >= mulai && t.dibuatPada <= selesai;

  const trxHariIni = transaksi.filter((t) => dalam(t, awalHariIni, akhirHariIni));

  const awalKemarin = tambahHari(awalHariIni, -1);
  const trxKemarin = transaksi.filter((t) => dalam(t, awalKemarin, akhirHariWib(awalKemarin)));

  const awal7 = tambahHari(awalHariIni, -7);
  const trx7Sebelum = transaksi.filter((t) => dalam(t, awal7, new Date(awalHariIni.getTime() - 1)));

  const awal14Lalu = tambahHari(awalHariIni, -14);
  const trx7SebelumnyaLagi = transaksi.filter((t) =>
    dalam(t, awal14Lalu, new Date(awal7.getTime() - 1)),
  );

  const trxBulanIni = transaksi.filter((t) => dalam(t, awalBulan, akhirHariIni));

  // ── Velositas & prediksi stok ──
  const penjualan14: BarisPenjualan[] = item
    .filter((it) => it.waktu >= awal14)
    .map((it) => ({
      produkId: it.produkId,
      qty: it.qty,
      subtotal: it.subtotal,
      modal: it.modalSatuan * it.qty,
      waktu: it.waktu,
    }));

  const velositas = hitungVelositas(penjualan14, JENDELA_VELOSITAS);
  const prediksi = prediksiStok(produk, velositas, {
    hariJendela: JENDELA_VELOSITAS,
    sekarang,
  });
  const belanja = daftarBelanja(prediksi, { horizonHari: 14, bufferHari: 3 });
  const stokMati = deteksiStokMati(prediksi, sekarang);
  const ringkasStok = ringkasStatusStok(prediksi);

  // ── Angka pendukung ──
  const agregatHariIni = agregasi(trxHariIni);
  const agregat7 = agregasi(trx7Sebelum);
  const agregat7Sebelumnya = agregasi(trx7SebelumnyaLagi);
  const agregatBulan = agregasi(trxBulanIni);

  const seri30 = seriHarian(transaksi, awal30, akhirHariIni);
  const emberJam = distribusiJam(transaksi.map((t) => ({ dibuatPada: t.dibuatPada, total: t.total })));

  const item7 = item.filter((it) => it.waktu >= awal7);
  const produkTeratas = peringkatProduk(item7, 5);

  const rataHarian7 = agregat7.pendapatan / 7;
  const pengeluaranBulanIni = pengeluaranBulan._sum.jumlah ?? 0;

  const briefing = briefingHarian({
    sekarang,
    hariIni: {
      pendapatan: agregatHariIni.pendapatan,
      laba: agregatHariIni.labaKotor,
      transaksi: agregatHariIni.jumlahTransaksi,
      item: item.filter((it) => it.waktu >= awalHariIni).reduce((t, it) => t + it.qty, 0),
    },
    rataHarian7,
    kemarin: agregasi(trxKemarin).pendapatan,
    prediksi,
    stokMati,
    emberJam,
    produkTeratas: produkTeratas.map((p) => ({
      nama: p.nama,
      qty: p.qty,
      pendapatan: p.pendapatan,
    })),
    margin7: agregat7.marginPersen,
    marginSebelumnya: agregat7Sebelumnya.marginPersen,
    pengeluaranBulanIni,
    pendapatanBulanIni: agregatBulan.pendapatan,
    rataKeranjang: agregat7.rataKeranjang,
    rataKeranjangSebelumnya: agregat7Sebelumnya.rataKeranjang,
    hariTerbaik: hariTerbaik(seri30),
  });

  return {
    sekarang,
    produk,
    prediksi,
    belanja,
    stokMati,
    ringkasStok,
    briefing,
    emberJam,
    seri30,
    produkTeratas,
    hariIni: agregatHariIni,
    kemarin: agregasi(trxKemarin),
    tujuhHari: agregat7,
    tujuhHariSebelumnya: agregat7Sebelumnya,
    bulanIni: agregatBulan,
    pengeluaranBulanIni,
    labaBersihBulanIni: agregatBulan.labaKotor - pengeluaranBulanIni,
    rataHarian7,
    trenHariIni: selisihPersen(agregatHariIni.pendapatan, rataHarian7),
    kunciHariIni: kunciTanggal(sekarang),
  };
}
