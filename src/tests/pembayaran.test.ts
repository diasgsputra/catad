import { describe, expect, it } from "vitest";
import {
  BANK_NAMA,
  BANK_REKENING,
  WA_NOMOR,
  WA_NOMOR_INTERNASIONAL,
  pesanKonfirmasi,
  tautanKonfirmasiWa,
} from "@/lib/pembayaran";

describe("tujuan pembayaran", () => {
  it("nomor rekening hanya angka, tanpa spasi atau tanda pisah", () => {
    // Nomor ini disalin langsung ke aplikasi mobile banking; satu spasi saja
    // sudah bisa membuat tempelannya ditolak.
    expect(BANK_REKENING).toMatch(/^\d+$/);
    expect(BANK_NAMA.length).toBeGreaterThan(0);
  });

  it("nomor WhatsApp internasional memakai 62 tanpa nol maupun tanda plus", () => {
    // wa.me menolak awalan "0" dan tanda "+", tautannya jadi mati.
    expect(WA_NOMOR_INTERNASIONAL).toMatch(/^62\d+$/);
    expect(WA_NOMOR_INTERNASIONAL.startsWith("620")).toBe(false);
  });

  it("nomor lokal dan internasional menunjuk nomor yang sama", () => {
    expect(WA_NOMOR.startsWith("0")).toBe(true);
    expect(WA_NOMOR_INTERNASIONAL).toBe(`62${WA_NOMOR.slice(1)}`);
  });
});

describe("tautanKonfirmasiWa", () => {
  it("menunjuk wa.me dengan nomor yang benar", () => {
    expect(tautanKonfirmasiWa("halo")).toBe(`https://wa.me/${WA_NOMOR_INTERNASIONAL}?text=halo`);
  });

  it("menyandikan baris baru dan spasi", () => {
    const tautan = tautanKonfirmasiWa("baris satu\nbaris dua");

    expect(tautan).toContain("%0A");
    expect(tautan).not.toContain(" ");
    expect(tautan).not.toContain("\n");
  });

  it("menyandikan karakter yang bisa merusak query", () => {
    const tautan = tautanKonfirmasiWa("Toko A&B ?x=1 #2");

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
