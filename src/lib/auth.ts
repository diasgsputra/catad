import { SignJWT, jwtVerify } from "jose";

export const NAMA_COOKIE = "catad_sesi";
const UMUR_SESI_DETIK = 60 * 60 * 24 * 30; // 30 hari

export type IsiSesi = {
  /** id Pengguna */
  uid: string;
  /** id Toko — kunci isolasi antar tenant */
  tid: string;
  peran: "PEMILIK" | "KASIR";
  nama: string;
  toko: string;
};

function kunci(): Uint8Array {
  const rahasia = process.env.JWT_SECRET;
  if (!rahasia || rahasia.length < 16) {
    throw new Error("JWT_SECRET belum diatur atau terlalu pendek (minimal 16 karakter).");
  }
  return new TextEncoder().encode(rahasia);
}

export async function buatToken(isi: IsiSesi): Promise<string> {
  return new SignJWT({ ...isi })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("catad")
    .setExpirationTime(`${UMUR_SESI_DETIK}s`)
    .sign(kunci());
}

/** Memverifikasi token. Mengembalikan null bila tidak valid/kedaluwarsa. */
export async function bacaToken(token: string | undefined): Promise<IsiSesi | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, kunci(), { issuer: "catad" });
    if (
      typeof payload.uid !== "string" ||
      typeof payload.tid !== "string" ||
      (payload.peran !== "PEMILIK" && payload.peran !== "KASIR")
    ) {
      return null;
    }
    return {
      uid: payload.uid,
      tid: payload.tid,
      peran: payload.peran,
      nama: typeof payload.nama === "string" ? payload.nama : "",
      toko: typeof payload.toko === "string" ? payload.toko : "",
    };
  } catch {
    return null;
  }
}

export const opsiCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: UMUR_SESI_DETIK,
  secure: process.env.COOKIE_SECURE === "true",
};
