import { rupiah } from "./format";
import { catatanPajak, LABEL_REZIM } from "./pajak";
import type { DataPajakTahunan } from "./pajak-data";
import {
  A4,
  buatPdf,
  garis,
  kotak,
  teks,
  teksKanan,
  type HalamanPdf,
  type Instruksi,
} from "./pdf";

/**
 * Menyusun dokumen "Rekapitulasi Peredaran Bruto dan PPh Final".
 *
 * Bentuknya mengikuti apa yang memang diminta DJP sebagai lampiran SPT Tahunan
 * bagi wajib pajak UMKM skema final: rekap peredaran bruto PER BULAN beserta
 * PPh yang terutang atas masing-masing bulan. Wajib pajak skema ini tidak
 * diwajibkan menyelenggarakan pembukuan penuh, cukup pencatatan — dan pencatatan
 * itulah yang sebenarnya sudah dikerjakan Catad setiap hari.
 *
 * Ringkasan laba rugi ikut disertakan meski bukan bagian dari lampiran pajak,
 * karena pemilik toko tetap perlu tahu labanya. PPh final dihitung dari omzet
 * dan tidak peduli untung atau rugi; tanpa laba rugi di sebelahnya, angka
 * pajaknya terasa muncul entah dari mana.
 *
 * Dokumen ini KERTAS KERJA, bukan formulir SPT. Ia menyiapkan angka yang perlu
 * disalin ke SPT, bukan menggantikannya.
 */

export type IdentitasPajak = {
  namaToko: string;
  namaWajibPajak: string | null;
  npwp: string | null;
  jenisWajibPajak: "ORANG_PRIBADI" | "BADAN";
  jenisUsaha: string;
  alamat: string | null;
};

const MARGIN = 40;
const KIRI = MARGIN;
const KANAN = A4.lebar - MARGIN;
const ATAS = A4.tinggi - MARGIN;
const BAWAH = MARGIN + 26;

/** Tepi kanan tiap kolom angka. */
const KOLOM = {
  bruto: 235,
  bebas: 320,
  dasar: 405,
  pph: 480,
  tempo: 492, // tepi KIRI kolom tanggal
};

const angkaKosong = "-";

function nilai(n: number): string {
  return n === 0 ? angkaKosong : rupiah(n, { tanpaSimbol: true });
}

/**
 * Memenggal teks menjadi baris-baris.
 *
 * Perkiraan lebar memakai rata-rata Helvetica sekitar setengah ukuran font per
 * aksara. Cukup untuk paragraf catatan; kolom angka tidak pernah memakai ini
 * karena sudah dirata-kanankan dengan font berlebar tetap.
 */
function penggal(isi: string, lebarPoin: number, ukuran: number): string[] {
  const maks = Math.max(20, Math.floor(lebarPoin / (ukuran * 0.5)));
  const kata = isi.split(" ");
  const baris: string[] = [];
  let sekarang = "";

  for (const k of kata) {
    const calon = sekarang ? `${sekarang} ${k}` : k;
    if (calon.length > maks && sekarang) {
      baris.push(sekarang);
      sekarang = k;
    } else {
      sekarang = calon;
    }
  }
  if (sekarang) baris.push(sekarang);
  return baris;
}

/** Penyusun halaman yang otomatis pindah halaman saat ruangnya habis. */
class Kanvas {
  halaman: HalamanPdf[] = [[]];
  y = ATAS;

  private get aktif(): Instruksi[] {
    return this.halaman[this.halaman.length - 1];
  }

  tambah(...instruksi: Instruksi[]) {
    this.aktif.push(...instruksi);
  }

  /** Menyediakan ruang setinggi `tinggi`; pindah halaman bila tidak cukup. */
  ruang(tinggi: number) {
    if (this.y - tinggi < BAWAH) {
      this.halaman.push([]);
      this.y = ATAS;
    }
    this.y -= tinggi;
  }
}

