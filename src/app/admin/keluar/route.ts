import { NextResponse } from "next/server";
import { NAMA_COOKIE_OPERATOR } from "@/lib/auth-admin";

/**
 * Keluar dari panel operator.
 *
 * Location ditulis relatif dengan alasan yang sama seperti `/keluar` milik
 * aplikasi toko: `NextResponse.redirect()` mewajibkan URL absolut, dan di dalam
 * container origin yang terbaca adalah alamat bind server (0.0.0.0:3000), bukan
 * alamat yang dipakai pengguna.
 */
function tanggapanKeluar() {
  const tanggapan = new NextResponse(null, {
    status: 303,
    headers: { Location: "/admin/masuk" },
  });

  tanggapan.cookies.delete(NAMA_COOKIE_OPERATOR);
  return tanggapan;
}

/** Dipakai tombol "Keluar" di kepala panel. */
export async function POST() {
  return tanggapanKeluar();
}

/** Dipakai `wajibOperator()` saat akun operatornya sudah tidak sah lagi. */
export async function GET() {
  return tanggapanKeluar();
}
