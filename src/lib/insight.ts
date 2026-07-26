/**
 * ── Catad Insight ────────────────────────────────────────────────────────────
 * Mesin analisis yang menjadi pembeda utama Catad: bukan cuma menampilkan
 * angka, tapi menyimpulkan apa yang perlu dilakukan pemilik toko hari ini.
 *
 * Isinya empat hal:
 *   1. Prediksi stok habis  — dari kecepatan jual nyata, bukan sekadar
 *                             "stok di bawah minimum".
 *   2. Daftar belanja       — kebutuhan kulakan berikutnya + estimasi modal.
 *   3. Stok mati            — barang yang menahan modal tanpa terjual.
 *   4. Briefing harian      — kalimat bahasa manusia, bukan tabel.
 *
 * Semua fungsi di sini murni (tanpa akses database) supaya mudah diuji.
 */

import { kunciTanggal, jamWib, selisihHari, selisihPersen } from "./format";

// ── Tipe masukan ────────────────────────────────────────────────────────────

export type ProdukRingkas = {
  id: string;
  nama: string;
  satuan: string;
  stok: number;
  stokMinimum: number;
  hargaJual: number;
  hargaModal: number;
  lacakStok: boolean;
};

export type BarisPenjualan = {
  produkId: string | null;
  qty: number;
  subtotal: number;
  /** Total modal baris (modalSatuan x qty). */
  modal: number;
  waktu: Date;
};

export type Velositas = {
  produkId: string;
  /** Total unit terjual dalam jendela pengamatan. */
  qtyTotal: number;
  /** Rata-rata unit terjual per hari. */
  perHari: number;
  /** Jumlah hari yang ada penjualannya (dipakai menilai keandalan prediksi). */
  hariBerjualan: number;
  terakhirTerjual: Date | null;
};

// ── 1. Kecepatan jual ───────────────────────────────────────────────────────

/**
 * Menghitung kecepatan jual per produk dalam `hariJendela` hari terakhir.
 *
 * Pembaginya adalah panjang jendela, bukan jumlah hari yang ada transaksi —
 * supaya barang yang cuma terjual sekali tidak terlihat "cepat habis".
 */
export function hitungVelositas(
  penjualan: BarisPenjualan[],
  hariJendela: number,
): Map<string, Velositas> {
  const hasil = new Map<string, Velositas>();
  const pembagi = Math.max(1, hariJendela);

  for (const baris of penjualan) {
    if (!baris.produkId) continue;

    const ada = hasil.get(baris.produkId);
    if (ada) {
      ada.qtyTotal += baris.qty;
      if (!ada.terakhirTerjual || baris.waktu > ada.terakhirTerjual) {
        ada.terakhirTerjual = baris.waktu;
      }
    } else {
      hasil.set(baris.produkId, {
        produkId: baris.produkId,
        qtyTotal: baris.qty,
        perHari: 0,
        hariBerjualan: 0,
        terakhirTerjual: baris.waktu,
      });
    }
  }

  // Hitung jumlah hari unik yang ada penjualan, per produk.
  const hariUnik = new Map<string, Set<string>>();
  for (const baris of penjualan) {
    if (!baris.produkId) continue;
    const set = hariUnik.get(baris.produkId) ?? new Set<string>();
    set.add(kunciTanggal(baris.waktu));
    hariUnik.set(baris.produkId, set);
  }

  for (const v of hasil.values()) {
    v.perHari = v.qtyTotal / pembagi;
    v.hariBerjualan = hariUnik.get(v.produkId)?.size ?? 0;
  }

  return hasil;
}

// ── 2. Prediksi stok habis ──────────────────────────────────────────────────

export type StatusStok = "HABIS" | "KRITIS" | "WASPADA" | "AMAN" | "TIDAK_BERGERAK";

