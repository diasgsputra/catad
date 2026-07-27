import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { BingkaiAuth } from "@/components/bingkai-auth";
import { EMAIL_DEMO } from "@/lib/akun-demo";
import { KartuDemo } from "./kartu-demo";
import { FormMasuk } from "./form-masuk";

export const metadata: Metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

/**
 * Kartu "coba akun demo" hanya boleh muncul kalau akunnya memang ada.
 *
 * Pemasangan di server berjalan dengan SEED_DEMO=false, sehingga akun demo
 * tidak pernah dibuat. Tanpa pemeriksaan ini, halaman masuk memajang kredensial
 * yang dijamin gagal — persis pengalaman yang membingungkan.
 */
async function adaAkunDemo(): Promise<boolean> {
  try {
    const demo = await db.pengguna.findUnique({
      where: { email: EMAIL_DEMO },
      select: { id: true },
    });
    return demo !== null;
  } catch {
    // Basis data belum siap: lebih baik sembunyikan kartunya daripada
    // menggagalkan seluruh halaman masuk.
    return false;
  }
}

export default async function HalamanMasuk({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string; email?: string }>;
}) {
  const [sp, tampilkanDemo] = await Promise.all([searchParams, adaAkunDemo()]);

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
      {tampilkanDemo && <KartuDemo />}
    </BingkaiAuth>
  );
}
