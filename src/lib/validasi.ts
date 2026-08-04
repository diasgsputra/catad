import { z } from "zod";

/** Pesan galat dalam Bahasa Indonesia agar konsisten dengan seluruh antarmuka. */

const emailSkema = z
  .string()
  .trim()
  .min(1, "Email wajib diisi")
  .email("Format email tidak valid")
  .toLowerCase();

const sandiSkema = z.string().min(6, "Kata sandi minimal 6 karakter").max(72, "Kata sandi terlalu panjang");

export const skemaDaftar = z.object({
  namaToko: z.string().trim().min(2, "Nama toko minimal 2 karakter").max(60, "Nama toko terlalu panjang"),
  jenisUsaha: z.string().trim().max(60).optional(),
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(60, "Nama terlalu panjang"),
  email: emailSkema,
  kataSandi: sandiSkema,
});

export const skemaMasuk = z.object({
  email: emailSkema,
  kataSandi: z.string().min(1, "Kata sandi wajib diisi"),
});

/**
 * Tujuan pembayaran langganan yang diatur operator.
 *
 * Nomor rekening dan WhatsApp hanya boleh berisi angka dan pemisah yang biasa
 * dipakai orang (spasi, tanda hubung, plus, tanda kurung). Kalau teks bebas
 * diizinkan, nomor yang salah tulis baru terlihat setelah ada pelanggan yang
 * gagal transfer.
 */
const nomorSkema = /^[0-9+\-\s()]+$/;

export const skemaTujuanPembayaran = z.object({
  bankNama: z.string().trim().min(2, "Nama bank wajib diisi").max(30),
  bankRekening: z
    .string()
    .trim()
    .min(6, "Nomor rekening terlalu pendek")
    .max(30)
    .regex(nomorSkema, "Nomor rekening hanya boleh berisi angka dan pemisah"),
  bankPemilik: z.string().trim().max(60).optional(),
  waNomor: z
    .string()
    .trim()
    .min(8, "Nomor WhatsApp terlalu pendek")
    .max(24)
    .regex(nomorSkema, "Nomor WhatsApp hanya boleh berisi angka dan pemisah"),
  catatanPembayaran: z.string().trim().max(200).optional(),
});

export const skemaAlasanBlokir = z.object({
  alasan: z
    .string()
    .trim()
    .min(4, "Tulis alasan blokirnya, minimal 4 karakter")
    .max(200, "Alasan terlalu panjang"),
});

export const skemaProduk = z.object({
  id: z.string().optional(),
  nama: z.string().trim().min(1, "Nama barang wajib diisi").max(80, "Nama terlalu panjang"),
  kode: z.string().trim().max(40).optional(),
  kategoriId: z.string().optional(),
  satuan: z.string().trim().min(1).max(12).default("pcs"),
  hargaJual: z.coerce.number().int("Harga harus bilangan bulat").min(0, "Harga tidak boleh negatif").max(1_000_000_000),
  hargaModal: z.coerce.number().int().min(0, "Harga modal tidak boleh negatif").max(1_000_000_000).default(0),
  stok: z.coerce.number().int().min(0, "Stok tidak boleh negatif").max(1_000_000).default(0),
  stokMinimum: z.coerce.number().int().min(0).max(100_000).default(5),
  lacakStok: z.coerce.boolean().default(true),
  aktif: z.coerce.boolean().default(true),
});

export const skemaKategori = z.object({
  nama: z.string().trim().min(1, "Nama kategori wajib diisi").max(40),
  warna: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Warna tidak valid").default("#12695A"),
});

export const skemaItemKeranjang = z.object({
  produkId: z.string().min(1),
  qty: z.coerce.number().int().min(1, "Jumlah minimal 1").max(10_000),
  /** Diskon per baris dalam rupiah. */
  diskon: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
});

export const skemaCheckout = z.object({
  item: z.array(skemaItemKeranjang).min(1, "Keranjang masih kosong"),
  diskon: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  metodeBayar: z.enum(["TUNAI", "QRIS", "TRANSFER", "KARTU"]).default("TUNAI"),
  dibayar: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
  catatan: z.string().trim().max(200).optional(),
  pelangganId: z.string().optional(),
  namaPelangganBaru: z.string().trim().max(60).optional(),
});

