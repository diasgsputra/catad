/**
 * Perhitungan pajak penghasilan tahunan.
 *
 * Seluruh isi berkas ini murni: masukannya angka, keluarannya angka. Tidak ada
 * Prisma, tidak ada tanggal "sekarang" yang diambil sendiri. Perhitungan pajak
 * harus bisa diuji tanpa basis data dan tidak boleh berubah hasilnya hanya
 * karena dijalankan pada hari yang berbeda.
 *
 * ── Kenapa rezimnya bisa dipilih ──────────────────────────────────────────
 *
 * Pemakai Catad tidak hanya warung kecil. Apotek yang omzetnya sudah melewati
 * Rp4,8 miliar wajib pembukuan dan tidak boleh lagi memakai skema final; kafe
 * berbentuk PT dikenai PPh badan; pedagang yang memilih pencatatan memakai
 * Norma dengan persentase yang berbeda menurut jenis usaha dan wilayah. Memaku
 * satu rezim sebagai kebenaran berarti menyodorkan angka yang salah kepada
 * sebagian besar pemakai — dan angka pajak yang salah lebih berbahaya daripada
 * tidak ada angka sama sekali.
 *
 * Karena itu rezim DAN parameternya disimpan per toko. Yang tetap dipaku di
 * sini hanya yang memang ditetapkan undang-undang dan berlaku seragam: lapisan
 * tarif Pasal 17, ambang Rp4,8 miliar, dan ambang Rp50 miliar untuk Pasal 31E.
 *
 * ── Yang TIDAK dihitung berkas ini ────────────────────────────────────────
 *
 * PPN. Menghitung PPN terutang memerlukan pajak masukan dari faktur pembelian,
 * dan Catad tidak mencatatnya. Yang bisa disajikan hanyalah pajak keluaran dari
 * penjualan; itu pun harus disebut apa adanya, bukan disamarkan sebagai PPN
 * yang harus disetor.
 *
 * PB1/PBJT (pajak restoran daerah) juga tidak ikut. Pajak itu dipungut dari
 * pembeli untuk disetor ke pemerintah daerah, jadi bukan penghasilan toko dan
 * tidak boleh masuk peredaran bruto — lihat `peredaranBrutoTransaksi`.
 */

// ── Angka yang ditetapkan undang-undang ─────────────────────────────────────

/** Batas peredaran bruto setahun untuk boleh memakai skema PPh Final UMKM. */
export const BATAS_PEREDARAN_FINAL = 4_800_000_000;

/** Batas peredaran bruto untuk fasilitas pengurangan tarif Pasal 31E. */
export const BATAS_PEREDARAN_31E = 50_000_000_000;

/** Tanggal jatuh tempo penyetoran masa pada bulan berikutnya (PMK 81/2024). */
export const TANGGAL_JATUH_TEMPO = 15;

/**
 * Lapisan tarif PPh Pasal 17 untuk Wajib Pajak Orang Pribadi (UU HPP).
 * `sampai` bernilai Infinity pada lapisan terakhir.
 */
export const LAPISAN_PASAL_17: Array<{ sampai: number; tarifBps: number }> = [
  { sampai: 60_000_000, tarifBps: 500 },
  { sampai: 250_000_000, tarifBps: 1500 },
  { sampai: 500_000_000, tarifBps: 2500 },
  { sampai: 5_000_000_000, tarifBps: 3000 },
  { sampai: Number.POSITIVE_INFINITY, tarifBps: 3500 },
];

// ── Rezim dan konfigurasinya ────────────────────────────────────────────────

export type RezimPajak =
  | "FINAL_UMKM"
  | "NPPN"
  | "PEMBUKUAN_OP"
  | "PEMBUKUAN_BADAN"
  | "TANPA_HITUNG";

export const LABEL_REZIM: Record<RezimPajak, string> = {
  FINAL_UMKM: "PPh Final UMKM",
  NPPN: "Norma Penghitungan Penghasilan Neto",
  PEMBUKUAN_OP: "Pembukuan — orang pribadi",
  PEMBUKUAN_BADAN: "Pembukuan — badan",
  TANPA_HITUNG: "Rekap saja, tanpa hitung pajak",
};

