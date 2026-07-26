import { describe, expect, it } from "vitest";
import {
  PINTASAN_BAYAR,
  PINTASAN_KASIR,
  SEMUA_PINTASAN,
  adaPengubah,
  altHuruf,
  dalamIsian,
  hurufTunggal,
  kursorMasihBisaKeKiri,
  nomorAlt,
  tandaTanya,
} from "@/lib/pintasan";

/** Peristiwa tombol tiruan — fungsi yang diuji hanya membaca propertinya. */
function tombol(sisi: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    key: "",
    code: "",
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    ...sisi,
  } as KeyboardEvent;
}

function elemen(tagName: string, isContentEditable = false): EventTarget {
  return { tagName, isContentEditable } as unknown as EventTarget;
}

describe("dalamIsian", () => {
  it("mengenali kolom isian yang bisa diketik", () => {
    expect(dalamIsian(elemen("INPUT"))).toBe(true);
    expect(dalamIsian(elemen("TEXTAREA"))).toBe(true);
    expect(dalamIsian(elemen("SELECT"))).toBe(true);
  });

  it("menganggap elemen contenteditable sebagai isian", () => {
    expect(dalamIsian(elemen("DIV", true))).toBe(true);
  });

  it("elemen biasa bukan isian", () => {
    expect(dalamIsian(elemen("DIV"))).toBe(false);
    expect(dalamIsian(elemen("BUTTON"))).toBe(false);
    expect(dalamIsian(elemen("TR"))).toBe(false);
  });

  it("aman terhadap sasaran kosong", () => {
    expect(dalamIsian(null)).toBe(false);
    expect(dalamIsian({} as EventTarget)).toBe(false);
  });
});

describe("adaPengubah", () => {
  it("mendeteksi Ctrl, Alt, dan Meta", () => {
    expect(adaPengubah(tombol({ ctrlKey: true }))).toBe(true);
    expect(adaPengubah(tombol({ altKey: true }))).toBe(true);
    expect(adaPengubah(tombol({ metaKey: true }))).toBe(true);
  });

  it("Shift saja bukan pengubah — huruf besar tetap huruf", () => {
    expect(adaPengubah(tombol({ shiftKey: true }))).toBe(false);
  });

  it("tanpa pengubah", () => {
    expect(adaPengubah(tombol({ key: "t" }))).toBe(false);
  });
});

describe("hurufTunggal", () => {
  it("cocok tanpa memedulikan besar kecil huruf", () => {
    expect(hurufTunggal(tombol({ key: "t" }), "t")).toBe(true);
    expect(hurufTunggal(tombol({ key: "T", shiftKey: true }), "t")).toBe(true);
  });

  it("tidak cocok untuk huruf lain", () => {
    expect(hurufTunggal(tombol({ key: "q" }), "t")).toBe(false);
  });

  it("tidak aktif bila ada Ctrl atau Alt", () => {
    expect(hurufTunggal(tombol({ key: "t", ctrlKey: true }), "t")).toBe(false);
    expect(hurufTunggal(tombol({ key: "t", altKey: true }), "t")).toBe(false);
  });
});

describe("kursorMasihBisaKeKiri", () => {
  function isian(tagName: string, sisi: Record<string, unknown> = {}): EventTarget {
    return { tagName, ...sisi } as unknown as EventTarget;
  }

  it("true bila kursor belum di awal teks", () => {
    expect(kursorMasihBisaKeKiri(isian("INPUT", { selectionStart: 3, value: "kopi" }))).toBe(true);
  });

  it("false bila kursor sudah mentok di awal teks", () => {
    expect(kursorMasihBisaKeKiri(isian("INPUT", { selectionStart: 0, value: "kopi" }))).toBe(false);
  });

  it("false untuk kolom kosong", () => {
    expect(kursorMasihBisaKeKiri(isian("INPUT", { selectionStart: 0, value: "" }))).toBe(false);
  });

  it("false untuk elemen yang bukan kolom teks", () => {
    expect(kursorMasihBisaKeKiri(isian("DIV"))).toBe(false);
    expect(kursorMasihBisaKeKiri(isian("BUTTON"))).toBe(false);
    // Select memakai panah untuk memilih opsi, bukan menggeser kursor.
    expect(kursorMasihBisaKeKiri(isian("SELECT"))).toBe(false);
  });

  it("memakai panjang isi bila selectionStart tidak tersedia", () => {
    // Input bertipe date/number melempar saat selectionStart dibaca.
    const aneh = {
      tagName: "INPUT",
      value: "2026-07-26",
      get selectionStart(): number {
        throw new Error("tidak didukung");
      },
    } as unknown as EventTarget;
    expect(kursorMasihBisaKeKiri(aneh)).toBe(true);
  });

  it("aman terhadap sasaran kosong", () => {
    expect(kursorMasihBisaKeKiri(null)).toBe(false);
  });
});

