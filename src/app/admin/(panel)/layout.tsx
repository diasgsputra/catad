import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { Ikon } from "@/components/ikon";
import { wajibOperator } from "@/lib/sesi-admin";
import { NavAdmin } from "./nav-admin";

export const metadata: Metadata = {
  title: { default: "Panel operator", template: "%s · Panel Catad" },
  // Panel internal tidak boleh muncul di mesin pencari.
  robots: { index: false, follow: false },
};

/**
 * Kerangka panel operator.
 *
 * Berada di route group `(panel)` supaya penjagaan di sini TIDAK ikut
 * membungkus `/admin/masuk`. Kalau halaman masuk ikut terjaga, penjagaannya
 * mengalihkan ke halaman masuk yang juga terjaga — pengalihannya berputar
 * tanpa akhir.
 *
 * Tampilannya sengaja dibedakan tegas dari aplikasi toko: kepala gelap, tanpa
 * warna merek yang sama. Operator harus bisa tahu dalam sekejap bahwa yang
 * sedang dibuka adalah panel lintas toko, bukan toko miliknya sendiri.
 */
export default async function TataLetakPanel({ children }: { children: React.ReactNode }) {
  const operator = await wajibOperator();

  return (
    <div className="min-h-dvh bg-kertas">
      <header className="sticky top-0 z-30 border-b border-tinta-2/40 bg-tinta text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/admin" className="flex shrink-0 items-center gap-2">
            <LogoMark size={26} gelap />
            <span className="text-[13px] font-extrabold tracking-[0.06em] uppercase">
              Panel operator
            </span>
          </Link>

          <NavAdmin />

          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-[12.5px] font-bold leading-tight">{operator.nama}</span>
              <span className="block text-[11px] leading-tight text-white/50">
                {operator.email}
              </span>
            </span>
            <form action="/admin/keluar" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-bold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Ikon nama="keluar" size={15} />
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-[11.5px] text-tinta-4">
        Setiap tindakan yang mengubah langganan atau memblokir toko dicatat di halaman Jejak
        beserta nama operatornya.
      </footer>
    </div>
  );
}