export const skemaPenyesuaianStok = z.object({
  produkId: z.string().min(1),
  tipe: z.enum(["MASUK", "KELUAR", "PENYESUAIAN"]),
  qty: z.coerce.number().int().min(1, "Jumlah minimal 1").max(1_000_000),
  catatan: z.string().trim().max(160).optional(),
});

export const skemaPengeluaran = z.object({
  kategori: z.string().trim().min(1, "Kategori wajib diisi").max(40),
  jumlah: z.coerce.number().int().min(1, "Jumlah minimal Rp1").max(1_000_000_000),
  keterangan: z.string().trim().max(160).optional(),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
});

export const skemaPengguna = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(60),
  email: emailSkema,
  kataSandi: sandiSkema,
  peran: z.enum(["PEMILIK", "KASIR"]).default("KASIR"),
});

export const skemaPengaturanToko = z.object({
  nama: z.string().trim().min(2, "Nama toko minimal 2 karakter").max(60),
  jenisUsaha: z.string().trim().max(60).optional(),
  alamat: z.string().trim().max(160).optional(),
  telepon: z.string().trim().max(24).optional(),
  waToko: z.string().trim().max(24).optional(),
  catatanNota: z.string().trim().max(120).optional(),
  persenPajak: z.coerce.number().int().min(0, "Pajak tidak boleh negatif").max(30, "Maksimal 30%").default(0),

  // ── Identitas pajak ──
  // Semuanya boleh kosong: toko yang belum punya NPWP tetap bisa memakai
  // laporan pajak untuk pembukuannya sendiri.
  npwp: z
    .string()
    .trim()
    .max(25)
    .regex(/^[0-9.\-\s]*$/, "NPWP hanya boleh berisi angka, titik, dan tanda hubung")
    .optional(),
  namaWajibPajak: z.string().trim().max(60).optional(),
  jenisWajibPajak: z.enum(["ORANG_PRIBADI", "BADAN"]).default("ORANG_PRIBADI"),

  // ── Dasar perhitungan pajak ──
  // Tarif dikirim sebagai persen agar mudah diisi orang, lalu disimpan sebagai
  // basis poin bilangan bulat. Batas atasnya longgar supaya tidak menghalangi
  // perubahan aturan, tetapi tetap menolak angka yang jelas keliru.
  rezimPajak: z
    .enum(["FINAL_UMKM", "NPPN", "PEMBUKUAN_OP", "PEMBUKUAN_BADAN", "TANPA_HITUNG"])
    .default("FINAL_UMKM"),
  tarifFinalPersen: z.coerce
    .number()
    .min(0, "Tarif tidak boleh negatif")
    .max(50, "Tarif terlalu besar")
    .default(0.5),
  fasilitasBebas: z.coerce
    .number()
    .int("Isi angka bulat tanpa titik")
    .min(0, "Tidak boleh negatif")
    .max(2_000_000_000, "Terlalu besar")
    .default(500_000_000),
  normaPersen: z.coerce
    .number()
    .min(0, "Tidak boleh negatif")
    .max(100, "Norma tidak mungkin lebih dari 100%")
    .default(25),
  ptkpSetahun: z.coerce
    .number()
    .int("Isi angka bulat tanpa titik")
    .min(0, "Tidak boleh negatif")
    .max(1_000_000_000, "Terlalu besar")
    .default(54_000_000),
  tarifBadanPersen: z.coerce
    .number()
    .min(0, "Tidak boleh negatif")
    .max(50, "Tarif terlalu besar")
    .default(22),
  pakai31E: z.coerce.boolean().default(false),
});

export const skemaGantiSandi = z
  .object({
    sandiLama: z.string().min(1, "Kata sandi lama wajib diisi"),
    sandiBaru: sandiSkema,
    ulangiSandi: z.string().min(1, "Ulangi kata sandi baru"),
  })
  .refine((d) => d.sandiBaru === d.ulangiSandi, {
    message: "Kata sandi baru tidak sama",
    path: ["ulangiSandi"],
  });

/** Mengubah galat Zod menjadi peta { field: pesan } untuk ditampilkan di form. */
export function galatForm(hasil: z.ZodError): Record<string, string> {
  const peta: Record<string, string> = {};
  for (const isu of hasil.issues) {
    const kunci = String(isu.path[0] ?? "_");
    if (!peta[kunci]) peta[kunci] = isu.message;
  }
  return peta;
}
