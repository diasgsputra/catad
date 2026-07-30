/**
 * Kuota akun per toko.
 *
 * Masalah yang diselesaikan berkas ini: toko baru mendapat masa uji coba Pro,
 * dan selama masa itu batas akunnya mengikuti Pro (10 akun). Begitu uji coba
 * habis, paket turun ke Gratis yang hanya mengizinkan 1 akun — tetapi akun
 * kasir yang sudah dibuat tidak ikut hilang. Tanpa penjagaan, akun-akun itu
 * tetap bisa dipakai selamanya dan batas paket Gratis jadi tidak berarti.
 *
 * Pendekatannya: akun tidak dihapus dan tidak dinonaktifkan — data pemilik toko
 * tidak boleh ikut hilang gara-gara paket berubah. Yang dilakukan hanya
 * menentukan akun mana yang masih "di dalam kuota". Akun di luar kuota ditolak
 * saat masuk sampai pemiliknya berlangganan atau menghapus akun berlebih.
 */

export type AkunKuota = {
  id: string;
  peran: string;
  dibuatPada: Date;
};

/**
 * Kumpulan id akun yang masih berada di dalam kuota paket.
 *
 * Urutan penentuannya:
 *   1. PEMILIK lebih dulu. Ini yang menjamin pemilik toko selalu bisa masuk —
 *      kalau dia ikut terkunci, tidak ada seorang pun yang bisa berlangganan
 *      atau merapikan akun, dan tokonya mati total.
 *   2. Sesudahnya, yang paling lama dibuat menang. Akun yang sudah dipakai
 *      sehari-hari tidak dikorbankan demi akun yang baru ditambahkan.
 *   3. Id dipakai sebagai penentu terakhir supaya hasilnya tetap sama pada
 *      dua akun yang dibuat pada milidetik yang sama.
 *
 * `maksPengguna` boleh berupa Infinity (paket Pro) — semua akun lolos.
 */
export function idDalamKuota(akun: AkunKuota[], maksPengguna: number): Set<string> {
  if (!Number.isFinite(maksPengguna)) {
    return new Set(akun.map((a) => a.id));
  }

  const urut = [...akun].sort((a, b) => {
    const prioritasA = a.peran === "PEMILIK" ? 0 : 1;
    const prioritasB = b.peran === "PEMILIK" ? 0 : 1;
    if (prioritasA !== prioritasB) return prioritasA - prioritasB;

    const selisih = a.dibuatPada.getTime() - b.dibuatPada.getTime();
    if (selisih !== 0) return selisih;

    return a.id.localeCompare(b.id);
  });

  return new Set(urut.slice(0, Math.max(0, maksPengguna)).map((a) => a.id));
}

/** True bila akun tersebut masih boleh memakai aplikasi. */
export function akunDalamKuota(
  akun: AkunKuota[],
  penggunaId: string,
  maksPengguna: number,
): boolean {
  return idDalamKuota(akun, maksPengguna).has(penggunaId);
}

// ── Pesan penolakan akses ───────────────────────────────────────────────────
// Dikumpulkan di satu tempat supaya kalimat yang dilihat pengguna sama, baik
// saat ditolak di formulir masuk maupun saat sesinya dihentikan di tengah
// pemakaian. Kalau kalimatnya ditulis dua kali, cepat atau lambat keduanya
// berbeda dan pengguna mengira sedang menghadapi dua masalah berbeda.

/** Pesan untuk akun yang terkunci karena jumlah akun melebihi kuota paket. */
export const PESAN_KUOTA_AKUN =
  "Akun ini sedang terkunci karena jumlah akun toko melebihi batas paket Gratis. " +
  "Minta pemilik toko berlangganan Pro atau menghapus akun yang tidak dipakai.";

/**
 * Pesan untuk toko yang diblokir operator.
 *
 * Alasan yang ditulis operator SENGAJA tidak ditampilkan: catatan itu untuk
 * keperluan internal dan bisa memuat penilaian yang tidak pantas dibaca
 * pemilik toko langsung dari halaman masuk.
 */
export const PESAN_TOKO_DIBLOKIR =
  "Akses toko ini sedang dihentikan. Hubungi Catad lewat WhatsApp untuk mengetahui " +
  "sebabnya. Seluruh data toko tetap tersimpan.";
