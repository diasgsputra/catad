/**
 * Format angka & tanggal untuk konteks Indonesia.
 *
 * Semua uang disimpan sebagai bilangan bulat rupiah (tanpa desimal) supaya
 * tidak ada galat pembulatan floating point pada perhitungan laba.
 *
 * Semua pelaporan memakai zona waktu Asia/Jakarta (WIB, UTC+7). Batas hari
 * dihitung dengan offset tetap agar hasilnya deterministik dan bisa diuji,
 * terlepas dari zona waktu server.
 */

export const OFFSET_WIB_MENIT = 7 * 60;
const MS_HARI = 24 * 60 * 60 * 1000;

export function rupiah(nilai: number, opsi?: { ringkas?: boolean; tanpaSimbol?: boolean }): string {
  const angka = Math.round(nilai || 0);

  if (opsi?.ringkas) {
    const abs = Math.abs(angka);
    const tanda = angka < 0 ? "-" : "";
    if (abs >= 1_000_000_000) return `${tanda}Rp${bersihkanDesimal(abs / 1_000_000_000)}M`;
    if (abs >= 1_000_000) return `${tanda}Rp${bersihkanDesimal(abs / 1_000_000)}jt`;
    if (abs >= 10_000) return `${tanda}Rp${bersihkanDesimal(abs / 1_000)}rb`;
  }

  // Tanda minus ditaruh sebelum "Rp", sesuai kebiasaan penulisan Indonesia.
  const tanda = angka < 0 ? "-" : "";
  const teks = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Math.abs(angka));
  return opsi?.tanpaSimbol ? `${tanda}${teks}` : `${tanda}Rp${teks}`;
}

function bersihkanDesimal(n: number): string {
  const dibulatkan = Math.round(n * 10) / 10;
  return Number.isInteger(dibulatkan) ? String(dibulatkan) : dibulatkan.toFixed(1).replace(".", ",");
}

export function angka(nilai: number, desimal = 0): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  }).format(nilai || 0);
}

export function persen(nilai: number, desimal = 0): string {
  const tanda = nilai > 0 ? "+" : "";
  return `${tanda}${angka(nilai, desimal)}%`;
}

/** Selisih persen dari `lama` ke `baru`. Mengembalikan null bila tak bermakna. */
export function selisihPersen(baru: number, lama: number): number | null {
  if (!lama || lama <= 0) return baru > 0 ? 100 : null;
  return Math.round(((baru - lama) / lama) * 100);
}

// ── Tanggal (WIB) ───────────────────────────────────────────────────────────

/** Menggeser waktu UTC ke "jam dinding" WIB agar getUTC* membaca nilai lokal. */
function keWaktuDindingWib(tanggal: Date): Date {
  return new Date(tanggal.getTime() + OFFSET_WIB_MENIT * 60 * 1000);
}

/** Awal hari (00:00 WIB) dari tanggal tertentu, dikembalikan sebagai Date UTC. */
export function awalHariWib(tanggal: Date = new Date()): Date {
  const w = keWaktuDindingWib(tanggal);
  const utcTengahHari = Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate());
  return new Date(utcTengahHari - OFFSET_WIB_MENIT * 60 * 1000);
}

/** Akhir hari (23:59:59.999 WIB) dari tanggal tertentu. */
export function akhirHariWib(tanggal: Date = new Date()): Date {
  return new Date(awalHariWib(tanggal).getTime() + MS_HARI - 1);
}

export function tambahHari(tanggal: Date, hari: number): Date {
  return new Date(tanggal.getTime() + hari * MS_HARI);
}

/** Jumlah hari penuh antara dua tanggal (b - a). */
export function selisihHari(a: Date, b: Date): number {
  return Math.floor((awalHariWib(b).getTime() - awalHariWib(a).getTime()) / MS_HARI);
}

/** Kunci tanggal "YYYY-MM-DD" menurut WIB — dipakai untuk mengelompokkan data. */
export function kunciTanggal(tanggal: Date): string {
  const w = keWaktuDindingWib(tanggal);
  const bulan = String(w.getUTCMonth() + 1).padStart(2, "0");
  const hari = String(w.getUTCDate()).padStart(2, "0");
  return `${w.getUTCFullYear()}-${bulan}-${hari}`;
}

/** Jam 0–23 menurut WIB. */
export function jamWib(tanggal: Date): number {
  return keWaktuDindingWib(tanggal).getUTCHours();
}

/** Indeks hari dalam seminggu menurut WIB (0 = Minggu). */
export function hariMingguWib(tanggal: Date): number {
  return keWaktuDindingWib(tanggal).getUTCDay();
}

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function namaHari(tanggal: Date): string {
  return NAMA_HARI[hariMingguWib(tanggal)];
}

/** Nama hari dari indeks (0 = Minggu). */
export function namaHariIndeks(indeks: number): string {
  return NAMA_HARI[((indeks % 7) + 7) % 7];
}

/** Contoh: "25 Jul 2026". */
export function tanggalSingkat(tanggal: Date): string {
  const w = keWaktuDindingWib(tanggal);
  return `${w.getUTCDate()} ${NAMA_BULAN[w.getUTCMonth()].slice(0, 3)} ${w.getUTCFullYear()}`;
}

/** Contoh: "Sabtu, 25 Juli 2026". */
export function tanggalPanjang(tanggal: Date): string {
  const w = keWaktuDindingWib(tanggal);
  return `${namaHari(tanggal)}, ${w.getUTCDate()} ${NAMA_BULAN[w.getUTCMonth()]} ${w.getUTCFullYear()}`;
}

/** Contoh: "14:05". */
export function jamMenit(tanggal: Date): string {
  const w = keWaktuDindingWib(tanggal);
  return `${String(w.getUTCHours()).padStart(2, "0")}:${String(w.getUTCMinutes()).padStart(2, "0")}`;
}

/** Contoh: "25 Jul 2026 • 14:05". */
export function tanggalJam(tanggal: Date): string {
  return `${tanggalSingkat(tanggal)} • ${jamMenit(tanggal)}`;
}

/** Nilai untuk <input type="date"> menurut WIB. */
export function nilaiInputTanggal(tanggal: Date): string {
  return kunciTanggal(tanggal);
}

/** Membaca "YYYY-MM-DD" sebagai awal hari WIB. */
export function dariInputTanggal(teks: string): Date {
  const [t, b, h] = teks.split("-").map(Number);
  if (!t || !b || !h) return awalHariWib();
  return new Date(Date.UTC(t, b - 1, h) - OFFSET_WIB_MENIT * 60 * 1000);
}

/** Contoh: "3 hari lagi", "hari ini", "2 hari lalu". */
export function jarakHari(hari: number): string {
  if (hari === 0) return "hari ini";
  if (hari === 1) return "besok";
  if (hari === -1) return "kemarin";
  return hari > 0 ? `${hari} hari lagi` : `${Math.abs(hari)} hari lalu`;
}
