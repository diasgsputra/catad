"use client";

import { Ikon } from "@/components/ikon";
import { EMAIL_DEMO, SANDI_DEMO } from "@/lib/akun-demo";

/** Pintasan agar akun demo bisa dicoba tanpa mengetik ulang. */
export function KartuDemo() {
  function isiOtomatis() {
    const email = document.getElementById("email") as HTMLInputElement | null;
    const sandi = document.getElementById("kataSandi") as HTMLInputElement | null;
    if (email) email.value = EMAIL_DEMO;
    if (sandi) {
      sandi.value = SANDI_DEMO;
      sandi.focus();
    }
  }

  return (
    <div className="mt-5 rounded-lg border border-dashed border-garis-2 bg-white/60 p-3.5">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-kertas-2 text-tinta-3">
          <Ikon nama="info" size={13} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold text-tinta-2">Mau lihat-lihat dulu?</p>
          <p className="mt-0.5 text-[12px] leading-snug text-tinta-3">
            Akun demo berisi 14 hari transaksi:{" "}
            <span className="angka font-semibold text-tinta-2">{EMAIL_DEMO}</span> /{" "}
            <span className="angka font-semibold text-tinta-2">{SANDI_DEMO}</span>
          </p>
          <button
            type="button"
            onClick={isiOtomatis}
            className="mt-2 inline-flex items-center gap-1 rounded-md bg-kertas-2 px-2 py-1 text-[12px] font-bold text-tinta-2 transition-colors hover:bg-garis"
          >
            <Ikon nama="salin" size={12} />
            Isi otomatis
          </button>
        </div>
      </div>
    </div>
  );
}