export const KETERANGAN_REZIM: Record<RezimPajak, string> = {
  FINAL_UMKM:
    "Tarif tetap dari peredaran bruto, tanpa memperhitungkan untung rugi. Untuk peredaran bruto sampai Rp4,8 miliar setahun.",
  NPPN:
    "Penghasilan neto dianggap sebesar persentase tertentu dari peredaran bruto, lalu dikenai tarif Pasal 17. Persentasenya berbeda menurut jenis usaha dan wilayah.",
  PEMBUKUAN_OP:
    "Pajak dihitung dari laba bersih yang sesungguhnya dikurangi PTKP, lalu dikenai tarif Pasal 17.",
  PEMBUKUAN_BADAN:
    "Laba bersih dikenai tarif PPh badan, dengan pilihan fasilitas pengurangan tarif Pasal 31E.",
  TANPA_HITUNG:
    "Catad hanya menyusun rekap peredaran bruto dan laba rugi. Perhitungan pajaknya dikerjakan di luar aplikasi.",
};

/**
 * Ringkasan pembanding kelima rezim, untuk ditampilkan sebagai rujukan pada
 * halaman pengaturan pajak.
 *
 * Ada di berkas ini, bukan di komponen halamannya, supaya nama dan dasar hukum
 * yang dibaca pemilik toko berasal dari tempat yang sama dengan yang menghitung
 * angkanya. Tabel rujukan yang menyimpang dari mesin hitungnya lebih buruk
 * daripada tidak ada tabel sama sekali.
 *
 * `dasarHitung` memuat angka ketentuan umum yang berlaku sekarang, bukan nilai
 * yang tersimpan per toko — itu ada pada formulir pengaturan, dan bisa berbeda.
 */
export type RingkasanRezim = {
  rezim: RezimPajak;
  /**
   * Nama resminya dalam bahasa sehari-hari. Istilah DJP dipakai apa adanya
   * supaya angkanya bisa dicocokkan saat mengisi SPT, tetapi nama itu asing
   * bagi pemilik warung — inilah terjemahannya.
   */
  sebutan: string;
  /** Kalimat pendek: dari angka apa pajaknya dihitung. */
  dasarHitung: string;
  /** Siapa yang biasanya memakai rezim ini. */
  untuk: string;
  /** Dasar hukumnya, ditulis seperti yang lazim dikutip. */
  sumber: string;
};

export const RINGKASAN_REZIM: RingkasanRezim[] = [
  {
    rezim: "FINAL_UMKM",
    sebutan: "Dihitung dari omzet",
    dasarHitung: "Omzet × 0,5%",
    untuk: "Orang pribadi, omzet di bawah Rp4,8 miliar",
    sumber: "PP 23/2018 jo. 55/2022 jo. 20/2026",
  },
  {
    rezim: "NPPN",
    sebutan: "Untung dianggap sekian persen dari omzet",
    dasarHitung: "Omzet × norma, lalu Pasal 17",
    untuk: "Orang pribadi yang memilih pencatatan",
    sumber: "UU PPh Ps. 14 · PER-17/PJ/2015",
  },
  {
    rezim: "PEMBUKUAN_OP",
    sebutan: "Dihitung dari untung, atas nama pribadi",
    dasarHitung: "Laba − PTKP, lalu Pasal 17",
    untuk: "Orang pribadi yang wajib pembukuan",
    sumber: "UU PPh Ps. 16 & 17 · UU HPP",
  },
  {
    rezim: "PEMBUKUAN_BADAN",
    sebutan: "Dihitung dari untung, berbadan hukum",
    dasarHitung: "Laba bersih × 22%",
    untuk: "PT, CV, firma, koperasi",
    sumber: "UU PPh Ps. 17 ayat (1) b & Ps. 31E",
  },
  {
    rezim: "TANPA_HITUNG",
    sebutan: "Catad tidak menghitung",
    dasarHitung: "—",
    untuk: "Keadaan yang lebih rumit dari empat di atas",
    sumber: "—",
  },
];

