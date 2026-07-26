import { describe, expect, it } from "vitest";
import {
  akhirHariWib,
  awalHariWib,
  angka,
  dariInputTanggal,
  hariMingguWib,
  jamMenit,
  jamWib,
  jarakHari,
  kunciTanggal,
  namaHari,
  namaHariIndeks,
  nilaiInputTanggal,
  persen,
  rupiah,
  selisihHari,
  selisihPersen,
  tambahHari,
  tanggalSingkat,
} from "@/lib/format";

describe("rupiah", () => {
  it("memformat angka dengan pemisah ribuan gaya Indonesia", () => {
    expect(rupiah(0)).toBe("Rp0");
    expect(rupiah(1_000)).toBe("Rp1.000");
    expect(rupiah(13_568_200)).toBe("Rp13.568.200");
  });

  it("membulatkan pecahan agar tidak ada sen", () => {
    expect(rupiah(1499.6)).toBe("Rp1.500");
    expect(rupiah(0.4)).toBe("Rp0");
  });

  it("menangani nilai negatif", () => {
    expect(rupiah(-25_000)).toBe("-Rp25.000");
  });

  it("meringkas nilai besar dengan koma sebagai pemisah desimal", () => {
    expect(rupiah(1_845_000, { ringkas: true })).toBe("Rp1,8jt");
    expect(rupiah(45_000, { ringkas: true })).toBe("Rp45rb");
    expect(rupiah(2_400_000_000, { ringkas: true })).toBe("Rp2,4M");
  });

  it("meringkas nilai bulat tanpa desimal menggantung", () => {
    expect(rupiah(2_000_000, { ringkas: true })).toBe("Rp2jt");
    expect(rupiah(-1_500_000, { ringkas: true })).toBe("-Rp1,5jt");
  });

  it("tidak meringkas nilai di bawah 10 ribu", () => {
    expect(rupiah(9_500, { ringkas: true })).toBe("Rp9.500");
  });

  it("bisa tanpa simbol", () => {
    expect(rupiah(50_000, { tanpaSimbol: true })).toBe("50.000");
  });

  it("aman terhadap NaN", () => {
    expect(rupiah(Number.NaN)).toBe("Rp0");
  });
});

describe("angka & persen", () => {
  it("memformat angka desimal", () => {
    expect(angka(1234.567, 1)).toBe("1.234,6");
    expect(angka(10)).toBe("10");
  });

  it("menambahkan tanda plus untuk persen positif", () => {
    expect(persen(18)).toBe("+18%");
    expect(persen(-7)).toBe("-7%");
    expect(persen(0)).toBe("0%");
  });
});

describe("selisihPersen", () => {
  it("menghitung kenaikan dan penurunan", () => {
    expect(selisihPersen(120, 100)).toBe(20);
    expect(selisihPersen(80, 100)).toBe(-20);
  });

  it("mengembalikan 100 bila pembanding nol tapi ada nilai", () => {
    expect(selisihPersen(50, 0)).toBe(100);
  });

  it("mengembalikan null bila keduanya kosong", () => {
    expect(selisihPersen(0, 0)).toBeNull();
  });
});

describe("batas hari WIB", () => {
  // 25 Juli 2026 pukul 16:30 UTC = 26 Juli 2026 pukul 23:30 WIB.
  const malamWib = new Date("2026-07-26T16:30:00.000Z");

  it("menganggap 16:30 UTC sebagai tanggal 26 di WIB", () => {
    expect(kunciTanggal(malamWib)).toBe("2026-07-26");
    expect(jamWib(malamWib)).toBe(23);
  });

  it("awal hari WIB adalah 17:00 UTC hari sebelumnya", () => {
    expect(awalHariWib(malamWib).toISOString()).toBe("2026-07-25T17:00:00.000Z");
  });

  it("akhir hari WIB tepat sebelum pukul 17:00 UTC", () => {
    expect(akhirHariWib(malamWib).toISOString()).toBe("2026-07-26T16:59:59.999Z");
  });

  it("transaksi pukul 23:30 WIB masuk hitungan hari itu", () => {
    const awal = awalHariWib(malamWib);
    const akhir = akhirHariWib(malamWib);
    expect(malamWib >= awal && malamWib <= akhir).toBe(true);
  });

  it("transaksi pukul 00:30 WIB masuk hari berikutnya, bukan hari sebelumnya", () => {
    // 25 Juli 17:30 UTC = 26 Juli 00:30 WIB
    const dinihari = new Date("2026-07-25T17:30:00.000Z");
    expect(kunciTanggal(dinihari)).toBe("2026-07-26");
    expect(jamWib(dinihari)).toBe(0);
  });
});

describe("navigasi tanggal", () => {
  it("tambahHari bergerak tepat 24 jam", () => {
    const a = new Date("2026-07-25T10:00:00.000Z");
    expect(tambahHari(a, 3).toISOString()).toBe("2026-07-28T10:00:00.000Z");
    expect(tambahHari(a, -1).toISOString()).toBe("2026-07-24T10:00:00.000Z");
  });

  it("selisihHari menghitung hari penuh menurut WIB", () => {
    const a = new Date("2026-07-20T02:00:00.000Z");
    const b = new Date("2026-07-25T02:00:00.000Z");
    expect(selisihHari(a, b)).toBe(5);
    expect(selisihHari(b, a)).toBe(-5);
    expect(selisihHari(a, a)).toBe(0);
  });

  it("nama hari sesuai kalender", () => {
    // 25 Juli 2026 adalah hari Sabtu.
    expect(namaHari(new Date("2026-07-25T05:00:00.000Z"))).toBe("Sabtu");
    expect(hariMingguWib(new Date("2026-07-26T05:00:00.000Z"))).toBe(0);
    expect(namaHariIndeks(0)).toBe("Minggu");
    expect(namaHariIndeks(6)).toBe("Sabtu");
  });

  it("memformat tanggal singkat", () => {
    expect(tanggalSingkat(new Date("2026-07-25T05:00:00.000Z"))).toBe("25 Jul 2026");
  });

  it("memformat jam menurut WIB", () => {
    expect(jamMenit(new Date("2026-07-25T09:05:00.000Z"))).toBe("16:05");
  });
});

describe("input tanggal", () => {
  it("bolak-balik antara Date dan nilai input", () => {
    const teks = "2026-07-25";
    const tanggal = dariInputTanggal(teks);
    expect(nilaiInputTanggal(tanggal)).toBe(teks);
    // Awal hari WIB = 17:00 UTC hari sebelumnya.
    expect(tanggal.toISOString()).toBe("2026-07-24T17:00:00.000Z");
  });

  it("mengembalikan hari ini bila teks tidak valid", () => {
    expect(nilaiInputTanggal(dariInputTanggal("bukan-tanggal"))).toBe(
      nilaiInputTanggal(new Date()),
    );
  });
});

describe("jarakHari", () => {
  it("memakai kata sehari-hari", () => {
    expect(jarakHari(0)).toBe("hari ini");
    expect(jarakHari(1)).toBe("besok");
    expect(jarakHari(-1)).toBe("kemarin");
    expect(jarakHari(5)).toBe("5 hari lagi");
    expect(jarakHari(-4)).toBe("4 hari lalu");
  });
});
