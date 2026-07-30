"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { NAMA_COOKIE, buatToken, opsiCookie } from "@/lib/auth";
import { skemaDaftar, skemaMasuk, galatForm } from "@/lib/validasi";
import { slug } from "@/lib/utils";
import { tambahHari } from "@/lib/format";
import { HARI_UJI_COBA, statusPaket } from "@/lib/plan";
import { PESAN_KUOTA_AKUN, akunDalamKuota } from "@/lib/kuota";

export type HasilForm = {
  galat?: Record<string, string>;
  pesan?: string;
};

const KATEGORI_AWAL = [
  { nama: "Makanan", warna: "#C2680E" },
  { nama: "Minuman", warna: "#0F6B57" },
  { nama: "Sembako", warna: "#8A6D1F" },
  { nama: "Rokok", warna: "#7A4A3A" },
  { nama: "Lainnya", warna: "#4A5A6B" },
];

export async function daftarAksi(_sebelum: HasilForm, data: FormData): Promise<HasilForm> {
  const hasil = skemaDaftar.safeParse({
    namaToko: data.get("namaToko"),
    jenisUsaha: data.get("jenisUsaha") || undefined,
    nama: data.get("nama"),
    email: data.get("email"),
    kataSandi: data.get("kataSandi"),
  });

  if (!hasil.success) return { galat: galatForm(hasil.error) };
  const { namaToko, jenisUsaha, nama, email, kataSandi } = hasil.data;

  const sudahAda = await db.pengguna.findUnique({ where: { email }, select: { id: true } });
  if (sudahAda) {
    return { galat: { email: "Email ini sudah terdaftar. Coba masuk saja." } };
  }

  const sekarang = new Date();
  const kataSandiHash = await bcrypt.hash(kataSandi, 10);

  // Slug toko harus unik lintas tenant.
  const dasarSlug = slug(namaToko);
  let slugToko = dasarSlug;
  for (let i = 2; i < 60; i += 1) {
    const bentrok = await db.toko.findUnique({ where: { slug: slugToko }, select: { id: true } });
    if (!bentrok) break;
    slugToko = `${dasarSlug}-${i}`;
  }

  const toko = await db.toko.create({
    data: {
      nama: namaToko,
      slug: slugToko,
      jenisUsaha: jenisUsaha || "Warung / Toko Kelontong",
      // Semua toko baru mencoba fitur Pro lebih dulu.
      trialSampai: tambahHari(sekarang, HARI_UJI_COBA),
      kategori: { create: KATEGORI_AWAL.map((k, urutan) => ({ ...k, urutan })) },
      pengguna: {
        create: { nama, email, kataSandiHash, peran: "PEMILIK", masukTerakhir: sekarang },
      },
    },
    select: { id: true, nama: true, pengguna: { select: { id: true, nama: true, peran: true } } },
  });

  const pemilik = toko.pengguna[0];
  const token = await buatToken({
    uid: pemilik.id,
    tid: toko.id,
    peran: "PEMILIK",
    nama: pemilik.nama,
    toko: toko.nama,
  });

  (await cookies()).set(NAMA_COOKIE, token, opsiCookie);
  redirect("/app?baru=1");
}

export async function masukAksi(_sebelum: HasilForm, data: FormData): Promise<HasilForm> {
  const hasil = skemaMasuk.safeParse({
    email: data.get("email"),
    kataSandi: data.get("kataSandi"),
  });

  if (!hasil.success) return { galat: galatForm(hasil.error) };
  const { email, kataSandi } = hasil.data;

  const pengguna = await db.pengguna.findUnique({
    where: { email },
    select: {
      id: true,
      nama: true,
      peran: true,
      aktif: true,
      kataSandiHash: true,
      tokoId: true,
      toko: {
        select: { nama: true, paket: true, trialSampai: true, proSampai: true },
      },
    },
  });

  // Pesan yang sama untuk email salah maupun sandi salah, supaya tidak
  // membocorkan email mana yang terdaftar.
  const pesanGagal = { galat: { _: "Email atau kata sandi salah." } };
  if (!pengguna) {
    // Tetap jalankan hash agar waktu respons tidak membedakan email ada/tidak.
    await bcrypt.compare(kataSandi, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin");
    return pesanGagal;
  }

  const cocok = await bcrypt.compare(kataSandi, pengguna.kataSandiHash);
  if (!cocok) return pesanGagal;

  if (!pengguna.aktif) {
    return { galat: { _: "Akun ini sudah dinonaktifkan. Hubungi pemilik toko." } };
  }

  // Batas jumlah akun paket Gratis ditegakkan di sini juga, bukan cuma di dalam
  // /app. Kalau hanya dihalau di sana, pengguna akan terlihat "keluar sendiri"
  // tanpa tahu sebabnya. Pemilik toko selalu lolos, jadi dia tetap bisa masuk
  // untuk berlangganan atau merapikan akun.
  const paket = statusPaket(pengguna.toko);
  if (Number.isFinite(paket.batas.maksPengguna)) {
    const akun = await db.pengguna.findMany({
      where: { tokoId: pengguna.tokoId },
      select: { id: true, peran: true, dibuatPada: true },
    });
    if (!akunDalamKuota(akun, pengguna.id, paket.batas.maksPengguna)) {
      return { galat: { _: PESAN_KUOTA_AKUN } };
    }
  }

  await db.pengguna.update({
    where: { id: pengguna.id },
    data: { masukTerakhir: new Date() },
  });

  const token = await buatToken({
    uid: pengguna.id,
    tid: pengguna.tokoId,
    peran: pengguna.peran,
    nama: pengguna.nama,
    toko: pengguna.toko.nama,
  });

  (await cookies()).set(NAMA_COOKIE, token, opsiCookie);

  const lanjut = String(data.get("lanjut") || "");
  redirect(lanjut.startsWith("/app") ? lanjut : "/app");
}

export async function keluarAksi() {
  (await cookies()).delete(NAMA_COOKIE);
  redirect("/masuk");
}