describe("altHuruf", () => {
  it("cocok untuk Alt + huruf", () => {
    expect(altHuruf(tombol({ altKey: true, code: "KeyB", key: "b" }), "b")).toBe(true);
    expect(altHuruf(tombol({ altKey: true, code: "KeyX", key: "x" }), "x")).toBe(true);
  });

  it("tetap cocok saat Alt mengubah karakter yang dihasilkan", () => {
    // Pada macOS/tata letak tertentu Alt+B menghasilkan karakter lain.
    expect(altHuruf(tombol({ altKey: true, code: "KeyB", key: "∫" }), "b")).toBe(true);
  });

  it("tidak cocok tanpa Alt", () => {
    expect(altHuruf(tombol({ code: "KeyB", key: "b" }), "b")).toBe(false);
  });

  it("tidak cocok bila digabung Ctrl atau Meta", () => {
    expect(altHuruf(tombol({ altKey: true, ctrlKey: true, code: "KeyB" }), "b")).toBe(false);
    expect(altHuruf(tombol({ altKey: true, metaKey: true, code: "KeyB" }), "b")).toBe(false);
  });

  it("tidak tertukar antar huruf", () => {
    expect(altHuruf(tombol({ altKey: true, code: "KeyB", key: "b" }), "x")).toBe(false);
  });
});

describe("tandaTanya", () => {
  it("mengenali tanda tanya", () => {
    expect(tandaTanya(tombol({ key: "?", shiftKey: true }))).toBe(true);
  });

  it("mengabaikan garis miring biasa", () => {
    expect(tandaTanya(tombol({ key: "/" }))).toBe(false);
  });

  it("mengabaikan gabungan dengan pengubah", () => {
    expect(tandaTanya(tombol({ key: "?", ctrlKey: true }))).toBe(false);
    expect(tandaTanya(tombol({ key: "?", altKey: true }))).toBe(false);
  });
});

describe("nomorAlt", () => {
  it("membaca angka dari kode tombol saat Alt ditekan", () => {
    expect(nomorAlt(tombol({ altKey: true, code: "Digit3", key: "3" }))).toBe(3);
    expect(nomorAlt(tombol({ altKey: true, code: "Digit9", key: "9" }))).toBe(9);
  });

  it("tetap bekerja bila Alt mengubah karakter yang dihasilkan", () => {
    // Pada sebagian tata letak, Alt+2 menghasilkan karakter lain.
    expect(nomorAlt(tombol({ altKey: true, code: "Digit2", key: "™" }))).toBe(2);
  });

  it("mengabaikan angka tanpa Alt", () => {
    expect(nomorAlt(tombol({ code: "Digit3", key: "3" }))).toBeNull();
  });

  it("mengabaikan gabungan dengan Ctrl atau Meta", () => {
    expect(nomorAlt(tombol({ altKey: true, ctrlKey: true, code: "Digit3" }))).toBeNull();
    expect(nomorAlt(tombol({ altKey: true, metaKey: true, code: "Digit3" }))).toBeNull();
  });

  it("mengabaikan angka nol dan tombol bukan angka", () => {
    expect(nomorAlt(tombol({ altKey: true, code: "Digit0", key: "0" }))).toBeNull();
    expect(nomorAlt(tombol({ altKey: true, code: "KeyA", key: "a" }))).toBeNull();
  });
});

describe("daftar pintasan", () => {
  it("tidak memakai tombol F sama sekali", () => {
    // Di banyak laptop F1–F12 butuh Fn, jadi terasa dua tombol, bukan satu.
    for (const grup of SEMUA_PINTASAN) {
      for (const p of grup.daftar) {
        for (const t of p.tombol) {
          expect(/^F\d{1,2}$/.test(t), `${t} dipakai untuk "${p.aksi}"`).toBe(false);
        }
      }
    }
  });

  it("perintah selalu memakai Alt, bukan Ctrl atau Meta", () => {
    for (const grup of SEMUA_PINTASAN) {
      for (const p of grup.daftar) {
        expect(p.tombol).not.toContain("Ctrl");
        expect(p.tombol).not.toContain("Cmd");
        expect(p.tombol).not.toContain("Meta");
      }
    }
  });

  it("setiap pintasan punya penjelasan aksinya", () => {
    for (const grup of SEMUA_PINTASAN) {
      expect(grup.daftar.length).toBeGreaterThan(0);
      for (const p of grup.daftar) {
        expect(p.tombol.length).toBeGreaterThan(0);
        expect(p.aksi.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("huruf pilihan metode bayar tidak bertabrakan", () => {
    const huruf = PINTASAN_BAYAR.daftar
      .map((p) => p.tombol[0])
      .filter((t) => /^[A-Z]$/.test(t));
    expect(new Set(huruf).size).toBe(huruf.length);
  });

  it("pintasan kasir mencakup seluruh langkah menjual", () => {
    const aksi = PINTASAN_KASIR.daftar.map((p) => p.aksi.toLowerCase()).join(" | ");
    expect(aksi).toContain("cari barang");
    expect(aksi).toContain("keranjang");
    expect(aksi).toContain("bayar");
  });
});
