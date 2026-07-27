"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { daftarAksi, type HasilForm } from "@/actions/auth";
import { Bidang, Kolom, Peringatan, Pilih, Tombol } from "@/components/ui";
import { HARI_UJI_COBA } from "@/lib/plan";

const AWAL: HasilForm = {};

const JENIS_USAHA = [
  "Warung / Toko Kelontong",
  "Kedai Kopi / Kafe",
  "Rumah Makan / Warteg",
  "Toko Sembako",
  "Laundry",
  "Toko Bangunan",
  "Apotek / Toko Obat",
  "Jasa / Lainnya",
];

function TombolKirim() {
  const { pending } = useFormStatus();
  return (
    <Tombol type="submit" ukuran="besar" penuh disabled={pending}>
      {pending ? "Menyiapkan toko…" : `Buat akun & coba Pro ${HARI_UJI_COBA} hari`}
    </Tombol>
  );
}

export function FormDaftar() {
  const [keadaan, kirim] = useActionState(daftarAksi, AWAL);

  return (
    <form action={kirim} className="space-y-4">
      {keadaan.galat?._ && <Peringatan nada="bahaya">{keadaan.galat._}</Peringatan>}

      <Bidang label="Nama toko" htmlFor="namaToko" galat={keadaan.galat?.namaToko} wajib>
        <Kolom
          id="namaToko"
          name="namaToko"
          placeholder="Warung Bu Sari"
          galat={keadaan.galat?.namaToko}
          required
          autoFocus
        />
      </Bidang>

      <Bidang label="Jenis usaha" htmlFor="jenisUsaha">
        <Pilih id="jenisUsaha" name="jenisUsaha" defaultValue={JENIS_USAHA[0]}>
          {JENIS_USAHA.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </Pilih>
      </Bidang>

      <div className="garis-nota my-5" />

      <Bidang label="Nama Anda" htmlFor="nama" galat={keadaan.galat?.nama} wajib>
        <Kolom
          id="nama"
          name="nama"
          placeholder="Sari Wulandari"
          autoComplete="name"
          galat={keadaan.galat?.nama}
          required
        />
      </Bidang>

      <Bidang label="Email" htmlFor="email" galat={keadaan.galat?.email} wajib>
        <Kolom
          id="email"
          name="email"
          type="email"
          placeholder="nama@email.com"
          autoComplete="email"
          galat={keadaan.galat?.email}
          required
        />
      </Bidang>

      <Bidang
        label="Kata sandi"
        htmlFor="kataSandi"
        galat={keadaan.galat?.kataSandi}
        petunjuk="Minimal 6 karakter."
        wajib
      >
        <Kolom
          id="kataSandi"
          name="kataSandi"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          galat={keadaan.galat?.kataSandi}
          required
        />
      </Bidang>

      <TombolKirim />

      <p className="text-center text-[12px] leading-relaxed text-tinta-4">
        Tanpa kartu kredit. Setelah {HARI_UJI_COBA} hari, akun otomatis lanjut ke paket Gratis
        dan semua data tetap tersimpan.
      </p>
    </form>
  );
}
