import { describe, expect, it } from "vitest";
import { batasi, inisial, keBulat, kodeAcak, nomorNota, slug } from "@/lib/utils";

describe("slug", () => {
  it("mengubah nama toko menjadi slug bersih", () => {
    expect(slug("Warung Bu Sari")).toBe("warung-bu-sari");
    expect(slug("Kedai Tenda Biru")).toBe("kedai-tenda-biru");
  });

  it("membuang tanda baca dan spasi berlebih", () => {
    expect(slug("  Toko  Maju!!! Jaya  ")).toBe("toko-maju-jaya");
    expect(slug("Kopi & Roti")).toBe("kopi-roti");
  });

  it("menghilangkan diakritik", () => {
    expect(slug("Café Créme")).toBe("cafe-creme");
  });

  it("memberi nilai cadangan bila hasilnya kosong", () => {
    expect(slug("!!!")).toBe("toko");
    expect(slug("")).toBe("toko");
  });

  it("membatasi panjang slug", () => {
    expect(slug("a".repeat(80)).length).toBe(48);
  });
});

describe("nomorNota", () => {
  it("menyusun nomor berurutan dengan tanggal", () => {
    expect(nomorNota("2026-07-25", 7)).toBe("TRX-20260725-0007");
    expect(nomorNota("2026-07-25", 1)).toBe("TRX-20260725-0001");
  });

  it("tidak memotong nomor besar", () => {
    expect(nomorNota("2026-07-25", 12_345)).toBe("TRX-20260725-12345");
  });
});

describe("kodeAcak", () => {
  it("menghasilkan kode dengan panjang yang diminta", () => {
    expect(kodeAcak(8)).toHaveLength(8);
    expect(kodeAcak(4)).toHaveLength(4);
  });

  it("hanya memakai huruf yang tidak ambigu", () => {
    // Tanpa I, O, 0, 1 supaya tidak salah baca saat dibacakan lewat telepon.
    for (let i = 0; i < 40; i += 1) {
      expect(kodeAcak(12)).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
    }
  });

  it("praktis tidak berulang", () => {
    const kumpulan = new Set(Array.from({ length: 200 }, () => kodeAcak(8)));
    expect(kumpulan.size).toBe(200);
  });
});

describe("inisial", () => {
  it("mengambil huruf depan dan belakang", () => {
    expect(inisial("Sari Wulandari")).toBe("SW");
    expect(inisial("Budi Cahyo Santoso")).toBe("BS");
  });

  it("memakai dua huruf pertama untuk satu kata", () => {
    expect(inisial("Sari")).toBe("SA");
  });

  it("aman untuk masukan kosong", () => {
    expect(inisial("   ")).toBe("?");
  });
});

describe("batasi & keBulat", () => {
  it("menahan nilai di dalam rentang", () => {
    expect(batasi(15, 0, 10)).toBe(10);
    expect(batasi(-5, 0, 10)).toBe(0);
    expect(batasi(5, 0, 10)).toBe(5);
  });

  it("membaca angka dari teks masukan pengguna", () => {
    expect(keBulat("25.000")).toBe(25000);
    expect(keBulat("Rp13.500")).toBe(13500);
    expect(keBulat(42.9)).toBe(42);
  });

  it("memakai nilai bawaan untuk masukan tak berangka", () => {
    expect(keBulat("", 5)).toBe(5);
    expect(keBulat(null, 0)).toBe(0);
    expect(keBulat("abc", 7)).toBe(7);
  });
});
