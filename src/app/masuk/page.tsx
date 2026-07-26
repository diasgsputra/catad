import type { Metadata } from "next";
import Link from "next/link";
import { BingkaiAuth } from "@/components/bingkai-auth";
import { FormMasuk } from "./form-masuk";
import { KartuDemo } from "./kartu-demo";

export const metadata: Metadata = { title: "Masuk" };

export default async function HalamanMasuk({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string; email?: string }>;
}) {
  const sp = await searchParams;

  return (
    <BingkaiAuth
      judul="Masuk ke Catad"
      keterangan="Lanjutkan mencatat penjualan tokomu."
      kaki={
        <>
          Belum punya akun?{" "}
          <Link href="/daftar" className="font-bold text-merek hover:underline">
            Daftarkan toko gratis
          </Link>
        </>
      }
    >
      <FormMasuk lanjut={sp.lanjut} emailAwal={sp.email} />
      <KartuDemo />
    </BingkaiAuth>
  );
}
