"use client";

import { Kunci } from "@/components/ui";
import { bukaBantuan } from "@/components/pintasan-global";
import { cn } from "@/lib/utils";

export type Petunjuk = { tombol: string[]; aksi: string };

/**
 * Bar petunjuk di dasar layar kasir.
 *
 * Isinya berubah mengikuti zona yang sedang aktif, seperti mesin kasir lama —
 * kasir baru tidak perlu menghafal apa pun karena tombolnya selalu terlihat.
 * Hanya tampil di layar lebar; di ponsel tidak ada papan ketik fisik.
 */
export function BarPetunjuk({
  petunjuk,
  zona,
}: {
  petunjuk: Petunjuk[];
  zona?: "barang" | "keranjang";
}) {
  return (
    <div className="hidden shrink-0 items-center gap-3 border-t border-garis bg-white px-4 py-2 lg:flex">
      {zona && (
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-bold tracking-[0.04em] uppercase",
            zona === "barang"
              ? "border-merek-garis bg-merek-muda text-merek-tua"
              : "border-kuning-garis bg-kuning-muda text-kuning",
          )}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {zona === "barang" ? "Daftar barang" : "Keranjang"}
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
        {petunjuk.map((p) => (
          <span key={p.aksi} className="flex items-center gap-1.5 whitespace-nowrap">
            <Kunci tombol={p.tombol} />
            <span className="text-[11.5px] font-medium text-tinta-3">{p.aksi}</span>
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={bukaBantuan}
        className="flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-kertas-2"
      >
        <Kunci tombol={["?"]} />
        <span className="text-[11.5px] font-bold text-tinta-2">Semua pintasan</span>
      </button>
    </div>
  );
}
