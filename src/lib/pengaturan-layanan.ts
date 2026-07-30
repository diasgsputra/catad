import { db } from "./db";
import type { TujuanPembayaran } from "./pembayaran";

/**
 * Pengaturan layanan bersifat tunggal: satu baris untuk seluruh Catad.
 * Id-nya dipaku supaya tidak mungkin ada baris kedua yang saling bersaing.
 */
export const ID_PENGATURAN = "global";

/** Dipakai bila barisnya belum ada — hanya bentuk kosong, bukan nomor sungguhan. */
const KOSONG: TujuanPembayaran = {
  bankNama: "BCA",
  bankRekening: "",
  bankPemilik: null,
  waNomor: "",
  catatanPembayaran: null,
};

/**
 * Tujuan pembayaran yang sedang berlaku.
 *
 * Sengaja tidak memakai upsert: ini jalur baca yang dipanggil dari halaman
 * pelanggan, dan jalur baca tidak boleh menulis. Barisnya sudah dibuat oleh
 * migrasi; kalau toh hilang, nilai kosong dikembalikan dan halaman langganan
 * akan mengakui bahwa pembayaran sedang belum bisa dilayani — lebih baik
 * daripada menampilkan rekening kosong.
 */
export async function tujuanPembayaran(): Promise<TujuanPembayaran> {
  const baris = await db.pengaturanLayanan.findUnique({
    where: { id: ID_PENGATURAN },
    select: {
      bankNama: true,
      bankRekening: true,
      bankPemilik: true,
      waNomor: true,
      catatanPembayaran: true,
    },
  });

  return baris ?? KOSONG;
}

/** Menyimpan tujuan pembayaran. Membuat barisnya bila memang belum ada. */
export async function simpanTujuanPembayaran(nilai: TujuanPembayaran): Promise<void> {
  await db.pengaturanLayanan.upsert({
    where: { id: ID_PENGATURAN },
    create: { id: ID_PENGATURAN, ...nilai },
    update: nilai,
  });
}
