"use client";

import { Ikon } from "@/components/ikon";

export function TombolCetak() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-tinta px-3.5 text-[13px] font-bold text-white transition-colors hover:bg-tinta-2"
    >
      <Ikon nama="printer" size={15} />
      Cetak / simpan PDF
    </button>
  );
}
