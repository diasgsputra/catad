"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  BATAS_GAGAL_MASUK,
  MENIT_TERKUNCI,
  NAMA_COOKIE_OPERATOR,
  buatTokenOperator,
  opsiCookieOperator,
} from "@/lib/auth-admin";
import { AKSI, catatJejak } from "@/lib/sesi-admin";
import { skemaMasuk } from "@/lib/validasi";

export type HasilMasukOperator = { galat?: string };

/** Hash yang tidak mungkin cocok, dipakai agar waktu tanggapan tidak membocorkan email terdaftar. */
const HASH_UMPAN = "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";

const GAGAL_UMUM: HasilMasukOperator = { galat: "Email atau kata sandi salah." };

export async function masukOperator(
  _sebelum: HasilMasukOperator,
  data: FormData,
): Promise<HasilMasukOperator> {
  const hasil = skemaMasuk.safeParse({
    email: data.get("email"),
    kataSandi: data.get("kataSandi"),
  });
  if (!hasil.success) return { galat: "Email dan kata sandi wajib diisi." };

  const { email, kataSandi } = hasil.data;

  const operator = await db.operator.findUnique({
    where: { email },
    select: {
      id: true,
      nama: true,
      email: true,
      kataSandiHash: true,
      aktif: true,
      gagalMasuk: true,
      terkunciSampai: true,
    },
  });

  if (!operator) {
    // Tetap menghitung hash supaya lamanya tanggapan tidak membedakan email
    // yang terdaftar dan yang tidak.
    await bcrypt.compare(kataSandi, HASH_UMPAN);
    return GAGAL_UMUM;
  }

  const sekarang = new Date();

  // Terkunci sementara. Pesannya sengaja jujur: operator yang sedang panik
  // karena tidak bisa masuk perlu tahu bahwa masalahnya bukan kata sandi.
  // Konsekuensinya, orang yang tahu emailnya bisa membuat akun terkunci 15
  // menit — dapat diterima karena panel ini hanya dipakai beberapa orang dan
  // kuncinya berumur pendek.
  if (operator.terkunciSampai && operator.terkunciSampai > sekarang) {
    const sisaMenit = Math.max(
      1,
      Math.ceil((operator.terkunciSampai.getTime() - sekarang.getTime()) / 60_000),
    );
    return {
      galat: `Terlalu banyak percobaan gagal. Coba lagi dalam ${sisaMenit} menit.`,
    };
  }

  const cocok = await bcrypt.compare(kataSandi, operator.kataSandiHash);

  if (!cocok) {
    const gagalBaru = operator.gagalMasuk + 1;
    const perluDikunci = gagalBaru >= BATAS_GAGAL_MASUK;

    await db.operator.update({
      where: { id: operator.id },
      data: {
        gagalMasuk: perluDikunci ? 0 : gagalBaru,
        terkunciSampai: perluDikunci
          ? new Date(sekarang.getTime() + MENIT_TERKUNCI * 60_000)
          : null,
      },
    });

    if (perluDikunci) {
      return {
        galat: `Terlalu banyak percobaan gagal. Akun dikunci ${MENIT_TERKUNCI} menit.`,
      };
    }
    return GAGAL_UMUM;
  }

  // Akun nonaktif dijawab dengan pesan umum: dari luar, akun yang dimatikan
  // sebaiknya tidak bisa dibedakan dari akun yang tidak ada.
  if (!operator.aktif) return GAGAL_UMUM;

  await db.operator.update({
    where: { id: operator.id },
    data: { gagalMasuk: 0, terkunciSampai: null, masukTerakhir: sekarang },
  });

  const token = await buatTokenOperator({
    oid: operator.id,
    nama: operator.nama,
    email: operator.email,
  });

  (await cookies()).set(NAMA_COOKIE_OPERATOR, token, opsiCookieOperator);

  await catatJejak({
    operator: { id: operator.id, nama: operator.nama, email: operator.email },
    aksi: AKSI.masuk,
  });

  redirect("/admin");
}
