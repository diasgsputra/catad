import { cn } from "@/lib/utils";
import { rupiah } from "@/lib/format";

/**
 * Grafik SVG buatan sendiri — tanpa pustaka pihak ketiga.
 * Semuanya komponen server murni: tidak ada JavaScript yang dikirim ke
 * peramban, jadi halaman laporan tetap ringan di ponsel kelas bawah.
 */

// ── Grafik batang harian ────────────────────────────────────────────────────

/**
 * Lebar terbesar satu batang, sebagai persen dari lebar grafik.
 *
 * Batas ATAS, bukan bawah. Sebelumnya di sini dipakai `minWidth` sebesar
 * bagian masing-masing batang (100/n%). Dengan 30 batang, 30 × 3,33% sudah
 * menghabiskan 100% sementara 29 celah 2px belum terhitung — barisnya melebihi
 * induknya dan halaman laporan menggulir mendatar di ponsel. Sebagai `minWidth`
 * angka itu juga tidak pernah bisa membatasi apa pun, karena `flex-1`
 * melebarkan batangnya melewati batas bawah tanpa halangan.
 *
 * Sebagai batas atas, aturannya hanya berlaku ketika batangnya sedikit —
 * mencegah tiga batang melar sepertiga layar masing-masing.
 */
const LEBAR_MAKS_BATANG = 12;

export type TitikGrafik = {
  label: string;
  nilai: number;
  nilaiKedua?: number;
  judul?: string;
  sorot?: boolean;
};

