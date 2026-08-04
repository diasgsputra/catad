import { describe, expect, it } from "vitest";
import {
  A4,
  buatPdf,
  garis,
  kotak,
  lebarCourier,
  sandikanTeks,
  teks,
  teksKanan,
} from "@/lib/pdf";

/** Membaca hasil sebagai Latin-1 supaya posisi bita sama dengan posisi aksara. */
function keTeks(bita: Uint8Array): string {
  let hasil = "";
  for (const b of bita) hasil += String.fromCharCode(b);
  return hasil;
}

describe("sandikanTeks", () => {
  it("melarikan kurung dan garis miring terbalik", () => {
    // Tanpa pelarian, satu kurung tutup di dalam teks menamatkan literal PDF
    // lebih awal dan merusak seluruh berkas.
    expect(sandikanTeks("Toko (Cabang) A")).toBe("Toko \\(Cabang\\) A");
    expect(sandikanTeks("a\\b")).toBe("a\\\\b");
  });

  it("membiarkan aksara Latin-1 yang lazim di teks Indonesia", () => {
    expect(sandikanTeks("Peredaran bruto Rp1.250.000")).toBe("Peredaran bruto Rp1.250.000");
  });

  it("mengganti aksara di luar Latin-1 dengan tanda tanya", () => {
    // Font bawaan PDF tidak punya glyph-nya; lebih baik terlihat sebagai tanda
    // tanya daripada menghasilkan berkas rusak.
    expect(sandikanTeks("naik 5% → 6%")).toBe("naik 5% ? 6%");
    expect(sandikanTeks("emoji \u{1F600}")).toContain("?");
  });

  it("mengubah aksara kendali menjadi spasi", () => {
    expect(sandikanTeks("baris\nbaru")).toBe("baris baru");
  });
});

describe("lebarCourier", () => {
  it("lebarnya tetap 0,6 kali ukuran font per aksara", () => {
    expect(lebarCourier("12345", 10)).toBeCloseTo(30);
    expect(lebarCourier("", 10)).toBe(0);
  });
});

describe("teks & teksKanan", () => {
  it("menulis blok teks yang sah", () => {
    const hasil = teks(50, 700, "Halo", { ukuran: 11, font: "Helvetica-Bold" });

    expect(hasil).toContain("BT");
    expect(hasil).toContain("ET");
    expect(hasil).toContain("/F2 11 Tf");
    expect(hasil).toContain("(Halo) Tj");
  });

  it("teks rata kanan dimulai di kiri titik jangkarnya", () => {
    const isi = "1.000.000";
    const hasil = teksKanan(500, 700, isi, { ukuran: 10 });
    const mulai = Number(/1 0 0 1 ([\d.]+) /.exec(hasil)?.[1]);

    expect(mulai).toBeCloseTo(500 - lebarCourier(isi, 10));
    expect(mulai).toBeLessThan(500);
  });

  it("garis dan kotak menghasilkan operator gambar", () => {
    expect(garis(40, 100, 550)).toContain(" l\nS");
    expect(kotak(40, 100, 510, 16)).toContain(" re\nf");
  });
});

describe("buatPdf", () => {
  const halaman = [[teks(50, 800, "Halaman satu"), garis(50, 780, 545)]];

  it("diawali tanda berkas PDF", () => {
    const isi = keTeks(buatPdf(halaman));
    expect(isi.startsWith("%PDF-1.4\n")).toBe(true);
  });

  it("diakhiri penanda akhir berkas", () => {
    const isi = keTeks(buatPdf(halaman));
    expect(isi.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("startxref menunjuk tepat ke awal tabel xref", () => {
    // Kalau posisi ini meleset, sebagian pembaca PDF masih bisa memulihkan
    // berkasnya dan sebagian lain menolak membukanya — kerusakan yang cuma
    // muncul di komputer orang lain.
    const isi = keTeks(buatPdf(halaman));
    const posisi = Number(/startxref\n(\d+)/.exec(isi)?.[1]);

    expect(Number.isFinite(posisi)).toBe(true);
    expect(isi.slice(posisi, posisi + 4)).toBe("xref");
  });

  it("setiap posisi di tabel xref menunjuk ke awal objeknya", () => {
    const isi = keTeks(buatPdf(halaman));
    const bagian = /xref\n0 (\d+)\n([\s\S]*?)trailer/.exec(isi);
    expect(bagian).not.toBeNull();

    const jumlah = Number(bagian![1]);
    const baris = bagian![2].split("\n").filter((b) => b.trim() !== "");

    expect(baris).toHaveLength(jumlah);
    expect(baris[0]).toContain("65535 f");

    // Baris ke-n (n >= 1) harus menunjuk ke "n 0 obj".
    for (let id = 1; id < jumlah; id += 1) {
      const posisi = Number(baris[id].slice(0, 10));
      expect(isi.slice(posisi, posisi + `${id} 0 obj`.length)).toBe(`${id} 0 obj`);
    }
  });

  it("panjang aliran isi sesuai jumlah bita sesungguhnya", () => {
    const isi = keTeks(buatPdf(halaman));
    const cocok = /<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/.exec(isi);

    expect(cocok).not.toBeNull();
    expect(cocok![2].length).toBe(Number(cocok![1]));
  });

  it("memakai ukuran halaman A4", () => {
    const isi = keTeks(buatPdf(halaman));
    expect(isi).toContain(`/MediaBox [0 0 ${A4.lebar.toFixed(2)} ${A4.tinggi.toFixed(2)}]`);
  });

  it("mendaftarkan keempat font bawaan tanpa menyematkannya", () => {
    const isi = keTeks(buatPdf(halaman));

    for (const nama of ["Helvetica", "Helvetica-Bold", "Courier", "Courier-Bold"]) {
      expect(isi).toContain(`/BaseFont /${nama}`);
    }
    // Font yang disematkan akan memuat FontFile; ini tidak boleh ada.
    expect(isi).not.toContain("/FontFile");
  });

  it("menghitung jumlah halaman dengan benar", () => {
    const isi = keTeks(
      buatPdf([[teks(50, 800, "satu")], [teks(50, 800, "dua")], [teks(50, 800, "tiga")]]),
    );

    expect(isi).toContain("/Count 3");
    expect((isi.match(/\/Type \/Page[^s]/g) ?? []).length).toBe(3);
  });

  it("tetap menghasilkan berkas sah untuk masukan kosong", () => {
    const isi = keTeks(buatPdf([]));
    expect(isi.startsWith("%PDF-1.4")).toBe(true);
    expect(isi).toContain("/Count 1");
  });

  it("judul yang memuat kurung tidak merusak berkas", () => {
    const isi = keTeks(buatPdf(halaman, { judul: "Laporan (2026)" }));
    expect(isi).toContain("/Title (Laporan \\(2026\\))");
  });

  it("hasilnya sama persis untuk masukan yang sama", () => {
    // Tidak ada tanggal atau angka acak yang diambil sendiri, sehingga
    // keluarannya bisa dibandingkan di pengujian.
    const a = buatPdf(halaman, { judul: "Uji", dibuatPada: "20260801000000" });
    const b = buatPdf(halaman, { judul: "Uji", dibuatPada: "20260801000000" });
    expect(keTeks(a)).toBe(keTeks(b));
  });
});