function kepalaDokumen(k: Kanvas, data: DataPajakTahunan) {
  // Judulnya mengikuti rezim yang dipakai. Menyebut "PPh Final" pada dokumen
  // yang dihitung dengan Norma atau pembukuan akan menyesatkan pembacanya.
  const judul =
    data.pajak.konfigurasi.rezim === "FINAL_UMKM"
      ? "REKAPITULASI PEREDARAN BRUTO DAN PPh FINAL"
      : "REKAPITULASI PEREDARAN BRUTO DAN PAJAK PENGHASILAN";

  k.ruang(18);
  k.tambah(teks(KIRI, k.y, judul, { font: "Helvetica-Bold", ukuran: 12.5 }));

  k.ruang(14);
  k.tambah(
    teks(KIRI, k.y, `Tahun Pajak ${data.tahun}`, {
      font: "Helvetica-Bold",
      ukuran: 10,
      abu: 0.35,
    }),
  );

  k.ruang(11);
  k.tambah(
    teks(KIRI, k.y, `Dasar perhitungan: ${LABEL_REZIM[data.pajak.konfigurasi.rezim]}`, {
      ukuran: 8.5,
      abu: 0.4,
    }),
  );

  k.ruang(8);
  k.tambah(garis(KIRI, k.y, KANAN, { tebal: 1, abu: 0.2 }));
}

function barisIdentitas(k: Kanvas, label: string, isi: string) {
  k.ruang(12);
  k.tambah(
    teks(KIRI, k.y, label, { ukuran: 8.5, abu: 0.4 }),
    teks(KIRI + 110, k.y, isi, { ukuran: 8.5, font: "Helvetica-Bold" }),
  );
}

function blokIdentitas(k: Kanvas, identitas: IdentitasPajak) {
  k.ruang(16);
  k.tambah(teks(KIRI, k.y, "IDENTITAS WAJIB PAJAK", { font: "Helvetica-Bold", ukuran: 8.5 }));

  barisIdentitas(k, "Nama wajib pajak", identitas.namaWajibPajak || identitas.namaToko);
  barisIdentitas(k, "NPWP / NIK", identitas.npwp || "belum diisi");
  barisIdentitas(
    k,
    "Jenis wajib pajak",
    identitas.jenisWajibPajak === "ORANG_PRIBADI" ? "Orang Pribadi" : "Badan Usaha",
  );
  barisIdentitas(k, "Nama usaha", identitas.namaToko);
  barisIdentitas(k, "Jenis usaha", identitas.jenisUsaha);
  if (identitas.alamat) barisIdentitas(k, "Alamat usaha", identitas.alamat);
}

function tabelBulanan(k: Kanvas, data: DataPajakTahunan) {
  // Kolom pajak masa hanya bermakna pada skema yang disetor bulanan. Pada
  // rezim lain pajaknya dihitung sekali setahun, jadi kolomnya dihilangkan
  // daripada diisi nol yang membingungkan.
  const bulanan = data.pajak.setoranBulanan;
  const totalDasar = data.pajak.baris.reduce((j, b) => j + b.dasarPengenaan, 0);

  k.ruang(20);
  k.tambah(
    kotak(KIRI, k.y - 4, KANAN - KIRI, 15, 0.9),
    teks(KIRI + 4, k.y, "Masa Pajak", { font: "Helvetica-Bold", ukuran: 7.5 }),
    teksKanan(KOLOM.bruto, k.y, "Peredaran Bruto", { font: "Courier-Bold", ukuran: 7.5 }),
    teksKanan(KOLOM.bebas, k.y, "Kumulatif", { font: "Courier-Bold", ukuran: 7.5 }),
    ...(bulanan
      ? [
          teksKanan(KOLOM.dasar, k.y, "Dasar Kena", { font: "Courier-Bold", ukuran: 7.5 }),
          teksKanan(KOLOM.pph, k.y, "Pajak Masa", { font: "Courier-Bold", ukuran: 7.5 }),
          teks(KOLOM.tempo, k.y, "Batas Setor", { font: "Helvetica-Bold", ukuran: 7.5 }),
        ]
      : []),
  );

  for (const b of data.pajak.baris) {
    k.ruang(13);
    k.tambah(
      teks(KIRI + 4, k.y, b.namaBulan, { ukuran: 8 }),
      teksKanan(KOLOM.bruto, k.y, nilai(b.peredaranBruto), { ukuran: 8 }),
      teksKanan(KOLOM.bebas, k.y, nilai(b.kumulatif), { ukuran: 8, abu: 0.45 }),
      ...(bulanan
        ? [
            teksKanan(KOLOM.dasar, k.y, nilai(b.dasarPengenaan), { ukuran: 8 }),
            teksKanan(KOLOM.pph, k.y, nilai(b.pajakMasa), { ukuran: 8, font: "Courier-Bold" }),
            teks(KOLOM.tempo, k.y, b.pajakMasa > 0 ? b.jatuhTempoLabel : "-", {
              ukuran: 7.5,
              abu: 0.45,
            }),
          ]
        : []),
    );
    k.tambah(garis(KIRI, k.y - 4, KANAN, { tebal: 0.3, abu: 0.85 }));
  }

  k.ruang(16);
  k.tambah(
    garis(KIRI, k.y + 9, KANAN, { tebal: 0.8, abu: 0.3 }),
    teks(KIRI + 4, k.y, "JUMLAH SETAHUN", { font: "Helvetica-Bold", ukuran: 8 }),
    teksKanan(KOLOM.bruto, k.y, nilai(data.pajak.totalPeredaranBruto), {
      font: "Courier-Bold",
      ukuran: 8,
    }),
    ...(bulanan
      ? [
          teksKanan(KOLOM.dasar, k.y, nilai(totalDasar), { font: "Courier-Bold", ukuran: 8 }),
          teksKanan(KOLOM.pph, k.y, nilai(data.pajak.pajakTerutang), {
            font: "Courier-Bold",
            ukuran: 8,
          }),
        ]
      : []),
  );
  k.ruang(4);
  k.tambah(garis(KIRI, k.y, KANAN, { tebal: 0.8, abu: 0.3 }));
}

