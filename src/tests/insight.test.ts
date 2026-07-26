import { describe, expect, it } from "vitest";
import {
  AMBANG_KRITIS_HARI,
  briefingHarian,
  daftarBelanja,
  deteksiStokMati,
  distribusiJam,
  hitungVelositas,
  jamTersibuk,
  prediksiStok,
  ringkasStatusStok,
  type BarisPenjualan,
  type MasukanBriefing,
  type ProdukRingkas,
} from "@/lib/insight";
import { tambahHari } from "@/lib/format";

const SEKARANG = new Date("2026-07-25T05:00:00.000Z"); // 12:00 WIB

function produk(sisi: Partial<ProdukRingkas> & { id: string; nama: string }): ProdukRingkas {
  return {
    satuan: "pcs",
    stok: 0,
    stokMinimum: 5,
    hargaJual: 10_000,
    hargaModal: 7_000,
    lacakStok: true,
    ...sisi,
  };
}

function jual(produkId: string, qty: number, hariLalu: number, harga = 10_000): BarisPenjualan {
  return {
    produkId,
    qty,
    subtotal: harga * qty,
    modal: 7_000 * qty,
    waktu: tambahHari(SEKARANG, -hariLalu),
  };
}

describe("hitungVelositas", () => {
  it("membagi total terjual dengan panjang jendela, bukan jumlah hari aktif", () => {
    // 14 unit dalam 2 hari, jendela 14 hari → 1 per hari.
    const v = hitungVelositas([jual("a", 7, 1), jual("a", 7, 2)], 14);
    expect(v.get("a")?.qtyTotal).toBe(14);
    expect(v.get("a")?.perHari).toBeCloseTo(1);
    expect(v.get("a")?.hariBerjualan).toBe(2);
  });

  it("mencatat waktu penjualan terakhir", () => {
    const v = hitungVelositas([jual("a", 1, 5), jual("a", 1, 2)], 14);
    expect(v.get("a")?.terakhirTerjual?.toISOString()).toBe(
      tambahHari(SEKARANG, -2).toISOString(),
    );
  });

  it("mengabaikan baris tanpa produkId (barang yang sudah dihapus)", () => {
    const v = hitungVelositas([{ ...jual("a", 5, 1), produkId: null }], 14);
    expect(v.size).toBe(0);
  });

  it("menghitung beberapa produk sekaligus", () => {
    const v = hitungVelositas([jual("a", 14, 1), jual("b", 7, 1)], 14);
    expect(v.get("a")?.perHari).toBeCloseTo(1);
    expect(v.get("b")?.perHari).toBeCloseTo(0.5);
  });
});

