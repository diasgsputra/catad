import { NextResponse, type NextRequest } from "next/server";
import { NAMA_COOKIE, bacaToken } from "@/lib/auth";

const HALAMAN_TAMU = ["/masuk", "/daftar"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
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
  matcher: ["/app/:path*", "/masuk", "/daftar"],
};
