import { describe, expect, it } from "vitest";
import {
  BATAS_PEREDARAN_BRUTO,
  FASILITAS_BEBAS_OP,
  TARIF_PPH_FINAL,
  catatanPajak,
  hitungPajakTahunan,
  jatuhTempoSetor,
  namaBulan,
  peredaranBrutoTransaksi,
  ringkasLabaRugi,
} from "@/lib/pajak";

const JT = 1_000_000;

/** Membangun senarai 12 bulan dari daftar pasangan {bulan, nilai}. */
function bulanan(isi: Record<number, number>): number[] {
  return Array.from({ length: 12 }, (_, i) => isi[i + 1] ?? 0);
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

describe("jatuhTempoSetor", () => {
  it("tanggal 15 bulan berikutnya", () => {
    expect(jatuhTempoSetor(2026, 1)).toEqual({ iso: "2026-02-15", label: "15 Februari 2026" });
    expect(jatuhTempoSetor(2026, 7)).toEqual({ iso: "2026-08-15", label: "15 Agustus 2026" });
  });

  it("masa pajak Desember jatuh tempo pada Januari tahun berikutnya", () => {
    expect(jatuhTempoSetor(2026, 12)).toEqual({ iso: "2027-01-15", label: "15 Januari 2027" });
  });

  it("nama bulan dalam bahasa Indonesia", () => {
    expect(namaBulan(1)).toBe("Januari");
    expect(namaBulan(12)).toBe("Desember");
  });
});

describe("hitungPajakTahunan — Wajib Pajak Orang Pribadi", () => {
  it("tidak ada pajak sama sekali bila omzet setahun di bawah Rp500 juta", () => {
    // Keadaan hampir semua warung. Kalau ini salah, aplikasi akan menyuruh
    // orang membayar pajak yang tidak terutang.
    const hasil = hitungPajakTahunan({
      omzetBulanan: Array(12).fill(30 * JT), // 360 juta setahun
      jenis: "ORANG_PRIBADI",
      tahun: 2026,
    });

    expect(hasil.totalPeredaranBruto).toBe(360 * JT);
    expect(hasil.totalDasarPengenaan).toBe(0);
    expect(hasil.totalPphFinal).toBe(0);
    expect(hasil.sisaFasilitas).toBe(140 * JT);
    expect(hasil.bulanFasilitasHabis).toBeNull();
  });

  it("mengikuti contoh perhitungan resmi DJP", () => {
    // Januari–Agustus Rp450 juta, September Rp150 juta.
    // Sisa fasilitas di September = 500 − 450 = 50 juta.
    // Kena pajak = 150 − 50 = 100 juta → 0,5% × 100 juta = Rp500.000.
    const hasil = hitungPajakTahunan({
      omzetBulanan: bulanan({
        1: 50 * JT,
        2: 50 * JT,
        3: 50 * JT,
        4: 50 * JT,
        5: 50 * JT,
        6: 50 * JT,
        7: 50 * JT,
        8: 100 * JT,
        9: 150 * JT,
      }),
      jenis: "ORANG_PRIBADI",
      tahun: 2026,
    });

    const september = hasil.baris[8];
    expect(september.bulan).toBe(9);
    expect(september.bagianBebas).toBe(50 * JT);
    expect(september.dasarPengenaan).toBe(100 * JT);
    expect(september.pphFinal).toBe(500_000);

    // Sebelum September belum ada pajak sama sekali.
    expect(hasil.baris.slice(0, 8).every((b) => b.pphFinal === 0)).toBe(true);
    expect(hasil.bulanFasilitasHabis).toBe(9);
  });

  it("bulan sesudah fasilitas habis dikenai penuh", () => {
    const hasil = hitungPajakTahunan({
      omzetBulanan: bulanan({ 1: 500 * JT, 2: 80 * JT, 3: 120 * JT }),
      jenis: "ORANG_PRIBADI",
      tahun: 2026,
    });

    expect(hasil.baris[0].pphFinal).toBe(0); // fasilitas habis tepat di Januari
    expect(hasil.baris[1].bagianBebas).toBe(0);
    expect(hasil.baris[1].dasarPengenaan).toBe(80 * JT);
    expect(hasil.baris[1].pphFinal).toBe(400_000);
    expect(hasil.baris[2].pphFinal).toBe(600_000);
    expect(hasil.sisaFasilitas).toBe(0);
  });

  it("fasilitas terpakai bertahap lintas beberapa bulan", () => {
    const hasil = hitungPajakTahunan({
      omzetBulanan: bulanan({ 1: 200 * JT, 2: 200 * JT, 3: 200 * JT }),
      jenis: "ORANG_PRIBADI",
      tahun: 2026,
    });

    expect(hasil.baris[0].bagianBebas).toBe(200 * JT);
    expect(hasil.baris[1].bagianBebas).toBe(200 * JT);
    // Sisa fasilitas tinggal 100 juta saat Maret.
    expect(hasil.baris[2].bagianBebas).toBe(100 * JT);
    expect(hasil.baris[2].dasarPengenaan).toBe(100 * JT);
    expect(hasil.totalPphFinal).toBe(500_000);
  });
});

describe("hitungPajakTahunan — Wajib Pajak Badan", () => {
  it("tidak mendapat fasilitas Rp500 juta, kena sejak bulan pertama", () => {
    const hasil = hitungPajakTahunan({
      omzetBulanan: bulanan({ 1: 30 * JT }),
      jenis: "BADAN",
      tahun: 2026,
    });

    expect(hasil.baris[0].bagianBebas).toBe(0);
    expect(hasil.baris[0].dasarPengenaan).toBe(30 * JT);
    expect(hasil.baris[0].pphFinal).toBe(150_000);
    expect(hasil.sisaFasilitas).toBe(0);
  });
});

describe("hitungPajakTahunan — sifat umum", () => {
  it("bagian bebas ditambah dasar pengenaan selalu sama dengan peredaran bruto", () => {
    const hasil = hitungPajakTahunan({
      omzetBulanan: bulanan({ 1: 123_456_789, 5: 234_567_891, 11: 345_678_912 }),
      jenis: "ORANG_PRIBADI",
      tahun: 2026,
    });

    for (const b of hasil.baris) {
      expect(b.bagianBebas + b.dasarPengenaan).toBe(b.peredaranBruto);
    }
    expect(hasil.baris.reduce((j, b) => j + b.peredaranBruto, 0)).toBe(
      hasil.totalPeredaranBruto,
    );
  });

  it("kumulatif naik menurun-tidak dan berakhir di total", () => {
    const hasil = hitungPajakTahunan({
      omzetBulanan: Array(12).fill(10 * JT),
      jenis: "ORANG_PRIBADI",
      tahun: 2026,
    });

    for (let i = 1; i < hasil.baris.length; i += 1) {
      expect(hasil.baris[i].kumulatif).toBeGreaterThanOrEqual(hasil.baris[i - 1].kumulatif);
    }
    expect(hasil.baris[11].kumulatif).toBe(hasil.totalPeredaranBruto);
  });

  it("pajak dibulatkan ke bawah ke rupiah penuh", () => {
    // 0,5% dari 999 = 4,995 → 4.
    const hasil = hitungPajakTahunan({
      omzetBulanan: bulanan({ 1: 999 }),
      jenis: "BADAN",
      tahun: 2026,
    });
    expect(hasil.baris[0].pphFinal).toBe(4);
  });

  it("menandai peredaran bruto yang melampaui Rp4,8 miliar", () => {
    const aman = hitungPajakTahunan({
      omzetBulanan: Array(12).fill(400 * JT), // tepat 4,8 miliar
      jenis: "ORANG_PRIBADI",
      tahun: 2026,
    });
    expect(aman.melebihiBatasFinal).toBe(false);

    const lewat = hitungPajakTahunan({
      omzetBulanan: Array(12).fill(401 * JT),
      jenis: "ORANG_PRIBADI",
      tahun: 2026,
    });
    expect(lewat.melebihiBatasFinal).toBe(true);
  });

  it("selalu mengembalikan 12 baris walau masukannya lebih pendek", () => {
    // Tahun berjalan: baru ada data beberapa bulan.
    const hasil = hitungPajakTahunan({
      omzetBulanan: [10 * JT, 12 * JT],
      jenis: "ORANG_PRIBADI",
      tahun: 2026,
    });

    expect(hasil.baris).toHaveLength(12);
    expect(hasil.baris[11].peredaranBruto).toBe(0);
    expect(hasil.baris[11].pphFinal).toBe(0);
  });

  it("angka acuan sesuai peraturan", () => {
    expect(TARIF_PPH_FINAL).toBe(0.005);
    expect(FASILITAS_BEBAS_OP).toBe(500_000_000);
    expect(BATAS_PEREDARAN_BRUTO).toBe(4_800_000_000);
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
    const r = ringkasLabaRugi({
      peredaranBruto: 0,
      hargaPokokPenjualan: 0,
      biayaOperasional: 0,
    });
    expect(r.marjinBersih).toBeNull();
  });
});

describe("catatanPajak", () => {
  const dasar = { omzetBulanan: Array(12).fill(10 * JT), tahun: 2026 };

  it("menyebut dasar peraturannya", () => {
    const c = catatanPajak(hitungPajakTahunan({ ...dasar, jenis: "ORANG_PRIBADI" })).join(" ");
    expect(c).toContain("PP 23/2018");
    expect(c).toContain("0,5%");
  });

  it("menjelaskan fasilitas hanya untuk orang pribadi", () => {
    const op = catatanPajak(hitungPajakTahunan({ ...dasar, jenis: "ORANG_PRIBADI" })).join(" ");
    const badan = catatanPajak(hitungPajakTahunan({ ...dasar, jenis: "BADAN" })).join(" ");

    expect(op).toContain("Rp500 juta pertama");
    expect(badan).toContain("hanya untuk Wajib Pajak Orang Pribadi");
  });

  it("memperingatkan bila melampaui batas skema final", () => {
    const c = catatanPajak(
      hitungPajakTahunan({
        omzetBulanan: Array(12).fill(500 * JT),
        jenis: "ORANG_PRIBADI",
        tahun: 2026,
      }),
    ).join(" ");

    expect(c).toContain("Rp4,8 miliar");
    expect(c.toLowerCase()).toContain("konsultan pajak");
  });

  it("selalu menyebut batas setor dan pengecualian PB1", () => {
    const c = catatanPajak(hitungPajakTahunan({ ...dasar, jenis: "ORANG_PRIBADI" })).join(" ");
    expect(c).toContain("tanggal 15");
    expect(c).toContain("PB1");
  });
});
