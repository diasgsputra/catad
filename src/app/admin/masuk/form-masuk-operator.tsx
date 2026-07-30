"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Bidang, Kolom, Peringatan, Tombol } from "@/components/ui";
import { masukOperator, type HasilMasukOperator } from "@/actions/admin-auth";

const AWAL: HasilMasukOperator = {};

function TombolKirim() {
  const { pending } = useFormStatus();
  return (
    <Tombol type="submit" ukuran="besar" penuh disabled={pending}>
      {pending ? "Memeriksa…" : "Masuk"}
    </Tombol>
  );
}

export function FormMasukOperator() {
  const [keadaan, kirim] = useActionState(masukOperator, AWAL);

  return (
    <form action={kirim} className="space-y-4">
      {keadaan.galat && <Peringatan nada="bahaya">{keadaan.galat}</Peringatan>}

      <Bidang label="Email operator" htmlFor="email-operator" wajib>
        <Kolom
          id="email-operator"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="operator@catad.id"
          required
          autoFocus
        />
      </Bidang>

      <Bidang label="Kata sandi" htmlFor="sandi-operator" wajib>
        <Kolom
          id="sandi-operator"
          name="kataSandi"
          type="password"
          autoComplete="current-password"
          required
        />
      </Bidang>

      <TombolKirim />
    </form>
  );
}
