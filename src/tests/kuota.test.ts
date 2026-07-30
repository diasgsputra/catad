import { describe, expect, it } from "vitest";
import { PESAN_KUOTA_AKUN, akunDalamKuota, idDalamKuota } from "@/lib/kuota";
import { PAKET } from "@/lib/plan";

const hari = (n: number) => new Date(Date.UTC(2026, 6, n, 8, 0, 0));

const PEMILIK = { id: "p1", peran: "PEMILIK", dibuatPada: hari(1) };
const KASIR_LAMA = { id: "k1", peran: "KASIR", dibuatPada: hari(2) };
const KASIR_BARU = { id: "k2", peran: "KASIR", dibuatPada: hari(3) };
const SEMUA = [PEMILIK, KASIR_LAMA, KASIR_BARU];

describe("idDalamKuota", () => {
  it("meloloskan semua akun bila batasnya tak terhingga", () => {
    const hasil = idDalamKuota(SEMUA, Number.POSITIVE_INFINITY);
    expect(hasil.size).toBe(3);
  });

  it("paket gratis hanya menyisakan pemilik", () => {
    const hasil = idDalamKuota(SEMUA, PAKET.GRATIS.maksPengguna);

    expect([...hasil]).toEqual(["p1"]);
    expect(hasil.has("k1")).toBe(false);
    expect(hasil.has("k2")).toBe(false);
  });

  it("pemilik selalu lolos walau akunnya dibuat paling akhir", () => {
    // Jaminan penting: kalau pemilik ikut terkunci, tidak ada seorang pun yang
    // bisa berlangganan atau merapikan akun, dan tokonya mati total.
    const pemilikBaru = { id: "p9", peran: "PEMILIK", dibuatPada: hari(28) };
    const hasil = idDalamKuota([KASIR_LAMA, KASIR_BARU, pemilikBaru], 1);

    expect([...hasil]).toEqual(["p9"]);
  });

  it("kasir yang lebih lama dipakai menang atas yang baru ditambahkan", () => {
    const hasil = idDalamKuota(SEMUA, 2);

    expect(hasil.has("p1")).toBe(true);
    expect(hasil.has("k1")).toBe(true);
    expect(hasil.has("k2")).toBe(false);
  });

  it("hasilnya tetap sama untuk dua akun yang dibuat pada saat yang sama", () => {
    const a = { id: "aaa", peran: "KASIR", dibuatPada: hari(5) };
    const b = { id: "bbb", peran: "KASIR", dibuatPada: hari(5) };

    // Urutan masukan dibalik; keluarannya harus tetap memilih akun yang sama,
    // supaya akun tidak "berkedip" terkunci/terbuka antar permintaan.
    expect([...idDalamKuota([a, b], 1)]).toEqual(["aaa"]);
    expect([...idDalamKuota([b, a], 1)]).toEqual(["aaa"]);
  });

  it("tidak mengubah urutan senarai yang diberikan", () => {
    const masukan = [KASIR_BARU, PEMILIK, KASIR_LAMA];
    idDalamKuota(masukan, 1);
    expect(masukan.map((a) => a.id)).toEqual(["k2", "p1", "k1"]);
  });

  it("aman untuk batas nol maupun daftar kosong", () => {
    expect(idDalamKuota(SEMUA, 0).size).toBe(0);
    expect(idDalamKuota([], 1).size).toBe(0);
  });
});

describe("akunDalamKuota", () => {
  it("mengizinkan pemilik dan menolak kasir berlebih pada paket gratis", () => {
    const maks = PAKET.GRATIS.maksPengguna;

    expect(akunDalamKuota(SEMUA, "p1", maks)).toBe(true);
    expect(akunDalamKuota(SEMUA, "k1", maks)).toBe(false);
    expect(akunDalamKuota(SEMUA, "k2", maks)).toBe(false);
  });

  it("mengizinkan semuanya pada paket pro", () => {
    for (const a of SEMUA) {
      expect(akunDalamKuota(SEMUA, a.id, PAKET.PRO.maksPengguna)).toBe(true);
    }
  });

  it("menolak id yang tidak ada di daftar", () => {
    expect(akunDalamKuota(SEMUA, "entah", 10)).toBe(false);
  });
});

describe("PESAN_KUOTA_AKUN", () => {
  it("menjelaskan sebab dan jalan keluarnya", () => {
    expect(PESAN_KUOTA_AKUN).toContain("Gratis");
    expect(PESAN_KUOTA_AKUN.toLowerCase()).toContain("pemilik");
    expect(PESAN_KUOTA_AKUN.toLowerCase()).toContain("pro");
  });
});
