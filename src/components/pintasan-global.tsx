"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ikon } from "./ikon";
import { Kunci } from "./ui";
import {
  SEMUA_PINTASAN,
  adaPengubah,
  dalamIsian,
  nomorAlt,
  tandaTanya,
  type GrupPintasan,
} from "@/lib/pintasan";

export type TujuanNav = { label: string; href: string };

/** Nama peristiwa untuk membuka bantuan dari komponen mana pun. */
export const PERISTIWA_BANTUAN = "catad:bantuan";

/** Nama peristiwa untuk memindahkan kursor ke menu samping. */
export const PERISTIWA_SAMPING = "catad:menu-samping";

export function bukaBantuan() {
  window.dispatchEvent(new CustomEvent(PERISTIWA_BANTUAN));
}

/**
 * Memindahkan kursor papan ketik ke menu samping.
 *
 * Dipanggil halaman yang punya navigasi kiri-kanan sendiri ketika sorotannya
 * sudah mentok di kolom paling kiri.
 */
export function masukMenuSamping() {
  window.dispatchEvent(new CustomEvent(PERISTIWA_SAMPING));
}

/**
 * Penangan pintasan yang berlaku di seluruh aplikasi.
 *
 * Dipasang sekali di kerangka /app. Yang ditangani hanya pintasan lintas
 * halaman; pintasan khusus kasir ditangani oleh halaman kasir sendiri.
 */
export function PintasanGlobal({ nav }: { nav: TujuanNav[] }) {
  const router = useRouter();
  const [bantuan, setBantuan] = useState(false);

  const tutup = useCallback(() => setBantuan(false), []);

  useEffect(() => {
    function bukaDariPeristiwa() {
      setBantuan((b) => !b);
    }
    window.addEventListener(PERISTIWA_BANTUAN, bukaDariPeristiwa);
    return () => window.removeEventListener(PERISTIWA_BANTUAN, bukaDariPeristiwa);
  }, []);

  useEffect(() => {
    function tangani(e: KeyboardEvent) {
      // "?" membuka bantuan di mana saja, termasuk saat mengetik — nama barang
      // praktis tidak pernah memuat tanda tanya.
      if (tandaTanya(e)) {
        e.preventDefault();
        setBantuan((b) => !b);
        return;
      }

      if (e.key === "Escape" && bantuan) {
        e.preventDefault();
        setBantuan(false);
        return;
      }

      // Alt + angka: pindah halaman mengikuti urutan menu.
      const nomor = nomorAlt(e);
      if (nomor !== null) {
        const tujuan = nav[nomor - 1];
        if (tujuan) {
          e.preventDefault();
          setBantuan(false);
          router.push(tujuan.href);
        }
        return;
      }

      // "/" melompat ke kolom pencarian halaman, kecuali sedang mengetik.
      if (e.key === "/" && !adaPengubah(e) && !dalamIsian(e.target)) {
        const kolom = document.querySelector<HTMLInputElement>("[data-cari-utama]");
        if (kolom) {
          e.preventDefault();
          kolom.focus();
          kolom.select();
        }
      }
    }

    window.addEventListener("keydown", tangani);
    return () => window.removeEventListener("keydown", tangani);
  }, [nav, router, bantuan]);

  if (!bantuan) return null;

  return <OverlayBantuan nav={nav} onTutup={tutup} />;
}

// ── Overlay bantuan ─────────────────────────────────────────────────────────

function OverlayBantuan({ nav, onTutup }: { nav: TujuanNav[]; onTutup: () => void }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const grupNav: GrupPintasan = {
    judul: "Pindah halaman",
    keterangan: "Tahan Alt lalu tekan angkanya.",
    daftar: nav.slice(0, 9).map((n, i) => ({
      tombol: ["Alt", String(i + 1)],
      aksi: n.label,
    })),
  };

  const grup = [...SEMUA_PINTASAN, grupNav];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-tinta/60 p-4 backdrop-blur-[3px]">
      <div className="absolute inset-0" onClick={onTutup} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pintasan papan ketik"
        className="animasi-naik relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-garis px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-tinta text-emas">
              <Ikon nama="petir" size={16} isi />
            </span>
            <div>
              <h2 className="text-[16px] font-extrabold tracking-[-0.015em] text-tinta">
                Pintasan papan ketik
              </h2>
              <p className="text-[12.5px] text-tinta-3">
                Seluruh Catad bisa dijalankan tanpa mouse.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onTutup}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-bold text-tinta-3 transition-colors hover:bg-kertas-2 hover:text-tinta"
          >
            Tutup
            <Kunci tombol={["Esc"]} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {grup.map((g) => (
              <section key={g.judul}>
                <h3 className="text-[11px] font-bold tracking-[0.1em] text-tinta-3 uppercase">
                  {g.judul}
                </h3>
                {g.keterangan && (
                  <p className="mt-1 text-[12px] leading-snug text-tinta-4">{g.keterangan}</p>
                )}

                <dl className="mt-2.5 space-y-1.5">
                  {g.daftar.map((p) => (
                    <div
                      key={`${g.judul}-${p.aksi}`}
                      className="flex items-baseline justify-between gap-3 border-b border-dashed border-garis pb-1.5 last:border-0"
                    >
                      <dt className="min-w-0 text-[13px] text-tinta-2">
                        {p.aksi}
                        {p.catatan && (
                          <span className="block text-[11.5px] text-tinta-4">{p.catatan}</span>
                        )}
                      </dt>
                      <dd className="shrink-0">
                        <Kunci tombol={p.tombol} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>

        <footer className="border-t border-garis bg-kertas px-5 py-3">
          <p className="text-[12px] leading-relaxed text-tinta-3">
            Tekan <Kunci tombol={["?"]} /> kapan saja untuk membuka daftar ini lagi. Catad sengaja
            tidak memakai tombol <span className="font-semibold text-tinta-2">F1–F12</span> karena
            di banyak laptop tombol itu baru aktif setelah menekan{" "}
            <Kunci tombol={["Fn"]} /> — jadi terasa dua tombol, bukan satu.
          </p>
        </footer>
      </div>
    </div>
  );
}
