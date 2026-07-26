"use client";

import { useEffect, useRef } from "react";
import { Ikon } from "./ikon";
import { Kunci } from "./ui";
import { cn } from "@/lib/utils";

const BISA_FOKUS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function Modal({
  buka,
  onTutup,
  judul,
  keterangan,
  lebar = "sedang",
  kaki,
  children,
}: {
  buka: boolean;
  onTutup: () => void;
  judul: string;
  keterangan?: string;
  lebar?: "kecil" | "sedang" | "besar";
  kaki?: React.ReactNode;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buka) return;

    // Kembalikan fokus ke tempat semula setelah dialog ditutup.
    const sebelumnya = document.activeElement as HTMLElement | null;

    // Fokuskan isian pertama supaya bisa langsung diketik.
    const t = setTimeout(() => {
      const isian = panel.current?.querySelector<HTMLElement>(BISA_FOKUS);
      isian?.focus();
    }, 40);

    function tangani(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onTutup();
        return;
      }

      // Jerat Tab supaya fokus tidak lari ke halaman di belakang dialog.
      if (e.key === "Tab" && panel.current) {
        const bisa = [...panel.current.querySelectorAll<HTMLElement>(BISA_FOKUS)].filter(
          (el) => el.offsetParent !== null,
        );
        if (bisa.length === 0) return;

        const pertama = bisa[0];
        const terakhir = bisa[bisa.length - 1];
        const aktif = document.activeElement;

        if (e.shiftKey && aktif === pertama) {
          e.preventDefault();
          terakhir.focus();
        } else if (!e.shiftKey && aktif === terakhir) {
          e.preventDefault();
          pertama.focus();
        }
      }
    }

    window.addEventListener("keydown", tangani);
    document.body.style.overflow = "hidden";

    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", tangani);
      document.body.style.overflow = "";
      sebelumnya?.focus?.();
    };
  }, [buka, onTutup]);

  if (!buka) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/50 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div
        className="absolute inset-0"
        onClick={onTutup}
        aria-hidden="true"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        className={cn(
          "animasi-naik relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl",
          lebar === "kecil" && "sm:max-w-sm",
          lebar === "sedang" && "sm:max-w-lg",
          lebar === "besar" && "sm:max-w-2xl",
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-garis px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-[16px] font-extrabold tracking-[-0.015em] text-tinta">{judul}</h2>
            {keterangan && <p className="mt-0.5 text-[12.5px] text-tinta-3">{keterangan}</p>}
          </div>
          <button
            type="button"
            onClick={onTutup}
            className="-mr-1.5 flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-tinta-3 transition-colors hover:bg-kertas-2 hover:text-tinta"
            aria-label="Tutup"
          >
            <Kunci tombol={["Esc"]} className="hidden lg:inline-flex" />
            <Ikon nama="silang" size={17} className="lg:hidden" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {kaki && <footer className="border-t border-garis bg-kertas px-5 py-3.5">{kaki}</footer>}
      </div>
    </div>
  );
}

/** Dialog konfirmasi untuk aksi yang tidak bisa dibatalkan. */
export function Konfirmasi({
  buka,
  onTutup,
  onSetuju,
  judul,
  pesan,
  labelSetuju = "Ya, lanjutkan",
  bahaya = true,
  sedangProses = false,
}: {
  buka: boolean;
  onTutup: () => void;
  onSetuju: () => void;
  judul: string;
  pesan: string;
  labelSetuju?: string;
  bahaya?: boolean;
  sedangProses?: boolean;
}) {
  // Enter menyetujui, Esc membatalkan (Esc ditangani oleh Modal).
  useEffect(() => {
    if (!buka) return;

    function tangani(e: KeyboardEvent) {
      if (e.key === "Enter" && !sedangProses) {
        e.preventDefault();
        onSetuju();
      }
    }

    window.addEventListener("keydown", tangani);
    return () => window.removeEventListener("keydown", tangani);
  }, [buka, onSetuju, sedangProses]);

  return (
    <Modal buka={buka} onTutup={onTutup} judul={judul} lebar="kecil">
      <p className="text-[14px] leading-relaxed text-tinta-2">{pesan}</p>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onTutup}
          disabled={sedangProses}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-garis-2 bg-white text-sm font-semibold text-tinta transition-colors hover:bg-kertas-2 disabled:opacity-60"
        >
          Batal
          <Kunci tombol={["Esc"]} className="hidden lg:inline-flex" />
        </button>
        <button
          type="button"
          onClick={onSetuju}
          disabled={sedangProses}
          className={cn(
            "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60",
            bahaya ? "bg-merah hover:bg-merah/90" : "bg-merek hover:bg-merek-tua",
          )}
        >
          {sedangProses ? "Memproses…" : labelSetuju}
          {!sedangProses && (
            <span className="hidden rounded border border-white/25 bg-white/10 px-1 text-[10px] font-bold lg:inline">
              Enter
            </span>
          )}
        </button>
      </div>
    </Modal>
  );
}