/**
 * Parameter perhitungan yang bisa berbeda antar toko.
 *
 * Semua tarif disimpan sebagai basis poin (bilangan bulat, 100 bps = 1%) supaya
 * tidak ada galat pembulatan pecahan desimal yang menumpuk pada angka rupiah
 * yang besar.
 */
export type KonfigurasiPajak = {
  rezim: RezimPajak;
  /** Tarif PPh final. 50 bps = 0,50%. */
  tarifFinalBps: number;
  /** Peredaran bruto bebas PPh setahun. 0 berarti tidak ada fasilitas. */
  fasilitasBebas: number;
  /** Persentase norma penghasilan neto. 2500 bps = 25%. */
  normaBps: number;
  /** Penghasilan Tidak Kena Pajak setahun. */
  ptkp: number;
  /** Tarif PPh badan. 2200 bps = 22%. */
  tarifBadanBps: number;
  /** Memakai fasilitas pengurangan tarif Pasal 31E. */
  pakai31E: boolean;
};

export const KONFIGURASI_BAWAAN: KonfigurasiPajak = {
  rezim: "FINAL_UMKM",
  tarifFinalBps: 50,
  fasilitasBebas: 500_000_000,
  normaBps: 2500,
  ptkp: 54_000_000,
  tarifBadanBps: 2200,
  pakai31E: true,
};

/** PTKP yang lazim dipakai, untuk membantu mengisi pengaturan. */
export const PILIHAN_PTKP: Array<{ label: string; nilai: number }> = [
  { label: "TK/0 — belum kawin, tanpa tanggungan", nilai: 54_000_000 },
  { label: "K/0 — kawin, tanpa tanggungan", nilai: 58_500_000 },
  { label: "K/1 — kawin, 1 tanggungan", nilai: 63_000_000 },
  { label: "K/2 — kawin, 2 tanggungan", nilai: 67_500_000 },
  { label: "K/3 — kawin, 3 tanggungan", nilai: 72_000_000 },
];

// ── Pembantu ────────────────────────────────────────────────────────────────

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function namaBulan(bulan: number): string {
  return NAMA_BULAN[bulan - 1] ?? "?";
}

/** Persentase yang bisa dibaca dari basis poin, mis. 50 → "0,5%". */
export function persenDariBps(bps: number): string {
  const persen = bps / 100;
  return `${persen.toString().replace(".", ",")}%`;
}

function terapkanBps(dasar: number, bps: number): number {
  return Math.floor((dasar * bps) / 10_000);
}

/**
 * Peredaran bruto satu transaksi menurut kacamata PPh.
 *
 * Bukan `total`. Nilai `total` sudah memuat pajak daerah yang dipungut dari
 * pembeli, dan uang itu bukan penghasilan toko — memasukkannya akan membuat
 * pajak terutang lebih besar daripada seharusnya.
 */
export function peredaranBrutoTransaksi(t: { subtotal: number; diskon: number }): number {
  return Math.max(0, t.subtotal - t.diskon);
}

/**
 * Penghasilan Kena Pajak dibulatkan ke bawah dalam ribuan penuh, sesuai
 * ketentuan umum penghitungan PPh.
 */
export function bulatkanPkp(nilai: number): number {
  return Math.max(0, Math.floor(nilai / 1000) * 1000);
}

/** Jatuh tempo penyetoran masa pajak `bulan`: tanggal 15 bulan berikutnya. */
export function jatuhTempoSetor(tahun: number, bulan: number): { iso: string; label: string } {
  const bulanBerikut = bulan === 12 ? 1 : bulan + 1;
  const tahunBerikut = bulan === 12 ? tahun + 1 : tahun;
  const bb = String(bulanBerikut).padStart(2, "0");

  return {
    iso: `${tahunBerikut}-${bb}-${String(TANGGAL_JATUH_TEMPO).padStart(2, "0")}`,
    label: `${TANGGAL_JATUH_TEMPO} ${namaBulan(bulanBerikut)} ${tahunBerikut}`,
  };
}

