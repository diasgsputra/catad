/**
 * Identitas akun demo.
 *
 * Modul ini sengaja ringan — tanpa Prisma, tanpa bcrypt — supaya aman diimpor
 * komponen klien maupun server. Pembuat datanya ada di `data-demo.ts`.
 *
 * Konstanta tidak boleh diekspor dari komponen ber-"use client" lalu dibaca
 * komponen server: Next mengganti seluruh ekspor modul klien dengan rujukan
 * klien, jadi nilainya bukan string lagi di sisi server.
 */

export const AKUN_DEMO = {
  pemilik: { nama: "Sari Wulandari", email: "demo@catad.id", sandi: "catad123" },
  kasir: { nama: "Andi Pratama", email: "andi@catad.id", sandi: "kasir123" },
  kedua: { nama: "Budi Santoso", email: "budi@tendabiru.id", sandi: "rahasia123" },
} as const;

export const EMAIL_DEMO = AKUN_DEMO.pemilik.email;
export const SANDI_DEMO = AKUN_DEMO.pemilik.sandi;
