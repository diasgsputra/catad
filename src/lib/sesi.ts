import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NAMA_COOKIE, bacaToken, type IsiSesi } from "./auth";
import { db } from "./db";
import { statusPaket, type StatusPaket } from "./plan";

export type Sesi = IsiSesi;

/** Sesi dari cookie tanpa menyentuh database. Null bila belum masuk. */
export async function sesi(): Promise<Sesi | null> {
  const jar = await cookies();
  return bacaToken(jar.get(NAMA_COOKIE)?.value);
}

/** Sesi wajib ada, kalau tidak dialihkan ke halaman masuk. */
export async function wajibSesi(): Promise<Sesi> {
  const s = await sesi();
  if (!s) redirect("/masuk");
  return s;
}

export type KonteksToko = {
  sesi: Sesi;
  toko: {
    id: string;
    nama: string;
    slug: string;
    jenisUsaha: string;
    alamat: string | null;
    telepon: string | null;
    paket: string;
    trialSampai: Date | null;
    proSampai: Date | null;
    catatanNota: string | null;
    persenPajak: number;
    waToko: string | null;
  };
  paket: StatusPaket;
};

/**
 * Konteks lengkap untuk halaman di dalam /app: sesi + data toko + status paket.
 * Sekaligus memastikan pengguna masih aktif dan tokonya masih ada.
 */
export async function konteks(): Promise<KonteksToko> {
  const s = await wajibSesi();

  const pengguna = await db.pengguna.findFirst({
    where: { id: s.uid, tokoId: s.tid, aktif: true },
    select: {
      peran: true,
      toko: {
        select: {
          id: true,
          nama: true,
          slug: true,
          jenisUsaha: true,
          alamat: true,
          telepon: true,
          paket: true,
          trialSampai: true,
          proSampai: true,
          catatanNota: true,
          persenPajak: true,
          waToko: true,
        },
      },
    },
  });

  // Akun dinonaktifkan / dihapus setelah token dibuat.
  if (!pengguna) redirect("/keluar");

  return {
    sesi: { ...s, peran: pengguna.peran },
    toko: pengguna.toko,
    paket: statusPaket(pengguna.toko),
  };
}

/** Halaman/aksi khusus pemilik. */
export async function wajibPemilik(): Promise<KonteksToko> {
  const k = await konteks();
  if (k.sesi.peran !== "PEMILIK") redirect("/app?galat=khusus-pemilik");
  return k;
}
