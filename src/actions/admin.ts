"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { tambahHari } from "@/lib/format";
import { hariPeriode } from "@/lib/keuangan-langganan";
import { simpanTujuanPembayaran } from "@/lib/pengaturan-layanan";
import { HARGA_PRO_BULANAN, HARGA_PRO_TAHUNAN } from "@/lib/plan";
import { AKSI, catatJejak, wajibOperator } from "@/lib/sesi-admin";
import { galatForm, skemaAlasanBlokir, skemaTujuanPembayaran } from "@/lib/validasi";

export type HasilAdmin = {
  sukses?: boolean;
  pesan?: string;
  galat?: Record<string, string>;
};

/** Halaman panel yang perlu disegarkan setelah keadaan toko berubah. */
function segarkanPanel(tokoId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/toko");
  revalidatePath("/admin/keuangan");
  revalidatePath("/admin/jejak");
  if (tokoId) revalidatePath(`/admin/toko/${tokoId}`);
}

const rupiahSingkat = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

const tanggalPesan = (t: Date) =>
  t.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

// ── Langganan ───────────────────────────────────────────────────────────────

/**
 * Menandai sebuah pengajuan sebagai sudah dibayar, lalu menyalakan Pro.
 *
 * Masa berlakunya dihitung ulang dari saat konfirmasi, bukan dari saat
 * pengajuan dibuat. Pelanggan yang mentransfer tiga hari setelah mengajukan
 * tidak boleh kehilangan tiga hari. Panjang periodenya sendiri diambil dari
 * baris pengajuan supaya paket tahunan tetap tahunan.
 */
export async function konfirmasiPembayaran(langgananId: string): Promise<HasilAdmin> {
  const operator = await wajibOperator();

  const pengajuan = await db.langganan.findUnique({
    where: { id: langgananId },
    select: {
      id: true,
      status: true,
      jumlah: true,
      periodeMulai: true,
      periodeSelesai: true,
      tokoId: true,
      toko: { select: { id: true, nama: true, proSampai: true } },
    },
  });

  if (!pengajuan) return { pesan: "Pengajuan tidak ditemukan." };

  // Penjaga terhadap penekanan ganda: baris yang sudah dikonfirmasi tidak boleh
  // dihitung dua kali, karena `dibayarPada` adalah dasar laporan pendapatan.
  if (pengajuan.status !== "MENUNGGU") {
    return { pesan: "Pengajuan ini sudah diproses sebelumnya." };
  }

  const sekarang = new Date();
  const hari = hariPeriode(pengajuan);
  const proSampai = pengajuan.toko.proSampai;
  const mulai = proSampai && proSampai > sekarang ? proSampai : sekarang;
  const sampai = tambahHari(mulai, hari);

  await db.$transaction([
    db.langganan.update({
      where: { id: pengajuan.id },
      data: {
        status: "AKTIF",
        dibayarPada: sekarang,
        periodeMulai: mulai,
        periodeSelesai: sampai,
      },
    }),
    db.toko.update({
      where: { id: pengajuan.tokoId },
      data: { paket: "PRO", proSampai: sampai },
    }),
  ]);

  await catatJejak({
    operator,
    aksi: AKSI.konfirmasiBayar,
    tokoId: pengajuan.tokoId,
    tokoNama: pengajuan.toko.nama,
    rincian: `${rupiahSingkat(pengajuan.jumlah)} untuk ${hari} hari, aktif sampai ${tanggalPesan(sampai)}`,
  });

  segarkanPanel(pengajuan.tokoId);
  return { sukses: true, pesan: `Pro aktif sampai ${tanggalPesan(sampai)}.` };
}

