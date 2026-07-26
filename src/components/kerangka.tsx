"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo, LogoMark } from "./logo";
import { Ikon, type NamaIkon } from "./ikon";
import { Kbd, Kunci } from "./ui";
import { PERISTIWA_SAMPING, PintasanGlobal, bukaBantuan } from "./pintasan-global";
import { adaPengubah, kursorMasihBisaKeKiri } from "@/lib/pintasan";
import { cn, inisial } from "@/lib/utils";

export type ButirNav = {
  label: string;
  href: string;
  ikon: NamaIkon;
  /** Angka kecil di sisi kanan, mis. jumlah stok kritis. */
  lencana?: number;
  khususPemilik?: boolean;
};

export type GrupNav = { judul?: string; butir: ButirNav[] };

export type PropsKerangka = {
  grup: GrupNav[];
  pengguna: { nama: string; peran: string; email: string };
  toko: { nama: string; jenisUsaha: string };
  paket: { aktif: string; sumber: string; sisaUjiCoba: number };
  children: React.ReactNode;
};

export function Kerangka({ grup, pengguna, toko, paket, children }: PropsKerangka) {
  const [bukaMenu, setBukaMenu] = useState(false);
  const [zonaSamping, setZonaSamping] = useState(false);
  const [sorotNav, setSorotNav] = useState(0);
  const jalur = usePathname();
  const router = useRouter();

  // Tutup laci setiap kali pindah halaman.
  useEffect(() => {
    setBukaMenu(false);
  }, [jalur]);

  // Kunci gulir badan saat laci terbuka di ponsel.
  useEffect(() => {
    document.body.style.overflow = bukaMenu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [bukaMenu]);

  const butirTerpilih = (href: string) =>
    href === "/app" ? jalur === "/app" : jalur.startsWith(href);

  // Urutan datar dipakai untuk pintasan Alt+1..9 sekaligus nomor di menu.
  const urutanNav = grup.flatMap((g) => g.butir).map((b) => ({ label: b.label, href: b.href }));
  const nomorNav = new Map(urutanNav.slice(0, 9).map((n, i) => [n.href, i + 1]));

  // ── Menu samping sebagai zona papan ketik ──
  const keluarSamping = useCallback(() => {
    setZonaSamping(false);
    // Kembalikan kursor ke isi halaman.
    const cari = document.querySelector<HTMLInputElement>("[data-cari-utama]");
    if (cari) cari.focus();
    else (document.querySelector("main") as HTMLElement | null)?.focus?.();
  }, []);

  const masukSamping = useCallback(() => {
    const sekarang = urutanNav.findIndex((n) => butirTerpilih(n.href));
    setSorotNav(sekarang >= 0 ? sekarang : 0);
    setZonaSamping(true);
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [urutanNav, jalur]);

  // Halaman bisa memanggil masukSamping() lewat peristiwa, mis. saat sorotan
  // di kasir sudah mentok di kolom paling kiri.
  useEffect(() => {
    window.addEventListener(PERISTIWA_SAMPING, masukSamping);
    return () => window.removeEventListener(PERISTIWA_SAMPING, masukSamping);
  }, [masukSamping]);

  useEffect(() => {
    function tangani(e: KeyboardEvent) {
      if (zonaSamping) {
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSorotNav((s) => Math.min(urutanNav.length - 1, s + 1));
            return;
          case "ArrowUp":
            e.preventDefault();
            setSorotNav((s) => Math.max(0, s - 1));
            return;
          case "Enter": {
            e.preventDefault();
            const tujuan = urutanNav[sorotNav];
            setZonaSamping(false);
            if (tujuan) router.push(tujuan.href);
            return;
          }
          case "ArrowRight":
          case "Escape":
            e.preventDefault();
            keluarSamping();
            return;
        }
        return;
      }

      // ── Masuk ke menu samping dengan ← ──
      if (e.key !== "ArrowLeft" || adaPengubah(e)) return;

      // Jangan rebut ← saat pengguna masih membetulkan ketikan.
      if (kursorMasihBisaKeKiri(e.target)) return;

      // Keputusan ditunda satu microtask supaya seluruh penangan lain sempat
      // berjalan lebih dulu. Halaman yang punya navigasi kiri-kanan sendiri
      // (mis. kisi barang di kasir) menandai tombol ini dengan preventDefault
      // selama sorotannya belum mentok kiri. Cara ini tidak bergantung pada
      // urutan pendaftaran maupun fase peristiwa.
      queueMicrotask(() => {
        if (e.defaultPrevented) return;
        masukSamping();
      });
    }

    window.addEventListener("keydown", tangani);
    return () => window.removeEventListener("keydown", tangani);
  }, [zonaSamping, sorotNav, urutanNav, router, keluarSamping, masukSamping]);

  // Zona ditutup begitu halaman berganti.
  useEffect(() => {
    setZonaSamping(false);
  }, [jalur]);

  // Ditandai di body supaya penangan tombol milik halaman tahu harus mundur
  // selama kursor berada di menu samping.
  useEffect(() => {
    if (zonaSamping) document.body.dataset.zonaSamping = "1";
    else delete document.body.dataset.zonaSamping;

    return () => {
      delete document.body.dataset.zonaSamping;
    };
  }, [zonaSamping]);

  // Tab bawah ponsel mengikuti peran: kasir tidak melihat ringkasan & insight.
  const tabBawah: ButirNav[] =
    pengguna.peran === "PEMILIK"
      ? [
          { label: "Ringkasan", href: "/app", ikon: "grafik" },
          { label: "Kasir", href: "/app/kasir", ikon: "kasir" },
          { label: "Insight", href: "/app/insight", ikon: "insight" },
          { label: "Barang", href: "/app/produk", ikon: "kotak" },
          { label: "Laporan", href: "/app/laporan", ikon: "nota" },
        ]
      : [
          { label: "Kasir", href: "/app/kasir", ikon: "kasir" },
          { label: "Transaksi", href: "/app/transaksi", ikon: "nota" },
          { label: "Barang", href: "/app/produk", ikon: "kotak" },
          { label: "Stok", href: "/app/stok", ikon: "stok" },
        ];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <PintasanGlobal nav={urutanNav} />
      {/* ── Sisi kiri (desktop) ── */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh flex-col border-r bg-tinta transition-colors lg:flex",
          zonaSamping ? "border-r-emas/60" : "border-r-tinta-2/20",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/app" className="rounded-lg">
            <Logo size={28} warnaTeks="text-white" gelap />
          </Link>
          {zonaSamping && (
            <span className="animasi-masuk rounded-md bg-emas/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-emas uppercase">
              menu
            </span>
          )}
        </div>

        <IsiNav
          grup={grup}
          terpilih={butirTerpilih}
          nomorNav={nomorNav}
          hrefSorot={zonaSamping ? urutanNav[sorotNav]?.href : undefined}
        />

        {zonaSamping ? (
          <div className="animasi-masuk border-t border-white/10 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="flex items-center gap-1.5">
                <Kunci tombol={["↑", "↓"]} gelap />
                <span className="text-[11px] font-medium text-white/45">Pilih</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Kunci tombol={["Enter"]} gelap />
                <span className="text-[11px] font-medium text-white/45">Buka</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Kunci tombol={["→"]} gelap />
                <span className="text-[11px] font-medium text-white/45">Kembali</span>
              </span>
            </div>
          </div>
        ) : (
          <KakiNav pengguna={pengguna} toko={toko} paket={paket} />
        )}
      </aside>

      {/* ── Kolom kanan ── */}
      <div className="flex min-w-0 flex-col">
        {/* Bar atas ponsel */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-garis bg-kertas/90 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setBukaMenu(true)}
            className="flex size-9 items-center justify-center rounded-lg text-tinta-2 hover:bg-kertas-2"
            aria-label="Buka menu"
          >
            <Ikon nama="menu" size={20} />
          </button>

          <Link href="/app" className="flex items-center gap-2">
            <LogoMark size={24} />
            <span className="text-[15px] font-extrabold tracking-[-0.02em]">Catad</span>
          </Link>

          <Link
            href="/app/kasir"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-merek px-3 text-[13px] font-bold text-white"
          >
            <Ikon nama="kasir" size={15} />
            Kasir
          </Link>
        </header>

        <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>
      </div>

      {/* ── Laci ponsel ── */}
      {bukaMenu && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="animasi-masuk absolute inset-0 bg-tinta/50 backdrop-blur-[2px]"
            onClick={() => setBukaMenu(false)}
            aria-hidden="true"
          />
          <div className="animasi-masuk absolute inset-y-0 left-0 flex w-[268px] flex-col bg-tinta shadow-2xl">
            <div className="flex h-14 items-center justify-between px-5">
              <Logo size={26} warnaTeks="text-white" gelap />
              <button
                type="button"
                onClick={() => setBukaMenu(false)}
                className="flex size-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10"
                aria-label="Tutup menu"
              >
                <Ikon nama="silang" size={18} />
              </button>
            </div>
            <IsiNav grup={grup} terpilih={butirTerpilih} nomorNav={nomorNav} />
            <KakiNav pengguna={pengguna} toko={toko} paket={paket} />
          </div>
        </div>
      )}


      {/* ── Tab bawah (ponsel) ── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-garis bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {tabBawah.map((b) => {
          const aktif = butirTerpilih(b.href);
          return (
            <Link
              key={b.href}
              href={b.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition-colors",
                aktif ? "text-merek" : "text-tinta-4",
              )}
            >
              <Ikon nama={b.ikon} size={19} />
              {b.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function IsiNav({
  grup,
  terpilih,
  nomorNav,
  hrefSorot,
}: {
  grup: GrupNav[];
  terpilih: (href: string) => boolean;
  nomorNav: Map<string, number>;
  /** Menu yang sedang disorot papan ketik saat zona menu samping aktif. */
  hrefSorot?: string;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2">
      {grup.map((g, i) => (
        <div key={g.judul ?? i} className={cn(i > 0 && "mt-5")}>
          {g.judul && (
            <p className="px-2.5 pb-1.5 text-[10px] font-bold tracking-[0.12em] text-white/30 uppercase">
              {g.judul}
            </p>
          )}
          <ul className="space-y-0.5">
            {g.butir.map((b) => {
              const aktif = terpilih(b.href);
              const disorot = hrefSorot === b.href;
              return (
                <li key={b.href}>
                  <Link
                    href={b.href}
                    aria-current={aktif ? "page" : undefined}
                    ref={(el) => {
                      if (disorot) el?.scrollIntoView({ block: "nearest" });
                    }}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-semibold transition-colors",
                      disorot
                        ? "bg-emas/20 text-white ring-2 ring-emas"
                        : aktif
                          ? "bg-white/[0.11] text-white"
                          : "text-white/55 hover:bg-white/[0.06] hover:text-white/90",
                    )}
                  >
                    <Ikon
                      nama={b.ikon}
                      size={17}
                      className={aktif ? "text-emas" : "text-white/45 group-hover:text-white/70"}
                    />
                    <span className="flex-1 truncate">{b.label}</span>
                    {!!b.lencana && b.lencana > 0 && (
                      <span className="angka rounded-md bg-merah/85 px-1.5 py-px text-[10.5px] font-extrabold text-white">
                        {b.lencana > 99 ? "99+" : b.lencana}
                      </span>
                    )}
                    {nomorNav.has(b.href) && (
                      <span
                        className={cn(
                          "angka hidden rounded border border-white/15 px-1 text-[10px] font-bold lg:block",
                          aktif ? "text-white/60" : "text-white/25 group-hover:text-white/45",
                        )}
                        title={`Alt + ${nomorNav.get(b.href)}`}
                      >
                        {nomorNav.get(b.href)}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function KakiNav({
  pengguna,
  toko,
  paket,
}: Pick<PropsKerangka, "pengguna" | "toko" | "paket">) {
  const [buka, setBuka] = useState(false);

  return (
    <div className="border-t border-white/10 p-3">
      <button
        type="button"
        onClick={bukaBantuan}
        className="mb-2.5 hidden w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06] lg:flex"
      >
        <span className="flex items-center gap-2 text-[12.5px] font-semibold text-white/55">
          <Ikon nama="petir" size={14} />
          Pintasan papan ketik
        </span>
        <Kbd gelap>?</Kbd>
      </button>

      {paket.sumber === "uji-coba" && (
        <Link
          href="/app/pengaturan/langganan"
          className="mb-2.5 block rounded-lg border border-emas/25 bg-emas/10 px-3 py-2.5 transition-colors hover:bg-emas/15"
        >
          <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-emas">
            <Ikon nama="petir" size={12} isi />
            Uji coba Pro — {paket.sisaUjiCoba} hari lagi
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/45">
            Berlangganan agar Catad Insight tetap aktif.
          </p>
        </Link>
      )}

      {paket.aktif === "GRATIS" && (
        <Link
          href="/app/pengaturan/langganan"
          className="mb-2.5 block rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 transition-colors hover:bg-white/[0.08]"
        >
          <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-white/85">
            <Ikon nama="petir" size={12} isi />
            Paket Gratis
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/45">
            Upgrade untuk membuka Catad Insight.
          </p>
        </Link>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setBuka((b) => !b)}
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.06]"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-merek text-[12px] font-extrabold text-white">
            {inisial(toko.nama)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold text-white">{toko.nama}</span>
            <span className="block truncate text-[11px] text-white/45">
              {pengguna.nama} · {pengguna.peran === "PEMILIK" ? "Pemilik" : "Kasir"}
            </span>
          </span>
          <Ikon nama="bawah" size={14} className={cn("text-white/40 transition-transform", buka && "rotate-180")} />
        </button>

        {buka && (
          <div className="animasi-masuk absolute bottom-full left-0 mb-1.5 w-full overflow-hidden rounded-lg border border-white/10 bg-tinta-2 shadow-xl">
            <Link
              href="/app/pengaturan"
              className="flex items-center gap-2 px-3 py-2.5 text-[13px] font-semibold text-white/75 hover:bg-white/10"
            >
              <Ikon nama="gerigi" size={15} />
              Pengaturan toko
            </Link>
            <Link
              href="/app/pengaturan/langganan"
              className="flex items-center gap-2 px-3 py-2.5 text-[13px] font-semibold text-white/75 hover:bg-white/10"
            >
              <Ikon nama="petir" size={15} />
              Langganan
            </Link>
            {/* POST, bukan GET: keluar mengubah keadaan, jadi tidak boleh
                terpicu oleh prefetch atau <img src> dari situs lain. */}
            <form action="/keluar" method="post" className="border-t border-white/10">
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] font-semibold text-merah-garis hover:bg-white/10"
              >
                <Ikon nama="keluar" size={15} />
                Keluar
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