// ── Tarif ───────────────────────────────────────────────────────────────────

/**
 * PPh Pasal 17 orang pribadi: progresif berlapis.
 *
 * Setiap lapisan hanya mengenai bagian penghasilan yang jatuh di dalamnya —
 * bukan seluruh penghasilan dikenai tarif lapisan tertinggi.
 */
export function pphPasal17(pkp: number): number {
  if (pkp <= 0) return 0;

  let sisa = pkp;
  let batasBawah = 0;
  let pajak = 0;

  for (const lapisan of LAPISAN_PASAL_17) {
    if (sisa <= 0) break;
    const lebarLapisan = lapisan.sampai - batasBawah;
    const kena = Math.min(sisa, lebarLapisan);
    pajak += terapkanBps(kena, lapisan.tarifBps);
    sisa -= kena;
    batasBawah = lapisan.sampai;
  }

  return pajak;
}

/**
 * PPh badan, dengan pilihan fasilitas Pasal 31E.
 *
 * Pasal 31E memberi pengurangan tarif 50% atas Penghasilan Kena Pajak yang
 * berasal dari bagian peredaran bruto sampai Rp4,8 miliar, bagi badan dengan
 * peredaran bruto sampai Rp50 miliar. Bila peredaran brutonya melebihi Rp4,8
 * miliar, bagian yang mendapat fasilitas dihitung proporsional:
 *
 *   PKP berfasilitas = (Rp4,8 miliar ÷ peredaran bruto) × PKP
 */
export function pphBadan({
  pkp,
  peredaranBruto,
  tarifBps,
  pakai31E,
}: {
  pkp: number;
  peredaranBruto: number;
  tarifBps: number;
  pakai31E: boolean;
}): number {
  if (pkp <= 0) return 0;

  const berhakFasilitas =
    pakai31E && peredaranBruto > 0 && peredaranBruto <= BATAS_PEREDARAN_31E;

  if (!berhakFasilitas) return terapkanBps(pkp, tarifBps);

  if (peredaranBruto <= BATAS_PEREDARAN_FINAL) {
    // Seluruh PKP mendapat pengurangan tarif 50%.
    return terapkanBps(pkp, Math.floor(tarifBps / 2));
  }

  const pkpFasilitas = Math.floor((BATAS_PEREDARAN_FINAL / peredaranBruto) * pkp);
  const pkpBiasa = pkp - pkpFasilitas;

  return (
    terapkanBps(pkpFasilitas, Math.floor(tarifBps / 2)) + terapkanBps(pkpBiasa, tarifBps)
  );
}

// ── Hasil perhitungan ───────────────────────────────────────────────────────

export type BarisPajakBulan = {
  /** 1–12 */
  bulan: number;
  namaBulan: string;
  peredaranBruto: number;
  /** Peredaran bruto kumulatif sejak Januari sampai bulan ini. */
  kumulatif: number;
  /** Bagian peredaran bruto bulan ini yang tertutup fasilitas bebas. */
  bagianBebas: number;
  /** Dasar pengenaan pajak bulan ini. Nol di luar skema final. */
  dasarPengenaan: number;
  /** Pajak masa bulan ini. Nol di luar skema final. */
  pajakMasa: number;
  jatuhTempo: string;
  jatuhTempoLabel: string;
};

export type LangkahHitung = {
  label: string;
  nilai: number;
  /** Rumus singkat yang menjelaskan asal angkanya. */
  rumus?: string;
  /** Baris hasil akhir, disorot saat ditampilkan. */
  hasil?: boolean;
};

export type HasilPajak = {
  tahun: number;
  konfigurasi: KonfigurasiPajak;
  /** Rekap peredaran bruto per bulan. Selalu ada — ini inti pencatatannya. */
  baris: BarisPajakBulan[];
  totalPeredaranBruto: number;
  /** Pajak penghasilan terutang setahun. */
  pajakTerutang: number;
  /** Langkah perhitungan yang bisa ditelusuri ulang. */
  langkah: LangkahHitung[];
  /** True bila pajaknya disetor tiap masa pajak, bukan sekali setahun. */
  setoranBulanan: boolean;
  melebihiBatasFinal: boolean;
  sisaFasilitas: number;
  bulanFasilitasHabis: number | null;
};

