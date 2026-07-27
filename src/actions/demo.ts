"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { NAMA_COOKIE, buatToken, opsiCookie } from "@/lib/auth";
import { AKUN_DEMO } from "@/lib/akun-demo";
import { buatDataDemo, dataDemoAda } from "@/lib/data-demo";

export type HasilDemo = { galat?: string };

/** Tombol demo bisa dimatikan lewat DEMO_AKTIF=false di lingkungan server. */
export async function demoDiizinkan(): Promise<boolean> {
  return process.env.DEMO_AKTIF !== "false";
}

/**
 * Menyiapkan toko contoh lalu langsung memasukkan pengunjung ke dalamnya.
 *
 * Datanya dibuat sekali saja: pemanggilan berikutnya hanya masuk ke toko yang
 * sudah ada. Kalau dua orang menekan tombol berbarengan, salah satunya kalah
 * di batasan email unik — itu ditangani sebagai "sudah dibuat orang lain",
 * bukan sebagai galat.
 */
export async function masukDemo(): Promise<HasilDemo> {
  if (!(await demoDiizinkan())) {
    return { galat: "Akun demo dinonaktifkan di pemasangan ini." };
  }

  if (!(await dataDemoAda(db))) {
    try {
      await buatDataDemo(db);
    } catch (galat) {
      const bentrok =
        galat instanceof Prisma.PrismaClientKnownRequestError && galat.code === "P2002";

      // Bukan bentrok berarti pembuatan data memang gagal.
      if (!bentrok) {
        console.error("Gagal menyiapkan data demo:", galat);
        return { galat: "Gagal menyiapkan data demo. Coba lagi sebentar lagi." };
      }
    }
  }

  const pemilik = await db.pengguna.findUnique({
    where: { email: AKUN_DEMO.pemilik.email },
    select: {
      id: true,
      nama: true,
      peran: true,
      tokoId: true,
      toko: { select: { nama: true } },
    },
  });

  if (!pemilik) {
    return { galat: "Akun demo tidak ditemukan setelah disiapkan. Coba lagi." };
  }

  await db.pengguna.update({
    where: { id: pemilik.id },
    data: { masukTerakhir: new Date() },
  });

  const token = await buatToken({
    uid: pemilik.id,
    tid: pemilik.tokoId,
    peran: pemilik.peran,
    nama: pemilik.nama,
    toko: pemilik.toko.nama,
  });

  (await cookies()).set(NAMA_COOKIE, token, opsiCookie);
  redirect("/app?demo=1");
}
