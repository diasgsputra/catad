import { cn } from "@/lib/utils";

/**
 * Satu set ikon garis buatan sendiri (tanpa dependensi).
 * Semua digambar pada kanvas 24x24 dengan tebal garis seragam supaya
 * terlihat sebagai satu keluarga.
 */

export type NamaIkon =
  | "kasir"
  | "grafik"
  | "kotak"
  | "insight"
  | "dompet"
  | "orang"
  | "gerigi"
  | "keluar"
  | "tambah"
  | "cari"
  | "kanan"
  | "kiri"
  | "bawah"
  | "naik"
  | "turun"
  | "centang"
  | "silang"
  | "peringatan"
  | "jam"
  | "kalender"
  | "bintang"
  | "printer"
  | "wa"
  | "unduh"
  | "sampah"
  | "pensil"
  | "menu"
  | "nota"
  | "stok"
  | "stok-kosong"
  | "stok-mati"
  | "keranjang"
  | "kunci"
  | "info"
  | "toko"
  | "petir"
  | "salin";

const JALUR: Record<NamaIkon, React.ReactNode> = {
  kasir: (
    <>
      <rect x="2.75" y="5.75" width="18.5" height="12.5" rx="2.25" />
      <path d="M2.75 10.25h18.5M6.5 14.5h4" />
    </>
  ),
  grafik: <path d="M4 20V4M4 20h16M8 20v-6M12.5 20V9M17 20v-9.5" />,
  kotak: (
    <>
      <path d="M20.5 8.5v7a1.6 1.6 0 0 1-.85 1.4l-6.8 3.6a1.7 1.7 0 0 1-1.7 0l-6.8-3.6a1.6 1.6 0 0 1-.85-1.4v-7" />
      <path d="M3.9 7.6l7.35-3.9a1.7 1.7 0 0 1 1.5 0l7.35 3.9-7.35 3.9a1.7 1.7 0 0 1-1.5 0z" />
      <path d="M12 11.7V20" />
    </>
  ),
  insight: (
    <>
      <path d="M9.5 17.5h5M10.25 20.5h3.5" />
      <path d="M12 3.5a5.75 5.75 0 0 1 3.4 10.4c-.55.4-.9 1-.9 1.67h-5c0-.66-.35-1.27-.9-1.67A5.75 5.75 0 0 1 12 3.5Z" />
    </>
  ),
  dompet: (
    <>
      <path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h11.75a2 2 0 0 1 2 2v1" />
      <rect x="3.5" y="7.5" width="17" height="11.5" rx="2" />
      <path d="M20.5 12h-3.25a1.75 1.75 0 0 0 0 3.5h3.25" />
    </>
  ),
  orang: (
    <>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20c.6-3.7 3.7-5.75 7.5-5.75S18.9 16.3 19.5 20" />
    </>
  ),
  gerigi: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
  keluar: <path d="M15 17.5v1.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1.5M10.5 12h10m0 0-3.25-3.25M20.5 12l-3.25 3.25" />,
  tambah: <path d="M12 5v14M5 12h14" />,
  cari: (
    <>
      <circle cx="10.75" cy="10.75" r="6.25" />
      <path d="m15.5 15.5 4 4" />
    </>
  ),
  kanan: <path d="m9 5 7 7-7 7" />,
  kiri: <path d="m15 5-7 7 7 7" />,
  bawah: <path d="m5 9 7 7 7-7" />,
  naik: <path d="M3.5 16.5 10 10l4 4 6.5-6.5M20.5 7.5h-5m5 0v5" />,
  turun: <path d="M3.5 7.5 10 14l4-4 6.5 6.5M20.5 16.5h-5m5 0v-5" />,
  centang: <path d="m4.5 12.5 5 5 10-11" />,
  silang: <path d="M6 6l12 12M18 6 6 18" />,
  peringatan: (
    <>
      <path d="M10.3 3.9 2.6 17.1a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4.25M12 17.2h.01" />
    </>
  ),
  jam: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.25l3.25 2" />
    </>
  ),
  kalender: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3.5v4M16 3.5v4" />
    </>
  ),
  bintang: <path d="m12 3.5 2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 17.03l-5.3 2.78 1.01-5.9-4.29-4.18 5.93-.86z" />,
  printer: (
    <>
      <path d="M7 8.5V3.5h10v5" />
      <path d="M7 17H5a2 2 0 0 1-2-2v-4.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-2" />
      <rect x="7" y="13.5" width="10" height="7" rx="1.25" />
    </>
  ),
  wa: (
    <>
      <path d="M3.5 20.5 5 16.3a8.2 8.2 0 1 1 3.2 3.1z" />
      <path d="M9 9.2c0 3 2.3 5.3 5.2 5.4.5 0 1.1-.4 1.2-.9l.1-.6-1.9-.9-.8.9c-1-.4-1.8-1.2-2.2-2.2l.9-.8-.9-1.9-.6.1c-.5.1-1 .6-1 1.2z" />
    </>
  ),
  unduh: <path d="M12 3.5v11m0 0 4-4m-4 4-4-4M4 16.5v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />,
  sampah: (
    <>
      <path d="M4 6.5h16M9.5 6.5V4.75a1.25 1.25 0 0 1 1.25-1.25h2.5a1.25 1.25 0 0 1 1.25 1.25V6.5" />
      <path d="M6.5 6.5 7.3 19a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12.5" />
      <path d="M10.5 10.5v6M13.5 10.5v6" />
    </>
  ),
  pensil: (
    <>
      <path d="M16.2 3.9a2.1 2.1 0 0 1 3 3L8.6 17.5l-4 1 1-4z" />
      <path d="m14.5 5.6 3.9 3.9" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  nota: (
    <>
      <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" />
      <path d="M9 8.5h6M9 12.5h6" />
    </>
  ),
  stok: (
    <>
      <rect x="3.5" y="8" width="17" height="12.5" rx="2" />
      <path d="M3.5 12.5h17M7.5 8V5.5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2V8" />
    </>
  ),
  "stok-kosong": (
    <>
      <path d="M20.5 8.5v7a1.6 1.6 0 0 1-.85 1.4l-6.8 3.6a1.7 1.7 0 0 1-1.7 0l-6.8-3.6a1.6 1.6 0 0 1-.85-1.4v-7" />
      <path d="M3.9 7.6 11.25 3.7a1.7 1.7 0 0 1 1.5 0l7.35 3.9" />
      <path d="m8.5 11.5 7 5M15.5 11.5l-7 5" />
    </>
  ),
  "stok-mati": (
    <>
      <rect x="4" y="7.5" width="16" height="12" rx="2" />
      <path d="M4 11.5h16M12 4.5v3" />
      <path d="M9.5 15.5h5" />
    </>
  ),
  keranjang: (
    <>
      <path d="M3 4.5h2.2l2.3 10.4a1.8 1.8 0 0 0 1.75 1.35h7.6a1.8 1.8 0 0 0 1.75-1.3L20.5 8H6" />
      <circle cx="9.5" cy="19.75" r="1.25" />
      <circle cx="17" cy="19.75" r="1.25" />
    </>
  ),
  kunci: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.75a4 4 0 0 1 8 0v2.75" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.75h.01" />
    </>
  ),
  toko: (
    <>
      <path d="M4 10.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-8.5" />
      <path d="M3.2 10.5a2.7 2.7 0 0 0 4.4-2.1 2.7 2.7 0 0 0 4.4 2.1 2.7 2.7 0 0 0 4.4-2.1 2.7 2.7 0 0 0 4.4 2.1L19 4.2a1 1 0 0 0-.95-.7H5.95a1 1 0 0 0-.95.7z" />
      <path d="M9.75 20.5v-5.25h4.5v5.25" />
    </>
  ),
  petir: <path d="M13.5 2.5 4.5 13.8h6.2l-1.2 7.7 9-11.3h-6.2z" />,
  salin: (
    <>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
      <path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" />
    </>
  ),
};

export function Ikon({
  nama,
  size = 20,
  className,
  isi = false,
}: {
  nama: NamaIkon;
  size?: number;
  className?: string;
  isi?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isi ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {JALUR[nama]}
    </svg>
  );
}