/** Masukan perhitungan setahun. */
export type MasukanPajak = {
  omzetBulanan: number[];
  konfigurasi: KonfigurasiPajak;
  tahun: number;
  /** Laba bersih setahun; dipakai rezim pembukuan. */
  labaBersih?: number;
};

function barisKosong(tahun: number, omzetBulanan: number[]): BarisPajakBulan[] {
  const baris: BarisPajakBulan[] = [];
  let kumulatif = 0;

  for (let bulan = 1; bulan <= 12; bulan += 1) {
    const bruto = Math.max(0, Math.round(omzetBulanan[bulan - 1] ?? 0));
    kumulatif += bruto;
    const tempo = jatuhTempoSetor(tahun, bulan);

    baris.push({
      bulan,
      namaBulan: namaBulan(bulan),
      peredaranBruto: bruto,
      kumulatif,
      bagianBebas: 0,
      dasarPengenaan: 0,
      pajakMasa: 0,
      jatuhTempo: tempo.iso,
      jatuhTempoLabel: tempo.label,
    });
  }

  return baris;
}

/** Menghitung pajak setahun sesuai rezim yang dipilih. */
export function hitungPajak({
  omzetBulanan,
  konfigurasi,
  tahun,
  labaBersih = 0,
}: MasukanPajak): HasilPajak {
  const baris = barisKosong(tahun, omzetBulanan);
  const totalPeredaranBruto = baris[11].kumulatif;
  const melebihiBatasFinal = totalPeredaranBruto > BATAS_PEREDARAN_FINAL;

  const dasar = {
    tahun,
    konfigurasi,
    baris,
    totalPeredaranBruto,
    melebihiBatasFinal,
    sisaFasilitas: 0,
    bulanFasilitasHabis: null as number | null,
  };

  switch (konfigurasi.rezim) {
    case "FINAL_UMKM":
      return hitungFinal(dasar);
    case "NPPN":
      return hitungNppn(dasar);
    case "PEMBUKUAN_OP":
      return hitungPembukuanOp(dasar, labaBersih);
    case "PEMBUKUAN_BADAN":
      return hitungPembukuanBadan(dasar, labaBersih);
    default:
      return {
        ...dasar,
        pajakTerutang: 0,
        setoranBulanan: false,
        langkah: [
          {
            label: "Peredaran bruto setahun",
            nilai: totalPeredaranBruto,
            rumus: "jumlah penjualan tanpa pajak daerah",
          },
          {
            label: "Pajak dihitung di luar Catad",
            nilai: 0,
            rumus: "rekap ini disiapkan untuk diserahkan ke penyusun SPT",
            hasil: true,
          },
        ],
      };
  }
}

type Dasar = Omit<HasilPajak, "pajakTerutang" | "langkah" | "setoranBulanan">;

