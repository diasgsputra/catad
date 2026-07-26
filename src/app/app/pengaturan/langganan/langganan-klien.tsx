"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Konfirmasi } from "@/components/modal";
import { Peringatan, Tombol } from "@/components/ui";
import { aktifkanPro, hentikanPro } from "@/actions/toko";
import { rupiah } from "@/lib/format";

export function TombolLangganan({
  siklus,
  harga,
  label,
  varian = "utama",
  sedangPro,
}: {
  siklus: "BULANAN" | "TAHUNAN";
  harga: number;
  label: string;
  varian?: "utama" | "kedua";
  sedangPro: boolean;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [kabar, setKabar] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  function jalankan() {
    mulai(async () => {
      const hasil = await aktifkanPro(siklus);
      setBuka(false);
      setKabar(hasil.pesan ?? null);
      router.refresh();
    });
  }

  return (
    <>
      <Tombol varian={varian} ukuran="besar" penuh onClick={() => setBuka(true)}>
        {label}
      </Tombol>

      {kabar && (
        <Peringatan nada="sukses" className="mt-3">
          {kabar}
        </Peringatan>
      )}

      <Konfirmasi
        buka={buka}
        onTutup={() => setBuka(false)}
        onSetuju={jalankan}
        sedangProses={proses}
        bahaya={false}
        judul={sedangPro ? "Perpanjang paket Pro?" : "Aktifkan paket Pro?"}
        pesan={`Paket Pro ${siklus === "TAHUNAN" ? "tahunan" : "bulanan"} sebesar ${rupiah(harga)} akan diaktifkan. Pada versi ini pembayaran masih disimulasikan — tidak ada uang yang benar-benar ditagih.`}
        labelSetuju={sedangPro ? "Perpanjang" : "Aktifkan Pro"}
      />
    </>
  );
}

export function TombolHenti() {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [kabar, setKabar] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  function jalankan() {
    mulai(async () => {
      const hasil = await hentikanPro();
      setBuka(false);
      setKabar(hasil.pesan ?? null);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="text-[12.5px] font-semibold text-tinta-3 underline decoration-garis-2 underline-offset-2 hover:text-merah"
      >
        Hentikan langganan
      </button>

      {kabar && (
        <Peringatan nada="info" className="mt-3">
          {kabar}
        </Peringatan>
      )}

      <Konfirmasi
        buka={buka}
        onTutup={() => setBuka(false)}
        onSetuju={jalankan}
        sedangProses={proses}
        judul="Hentikan langganan Pro?"
        pesan="Akun akan kembali ke paket Gratis. Semua data tetap tersimpan, tapi Catad Insight, laporan penuh, dan unduh CSV tidak bisa dipakai lagi."
        labelSetuju="Hentikan"
      />
    </>
  );
}
