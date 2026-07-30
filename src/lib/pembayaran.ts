/**
 * Tujuan pembayaran langganan.
 *
 * Modul netral — tanpa "use server" maupun "use client" — supaya boleh dipakai
 * bersama oleh komponen server dan komponen klien.
 */

export const BANK_NAMA = "BCA";
export const BANK_REKENING = "0375553291";

/** Nomor WhatsApp untuk konfirmasi pembayaran, format lokal untuk ditampilkan. */
export const WA_NOMOR = "081329732838";

/**
 * Nomor yang sama dalam format internasional untuk tautan wa.me.
 *
 * wa.me menolak awalan "0" dan tanda "+", jadi harus 62 tanpa tanda apa pun.
 */
export const WA_NOMOR_INTERNASIONAL = "6281329732838";

/** Rekening tanpa pemisah, untuk disalin ke aplikasi mobile banking. */
export function rekeningUntukSalin(): string {
  return BANK_REKENING;
}

/**
 * Tautan WhatsApp berisi pesan konfirmasi yang sudah terisi.
 *
 * Pesannya dibuat lengkap sejak awal — nama toko, paket, dan jumlah — supaya
 * pemilik toko tidak perlu mengetik ulang dan kami tidak perlu bertanya balik.
 */
export function tautanKonfirmasiWa(pesan: string): string {
  return `https://wa.me/${WA_NOMOR_INTERNASIONAL}?text=${encodeURIComponent(pesan)}`;
}

/** Isi pesan konfirmasi pembayaran. */
export function pesanKonfirmasi({
  namaToko,
  siklus,
  jumlah,
}: {
  namaToko: string;
  siklus: "BULANAN" | "TAHUNAN";
  jumlah: string;
}): string {
  return [
    "Halo Catad, saya mau konfirmasi pembayaran langganan.",
    "",
    `Nama toko: ${namaToko}`,
    `Paket: Pro ${siklus === "TAHUNAN" ? "tahunan" : "bulanan"}`,
    `Jumlah transfer: ${jumlah}`,
    "",
    "Bukti transfer saya lampirkan di chat ini.",
  ].join("\n");
}