function hitungFinal(dasar: Dasar): HasilPajak {
  const { konfigurasi, baris } = dasar;
  let fasilitasTerpakai = 0;
  let bulanFasilitasHabis: number | null = null;

  for (const b of baris) {
    const sisaFasilitas = Math.max(0, konfigurasi.fasilitasBebas - fasilitasTerpakai);
    const bagianBebas = Math.min(b.peredaranBruto, sisaFasilitas);
    fasilitasTerpakai += bagianBebas;

    if (
      konfigurasi.fasilitasBebas > 0 &&
      bulanFasilitasHabis === null &&
      fasilitasTerpakai >= konfigurasi.fasilitasBebas
    ) {
      bulanFasilitasHabis = b.bulan;
    }

    b.bagianBebas = bagianBebas;
    b.dasarPengenaan = b.peredaranBruto - bagianBebas;
    b.pajakMasa = terapkanBps(b.dasarPengenaan, konfigurasi.tarifFinalBps);
  }

  const totalDasar = baris.reduce((j, b) => j + b.dasarPengenaan, 0);
  const pajakTerutang = baris.reduce((j, b) => j + b.pajakMasa, 0);

  return {
    ...dasar,
    sisaFasilitas: Math.max(0, konfigurasi.fasilitasBebas - fasilitasTerpakai),
    bulanFasilitasHabis,
    pajakTerutang,
    setoranBulanan: true,
    langkah: [
      { label: "Peredaran bruto setahun", nilai: dasar.totalPeredaranBruto },
      ...(konfigurasi.fasilitasBebas > 0
        ? [
            {
              label: "Dikurangi fasilitas bebas PPh",
              nilai: -(dasar.totalPeredaranBruto - totalDasar),
              rumus: `maksimal ${rupiahSingkat(konfigurasi.fasilitasBebas)} setahun`,
            },
          ]
        : []),
      { label: "Dasar pengenaan pajak", nilai: totalDasar },
      {
        label: "PPh Final terutang",
        nilai: pajakTerutang,
        rumus: `${persenDariBps(konfigurasi.tarifFinalBps)} × dasar pengenaan, dihitung tiap masa pajak`,
        hasil: true,
      },
    ],
  };
}

function hitungNppn(dasar: Dasar): HasilPajak {
  const { konfigurasi, totalPeredaranBruto } = dasar;

  const neto = terapkanBps(totalPeredaranBruto, konfigurasi.normaBps);
  const pkp = bulatkanPkp(neto - konfigurasi.ptkp);
  const pajakTerutang = pphPasal17(pkp);

  return {
    ...dasar,
    pajakTerutang,
    setoranBulanan: false,
    langkah: [
      { label: "Peredaran bruto setahun", nilai: totalPeredaranBruto },
      {
        label: "Penghasilan neto menurut norma",
        nilai: neto,
        rumus: `${persenDariBps(konfigurasi.normaBps)} × peredaran bruto`,
      },
      {
        label: "Dikurangi PTKP",
        nilai: -konfigurasi.ptkp,
        rumus: "penghasilan tidak kena pajak setahun",
      },
      { label: "Penghasilan Kena Pajak", nilai: pkp, rumus: "dibulatkan ke bawah, ribuan penuh" },
      {
        label: "PPh terutang",
        nilai: pajakTerutang,
        rumus: "tarif progresif Pasal 17",
        hasil: true,
      },
    ],
  };
}

function hitungPembukuanOp(dasar: Dasar, labaBersih: number): HasilPajak {
  const { konfigurasi, totalPeredaranBruto } = dasar;

  const pkp = bulatkanPkp(labaBersih - konfigurasi.ptkp);
  const pajakTerutang = pphPasal17(pkp);

  return {
    ...dasar,
    pajakTerutang,
    setoranBulanan: false,
    langkah: [
      { label: "Peredaran bruto setahun", nilai: totalPeredaranBruto },
      {
        label: "Laba bersih menurut catatan",
        nilai: labaBersih,
        rumus: "omzet dikurangi harga pokok dan biaya operasional",
      },
      { label: "Dikurangi PTKP", nilai: -konfigurasi.ptkp },
      { label: "Penghasilan Kena Pajak", nilai: pkp, rumus: "dibulatkan ke bawah, ribuan penuh" },
      {
        label: "PPh terutang",
        nilai: pajakTerutang,
        rumus: "tarif progresif Pasal 17",
        hasil: true,
      },
    ],
  };
}

