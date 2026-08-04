import { describe, expect, it } from "vitest";
import {
  BATAS_PEREDARAN_31E,
  BATAS_PEREDARAN_FINAL,
  KONFIGURASI_BAWAAN,
  LAPISAN_PASAL_17,
  bulatkanPkp,
  catatanPajak,
  hitungPajak,
  jatuhTempoSetor,
  namaBulan,
  peredaranBrutoTransaksi,
  persenDariBps,
  pphBadan,
  pphPasal17,
  ringkasLabaRugi,
  type KonfigurasiPajak,
} from "@/lib/pajak";

const JT = 1_000_000;
const M = 1_000_000_000;

function bulanan(isi: Record<number, number>): number[] {
  return Array.from({ length: 12 }, (_, i) => isi[i + 1] ?? 0);
}

function konfig(sisi: Partial<KonfigurasiPajak> = {}): KonfigurasiPajak {
  return { ...KONFIGURASI_BAWAAN, ...sisi };
}

describe("peredaranBrutoTransaksi", () => {
  it("memakai subtotal dikurangi diskon, bukan total", () => {
    // `total` memuat pajak daerah yang dipungut dari pembeli. Memasukkannya
    // membuat pajak terutang lebih besar daripada seharusnya.
    expect(peredaranBrutoTransaksi({ subtotal: 100_000, diskon: 10_000 })).toBe(90_000);
  });

  it("tidak pernah negatif walau diskon melebihi subtotal", () => {
    expect(peredaranBrutoTransaksi({ subtotal: 10_000, diskon: 25_000 })).toBe(0);
  });
});

describe("pembantu", () => {
  it("jatuh tempo tanggal 15 bulan berikutnya", () => {
    expect(jatuhTempoSetor(2026, 1)).toEqual({ iso: "2026-02-15", label: "15 Februari 2026" });
    expect(jatuhTempoSetor(2026, 12)).toEqual({ iso: "2027-01-15", label: "15 Januari 2027" });
  });

  it("nama bulan dalam bahasa Indonesia", () => {
    expect(namaBulan(1)).toBe("Januari");
    expect(namaBulan(12)).toBe("Desember");
  });

  it("basis poin dibaca sebagai persen", () => {
    expect(persenDariBps(50)).toBe("0,5%");
    expect(persenDariBps(2200)).toBe("22%");
    expect(persenDariBps(2750)).toBe("27,5%");
  });

  it("PKP dibulatkan ke bawah dalam ribuan penuh", () => {
    expect(bulatkanPkp(1_234_567)).toBe(1_234_000);
    expect(bulatkanPkp(-5_000)).toBe(0);
  });
});

describe("pphPasal17", () => {
  it("progresif berlapis, bukan satu tarif untuk seluruh penghasilan", () => {
    // 100 juta = 5% × 60jt + 15% × 40jt = 3jt + 6jt.
    expect(pphPasal17(100 * JT)).toBe(9 * JT);
  });

  it("tepat di batas lapisan pertama", () => {
    expect(pphPasal17(60 * JT)).toBe(3 * JT);
  });

  it("melintasi beberapa lapisan", () => {
    // 300jt = 5%×60 + 15%×190 + 25%×50 = 3 + 28,5 + 12,5 = 44jt.
    expect(pphPasal17(300 * JT)).toBe(44 * JT);
  });

  it("lapisan tertinggi 35%", () => {
    // 6 miliar: 3 + 28,5 + 62,5 + 1.350 + 350 juta.
    const diharapkan = 3 * JT + 28.5 * JT + 62.5 * JT + 1350 * JT + 350 * JT;
    expect(pphPasal17(6 * M)).toBe(diharapkan);
  });

  it("nol untuk penghasilan nol atau negatif", () => {
    expect(pphPasal17(0)).toBe(0);
    expect(pphPasal17(-10 * JT)).toBe(0);
  });

  it("lapisannya sesuai UU HPP", () => {
    expect(LAPISAN_PASAL_17.map((l) => l.sampai)).toEqual([
      60 * JT,
      250 * JT,
      500 * JT,
      5 * M,
      Number.POSITIVE_INFINITY,
    ]);
    expect(LAPISAN_PASAL_17.map((l) => l.tarifBps)).toEqual([500, 1500, 2500, 3000, 3500]);
  });
});

