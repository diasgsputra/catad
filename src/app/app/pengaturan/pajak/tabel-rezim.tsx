"use client";

import { Lencana, Tabel, Td, Th } from "@/components/ui";
import { LABEL_REZIM, RINGKASAN_REZIM, type RezimPajak } from "@/lib/pajak";
import { cn } from "@/lib/utils";

/**
 * Tabel rujukan kelima dasar perhitungan.
 *
 * Komponen klien karena barisnya menyorot pilihan yang sedang dipilih pada
 * formulir, bukan yang tersimpan di basis data. Tanpa itu tabelnya cuma
 * bacaan; dengan itu ia menjawab "yang mana saya" sambil pilihannya diubah.
 *
 * Isinya diambil dari `@/lib/pajak` — berkas yang sama dengan yang menghitung
 * angkanya — supaya keterangan di layar tidak bisa menyimpang dari mesinnya.
 */
export function TabelRezim({ sorot }: { sorot: RezimPajak }) {
  return (
    <Tabel>
      <thead>
        <tr>
          <Th>Pilihan</Th>
          <Th>Dasar hitung</Th>
          <Th className="hidden md:table-cell">Untuk</Th>
          <Th className="hidden lg:table-cell">Sumber</Th>
        </tr>
      </thead>
      <tbody>
        {RINGKASAN_REZIM.map((r) => {
          const aktif = r.rezim === sorot;

          return (
            <tr key={r.rezim} className={cn(aktif && "bg-merek-muda/40")}>
              <Td>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "text-[13px] font-bold",
                      aktif ? "text-merek-tua" : "text-tinta",
                    )}
                  >
                    {LABEL_REZIM[r.rezim]}
                  </span>
                  {aktif && <Lencana nada="merek">Dipakai</Lencana>}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-tinta-3">
                  {r.sebutan}
                </span>
                {/* Di layar sempit dua kolom terakhir disembunyikan, jadi
                    keterangannya diturunkan ke sini daripada hilang. */}
                <span className="mt-1 block text-[11.5px] leading-snug text-tinta-4 md:hidden">
                  {r.untuk}
                  {r.sumber !== "—" && ` · ${r.sumber}`}
                </span>
              </Td>
              <Td>
                <span className="text-[12.5px] leading-snug text-tinta-2">{r.dasarHitung}</span>
              </Td>
              <Td className="hidden md:table-cell">
                <span className="text-[12.5px] leading-snug text-tinta-3">{r.untuk}</span>
              </Td>
              <Td className="hidden lg:table-cell">
                <span className="text-[11.5px] leading-snug text-tinta-3">{r.sumber}</span>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Tabel>
  );
}