export type PrediksiStok = {
  produk: ProdukRingkas;
  perHari: number;
  qtyTerjual: number;
  /** Perkiraan hari sampai stok habis; null bila belum bisa diprediksi. */
  hariTersisa: number | null;
  status: StatusStok;
  /** Seberapa bisa dipercaya prediksinya. */
  keandalan: "tinggi" | "sedang" | "rendah";
  terakhirTerjual: Date | null;
  /** Modal yang tertahan di stok saat ini. */
  modalTertahan: number;
};

export const AMBANG_KRITIS_HARI = 3;
export const AMBANG_WASPADA_HARI = 7;

/**
 * Menggabungkan stok saat ini dengan kecepatan jual menjadi prediksi
 * "berapa hari lagi barang ini habis".
 */
export function prediksiStok(
  produk: ProdukRingkas[],
  velositas: Map<string, Velositas>,
  opsi: { hariJendela: number; sekarang?: Date } = { hariJendela: 14 },
): PrediksiStok[] {
  const sekarang = opsi.sekarang ?? new Date();

  const hasil = produk
    .filter((p) => p.lacakStok)
    .map<PrediksiStok>((p) => {
      const v = velositas.get(p.id);
      const perHari = v?.perHari ?? 0;
      const qtyTerjual = v?.qtyTotal ?? 0;

      const hariTersisa = perHari > 0 ? Math.floor(p.stok / perHari) : null;

      let status: StatusStok;
      if (p.stok <= 0) {
        status = "HABIS";
      } else if (hariTersisa !== null && hariTersisa <= AMBANG_KRITIS_HARI) {
        status = "KRITIS";
      } else if (hariTersisa !== null && hariTersisa <= AMBANG_WASPADA_HARI) {
        status = "WASPADA";
      } else if (perHari === 0) {
        // Tidak ada penjualan sama sekali pada jendela pengamatan.
        status = "TIDAK_BERGERAK";
      } else if (p.stok <= p.stokMinimum) {
        status = "WASPADA";
      } else {
        status = "AMAN";
      }

      const hariBerjualan = v?.hariBerjualan ?? 0;
      const keandalan: PrediksiStok["keandalan"] =
        hariBerjualan >= Math.min(7, opsi.hariJendela / 2)
          ? "tinggi"
          : hariBerjualan >= 3
            ? "sedang"
            : "rendah";

      return {
        produk: p,
        perHari,
        qtyTerjual,
        hariTersisa,
        status,
        keandalan,
        terakhirTerjual: v?.terakhirTerjual ?? null,
        modalTertahan: Math.max(0, p.stok) * p.hargaModal,
      };
    });

  // Yang paling mendesak di atas.
  const bobot: Record<StatusStok, number> = {
    HABIS: 0,
    KRITIS: 1,
    WASPADA: 2,
    TIDAK_BERGERAK: 3,
    AMAN: 4,
  };

  return hasil.sort((a, b) => {
    if (bobot[a.status] !== bobot[b.status]) return bobot[a.status] - bobot[b.status];
    const ha = a.hariTersisa ?? Number.POSITIVE_INFINITY;
    const hb = b.hariTersisa ?? Number.POSITIVE_INFINITY;
    if (ha !== hb) return ha - hb;
    return b.perHari - a.perHari;
  });
}

export function ringkasStatusStok(prediksi: PrediksiStok[]) {
  const hitung = { HABIS: 0, KRITIS: 0, WASPADA: 0, AMAN: 0, TIDAK_BERGERAK: 0 };
  for (const p of prediksi) hitung[p.status] += 1;
  return {
    ...hitung,
    perluTindakan: hitung.HABIS + hitung.KRITIS + hitung.WASPADA,
    total: prediksi.length,
  };
}

// ── 3. Daftar belanja otomatis ──────────────────────────────────────────────

export type BarisBelanja = {
  produk: ProdukRingkas;
  /** Saran jumlah kulakan (sudah dibulatkan ke atas). */
  qtySaran: number;
  perHari: number;
  hariTersisa: number | null;
  status: StatusStok;
  estimasiBiaya: number;
  alasan: string;
};

export type DaftarBelanja = {
  baris: BarisBelanja[];
  totalEstimasi: number;
  /** Stok akan cukup untuk berapa hari setelah belanja ini. */
  horizonHari: number;
};

