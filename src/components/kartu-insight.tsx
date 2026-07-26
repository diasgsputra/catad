import Link from "next/link";
import { Ikon, type NamaIkon } from "./ikon";
import { cn } from "@/lib/utils";
import type { Insight, NadaInsight } from "@/lib/insight";

const GAYA_NADA: Record<NadaInsight, { lencana: string; teks: string }> = {
  bahaya: { lencana: "bg-merah-muda text-merah", teks: "text-merah" },
  peringatan: { lencana: "bg-kuning-muda text-kuning", teks: "text-kuning" },
  positif: { lencana: "bg-hijau-muda text-hijau", teks: "text-hijau" },
  netral: { lencana: "bg-biru-muda text-biru", teks: "text-biru" },
};

const IKON_AMAN: NamaIkon = "info";

/** Satu butir kesimpulan dari Catad Insight. */
export function KartuInsight({
  insight,
  ringkas = false,
}: {
  insight: Insight;
  ringkas?: boolean;
}) {
  const gaya = GAYA_NADA[insight.nada];
  const nama = (insight.ikon as NamaIkon) ?? IKON_AMAN;

  return (
    <div className={cn("flex items-start gap-3", ringkas ? "px-4 py-3.5" : "p-4")}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          gaya.lencana,
          ringkas ? "mt-0.5 size-8" : "size-9",
        )}
      >
        <Ikon nama={nama} size={ringkas ? 16 : 18} />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-bold tracking-[-0.01em] text-tinta",
            ringkas ? "text-[13.5px] leading-snug" : "text-[15px]",
          )}
        >
          {insight.judul}
        </p>
        <p
          className={cn(
            "mt-0.5 leading-relaxed text-tinta-2",
            ringkas ? "text-[12.5px]" : "text-[13.5px]",
          )}
        >
          {insight.pesan}
        </p>

        {insight.aksi && (
          <Link
            href={insight.aksi.href}
            className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-bold text-merek hover:underline"
          >
            {insight.aksi.label}
            <Ikon nama="kanan" size={12} />
          </Link>
        )}
      </div>
    </div>
  );
}