export function GrafikBatang({
  data,
  tinggi = 168,
  className,
  formatNilai = (n: number) => rupiah(n, { ringkas: true }),
  tampilkanLabelKe = 1,
}: {
  data: TitikGrafik[];
  tinggi?: number;
  className?: string;
  formatNilai?: (n: number) => string;
  /** Tampilkan label sumbu X setiap n batang agar tidak berdesakan. */
  tampilkanLabelKe?: number;
}) {
  const maks = Math.max(1, ...data.map((d) => d.nilai));

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-[2px]" style={{ height: tinggi }}>
        {data.map((d, i) => {
          const persen = Math.max(d.nilai > 0 ? 3 : 0.8, (d.nilai / maks) * 100);
          const persenKedua =
            d.nilaiKedua !== undefined ? Math.max(0, (d.nilaiKedua / maks) * 100) : null;

          return (
            <div
              key={`${d.label}-${i}`}
              className="group relative flex min-w-0 flex-1 flex-col justify-end"
              style={{ maxWidth: `${LEBAR_MAKS_BATANG}%`, height: "100%" }}
              title={d.judul ?? `${d.label}: ${formatNilai(d.nilai)}`}
            >
              <div
                className={cn(
                  "relative w-full rounded-t-[3px] transition-colors",
                  d.sorot ? "bg-merek" : "bg-merek/25 group-hover:bg-merek/45",
                )}
                style={{ height: `${persen}%` }}
              >
                {persenKedua !== null && (
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-[3px] bg-merek"
                    style={{ height: `${Math.min(100, (persenKedua / persen) * 100)}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-1.5 flex gap-[2px]">
        {data.map((d, i) => (
          <div
            key={`l-${d.label}-${i}`}
            className="angka min-w-0 flex-1 truncate text-center text-[10px] font-medium text-tinta-4"
            style={{ maxWidth: `${LEBAR_MAKS_BATANG}%` }}
          >
            {i % tampilkanLabelKe === 0 || i === data.length - 1 ? d.label : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Garis tren tipis ────────────────────────────────────────────────────────

export function GarisTren({
  nilai,
  lebar = 120,
  tinggi = 32,
  className,
  warna = "var(--color-merek)",
}: {
  nilai: number[];
  lebar?: number;
  tinggi?: number;
  className?: string;
  warna?: string;
}) {
  if (nilai.length < 2) return null;

  const maks = Math.max(...nilai, 1);
  const min = Math.min(...nilai, 0);
  const rentang = Math.max(1, maks - min);
  const dx = lebar / (nilai.length - 1);

  const titik = nilai.map((n, i) => {
    const x = i * dx;
    const y = tinggi - ((n - min) / rentang) * (tinggi - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const garis = `M${titik.join(" L")}`;
  const area = `${garis} L${lebar},${tinggi} L0,${tinggi} Z`;

  return (
    <svg
      width={lebar}
      height={tinggi}
      viewBox={`0 0 ${lebar} ${tinggi}`}
      fill="none"
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      <path d={area} fill={warna} opacity={0.09} />
      <path d={garis} stroke={warna} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={lebar}
        cy={tinggi - ((nilai[nilai.length - 1] - min) / rentang) * (tinggi - 4) - 2}
        r={2.5}
        fill={warna}
      />
    </svg>
  );
}

// ── Baris progres (peringkat produk, komposisi pembayaran) ──────────────────

export function BarisProgres({
  label,
  nilai,
  maks,
  keterangan,
  warna = "bg-merek",
  className,
}: {
  label: React.ReactNode;
  nilai: number;
  maks: number;
  keterangan?: React.ReactNode;
  warna?: string;
  className?: string;
}) {
  const persen = maks > 0 ? Math.max(2, Math.round((nilai / maks) * 100)) : 0;

  return (
    <div className={cn("group", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[13px] font-semibold text-tinta-2">{label}</span>
        {keterangan && <span className="angka shrink-0 text-[13px] text-tinta-3">{keterangan}</span>}
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-kertas-2">
        <div
          className={cn("h-full rounded-full transition-[width]", warna)}
          style={{ width: `${persen}%` }}
        />
      </div>
    </div>
  );
}

// ── Peta jam sibuk ──────────────────────────────────────────────────────────

export function PetaJam({
  data,
  className,
}: {
  data: Array<{ jam: number; transaksi: number; pendapatan: number }>;
  className?: string;
}) {
  const maks = Math.max(1, ...data.map((d) => d.pendapatan));

  return (
    <div className={className}>
      <div className="flex gap-[3px]">
        {data.map((d) => {
          const intensitas = d.pendapatan / maks;
          return (
            <div
              key={d.jam}
              className="group relative flex-1"
              title={`${String(d.jam).padStart(2, "0")}.00 — ${d.transaksi} transaksi, ${rupiah(d.pendapatan)}`}
            >
              <div
                className="h-9 w-full rounded-[3px] border border-garis/60"
                style={{
                  backgroundColor:
                    intensitas > 0.02
                      ? `color-mix(in srgb, var(--color-merek) ${Math.round(12 + intensitas * 88)}%, white)`
                      : "var(--color-kertas-2)",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-tinta-4">
        <span>00.00</span>
        <span>06.00</span>
        <span>12.00</span>
        <span>18.00</span>
        <span>23.00</span>
      </div>
    </div>
  );
}

// ── Cincin (proporsi tunggal) ───────────────────────────────────────────────

export function Cincin({
  persen,
  ukuran = 64,
  tebal = 7,
  warna = "var(--color-merek)",
  label,
  className,
}: {
  persen: number;
  ukuran?: number;
  tebal?: number;
  warna?: string;
  label?: React.ReactNode;
  className?: string;
}) {
  const r = (ukuran - tebal) / 2;
  const keliling = 2 * Math.PI * r;
  const isi = Math.max(0, Math.min(100, persen));

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={ukuran} height={ukuran} className="-rotate-90">
        <circle
          cx={ukuran / 2}
          cy={ukuran / 2}
          r={r}
          fill="none"
          stroke="var(--color-kertas-2)"
          strokeWidth={tebal}
        />
        <circle
          cx={ukuran / 2}
          cy={ukuran / 2}
          r={r}
          fill="none"
          stroke={warna}
          strokeWidth={tebal}
          strokeLinecap="round"
          strokeDasharray={keliling}
          strokeDashoffset={keliling - (isi / 100) * keliling}
        />
      </svg>
      {label && (
        <span className="angka absolute text-[13px] font-extrabold text-tinta">{label}</span>
      )}
    </div>
  );
}