/**
 * Menyusun daftar kulakan: cukup untuk `horizonHari` ke depan, ditambah
 * `bufferHari` sebagai cadangan aman.
 */
export function daftarBelanja(
  prediksi: PrediksiStok[],
  opsi: { horizonHari?: number; bufferHari?: number } = {},
): DaftarBelanja {
  const horizonHari = opsi.horizonHari ?? 14;
  const bufferHari = opsi.bufferHari ?? 3;

  const baris: BarisBelanja[] = [];

  for (const p of prediksi) {
    const bergerak = p.perHari > 0;

    // Barang tidak bergerak tidak perlu dikulakan lagi.
    if (!bergerak && p.produk.stok > 0) continue;

    let qtySaran: number;
    let alasan: string;

    if (bergerak) {
      const butuh = Math.ceil(p.perHari * (horizonHari + bufferHari));
      qtySaran = Math.max(0, butuh - Math.max(0, p.produk.stok));
      if (qtySaran <= 0) continue;
      alasan =
        p.status === "HABIS"
          ? "Stok kosong, padahal masih laku"
          : `Laku ${bulatkan(p.perHari, 1)} ${p.produk.satuan}/hari`;
    } else {
      // Stok habis tanpa data penjualan pada jendela ini — pakai stok minimum.
      qtySaran = Math.max(1, p.produk.stokMinimum);
      alasan = "Stok kosong, belum ada data penjualan";
    }

    baris.push({
      produk: p.produk,
      qtySaran,
      perHari: p.perHari,
      hariTersisa: p.hariTersisa,
      status: p.status,
      estimasiBiaya: qtySaran * p.produk.hargaModal,
      alasan,
    });
  }

  baris.sort((a, b) => {
    const ha = a.hariTersisa ?? -1; // stok kosong (null) diutamakan
    const hb = b.hariTersisa ?? -1;
    if (ha !== hb) return ha - hb;
    return b.estimasiBiaya - a.estimasiBiaya;
  });

  return {
    baris,
    totalEstimasi: baris.reduce((t, b) => t + b.estimasiBiaya, 0),
    horizonHari,
  };
}

function bulatkan(n: number, desimal = 1): string {
  const f = 10 ** desimal;
  const hasil = Math.round(n * f) / f;
  return String(hasil).replace(".", ",");
}

// ── 4. Stok mati ────────────────────────────────────────────────────────────

export type StokMati = {
  produk: ProdukRingkas;
  hariTanpaPenjualan: number | null;
  modalTertahan: number;
};

/** Barang yang masih ada stoknya tapi tidak terjual sama sekali. */
export function deteksiStokMati(
  prediksi: PrediksiStok[],
  sekarang: Date = new Date(),
): StokMati[] {
  return prediksi
    .filter((p) => p.produk.stok > 0 && p.qtyTerjual === 0)
    .map((p) => ({
      produk: p.produk,
      hariTanpaPenjualan: p.terakhirTerjual ? selisihHari(p.terakhirTerjual, sekarang) : null,
      modalTertahan: p.modalTertahan,
    }))
    .sort((a, b) => b.modalTertahan - a.modalTertahan);
}

// ── Distribusi jam ──────────────────────────────────────────────────────────

export type EmberJam = { jam: number; transaksi: number; pendapatan: number };

/** Membagi transaksi ke 24 ember jam (WIB). */
export function distribusiJam(
  transaksi: Array<{ dibuatPada: Date; total: number }>,
): EmberJam[] {
  const ember: EmberJam[] = Array.from({ length: 24 }, (_, jam) => ({
    jam,
    transaksi: 0,
    pendapatan: 0,
  }));

  for (const t of transaksi) {
    const j = jamWib(t.dibuatPada);
    ember[j].transaksi += 1;
    ember[j].pendapatan += t.total;
  }

  return ember;
}

