import { kunciTanggal } from "./format";
import { statusPaket } from "./plan";

/**
 * Hitungan pendapatan langganan.
 *
 * Semua fungsi di sini murni: masukannya baris biasa, keluarannya angka. Tidak
 * ada Prisma, tidak ada tanggal "sekarang" yang diambil sendiri — waktu selalu
 * diberikan pemanggil supaya hasilnya bisa diuji dan tidak berubah sendiri.
 */

/**
 * Satu pembayaran yang sudah dikonfirmasi.
 *
 * Yang boleh masuk ke sini HANYA baris Langganan yang `dibayarPada`-nya terisi.
 * Bukan yang berstatus AKTIF: status berubah sepanjang umur baris, jadi uang
 * yang sudah diterima akan lenyap dari laporan begitu masa berlakunya habis
 * atau langganannya dihentikan.
 */
export type Pembayaran = {
  tokoId: string;
  jumlah: number;
  dibayarPada: Date;
  periodeMulai: Date;
  periodeSelesai: Date;
};

const LABEL_BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** Kunci bulan "YYYY-MM" menurut WIB. */
export function kunciBulan(tanggal: Date): string {
  return kunciTanggal(tanggal).slice(0, 7);
}

/** Label bulan yang bisa dibaca, mis. "Jul 2026", dari kunci "2026-07". */
export function labelBulan(kunci: string): string {
  const tahun = kunci.slice(0, 4);
  const bulan = Number(kunci.slice(5, 7));
  return `${LABEL_BULAN[bulan - 1] ?? "?"} ${tahun}`;
}

/** Total uang yang benar-benar diterima. */
export function totalPendapatan(daftar: Pembayaran[]): number {
  return daftar.reduce((jumlah, p) => jumlah + p.jumlah, 0);
}

/**
 * Bentuk paling sempit yang dibutuhkan perhitungan periode.
 *
 * Sengaja lebih longgar daripada `Pembayaran`: panjang periode juga perlu
 * dihitung untuk pengajuan yang BELUM dibayar — misalnya saat mengonfirmasi
 * pembayaran, panjang periodenya diambil dari baris pengajuan yang
 * `dibayarPada`-nya masih kosong.
 */
type Periode = { periodeMulai: Date; periodeSelesai: Date };

/** Lama periode langganan dalam hari, minimal 1. */
export function hariPeriode(p: Periode): number {
  const selisih = p.periodeSelesai.getTime() - p.periodeMulai.getTime();
  return Math.max(1, Math.round(selisih / 86_400_000));
}

/**
 * Nilai setara satu bulan dari sebuah pembayaran.
 *
 * Dihitung dari panjang periodenya, bukan dari tebakan "ini bulanan atau
 * tahunan". Dengan begitu perpanjangan dengan periode tidak biasa — misalnya
 * masa tenggang yang diberikan manual — tetap terhitung sebanding.
 */
export function nilaiBulanan(p: Periode & { jumlah: number }): number {
  return Math.round((p.jumlah * 30) / hariPeriode(p));
}

export type BarisBulan = {
  kunci: string;
  label: string;
  nilai: number;
  jumlahPembayaran: number;
};

/**
 * Pendapatan per bulan, urut dari paling lama ke paling baru.
 *
 * Bulan yang tidak ada pembayarannya tetap muncul bernilai nol — grafik dan
 * tabel jadi tidak bolong, dan bulan kosong justru informasi yang berguna.
 */
