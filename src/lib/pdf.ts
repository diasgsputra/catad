/**
 * Penulis PDF minimal, tanpa pustaka luar.
 *
 * Dokumen yang perlu dihasilkan Catad berupa tabel keuangan: teks, garis, dan
 * kotak. Itu bisa ditulis langsung ke format PDF dalam beberapa ratus baris,
 * dan hasilnya jauh lebih ringan daripada menyeret pustaka PDF beserta
 * binariknya ke dalam image Alpine.
 *
 * ── Dua keputusan yang membuat modul ini tetap kecil ──────────────────────
 *
 * 1. Hanya memakai font bawaan PDF (Helvetica dan Courier). Font bawaan tidak
 *    perlu disematkan ke dalam berkas, jadi tidak ada urusan memuat, menyalin,
 *    dan membuat subset glyph.
 *
 * 2. Angka memakai Courier yang lebarnya tetap. Merata-kanankan teks butuh
 *    lebar teks, dan lebar Helvetica hanya bisa diketahui dari tabel metrik
 *    ratusan angka. Courier lebarnya persis 0,6 × ukuran font per aksara, jadi
 *    kolom rupiah bisa dirata-kanankan dengan aritmetika sederhana — dan angka
 *    berhuruf lebar tetap memang lebih rapi dibaca dalam kolom.
 *
 * Koordinat PDF berawal di sudut KIRI BAWAH halaman, satuannya poin (1/72
 * inci). Seluruh fungsi di sini memakai konvensi itu apa adanya.
 */

/** Ukuran A4 dalam poin. */
export const A4 = { lebar: 595.28, tinggi: 841.89 };

export type NamaFont = "Helvetica" | "Helvetica-Bold" | "Courier" | "Courier-Bold";

const KODE_FONT: Record<NamaFont, string> = {
  Helvetica: "F1",
  "Helvetica-Bold": "F2",
  Courier: "F3",
  "Courier-Bold": "F4",
};

/** Lebar satu aksara Courier relatif terhadap ukuran font. */
const LEBAR_COURIER = 0.6;

/**
 * Menyandikan teks untuk dimuat di dalam literal string PDF.
 *
 * Kurung buka, kurung tutup, dan garis miring terbalik punya arti khusus di
 * dalam literal PDF sehingga harus dilarikan. Aksara di luar Latin-1 diganti
 * tanda tanya: font bawaan PDF memakai WinAnsiEncoding dan tidak punya
 * glyph-nya, dan aksara tak dikenal lebih baik terlihat sebagai tanda tanya
 * daripada merusak seluruh berkas.
 */
export function sandikanTeks(teks: string): string {
  let hasil = "";
  for (const aksara of teks) {
    const kode = aksara.codePointAt(0) ?? 63;
    if (aksara === "\\") hasil += "\\\\";
    else if (aksara === "(") hasil += "\\(";
    else if (aksara === ")") hasil += "\\)";
    else if (kode < 32) hasil += " ";
    else if (kode > 255) hasil += "?";
    else hasil += aksara;
  }
  return hasil;
}

/** Lebar teks Courier dalam poin. Hanya sahih untuk font berlebar tetap. */
export function lebarCourier(teks: string, ukuran: number): number {
  return teks.length * LEBAR_COURIER * ukuran;
}

export type OpsiTeks = {
  font?: NamaFont;
  ukuran?: number;
  /** Abu-abu 0 (hitam) sampai 1 (putih). */
  abu?: number;
};

/** Satu instruksi menggambar untuk aliran isi halaman. */
export type Instruksi = string;