function hitungPembukuanBadan(dasar: Dasar, labaBersih: number): HasilPajak {
  const { konfigurasi, totalPeredaranBruto } = dasar;

  const pkp = bulatkanPkp(labaBersih);
  const pajakTerutang = pphBadan({
    pkp,
    peredaranBruto: totalPeredaranBruto,
    tarifBps: konfigurasi.tarifBadanBps,
    pakai31E: konfigurasi.pakai31E,
  });

  const dapatFasilitas =
    konfigurasi.pakai31E && totalPeredaranBruto > 0 && totalPeredaranBruto <= BATAS_PEREDARAN_31E;

  return {
    ...dasar,
    pajakTerutang,
    setoranBulanan: false,
    langkah: [
      { label: "Peredaran bruto setahun", nilai: totalPeredaranBruto },
      {
        label: "Laba bersih menurut catatan",
        nilai: labaBersih,
        rumus: "omzet dikurangi harga pokok dan biaya operasional",
      },
      { label: "Penghasilan Kena Pajak", nilai: pkp, rumus: "dibulatkan ke bawah, ribuan penuh" },
      {
        label: "PPh badan terutang",
        nilai: pajakTerutang,
        rumus: dapatFasilitas
          ? `${persenDariBps(konfigurasi.tarifBadanBps)} dengan pengurangan 50% Pasal 31E`
          : persenDariBps(konfigurasi.tarifBadanBps),
        hasil: true,
      },
    ],
  };
}

function rupiahSingkat(nilai: number): string {
  if (nilai >= 1_000_000_000) return `Rp${(nilai / 1_000_000_000).toString().replace(".", ",")} miliar`;
  if (nilai >= 1_000_000) return `Rp${(nilai / 1_000_000).toString().replace(".", ",")} juta`;
  return `Rp${nilai.toLocaleString("id-ID")}`;
}

// ── Ringkasan laba rugi ─────────────────────────────────────────────────────

export type RingkasanLabaRugi = {
  peredaranBruto: number;
  hargaPokokPenjualan: number;
  labaKotor: number;
  biayaOperasional: number;
  labaBersih: number;
  /** Marjin laba bersih terhadap peredaran bruto; null bila belum ada omzet. */
  marjinBersih: number | null;
};

export function ringkasLabaRugi({
  peredaranBruto,
  hargaPokokPenjualan,
  biayaOperasional,
}: {
  peredaranBruto: number;
  hargaPokokPenjualan: number;
  biayaOperasional: number;
}): RingkasanLabaRugi {
  const labaKotor = peredaranBruto - hargaPokokPenjualan;
  const labaBersih = labaKotor - biayaOperasional;

  return {
    peredaranBruto,
    hargaPokokPenjualan,
    labaKotor,
    biayaOperasional,
    labaBersih,
    marjinBersih: peredaranBruto > 0 ? (labaBersih / peredaranBruto) * 100 : null,
  };
}

// ── Catatan ─────────────────────────────────────────────────────────────────

/**
 * Catatan yang perlu dibaca sebelum angkanya dipakai.
 *
 * Diturunkan dari konfigurasi yang benar-benar dipakai, bukan kalimat tetap.
 * Kalau rezimnya diubah tetapi catatannya tidak ikut berubah, dokumennya
 * menyebut dasar hukum yang tidak dipakai — dan itu justru menyesatkan.
 *
 * Dikembalikan sebagai data supaya kalimat yang sama muncul di layar dan di
 * dalam PDF. Peringatan yang hanya ada di salah satunya adalah peringatan yang
 * gagal.
 */
/**
 * Di luar skema final, pajak setahun umumnya dicicil lewat angsuran PPh Pasal
 * 25 tiap bulan. Catad tidak menghitungnya — besarnya diturunkan dari SPT tahun
 * sebelumnya, bukan dari penjualan tahun berjalan. Menyebut angka tahunan tanpa
 * menyinggung ini membuat pembacanya mengira tidak ada kewajiban bulanan.
 */
const CATATAN_PASAL_25 =
  "Angsuran PPh Pasal 25 tidak dihitung di sini. Di luar skema final, pajak setahun " +
  "umumnya dicicil bulanan dengan besaran yang mengacu pada SPT tahun sebelumnya.";

