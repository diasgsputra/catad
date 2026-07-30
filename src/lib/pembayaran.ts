/**
 * Tujuan pembayaran langganan.
 *
 * Nilainya TIDAK lagi dipatok di berkas ini — disimpan di basis data
 * (`PengaturanLayanan`) dan diubah lewat panel operator. Yang tersisa di sini
 * hanya fungsi murni, supaya modulnya tetap netral: tanpa "use server" maupun
 * "use client", tanpa Prisma, jadi boleh diimpor komponen server dan klien
 * sekaligus, dan bisa diuji tanpa basis data.
 */

export type TujuanPembayaran = {
  bankNama: string;
  bankRekening: string;
  /** Nama pemilik rekening. Null berarti tidak ditampilkan. */
  bankPemilik: string | null;
  /** Nomor WhatsApp dalam bentuk lokal, mis. "081329732838". */
  waNomor: string;
  catatanPembayaran: string | null;
};

/**
 * Mengubah nomor lokal menjadi bentuk internasional untuk tautan wa.me.
 *
 * wa.me menolak awalan "0" maupun tanda "+": nomornya harus 62 diikuti sisa
 * angka, tanpa tanda apa pun. Fungsi ini menerima apa saja yang biasa diketik
 * orang — "0813…", "+62 813-2973-2838", "62813…" — dan menormalkannya.
 */
export function keWaInternasional(nomor: string): string {
  let angka = nomor.replace(/\D/g, "");
  if (!angka) return "";

  // Kode negara dilepas dulu supaya tidak tertempel dua kali.
  if (angka.startsWith("62")) angka = angka.slice(2);

  // Nol depan gaya lokal dibuang. Dilakukan SETELAH kode negara dilepas agar
  // nomor yang ditulis "+62 0813…" tetap terbaca benar.
  angka = angka.replace(/^0+/, "");

  return angka ? `62${angka}` : "";
}

/** Tautan WhatsApp berisi pesan yang sudah terisi. Kosong bila nomornya belum diatur. */
export function tautanKonfirmasiWa(nomorLokal: string, pesan: string): string {
  const internasional = keWaInternasional(nomorLokal);
  if (!internasional) return "";
  return `https://wa.me/${internasional}?text=${encodeURIComponent(pesan)}`;
}

/**
 * True bila tujuan pembayaran sudah cukup lengkap untuk ditunjukkan ke
 * pelanggan. Menampilkan rekening kosong lebih buruk daripada mengakui bahwa
 * pembayaran sedang belum bisa dilayani.
 */
export function pembayaranSiap(tujuan: TujuanPembayaran): boolean {
  return tujuan.bankRekening.trim() !== "" && keWaInternasional(tujuan.waNomor) !== "";
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
