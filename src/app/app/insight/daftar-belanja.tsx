"use client";

import { useMemo, useState } from "react";
import { Ikon } from "@/components/ikon";
import { rupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export type BarisBelanjaKlien = {
  id: string;
  nama: string;
  satuan: string;
  qtySaran: number;
  estimasiBiaya: number;
  hariTersisa: number | null;
  status: string;
  alasan: string;
  stok: number;
};

/**
 * Daftar belanja yang bisa dicentang sambil kulakan.
 * Centangan hanya disimpan di komponen (sekali pakai) — tujuannya membantu
 * saat di pasar, bukan menjadi catatan permanen.
 */
export function DaftarBelanja({
  baris,
  horizonHari,
  namaToko,
}: {
  baris: BarisBelanjaKlien[];
  horizonHari: number;
  namaToko: string;
}) {
  const [terambil, setTerambil] = useState<Set<string>>(new Set());
  const [tersalin, setTersalin] = useState(false);

  const total = useMemo(() => baris.reduce((t, b) => t + b.estimasiBiaya, 0), [baris]);
  const sisaTotal = useMemo(
    () => baris.filter((b) => !terambil.has(b.id)).reduce((t, b) => t + b.estimasiBiaya, 0),
    [baris, terambil],
  );

  function alihkan(id: string) {
    setTerambil((lama) => {
      const baru = new Set(lama);
      if (baru.has(id)) baru.delete(id);
      else baru.add(id);
      return baru;
    });
  }

  async function salinTeks() {
    const teks = [
      `Daftar belanja — ${namaToko}`,
      `(cukup untuk ${horizonHari} hari ke depan)`,
      "",
      ...baris.map((b) => `- ${b.nama}: ${b.qtySaran} ${b.satuan} (± ${rupiah(b.estimasiBiaya)})`),
      "",
      `Perkiraan total: ${rupiah(total)}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(teks);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      setTersalin(false);
    }
  }

  if (baris.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-hijau-muda text-hijau">
          <Ikon nama="centang" size={22} />
        </span>
        <p className="mt-3 text-[15px] font-bold text-tinta-2">Belum perlu kulakan</p>
        <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-tinta-3">
          Semua barang masih cukup untuk {horizonHari} hari ke depan berdasarkan kecepatan jual
          saat ini.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-garis bg-kertas px-4 py-2.5 tanpa-cetak">
        <p className="text-[12.5px] text-tinta-3">
          <strong className="angka font-bold text-tinta-2">
            {terambil.size}/{baris.length}
          </strong>{" "}
          sudah diambil
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={salinTeks}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-garis-2 bg-white px-2.5 text-[12.5px] font-bold text-tinta-2 transition-colors hover:bg-kertas-2"
          >
            <Ikon nama={tersalin ? "centang" : "salin"} size={13} />
            {tersalin ? "Tersalin" : "Salin daftar"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-garis-2 bg-white px-2.5 text-[12.5px] font-bold text-tinta-2 transition-colors hover:bg-kertas-2"
          >
            <Ikon nama="printer" size={13} />
            Cetak
          </button>
        </div>
      </div>

      <ul className="divide-y divide-garis">
        {baris.map((b) => {
          const diambil = terambil.has(b.id);
          return (
            <li key={b.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-kertas/60",
                  diambil && "bg-kertas/40",
                )}
              >
                <input
                  type="checkbox"
                  checked={diambil}
                  onChange={() => alihkan(b.id)}
                  className="size-4 shrink-0 accent-[var(--color-merek)]"
                />

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-[13.5px] font-bold",
                      diambil ? "text-tinta-4 line-through" : "text-tinta",
                    )}
                  >
                    {b.nama}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-tinta-3">
                    <span
                      className={cn(
                        "font-bold",
                        b.status === "HABIS" ? "text-merah" : "text-kuning",
                      )}
                    >
                      {b.status === "HABIS"
                        ? "Habis"
                        : b.hariTersisa === 0
                          ? "Bisa habis hari ini"
                          : `Sisa ${b.stok} ${b.satuan} · ${b.hariTersisa} hari`}
                    </span>
                    <span>·</span>
                    <span>{b.alasan}</span>
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "angka text-[14px] font-extrabold",
                      diambil ? "text-tinta-4" : "text-tinta",
                    )}
                  >
                    {b.qtySaran}
                    <span className="ml-0.5 text-[11px] font-medium text-tinta-4">{b.satuan}</span>
                  </p>
                  <p className="angka text-[11.5px] text-tinta-3">
                    {b.estimasiBiaya > 0 ? rupiah(b.estimasiBiaya) : "modal belum diisi"}
                  </p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-garis bg-kertas px-4 py-3.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-bold text-tinta-2">Perkiraan total modal</span>
          <span className="angka text-[20px] font-extrabold tracking-[-0.02em] text-tinta">
            {rupiah(total)}
          </span>
        </div>
        {terambil.size > 0 && sisaTotal !== total && (
          <div className="mt-1 flex items-baseline justify-between text-[12.5px] text-tinta-3 tanpa-cetak">
            <span>Sisa yang belum diambil</span>
            <span className="angka font-bold">{rupiah(sisaTotal)}</span>
          </div>
        )}
        <p className="mt-2 text-[11.5px] leading-relaxed text-tinta-4">
          Perhitungan memakai harga modal terakhir yang kamu catat dan kecepatan jual 14 hari
          terakhir. Harga di pasar bisa berbeda.
        </p>
      </div>
    </>
  );
}
