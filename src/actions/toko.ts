"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { konteks } from "@/lib/sesi";
import { NAMA_COOKIE, buatToken, opsiCookie } from "@/lib/auth";
import {
  skemaGantiSandi,
  skemaPengaturanToko,
  skemaPengguna,
  galatForm,
} from "@/lib/validasi";
import { tambahHari } from "@/lib/format";
import { HARGA_PRO_BULANAN, HARGA_PRO_TAHUNAN, pesanBatas } from "@/lib/plan";
import type { HasilAksi } from "./produk";

// ── Pengaturan toko ─────────────────────────────────────────────────────────

export async function simpanPengaturanToko(
  _sebelum: HasilAksi,
  data: FormData,
): Promise<HasilAksi> {
  const k = await konteks();
  if (k.sesi.peran !== "PEMILIK") {
    return { galat: { _: "Hanya pemilik yang bisa mengubah pengaturan toko." } };
  }

  const hasil = skemaPengaturanToko.safeParse({
    nama: data.get("nama"),
    jenisUsaha: data.get("jenisUsaha") || undefined,
    alamat: data.get("alamat") || undefined,
    telepon: data.get("telepon") || undefined,
    waToko: data.get("waToko") || undefined,
    catatanNota: data.get("catatanNota") || undefined,
    persenPajak: data.get("persenPajak") || 0,
  });

  if (!hasil.success) return { galat: galatForm(hasil.error) };
  const d = hasil.data;

  await db.toko.update({
    where: { id: k.toko.id },
    data: {
      nama: d.nama,
      jenisUsaha: d.jenisUsaha || k.toko.jenisUsaha,
      alamat: d.alamat || null,
      telepon: d.telepon || null,
      waToko: d.waToko || null,
      catatanNota: d.catatanNota || null,
      persenPajak: d.persenPajak,
    },
  });

  // Nama toko ikut di token sesi, jadi token disegarkan agar sidebar berubah.
  if (d.nama !== k.toko.nama) {
    const token = await buatToken({
      uid: k.sesi.uid,
      tid: k.toko.id,
      peran: k.sesi.peran,
      nama: k.sesi.nama,
      toko: d.nama,
    });
    (await cookies()).set(NAMA_COOKIE, token, opsiCookie);
  }

  revalidatePath("/app/pengaturan");
  revalidatePath("/app");

  return { sukses: true, pesan: "Pengaturan toko disimpan." };
}

export async function gantiSandi(_sebelum: HasilAksi, data: FormData): Promise<HasilAksi> {
  const k = await konteks();

  const hasil = skemaGantiSandi.safeParse({
    sandiLama: data.get("sandiLama"),
    sandiBaru: data.get("sandiBaru"),
    ulangiSandi: data.get("ulangiSandi"),
  });
  if (!hasil.success) return { galat: galatForm(hasil.error) };

  const pengguna = await db.pengguna.findFirst({
    where: { id: k.sesi.uid, tokoId: k.toko.id },
    select: { id: true, kataSandiHash: true },
  });
  if (!pengguna) return { galat: { _: "Akun tidak ditemukan." } };

  const cocok = await bcrypt.compare(hasil.data.sandiLama, pengguna.kataSandiHash);
  if (!cocok) return { galat: { sandiLama: "Kata sandi lama salah." } };

  await db.pengguna.update({
    where: { id: pengguna.id },
    data: { kataSandiHash: await bcrypt.hash(hasil.data.sandiBaru, 10) },
  });

  return { sukses: true, pesan: "Kata sandi berhasil diganti." };
}

// ── Akun kasir ──────────────────────────────────────────────────────────────

export async function tambahPengguna(_sebelum: HasilAksi, data: FormData): Promise<HasilAksi> {
  const k = await konteks();
  if (k.sesi.peran !== "PEMILIK") {
    return { galat: { _: "Hanya pemilik yang bisa menambah akun." } };
  }

  const hasil = skemaPengguna.safeParse({
    nama: data.get("nama"),
    email: data.get("email"),
    kataSandi: data.get("kataSandi"),
    peran: data.get("peran") || "KASIR",
  });
  if (!hasil.success) return { galat: galatForm(hasil.error) };
  const d = hasil.data;

  const jumlah = await db.pengguna.count({ where: { tokoId: k.toko.id } });
  if (jumlah >= k.paket.batas.maksPengguna) {
    return { galat: { _: pesanBatas("pengguna", k.paket.batas) } };
  }

  try {
    await db.pengguna.create({
      data: {
        tokoId: k.toko.id,
        nama: d.nama,
        email: d.email,
        kataSandiHash: await bcrypt.hash(d.kataSandi, 10),
        peran: d.peran,
      },
    });
  } catch (galat) {
    if (galat instanceof Prisma.PrismaClientKnownRequestError && galat.code === "P2002") {
      return { galat: { email: "Email ini sudah dipakai akun lain." } };
    }
    return { galat: { _: "Gagal menambah akun." } };
  }

  revalidatePath("/app/pengguna");
  return { sukses: true, pesan: `Akun untuk ${d.nama} dibuat.` };
}

