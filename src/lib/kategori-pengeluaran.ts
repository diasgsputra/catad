/**
 * Kategori pengeluaran bawaan.
 *
 * Sengaja diletakkan di sini, bukan di dalam berkas `"use server"`: seluruh
 * ekspor dari modul server action harus berupa fungsi async. Sebuah konstanta
 * biasa akan diubah menjadi referensi aksi saat build, sehingga di sisi
 * pemakai nilainya bukan lagi array.
 *
 * Kulakan barang tetap disediakan sebagai pilihan, tetapi perlu diingat modal
 * barang sudah terhitung lewat harga modal pada tiap penjualan.
 */
export const KATEGORI_PENGELUARAN = [
  "Sewa tempat",
  "Gaji & upah",
  "Listrik & air",
  "Internet & telepon",
  "Transport",
  "Kemasan",
  "Perbaikan",
  "Pajak & retribusi",
  "Kulakan / stok",
  "Lainnya",
] as const;
