import { NextResponse, type NextRequest } from "next/server";
import { NAMA_COOKIE } from "@/lib/auth";

/**
 * Alasan keluar yang boleh diteruskan ke halaman masuk.
 *
 * Sengaja berupa daftar tertutup: nilainya masuk ke header Location, jadi teks
 * bebas dari URL tidak boleh ikut. Yang tidak dikenali diabaikan saja.
 */
const ALASAN_SAH = new Set(["kuota"]);

/**
 * Keluar dari akun.
 *
 * Tujuan redirect ditulis sebagai lokasi RELATIF ("/masuk"), bukan URL penuh.
 *
 * `NextResponse.redirect()` mewajibkan URL absolut, dan di dalam container
 * origin yang terbaca adalah alamat bind server (HOSTNAME=0.0.0.0, PORT=3000)
 * — bukan alamat yang dipakai pengguna. Akibatnya peramban dilempar ke
 * http://0.0.0.0:3000/masuk yang tidak bisa dibuka. Header Location relatif
 * diselesaikan peramban terhadap alamat yang sedang dibuka, jadi selalu benar
 * di balik port mapping, reverse proxy, maupun domain apa pun.
 */
function tanggapanKeluar(alasan?: string | null) {
  const tujuan = alasan && ALASAN_SAH.has(alasan) ? `/masuk?alasan=${alasan}` : "/masuk";

  const tanggapan = new NextResponse(null, {
    status: 303, // See Other: lanjutkan dengan GET ke halaman masuk.
    headers: { Location: tujuan },
  });

  tanggapan.cookies.delete(NAMA_COOKIE);
  return tanggapan;
}

/** Dipakai tombol "Keluar". */
export async function POST() {
  return tanggapanKeluar();
}

/**
 * Dipakai saat sesi sudah tidak sah lagi — `konteks()` mengalihkan ke sini
 * ketika akun dinonaktifkan, dihapus, atau berada di luar kuota paket.
 */
export async function GET(permintaan: NextRequest) {
  return tanggapanKeluar(permintaan.nextUrl.searchParams.get("alasan"));
}
