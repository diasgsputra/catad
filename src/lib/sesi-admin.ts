import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NAMA_COOKIE_OPERATOR, bacaTokenOperator, type IsiSesiOperator } from "./auth-admin";
import { db } from "./db";

export type OperatorAktif = {
  id: string;
  nama: string;
  email: string;
};

/** Sesi operator dari cookie, tanpa menyentuh basis data. Null bila belum masuk. */
export async function sesiOperator(): Promise<IsiSesiOperator | null> {
  const jar = await cookies();
  return bacaTokenOperator(jar.get(NAMA_COOKIE_OPERATOR)?.value);
}

/**
 * Penjaga setiap halaman dan aksi di panel operator.
 *
 * Token yang sah belum cukup: akunnya diperiksa ulang ke basis data setiap kali,
 * supaya operator yang dinonaktifkan atau dihapus langsung kehilangan akses
 * tanpa harus menunggu tokennya kedaluwarsa. Untuk panel yang bisa melihat
 * seluruh toko, menunggu 8 jam terlalu lama.
 */
export async function wajibOperator(): Promise<OperatorAktif> {
  const s = await sesiOperator();
  if (!s) redirect("/admin/masuk");

  const operator = await db.operator.findFirst({
    where: { id: s.oid, aktif: true },
    select: { id: true, nama: true, email: true },
  });

  if (!operator) redirect("/admin/keluar");

  return operator;
}

// ── Jejak audit ─────────────────────────────────────────────────────────────

/**
 * Tindakan operator yang dicatat.
 *
 * Daftar tertutup supaya jejaknya bisa disaring dan dibaca, bukan kumpulan
 * teks bebas yang lama-lama tidak konsisten.
 */
export const AKSI = {
  masuk: "MASUK",
  konfirmasiBayar: "KONFIRMASI_BAYAR",
  tolakPengajuan: "TOLAK_PENGAJUAN",
  perpanjang: "PERPANJANG",
  hentikanPro: "HENTIKAN_PRO",
  blokir: "BLOKIR_TOKO",
  bukaBlokir: "BUKA_BLOKIR_TOKO",
  ubahPengaturan: "UBAH_PENGATURAN",
} as const;

export type NamaAksi = (typeof AKSI)[keyof typeof AKSI];

export const LABEL_AKSI: Record<string, string> = {
  MASUK: "Masuk panel",
  KONFIRMASI_BAYAR: "Konfirmasi pembayaran",
  TOLAK_PENGAJUAN: "Tolak pengajuan",
  PERPANJANG: "Perpanjang langganan",
  HENTIKAN_PRO: "Hentikan langganan",
  BLOKIR_TOKO: "Blokir toko",
  BUKA_BLOKIR_TOKO: "Buka blokir toko",
  UBAH_PENGATURAN: "Ubah pengaturan layanan",
};

/**
 * Mencatat satu tindakan operator.
 *
 * Nama operator dan nama toko disalin ke dalam barisnya, tidak hanya dirujuk.
 * Catatan audit harus tetap terbaca setelah akun operatornya dihapus atau toko
 * pelanggannya hilang — kalau hanya menyimpan id, jejaknya jadi tidak berarti
 * justru pada saat paling dibutuhkan.
 */
export async function catatJejak({
  operator,
  aksi,
  tokoId,
  tokoNama,
  rincian,
}: {
  operator: OperatorAktif;
  aksi: NamaAksi;
  tokoId?: string;
  tokoNama?: string;
  rincian?: string;
}): Promise<void> {
  await db.jejakOperator.create({
    data: {
      operatorId: operator.id,
      operatorNama: `${operator.nama} (${operator.email})`,
      aksi,
      tokoId: tokoId ?? null,
      tokoNama: tokoNama ?? null,
      rincian: rincian ?? null,
    },
  });
}
