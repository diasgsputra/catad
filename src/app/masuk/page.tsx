import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { BingkaiAuth } from "@/components/bingkai-auth";
import { Peringatan } from "@/components/ui";
import { dataDemoAda } from "@/lib/data-demo";
import { PESAN_KUOTA_AKUN, PESAN_TOKO_DIBLOKIR } from "@/lib/kuota";
import { keWaInternasional } from "@/lib/pembayaran";
import { tujuanPembayaran } from "@/lib/pengaturan-layanan";
import { demoDiizinkan } from "@/actions/demo";
import { KartuDemo } from "./kartu-demo";
import { FormMasuk } from "./form-masuk";

export const metadata: Metadata = { title: "Masuk" };
export const dynamic = "force-dynamic";

export default async function HalamanMasuk({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string; email?: string; alasan?: string }>;
}) {
  const [sp, boleh] = await Promise.all([searchParams, demoDiizinkan()]);

  // Nomor WhatsApp layanan hanya diperlukan saat memberi tahu toko yang
  // diblokir ke mana harus menghubungi.
  const wa = sp.alasan === "blokir" ? keWaInternasional((await tujuanPembayaran()).waNomor) : "";

  // Teks tombol menyesuaikan: menyiapkan data dulu, atau langsung membuka
  // toko contoh yang sudah ada. Kalau basis data belum siap, anggap belum ada
  // — tombolnya tetap berguna karena memang akan membuatkan datanya.
  const sudahAda = boleh ? await dataDemoAda(db).catch(() => false) : false;

  return (
    <BingkaiAuth
      judul="Masuk ke Catad"
      keterangan="Lanjutkan mencatat penjualan toko Anda."
      kaki={
        <>
          Belum punya akun?{" "}
          <Link href="/daftar" className="font-bold text-merek hover:underline">
            Daftarkan toko gratis
          </Link>
        </>
      }
    >
      {sp.alasan === "kuota" && (
        <Peringatan nada="waspada" className="mb-4" judul="Akun terkunci">
          {PESAN_KUOTA_AKUN}
        </Peringatan>
      )}

      {sp.alasan === "blokir" && (
        <Peringatan nada="bahaya" className="mb-4" judul="Akses dihentikan">
          {PESAN_TOKO_DIBLOKIR}
          {wa && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block font-bold underline"
            >
              Hubungi lewat WhatsApp
            </a>
          )}
        </Peringatan>
      )}

      <FormMasuk lanjut={sp.lanjut} emailAwal={sp.email} />
      {boleh && <KartuDemo sudahAda={sudahAda} />}
    </BingkaiAuth>
  );
}
