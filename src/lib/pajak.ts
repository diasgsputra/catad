/**
 * Perhitungan PPh Final UMKM (PP 23/2018 → PP 55/2022 → PP 20/2026).
 *
 * Seluruh isi berkas ini murni: masukannya angka, keluarannya angka. Tidak ada
 * Prisma, tidak ada tanggal "sekarang" yang diambil sendiri. Perhitungan pajak
 * harus bisa diuji tanpa basis data dan tidak boleh berubah hasilnya hanya
 * karena dijalankan pada hari yang berbeda.
 *
 * ── Dasar aturan ──────────────────────────────────────────────────────────
 *
 * 1. Tarif 0,5% dari PEREDARAN BRUTO, bukan dari laba. Wajib pajak dengan
 *    peredaran bruto sampai Rp4,8 miliar setahun boleh memakai skema final ini.
 *
 * 2. Wajib Pajak Orang Pribadi mendapat fasilitas Rp500 juta pertama bebas PPh
 *    dalam satu tahun pajak. Fasilitas ini KUMULATIF: dipakai sampai habis,
 *    lalu bulan-bulan berikutnya kena penuh. Badan tidak mendapat fasilitas ini.
 *
 * 3. Disetor paling lambat tanggal 15 bulan berikutnya (PMK 81/2024 Pasal 94
 *    ayat 2). Menyetor sekaligus dianggap melaporkan SPT Masa.
 *
 * 4. PP 20/2026 menghapus batas waktu pemakaian bagi Orang Pribadi dan
 *    Perseroan Perorangan. PT, CV, dan firma tidak lagi bisa memakai skema ini.
 *
 * ── Yang TIDAK dihitung berkas ini ────────────────────────────────────────
 *
 * PB1/PBJT (pajak restoran daerah) sengaja tidak ikut. Pajak itu dipungut dari
 * pembeli untuk disetor ke pemerintah daerah, jadi bukan penghasilan toko dan
 * tidak boleh masuk peredaran bruto. Pemanggil wajib mengirim omzet yang sudah
 * bersih dari pajak tersebut — lihat `peredaranBrutoTransaksi`.
 */

/** Tarif PPh Final UMKM. */
export const TARIF_PPH_FINAL = 0.005;

/** Batas peredaran bruto setahun untuk boleh memakai skema final. */
export const BATAS_PEREDARAN_BRUTO = 4_800_000_000;

/** Fasilitas peredaran bruto tidak kena pajak untuk Wajib Pajak Orang Pribadi. */
export const FASILITAS_BEBAS_OP = 500_000_000;

/** Tanggal jatuh tempo penyetoran pada bulan berikutnya. */
export const TANGGAL_JATUH_TEMPO = 15;

export type JenisWajibPajak = "ORANG_PRIBADI" | "BADAN";

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

export type BarisPajakBulan = {
  /** 1–12 */
  bulan: number;
  namaBulan: string;
  peredaranBruto: number;
  /** Peredaran bruto kumulatif sejak Januari sampai bulan ini. */
  kumulatif: number;
  /** Bagian peredaran bruto bulan ini yang tertutup fasilitas bebas. */
  bagianBebas: number;
  /** Dasar pengenaan pajak: peredaran bruto dikurangi bagian yang bebas. */
  dasarPengenaan: number;
  pphFinal: number;
  /** Batas setor, "YYYY-MM-DD". */
  jatuhTempo: string;
  jatuhTempoLabel: string;
};

export type HasilPajakTahunan = {
  tahun: number;
  jenis: JenisWajibPajak;
  baris: BarisPajakBulan[];
  totalPeredaranBruto: number;
  totalDasarPengenaan: number;
  totalPphFinal: number;
  /** Sisa fasilitas Rp500 juta yang belum terpakai di akhir tahun. */
  sisaFasilitas: number;
  /** True bila peredaran bruto setahun melampaui Rp4,8 miliar. */
  melebihiBatasFinal: boolean;
  /** Bulan saat fasilitas bebas habis; null bila tidak pernah habis. */
  bulanFasilitasHabis: number | null;
};

/**
 * Jatuh tempo penyetoran untuk masa pajak `bulan` tahun `tahun`:
 * tanggal 15 bulan berikutnya.
 *
 * Dihitung sebagai aritmetika tahun/bulan, bukan dengan menggeser objek Date.
 * Menggeser tanggal melewati batas bulan sambil membawa offset WIB mudah
 * meleset satu hari, dan tanggal jatuh tempo pajak tidak boleh meleset.
 */
export function jatuhTempoSetor(tahun: number, bulan: number): { iso: string; label: string } {
  const bulanBerikut = bulan === 12 ? 1 : bulan + 1;
  const tahunBerikut = bulan === 12 ? tahun + 1 : tahun;
  const bb = String(bulanBerikut).padStart(2, "0");

  return {
    iso: `${tahunBerikut}-${bb}-${String(TANGGAL_JATUH_TEMPO).padStart(2, "0")}`,
    label: `${TANGGAL_JATUH_TEMPO} ${namaBulan(bulanBerikut)} ${tahunBerikut}`,
  };
}

