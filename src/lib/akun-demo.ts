/**
 * Identitas akun demo.
 *
 * Diletakkan di modul netral, bukan di dalam komponen ber-"use client".
 * Ketika komponen server mengimpor dari modul klien, Next mengganti seluruh
 * ekspornya dengan rujukan klien — konstanta biasa pun ikut berubah dan tidak
 * lagi bernilai string di sisi server. Sama persis dengan larangan mengekspor
 * nilai dari berkas "use server".
 */
export const EMAIL_DEMO = "demo@catad.id";
export const SANDI_DEMO = "catad123";
