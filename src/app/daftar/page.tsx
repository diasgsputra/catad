import type { Metadata } from "next";
import Link from "next/link";
import { BingkaiAuth } from "@/components/bingkai-auth";
import { FormDaftar } from "./form-daftar";

export const metadata: Metadata = { title: "Daftar" };

export default function HalamanDaftar() {
  return (
    <BingkaiAuth
      judul="Daftarkan tokomu"
      keterangan="Satu menit, langsung bisa dipakai jualan hari ini."
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