/** Membatalkan pengajuan yang pembayarannya tidak pernah masuk. */
export async function tolakPengajuan(langgananId: string): Promise<HasilAdmin> {
  const operator = await wajibOperator();

  const pengajuan = await db.langganan.findUnique({
    where: { id: langgananId },
    select: { id: true, status: true, tokoId: true, toko: { select: { nama: true } } },
  });

  if (!pengajuan) return { pesan: "Pengajuan tidak ditemukan." };
  if (pengajuan.status !== "MENUNGGU") {
    return { pesan: "Pengajuan ini sudah diproses sebelumnya." };
  }

  await db.langganan.update({
    where: { id: pengajuan.id },
    data: { status: "DIBATALKAN" },
  });

  await catatJejak({
    operator,
    aksi: AKSI.tolakPengajuan,
    tokoId: pengajuan.tokoId,
    tokoNama: pengajuan.toko.nama,
  });

  segarkanPanel(pengajuan.tokoId);
  return { sukses: true, pesan: "Pengajuan dibatalkan." };
}

/**
 * Menyalakan atau memperpanjang Pro tanpa melalui pengajuan.
 *
 * Dipakai untuk pelanggan yang langsung transfer tanpa menekan tombol di
 * aplikasi, dan untuk memberi masa tenggang. `dibayarPada` tetap diisi karena
 * uangnya memang diterima — kecuali jumlahnya nol, yang berarti pemberian
 * gratis dan tidak boleh masuk laporan pendapatan.
 */
export async function perpanjangManual(
  tokoId: string,
  siklus: "BULANAN" | "TAHUNAN" | "TENGGANG",
): Promise<HasilAdmin> {
  const operator = await wajibOperator();

  const toko = await db.toko.findUnique({
    where: { id: tokoId },
    select: { id: true, nama: true, proSampai: true },
  });
  if (!toko) return { pesan: "Toko tidak ditemukan." };

  const sekarang = new Date();
  const hari = siklus === "TAHUNAN" ? 365 : siklus === "BULANAN" ? 30 : 7;
  const jumlah =
    siklus === "TAHUNAN" ? HARGA_PRO_TAHUNAN : siklus === "BULANAN" ? HARGA_PRO_BULANAN : 0;

  const mulai = toko.proSampai && toko.proSampai > sekarang ? toko.proSampai : sekarang;
  const sampai = tambahHari(mulai, hari);

  await db.$transaction([
    db.toko.update({
      where: { id: toko.id },
      data: { paket: "PRO", proSampai: sampai },
    }),
    db.langganan.create({
      data: {
        tokoId: toko.id,
        paket: "PRO",
        jumlah,
        periodeMulai: mulai,
        periodeSelesai: sampai,
        status: "AKTIF",
        metode: siklus === "TENGGANG" ? "TENGGANG" : "TRANSFER_MANUAL",
        // Masa tenggang bukan pendapatan — tidak ada uang yang diterima.
        dibayarPada: jumlah > 0 ? sekarang : null,
      },
    }),
  ]);

  await catatJejak({
    operator,
    aksi: AKSI.perpanjang,
    tokoId: toko.id,
    tokoNama: toko.nama,
    rincian:
      siklus === "TENGGANG"
        ? `Masa tenggang ${hari} hari sampai ${tanggalPesan(sampai)}`
        : `${rupiahSingkat(jumlah)} untuk ${hari} hari sampai ${tanggalPesan(sampai)}`,
  });

  segarkanPanel(toko.id);
  return { sukses: true, pesan: `Pro aktif sampai ${tanggalPesan(sampai)}.` };
}

/** Mengembalikan toko ke paket Gratis. Riwayat pembayarannya tidak diubah. */
export async function hentikanProToko(tokoId: string): Promise<HasilAdmin> {
  const operator = await wajibOperator();

  const toko = await db.toko.findUnique({
    where: { id: tokoId },
    select: { id: true, nama: true },
  });
  if (!toko) return { pesan: "Toko tidak ditemukan." };

  await db.$transaction([
    db.toko.update({
      where: { id: toko.id },
      data: { paket: "GRATIS", proSampai: null },
    }),
    // Hanya status yang diubah. `dibayarPada` dibiarkan supaya uang yang sudah
    // diterima tetap tercatat di laporan pendapatan.
    db.langganan.updateMany({
      where: { tokoId: toko.id, status: "AKTIF" },
      data: { status: "DIBATALKAN" },
    }),
  ]);

  await catatJejak({ operator, aksi: AKSI.hentikanPro, tokoId: toko.id, tokoNama: toko.nama });

  segarkanPanel(toko.id);
  return { sukses: true, pesan: `${toko.nama} kembali ke paket Gratis.` };
}

