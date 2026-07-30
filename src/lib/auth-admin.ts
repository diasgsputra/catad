import { SignJWT, jwtVerify } from "jose";

/**
 * Sesi operator layanan.
 *
 * Sengaja dipisah total dari sesi toko (`src/lib/auth.ts`). Panel operator bisa
 * melihat seluruh toko, jadi token toko yang sah TIDAK BOLEH pernah diterima di
 * sini, dan sebaliknya. Ada tiga lapis pemisah:
 *
 *   1. Nama cookie berbeda, jadi keduanya bisa hidup berdampingan tanpa saling
 *      menimpa — dan cookie yang satu tidak akan terbaca sebagai yang lain.
 *   2. Klaim `iss` dan `aud` berbeda. Keduanya ikut ditandatangani, jadi tidak
 *      bisa diubah tanpa rahasia. `jwtVerify` menolak token yang tidak cocok.
 *   3. Kuncinya diturunkan dari JWT_SECRET dengan pemisah domain, sehingga
 *      tanda tangan token operator dan token toko tidak pernah sama walaupun
 *      isinya kebetulan identik.
 *
 * Lapis ketiga sebenarnya berlebihan bila lapis kedua dipasang benar — dan itu
 * memang maksudnya. Kalau suatu saat ada kode yang keliru memakai penanda
 * tangan yang salah, lapis ini tetap menolaknya.
 */

export const NAMA_COOKIE_OPERATOR = "catad_operator";

/**
 * Umur sesi operator: 8 jam, bukan 30 hari seperti sesi toko.
 *
 * Satu sesi operator yang bocor membuka semua toko sekaligus, jadi jendela
 * penyalahgunaan kalau perangkatnya ditinggal terbuka harus pendek.
 */
const UMUR_SESI_DETIK = 60 * 60 * 8;

const PENERBIT = "catad-operator";
const PENERIMA = "panel-operator";

export type IsiSesiOperator = {
  /** id Operator. Dinamai berbeda dari `uid` milik sesi toko. */
  oid: string;
  nama: string;
  email: string;
};

let kunciTersimpan: Uint8Array | null = null;

/**
 * Kunci tanda tangan token operator, diturunkan dari JWT_SECRET.
 *
 * Memakai Web Crypto (bukan node:crypto) supaya jalan di runtime Edge tempat
 * middleware dijalankan maupun di Node.
 */
async function kunci(): Promise<Uint8Array> {
  if (kunciTersimpan) return kunciTersimpan;

  const rahasia = process.env.JWT_SECRET;
  if (!rahasia || rahasia.length < 16) {
    throw new Error("JWT_SECRET belum diatur atau terlalu pendek (minimal 16 karakter).");
  }

  const bahan = new TextEncoder().encode(`catad:operator:v1:${rahasia}`);
  const cerna = await crypto.subtle.digest("SHA-256", bahan);
  kunciTersimpan = new Uint8Array(cerna);
  return kunciTersimpan;
}

export async function buatTokenOperator(isi: IsiSesiOperator): Promise<string> {
  return new SignJWT({ ...isi })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(PENERBIT)
    .setAudience(PENERIMA)
    .setExpirationTime(`${UMUR_SESI_DETIK}s`)
    .sign(await kunci());
}

/** Memverifikasi token operator. Null bila tidak sah, kedaluwarsa, atau bukan token operator. */
export async function bacaTokenOperator(
  token: string | undefined,
): Promise<IsiSesiOperator | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, await kunci(), {
      issuer: PENERBIT,
      audience: PENERIMA,
    });

    // Bentuk muatan juga diperiksa. Sesi toko memakai `uid`/`tid`; kalau salah
    // satu dari itu muncul di sini, jelas tokennya bukan untuk panel operator.
    if (typeof payload.oid !== "string" || !payload.oid) return null;
    if ("tid" in payload || "uid" in payload) return null;

    return {
      oid: payload.oid,
      nama: typeof payload.nama === "string" ? payload.nama : "",
      email: typeof payload.email === "string" ? payload.email : "",
    };
  } catch {
    return null;
  }
}

export const opsiCookieOperator = {
  httpOnly: true,
  /**
   * `strict`, bukan `lax` seperti cookie toko.
   *
   * Tidak ada alur yang perlu membawa sesi operator dari situs lain, sedangkan
   * setiap tindakan di panel ini mengubah keadaan pelanggan. `strict` menutup
   * permintaan lintas situs yang membawa cookie ini.
   */
  sameSite: "strict" as const,
  path: "/",
  maxAge: UMUR_SESI_DETIK,
  secure: process.env.COOKIE_SECURE === "true",
};

/** Batas percobaan masuk sebelum akun operator dikunci sementara. */
export const BATAS_GAGAL_MASUK = 5;

/** Lama kunci sementara setelah batas percobaan terlampaui. */
export const MENIT_TERKUNCI = 15;
