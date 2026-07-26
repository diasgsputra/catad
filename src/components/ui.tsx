import Link from "next/link";
import { cn } from "@/lib/utils";
import { Ikon, type NamaIkon } from "./ikon";

// ── Tombol ──────────────────────────────────────────────────────────────────

type VarianTombol = "utama" | "kedua" | "halus" | "bahaya" | "hantu";
type UkuranTombol = "kecil" | "sedang" | "besar";

const GAYA_VARIAN: Record<VarianTombol, string> = {
  utama:
    "bg-merek text-white shadow-[0_1px_2px_rgba(15,107,87,.35)] hover:bg-merek-tua active:bg-merek-tua disabled:bg-tinta-4",
  kedua:
    "bg-white text-tinta border border-garis-2 hover:bg-kertas-2 hover:border-tinta-4 disabled:text-tinta-4",
  halus: "bg-merek-muda text-merek-tua hover:bg-merek-garis/60 disabled:text-tinta-4",
  bahaya: "bg-merah text-white hover:bg-merah/90 disabled:bg-tinta-4",
  hantu: "text-tinta-2 hover:bg-kertas-2 hover:text-tinta disabled:text-tinta-4",
};

const GAYA_UKURAN: Record<UkuranTombol, string> = {
  kecil: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  sedang: "h-10 px-4 text-sm gap-2 rounded-lg",
  besar: "h-12 px-6 text-[15px] gap-2 rounded-xl",
};

const DASAR_TOMBOL =
  "inline-flex items-center justify-center font-semibold transition-colors select-none disabled:cursor-not-allowed disabled:opacity-70";

export function Tombol({
  varian = "utama",
  ukuran = "sedang",
  ikon,
  ikonKanan,
  penuh,
  className,
  children,
  ...sisa
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  varian?: VarianTombol;
  ukuran?: UkuranTombol;
  ikon?: NamaIkon;
  ikonKanan?: NamaIkon;
  penuh?: boolean;
}) {
  return (
    <button
      className={cn(DASAR_TOMBOL, GAYA_VARIAN[varian], GAYA_UKURAN[ukuran], penuh && "w-full", className)}
      {...sisa}
    >
      {ikon && <Ikon nama={ikon} size={ukuran === "kecil" ? 15 : 17} />}
      {children}
      {ikonKanan && <Ikon nama={ikonKanan} size={ukuran === "kecil" ? 15 : 17} />}
    </button>
  );
}

export function TautanTombol({
  varian = "utama",
  ukuran = "sedang",
  ikon,
  ikonKanan,
  penuh,
  className,
  children,
  ...sisa
}: React.ComponentProps<typeof Link> & {
  varian?: VarianTombol;
  ukuran?: UkuranTombol;
  ikon?: NamaIkon;
  ikonKanan?: NamaIkon;
  penuh?: boolean;
}) {
  return (
    <Link
      className={cn(DASAR_TOMBOL, GAYA_VARIAN[varian], GAYA_UKURAN[ukuran], penuh && "w-full", className)}
      {...sisa}
    >
      {ikon && <Ikon nama={ikon} size={ukuran === "kecil" ? 15 : 17} />}
      {children}
      {ikonKanan && <Ikon nama={ikonKanan} size={ukuran === "kecil" ? 15 : 17} />}
    </Link>
  );
}

// ── Isian formulir ──────────────────────────────────────────────────────────

const DASAR_ISIAN =
  "w-full rounded-lg border bg-white px-3 text-sm text-tinta placeholder:text-tinta-4 transition-colors focus:border-merek focus:outline-none focus:ring-2 focus:ring-merek/15 disabled:bg-kertas-2 disabled:text-tinta-3";

export function Kolom({
  galat,
  className,
  ...sisa
}: React.InputHTMLAttributes<HTMLInputElement> & { galat?: string }) {
  return (
    <input
      className={cn(DASAR_ISIAN, "h-10", galat ? "border-merah" : "border-garis-2", className)}
      aria-invalid={!!galat}
      {...sisa}
    />
  );
}

