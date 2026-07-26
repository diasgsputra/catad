"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ikon } from "@/components/ikon";
import { Pilih } from "@/components/ui";

export function SaringTransaksi({
  mulai,
  selesai,
  metode,
  cari,
  status,
}: {
  mulai: string;
  selesai: string;
  metode: string;
  cari: string;
  status: string;
}) {
  const router = useRouter();
  const [teks, setTeks] = useState(cari);

  function terapkan(ubahan: Record<string, string>) {
    const kueri = new URLSearchParams({ mulai, selesai, metode, cari, status, ...ubahan });
    for (const [k, v] of [...kueri.entries()]) if (!v) kueri.delete(k);
    router.push(`/app/transaksi?${kueri}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          terapkan({ cari: teks });
        }}
        className="relative min-w-[180px] flex-1"
      >
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-tinta-4">
          <Ikon nama="cari" size={16} />
        </span>
        <input
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          placeholder="Cari nomor nota atau catatan…"
          data-cari-utama
          aria-label="Cari transaksi"
          className="h-10 w-full rounded-lg border border-garis-2 bg-white pr-3 pl-9 text-sm placeholder:text-tinta-4 focus:border-merek focus:ring-2 focus:ring-merek/15 focus:outline-none"
        />
      </form>

      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={mulai}
          max={selesai}
          onChange={(e) => terapkan({ mulai: e.target.value })}
          className="angka h-10 rounded-lg border border-garis-2 bg-white px-2.5 text-[12.5px] font-semibold focus:border-merek focus:outline-none"
          aria-label="Tanggal mulai"
        />
        <span className="text-tinta-4">–</span>
        <input
          type="date"
          value={selesai}
          min={mulai}
          onChange={(e) => terapkan({ selesai: e.target.value })}
          className="angka h-10 rounded-lg border border-garis-2 bg-white px-2.5 text-[12.5px] font-semibold focus:border-merek focus:outline-none"
          aria-label="Tanggal selesai"
        />
      </div>

      <Pilih
        value={metode}
        onChange={(e) => terapkan({ metode: e.target.value })}
        className="w-auto min-w-[130px]"
      >
        <option value="">Semua metode</option>
        <option value="TUNAI">Tunai</option>
        <option value="QRIS">QRIS</option>
        <option value="TRANSFER">Transfer</option>
        <option value="KARTU">Kartu</option>
      </Pilih>

      <Pilih
        value={status}
        onChange={(e) => terapkan({ status: e.target.value })}
        className="w-auto min-w-[130px]"
      >
        <option value="selesai">Selesai</option>
        <option value="dibatalkan">Dibatalkan</option>
        <option value="semua">Semua status</option>
      </Pilih>
    </div>
  );
}