describe("prediksiStok", () => {
  it("menghitung hari tersisa dari stok dibagi kecepatan jual", () => {
    const p = [produk({ id: "a", nama: "Minyak", stok: 20 })];
    const v = hitungVelositas([jual("a", 28, 1)], 14); // 2/hari
    const hasil = prediksiStok(p, v, { hariJendela: 14, sekarang: SEKARANG });

    expect(hasil[0].perHari).toBeCloseTo(2);
    expect(hasil[0].hariTersisa).toBe(10);
    expect(hasil[0].status).toBe("AMAN");
  });

  it("menandai KRITIS bila habis dalam ambang hari", () => {
    const p = [produk({ id: "a", nama: "Gula", stok: 4 })];
    const v = hitungVelositas([jual("a", 28, 1)], 14); // 2/hari → 2 hari
    const hasil = prediksiStok(p, v, { hariJendela: 14, sekarang: SEKARANG });

    expect(hasil[0].hariTersisa).toBe(2);
    expect(hasil[0].hariTersisa!).toBeLessThanOrEqual(AMBANG_KRITIS_HARI);
    expect(hasil[0].status).toBe("KRITIS");
  });

  it("menandai HABIS saat stok nol, apa pun kecepatannya", () => {
    const p = [produk({ id: "a", nama: "Gula", stok: 0 })];
    const v = hitungVelositas([jual("a", 28, 1)], 14);
    expect(prediksiStok(p, v, { hariJendela: 14, sekarang: SEKARANG })[0].status).toBe("HABIS");
  });

  it("menandai TIDAK_BERGERAK bila tidak ada penjualan sama sekali", () => {
    const p = [produk({ id: "z", nama: "Sirup", stok: 11 })];
    const hasil = prediksiStok(p, new Map(), { hariJendela: 14, sekarang: SEKARANG });

    expect(hasil[0].status).toBe("TIDAK_BERGERAK");
    expect(hasil[0].hariTersisa).toBeNull();
    expect(hasil[0].perHari).toBe(0);
  });

  it("tetap WASPADA bila stok di bawah minimum walau prediksi masih panjang", () => {
    // 0,5/hari dengan stok 3 → 6 hari (di bawah ambang waspada 7).
    const p = [produk({ id: "a", nama: "Gas", stok: 3, stokMinimum: 4 })];
    const v = hitungVelositas([jual("a", 7, 1)], 14);
    expect(prediksiStok(p, v, { hariJendela: 14, sekarang: SEKARANG })[0].status).toBe("WASPADA");
  });

  it("melewati barang tanpa pelacakan stok", () => {
    const p = [produk({ id: "jasa", nama: "Es Teh", lacakStok: false, stok: 0 })];
    expect(prediksiStok(p, new Map(), { hariJendela: 14, sekarang: SEKARANG })).toHaveLength(0);
  });

  it("mengurutkan yang paling mendesak lebih dulu", () => {
    const p = [
      produk({ id: "aman", nama: "Aman", stok: 100 }),
      produk({ id: "habis", nama: "Habis", stok: 0 }),
      produk({ id: "kritis", nama: "Kritis", stok: 2 }),
    ];
    const v = hitungVelositas([jual("aman", 14, 1), jual("habis", 14, 1), jual("kritis", 14, 1)], 14);
    const urut = prediksiStok(p, v, { hariJendela: 14, sekarang: SEKARANG }).map((x) => x.produk.id);

    expect(urut).toEqual(["habis", "kritis", "aman"]);
  });

  it("menilai keandalan dari jumlah hari berjualan", () => {
    const p = [produk({ id: "a", nama: "A", stok: 50 }), produk({ id: "b", nama: "B", stok: 50 })];
    const penjualan = [
      // A terjual di 7 hari berbeda → keandalan tinggi
      ...[1, 2, 3, 4, 5, 6, 7].map((h) => jual("a", 2, h)),
      // B hanya satu hari → keandalan rendah
      jual("b", 14, 3),
    ];
    const v = hitungVelositas(penjualan, 14);
    const hasil = prediksiStok(p, v, { hariJendela: 14, sekarang: SEKARANG });

    expect(hasil.find((x) => x.produk.id === "a")?.keandalan).toBe("tinggi");
    expect(hasil.find((x) => x.produk.id === "b")?.keandalan).toBe("rendah");
  });

  it("menghitung modal yang tertahan di stok", () => {
    const p = [produk({ id: "a", nama: "A", stok: 10, hargaModal: 7_000 })];
    expect(prediksiStok(p, new Map(), { hariJendela: 14, sekarang: SEKARANG })[0].modalTertahan).toBe(
      70_000,
    );
  });
});

describe("ringkasStatusStok", () => {
  it("menjumlahkan tiap status dan yang perlu tindakan", () => {
    const p = [
      produk({ id: "habis", nama: "Habis", stok: 0 }),
      produk({ id: "kritis", nama: "Kritis", stok: 2 }),
      produk({ id: "aman", nama: "Aman", stok: 200 }),
    ];
    const v = hitungVelositas([jual("habis", 14, 1), jual("kritis", 14, 1), jual("aman", 14, 1)], 14);
    const r = ringkasStatusStok(prediksiStok(p, v, { hariJendela: 14, sekarang: SEKARANG }));

    expect(r.HABIS).toBe(1);
    expect(r.KRITIS).toBe(1);
    expect(r.AMAN).toBe(1);
    expect(r.perluTindakan).toBe(2);
    expect(r.total).toBe(3);
  });
});

