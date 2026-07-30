import { NextResponse, type NextRequest } from "next/server";
import { NAMA_COOKIE, bacaToken } from "@/lib/auth";
import { NAMA_COOKIE_OPERATOR, bacaTokenOperator } from "@/lib/auth-admin";

const HALAMAN_TAMU = ["/masuk", "/daftar"];

/** Halaman panel yang harus tetap terbuka tanpa sesi operator. */
const PANEL_TERBUKA = new Set(["/admin/masuk", "/admin/keluar"]);

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ── Panel operator ────────────────────────────────────────────────────────
  // Penjagaannya terpisah total dari sesi toko dan diperiksa lebih dulu. Sesi
  // toko sama sekali tidak dilihat di sini: token toko yang sah tidak boleh
  // membuka satu halaman panel pun.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (PANEL_TERBUKA.has(pathname)) return NextResponse.next();

    const operator = await bacaTokenOperator(req.cookies.get(NAMA_COOKIE_OPERATOR)?.value);
    if (!operator) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/masuk";
      // Tujuan asal sengaja tidak dibawa. Menyimpan jalur kembali yang berasal
      // dari luar pada panel lintas toko menambah permukaan risiko tanpa
      // manfaat berarti — panelnya kecil dan mudah ditelusuri sendiri.
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const sesi = await bacaToken(req.cookies.get(NAMA_COOKIE)?.value);

  // Area aplikasi wajib login.
  if (pathname.startsWith("/app")) {
    if (!sesi) {
      const url = req.nextUrl.clone();
      url.pathname = "/masuk";
      url.search = `?lanjut=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Yang sudah login tidak perlu melihat halaman masuk/daftar lagi.
  if (sesi && HALAMAN_TAMU.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/admin", "/admin/:path*", "/masuk", "/daftar"],
};