export function AreaTeks({
  galat,
  className,
  ...sisa
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { galat?: string }) {
  return (
    <textarea
      className={cn(DASAR_ISIAN, "min-h-20 py-2 leading-relaxed", galat ? "border-merah" : "border-garis-2", className)}
      {...sisa}
    />
  );
}

export function Pilih({
  galat,
  className,
  children,
  ...sisa
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  galat?: string;
  ref?: React.Ref<HTMLSelectElement>;
}) {
  return (
    <select
      className={cn(
        DASAR_ISIAN,
        "h-10 appearance-none bg-[length:16px] bg-[right_0.65rem_center] bg-no-repeat pr-9",
        galat ? "border-merah" : "border-garis-2",
        className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236f675a' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m5 9 7 7 7-7'/%3E%3C/svg%3E\")",
      }}
      {...sisa}
    >
      {children}
    </select>
  );
}

export function Bidang({
  label,
  galat,
  petunjuk,
  wajib,
  htmlFor,
  children,
  className,
}: {
  label: string;
  galat?: string;
  petunjuk?: string;
  wajib?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-tinta-2">
        {label}
        {wajib && <span className="ml-0.5 text-merah">*</span>}
      </label>
      {children}
      {galat ? (
        <p className="flex items-center gap-1 text-xs font-medium text-merah">
          <Ikon nama="peringatan" size={13} />
          {galat}
        </p>
      ) : petunjuk ? (
        <p className="text-xs text-tinta-3">{petunjuk}</p>
      ) : null}
    </div>
  );
}

// ── Wadah ───────────────────────────────────────────────────────────────────

export function Kartu({
  className,
  children,
  ...sisa
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("kartu", className)} {...sisa}>
      {children}
    </div>
  );
}

export function KepalaKartu({
  judul,
  keterangan,
  aksi,
  ikon,
  className,
}: {
  judul: React.ReactNode;
  keterangan?: React.ReactNode;
  aksi?: React.ReactNode;
  ikon?: NamaIkon;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-garis px-4 py-3.5", className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {ikon && (
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-kertas-2 text-tinta-3">
            <Ikon nama={ikon} size={16} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold tracking-[-0.01em] text-tinta">{judul}</h2>
          {keterangan && <p className="mt-0.5 text-[13px] leading-snug text-tinta-3">{keterangan}</p>}
        </div>
      </div>
      {aksi && <div className="shrink-0">{aksi}</div>}
    </div>
  );
}

// ── Tombol papan ketik ──────────────────────────────────────────────────────

/** Menampilkan satu tombol papan ketik, mis. Enter atau Alt. */
export function Kbd({
  children,
  gelap,
  className,
}: {
  children: React.ReactNode;
  gelap?: boolean;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "kbd",
        gelap && "border-white/25 bg-white/10 text-white/80",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

const PENGUBAH = new Set(["Alt", "Ctrl", "Shift", "Cmd", "Meta"]);

/**
 * Deretan tombol.
 *
 * Tanda "+" hanya dipakai bila tombol pertamanya pengubah (Alt + 1), karena
 * itu memang harus ditekan bersamaan. Untuk kumpulan seperti ↑ ↓ ← → yang
 * merupakan pilihan, tombol dijajar tanpa "+" agar tidak salah dibaca.
 */
export function Kunci({
  tombol,
  gelap,
  className,
}: {
  tombol: string[];
  gelap?: boolean;
  className?: string;
}) {
  const gabungan = tombol.length > 1 && PENGUBAH.has(tombol[0]);

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {tombol.map((t, i) => (
        <span key={`${t}-${i}`} className="inline-flex items-center gap-1">
          {gabungan && i > 0 && <span className="text-[10px] text-tinta-4">+</span>}
          <Kbd gelap={gelap}>{t}</Kbd>
        </span>
      ))}
    </span>
  );
}

// ── Lencana ─────────────────────────────────────────────────────────────────

type NadaLencana = "netral" | "merek" | "hijau" | "kuning" | "merah" | "biru" | "gelap";

const GAYA_LENCANA: Record<NadaLencana, string> = {
  netral: "bg-kertas-2 text-tinta-2 border-garis-2",
  merek: "bg-merek-muda text-merek-tua border-merek-garis",
  hijau: "bg-hijau-muda text-hijau border-hijau/25",
  kuning: "bg-kuning-muda text-kuning border-kuning-garis",
  merah: "bg-merah-muda text-merah border-merah-garis",
  biru: "bg-biru-muda text-biru border-biru/20",
  gelap: "bg-tinta text-white border-tinta",
};

export function Lencana({
  nada = "netral",
  ikon,
  className,
  children,
}: {
  nada?: NadaLencana;
  ikon?: NamaIkon;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] whitespace-nowrap",
        GAYA_LENCANA[nada],
        className,
      )}
    >
      {ikon && <Ikon nama={ikon} size={11} />}
      {children}
    </span>
  );
}

// ── Statistik ───────────────────────────────────────────────────────────────

