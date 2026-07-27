"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ikon } from "@/components/ikon";
import { Konfirmasi, Modal } from "@/components/modal";
import { Bidang, Kolom, Kunci, Peringatan, Pilih, Tombol } from "@/components/ui";
import { adaPengubah, dalamIsian, hurufTunggal } from "@/lib/pintasan";
import { hapusPengguna, tambahPengguna, ubahAktifPengguna } from "@/actions/toko";
import type { HasilAksi } from "@/actions/produk";

const AWAL: HasilAksi = {};

export function TombolTambahPengguna({ kuotaHabis }: { kuotaHabis: boolean }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [keadaan, kirim, menunggu] = useActionState(tambahPengguna, AWAL);

  useEffect(() => {
    if (keadaan.sukses) {
      setBuka(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keadaan]);

  // Tekan N untuk menambah akun.
  useEffect(() => {
    if (buka || kuotaHabis) return;

    function tangani(e: KeyboardEvent) {
      if (adaPengubah(e) || dalamIsian(e.target)) return;
      if (hurufTunggal(e, "n")) {
        e.preventDefault();
        setBuka(true);
      }
    }

    window.addEventListener("keydown", tangani);
    return () => window.removeEventListener("keydown", tangani);
  }, [buka, kuotaHabis]);

  return (
    <>
      <Tombol ikon="tambah" onClick={() => setBuka(true)} disabled={kuotaHabis}>
        Tambah akun
        <Kunci tombol={["N"]} className="ml-1 hidden lg:inline-flex" />
      </Tombol>

      <Modal
        buka={buka}
        onTutup={() => setBuka(false)}
        judul="Tambah akun"
        keterangan="Kasir hanya bisa membuka kasir dan transaksi, tidak bisa melihat laporan laba."
        lebar="kecil"
      >
        <form action={kirim} className="space-y-4">
          {keadaan.galat?._ && <Peringatan nada="bahaya">{keadaan.galat._}</Peringatan>}

          <Bidang label="Nama" htmlFor="nama-baru" galat={keadaan.galat?.nama} wajib>
            <Kolom
              id="nama-baru"
              name="nama"
              placeholder="Andi Pratama"
              galat={keadaan.galat?.nama}
              required
              autoFocus
            />
          </Bidang>

          <Bidang label="Email" htmlFor="email-baru" galat={keadaan.galat?.email} wajib>
            <Kolom
              id="email-baru"
              name="email"
              type="email"
              placeholder="andi@email.com"
              galat={keadaan.galat?.email}
              required
            />
          </Bidang>

          <Bidang
            label="Kata sandi awal"
            htmlFor="sandi-baru"
            galat={keadaan.galat?.kataSandi}
            petunjuk="Beri tahu ke yang bersangkutan, minta segera diganti."
            wajib
          >
            <Kolom
              id="sandi-baru"
              name="kataSandi"
              type="password"
              galat={keadaan.galat?.kataSandi}
              required
            />
          </Bidang>

          <Bidang label="Peran" htmlFor="peran">
            <Pilih id="peran" name="peran" defaultValue="KASIR">
              <option value="KASIR">Kasir — kasir & transaksi saja</option>
              <option value="PEMILIK">Pemilik — akses penuh</option>
            </Pilih>
          </Bidang>

          <div className="flex gap-2 pt-1">
            <Tombol type="button" varian="kedua" penuh onClick={() => setBuka(false)}>
              Batal
            </Tombol>
            <Tombol type="submit" penuh disabled={menunggu}>
              {menunggu ? "Menyimpan…" : "Buat akun"}
            </Tombol>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function AksiPengguna({
  id,
  nama,
  aktif,
  diriSendiri,
}: {
  id: string;
  nama: string;
  aktif: boolean;
  diriSendiri: boolean;
}) {
  const router = useRouter();
  const [akanHapus, setAkanHapus] = useState(false);
  const [kabar, setKabar] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  if (diriSendiri) {
    return <span className="text-[12px] text-tinta-4">akun Anda</span>;
  }

  function alih() {
    mulai(async () => {
      const hasil = await ubahAktifPengguna(id, !aktif);
      if (!hasil.sukses) setKabar(hasil.pesan ?? null);
      router.refresh();
    });
  }

  function hapus() {
    mulai(async () => {
      const hasil = await hapusPengguna(id);
      setAkanHapus(false);
      if (!hasil.sukses) setKabar(hasil.pesan ?? null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center justify-end gap-0.5">
        <button
          type="button"
          onClick={alih}
          disabled={proses}
          title={aktif ? "Nonaktifkan akun" : "Aktifkan akun"}
          className="flex size-7 items-center justify-center rounded-md text-tinta-3 transition-colors hover:bg-kertas-2 hover:text-tinta"
        >
          <Ikon nama={aktif ? "kunci" : "centang"} size={14} />
        </button>
        <button
          type="button"
          onClick={() => setAkanHapus(true)}
          title="Hapus akun"
          className="flex size-7 items-center justify-center rounded-md text-tinta-3 transition-colors hover:bg-merah-muda hover:text-merah"
        >
          <Ikon nama="sampah" size={14} />
        </button>
      </div>

      {kabar && <p className="mt-1 text-right text-[11.5px] font-semibold text-merah">{kabar}</p>}

      <Konfirmasi
        buka={akanHapus}
        onTutup={() => setAkanHapus(false)}
        onSetuju={hapus}
        sedangProses={proses}
        judul={`Hapus akun ${nama}?`}
        pesan="Akun tidak bisa dipakai masuk lagi. Transaksi yang pernah dia layani tetap tersimpan di riwayat."
        labelSetuju="Hapus akun"
      />
    </>
  );
}
