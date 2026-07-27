import type { Metadata } from "next";
import Link from "next/link";
import { BingkaiAuth } from "@/components/bingkai-auth";
import { FormDaftar } from "./form-daftar";

export const metadata: Metadata = { title: "Daftar" };

export default function HalamanDaftar() {
  return (
    <BingkaiAuth
      judul="Daftarkan toko Anda"
      keterangan="Pendaftaran hanya membutuhkan satu menit."
      kaki={
        <>
          Sudah punya akun?{" "}
          <Link href="/masuk" className="font-bold text-merek hover:underline">
            Masuk di sini
          </Link>
        </>
      }
    >
      <FormDaftar />
    </BingkaiAuth>
  );
}