export function Statistik({
  label,
  nilai,
  keterangan,
  tren,
  ikon,
  aksen,
  className,
}: {
  label: string;
  nilai: React.ReactNode;
  keterangan?: React.ReactNode;
  tren?: { arah: "naik" | "turun" | "rata"; teks: string; baik?: boolean };
  ikon?: NamaIkon;
  aksen?: "merek" | "kuning" | "merah" | "netral";
  className?: string;
}) {
  const warnaTren =
    tren?.arah === "rata"
      ? "text-tinta-3"
      : (tren?.baik ?? tren?.arah === "naik")
        ? "text-hijau"
        : "text-merah";

  return (
    <div className={cn("kartu p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-tinta-3">{label}</span>
        {ikon && (
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-md",
              aksen === "merek" && "bg-merek-muda text-merek",
              aksen === "kuning" && "bg-kuning-muda text-kuning",
              aksen === "merah" && "bg-merah-muda text-merah",
              (!aksen || aksen === "netral") && "bg-kertas-2 text-tinta-3",
            )}
          >
            <Ikon nama={ikon} size={14} />
          </span>
        )}
      </div>
      <div className="angka mt-2 text-[26px] leading-none font-extrabold tracking-[-0.025em] text-tinta">
        {nilai}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {tren && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-bold", warnaTren)}>
            {tren.arah !== "rata" && <Ikon nama={tren.arah} size={12} />}
            {tren.teks}
          </span>
        )}
        {keterangan && <span className="truncate text-xs text-tinta-3">{keterangan}</span>}
      </div>
    </div>
  );
}

// ── Keadaan kosong & peringatan ─────────────────────────────────────────────

export function Kosong({
  judul,
  pesan,
  ikon = "kotak",
  aksi,
  className,
}: {
  judul: string;
  pesan?: string;
  ikon?: NamaIkon;
  aksi?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="mb-3 flex size-12 items-center justify-center rounded-xl border border-dashed border-garis-2 bg-kertas text-tinta-4">
        <Ikon nama={ikon} size={22} />
      </span>
      <p className="text-[15px] font-bold text-tinta-2">{judul}</p>
      {pesan && <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-tinta-3">{pesan}</p>}
      {aksi && <div className="mt-4">{aksi}</div>}
    </div>
  );
}

export function Peringatan({
  nada = "info",
  judul,
  children,
  aksi,
  className,
}: {
  nada?: "info" | "sukses" | "waspada" | "bahaya";
  judul?: string;
  children?: React.ReactNode;
  aksi?: React.ReactNode;
  className?: string;
}) {
  const gaya = {
    info: { kelas: "bg-biru-muda border-biru/20 text-biru", ikon: "info" as NamaIkon },
    sukses: { kelas: "bg-hijau-muda border-hijau/25 text-hijau", ikon: "centang" as NamaIkon },
    waspada: { kelas: "bg-kuning-muda border-kuning-garis text-kuning", ikon: "peringatan" as NamaIkon },
    bahaya: { kelas: "bg-merah-muda border-merah-garis text-merah", ikon: "peringatan" as NamaIkon },
  }[nada];

  return (
    <div className={cn("flex items-start gap-2.5 rounded-lg border px-3.5 py-3", gaya.kelas, className)}>
      <Ikon nama={gaya.ikon} size={16} className="mt-0.5" />
      <div className="min-w-0 flex-1 text-[13px] leading-relaxed">
        {judul && <p className="font-bold">{judul}</p>}
        {children}
      </div>
      {aksi}
    </div>
  );
}

// ── Tabel ───────────────────────────────────────────────────────────────────

export function Tabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  kanan,
  className,
}: {
  children?: React.ReactNode;
  kanan?: boolean;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "border-b border-garis bg-kertas/60 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-tinta-3",
        kanan ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  kanan,
  className,
  ...sisa
}: React.TdHTMLAttributes<HTMLTableCellElement> & { kanan?: boolean }) {
  return (
    <td
      className={cn(
        "border-b border-garis px-4 py-3 align-middle text-tinta-2",
        kanan && "text-right",
        className,
      )}
      {...sisa}
    >
      {children}
    </td>
  );
}

// ── Judul halaman ───────────────────────────────────────────────────────────

export function JudulHalaman({
  judul,
  keterangan,
  aksi,
  className,
}: {
  judul: string;
  keterangan?: React.ReactNode;
  aksi?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h1 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-tinta">{judul}</h1>
        {keterangan && <p className="mt-1 text-[13px] text-tinta-3">{keterangan}</p>}
      </div>
      {aksi && <div className="flex flex-wrap items-center gap-2">{aksi}</div>}
    </div>
  );
}
