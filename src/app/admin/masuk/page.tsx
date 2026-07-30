import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { sesiOperator } from "@/lib/sesi-admin";
import { FormMasukOperator } from "./form-masuk-operator";

export const metadata: Metadata = {
  title: "Masuk panel operator",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Halaman masuk operator.
 *
 * Sengaja tidak memakai `BingkaiAuth` seperti halaman masuk toko: bingkai itu
 * penuh materi pemasaran Catad. Panel internal tidak perlu dipromosikan, dan
 * tampilannya yang berbeda sekaligus menjadi penanda bahwa ini bukan halaman
 * masuk untuk pelanggan.
 */
export default async function HalamanMasukOperator() {
  // Yang sudah masuk tidak perlu melihat formulir lagi.
  if (await sesiOperator()) redirect("/admin");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-tinta px-5 py-12">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-2.5">
          <LogoMark size={34} gelap />
          <div>
            <p className="text-[11px] font-bold tracking-[0.1em] text-white/45 uppercase">
              Catad
            </p>
            <h1 className="text-[19px] leading-tight font-extrabold tracking-[-0.02em] text-white">
              Panel operator
            </h1>
          </div>
        </div>

        <p className="mt-5 text-[13.5px] leading-relaxed text-white/55">
          Halaman ini untuk pengelola layanan Catad. Pemilik toko masuk melalui halaman masuk
          biasa.
        </p>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-2xl">
          <FormMasukOperator />
        </div>

        <p className="mt-5 text-center text-[11.5px] leading-relaxed text-white/35">
          Akun operator hanya dibuat lewat baris perintah di server. Tidak ada pendaftaran mandiri.
        </p>
      </div>
    </div>
  );
}
