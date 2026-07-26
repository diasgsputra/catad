import { selisihHari } from "./format";

export type NamaPaket = "GRATIS" | "PRO";

export const HARGA_PRO_BULANAN = 49_000;
export const HARGA_PRO_TAHUNAN = 470_000; // hemat 2 bulan
export const HARI_UJI_COBA = 14;

export type Fitur =
  | "insight"          // Catad Insight lengkap (prediksi stok + daftar belanja + briefing)
  | "ekspor"           // Unduh laporan CSV
  | "laporanPenuh"     // Rentang laporan tanpa batas
  | "banyakKasir"      // Tambah akun staf
  | "produkTanpaBatas";

export type BatasPaket = {
  nama: NamaPaket;
  label: string;
  hargaBulanan: number;
  maksProduk: number;
  maksPengguna: number;
  /** Berapa hari ke belakang laporan bisa dilihat. */
  riwayatHari: number;
  fitur: Record<Fitur, boolean>;
};

export const PAKET: Record<NamaPaket, BatasPaket> = {
  GRATIS: {
    nama: "GRATIS",
    label: "Gratis",
    hargaBulanan: 0,
    maksProduk: 50,
    maksPengguna: 1,
    riwayatHari: 30,
    fitur: {
      insight: false,
      ekspor: false,
      laporanPenuh: false,
      banyakKasir: false,
      produkTanpaBatas: false,
    },
  },
  PRO: {
    nama: "PRO",
    label: "Pro",
    hargaBulanan: HARGA_PRO_BULANAN,
    maksProduk: Number.POSITIVE_INFINITY,
    maksPengguna: 10,
    riwayatHari: Number.POSITIVE_INFINITY,
    fitur: {
      insight: true,
      ekspor: true,
      laporanPenuh: true,
      banyakKasir: true,
      produkTanpaBatas: true,
    },
  },
};

export type StatusPaket = {
  /** Paket yang berlaku efektif saat ini (uji coba dihitung sebagai PRO). */
  aktif: NamaPaket;
  batas: BatasPaket;
  sumber: "berbayar" | "uji-coba" | "gratis";
  /** Sisa hari uji coba; 0 bila tidak sedang uji coba. */
  sisaUjiCoba: number;
  /** Sisa hari langganan berbayar; null bila tidak berlangganan. */
  sisaBerbayar: number | null;
  /** True bila uji coba baru saja habis dan belum berlangganan. */
  ujiCobaHabis: boolean;
};

type TokoPaket = {
  paket: string;
  trialSampai: Date | null;
  proSampai: Date | null;
};

/**
 * Menentukan paket efektif sebuah toko.
 * Urutan: langganan berbayar aktif → masa uji coba → gratis.
 */
export function statusPaket(toko: TokoPaket, sekarang: Date = new Date()): StatusPaket {
  const proBerbayarAktif =
    toko.paket === "PRO" && !!toko.proSampai && toko.proSampai.getTime() > sekarang.getTime();

  const ujiCobaAktif = !!toko.trialSampai && toko.trialSampai.getTime() > sekarang.getTime();

  if (proBerbayarAktif) {
    return {
      aktif: "PRO",
      batas: PAKET.PRO,
      sumber: "berbayar",
      sisaUjiCoba: 0,
      sisaBerbayar: Math.max(0, selisihHari(sekarang, toko.proSampai!)),
      ujiCobaHabis: false,
    };
  }

  if (ujiCobaAktif) {
    return {
      aktif: "PRO",
      batas: PAKET.PRO,
      sumber: "uji-coba",
      sisaUjiCoba: Math.max(1, selisihHari(sekarang, toko.trialSampai!)),
      sisaBerbayar: null,
      ujiCobaHabis: false,
    };
  }

  return {
    aktif: "GRATIS",
    batas: PAKET.GRATIS,
    sumber: "gratis",
    sisaUjiCoba: 0,
    sisaBerbayar: null,
    ujiCobaHabis: !!toko.trialSampai && toko.trialSampai.getTime() <= sekarang.getTime(),
  };
}

export function punyaFitur(status: StatusPaket, fitur: Fitur): boolean {
  return status.batas.fitur[fitur];
}

/** Pesan siap-pakai saat sebuah batas terlampaui. */
export function pesanBatas(jenis: "produk" | "pengguna", batas: BatasPaket): string {
  if (jenis === "produk") {
    return `Paket ${batas.label} dibatasi ${batas.maksProduk} produk. Upgrade ke Pro untuk produk tanpa batas.`;
  }
  return batas.maksPengguna <= 1
    ? "Paket Gratis hanya untuk 1 akun. Upgrade ke Pro untuk menambah akun kasir."
    : `Paket ${batas.label} dibatasi ${batas.maksPengguna} akun.`;
}
