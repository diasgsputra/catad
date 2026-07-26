/**
 * Pintasan papan ketik Catad.
 *
 * Satu sumber kebenaran: daftar di sini dipakai sekaligus oleh penangan
 * tombol, bar petunjuk di bawah layar, dan halaman bantuan. Kalau ada
 * pintasan baru, cukup ditambahkan di sini supaya ketiganya ikut berubah.
 *
 * Aturan yang dipegang:
 *   1. TIDAK memakai tombol F sama sekali. Di banyak laptop F1–F12 baru aktif
 *      setelah menekan Fn, jadi yang terasa satu tombol sebenarnya dua.
 *   2. Perintah memakai Alt + satu huruf. Alt tidak pernah menghasilkan
 *      karakter, jadi aman ditekan walau kursor sedang di kolom pencarian.
 *   3. Tombol tunggal berupa HURUF hanya berlaku saat kursor tidak sedang
 *      berada di kolom isian — supaya mengetik nama barang tidak memicu aksi.
 *   4. Tab, Enter, Esc, panah, dan Del berlaku di mana saja, termasuk saat
 *      mengetik. Ini yang membuat pemindai barcode tetap bisa dipakai.
 */

export type Pintasan = {
  /** Tampilan tombol, mis. ["Alt", "B"] atau ["Tab"]. */
  tombol: string[];
  aksi: string;
  /** Penjelasan tambahan bila perlu. */
  catatan?: string;
};

export type GrupPintasan = {
  judul: string;
  keterangan?: string;
  daftar: Pintasan[];
};

// ── Daftar untuk halaman bantuan ────────────────────────────────────────────

export const PINTASAN_UMUM: GrupPintasan = {
  judul: "Di mana saja",
  keterangan: "Berlaku di seluruh halaman Catad.",
  daftar: [
    { tombol: ["?"], aksi: "Buka / tutup daftar pintasan ini" },
    { tombol: ["←"], aksi: "Masuk ke menu samping", catatan: "Ditekan saat sudah mentok kiri" },
    { tombol: ["Alt", "1–9"], aksi: "Pindah halaman sesuai urutan menu di kiri" },
    { tombol: ["/"], aksi: "Lompat ke kolom pencarian halaman" },
    { tombol: ["Alt", "K"], aksi: "Saring kategori" },
    { tombol: ["Esc"], aksi: "Tutup dialog atau batalkan isian" },
  ],
};

export const PINTASAN_SAMPING: GrupPintasan = {
  judul: "Saat berada di menu samping",
  keterangan: "Tekan ← dari tepi kiri halaman untuk masuk ke sini.",
  daftar: [
    { tombol: ["↑", "↓"], aksi: "Pilih menu" },
    { tombol: ["Enter"], aksi: "Buka halaman yang dipilih" },
    { tombol: ["→"], aksi: "Kembali ke isi halaman" },
    { tombol: ["Esc"], aksi: "Kembali ke isi halaman" },
  ],
};

export const PINTASAN_KASIR: GrupPintasan = {
  judul: "Kasir",
  keterangan: "Kolom pencarian selalu aktif, jadi barcode bisa langsung dipindai.",
  daftar: [
    { tombol: ["ketik"], aksi: "Cari barang", catatan: "Nama atau kode barang" },
    { tombol: ["↑", "↓", "←", "→"], aksi: "Pindah sorotan barang" },
    { tombol: ["Enter"], aksi: "Masukkan barang tersorot ke keranjang" },
    { tombol: ["Tab"], aksi: "Pindah antara daftar barang dan keranjang" },
    { tombol: ["Alt", "B"], aksi: "Bayar", catatan: "Atau: Tab lalu Enter" },
    { tombol: ["Alt", "X"], aksi: "Kosongkan keranjang" },
    { tombol: ["Esc"], aksi: "Hapus kata pencarian" },
  ],
};

export const PINTASAN_KERANJANG: GrupPintasan = {
  judul: "Saat berada di keranjang",
  keterangan: "Tekan Tab untuk masuk ke keranjang.",
  daftar: [
    { tombol: ["↑", "↓"], aksi: "Pilih baris belanjaan" },
    { tombol: ["→"], aksi: "Tambah jumlah 1" },
    { tombol: ["←"], aksi: "Kurangi jumlah 1" },
    { tombol: ["Del"], aksi: "Hapus baris dari keranjang" },
    { tombol: ["Enter"], aksi: "Lanjut ke pembayaran" },
  ],
};

export const PINTASAN_BAYAR: GrupPintasan = {
  judul: "Dialog pembayaran",
  keterangan: "Kolom uang hanya menerima angka, jadi huruf dipakai sebagai pintasan.",
  daftar: [
    { tombol: ["angka"], aksi: "Isi uang yang diterima" },
    { tombol: ["P"], aksi: "Uang pas" },
    { tombol: ["T"], aksi: "Bayar tunai" },
    { tombol: ["Q"], aksi: "Bayar QRIS" },
    { tombol: ["R"], aksi: "Bayar transfer" },
    { tombol: ["K"], aksi: "Bayar kartu" },
    { tombol: ["↑", "↓"], aksi: "Pilih saran pecahan uang" },
    { tombol: ["Enter"], aksi: "Selesaikan transaksi" },
    { tombol: ["Esc"], aksi: "Kembali ke keranjang" },
  ],
};