/** Teks rata kiri pada titik (x, y). */
export function teks(x: number, y: number, isi: string, opsi: OpsiTeks = {}): Instruksi {
  const font = opsi.font ?? "Helvetica";
  const ukuran = opsi.ukuran ?? 9;
  const abu = opsi.abu ?? 0;

  return [
    "BT",
    `${abu.toFixed(3)} g`,
    `/${KODE_FONT[font]} ${ukuran} Tf`,
    `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
    `(${sandikanTeks(isi)}) Tj`,
    "ET",
  ].join("\n");
}

/**
 * Teks rata kanan dengan tepi kanan pada x.
 *
 * Hanya menerima font Courier karena lebarnya perlu dihitung. Ini pembatasan
 * yang disengaja: memaksa semua kolom angka memakai font berlebar tetap.
 */
export function teksKanan(
  x: number,
  y: number,
  isi: string,
  opsi: Omit<OpsiTeks, "font"> & { font?: "Courier" | "Courier-Bold" } = {},
): Instruksi {
  const ukuran = opsi.ukuran ?? 9;
  const mulai = x - lebarCourier(isi, ukuran);
  return teks(mulai, y, isi, { ...opsi, font: opsi.font ?? "Courier" });
}

/** Garis mendatar. */
export function garis(
  x1: number,
  y: number,
  x2: number,
  opsi: { tebal?: number; abu?: number } = {},
): Instruksi {
  const tebal = opsi.tebal ?? 0.5;
  const abu = opsi.abu ?? 0.75;
  return [
    `${abu.toFixed(3)} G`,
    `${tebal} w`,
    `${x1.toFixed(2)} ${y.toFixed(2)} m`,
    `${x2.toFixed(2)} ${y.toFixed(2)} l`,
    "S",
  ].join("\n");
}

/** Kotak terisi, dipakai sebagai latar baris kepala tabel. */
export function kotak(
  x: number,
  y: number,
  lebar: number,
  tinggi: number,
  abu = 0.92,
): Instruksi {
  return [
    `${abu.toFixed(3)} g`,
    `${x.toFixed(2)} ${y.toFixed(2)} ${lebar.toFixed(2)} ${tinggi.toFixed(2)} re`,
    "f",
  ].join("\n");
}

export type HalamanPdf = Instruksi[];

export type OpsiDokumen = {
  judul?: string;
  penulis?: string;
  /** Waktu pembuatan format "YYYYMMDDHHmmSS". Diberikan pemanggil agar hasilnya bisa diuji. */
  dibuatPada?: string;
};

/** Mengubah untaian Latin-1 menjadi bita apa adanya. */
function keBita(isi: string): Uint8Array {
  const bita = new Uint8Array(isi.length);
  for (let i = 0; i < isi.length; i += 1) bita[i] = isi.charCodeAt(i) & 0xff;
  return bita;
}

/**
 * Merangkai halaman menjadi berkas PDF yang utuh.
 *
 * Tabel xref harus memuat posisi bita setiap objek secara tepat; pembaca PDF
 * memakainya untuk melompat langsung ke objek. Karena itu berkasnya dirangkai
 * sekali sebagai untaian sambil mencatat panjang berjalan, bukan disambung
 * dari potongan yang posisinya ditebak belakangan.
 */
export function buatPdf(halaman: HalamanPdf[], opsi: OpsiDokumen = {}): Uint8Array {
  const jumlahHalaman = Math.max(1, halaman.length);
  const isiHalaman = halaman.length > 0 ? halaman : [[]];

  // Penomoran objek:
  //   1        Catalog
  //   2        Pages
  //   3..      Font (4 buah)
  //   7..      pasangan Page + Contents per halaman
  const ID_CATALOG = 1;
  const ID_PAGES = 2;
  const ID_FONT_AWAL = 3;
  const ID_HALAMAN_AWAL = ID_FONT_AWAL + 4;

  const idPage = (i: number) => ID_HALAMAN_AWAL + i * 2;
  const idIsi = (i: number) => ID_HALAMAN_AWAL + i * 2 + 1;

  const objek: string[] = [];

  objek[ID_CATALOG] = `<< /Type /Catalog /Pages ${ID_PAGES} 0 R >>`;

  const anak = Array.from({ length: jumlahHalaman }, (_, i) => `${idPage(i)} 0 R`).join(" ");
  objek[ID_PAGES] = `<< /Type /Pages /Kids [${anak}] /Count ${jumlahHalaman} >>`;

  const namaFont: NamaFont[] = ["Helvetica", "Helvetica-Bold", "Courier", "Courier-Bold"];
  namaFont.forEach((nama, i) => {
    objek[ID_FONT_AWAL + i] =
      `<< /Type /Font /Subtype /Type1 /BaseFont /${nama} /Encoding /WinAnsiEncoding >>`;
  });

  const sumberDaya =
    "<< /Font << " +
    namaFont.map((n, i) => `/${KODE_FONT[n]} ${ID_FONT_AWAL + i} 0 R`).join(" ") +
    " >> >>";

  isiHalaman.forEach((instruksi, i) => {
    objek[idPage(i)] =
      `<< /Type /Page /Parent ${ID_PAGES} 0 R ` +
      `/MediaBox [0 0 ${A4.lebar.toFixed(2)} ${A4.tinggi.toFixed(2)}] ` +
      `/Resources ${sumberDaya} /Contents ${idIsi(i)} 0 R >>`;

    const aliran = instruksi.join("\n");
    objek[idIsi(i)] =
      `<< /Length ${keBita(aliran).length} >>\nstream\n${aliran}\nendstream`;
  });

  const idInfo = objek.length;
  const tanggal = opsi.dibuatPada ? `/CreationDate (D:${opsi.dibuatPada})` : "";
  objek[idInfo] =
    `<< /Producer (Catad) ` +
    `/Title (${sandikanTeks(opsi.judul ?? "Laporan")}) ` +
    `/Author (${sandikanTeks(opsi.penulis ?? "Catad")}) ${tanggal} >>`;

  // ── Rangkai berkas sambil mencatat posisi tiap objek ──
  let berkas = "%PDF-1.4\n";
  // Komentar bita tinggi menandai berkas ini biner, kelaziman yang membuat
  // perkakas tidak salah memperlakukannya sebagai teks murni.
  berkas += "%\xE2\xE3\xCF\xD3\n";

  const posisi: number[] = [];
  const jumlahObjek = objek.length;

  for (let id = 1; id < jumlahObjek; id += 1) {
    const isi = objek[id];
    if (isi === undefined) continue;
    posisi[id] = keBita(berkas).length;
    berkas += `${id} 0 obj\n${isi}\nendobj\n`;
  }

  const posisiXref = keBita(berkas).length;

  berkas += `xref\n0 ${jumlahObjek}\n`;
  berkas += "0000000000 65535 f \n";
  for (let id = 1; id < jumlahObjek; id += 1) {
    const p = posisi[id] ?? 0;
    berkas += `${String(p).padStart(10, "0")} 00000 n \n`;
  }

  berkas += `trailer\n<< /Size ${jumlahObjek} /Root ${ID_CATALOG} 0 R /Info ${idInfo} 0 R >>\n`;
  berkas += `startxref\n${posisiXref}\n%%EOF\n`;

  return keBita(berkas);
}
