import { describe, expect, it } from "vitest";
import {
  hariPeriode,
  kelasToko,
  kunciBulan,
  labelBulan,
  nilaiBulanan,
  pendapatanBulananBerulang,
  pendapatanPerBulan,
  ringkasPelanggan,
  totalPendapatan,
  type Pembayaran,
} from "@/lib/keuangan-langganan";
import { tambahHari } from "@/lib/format";

/** Pembayaran bulanan biasa: Rp49.000 untuk 30 hari. */
function bulanan(tokoId: string, dibayar: string): Pembayaran {
  const dibayarPada = new Date(dibayar);
  return {
    tokoId,
    jumlah: 49_000,
    dibayarPada,
    periodeMulai: dibayarPada,
    periodeSelesai: tambahHari(dibayarPada, 30),
  };
}

function tahunan(tokoId: string, dibayar: string): Pembayaran {
  const dibayarPada = new Date(dibayar);
  return {
    tokoId,
    jumlah: 470_000,
    dibayarPada,
    periodeMulai: dibayarPada,
    periodeSelesai: tambahHari(dibayarPada, 365),
  };
}

describe("kunciBulan & labelBulan", () => {
  it("mengelompokkan menurut bulan WIB", () => {
    expect(kunciBulan(new Date("2026-07-15T05:00:00.000Z"))).toBe("2026-07");
  });

  it("tanggal 1 dini hari WIB masih masuk bulan yang benar", () => {
    // 2026-06-30T17:30Z adalah 2026-07-01 pukul 00.30 WIB. Kalau dihitung
    // dengan UTC, pembayaran ini salah masuk ke bulan Juni.
    expect(kunciBulan(new Date("2026-06-30T17:30:00.000Z"))).toBe("2026-07");
  });

  it("memberi label yang bisa dibaca", () => {
    expect(labelBulan("2026-07")).toBe("Jul 2026");
    expect(labelBulan("2026-01")).toBe("Jan 2026");
    expect(labelBulan("2025-12")).toBe("Des 2025");
  });
});

describe("hariPeriode & nilaiBulanan", () => {
  it("menghitung panjang periode dalam hari", () => {
    expect(hariPeriode(bulanan("t1", "2026-07-01T03:00:00.000Z"))).toBe(30);
    expect(hariPeriode(tahunan("t1", "2026-07-01T03:00:00.000Z"))).toBe(365);
  });

  it("periode bulanan bernilai penuh per bulan", () => {
    expect(nilaiBulanan(bulanan("t1", "2026-07-01T03:00:00.000Z"))).toBe(49_000);
  });

  it("periode tahunan dibagi rata menjadi nilai bulanan", () => {
    // 470.000 × 30 / 365 = 38.630 dibulatkan.
    expect(nilaiBulanan(tahunan("t1", "2026-07-01T03:00:00.000Z"))).toBe(38_630);
  });

  it("periode nol hari tidak membuat pembagian nol", () => {
    const sama = new Date("2026-07-01T03:00:00.000Z");
    expect(
      nilaiBulanan({ jumlah: 49_000, periodeMulai: sama, periodeSelesai: sama }),
    ).toBe(49_000 * 30);
  });
});

describe("totalPendapatan", () => {
  it("menjumlahkan semua pembayaran", () => {
    const daftar = [
      bulanan("t1", "2026-07-01T03:00:00.000Z"),
      bulanan("t2", "2026-07-05T03:00:00.000Z"),
      tahunan("t3", "2026-06-01T03:00:00.000Z"),
    ];
    expect(totalPendapatan(daftar)).toBe(49_000 + 49_000 + 470_000);
  });

  it("nol untuk daftar kosong", () => {
    expect(totalPendapatan([])).toBe(0);
  });
});