/** Langkah perhitungan pajak, sesuai rezim yang dipakai. */
function blokPerhitungan(k: Kanvas, data: DataPajakTahunan) {
  k.ruang(22);
  k.tambah(teks(KIRI, k.y, "PERHITUNGAN PAJAK", { font: "Helvetica-Bold", ukuran: 8.5 }));
  k.ruang(4);
  k.tambah(garis(KIRI, k.y, KANAN, { tebal: 0.5, abu: 0.6 }));

  for (const langkah of data.pajak.langkah) {
    k.ruang(13);
    if (langkah.hasil) {
      k.tambah(garis(KIRI, k.y + 9, KOLOM.dasar, { tebal: 0.5, abu: 0.6 }));
    }
    k.tambah(
      teks(KIRI + 4, k.y, langkah.label, {
        ukuran: 8.5,
        font: langkah.hasil ? "Helvetica-Bold" : "Helvetica",
      }),
      teksKanan(KOLOM.dasar, k.y, rupiah(langkah.nilai, { tanpaSimbol: true }), {
        ukuran: 8.5,
        font: langkah.hasil ? "Courier-Bold" : "Courier",
      }),
      ...(langkah.rumus
        ? [teks(KOLOM.dasar + 12, k.y, langkah.rumus, { ukuran: 7, abu: 0.5 })]
        : []),
    );
  }
}

function barisAngka(
  k: Kanvas,
  label: string,
  jumlah: number,
  opsi: { tebal?: boolean; garisAtas?: boolean } = {},
) {
  k.ruang(13);
  if (opsi.garisAtas) k.tambah(garis(KIRI, k.y + 9, KOLOM.dasar, { tebal: 0.5, abu: 0.6 }));
  k.tambah(
    teks(KIRI + 4, k.y, label, {
      ukuran: 8.5,
      font: opsi.tebal ? "Helvetica-Bold" : "Helvetica",
    }),
    teksKanan(KOLOM.dasar, k.y, rupiah(jumlah, { tanpaSimbol: true }), {
      ukuran: 8.5,
      font: opsi.tebal ? "Courier-Bold" : "Courier",
    }),
  );
}

