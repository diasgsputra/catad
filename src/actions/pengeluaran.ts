"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { konteks } from "@/lib/sesi";
import { skemaPengeluaran, galatForm } from "@/lib/validasi";
import { dariInputTanggal } from "@/lib/format";
import type { HasilAksi } from "./produk";

export async function simpanPengeluaran(_sebelum: HasilAksi, data: FormData): Promise<HasilAksi> {
  const k = await konteks();

  const hasil = skemaPengeluaran.safeParse({
    kategori: data.get("kategori"),
    jumlah: data.get("jumlah"),
    keterangan: data.get("keterangan") || undefined,
    tanggal: data.get("tanggal"),
  });

  if (!hasil.success) return { galat: galatForm(hasil.error) };
  const d = hasil.data;

  await db.pengeluaran.create({
    data: {
      tokoId: k.toko.id,
      penggunaId: k.sesi.uid,
      kategori: d.kategori,
      jumlah: d.jumlah,
      keterangan: d.keterangan || null,
      tanggal: dariInputTanggal(d.tanggal),
    },
  });

  revalidatePath("/app/pengeluaran");
  revalidatePath("/app/laporan");
  revalidatePath("/app");
  revalidatePath("/app/insight");

  return { sukses: true, pesan: "Pengeluaran dicatat." };
}

export async function hapusPengeluaran(id: string): Promise<HasilAksi> {
  const k = await konteks();

  const hasil = await db.pengeluaran.deleteMany({ where: { id, tokoId: k.toko.id } });
  if (hasil.count === 0) return { pesan: "Catatan tidak ditemukan." };

  revalidatePath("/app/pengeluaran");
  revalidatePath("/app/laporan");
  revalidatePath("/app");

  return { sukses: true, pesan: "Pengeluaran dihapus." };
}