/** Rentang 3 jam paling ramai, mis. { mulai: 17, selesai: 19 }. */
export function jamTersibuk(ember: EmberJam[]): { mulai: number; selesai: number; pendapatan: number } | null {
  const total = ember.reduce((t, e) => t + e.transaksi, 0);
  if (total === 0) return null;

  let terbaik = { mulai: 0, selesai: 2, pendapatan: -1 };
  for (let i = 0; i <= 21; i += 1) {
    const p = ember[i].pendapatan + ember[i + 1].pendapatan + ember[i + 2].pendapatan;
    if (p > terbaik.pendapatan) terbaik = { mulai: i, selesai: i + 2, pendapatan: p };
  }

  return terbaik.pendapatan > 0 ? terbaik : null;
}

// ── 5. Briefing harian ──────────────────────────────────────────────────────

export type NadaInsight = "positif" | "netral" | "peringatan" | "bahaya";

export type Insight = {
  id: string;
  nada: NadaInsight;
  ikon: string;
  judul: string;
  pesan: string;
  aksi?: { label: string; href: string };
  prioritas: number;
};

export type MasukanBriefing = {
  sekarang: Date;
  /** Pendapatan & laba hari ini (sampai detik ini). */
  hariIni: { pendapatan: number; laba: number; transaksi: number; item: number };
  /** Rata-rata pendapatan harian 7 hari sebelumnya (tidak termasuk hari ini). */
  rataHarian7: number;
  kemarin: number;
  prediksi: PrediksiStok[];
  stokMati: StokMati[];
  emberJam: EmberJam[];
  produkTeratas: Array<{ nama: string; qty: number; pendapatan: number }>;
  /** Margin laba 7 hari terakhir vs 7 hari sebelumnya, dalam persen. */
  margin7: number | null;
  marginSebelumnya: number | null;
  pengeluaranBulanIni: number;
  pendapatanBulanIni: number;
  rataKeranjang: number;
  rataKeranjangSebelumnya: number;
  hariTerbaik: { nama: string; rata: number } | null;
};

/**
 * Menghasilkan daftar kesimpulan berbahasa manusia, terurut dari yang paling
 * mendesak. Semua kalimat dirakit dari aturan tetap (bukan model bahasa) agar
 * hasilnya konsisten, cepat, dan bisa dipertanggungjawabkan angkanya.
 */