describe("daftarBelanja", () => {
  it("menyarankan jumlah yang cukup untuk horizon + buffer", () => {
    // 2/hari, stok 4, horizon 14 + buffer 3 = 34 butuh, kurang 30.
    const p = [produk({ id: "a", nama: "Gula", stok: 4, hargaModal: 13_500 })];
    const v = hitungVelositas([jual("a", 28, 1)], 14);
    const d = daftarBelanja(prediksiStok(p, v, { hariJendela: 14, sekarang: SEKARANG }), {
      horizonHari: 14,
      bufferHari: 3,
    });

    expect(d.baris).toHaveLength(1);
    expect(d.baris[0].qtySaran).toBe(30);
    expect(d.baris[0].estimasiBiaya).toBe(30 * 13_500);
    expect(d.totalEstimasi).toBe(405_000);
  });

  it("tidak memasukkan barang yang stoknya sudah cukup", () => {
    const p = [produk({ id: "a", nama: "Beras", stok: 100 })];
    const v = hitungVelositas([jual("a", 14, 1)], 14); // 1/hari → butuh 17
    expect(daftarBelanja(prediksiStok(p, v, { hariJendela: 14, sekarang: SEKARANG })).baris).toHaveLength(
      0,
    );
  });

  it("melewati barang mandek yang masih ada stoknya", () => {
    const p = [produk({ id: "z", nama: "Sirup", stok: 11 })];
    expect(daftarBelanja(prediksiStok(p, new Map(), { hariJendela: 14, sekarang: SEKARANG })).baris).toHaveLength(
      0,
    );
  });

  it("tetap menyarankan stok minimum bila kosong tanpa riwayat penjualan", () => {
    const p = [produk({ id: "baru", nama: "Barang Baru", stok: 0, stokMinimum: 8 })];
    const d = daftarBelanja(prediksiStok(p, new Map(), { hariJendela: 14, sekarang: SEKARANG }));

    expect(d.baris[0].qtySaran).toBe(8);
    expect(d.baris[0].alasan).toContain("belum ada data");
  });

  it("mengutamakan stok kosong di urutan teratas", () => {
    const p = [
      produk({ id: "kritis", nama: "Kritis", stok: 2 }),
      produk({ id: "habis", nama: "Habis", stok: 0 }),
    ];
    const v = hitungVelositas([jual("kritis", 14, 1), jual("habis", 14, 1)], 14);
    const d = daftarBelanja(prediksiStok(p, v, { hariJendela: 14, sekarang: SEKARANG }));

    expect(d.baris[0].produk.id).toBe("habis");
  });

  it("mencantumkan alasan yang menyebut kecepatan jual", () => {
    const p = [produk({ id: "a", nama: "Gula", stok: 1, satuan: "kg" })];
    const v = hitungVelositas([jual("a", 28, 1)], 14);
    const d = daftarBelanja(prediksiStok(p, v, { hariJendela: 14, sekarang: SEKARANG }));

    expect(d.baris[0].alasan).toBe("Laku 2 kg/hari");
  });
});

