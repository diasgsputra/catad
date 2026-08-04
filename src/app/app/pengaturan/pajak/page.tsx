import type { Metadata } from "next";
import Link from "next/link";
import { Ikon } from "@/components/ikon";
import { Peringatan } from "@/components/ui";
import { wajibPemilik } from "@/lib/sesi";
import { FormPajak } from "./form-pajak";

export const metadata: Metadata = { title: "Pengaturan pajak" };
export const dynamic = "force-dynamic";

/**
 * Halaman tersendiri, terpisah dari pengaturan toko.
 *
 * Dipisah karena isinya berbeda sifat: nama toko dan ucapan di nota diisi
 * sekali lalu jarang disentuh, sedangkan dasar perhitungan pajak menuntut
 * pertimbangan dan sering perlu ditanyakan dulu ke konsultan. Menggabungkannya
 * memaksa pemilik toko melewati sederet istilah perpajakan hanya untuk
 * mengganti nomor WhatsApp toko — dan membuat tabel rujukannya tidak punya
 * tempat.
 *
 * Khusus pemilik: NPWP dan dasar perhitungan pajak bukan urusan kasir, sama
 * seperti laporan pajaknya sendiri.
 */
export default async function HalamanPengaturanPajak() {
  const k = await wajibPemilik();

  return (
    <div className="p-4 sm:p-6">
      <Link
        href="/app/pengaturan"
        className="mb-2 inline-flex items-center gap-1 text-[12.5px] font-bold text-tinta-3 hover:text-tinta"
      >
        <Ikon nama="kiri" size={12} />
        Pengaturan
      </Link>

      <h1 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-tinta">
        Pengaturan pajak
      </h1>
      <p className="mt-1 text-[13px] text-tinta-3">
        Menentukan bagaimana{" "}
        <Link href="/app/pajak" className="font-bold text-merek hover:underline">
          laporan pajak
        </Link>{" "}
        menghitung angkanya. Bila ragu, tanyakan ke konsultan pajak.
      </p>

      <FormPajak
        nilai={{
          npwp: k.toko.npwp,
          namaWajibPajak: k.toko.namaWajibPajak,
          jenisWajibPajak: k.toko.jenisWajibPajak,
          rezimPajak: k.toko.rezimPajak,
          tarifFinalBps: k.toko.tarifFinalBps,
          fasilitasBebas: k.toko.fasilitasBebas,
          normaBps: k.toko.normaBps,
          ptkpSetahun: k.toko.ptkpSetahun,
          tarifBadanBps: k.toko.tarifBadanBps,
          pakai31E: k.toko.pakai31E,
        }}
        namaToko={k.toko.nama}
        bolehUbah
      />

      <Peringatan nada="info" className="mt-5" judul="Bukan nasihat perpajakan">
        Catad menyusun kertas kerja, bukan formulir SPT. Pilihan di halaman ini menentukan rumus
        yang dipakai — yang tidak sesuai menghasilkan angka yang salah.
      </Peringatan>
    </div>
  );
}