export function briefingHarian(m: MasukanBriefing): Insight[] {
  const out: Insight[] = [];
  const ringkas = ringkasStatusStok(m.prediksi);

  // — Stok kosong padahal laku (paling mendesak: kehilangan penjualan) —
  const kosongTapiLaku = m.prediksi.filter((p) => p.status === "HABIS" && p.perHari > 0);
  if (kosongTapiLaku.length > 0) {
    const contoh = kosongTapiLaku.slice(0, 3).map((p) => p.produk.nama);
    const potensiHilang = kosongTapiLaku.reduce(
      (t, p) => t + p.perHari * (p.produk.hargaJual - p.produk.hargaModal),
      0,
    );
    out.push({
      id: "stok-kosong",
      nada: "bahaya",
      ikon: "stok-kosong",
      judul: `${kosongTapiLaku.length} barang laku sedang kosong`,
      pesan: `${gabungNama(contoh, kosongTapiLaku.length)} habis padahal biasanya terjual tiap hari. Perkiraan laba yang lewat ${rp(potensiHilang)} per hari.`,
      aksi: { label: "Buat daftar belanja", href: "/app/insight#belanja" },
      prioritas: 100,
    });
  }

  // — Akan habis dalam hitungan hari —
  const kritis = m.prediksi.filter((p) => p.status === "KRITIS");
  if (kritis.length > 0) {
    const paling = kritis[0];
    out.push({
      id: "stok-kritis",
      nada: "peringatan",
      ikon: "stok",
      judul: `${kritis.length} barang habis dalam ${AMBANG_KRITIS_HARI} hari`,
      pesan: `Paling cepat ${paling.produk.nama}: sisa ${paling.produk.stok} ${paling.produk.satuan}, ${paling.hariTersisa === 0 ? "kemungkinan habis hari ini" : `cukup sekitar ${paling.hariTersisa} hari lagi`}.`,
      aksi: { label: "Lihat prediksi stok", href: "/app/insight" },
      prioritas: 90,
    });
  }

  // — Tren penjualan hari ini —
  if (m.rataHarian7 > 0) {
    const beda = selisihPersen(m.hariIni.pendapatan, m.rataHarian7);
    if (beda !== null && Math.abs(beda) >= 12) {
      const naik = beda > 0;
      out.push({
        id: "tren-hari-ini",
        nada: naik ? "positif" : "peringatan",
        ikon: naik ? "naik" : "turun",
        judul: naik
          ? `Penjualan hari ini ${beda}% di atas rata-rata`
          : `Penjualan hari ini ${Math.abs(beda)}% di bawah rata-rata`,
        pesan: `Hari ini masuk ${rp(m.hariIni.pendapatan)} dari ${m.hariIni.transaksi} transaksi. Rata-rata 7 hari terakhir ${rp(m.rataHarian7)} per hari.`,
        prioritas: naik ? 60 : 70,
      });
    }
  }

  // — Jam tersibuk —
  const sibuk = jamTersibuk(m.emberJam);
  if (sibuk) {
    out.push({
      id: "jam-sibuk",
      nada: "netral",
      ikon: "jam",
      judul: `Jam paling ramai ${jam2(sibuk.mulai)}–${jam2(sibuk.selesai + 1)}`,
      pesan: `Sekitar ${rp(sibuk.pendapatan)} penjualan 30 hari terakhir terjadi di rentang ini. Pastikan stok dan tenaga siap sebelum ${jam2(sibuk.mulai)}.`,
      prioritas: 40,
    });
  }

  // — Produk terlaris —
  if (m.produkTeratas.length > 0) {
    const j = m.produkTeratas[0];
    out.push({
      id: "terlaris",
      nada: "positif",
      ikon: "bintang",
      judul: `${j.nama} jadi andalan minggu ini`,
      pesan: `Terjual ${j.qty} unit dan menyumbang ${rp(j.pendapatan)}. Jaga stoknya jangan sampai kosong.`,
      prioritas: 45,
    });
  }

  // — Margin turun —
  if (m.margin7 !== null && m.marginSebelumnya !== null && m.marginSebelumnya > 0) {
    const turun = m.marginSebelumnya - m.margin7;
    if (turun >= 3) {
      out.push({
        id: "margin-turun",
        nada: "peringatan",
        ikon: "turun",
        judul: `Margin laba turun ${Math.round(turun)} poin`,
        pesan: `Minggu ini margin ${Math.round(m.margin7)}%, sebelumnya ${Math.round(m.marginSebelumnya)}%. Cek harga modal yang naik atau diskon yang terlalu sering.`,
        aksi: { label: "Lihat laporan laba", href: "/app/laporan" },
        prioritas: 80,
      });
    } else if (m.margin7 - m.marginSebelumnya >= 3) {
      out.push({
        id: "margin-naik",
        nada: "positif",
        ikon: "naik",
        judul: `Margin laba naik ke ${Math.round(m.margin7)}%`,
        pesan: `Sebelumnya ${Math.round(m.marginSebelumnya)}%. Komposisi barang yang dijual makin menguntungkan.`,
        prioritas: 35,
      });
    }
  }

  // — Modal tertahan di stok mati —
  if (m.stokMati.length > 0) {
    const totalModal = m.stokMati.reduce((t, s) => t + s.modalTertahan, 0);
    if (totalModal > 0) {
      out.push({
        id: "stok-mati",
        nada: "peringatan",
        ikon: "stok-mati",
        judul: `${rp(totalModal)} modal nganggur di ${m.stokMati.length} barang`,
        pesan: `${gabungNama(m.stokMati.slice(0, 3).map((s) => s.produk.nama), m.stokMati.length)} tidak terjual sama sekali dalam 14 hari terakhir. Pertimbangkan diskon atau bundling.`,
        aksi: { label: "Lihat barang mandek", href: "/app/insight#mandek" },
        prioritas: 65,
      });
    }
  }

  // — Arus kas bulan ini —
  if (m.pendapatanBulanIni > 0 && m.pengeluaranBulanIni > 0) {
    const rasio = Math.round((m.pengeluaranBulanIni / m.pendapatanBulanIni) * 100);
    if (rasio >= 70) {
      out.push({
        id: "arus-kas",
        nada: rasio >= 100 ? "bahaya" : "peringatan",
        ikon: "dompet",
        judul:
          rasio >= 100
            ? "Pengeluaran bulan ini melebihi pendapatan"
            : `Pengeluaran sudah ${rasio}% dari pendapatan`,
        pesan: `Masuk ${rp(m.pendapatanBulanIni)}, keluar ${rp(m.pengeluaranBulanIni)} bulan ini. ${rasio >= 100 ? "Tahan dulu belanja yang bisa ditunda." : "Perhatikan pos pengeluaran terbesar."}`,
        aksi: { label: "Lihat pengeluaran", href: "/app/pengeluaran" },
        prioritas: rasio >= 100 ? 95 : 55,
      });
    }
  }

  // — Ukuran keranjang —
  if (m.rataKeranjangSebelumnya > 0 && m.rataKeranjang > 0) {
    const beda = selisihPersen(m.rataKeranjang, m.rataKeranjangSebelumnya);
    if (beda !== null && Math.abs(beda) >= 10) {
      out.push({
        id: "keranjang",
        nada: beda > 0 ? "positif" : "netral",
        ikon: "keranjang",
        judul: `Belanja per pembeli ${beda > 0 ? "naik" : "turun"} ${Math.abs(beda)}%`,
        pesan: `Rata-rata ${rp(m.rataKeranjang)} per transaksi minggu ini, sebelumnya ${rp(m.rataKeranjangSebelumnya)}.${beda < 0 ? " Coba tawarkan barang pelengkap saat di kasir." : ""}`,
        prioritas: 30,
      });
    }
  }

  // — Hari terbaik dalam seminggu —
  if (m.hariTerbaik && m.hariTerbaik.rata > 0) {
    out.push({
      id: "hari-terbaik",
      nada: "netral",
      ikon: "kalender",
      judul: `${m.hariTerbaik.nama} biasanya hari terbaik`,
      pesan: `Rata-rata ${rp(m.hariTerbaik.rata)} per ${m.hariTerbaik.nama}. Siapkan stok lebih sebelum hari itu.`,
      prioritas: 25,
    });
  }

  // — Kondisi aman: tetap beri satu kalimat, jangan halaman kosong —
  if (out.length === 0) {
    out.push({
      id: "aman",
      nada: "positif",
      ikon: "centang",
      judul: "Semua terkendali",
      pesan:
        ringkas.total === 0
          ? "Belum ada produk yang dicatat. Tambahkan barang dulu supaya Catad bisa memantau stok dan penjualan."
          : `${ringkas.total} produk terpantau, tidak ada yang mendesak hari ini. Catad akan memberi tahu begitu ada yang perlu dibelanjakan.`,
      aksi:
        ringkas.total === 0 ? { label: "Tambah produk", href: "/app/produk" } : undefined,
      prioritas: 10,
    });
  }

  return out.sort((a, b) => b.prioritas - a.prioritas);
}

// ── Pembantu format lokal ───────────────────────────────────────────────────

function rp(n: number): string {
  return `Rp${Math.round(n || 0).toLocaleString("id-ID")}`;
}

function jam2(j: number): string {
  return `${String(j % 24).padStart(2, "0")}.00`;
}

function gabungNama(nama: string[], total: number): string {
  const sisa = total - nama.length;
  const teks =
    nama.length <= 1
      ? nama[0] ?? ""
      : `${nama.slice(0, -1).join(", ")} dan ${nama[nama.length - 1]}`;
  return sisa > 0 ? `${teks} (+${sisa} lainnya)` : teks;
}
