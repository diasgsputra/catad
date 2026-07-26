import { NextResponse } from "next/server";
import { NAMA_COOKIE } from "@/lib/auth";

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
function tanggapanKeluar() {
  const tanggapan = new NextResponse(null, {
    status: 303, // See Other: lanjutkan dengan GET ke halaman masuk.
    headers: { Location: "/masuk" },
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
 * ketika akun dinonaktifkan atau dihapus setelah token dibuat.
 */
export async function GET() {
  return tanggapanKeluar();
}
