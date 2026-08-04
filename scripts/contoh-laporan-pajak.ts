/**
 * Menghasilkan contoh laporan pajak sebagai PDF, tanpa menyentuh basis data.
 *
 * Dipakai untuk memeriksa tata letak dan kesahihan berkas dengan mata sendiri —
 * termasuk keadaan yang jarang muncul di data contoh, seperti omzet yang
 * melampaui fasilitas Rp500 juta sehingga kolom pajaknya benar-benar terisi.
 *
 *   npx tsx scripts/contoh-laporan-pajak.ts [berkas.pdf]
 */

import { writeFileSync } from "node:fs";
import { laporanPajakPdf } from "../src/lib/laporan-pajak-pdf";
import { hitungPajakTahunan, ringkasLabaRugi } from "../src/lib/pajak";
import type { DataPajakTahunan } from "../src/lib/pajak-data";

const JT = 1_000_000;
const TAHUN = 2026;

// Warung yang tumbuh sepanjang tahun dan melewati Rp500 juta di pertengahan.
const omzetBulanan = [
  38 * JT,
  41 * JT,
  47 * JT,
  52 * JT,
  55 * JT,
  61 * JT,
  74 * JT,
  68 * JT,
  72 * JT,
  81 * JT,
  88 * JT,
  103 * JT,
];

const pajak = hitungPajakTahunan({ omzetBulanan, jenis: "ORANG_PRIBADI", tahun: TAHUN });

const hpp = Math.round(pajak.totalPeredaranBruto * 0.68);
const biaya = Math.round(pajak.totalPeredaranBruto * 0.14);

const data: DataPajakTahunan = {
  tahun: TAHUN,
  bulan: omzetBulanan.map((bruto, i) => ({
    bulan: i + 1,
    peredaranBruto: bruto,
    hargaPokokPenjualan: Math.round(bruto * 0.68),
    biayaOperasional: Math.round(bruto * 0.14),
    jumlahTransaksi: Math.round(bruto / 25_000),
  })),
  pajak,
  labaRugi: ringkasLabaRugi({
    peredaranBruto: pajak.totalPeredaranBruto,
    hargaPokokPenjualan: hpp,
    biayaOperasional: biaya,
  }),
  pajakDaerahDipungut: Math.round(pajak.totalPeredaranBruto * 0.1),
};

const pdf = laporanPajakPdf({
  data,
  identitas: {
    namaToko: "Warung Bu Sari",
    namaWajibPajak: "Sari Wulandari",
    npwp: "09.254.294.3-407.000",
    jenisWajibPajak: "ORANG_PRIBADI",
    jenisUsaha: "Warung / Toko Kelontong",
    alamat: "Jl. Melati No. 12, Yogyakarta",
  },
  dibuatLabel: "1 Agustus 2026",
  dibuatPada: "20260801091500",
});

const tujuan = process.argv[2] ?? "contoh-laporan-pajak.pdf";
writeFileSync(tujuan, pdf);

console.log(`Contoh laporan ditulis ke ${tujuan} (${pdf.length} bita).`);
console.log(`Peredaran bruto  : Rp${pajak.totalPeredaranBruto.toLocaleString("id-ID")}`);
console.log(`Dasar pengenaan  : Rp${pajak.totalDasarPengenaan.toLocaleString("id-ID")}`);
console.log(`PPh Final 0,5%   : Rp${pajak.totalPphFinal.toLocaleString("id-ID")}`);
console.log(`Fasilitas habis  : bulan ke-${pajak.bulanFasilitasHabis}`);