export function pendapatanPerBulan(
  daftar: Pembayaran[],
  sampai: Date,
  jumlahBulan = 12,
): BarisBulan[] {
  const akhir = kunciBulan(sampai);
  let tahun = Number(akhir.slice(0, 4));
  let bulan = Number(akhir.slice(5, 7));

  // Bulan dihitung sebagai angka, bukan dengan menggeser objek Date. Menggeser
  // tanggal melewati batas bulan sambil membawa offset WIB mudah salah satu
  // hari; aritmetika tahun/bulan tidak punya masalah itu.
  const kunci: string[] = [];
  for (let i = 0; i < jumlahBulan; i += 1) {
    kunci.unshift(`${tahun}-${String(bulan).padStart(2, "0")}`);
    bulan -= 1;
    if (bulan === 0) {
      bulan = 12;
      tahun -= 1;
    }
  }

  const ember = new Map(kunci.map((k) => [k, { nilai: 0, jumlahPembayaran: 0 }]));

  for (const p of daftar) {
    const isi = ember.get(kunciBulan(p.dibayarPada));
    if (!isi) continue; // di luar rentang yang diminta
    isi.nilai += p.jumlah;
    isi.jumlahPembayaran += 1;
  }

  return kunci.map((k) => {
    const isi = ember.get(k) ?? { nilai: 0, jumlahPembayaran: 0 };
    return { kunci: k, label: labelBulan(k), ...isi };
  });
}

/**
 * Pendapatan bulanan berulang: perkiraan uang masuk per bulan dari langganan
 * yang masa berlakunya masih berjalan.
 *
 * Satu toko dihitung sekali — yang diambil adalah pembayaran dengan masa
 * berlaku paling jauh. Kalau semua pembayaran dijumlah, toko yang sudah
 * memperpanjang beberapa kali akan terhitung berlipat.
 */
export function pendapatanBulananBerulang(daftar: Pembayaran[], sekarang: Date): number {
  const terbaru = new Map<string, Pembayaran>();

  for (const p of daftar) {
    if (p.periodeSelesai.getTime() <= sekarang.getTime()) continue;
    const ada = terbaru.get(p.tokoId);
    if (!ada || p.periodeSelesai.getTime() > ada.periodeSelesai.getTime()) {
      terbaru.set(p.tokoId, p);
    }
  }

  let total = 0;
  for (const p of terbaru.values()) total += nilaiBulanan(p);
  return total;
}

// ── Pengelompokan toko ──────────────────────────────────────────────────────

export type KelasToko = "diblokir" | "berlangganan" | "uji-coba" | "gratis";

type TokoRingkas = {
  diblokir: boolean;
  paket: string;
  trialSampai: Date | null;
  proSampai: Date | null;
};

/**
 * Kelompok sebuah toko untuk keperluan panel operator.
 *
 * Blokir diperiksa lebih dulu dan mengalahkan apa pun: toko yang diblokir tidak
 * bisa dipakai walau langganannya masih berlaku, jadi menampilkannya sebagai
 * "berlangganan" akan menyesatkan.
 */
export function kelasToko(toko: TokoRingkas, sekarang: Date): KelasToko {
  if (toko.diblokir) return "diblokir";

  const status = statusPaket(toko, sekarang);
  if (status.sumber === "berbayar") return "berlangganan";
  if (status.sumber === "uji-coba") return "uji-coba";
  return "gratis";
}

export type RingkasanPelanggan = {
  total: number;
  berlangganan: number;
  ujiCoba: number;
  gratis: number;
  diblokir: number;
  /** Uji coba yang berakhir dalam `ambangHari` ke depan — calon pembeli terdekat. */
  ujiCobaSegeraHabis: number;
};

export function ringkasPelanggan(
  daftar: TokoRingkas[],
  sekarang: Date,
  ambangHari = 3,
): RingkasanPelanggan {
  const hasil: RingkasanPelanggan = {
    total: daftar.length,
    berlangganan: 0,
    ujiCoba: 0,
    gratis: 0,
    diblokir: 0,
    ujiCobaSegeraHabis: 0,
  };

  const batas = sekarang.getTime() + ambangHari * 86_400_000;

  for (const t of daftar) {
    const kelas = kelasToko(t, sekarang);

    if (kelas === "diblokir") hasil.diblokir += 1;
    else if (kelas === "berlangganan") hasil.berlangganan += 1;
    else if (kelas === "uji-coba") {
      hasil.ujiCoba += 1;
      if (t.trialSampai && t.trialSampai.getTime() <= batas) hasil.ujiCobaSegeraHabis += 1;
    } else hasil.gratis += 1;
  }

  return hasil;
}