describe("pphBadan", () => {
  const dasar = { tarifBps: 2200, pakai31E: true };

  it("peredaran bruto di bawah Rp4,8 miliar mendapat pengurangan penuh 50%", () => {
    // Tarif efektif menjadi 11%.
    expect(pphBadan({ ...dasar, pkp: 100 * JT, peredaranBruto: 3 * M })).toBe(11 * JT);
  });

  it("di atas Rp4,8 miliar, fasilitasnya proporsional", () => {
    // Peredaran bruto 9,6 miliar → separuh PKP berfasilitas.
    // 50% × 11% ... = 11% × 50jt + 22% × 50jt = 5,5jt + 11jt.
    const hasil = pphBadan({ ...dasar, pkp: 100 * JT, peredaranBruto: 9.6 * M });
    expect(hasil).toBe(16.5 * JT);
  });

  it("di atas Rp50 miliar tidak dapat fasilitas sama sekali", () => {
    expect(pphBadan({ ...dasar, pkp: 100 * JT, peredaranBruto: 60 * M })).toBe(22 * JT);
  });

  it("fasilitas bisa dimatikan", () => {
    expect(pphBadan({ ...dasar, pakai31E: false, pkp: 100 * JT, peredaranBruto: 3 * M })).toBe(
      22 * JT,
    );
  });

  it("nol untuk PKP nol atau rugi", () => {
    expect(pphBadan({ ...dasar, pkp: 0, peredaranBruto: 3 * M })).toBe(0);
    expect(pphBadan({ ...dasar, pkp: -50 * JT, peredaranBruto: 3 * M })).toBe(0);
  });

  it("ambangnya sesuai undang-undang", () => {
    expect(BATAS_PEREDARAN_FINAL).toBe(4_800_000_000);
    expect(BATAS_PEREDARAN_31E).toBe(50_000_000_000);
  });
});

describe("rezim FINAL_UMKM", () => {
  it("tidak ada pajak bila omzet setahun di bawah fasilitas", () => {
    const h = hitungPajak({
      omzetBulanan: Array(12).fill(30 * JT),
      konfigurasi: konfig(),
      tahun: 2026,
    });

    expect(h.pajakTerutang).toBe(0);
    expect(h.sisaFasilitas).toBe(140 * JT);
    expect(h.setoranBulanan).toBe(true);
  });

  it("mengikuti contoh perhitungan resmi DJP", () => {
    // Jan–Agu Rp450 juta, September Rp150 juta → kena Rp100 juta → Rp500.000.
    const h = hitungPajak({
      omzetBulanan: bulanan({
        1: 50 * JT, 2: 50 * JT, 3: 50 * JT, 4: 50 * JT,
        5: 50 * JT, 6: 50 * JT, 7: 50 * JT, 8: 100 * JT, 9: 150 * JT,
      }),
      konfigurasi: konfig(),
      tahun: 2026,
    });

    const september = h.baris[8];
    expect(september.bagianBebas).toBe(50 * JT);
    expect(september.dasarPengenaan).toBe(100 * JT);
    expect(september.pajakMasa).toBe(500_000);
    expect(h.bulanFasilitasHabis).toBe(9);
  });

  it("tarif dan fasilitasnya bisa diubah", () => {
    // Toko yang tidak berhak fasilitas: seluruh omzet kena sejak bulan pertama.
    const h = hitungPajak({
      omzetBulanan: bulanan({ 1: 100 * JT }),
      konfigurasi: konfig({ fasilitasBebas: 0, tarifFinalBps: 100 }),
      tahun: 2026,
    });

    expect(h.baris[0].bagianBebas).toBe(0);
    expect(h.baris[0].pajakMasa).toBe(1 * JT); // 1% × 100 juta
  });

  it("menandai peredaran bruto yang melampaui batas skema final", () => {
    const h = hitungPajak({
      omzetBulanan: Array(12).fill(401 * JT),
      konfigurasi: konfig(),
      tahun: 2026,
    });
    expect(h.melebihiBatasFinal).toBe(true);
    expect(catatanPajak(h).join(" ")).toContain("Rp4,8 miliar");
  });
});

describe("rezim NPPN", () => {
  it("penghasilan neto dianggap sebesar persentase norma", () => {
    // Omzet 600jt, norma 25% → neto 150jt; PTKP 54jt → PKP 96jt.
    // PPh = 5%×60 + 15%×36 = 3 + 5,4 = 8,4jt.
    const h = hitungPajak({
      omzetBulanan: Array(12).fill(50 * JT),
      konfigurasi: konfig({ rezim: "NPPN", normaBps: 2500, ptkp: 54 * JT }),
      tahun: 2026,
    });

    expect(h.totalPeredaranBruto).toBe(600 * JT);
    expect(h.pajakTerutang).toBe(8.4 * JT);
    expect(h.setoranBulanan).toBe(false);
  });

  it("norma yang berbeda menghasilkan pajak yang berbeda", () => {
    const rendah = hitungPajak({
      omzetBulanan: Array(12).fill(50 * JT),
      konfigurasi: konfig({ rezim: "NPPN", normaBps: 2000 }),
      tahun: 2026,
    });
    const tinggi = hitungPajak({
      omzetBulanan: Array(12).fill(50 * JT),
      konfigurasi: konfig({ rezim: "NPPN", normaBps: 3000 }),
      tahun: 2026,
    });

    expect(tinggi.pajakTerutang).toBeGreaterThan(rendah.pajakTerutang);
  });

  it("tidak ada pajak bila neto masih di bawah PTKP", () => {
    const h = hitungPajak({
      omzetBulanan: Array(12).fill(10 * JT),
      konfigurasi: konfig({ rezim: "NPPN", normaBps: 2500, ptkp: 54 * JT }),
      tahun: 2026,
    });
    expect(h.pajakTerutang).toBe(0);
  });

  it("tidak memakai kolom pajak masa", () => {
    const h = hitungPajak({
      omzetBulanan: Array(12).fill(50 * JT),
      konfigurasi: konfig({ rezim: "NPPN" }),
      tahun: 2026,
    });
    expect(h.baris.every((b) => b.pajakMasa === 0)).toBe(true);
  });
});

