"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Konfirmasi } from "@/components/modal";
import { Peringatan, Tombol } from "@/components/ui";
import { batalkanTransaksi } from "@/actions/kasir";

/** Pembatalan transaksi — hanya muncul untuk pemilik. */
export function AksiTransaksi({ id, nomor }: { id: string; nomor: string }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  function batalkan() {
    mulai(async () => {
      const hasil = await batalkanTransaksi(id);
      if (hasil.sukses) {
        setBuka(false);
        router.refresh();
      } else {
        setGalat(hasil.pesan);
        setBuka(false);
      }
    });
  }

  return (
    <>
      <Tombol varian="kedua" ikon="silang" onClick={() => setBuka(true)}>
        Batalkan
      </Tombol>

      {galat && (
        <Peringatan nada="bahaya" className="mt-3">
          {galat}
        </Peringatan>
      )}

      <Konfirmasi
        buka={buka}
        onTutup={() => setBuka(false)}
        onSetuju={batalkan}
        sedangProses={proses}
        judul={`Batalkan ${nomor}?`}
        pesan="Stok semua barang di nota ini akan dikembalikan dan transaksi tidak lagi dihitung dalam laporan. Riwayatnya tetap tersimpan."
        labelSetuju="Batalkan transaksi"
      />
    </>
  );
}