describe("pendapatanPerBulan", () => {
  const SEKARANG = new Date("2026-07-30T05:00:00.000Z");

  it("mengembalikan bulan sebanyak yang diminta, urut lama ke baru", () => {
    const seri = pendapatanPerBulan([], SEKARANG, 3);

    expect(seri.map((s) => s.kunci)).toEqual(["2026-05", "2026-06", "2026-07"]);
  });

  it("bulan tanpa pembayaran tetap muncul bernilai nol", () => {
    const seri = pendapatanPerBulan([bulanan("t1", "2026-07-10T03:00:00.000Z")], SEKARANG, 3);

    expect(seri[0].nilai).toBe(0);
    expect(seri[0].jumlahPembayaran).toBe(0);
    expect(seri[2].nilai).toBe(49_000);
    expect(seri[2].jumlahPembayaran).toBe(1);
  });

  it("menjumlahkan beberapa pembayaran di bulan yang sama", () => {
    const seri = pendapatanPerBulan(
      [
        bulanan("t1", "2026-07-02T03:00:00.000Z"),
        bulanan("t2", "2026-07-20T03:00:00.000Z"),
        tahunan("t3", "2026-07-25T03:00:00.000Z"),
      ],
      SEKARANG,
      2,
    );

    expect(seri[1].nilai).toBe(49_000 + 49_000 + 470_000);
    expect(seri[1].jumlahPembayaran).toBe(3);
  });

  it("mengabaikan pembayaran di luar rentang yang diminta", () => {
    const seri = pendapatanPerBulan([bulanan("t1", "2025-01-10T03:00:00.000Z")], SEKARANG, 3);
    expect(seri.reduce((j, s) => j + s.nilai, 0)).toBe(0);
  });

  it("melintasi batas tahun dengan benar", () => {
    const seri = pendapatanPerBulan([], new Date("2026-02-15T05:00:00.000Z"), 4);
    expect(seri.map((s) => s.kunci)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});

describe("pendapatanBulananBerulang", () => {
  const SEKARANG = new Date("2026-07-30T05:00:00.000Z");

  it("hanya menghitung langganan yang masa berlakunya masih berjalan", () => {
    const daftar = [
      // Sudah habis pada 2026-07-01.
      bulanan("t1", "2026-06-01T03:00:00.000Z"),
      // Masih berjalan.
      bulanan("t2", "2026-07-20T03:00:00.000Z"),
    ];

    expect(pendapatanBulananBerulang(daftar, SEKARANG)).toBe(49_000);
  });

  it("satu toko dihitung sekali walau sudah beberapa kali memperpanjang", () => {
    // Toko yang memperpanjang tiga kali tidak boleh terhitung berlipat.
    const daftar = [
      { ...bulanan("t1", "2026-07-01T03:00:00.000Z"), periodeSelesai: new Date("2026-08-10T03:00:00.000Z") },
      { ...bulanan("t1", "2026-07-15T03:00:00.000Z"), periodeSelesai: new Date("2026-09-10T03:00:00.000Z") },
      { ...bulanan("t1", "2026-07-28T03:00:00.000Z"), periodeSelesai: new Date("2026-10-10T03:00:00.000Z") },
    ];

    expect(pendapatanBulananBerulang(daftar, SEKARANG)).toBeLessThanOrEqual(49_000 * 30);
    expect(pendapatanBulananBerulang(daftar, SEKARANG)).toBe(
      nilaiBulanan(daftar[2]),
    );
  });

  it("langganan tahunan menyumbang nilai bulanannya, bukan nilai penuh", () => {
    const daftar = [tahunan("t1", "2026-07-01T03:00:00.000Z")];
    expect(pendapatanBulananBerulang(daftar, SEKARANG)).toBe(38_630);
  });

  it("nol bila tidak ada yang masih berjalan", () => {
    expect(pendapatanBulananBerulang([bulanan("t1", "2026-01-01T03:00:00.000Z")], SEKARANG)).toBe(0);
  });
});

describe("kelasToko", () => {
  const SEKARANG = new Date("2026-07-30T05:00:00.000Z");

  it("blokir mengalahkan langganan yang masih berlaku", () => {
    // Toko yang diblokir tidak bisa dipakai walau langganannya aktif;
    // menampilkannya sebagai "berlangganan" akan menyesatkan operator.
    const kelas = kelasToko(
      {
        diblokir: true,
        paket: "PRO",
        trialSampai: null,
        proSampai: tambahHari(SEKARANG, 100),
      },
      SEKARANG,
    );
    expect(kelas).toBe("diblokir");
  });

  it("mengenali toko berlangganan", () => {
    expect(
      kelasToko(
        { diblokir: false, paket: "PRO", trialSampai: null, proSampai: tambahHari(SEKARANG, 10) },
        SEKARANG,
      ),
    ).toBe("berlangganan");
  });

  it("mengenali toko yang masih uji coba", () => {
    expect(
      kelasToko(
        { diblokir: false, paket: "GRATIS", trialSampai: tambahHari(SEKARANG, 3), proSampai: null },
        SEKARANG,
      ),
    ).toBe("uji-coba");
  });

  it("uji coba yang sudah habis menjadi gratis", () => {
    expect(
      kelasToko(
        { diblokir: false, paket: "GRATIS", trialSampai: tambahHari(SEKARANG, -1), proSampai: null },
        SEKARANG,
      ),
    ).toBe("gratis");
  });
});

describe("ringkasPelanggan", () => {
  const SEKARANG = new Date("2026-07-30T05:00:00.000Z");

  const DAFTAR = [
    { diblokir: false, paket: "PRO", trialSampai: null, proSampai: tambahHari(SEKARANG, 20) },
    { diblokir: false, paket: "PRO", trialSampai: null, proSampai: tambahHari(SEKARANG, 200) },
    { diblokir: false, paket: "GRATIS", trialSampai: tambahHari(SEKARANG, 2), proSampai: null },
    { diblokir: false, paket: "GRATIS", trialSampai: tambahHari(SEKARANG, 6), proSampai: null },
    { diblokir: false, paket: "GRATIS", trialSampai: tambahHari(SEKARANG, -5), proSampai: null },
    { diblokir: true, paket: "GRATIS", trialSampai: null, proSampai: null },
  ];

  it("menghitung setiap kelompok", () => {
    const r = ringkasPelanggan(DAFTAR, SEKARANG);

    expect(r.total).toBe(6);
    expect(r.berlangganan).toBe(2);
    expect(r.ujiCoba).toBe(2);
    expect(r.gratis).toBe(1);
    expect(r.diblokir).toBe(1);
  });

  it("menandai uji coba yang segera habis", () => {
    const r = ringkasPelanggan(DAFTAR, SEKARANG, 3);
    expect(r.ujiCobaSegeraHabis).toBe(1);

    const lebihLonggar = ringkasPelanggan(DAFTAR, SEKARANG, 7);
    expect(lebihLonggar.ujiCobaSegeraHabis).toBe(2);
  });

  it("jumlah tiap kelompok selalu sama dengan totalnya", () => {
    const r = ringkasPelanggan(DAFTAR, SEKARANG);
    expect(r.berlangganan + r.ujiCoba + r.gratis + r.diblokir).toBe(r.total);
  });

  it("aman untuk daftar kosong", () => {
    const r = ringkasPelanggan([], SEKARANG);
    expect(r.total).toBe(0);
    expect(r.ujiCobaSegeraHabis).toBe(0);
  });
});
