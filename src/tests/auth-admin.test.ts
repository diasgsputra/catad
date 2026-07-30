import { beforeAll, describe, expect, it } from "vitest";
import { SignJWT } from "jose";

/**
 * Pemisahan sesi operator dari sesi toko.
 *
 * Ini pengujian paling penting di seluruh berkas uji: kalau token toko bisa
 * diterima sebagai token operator, siapa pun yang punya akun kasir bisa membuka
 * panel yang menampilkan dan mengubah SEMUA toko. Karena itu pemisahannya
 * diperiksa dari kedua arah, bukan hanya satu.
 *
 * JWT_SECRET disetel sebelum modulnya diimpor — kedua modul auth membaca
 * variabel itu saat menandatangani.
 */
const RAHASIA = "rahasia-uji-panjang-sekali-untuk-hs256";

let buatToken: typeof import("@/lib/auth").buatToken;
let bacaToken: typeof import("@/lib/auth").bacaToken;
let NAMA_COOKIE: string;
let opsiCookie: typeof import("@/lib/auth").opsiCookie;

let buatTokenOperator: typeof import("@/lib/auth-admin").buatTokenOperator;
let bacaTokenOperator: typeof import("@/lib/auth-admin").bacaTokenOperator;
let NAMA_COOKIE_OPERATOR: string;
let opsiCookieOperator: typeof import("@/lib/auth-admin").opsiCookieOperator;

beforeAll(async () => {
  process.env.JWT_SECRET = RAHASIA;

  const toko = await import("@/lib/auth");
  buatToken = toko.buatToken;
  bacaToken = toko.bacaToken;
  NAMA_COOKIE = toko.NAMA_COOKIE;
  opsiCookie = toko.opsiCookie;

  const admin = await import("@/lib/auth-admin");
  buatTokenOperator = admin.buatTokenOperator;
  bacaTokenOperator = admin.bacaTokenOperator;
  NAMA_COOKIE_OPERATOR = admin.NAMA_COOKIE_OPERATOR;
  opsiCookieOperator = admin.opsiCookieOperator;
});

const SESI_TOKO = {
  uid: "pengguna-1",
  tid: "toko-1",
  peran: "PEMILIK" as const,
  nama: "Sari",
  toko: "Warung Bu Sari",
};

const SESI_OPERATOR = {
  oid: "operator-1",
  nama: "Dias",
  email: "operator@catad.id",
};

describe("token operator", () => {
  it("bisa dibuat dan dibaca kembali", async () => {
    const token = await buatTokenOperator(SESI_OPERATOR);
    const isi = await bacaTokenOperator(token);

    expect(isi).not.toBeNull();
    expect(isi?.oid).toBe("operator-1");
    expect(isi?.email).toBe("operator@catad.id");
  });

  it("menolak token kosong atau sampah", async () => {
    expect(await bacaTokenOperator(undefined)).toBeNull();
    expect(await bacaTokenOperator("")).toBeNull();
    expect(await bacaTokenOperator("bukan.token.jwt")).toBeNull();
  });

  it("menolak tanda tangan yang diubah", async () => {
    const token = await buatTokenOperator(SESI_OPERATOR);
    const rusak = `${token.slice(0, -3)}xyz`;
    expect(await bacaTokenOperator(rusak)).toBeNull();
  });
});

describe("pemisahan sesi toko dan sesi operator", () => {
  it("token toko TIDAK diterima sebagai token operator", async () => {
    const tokenToko = await buatToken(SESI_TOKO);
    expect(await bacaTokenOperator(tokenToko)).toBeNull();
  });

  it("token operator TIDAK diterima sebagai token toko", async () => {
    const tokenOperator = await buatTokenOperator(SESI_OPERATOR);
    expect(await bacaToken(tokenOperator)).toBeNull();
  });

  it("token dengan penerbit toko ditolak walau muatannya berbentuk operator", async () => {
    // Meniru kekeliruan penulisan kode: muatan operator, tetapi ditandatangani
    // memakai penerbit dan kunci milik sesi toko.
    const kunciToko = new TextEncoder().encode(RAHASIA);
    const token = await new SignJWT({ ...SESI_OPERATOR })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("catad")
      .setExpirationTime("1h")
      .sign(kunciToko);

    expect(await bacaTokenOperator(token)).toBeNull();
  });

  it("token yang membawa klaim tenant ditolak meski penerbitnya benar", async () => {
    // Lapis terakhir: seandainya suatu saat ada kode yang keliru menyisipkan
    // tid/uid ke dalam token operator, bentuknya sendiri sudah ditolak.
    const admin = await import("@/lib/auth-admin");
    const token = await admin.buatTokenOperator({
      ...SESI_OPERATOR,
      // Sengaja diselundupkan lewat tipe untuk meniru kekeliruan tersebut.
      ...({ tid: "toko-1", uid: "pengguna-1" } as unknown as Record<string, never>),
    });

    expect(await bacaTokenOperator(token)).toBeNull();
  });

  it("nama cookienya berbeda supaya tidak saling menimpa", () => {
    expect(NAMA_COOKIE_OPERATOR).not.toBe(NAMA_COOKIE);
  });
});

describe("opsi cookie operator", () => {
  it("httpOnly, supaya tidak terbaca skrip di halaman", () => {
    expect(opsiCookieOperator.httpOnly).toBe(true);
  });

  it("sameSite strict, lebih ketat daripada cookie toko", () => {
    // Tidak ada alur yang perlu membawa sesi operator dari situs lain,
    // sedangkan setiap tindakannya mengubah keadaan pelanggan.
    expect(opsiCookieOperator.sameSite).toBe("strict");
    expect(opsiCookie.sameSite).toBe("lax");
  });

  it("umurnya jauh lebih pendek daripada sesi toko", () => {
    // Satu sesi operator yang bocor membuka semua toko sekaligus.
    expect(opsiCookieOperator.maxAge).toBeLessThan(opsiCookie.maxAge);
    expect(opsiCookieOperator.maxAge).toBeLessThanOrEqual(12 * 60 * 60);
  });
});