describe("rezim PEMBUKUAN_OP", () => {
  it("memakai laba bersih sesungguhnya, bukan omzet", () => {
    // Laba 200jt − PTKP 54jt = PKP 146jt.
    // PPh = 5%×60 + 15%×86 = 3 + 12,9 = 15,9jt.
    const h = hitungPajak({
      omzetBulanan: Array(12).fill(100 * JT),
      konfigurasi: konfig({ rezim: "PEMBUKUAN_OP", ptkp: 54 * JT }),
      tahun: 2026,
      labaBersih: 200 * JT,
    });

    expect(h.pajakTerutang).toBe(15.9 * JT);
  });

  it("rugi tidak menghasilkan pajak", () => {
    const h = hitungPajak({
      omzetBulanan: Array(12).fill(100 * JT),
      konfigurasi: konfig({ rezim: "PEMBUKUAN_OP" }),
      tahun: 2026,
      labaBersih: -50 * JT,
    });
    expect(h.pajakTerutang).toBe(0);
  });

  it("PTKP yang lebih besar menurunkan pajak", () => {
    const lajang = hitungPajak({
      omzetBulanan: [],
      konfigurasi: konfig({ rezim: "PEMBUKUAN_OP", ptkp: 54 * JT }),
      tahun: 2026,
      labaBersih: 200 * JT,
    });
    const berkeluarga = hitungPajak({
      omzetBulanan: [],
      konfigurasi: konfig({ rezim: "PEMBUKUAN_OP", ptkp: 72 * JT }),
      tahun: 2026,
      labaBersih: 200 * JT,
    });

    expect(berkeluarga.pajakTerutang).toBeLessThan(lajang.pajakTerutang);
  });

  it("mengingatkan bahwa laba catatan belum tentu laba fiskal", () => {
    const h = hitungPajak({
      omzetBulanan: [],
      konfigurasi: konfig({ rezim: "PEMBUKUAN_OP" }),
      tahun: 2026,
      labaBersih: 200 * JT,
    });
    expect(catatanPajak(h).join(" ")).toContain("laba fiskal");
  });
});

describe("rezim PEMBUKUAN_BADAN", () => {
  it("laba dikenai tarif badan dengan fasilitas Pasal 31E", () => {
    const h = hitungPajak({
      omzetBulanan: Array(12).fill(250 * JT), // 3 miliar setahun
      konfigurasi: konfig({ rezim: "PEMBUKUAN_BADAN", tarifBadanBps: 2200, pakai31E: true }),
      tahun: 2026,
      labaBersih: 300 * JT,
    });

    // Peredaran bruto di bawah 4,8 miliar → tarif efektif 11%.
    expect(h.pajakTerutang).toBe(33 * JT);
  });

  it("tanpa fasilitas memakai tarif penuh", () => {
    const h = hitungPajak({
      omzetBulanan: Array(12).fill(250 * JT),
      konfigurasi: konfig({ rezim: "PEMBUKUAN_BADAN", pakai31E: false }),
      tahun: 2026,
      labaBersih: 300 * JT,
    });
    expect(h.pajakTerutang).toBe(66 * JT);
  });

  it("tidak memakai PTKP", () => {
    // PTKP hanya untuk orang pribadi; mengubahnya tidak boleh berpengaruh.
    const a = hitungPajak({
      omzetBulanan: Array(12).fill(250 * JT),
      konfigurasi: konfig({ rezim: "PEMBUKUAN_BADAN", ptkp: 0 }),
      tahun: 2026,
      labaBersih: 300 * JT,
    });
    const b = hitungPajak({
      omzetBulanan: Array(12).fill(250 * JT),
      konfigurasi: konfig({ rezim: "PEMBUKUAN_BADAN", ptkp: 72 * JT }),
      tahun: 2026,
      labaBersih: 300 * JT,
    });

    expect(a.pajakTerutang).toBe(b.pajakTerutang);
  });
});