export async function ubahAktifPengguna(id: string, aktif: boolean): Promise<HasilAksi> {
  const k = await konteks();
  if (k.sesi.peran !== "PEMILIK") return { pesan: "Hanya pemilik yang bisa mengubah akun." };
  if (id === k.sesi.uid) return { pesan: "Akun sendiri tidak dapat dinonaktifkan." };

  const hasil = await db.pengguna.updateMany({
    where: { id, tokoId: k.toko.id },
    data: { aktif },
  });
  if (hasil.count === 0) return { pesan: "Akun tidak ditemukan." };

  revalidatePath("/app/pengguna");
  return { sukses: true, pesan: aktif ? "Akun diaktifkan." : "Akun dinonaktifkan." };
}

export async function hapusPengguna(id: string): Promise<HasilAksi> {
  const k = await konteks();
  if (k.sesi.peran !== "PEMILIK") return { pesan: "Hanya pemilik yang bisa menghapus akun." };
  if (id === k.sesi.uid) return { pesan: "Akun sendiri tidak dapat dihapus." };

  const target = await db.pengguna.findFirst({
    where: { id, tokoId: k.toko.id },
    select: { id: true, nama: true, peran: true },
  });
  if (!target) return { pesan: "Akun tidak ditemukan." };

  // Sisakan minimal satu pemilik.
  if (target.peran === "PEMILIK") {
    const jumlahPemilik = await db.pengguna.count({
      where: { tokoId: k.toko.id, peran: "PEMILIK" },
    });
    if (jumlahPemilik <= 1) {
      return { pesan: "Toko harus punya minimal satu pemilik." };
    }
  }

  // Transaksi yang pernah dibuat tetap ada (relasi di-set null oleh skema).
  await db.pengguna.delete({ where: { id: target.id } });

  revalidatePath("/app/pengguna");
  return { sukses: true, pesan: `Akun ${target.nama} dihapus.` };
}

// ── Langganan ───────────────────────────────────────────────────────────────

/**
 * Mengaktifkan paket Pro.
 *
 * Pembayaran masih disimulasikan: belum ada integrasi payment gateway, jadi
 * langganan langsung aktif dan tercatat di tabel Langganan sebagai "SIMULASI".
 */
export async function aktifkanPro(siklus: "BULANAN" | "TAHUNAN"): Promise<HasilAksi> {
  const k = await konteks();
  if (k.sesi.peran !== "PEMILIK") {
    return { pesan: "Hanya pemilik yang bisa mengatur langganan." };
  }

  const sekarang = new Date();
  const hari = siklus === "TAHUNAN" ? 365 : 30;
  const jumlah = siklus === "TAHUNAN" ? HARGA_PRO_TAHUNAN : HARGA_PRO_BULANAN;

  // Bila masih aktif, perpanjang dari tanggal berakhir yang sudah ada.
  const mulai =
    k.toko.proSampai && k.toko.proSampai > sekarang ? k.toko.proSampai : sekarang;
  const sampai = tambahHari(mulai, hari);

  await db.$transaction([
    db.toko.update({
      where: { id: k.toko.id },
      data: { paket: "PRO", proSampai: sampai },
    }),
    db.langganan.create({
      data: {
        tokoId: k.toko.id,
        paket: "PRO",
        jumlah,
        periodeMulai: mulai,
        periodeSelesai: sampai,
        status: "AKTIF",
        metode: "SIMULASI",
      },
    }),
  ]);

  revalidatePath("/app/pengaturan/langganan");
  revalidatePath("/app");
  revalidatePath("/app/insight");
  revalidatePath("/app/laporan");

  return {
    sukses: true,
    pesan: `Paket Pro aktif sampai ${sampai.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.`,
  };
}

export async function hentikanPro(): Promise<HasilAksi> {
  const k = await konteks();
  if (k.sesi.peran !== "PEMILIK") {
    return { pesan: "Hanya pemilik yang bisa mengatur langganan." };
  }

  await db.$transaction([
    db.toko.update({
      where: { id: k.toko.id },
      data: { paket: "GRATIS", proSampai: null },
    }),
    db.langganan.updateMany({
      where: { tokoId: k.toko.id, status: "AKTIF" },
      data: { status: "DIBATALKAN" },
    }),
  ]);

  revalidatePath("/app/pengaturan/langganan");
  revalidatePath("/app");
  revalidatePath("/app/insight");

  return { sukses: true, pesan: "Langganan dihentikan. Akun kembali ke paket Gratis." };
}
