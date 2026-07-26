import { describe, expect, it } from "vitest";
import {
  HARGA_PRO_BULANAN,
  HARI_UJI_COBA,
  PAKET,
  pesanBatas,
  punyaFitur,
  statusPaket,
} from "@/lib/plan";
import { tambahHari } from "@/lib/format";

const SEKARANG = new Date("2026-07-25T05:00:00.000Z");

describe("statusPaket", () => {
  it("menganggap toko dalam masa uji coba sebagai Pro", () => {
    const s = statusPaket(
      { paket: "GRATIS", trialSampai: tambahHari(SEKARANG, 9), proSampai: null },
      SEKARANG,
    );

    expect(s.aktif).toBe("PRO");
    expect(s.sumber).toBe("uji-coba");
    expect(s.sisaUjiCoba).toBe(9);
    expect(punyaFitur(s, "insight")).toBe(true);
  });

  it("menurunkan ke Gratis setelah uji coba berakhir", () => {
    const s = statusPaket(
      { paket: "GRATIS", trialSampai: tambahHari(SEKARANG, -1), proSampai: null },
      SEKARANG,
    );

    expect(s.aktif).toBe("GRATIS");
    expect(s.sumber).toBe("gratis");
    expect(s.ujiCobaHabis).toBe(true);
    expect(punyaFitur(s, "insight")).toBe(false);
    expect(punyaFitur(s, "ekspor")).toBe(false);
  });

  it("mengakui langganan berbayar yang masih aktif", () => {
    const s = statusPaket(
      { paket: "PRO", trialSampai: tambahHari(SEKARANG, -30), proSampai: tambahHari(SEKARANG, 20) },
      SEKARANG,
    );

    expect(s.aktif).toBe("PRO");
    expect(s.sumber).toBe("berbayar");
    expect(s.sisaBerbayar).toBe(20);
    expect(s.ujiCobaHabis).toBe(false);
  });

  it("mengutamakan langganan berbayar di atas uji coba", () => {
    const s = statusPaket(
      { paket: "PRO", trialSampai: tambahHari(SEKARANG, 5), proSampai: tambahHari(SEKARANG, 300) },
      SEKARANG,
    );
    expect(s.sumber).toBe("berbayar");
  });

  it("turun ke Gratis bila langganan berbayar sudah kedaluwarsa", () => {
    const s = statusPaket(
      { paket: "PRO", trialSampai: tambahHari(SEKARANG, -40), proSampai: tambahHari(SEKARANG, -1) },
      SEKARANG,
    );

    expect(s.aktif).toBe("GRATIS");
    expect(s.sumber).toBe("gratis");
  });

  it("menangani toko tanpa uji coba maupun langganan", () => {
    const s = statusPaket({ paket: "GRATIS", trialSampai: null, proSampai: null }, SEKARANG);

    expect(s.aktif).toBe("GRATIS");
    expect(s.ujiCobaHabis).toBe(false);
    expect(s.sisaUjiCoba).toBe(0);
    expect(s.sisaBerbayar).toBeNull();
  });

  it("menampilkan minimal 1 hari saat uji coba berakhir hari ini", () => {
    const s = statusPaket(
      // Berakhir beberapa jam lagi, masih di hari yang sama.
      { paket: "GRATIS", trialSampai: new Date("2026-07-25T20:00:00.000Z"), proSampai: null },
      SEKARANG,
    );

    expect(s.sumber).toBe("uji-coba");
    expect(s.sisaUjiCoba).toBe(1);
  });

  it("paket PRO tanpa tanggal berakhir tidak dianggap berbayar", () => {
    const s = statusPaket({ paket: "PRO", trialSampai: null, proSampai: null }, SEKARANG);
    expect(s.aktif).toBe("GRATIS");
  });
});

describe("batas paket", () => {
  it("paket gratis dibatasi jumlah produk, akun, dan riwayat", () => {
    expect(PAKET.GRATIS.maksProduk).toBe(50);
    expect(PAKET.GRATIS.maksPengguna).toBe(1);
    expect(PAKET.GRATIS.riwayatHari).toBe(30);
  });

  it("paket pro tanpa batas produk & riwayat", () => {
    expect(PAKET.PRO.maksProduk).toBe(Number.POSITIVE_INFINITY);
    expect(PAKET.PRO.riwayatHari).toBe(Number.POSITIVE_INFINITY);
    expect(PAKET.PRO.maksPengguna).toBe(10);
  });

  it("harga dan masa uji coba sesuai yang dijanjikan di halaman depan", () => {
    expect(HARGA_PRO_BULANAN).toBe(49_000);
    expect(HARI_UJI_COBA).toBe(14);
  });

  it("semua fitur analisis tertutup di paket gratis", () => {
    expect(PAKET.GRATIS.fitur.insight).toBe(false);
    expect(PAKET.GRATIS.fitur.ekspor).toBe(false);
    expect(PAKET.GRATIS.fitur.laporanPenuh).toBe(false);
    expect(PAKET.GRATIS.fitur.banyakKasir).toBe(false);
  });

  it("semua fitur terbuka di paket pro", () => {
    expect(Object.values(PAKET.PRO.fitur).every(Boolean)).toBe(true);
  });
});

describe("pesanBatas", () => {
  it("menyebut angka batas produk", () => {
    expect(pesanBatas("produk", PAKET.GRATIS)).toContain("50 produk");
  });

  it("memberi pesan khusus untuk batas satu akun", () => {
    expect(pesanBatas("pengguna", PAKET.GRATIS)).toContain("1 akun");
  });

  it("menyebut angka untuk batas akun lebih dari satu", () => {
    expect(pesanBatas("pengguna", PAKET.PRO)).toContain("10 akun");
  });
});