/**
 * Menghitung PPh Final setahun dari peredaran bruto per bulan.
 *
 * `omzetBulanan` harus berisi 12 angka, indeks 0 = Januari. Angka yang kurang
 * dianggap nol supaya tahun berjalan tetap bisa dihitung.
 */
export function hitungPajakTahunan({
  omzetBulanan,
  jenis,
  tahun,
}: {
  omzetBulanan: number[];
  jenis: JenisWajibPajak;
  tahun: number;
}): HasilPajakTahunan {
  const baris: BarisPajakBulan[] = [];

  let kumulatif = 0;
  let fasilitasTerpakai = 0;
  let bulanFasilitasHabis: number | null = null;

  for (let bulan = 1; bulan <= 12; bulan += 1) {
    const bruto = Math.max(0, Math.round(omzetBulanan[bulan - 1] ?? 0));
    kumulatif += bruto;

    // Fasilitas bebas dipakai berurutan dari Januari sampai habis. Badan tidak
    // mendapat fasilitas ini sama sekali.
    const sisaSebelum = jenis === "ORANG_PRIBADI" ? FASILITAS_BEBAS_OP - fasilitasTerpakai : 0;
    const bagianBebas = Math.max(0, Math.min(bruto, sisaSebelum));
    fasilitasTerpakai += bagianBebas;

    if (
      jenis === "ORANG_PRIBADI" &&
      bulanFasilitasHabis === null &&
      fasilitasTerpakai >= FASILITAS_BEBAS_OP
    ) {
      bulanFasilitasHabis = bulan;
    }

    const dasarPengenaan = bruto - bagianBebas;

    // Dibulatkan ke bawah ke rupiah penuh, mengikuti kelaziman perhitungan
    // pajak. Selisihnya di bawah satu rupiah per bulan.
    const pphFinal = Math.floor(dasarPengenaan * TARIF_PPH_FINAL);

    const tempo = jatuhTempoSetor(tahun, bulan);

    baris.push({
      bulan,
      namaBulan: namaBulan(bulan),
      peredaranBruto: bruto,
      kumulatif,
      bagianBebas,
      dasarPengenaan,
      pphFinal,
      jatuhTempo: tempo.iso,
      jatuhTempoLabel: tempo.label,
    });
  }

  return {
    tahun,
    jenis,
    baris,
    totalPeredaranBruto: kumulatif,
    totalDasarPengenaan: baris.reduce((j, b) => j + b.dasarPengenaan, 0),
    totalPphFinal: baris.reduce((j, b) => j + b.pphFinal, 0),
    sisaFasilitas:
      jenis === "ORANG_PRIBADI" ? Math.max(0, FASILITAS_BEBAS_OP - fasilitasTerpakai) : 0,
    melebihiBatasFinal: kumulatif > BATAS_PEREDARAN_BRUTO,
    bulanFasilitasHabis,
  };
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

/**
 * Ringkasan laba rugi sederhana.
 *
 * Disediakan berdampingan dengan perhitungan PPh Final karena keduanya menjawab
 * pertanyaan berbeda: PPh Final dihitung dari omzet dan tidak peduli untung
 * atau rugi, sedangkan pemilik toko tetap perlu tahu laba bersihnya. Menyajikan
 * salah satunya saja membuat angka pajak terasa seperti muncul entah dari mana.
 */
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

/**
 * Catatan yang perlu dibaca pemilik toko sebelum memakai angkanya.
 *
 * Dikembalikan sebagai data, bukan ditulis langsung di halaman, supaya kalimat
 * yang sama muncul di layar dan di dalam PDF. Peringatan yang hanya ada di
 * salah satunya adalah peringatan yang gagal.
 */
export function catatanPajak(hasil: HasilPajakTahunan): string[] {
  const catatan: string[] = [];

  catatan.push(
    "Perhitungan memakai skema PPh Final UMKM 0,5% dari peredaran bruto " +
      "(PP 23/2018 sebagaimana diubah PP 55/2022 dan PP 20/2026).",
  );

  if (hasil.jenis === "ORANG_PRIBADI") {
    catatan.push(
      "Sebagai Wajib Pajak Orang Pribadi, peredaran bruto Rp500 juta pertama dalam satu " +
        "tahun pajak tidak dikenai PPh Final.",
    );
  } else {
    catatan.push(
      "Fasilitas Rp500 juta bebas PPh hanya untuk Wajib Pajak Orang Pribadi, sehingga " +
        "tidak diterapkan pada perhitungan ini.",
    );
  }

  if (hasil.melebihiBatasFinal) {
    catatan.push(
      "PERHATIAN: peredaran bruto setahun melampaui Rp4,8 miliar. Skema PPh Final 0,5% " +
        "tidak lagi berlaku dan kewajiban pajak berubah. Angka pada dokumen ini tidak bisa " +
        "dipakai apa adanya — hubungi konsultan pajak.",
    );
  }

  catatan.push(
    "Penyetoran paling lambat tanggal 15 bulan berikutnya. Bila jatuh pada hari libur, " +
      "penyetoran dilakukan pada hari kerja berikutnya.",
  );

  catatan.push(
    "Pajak daerah atas makanan dan minuman (PB1/PBJT) tidak termasuk dalam peredaran bruto " +
      "karena dipungut dari pembeli untuk disetor ke pemerintah daerah.",
  );

  return catatan;
}
