"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ikon } from "@/components/ikon";
import { Konfirmasi, Modal } from "@/components/modal";
import { Bidang, Kolom, Kunci, Peringatan, Pilih, Tombol } from "@/components/ui";
import { adaPengubah, dalamIsian, hurufTunggal } from "@/lib/pintasan";
import { rupiah } from "@/lib/format";
import { hapusPengeluaran, simpanPengeluaran } from "@/actions/pengeluaran";
import { KATEGORI_PENGELUARAN } from "@/lib/kategori-pengeluaran";
import type { HasilAksi } from "@/actions/produk";

const AWAL: HasilAksi = {};

export function TombolCatat({ tanggalBawaan }: { tanggalBawaan: string }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [keadaan, kirim, menunggu] = useActionState(simpanPengeluaran, AWAL);

  useEffect(() => {
    if (keadaan.sukses) {
      setBuka(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keadaan]);

  // Tekan N untuk mencatat pengeluaran baru.
  useEffect(() => {
    if (buka) return;

    function tangani(e: KeyboardEvent) {
      if (adaPengubah(e) || dalamIsian(e.target)) return;
      if (hurufTunggal(e, "n")) {
        e.preventDefault();
        setBuka(true);
      }
    }

    window.addEventListener("keydown", tangani);
    return () => window.removeEventListener("keydown", tangani);
  }, [buka]);

  return (
    <>
      <Tombol ikon="tambah" onClick={() => setBuka(true)}>
        Catat pengeluaran
        <Kunci tombol={["N"]} className="ml-1 hidden lg:inline-flex" />
      </Tombol>

      <Modal
        buka={buka}
        onTutup={() => setBuka(false)}
        judul="Catat pengeluaran"
        keterangan="Supaya laba bersih tokomu terhitung benar."
        lebar="kecil"
      >
        <form action={kirim} className="space-y-4">
          {keadaan.galat?._ && <Peringatan nada="bahaya">{keadaan.galat._}</Peringatan>}

          <Bidang label="Kategori" htmlFor="kategori" galat={keadaan.galat?.kategori} wajib>
            <Pilih id="kategori" name="kategori" defaultValue={KATEGORI_PENGELUARAN[0]} required>
              {KATEGORI_PENGELUARAN.map((kt) => (
                <option key={kt} value={kt}>
                  {kt}
                </option>
              ))}
            </Pilih>
          </Bidang>

          <Bidang label="Jumlah (Rp)" htmlFor="jumlah" galat={keadaan.galat?.jumlah} wajib>
            <Kolom
              id="jumlah"
              name="jumlah"
              type="number"
              min={1}
              step={500}
              placeholder="0"
              galat={keadaan.galat?.jumlah}
              required
              autoFocus
              className="angka"
            />
          </Bidang>

          <Bidang label="Tanggal" htmlFor="tanggal" galat={keadaan.galat?.tanggal} wajib>
            <Kolom
              id="tanggal"
              name="tanggal"
              type="date"
              defaultValue={tanggalBawaan}
              max={tanggalBawaan}
              galat={keadaan.galat?.tanggal}
              required
              className="angka"
            />
          </Bidang>

          <Bidang label="Keterangan" htmlFor="keterangan">
            <Kolom id="keterangan" name="keterangan" placeholder="opsional, mis. bayar listrik Juli" />
          </Bidang>

          <div className="flex gap-2 pt-1">
            <Tombol type="button" varian="kedua" penuh onClick={() => setBuka(false)}>
              Batal
            </Tombol>
            <Tombol type="submit" penuh disabled={menunggu}>
              {menunggu ? "Menyimpan…" : "Simpan"}
            </Tombol>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function TombolHapus({
  id,
  kategori,
  jumlah,
}: {
  id: string;
  kategori: string;
  jumlah: number;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [proses, mulai] = useTransition();

  function hapus() {
    mulai(async () => {
      await hapusPengeluaran(id);
      setBuka(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="flex size-7 items-center justify-center rounded-md text-tinta-4 transition-colors hover:bg-merah-muda hover:text-merah"
        aria-label={`Hapus pengeluaran ${kategori}`}
      >
        <Ikon nama="sampah" size={14} />
      </button>

      <Konfirmasi
        buka={buka}
        onTutup={() => setBuka(false)}
        onSetuju={hapus}
        sedangProses={proses}
        judul="Hapus catatan pengeluaran?"
        pesan={`${kategori} sebesar ${rupiah(jumlah)} akan dihapus permanen dari laporan.`}
        labelSetuju="Hapus"
      />
    </>
  );
}
