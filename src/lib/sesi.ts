import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NAMA_COOKIE, bacaToken, type IsiSesi } from "./auth";
import { db } from "./db";
import { akunDalamKuota } from "./kuota";
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
    diblokir: boolean;
    catatanNota: string | null;
    persenPajak: number;
    waToko: string | null;
    npwp: string | null;
    namaWajibPajak: string | null;
    jenisWajibPajak: "ORANG_PRIBADI" | "BADAN";
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
          diblokir: true,
          catatanNota: true,
          persenPajak: true,
          waToko: true,
          npwp: true,
          namaWajibPajak: true,
          jenisWajibPajak: true,
        },
      },
    },
  });

  // Akun dinonaktifkan / dihapus setelah token dibuat.
  if (!pengguna) redirect("/keluar");

  // Blokir diperiksa lebih dulu daripada apa pun. Toko yang diblokir tidak
  // boleh membuka satu halaman pun, termasuk kasir — kalau tidak, transaksi
  // masih bisa masuk selama sesi lamanya belum kedaluwarsa.
  if (pengguna.toko.diblokir) redirect("/keluar?alasan=blokir");

  const paket = statusPaket(pengguna.toko);

  // Batas jumlah akun ditegakkan di sini, bukan hanya saat akun ditambahkan.
  // Tanpa ini akun kasir sisa masa uji coba tetap bisa dipakai selamanya
  // walaupun paketnya sudah turun ke Gratis yang cuma mengizinkan 1 akun.
  //
  // PEMILIK tidak perlu diperiksa: `idDalamKuota` selalu mendahulukannya, jadi
  // dia pasti lolos. Sekaligus menghemat satu kueri pada setiap halaman.
  if (pengguna.peran !== "PEMILIK" && Number.isFinite(paket.batas.maksPengguna)) {
    const akun = await db.pengguna.findMany({
      where: { tokoId: pengguna.toko.id },
      select: { id: true, peran: true, dibuatPada: true },
    });
    if (!akunDalamKuota(akun, s.uid, paket.batas.maksPengguna)) {
      redirect("/keluar?alasan=kuota");
    }
  }

  return {
    sesi: { ...s, peran: pengguna.peran },
    toko: pengguna.toko,
    paket,
  };
}

/** Halaman/aksi khusus pemilik. */
export async function wajibPemilik(): Promise<KonteksToko> {
  const k = await konteks();
  if (k.sesi.peran !== "PEMILIK") redirect("/app?galat=khusus-pemilik");
  return k;
}
