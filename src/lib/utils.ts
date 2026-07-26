/** Gabungkan className secara kondisional. */
export function cn(...bagian: Array<string | false | null | undefined>): string {
  return bagian.filter(Boolean).join(" ");
}

// Tanda diakritik gabungan (U+0300–U+036F) — dibuat lewat RegExp agar berkas
// sumber tetap ASCII murni.
const DIAKRITIK = new RegExp("[\\u0300-\\u036f]", "g");

/** "Warung Bu Sari" -> "warung-bu-sari" */
export function slug(teks: string): string {
  return (
    teks
      .toLowerCase()
      .normalize("NFD")
      .replace(DIAKRITIK, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "toko"
  );
}

const ABJAD_KODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa I, O, 0, 1 agar tidak ambigu

/** Kode nota publik singkat, mis. "K7F2QM9X". */
export function kodeAcak(panjang = 8): string {
  const bytes = new Uint8Array(panjang);
  crypto.getRandomValues(bytes);
  let hasil = "";
  for (const b of bytes) hasil += ABJAD_KODE[b % ABJAD_KODE.length];
  return hasil;
}

/** Nomor nota berurutan per hari: TRX-20260725-0007 */
export function nomorNota(kunciTanggal: string, urutan: number): string {
  return `TRX-${kunciTanggal.replace(/-/g, "")}-${String(urutan).padStart(4, "0")}`;
}

/** Inisial untuk avatar, maksimal 2 huruf. */
export function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/).filter(Boolean);
  if (kata.length === 0) return "?";
  if (kata.length === 1) return kata[0].slice(0, 2).toUpperCase();
  return (kata[0][0] + kata[kata.length - 1][0]).toUpperCase();
}

/** Batasi nilai ke rentang tertentu. */
export function batasi(nilai: number, min: number, maks: number): number {
  return Math.min(maks, Math.max(min, nilai));
}

/** Bilangan bulat aman dari input pengguna. */
export function keBulat(nilai: unknown, bawaan = 0): number {
  const n =
    typeof nilai === "number"
      ? Math.trunc(nilai)
      : parseInt(String(nilai ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : bawaan;
}
