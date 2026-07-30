import { describe, expect, it } from "vitest";
import {
  keWaInternasional,
  pembayaranSiap,
  pesanKonfirmasi,
  tautanKonfirmasiWa,
  type TujuanPembayaran,
} from "@/lib/pembayaran";

const LENGKAP: TujuanPembayaran = {
  bankNama: "BCA",
  bankRekening: "0375553291",
  bankPemilik: null,
  waNomor: "081329732838",
  catatanPembayaran: null,
};

describe("keWaInternasional", () => {
  it("mengubah nomor gaya lokal menjadi berawalan 62", () => {
    expect(keWaInternasional("081329732838")).toBe("6281329732838");
  });

  it("membiarkan nomor yang sudah internasional", () => {
    expect(keWaInternasional("6281329732838")).toBe("6281329732838");
  });

  it("membuang spasi, tanda hubung, dan tanda plus", () => {
    expect(keWaInternasional("+62 813-2973-2838")).toBe("6281329732838");
    expect(keWaInternasional("(0813) 2973 2838")).toBe("6281329732838");
  });

  it("tidak menempelkan kode negara dua kali", () => {
    // wa.me menolak "6262…" — dan tautan mati baru terlihat setelah ada
    // pelanggan yang menekannya.
    expect(keWaInternasional("6281329732838").startsWith("6262")).toBe(false);
    expect(keWaInternasional("+62 0813 2973 2838")).toBe("6281329732838");
  });

  it("menerima nomor tanpa nol maupun kode negara", () => {
    expect(keWaInternasional("81329732838")).toBe("6281329732838");
  });

  it("nomor lokal yang kebetulan berawalan 62 setelah nol tetap utuh", () => {
    // 0621… adalah nomor area yang sah; angka 62 di dalamnya bukan kode negara.
    expect(keWaInternasional("0621234567")).toBe("62621234567");
  });

  it("mengembalikan kosong untuk masukan yang tidak berisi angka", () => {
    expect(keWaInternasional("")).toBe("");
    expect(keWaInternasional("-- ()")).toBe("");
    expect(keWaInternasional("0")).toBe("");
  });
});

describe("pembayaranSiap", () => {
  it("siap bila rekening dan WhatsApp terisi", () => {
    expect(pembayaranSiap(LENGKAP)).toBe(true);
  });

  it("belum siap bila rekening kosong", () => {
    expect(pembayaranSiap({ ...LENGKAP, bankRekening: "   " })).toBe(false);
  });

  it("belum siap bila nomor WhatsApp tidak bisa dijadikan tautan", () => {
    expect(pembayaranSiap({ ...LENGKAP, waNomor: "" })).toBe(false);
    expect(pembayaranSiap({ ...LENGKAP, waNomor: "belum diisi" })).toBe(false);
  });
});

describe("tautanKonfirmasiWa", () => {
  it("menunjuk wa.me dengan nomor yang sudah dinormalkan", () => {
    expect(tautanKonfirmasiWa("081329732838", "halo")).toBe(
      "https://wa.me/6281329732838?text=halo",
    );
  });

  it("mengembalikan kosong bila nomornya belum diatur", () => {
    // Tautan "https://wa.me/?text=…" akan membuka WhatsApp tanpa tujuan, jadi
    // lebih baik tombolnya tidak dibuat sama sekali.
    expect(tautanKonfirmasiWa("", "halo")).toBe("");
  });

  it("menyandikan baris baru dan spasi", () => {
    const tautan = tautanKonfirmasiWa("081329732838", "baris satu\nbaris dua");

    expect(tautan).toContain("%0A");
    expect(tautan).not.toContain(" ");
    expect(tautan).not.toContain("\n");
  });

  it("menyandikan karakter yang bisa merusak query", () => {
    const tautan = tautanKonfirmasiWa("081329732838", "Toko A&B ?x=1 #2");

    expect(tautan).toContain("%26");
    expect(tautan).toContain("%3F");
    expect(tautan).toContain("%23");
  });
});

describe("pesanKonfirmasi", () => {
  it("menyebut nama toko, paket, dan jumlah", () => {
    const pesan = pesanKonfirmasi({
      namaToko: "Warung Bu Rina",
      siklus: "BULANAN",
      jumlah: "Rp49.000",
    });

    expect(pesan).toContain("Warung Bu Rina");
    expect(pesan).toContain("bulanan");
    expect(pesan).toContain("Rp49.000");
  });

  it("membedakan siklus tahunan", () => {
    const pesan = pesanKonfirmasi({
      namaToko: "Toko Sinar",
      siklus: "TAHUNAN",
      jumlah: "Rp470.000",
    });

    expect(pesan).toContain("tahunan");
    expect(pesan).not.toContain("bulanan");
  });
});