describe("rezim TANPA_HITUNG", () => {
  it("tidak menghitung pajak apa pun tetapi tetap merekap omzet", () => {
    const h = hitungPajak({
      omzetBulanan: Array(12).fill(100 * JT),
      konfigurasi: konfig({ rezim: "TANPA_HITUNG" }),
      tahun: 2026,
    });

    expect(h.pajakTerutang).toBe(0);
    expect(h.totalPeredaranBruto).toBe(1200 * JT);
    expect(h.baris).toHaveLength(12);
    expect(catatanPajak(h).join(" ")).toContain("di luar aplikasi");
  });
});

describe("sifat yang berlaku untuk semua rezim", () => {
  const semua: Array<KonfigurasiPajak["rezim"]> = [
    "FINAL_UMKM",
    "NPPN",
    "PEMBUKUAN_OP",
    "PEMBUKUAN_BADAN",
    "TANPA_HITUNG",
  ];

  it("selalu mengembalikan 12 baris walau masukannya lebih pendek", () => {
    for (const rezim of semua) {
      const h = hitungPajak({
        omzetBulanan: [10 * JT, 12 * JT],
        konfigurasi: konfig({ rezim }),
        tahun: 2026,
      });
      expect(h.baris, rezim).toHaveLength(12);
      expect(h.totalPeredaranBruto, rezim).toBe(22 * JT);
    }
  });

  it("pajak tidak pernah negatif", () => {
    for (const rezim of semua) {
      const h = hitungPajak({
        omzetBulanan: Array(12).fill(5 * JT),
        konfigurasi: konfig({ rezim }),
        tahun: 2026,
        labaBersih: -100 * JT,
      });
      expect(h.pajakTerutang, rezim).toBeGreaterThanOrEqual(0);
    }
  });

  it("langkah perhitungannya selalu berakhir pada satu baris hasil", () => {
    for (const rezim of semua) {
      const h = hitungPajak({
        omzetBulanan: Array(12).fill(50 * JT),
        konfigurasi: konfig({ rezim }),
        tahun: 2026,
        labaBersih: 100 * JT,
      });
      const hasil = h.langkah.filter((l) => l.hasil);
      expect(hasil, rezim).toHaveLength(1);
      expect(hasil[0].nilai, rezim).toBe(h.pajakTerutang);
    }
  });

  it("catatannya selalu menyebut PB1 dan PPN yang tidak dihitung", () => {
    for (const rezim of semua) {
      const c = catatanPajak(
        hitungPajak({
          omzetBulanan: Array(12).fill(50 * JT),
          konfigurasi: konfig({ rezim }),
          tahun: 2026,
        }),
      ).join(" ");
      expect(c, rezim).toContain("PB1");
      expect(c, rezim).toContain("PPN tidak dihitung");
    }
  });

  it("catatannya menyebut dasar hukum yang benar-benar dipakai", () => {
    const final = catatanPajak(
      hitungPajak({ omzetBulanan: [], konfigurasi: konfig(), tahun: 2026 }),
    ).join(" ");
    const norma = catatanPajak(
      hitungPajak({ omzetBulanan: [], konfigurasi: konfig({ rezim: "NPPN" }), tahun: 2026 }),
    ).join(" ");

    expect(final).toContain("PP 23/2018");
    // Dokumen berbasis Norma tidak boleh menyebut dasar hukum skema final.
    expect(norma).not.toContain("PP 23/2018");
    expect(norma).toContain("PER-17/PJ/2015");
  });
});

describe("ringkasLabaRugi", () => {
  it("menurunkan laba kotor dan laba bersih", () => {
    const r = ringkasLabaRugi({
      peredaranBruto: 100 * JT,
      hargaPokokPenjualan: 60 * JT,
      biayaOperasional: 25 * JT,
    });

    expect(r.labaKotor).toBe(40 * JT);
    expect(r.labaBersih).toBe(15 * JT);
    expect(r.marjinBersih).toBeCloseTo(15);
  });

  it("mengakui kerugian tanpa dipaksa nol", () => {
    const r = ringkasLabaRugi({
      peredaranBruto: 10 * JT,
      hargaPokokPenjualan: 8 * JT,
      biayaOperasional: 5 * JT,
    });
    expect(r.labaBersih).toBe(-3 * JT);
  });

  it("marjin null bila belum ada omzet", () => {
    expect(
      ringkasLabaRugi({ peredaranBruto: 0, hargaPokokPenjualan: 0, biayaOperasional: 0 })
        .marjinBersih,
    ).toBeNull();
  });
});
