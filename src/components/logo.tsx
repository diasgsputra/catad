import { cn } from "@/lib/utils";

/**
 * Lambang Catad.
 *
 * Huruf "C" tebal yang memeluk selembar catatan dengan sudut terlipat: yang
 * dicatat di kertas kini tersimpan rapi secara digital. Sudut lipatan memakai
 * warna tosca sebagai satu-satunya aksen.
 *
 * Badan kertas sengaja putih pekat, bukan transparan, supaya lambangnya tetap
 * terbaca di atas latar terang maupun gelap.
 */

export const WARNA_TINTA = "#22324A";
export const WARNA_TOSCA = "#22BC8C";

export function LogoMark({
  size = 32,
  className,
  /** Dipakai di atas latar gelap: huruf C berubah putih. */
  gelap = false,
}: {
  size?: number;
  className?: string;
  gelap?: boolean;
}) {
  const warnaC = gelap ? "#FFFFFF" : WARNA_TINTA;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Catad"
      className={cn("shrink-0", className)}
    >
      {/* Digambar dengan koordinat yang enak dibaca, lalu ditengahkan dan
          dibesarkan sekali lewat transform: kotak isi aslinya (20,4; 23,9)
          digeser ke pusat kanvas 48x48. */}
      <g transform="translate(24 24) scale(1.15) translate(-20.4 -23.9)">
        {/* Huruf C — busur tebal yang terbuka ke kanan. */}
        <path
          d="M30.7 13.23A14.5 14.5 0 1 0 30.7 34.77"
          stroke={warnaC}
          strokeWidth="7"
          strokeLinecap="round"
        />

        {/* Lembar catatan. */}
        <rect x="24.5" y="16" width="13.5" height="16" rx="2" fill="#FFFFFF" />

        {/* Sudut kanan atas yang terlipat. */}
        <path d="M33 16H36A2 2 0 0 1 38 18V21Z" fill={WARNA_TOSCA} />

        {/* Baris-baris tulisan di kertas. */}
        <g fill={WARNA_TINTA}>
          <rect x="27.5" y="22" width="5.5" height="1.7" rx="0.85" />
          <rect x="27.5" y="25.6" width="8" height="1.7" rx="0.85" />
          <rect x="27.5" y="29.2" width="8" height="1.7" rx="0.85" />
        </g>
      </g>
    </svg>
  );
}

/** Lambang + tulisan "Catad". Dipakai di navigasi dan halaman masuk. */
export function Logo({
  size = 32,
  className,
  tagline = false,
  warnaTeks = "text-tinta",
  gelap = false,
}: {
  size?: number;
  className?: string;
  tagline?: boolean;
  warnaTeks?: string;
  gelap?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} gelap={gelap} />
      <span className="flex flex-col leading-none">
        <span
          className={cn("font-extrabold tracking-[-0.03em]", warnaTeks)}
          style={{ fontSize: size * 0.62 }}
        >
          {/* Kotak tosca kecil menempel di ujung batang huruf "d". */}
          Cata
          <span className="relative inline-block">
            d
            <span
              aria-hidden="true"
              className="absolute rounded-[1px]"
              style={{
                backgroundColor: WARNA_TOSCA,
                width: size * 0.105,
                height: size * 0.105,
                right: 0,
                top: size * 0.02,
              }}
            />
          </span>
        </span>
        {tagline && (
          <span
            className="mt-1 font-semibold tracking-[0.14em] uppercase"
            style={{ fontSize: Math.max(8, size * 0.225), color: WARNA_TOSCA }}
          >
            Catatan Digital
          </span>
        )}
      </span>
    </span>
  );
}