function blokLabaRugi(k: Kanvas, data: DataPajakTahunan) {
  k.ruang(22);
  k.tambah(
    teks(KIRI, k.y, "RINGKASAN LABA RUGI", { font: "Helvetica-Bold", ukuran: 8.5 }),
  );
  k.ruang(4);
  k.tambah(garis(KIRI, k.y, KANAN, { tebal: 0.5, abu: 0.6 }));

  const lr = data.labaRugi;
  barisAngka(k, "Peredaran bruto (omzet)", lr.peredaranBruto);
  barisAngka(k, "Harga pokok penjualan", -lr.hargaPokokPenjualan);
  barisAngka(k, "Laba kotor", lr.labaKotor, { tebal: true, garisAtas: true });
  barisAngka(k, "Biaya operasional", -lr.biayaOperasional);
  barisAngka(k, "Laba bersih sebelum pajak", lr.labaBersih, { tebal: true, garisAtas: true });
  barisAngka(k, `Pajak penghasilan ${data.tahun}`, -data.pajak.pajakTerutang);
  barisAngka(k, "Laba bersih setelah pajak", lr.labaBersih - data.pajak.pajakTerutang, {
    tebal: true,
    garisAtas: true,
  });

  if (data.pajakDaerahDipungut > 0) {
    k.ruang(14);
    k.tambah(
      teks(
        KIRI + 4,
        k.y,
        `Pajak daerah (PB1/PBJT) yang dipungut dari pembeli: ${rupiah(data.pajakDaerahDipungut)}. ` +
          "Tidak termasuk peredaran bruto maupun laba.",
        { ukuran: 7.5, abu: 0.45 },
      ),
    );
  }
}

function blokCatatan(k: Kanvas, data: DataPajakTahunan) {
  k.ruang(22);
  k.tambah(teks(KIRI, k.y, "CATATAN", { font: "Helvetica-Bold", ukuran: 8.5 }));

  for (const catatan of catatanPajak(data.pajak)) {
    const baris = penggal(catatan, KANAN - KIRI - 14, 7.5);
    baris.forEach((b, i) => {
      k.ruang(10);
      k.tambah(
        teks(KIRI + (i === 0 ? 4 : 14), k.y, i === 0 ? `· ${b}` : b, {
          ukuran: 7.5,
          abu: 0.25,
        }),
      );
    });
  }
}

function kakiDokumen(k: Kanvas, dibuatLabel: string) {
  k.ruang(24);
  k.tambah(garis(KIRI, k.y + 10, KANAN, { tebal: 0.5, abu: 0.7 }));

  const sangkalan =
    "Dokumen ini kertas kerja yang disusun otomatis dari catatan penjualan di Catad, " +
    "bukan formulir SPT dan bukan nasihat perpajakan. Periksa kembali angkanya sebelum " +
    "dilaporkan, dan hubungi konsultan pajak bila keadaan usaha Anda tidak sesederhana " +
    "asumsi di atas.";

  for (const b of penggal(sangkalan, KANAN - KIRI, 7)) {
    k.tambah(teks(KIRI, k.y, b, { ukuran: 7, abu: 0.5 }));
    k.ruang(9);
  }

  k.tambah(teks(KIRI, k.y, `Dibuat ${dibuatLabel} oleh Catad.`, { ukuran: 7, abu: 0.5 }));
}

/** Menyusun berkas PDF laporan pajak. */
export function laporanPajakPdf({
  data,
  identitas,
  dibuatLabel,
  dibuatPada,
}: {
  data: DataPajakTahunan;
  identitas: IdentitasPajak;
  /** Label tanggal pembuatan yang siap dicetak. */
  dibuatLabel: string;
  /** Cap waktu PDF "YYYYMMDDHHmmSS". */
  dibuatPada?: string;
}): Uint8Array {
  const k = new Kanvas();

  kepalaDokumen(k, data);
  blokIdentitas(k, identitas);
  tabelBulanan(k, data);
  blokPerhitungan(k, data);
  blokLabaRugi(k, data);
  blokCatatan(k, data);
  kakiDokumen(k, dibuatLabel);

  return buatPdf(k.halaman, {
    judul: `Rekapitulasi Peredaran Bruto dan Pajak Penghasilan ${data.tahun} - ${identitas.namaToko}`,
    penulis: "Catad",
    dibuatPada,
  });
}

/** Nama berkas unduhan. */
export function namaBerkasLaporanPajak(namaToko: string, tahun: number): string {
  const bersih = namaToko
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `laporan-pajak-${bersih || "toko"}-${tahun}.pdf`;
}
