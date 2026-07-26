import { describe, expect, it } from "vitest";
import {
  agregasi,
  hariTerbaik,
  komposisiMetodeBayar,
  peringkatProduk,
  rataPerHariMinggu,
  seriHarian,
  type ItemRingkas,
  type TransaksiRingkas,
} from "@/lib/laporan";

function trx(sisi: Partial<TransaksiRingkas> & { total: number; dibuatPada: Date }): TransaksiRingkas {
  return {
    id: Math.random().toString(36).slice(2),
    subtotal: sisi.total,
    diskon: 0,
    totalModal: 0,
    laba: sisi.total,
    metodeBayar: "TUNAI",
    ...sisi,
  };
}

describe("agregasi", () => {
  it("menjumlahkan pendapatan, modal, dan laba", () => {
    const a = agregasi([
      trx({ total: 100_000, totalModal: 70_000, laba: 30_000, dibuatPada: new Date() }),
      trx({ total: 50_000, totalModal: 30_000, laba: 20_000, dibuatPada: new Date() }),
    ]);

    expect(a.pendapatan).toBe(150_000);
    expect(a.modal).toBe(100_000);
    expect(a.labaKotor).toBe(50_000);
    expect(a.jumlahTransaksi).toBe(2);
  });

  it("menghitung rata-rata keranjang dan margin", () => {
    const a = agregasi([
      trx({ total: 100_000, totalModal: 75_000, laba: 25_000, dibuatPada: new Date() }),
      trx({ total: 200_000, totalModal: 150_000, laba: 50_000, dibuatPada: new Date() }),
    ]);

    expect(a.rataKeranjang).toBe(150_000);
    expect(a.marginPersen).toBeCloseTo(25);
  });

  it("mengembalikan nol dan margin null bila kosong", () => {
    const a = agregasi([]);
    expect(a.pendapatan).toBe(0);
    expect(a.rataKeranjang).toBe(0);
    expect(a.marginPersen).toBeNull();
  });

  it("menjumlahkan diskon terpisah", () => {
    const a = agregasi([trx({ total: 90_000, diskon: 10_000, dibuatPada: new Date() })]);
    expect(a.diskon).toBe(10_000);
  });
});

describe("seriHarian", () => {
  const mulai = new Date("2026-07-20T02:00:00.000Z");
  const selesai = new Date("2026-07-25T02:00:00.000Z");

  it("mengisi seluruh hari dalam rentang termasuk yang kosong", () => {
    const seri = seriHarian([], mulai, selesai);
    expect(seri).toHaveLength(6);
    expect(seri.every((s) => s.pendapatan === 0)).toBe(true);
    expect(seri[0].kunci).toBe("2026-07-20");
    expect(seri[5].kunci).toBe("2026-07-25");
  });

  it("menempatkan transaksi pada hari WIB yang benar", () => {
    // 22 Juli 17:30 UTC = 23 Juli 00:30 WIB → harus masuk tanggal 23.
    const seri = seriHarian(
      [trx({ total: 75_000, dibuatPada: new Date("2026-07-22T17:30:00.000Z") })],
      mulai,
      selesai,
    );

    expect(seri.find((s) => s.kunci === "2026-07-23")?.pendapatan).toBe(75_000);
    expect(seri.find((s) => s.kunci === "2026-07-22")?.pendapatan).toBe(0);
  });

  it("menjumlahkan beberapa transaksi di hari yang sama", () => {
    const seri = seriHarian(
      [
        trx({ total: 20_000, laba: 5_000, dibuatPada: new Date("2026-07-24T03:00:00.000Z") }),
        trx({ total: 30_000, laba: 8_000, dibuatPada: new Date("2026-07-24T09:00:00.000Z") }),
      ],
      mulai,
      selesai,
    );

    const hari = seri.find((s) => s.kunci === "2026-07-24")!;
    expect(hari.pendapatan).toBe(50_000);
    expect(hari.laba).toBe(13_000);
    expect(hari.jumlahTransaksi).toBe(2);
  });

  it("mengabaikan transaksi di luar rentang", () => {
    const seri = seriHarian(
      [trx({ total: 99_000, dibuatPada: new Date("2026-06-01T03:00:00.000Z") })],
      mulai,
      selesai,
    );
    expect(seri.reduce((t, s) => t + s.pendapatan, 0)).toBe(0);
  });

  it("memberi label tanggal dua digit", () => {
    const seri = seriHarian([], mulai, selesai);
    expect(seri[0].label).toBe("20");
  });
});