describe("deteksiStokMati", () => {
  it("hanya mengambil barang bersisa stok yang tidak terjual", () => {
    const p = [
      produk({ id: "mandek", nama: "Sirup", stok: 11, hargaModal: 20_000 }),
      produk({ id: "kosong", nama: "Kosong", stok: 0 }),
      produk({ id: "laku", nama: "Laku", stok: 10 }),
    ];
    const v = hitungVelositas([jual("laku", 14, 1)], 14);
    const mati = deteksiStokMati(prediksiStok(p, v, { hariJendela: 14, sekarang: SEKARANG }), SEKARANG);

    expect(mati.map((m) => m.produk.id)).toEqual(["mandek"]);
    expect(mati[0].modalTertahan).toBe(220_000);
    expect(mati[0].hariTanpaPenjualan).toBeNull();
  });

  it("mengurutkan dari modal tertahan terbesar", () => {
    const p = [
      produk({ id: "kecil", nama: "Kecil", stok: 2, hargaModal: 5_000 }),
      produk({ id: "besar", nama: "Besar", stok: 10, hargaModal: 50_000 }),
    ];
    const mati = deteksiStokMati(prediksiStok(p, new Map(), { hariJendela: 14, sekarang: SEKARANG }), SEKARANG);
    expect(mati.map((m) => m.produk.id)).toEqual(["besar", "kecil"]);
  });
});

describe("distribusiJam & jamTersibuk", () => {
  it("membagi transaksi ke 24 ember menurut WIB", () => {
    const ember = distribusiJam([
      { dibuatPada: new Date("2026-07-25T00:30:00.000Z"), total: 10_000 }, // 07:30 WIB
      { dibuatPada: new Date("2026-07-25T00:45:00.000Z"), total: 5_000 }, // 07:45 WIB
      { dibuatPada: new Date("2026-07-25T10:00:00.000Z"), total: 20_000 }, // 17:00 WIB
    ]);

    expect(ember).toHaveLength(24);
    expect(ember[7].transaksi).toBe(2);
    expect(ember[7].pendapatan).toBe(15_000);
    expect(ember[17].pendapatan).toBe(20_000);
  });

  it("mencari rentang 3 jam dengan pendapatan tertinggi", () => {
    const ember = distribusiJam([
      { dibuatPada: new Date("2026-07-25T10:00:00.000Z"), total: 100_000 }, // 17
      { dibuatPada: new Date("2026-07-25T11:00:00.000Z"), total: 90_000 }, // 18
      { dibuatPada: new Date("2026-07-25T12:00:00.000Z"), total: 80_000 }, // 19
      { dibuatPada: new Date("2026-07-25T01:00:00.000Z"), total: 10_000 }, // 8
    ]);

    const sibuk = jamTersibuk(ember)!;
    expect(sibuk.mulai).toBe(17);
    expect(sibuk.selesai).toBe(19);
    expect(sibuk.pendapatan).toBe(270_000);
  });

  it("mengembalikan null bila belum ada transaksi", () => {
    expect(jamTersibuk(distribusiJam([]))).toBeNull();
  });
});

