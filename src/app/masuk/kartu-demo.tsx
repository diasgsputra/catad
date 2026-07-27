"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Ikon } from "@/components/ikon";
import { Peringatan } from "@/components/ui";
import { EMAIL_DEMO, SANDI_DEMO } from "@/lib/akun-demo";
import { masukDemo, type HasilDemo } from "@/actions/demo";

const AWAL: HasilDemo = {};

function TombolMasukDemo({ sudahAda }: { sudahAda: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-tinta text-[13.5px] font-bold text-white transition-colors hover:bg-tinta-2 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? (
        <>
          <Ikon nama="jam" size={15} />
          {sudahAda ? "Membuka toko contoh…" : "Menyiapkan toko contoh…"}
        </>
      ) : (
        <>
          <Ikon nama="petir" size={15} isi />
          Coba pakai toko contoh
        </>
      )}
    </button>
  );
}

/**
 * Jalan pintas mencoba Catad tanpa mendaftar.
 *
 * Sekali tekan: data contoh dibuat kalau memang belum ada, lalu pengunjung
 * langsung masuk. Isian formulir tidak perlu diketik sama sekali.
 */
export function KartuDemo({ sudahAda }: { sudahAda: boolean }) {
  const [keadaan, kirim] = useActionState(async () => masukDemo(), AWAL);

  return (
    <div className="mt-5 rounded-xl border border-dashed border-garis-2 bg-white/70 p-4">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-merek-muda text-merek">
          <Ikon nama="toko" size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-tinta">Mau lihat-lihat dulu?</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-tinta-3">
            {sudahAda
              ? "Toko contoh sudah siap: 24 barang dan 21 hari transaksi, lengkap dengan laporan dan Catad Insight."
              : "Catad akan menyiapkan toko contoh berisi 24 barang dan 21 hari transaksi, lalu langsung membukanya untukmu."}
          </p>
        </div>
      </div>

      {keadaan.galat && (
        <Peringatan nada="bahaya" className="mt-3">
          {keadaan.galat}
        </Peringatan>
      )}

      <form action={kirim} className="mt-3">
        <TombolMasukDemo sudahAda={sudahAda} />
      </form>

      <p className="mt-2.5 text-center text-[11.5px] leading-relaxed text-tinta-4">
        Bisa juga masuk manual dengan{" "}
        <span className="angka font-semibold text-tinta-3">{EMAIL_DEMO}</span> /{" "}
        <span className="angka font-semibold text-tinta-3">{SANDI_DEMO}</span>. Data contoh
        dipakai bersama pengunjung lain — jangan simpan data asli di sini.
      </p>
    </div>
  );
}
