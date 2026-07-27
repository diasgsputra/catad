import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { BingkaiAuth } from "@/components/bingkai-auth";
import { dataDemoAda } from "@/lib/data-demo";
import { demoDiizinkan } from "@/actions/demo";
import { KartuDemo } from "./kartu-demo";
import { FormMasuk } from "./form-masuk";

export const metadata: Metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

export default async function HalamanMasuk({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string; email?: string }>;
}) {
  const [sp, boleh] = await Promise.all([searchParams, demoDiizinkan()]);

  // Teks tombol menyesuaikan: menyiapkan data dulu, atau langsung membuka
  // toko contoh yang sudah ada. Kalau basis data belum siap, anggap belum ada
  // — tombolnya tetap berguna karena memang akan membuatkan datanya.
  const sudahAda = boleh ? await dataDemoAda(db).catch(() => false) : false;

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
      {boleh && <KartuDemo sudahAda={sudahAda} />}
    </BingkaiAuth>
  );
}
