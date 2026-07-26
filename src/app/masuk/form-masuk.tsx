"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { masukAksi, type HasilForm } from "@/actions/auth";
import { Bidang, Kolom, Peringatan, Tombol } from "@/components/ui";

const AWAL: HasilForm = {};

function TombolKirim() {
  const { pending } = useFormStatus();
  return (
    <Tombol type="submit" ukuran="besar" penuh disabled={pending}>
      {pending ? "Memeriksa…" : "Masuk"}
    </Tombol>
  );
}

export function FormMasuk({
  lanjut,
  emailAwal,
}: {
  lanjut?: string;
  emailAwal?: string;
}) {
  const [keadaan, kirim] = useActionState(masukAksi, AWAL);

  return (
    <form action={kirim} className="space-y-4">
      {keadaan.galat?._ && <Peringatan nada="bahaya">{keadaan.galat._}</Peringatan>}

      <input type="hidden" name="lanjut" value={lanjut ?? ""} />

      <Bidang label="Email" htmlFor="email" galat={keadaan.galat?.email} wajib>
        <Kolom
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          defaultValue={emailAwal}
          galat={keadaan.galat?.email}
          required
          autoFocus
        />
      </Bidang>

      <Bidang label="Kata sandi" htmlFor="kataSandi" galat={keadaan.galat?.kataSandi} wajib>
        <Kolom
          id="kataSandi"
          name="kataSandi"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          galat={keadaan.galat?.kataSandi}
          required
        />
      </Bidang>

      <TombolKirim />
    </form>
  );
}