export function catatanPajak(hasil: HasilPajak): string[] {
  const k = hasil.konfigurasi;
  const catatan: string[] = [];

  switch (k.rezim) {
    case "FINAL_UMKM":
      catatan.push(
        `Memakai skema PPh Final UMKM ${persenDariBps(k.tarifFinalBps)} dari peredaran bruto ` +
          "(PP 23/2018 sebagaimana diubah PP 55/2022 dan PP 20/2026).",
      );
      if (k.fasilitasBebas > 0) {
        catatan.push(
          `Peredaran bruto ${rupiahSingkat(k.fasilitasBebas)} pertama dalam satu tahun pajak ` +
            "tidak dikenai PPh Final. Fasilitas ini hanya untuk Wajib Pajak Orang Pribadi.",
        );
      } else {
        catatan.push(
          "Fasilitas peredaran bruto bebas PPh tidak diterapkan pada perhitungan ini.",
        );
      }
      catatan.push(
        `Penyetoran paling lambat tanggal ${TANGGAL_JATUH_TEMPO} bulan berikutnya. Bila jatuh ` +
          "pada hari libur, penyetoran dilakukan pada hari kerja berikutnya.",
      );
      break;

    case "NPPN":
      catatan.push(
        `Memakai Norma Penghitungan Penghasilan Neto sebesar ${persenDariBps(k.normaBps)} dari ` +
          "peredaran bruto. Persentase norma ditetapkan menurut jenis usaha dan wilayah " +
          "(PER-17/PJ/2015) — pastikan angkanya sesuai dengan usaha Anda.",
      );
      catatan.push(
        `PTKP yang dipakai ${rupiahSingkat(k.ptkp)} setahun. Sesuaikan bila status keluarga berubah.`,
      );
      catatan.push("PPh dihitung dengan tarif progresif Pasal 17 untuk satu tahun pajak penuh.");
      catatan.push(CATATAN_PASAL_25);
      break;

    case "PEMBUKUAN_OP":
      catatan.push(
        "Pajak dihitung dari laba bersih menurut catatan Catad, dikurangi PTKP, lalu dikenai " +
          "tarif progresif Pasal 17.",
      );
      catatan.push(
        `PTKP yang dipakai ${rupiahSingkat(k.ptkp)} setahun. Sesuaikan bila status keluarga berubah.`,
      );
      catatan.push(
        "PENTING: laba menurut catatan belum tentu sama dengan laba fiskal. Biaya yang tidak " +
          "boleh dikurangkan, penyusutan, dan koreksi fiskal lain belum diperhitungkan.",
      );
      catatan.push(CATATAN_PASAL_25);
      break;

    case "PEMBUKUAN_BADAN":
      catatan.push(
        `Laba bersih dikenai tarif PPh badan ${persenDariBps(k.tarifBadanBps)}` +
          (k.pakai31E
            ? ", dengan fasilitas pengurangan tarif 50% Pasal 31E atas bagian peredaran bruto sampai Rp4,8 miliar."
            : ", tanpa fasilitas Pasal 31E."),
      );
      catatan.push(
        "PENTING: laba menurut catatan belum tentu sama dengan laba fiskal. Biaya yang tidak " +
          "boleh dikurangkan, penyusutan, dan koreksi fiskal lain belum diperhitungkan.",
      );
      catatan.push(CATATAN_PASAL_25);
      break;

    default:
      catatan.push(
        "Catad hanya menyusun rekap peredaran bruto dan laba rugi. Perhitungan pajaknya " +
          "dikerjakan di luar aplikasi.",
      );
      break;
  }

  if (k.rezim === "FINAL_UMKM" && hasil.melebihiBatasFinal) {
    catatan.push(
      "PERHATIAN: peredaran bruto setahun melampaui Rp4,8 miliar sehingga skema final tidak " +
        "lagi berlaku. Ubah rezim pajak di pengaturan dan hubungi konsultan pajak — angka pada " +
        "dokumen ini tidak bisa dipakai apa adanya.",
    );
  }

  catatan.push(
    "Pajak daerah atas makanan dan minuman (PB1/PBJT) tidak termasuk dalam peredaran bruto " +
      "karena dipungut dari pembeli untuk disetor ke pemerintah daerah.",
  );

  catatan.push(
    "PPN tidak dihitung di sini. Menghitung PPN terutang memerlukan pajak masukan dari faktur " +
      "pembelian, dan Catad tidak mencatatnya.",
  );

  return catatan;
}