// ── Blokir ──────────────────────────────────────────────────────────────────

export async function blokirToko(tokoId: string, alasan: string): Promise<HasilAdmin> {
  const operator = await wajibOperator();

  const hasil = skemaAlasanBlokir.safeParse({ alasan });
  if (!hasil.success) return { galat: galatForm(hasil.error) };

  const toko = await db.toko.findUnique({
    where: { id: tokoId },
    select: { id: true, nama: true, diblokir: true },
  });
  if (!toko) return { pesan: "Toko tidak ditemukan." };
  if (toko.diblokir) return { pesan: "Toko ini sudah diblokir." };

  await db.toko.update({
    where: { id: toko.id },
    data: { diblokir: true, alasanBlokir: hasil.data.alasan, diblokirPada: new Date() },
  });

  await catatJejak({
    operator,
    aksi: AKSI.blokir,
    tokoId: toko.id,
    tokoNama: toko.nama,
    rincian: hasil.data.alasan,
  });

  segarkanPanel(toko.id);
  return { sukses: true, pesan: `${toko.nama} diblokir. Datanya tetap tersimpan.` };
}

export async function bukaBlokirToko(tokoId: string): Promise<HasilAdmin> {
  const operator = await wajibOperator();

  const toko = await db.toko.findUnique({
    where: { id: tokoId },
    select: { id: true, nama: true, diblokir: true },
  });
  if (!toko) return { pesan: "Toko tidak ditemukan." };
  if (!toko.diblokir) return { pesan: "Toko ini tidak sedang diblokir." };

  await db.toko.update({
    where: { id: toko.id },
    data: { diblokir: false, alasanBlokir: null, diblokirPada: null },
  });

  await catatJejak({ operator, aksi: AKSI.bukaBlokir, tokoId: toko.id, tokoNama: toko.nama });

  segarkanPanel(toko.id);
  return { sukses: true, pesan: `Blokir ${toko.nama} dibuka.` };
}

// ── Pengaturan layanan ──────────────────────────────────────────────────────

export async function simpanPengaturan(
  _sebelum: HasilAdmin,
  data: FormData,
): Promise<HasilAdmin> {
  const operator = await wajibOperator();

  const hasil = skemaTujuanPembayaran.safeParse({
    bankNama: data.get("bankNama"),
    bankRekening: data.get("bankRekening"),
    bankPemilik: data.get("bankPemilik") || undefined,
    waNomor: data.get("waNomor"),
    catatanPembayaran: data.get("catatanPembayaran") || undefined,
  });
  if (!hasil.success) return { galat: galatForm(hasil.error) };

  const d = hasil.data;

  await simpanTujuanPembayaran({
    bankNama: d.bankNama,
    bankRekening: d.bankRekening,
    bankPemilik: d.bankPemilik ?? null,
    waNomor: d.waNomor,
    catatanPembayaran: d.catatanPembayaran ?? null,
  });

  await catatJejak({
    operator,
    aksi: AKSI.ubahPengaturan,
    rincian: `${d.bankNama} ${d.bankRekening} · WA ${d.waNomor}`,
  });

  revalidatePath("/admin/pengaturan");
  revalidatePath("/admin/jejak");
  // Halaman langganan pelanggan menampilkan nomor ini.
  revalidatePath("/app/pengaturan/langganan");

  return { sukses: true, pesan: "Pengaturan pembayaran disimpan." };
}
