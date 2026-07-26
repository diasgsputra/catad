"use client";

import { useRouter } from "next/navigation";
import { Ikon } from "@/components/ikon";
import { cn } from "@/lib/utils";

/** Pemilih rentang tanggal dengan pintasan yang lazim dipakai pemilik toko. */
export function PilihRentang({
  mulai,
  selesai,
  batasHari,
}: {
  mulai: string;
  selesai: string;
  batasHari: number | null;
}) {
  const router = useRouter();

  function terapkan(mulaiBaru: string, selesaiBaru: string) {
    router.push(`/app/laporan?mulai=${mulaiBaru}&selesai=${selesaiBaru}`);
  }

  function preset(hari: number) {
    const kini = new Date();
    const selesaiBaru = kunci(kini);
    const mulaiBaru = kunci(new Date(kini.getTime() - (hari - 1) * 86_400_000));
    terapkan(mulaiBaru, selesaiBaru);
  }

  function bulanIni() {
    const kini = new Date();
    const wib = new Date(kini.getTime() + 7 * 3_600_000);
    const awal = `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}-01`;
    terapkan(awal, kunci(kini));
  }

  const pintasan: Array<{ label: string; aksi: () => void; hari?: number }> = [
    { label: "Hari ini", aksi: () => preset(1), hari: 1 },
    { label: "7 hari", aksi: () => preset(7), hari: 7 },
    { label: "30 hari", aksi: () => preset(30), hari: 30 },
    { label: "Bulan ini", aksi: bulanIni },
    { label: "90 hari", aksi: () => preset(90), hari: 90 },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5">
        {pintasan.map((p) => {
          const terkunci = batasHari !== null && p.hari !== undefined && p.hari > batasHari;
          return (
            <button
              key={p.label}
              type="button"
              onClick={p.aksi}
              disabled={terkunci}
              title={terkunci ? `Paket Gratis dibatasi ${batasHari} hari` : undefined}
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-lg border border-garis-2 bg-white px-3 text-[12.5px] font-bold text-tinta-2 transition-colors hover:bg-kertas-2",
                terkunci && "cursor-not-allowed opacity-45 hover:bg-white",
              )}
            >
              {terkunci && <Ikon nama="kunci" size={11} />}
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <input
          type="date"
          value={mulai}
          max={selesai}
          onChange={(e) => terapkan(e.target.value, selesai)}
          className="angka h-9 rounded-lg border border-garis-2 bg-white px-2.5 text-[12.5px] font-semibold text-tinta focus:border-merek focus:outline-none"
          aria-label="Tanggal mulai"
        />
        <span className="text-tinta-4">–</span>
        <input
          type="date"
          value={selesai}
          min={mulai}
          onChange={(e) => terapkan(mulai, e.target.value)}
          className="angka h-9 rounded-lg border border-garis-2 bg-white px-2.5 text-[12.5px] font-semibold text-tinta focus:border-merek focus:outline-none"
          aria-label="Tanggal selesai"
        />
      </div>
    </div>
  );
}

function kunci(t: Date): string {
  const wib = new Date(t.getTime() + 7 * 3_600_000);
  return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}-${String(
    wib.getUTCDate(),
  ).padStart(2, "0")}`;
}
