"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Konfirmasi } from "@/components/modal";
import { Peringatan } from "@/components/ui";
import { konfirmasiPembayaran, tolakPengajuan } from "@/actions/admin";
import { rupiah } from "@/lib/format";

/**
 * Tombol konfirmasi dan tolak untuk satu pengajuan.
 *
 * Konfirmasi selalu melalui dialog, tidak pernah sekali klik. Menyalakan Pro
 * berarti mengakui uang masuk dan ikut masuk ke laporan keuangan — kesalahan
 * tekan di daftar yang panjang terlalu mudah terjadi dan menyusahkan untuk
 * dibereskan.
 */
export function AksiPengajuan({
  langgananId,
  namaToko,
  jumlah,
}: {
  langgananId: string;
  namaToko: string;
  jumlah: number;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"konfirmasi" | "tolak" | null>(null);
  const [kabar, setKabar] = useState<{ nada: "sukses" | "bahaya"; teks: string } | null>(null);
  const [proses, mulai] = useTransition();

  function jalankan(jenis: "konfirmasi" | "tolak") {
    mulai(async () => {
      const hasil =
        jenis === "konfirmasi"
          ? await konfirmasiPembayaran(langgananId)
          : await tolakPengajuan(langgananId);

      setDialog(null);
      if (hasil.pesan) {
        setKabar({ nada: hasil.sukses ? "sukses" : "bahaya", teks: hasil.pesan });
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setDialog("konfirmasi")}
          disabled={proses}
          className="rounded-lg bg-merek px-2.5 py-1.5 text-[12.5px] font-bold text-white transition-colors hover:bg-merek-tua disabled:bg-tinta-4"
        >
          Sudah bayar
        </button>
        <button
          type="button"
          onClick={() => setDialog("tolak")}
          disabled={proses}
          className="rounded-lg border border-garis-2 px-2.5 py-1.5 text-[12.5px] font-bold text-tinta-2 transition-colors hover:bg-merah-muda hover:text-merah disabled:text-tinta-4"
        >
          Tolak
        </button>
      </div>

      {kabar && (
        <Peringatan nada={kabar.nada} className="mt-2">
          {kabar.teks}
        </Peringatan>
      )}

      <Konfirmasi
        buka={dialog === "konfirmasi"}
        onTutup={() => setDialog(null)}
        onSetuju={() => jalankan("konfirmasi")}
        sedangProses={proses}
        bahaya={false}
        judul={`Konfirmasi pembayaran ${namaToko}?`}
        pesan={`Paket Pro akan langsung menyala dan ${rupiah(jumlah)} tercatat sebagai pendapatan. Pastikan dananya sudah benar-benar masuk ke rekening.`}
        labelSetuju="Sudah masuk, aktifkan"
      />

      <Konfirmasi
        buka={dialog === "tolak"}
        onTutup={() => setDialog(null)}
        onSetuju={() => jalankan("tolak")}
        sedangProses={proses}
        judul={`Tolak pengajuan ${namaToko}?`}
        pesan="Pengajuan ditandai dibatalkan dan tidak lagi muncul di daftar menunggu. Pemilik toko bisa mengajukan lagi kapan saja."
        labelSetuju="Tolak pengajuan"
      />
    </>
  );
}