describe("briefingHarian", () => {
  function masukan(ubah: Partial<MasukanBriefing> = {}): MasukanBriefing {
    return {
      sekarang: SEKARANG,
      hariIni: { pendapatan: 500_000, laba: 120_000, transaksi: 20, item: 45 },
      rataHarian7: 500_000,
      kemarin: 480_000,
      prediksi: [],
      stokMati: [],
      emberJam: distribusiJam([]),
      produkTeratas: [],
      margin7: 24,
      marginSebelumnya: 24,
      pengeluaranBulanIni: 0,
      pendapatanBulanIni: 5_000_000,
      rataKeranjang: 25_000,
      rataKeranjangSebelumnya: 25_000,
      hariTerbaik: null,
      ...ubah,
    };
  }

  it("selalu memberi setidaknya satu kesimpulan", () => {
    const hasil = briefingHarian(masukan());
    expect(hasil.length).toBeGreaterThanOrEqual(1);
  });

  it("menaruh stok kosong yang masih laku di urutan teratas", () => {
    const p = [produk({ id: "a", nama: "Gula Pasir", stok: 0 })];
    const v = hitungVelositas([jual("a", 56, 1)], 14); // 4/hari
    const prediksi = prediksiStok(p, v, { hariJendela: 14, sekarang: SEKARANG });

    const hasil = briefingHarian(masukan({ prediksi }));
    expect(hasil[0].id).toBe("stok-kosong");
    expect(hasil[0].nada).toBe("bahaya");
    expect(hasil[0].judul).toContain("1 barang");
    expect(hasil[0].pesan).toContain("Gula Pasir");
  });

  it("melaporkan kenaikan penjualan yang berarti", () => {
    const hasil = briefingHarian(
      masukan({ hariIni: { pendapatan: 700_000, laba: 150_000, transaksi: 25, item: 60 } }),
    );
    const tren = hasil.find((x) => x.id === "tren-hari-ini")!;

    expect(tren.nada).toBe("positif");
    expect(tren.judul).toContain("40%");
  });

  it("mengabaikan selisih penjualan yang terlalu kecil", () => {
    const hasil = briefingHarian(
      masukan({ hariIni: { pendapatan: 520_000, laba: 120_000, transaksi: 20, item: 45 } }),
    );
    expect(hasil.find((x) => x.id === "tren-hari-ini")).toBeUndefined();
  });

  it("memperingatkan margin yang turun", () => {
    const hasil = briefingHarian(masukan({ margin7: 18, marginSebelumnya: 25 }));
    const m = hasil.find((x) => x.id === "margin-turun")!;

    expect(m.nada).toBe("peringatan");
    expect(m.judul).toContain("7 poin");
  });

  it("memberi peringatan bahaya bila pengeluaran melebihi pendapatan", () => {
    const hasil = briefingHarian(
      masukan({ pengeluaranBulanIni: 6_000_000, pendapatanBulanIni: 5_000_000 }),
    );
    const kas = hasil.find((x) => x.id === "arus-kas")!;

    expect(kas.nada).toBe("bahaya");
    expect(kas.judul).toContain("melebihi");
  });

  it("mengurutkan dari prioritas tertinggi", () => {
    const p = [produk({ id: "a", nama: "Gula", stok: 0 })];
    const v = hitungVelositas([jual("a", 28, 1)], 14);

    const hasil = briefingHarian(
      masukan({
        prediksi: prediksiStok(p, v, { hariJendela: 14, sekarang: SEKARANG }),
        margin7: 15,
        marginSebelumnya: 25,
        produkTeratas: [{ nama: "Indomie", qty: 40, pendapatan: 152_000 }],
      }),
    );

    const prioritas = hasil.map((x) => x.prioritas);
    expect(prioritas).toEqual([...prioritas].sort((a, b) => b - a));
  });

  it("mengarahkan toko baru untuk menambah produk", () => {
    const hasil = briefingHarian(
      masukan({
        hariIni: { pendapatan: 0, laba: 0, transaksi: 0, item: 0 },
        rataHarian7: 0,
        kemarin: 0,
        margin7: null,
        marginSebelumnya: null,
        pendapatanBulanIni: 0,
        rataKeranjang: 0,
        rataKeranjangSebelumnya: 0,
      }),
    );

    expect(hasil).toHaveLength(1);
    expect(hasil[0].id).toBe("aman");
    expect(hasil[0].aksi?.href).toBe("/app/produk");
  });

  it("menyebut modal yang mandek beserta nilainya", () => {
    const p = [produk({ id: "z", nama: "Sirup Markisa", stok: 11, hargaModal: 20_000 })];
    const prediksi = prediksiStok(p, new Map(), { hariJendela: 14, sekarang: SEKARANG });
    const hasil = briefingHarian(
      masukan({ prediksi, stokMati: deteksiStokMati(prediksi, SEKARANG) }),
    );

    const mati = hasil.find((x) => x.id === "stok-mati")!;
    expect(mati.judul).toContain("Rp220.000");
    expect(mati.pesan).toContain("Sirup Markisa");
  });
});
