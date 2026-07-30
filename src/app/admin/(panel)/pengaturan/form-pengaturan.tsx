"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AreaTeks, Bidang, Kolom, Peringatan, Tombol } from "@/components/ui";
import { simpanPengaturan, type HasilAdmin } from "@/actions/admin";
import type { TujuanPembayaran } from "@/lib/pembayaran";

const AWAL: HasilAdmin = {};

function TombolSimpan() {
  const { pending } = useFormStatus();
  return (
    <Tombol type="submit" ikon="centang" disabled={pending}>
      {pending ? "Menyimpan…" : "Simpan perubahan"}
    </Tombol>
  );
}

export function FormPengaturan({ tujuan }: { tujuan: TujuanPembayaran }) {
  const [keadaan, kirim] = useActionState(simpanPengaturan, AWAL);

  return (
    <form action={kirim} className="space-y-4">
      {keadaan.galat?._ && <Peringatan nada="bahaya">{keadaan.galat._}</Peringatan>}
      {keadaan.sukses && keadaan.pesan && <Peringatan nada="sukses">{keadaan.pesan}</Peringatan>}

      <Bidang label="Nama bank" htmlFor="bankNama" galat={keadaan.galat?.bankNama} wajib>
        <Kolom
          id="bankNama"
          name="bankNama"
          defaultValue={tujuan.bankNama}
          placeholder="BCA"
          galat={keadaan.galat?.bankNama}
          required
        />
      </Bidang>

      <Bidang
        label="Nomor rekening"
        htmlFor="bankRekening"
        galat={keadaan.galat?.bankRekening}
        petunjuk="Angka saja. Pelanggan menyalin nomor ini apa adanya ke aplikasi bank."
        wajib
      >
        <Kolom
          id="bankRekening"
          name="bankRekening"
          defaultValue={tujuan.bankRekening}
          placeholder="0375553291"
          inputMode="numeric"
          className="angka"
          galat={keadaan.galat?.bankRekening}
          required
        />
      </Bidang>

      <Bidang
        label="Nama pemilik rekening"
        htmlFor="bankPemilik"
        galat={keadaan.galat?.bankPemilik}
        petunjuk="Boleh dikosongkan. Kalau kosong, barisnya tidak ditampilkan ke pelanggan."
      >
        <Kolom
          id="bankPemilik"
          name="bankPemilik"
          defaultValue={tujuan.bankPemilik ?? ""}
          placeholder="mis. Dias Saputra"
          galat={keadaan.galat?.bankPemilik}
        />
      </Bidang>

      <Bidang
        label="Nomor WhatsApp"
        htmlFor="waNomor"
        galat={keadaan.galat?.waNomor}
        petunjuk="Boleh ditulis 08…, 62…, atau +62…. Bentuk untuk tautan wa.me dibuat otomatis."
        wajib
      >
        <Kolom
          id="waNomor"
          name="waNomor"
          defaultValue={tujuan.waNomor}
          placeholder="081329732838"
          inputMode="tel"
          className="angka"
          galat={keadaan.galat?.waNomor}
          required
        />
      </Bidang>

      <Bidang
        label="Catatan tambahan"
        htmlFor="catatanPembayaran"
        galat={keadaan.galat?.catatanPembayaran}
        petunjuk="Muncul di bawah petunjuk transfer. Mis. jam pengecekan pembayaran."
      >
        <AreaTeks
          id="catatanPembayaran"
          name="catatanPembayaran"
          defaultValue={tujuan.catatanPembayaran ?? ""}
          placeholder="Pembayaran dicek setiap hari pukul 09.00–21.00 WIB."
          maxLength={200}
          galat={keadaan.galat?.catatanPembayaran}
        />
      </Bidang>

      <TombolSimpan />
    </form>
  );
}