describe("peringkatProduk", () => {
  function item(sisi: Partial<ItemRingkas> & { namaProduk: string; qty: number }): ItemRingkas {
    return {
      produkId: sisi.namaProduk,
      satuan: "pcs",
      subtotal: 10_000 * sisi.qty,
      modalSatuan: 7_000,
      hargaSatuan: 10_000,
      waktu: new Date(),
      ...sisi,
    };
  }

  it("menggabungkan baris produk yang sama", () => {
    const hasil = peringkatProduk([
      item({ namaProduk: "Indomie", qty: 3 }),
      item({ namaProduk: "Indomie", qty: 2 }),
    ]);

    expect(hasil).toHaveLength(1);
    expect(hasil[0].qty).toBe(5);
    expect(hasil[0].pendapatan).toBe(50_000);
    expect(hasil[0].laba).toBe(50_000 - 7_000 * 5);
  });

  it("mengurutkan dari jumlah terjual terbanyak", () => {
    const hasil = peringkatProduk([
      item({ namaProduk: "Sedikit", qty: 2 }),
      item({ namaProduk: "Banyak", qty: 10 }),
    ]);
    expect(hasil.map((h) => h.nama)).toEqual(["Banyak", "Sedikit"]);
  });

  it("membatasi jumlah baris keluaran", () => {
    const banyak = Array.from({ length: 20 }, (_, i) =>
      item({ namaProduk: `P${i}`, qty: i + 1 }),
    );
    expect(peringkatProduk(banyak, 5)).toHaveLength(5);
  });

  it("tetap mengelompokkan barang yang produknya sudah dihapus, berdasarkan nama", () => {
    const hasil = peringkatProduk([
      item({ namaProduk: "Barang Lama", qty: 2, produkId: null }),
      item({ namaProduk: "Barang Lama", qty: 3, produkId: null }),
    ]);

    expect(hasil).toHaveLength(1);
    expect(hasil[0].qty).toBe(5);
  });
});

describe("komposisiMetodeBayar", () => {
  it("menghitung nilai dan persentase per metode", () => {
    const hasil = komposisiMetodeBayar([
      trx({ total: 75_000, metodeBayar: "TUNAI", dibuatPada: new Date() }),
      trx({ total: 25_000, metodeBayar: "QRIS", dibuatPada: new Date() }),
    ]);

    expect(hasil[0].metode).toBe("TUNAI");
    expect(hasil[0].persen).toBe(75);
    expect(hasil[1].persen).toBe(25);
  });

  it("mengembalikan daftar kosong tanpa transaksi", () => {
    expect(komposisiMetodeBayar([])).toEqual([]);
  });
});

describe("rataPerHariMinggu & hariTerbaik", () => {
  // 20 Juli 2026 = Senin, 25 Juli = Sabtu.
  const seri = seriHarian(
    [
      trx({ total: 100_000, dibuatPada: new Date("2026-07-25T05:00:00.000Z") }), // Sabtu
      trx({ total: 40_000, dibuatPada: new Date("2026-07-20T05:00:00.000Z") }), // Senin
    ],
    new Date("2026-07-20T02:00:00.000Z"),
    new Date("2026-07-25T02:00:00.000Z"),
  );

  it("mengelompokkan pendapatan menurut hari dalam seminggu", () => {
    const rata = rataPerHariMinggu(seri);
    expect(rata).toHaveLength(7);
    expect(rata[6].nama).toBe("Sabtu");
    expect(rata[6].rata).toBe(100_000);
    expect(rata[1].nama).toBe("Senin");
    expect(rata[1].rata).toBe(40_000);
  });

  it("memilih hari dengan rata-rata tertinggi", () => {
    expect(hariTerbaik(seri)).toEqual({ nama: "Sabtu", rata: 100_000 });
  });

  it("mengembalikan null bila data belum cukup untuk dibandingkan", () => {
    const satuHari = seriHarian(
      [trx({ total: 50_000, dibuatPada: new Date("2026-07-25T05:00:00.000Z") })],
      new Date("2026-07-25T02:00:00.000Z"),
      new Date("2026-07-25T02:00:00.000Z"),
    );
    expect(hariTerbaik(satuHari)).toBeNull();
  });
});