export const PINTASAN_STRUK: GrupPintasan = {
  judul: "Setelah transaksi tersimpan",
  daftar: [
    { tombol: ["Enter"], aksi: "Mulai transaksi baru" },
    { tombol: ["N"], aksi: "Buka nota digital" },
    { tombol: ["W"], aksi: "Kirim nota lewat WhatsApp" },
    { tombol: ["S"], aksi: "Salin tautan nota" },
  ],
};

export const PINTASAN_DAFTAR: GrupPintasan = {
  judul: "Tabel & daftar",
  keterangan: "Berlaku di halaman transaksi, barang, dan lainnya.",
  daftar: [
    { tombol: ["↑", "↓"], aksi: "Pindah baris" },
    { tombol: ["Enter"], aksi: "Buka baris yang disorot" },
    { tombol: ["Del"], aksi: "Hapus baris yang disorot" },
    { tombol: ["/"], aksi: "Lompat ke kolom pencarian" },
    { tombol: ["N"], aksi: "Tambah data baru" },
  ],
};

export const SEMUA_PINTASAN: GrupPintasan[] = [
  PINTASAN_UMUM,
  PINTASAN_SAMPING,
  PINTASAN_KASIR,
  PINTASAN_KERANJANG,
  PINTASAN_BAYAR,
  PINTASAN_STRUK,
  PINTASAN_DAFTAR,
];

// ── Pembantu penangan tombol ────────────────────────────────────────────────

/**
 * True bila kursor sedang berada di kolom isian.
 * Dipakai untuk menahan pintasan huruf tunggal agar tidak mengganggu ketikan.
 */
export function dalamIsian(sasaran: EventTarget | null): boolean {
  const el = sasaran as HTMLElement | null;
  if (!el || typeof el.tagName !== "string") return false;

  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;

  return el.isContentEditable === true;
}

/** True bila ada tombol pengubah yang ditekan (Ctrl/Alt/Meta). */
export function adaPengubah(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.altKey || e.metaKey;
}

/**
 * Mencocokkan huruf tunggal tanpa pengubah, mis. "t" untuk tunai.
 * Huruf besar maupun kecil dianggap sama.
 */
export function hurufTunggal(e: KeyboardEvent, huruf: string): boolean {
  return !adaPengubah(e) && e.key.toLowerCase() === huruf.toLowerCase();
}

/**
 * Mencocokkan perintah Alt + huruf, mis. Alt+B untuk bayar.
 *
 * Memakai `e.code` lebih dulu karena pada sebagian tata letak papan ketik
 * Alt mengubah karakter yang dihasilkan (Alt+B bisa jadi "∫").
 */
export function altHuruf(e: KeyboardEvent, huruf: string): boolean {
  if (!e.altKey || e.ctrlKey || e.metaKey) return false;

  const target = huruf.toUpperCase();
  if (e.code === `Key${target}`) return true;

  return e.key.toUpperCase() === target;
}

/** Nomor 1–9 dari tombol Alt+angka; null bila bukan. */
export function nomorAlt(e: KeyboardEvent): number | null {
  if (!e.altKey || e.ctrlKey || e.metaKey) return null;

  // e.code lebih andal daripada e.key karena Alt bisa mengubah karakter.
  const cocok = /^Digit([1-9])$/.exec(e.code);
  if (cocok) return Number(cocok[1]);

  const angka = Number(e.key);
  return Number.isInteger(angka) && angka >= 1 && angka <= 9 ? angka : null;
}

/**
 * True bila kursor papan ketik sedang berada di menu samping.
 *
 * Kerangka aplikasi menandainya di `document.body`, sehingga penangan tombol
 * milik halaman bisa mundur tanpa perlu tahu isi state kerangka — dan tanpa
 * bergantung pada urutan pendaftaran peristiwa.
 */
export function menuSampingAktif(): boolean {
  return typeof document !== "undefined" && document.body.dataset.zonaSamping === "1";
}

/** True bila tombol yang ditekan adalah tanda tanya (Shift + /). */
export function tandaTanya(e: KeyboardEvent): boolean {
  return !e.ctrlKey && !e.altKey && !e.metaKey && e.key === "?";
}

/**
 * True bila kursor teks masih bisa bergerak ke kiri di dalam kolom isian.
 *
 * Dipakai agar tombol ← tidak langsung melompat ke menu samping ketika
 * pengguna sebenarnya sedang membetulkan ketikannya. Baru setelah kursor
 * benar-benar mentok di awal teks, ← dianggap "keluar ke kiri".
 */
export function kursorMasihBisaKeKiri(sasaran: EventTarget | null): boolean {
  const el = sasaran as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el || typeof el.tagName !== "string") return false;

  const tag = el.tagName.toLowerCase();
  if (tag !== "input" && tag !== "textarea") return false;

  // Sebagian jenis input (date, number) tidak punya selectionStart.
  const posisi = (() => {
    try {
      return el.selectionStart;
    } catch {
      return null;
    }
  })();

  if (posisi === null || posisi === undefined) return (el.value ?? "").length > 0;
  return posisi > 0;
}
