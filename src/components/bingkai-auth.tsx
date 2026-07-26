import Link from "next/link";
import { Logo, LogoMark } from "./logo";
import { Ikon } from "./ikon";

/** Bingkai dua kolom untuk halaman masuk & daftar. */
export function BingkaiAuth({
  judul,
  keterangan,
  children,
  kaki,
}: {
  judul: string;
  keterangan: string;
  children: React.ReactNode;
  kaki: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      {/* Panel merek */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-tinta p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-merek/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-emas/10 blur-3xl" />

        <Link href="/" className="relative w-fit rounded-lg">
          <Logo size={32} warnaTeks="text-white" gelap />
        </Link>

        <div className="relative max-w-sm">
          <p className="text-[26px] leading-[1.2] font-extrabold tracking-[-0.03em]">
            Warung yang tercatat rapi lebih mudah tumbuh.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              ["kasir", "Kasir cepat", "Pilih barang, bayar, nota langsung jadi."],
              ["grafik", "Laporan otomatis", "Untung rugi terhitung tanpa rekap manual."],
              ["insight", "Catad Insight", "Tahu barang apa yang harus dibeli besok."],
            ].map(([ikon, judulK, isi]) => (
              <li key={judulK} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-emas">
                  <Ikon nama={ikon as "kasir"} size={16} />
                </span>
                <div>
                  <p className="text-[14px] font-bold">{judulK}</p>
                  <p className="text-[13px] leading-snug text-white/55">{isi}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[12px] text-white/40">
          Catad — Catatan Digital untuk UMKM Indonesia
        </p>
      </aside>

      {/* Panel formulir */}
      <main className="flex flex-col justify-center bg-kertas px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-[400px]">
          <Link href="/" className="mb-8 inline-block lg:hidden">
            <LogoMark size={36} />
          </Link>

          <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.03em] text-tinta">
            {judul}
          </h1>
          <p className="mt-1.5 text-[14px] leading-relaxed text-tinta-3">{keterangan}</p>

          <div className="mt-7">{children}</div>

          <div className="mt-7 border-t border-garis pt-5 text-center text-[13.5px] text-tinta-3">
            {kaki}
          </div>
        </div>
      </main>
    </div>
  );
}
