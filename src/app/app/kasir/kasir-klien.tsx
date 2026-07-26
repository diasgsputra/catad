"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ikon } from "@/components/ikon";
import { Kunci, Tombol } from "@/components/ui";
import { rupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  adaPengubah,
  altHuruf,
  dalamIsian,
  hurufTunggal,
  menuSampingAktif,
} from "@/lib/pintasan";
import { masukMenuSamping } from "@/components/pintasan-global";
import { simpanPenjualan, type HasilCheckout } from "@/actions/kasir";
import { BarPetunjuk, type Petunjuk } from "./bar-petunjuk";

export type ProdukKasir = {
  id: string;
  nama: string;
  kode: string | null;
  satuan: string;
  hargaJual: number;
  stok: number;
  lacakStok: boolean;
  kategoriId: string | null;
  kategoriNama: string | null;
};

type BarisKeranjang = {
  produkId: string;
  nama: string;
  satuan: string;
  harga: number;
  qty: number;
  stok: number;
  lacakStok: boolean;
};

type Zona = "barang" | "keranjang";

const KUNCI_SIMPANAN = "catad:keranjang";

const METODE = [
  { nilai: "TUNAI", label: "Tunai", tombol: "T" },
  { nilai: "QRIS", label: "QRIS", tombol: "Q" },
  { nilai: "TRANSFER", label: "Transfer", tombol: "R" },
  { nilai: "KARTU", label: "Kartu", tombol: "K" },
] as const;

export function KasirKlien({
  produk,
  kategori,
  persenPajak,
  namaToko,
}: {
  produk: ProdukKasir[];
  kategori: Array<{ id: string; nama: string }>;
  persenPajak: number;
  namaToko: string;
}) {
  const router = useRouter();
  const [keranjang, setKeranjang] = useState<BarisKeranjang[]>([]);
  const [cari, setCari] = useState("");
  const [kategoriAktif, setKategoriAktif] = useState<string | null>(null);
  const [zona, setZona] = useState<Zona>("barang");
  const [sorotBarang, setSorotBarang] = useState(0);
  const [sorotKeranjang, setSorotKeranjang] = useState(0);
  const [bukaBayar, setBukaBayar] = useState(false);
  const [tanyaKosong, setTanyaKosong] = useState(false);
  const [metode, setMetode] = useState<string>("TUNAI");
  const [tunai, setTunai] = useState<number | "">("");
  const [diskon, setDiskon] = useState<number | "">("");
  const [catatan, setCatatan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [struk, setStruk] = useState<
    | { nomor: string; kodeNota: string; total: number; kembalian: number; metode: string }
    | null
  >(null);

  const kolomCari = useRef<HTMLInputElement>(null);
  const kisiRef = useRef<HTMLDivElement>(null);

  // ── Simpanan keranjang di perangkat ──
  useEffect(() => {
    try {
      const tersimpan = localStorage.getItem(KUNCI_SIMPANAN);
      if (tersimpan) {
        const isi = JSON.parse(tersimpan) as BarisKeranjang[];
        if (Array.isArray(isi) && isi.length > 0) {
          const segar = isi
            .map((b) => {
              const p = produk.find((x) => x.id === b.produkId);
              return p
                ? { ...b, nama: p.nama, harga: p.hargaJual, stok: p.stok, lacakStok: p.lacakStok }
                : null;
            })
            .filter((b): b is BarisKeranjang => b !== null);
          setKeranjang(segar);
        }
      }
    } catch {
      // Simpanan rusak — abaikan.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (keranjang.length > 0) localStorage.setItem(KUNCI_SIMPANAN, JSON.stringify(keranjang));
      else localStorage.removeItem(KUNCI_SIMPANAN);
    } catch {
      // Penyimpanan penuh / mode privat — abaikan.
    }
  }, [keranjang]);

  // ── Hitungan ──
  const subtotal = useMemo(
    () => keranjang.reduce((t, b) => t + b.harga * b.qty, 0),
    [keranjang],
  );
  const nilaiDiskon = Math.min(typeof diskon === "number" ? diskon : 0, subtotal);
  const setelahDiskon = subtotal - nilaiDiskon;
  const pajak = Math.round((setelahDiskon * persenPajak) / 100);
  const total = setelahDiskon + pajak;
  const nilaiTunai = typeof tunai === "number" ? tunai : 0;
  const kembalian = metode === "TUNAI" ? nilaiTunai - total : 0;
  const jumlahItem = keranjang.reduce((t, b) => t + b.qty, 0);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return produk.filter((p) => {
      if (kategoriAktif && p.kategoriId !== kategoriAktif) return false;
      if (!q) return true;
      return (
        p.nama.toLowerCase().includes(q) || (p.kode ? p.kode.toLowerCase().includes(q) : false)
      );
    });
  }, [produk, cari, kategoriAktif]);

  // Sorotan selalu berada di dalam rentang daftar yang sedang tampil.
  useEffect(() => {
    setSorotBarang((s) => (s >= tersaring.length ? 0 : s));
  }, [tersaring.length]);

  useEffect(() => {
    setSorotKeranjang((s) => Math.max(0, Math.min(s, keranjang.length - 1)));
  }, [keranjang.length]);

  // Keranjang kosong berarti tidak ada yang bisa disorot di zona keranjang.
  useEffect(() => {
    if (keranjang.length === 0 && zona === "keranjang") setZona("barang");
  }, [keranjang.length, zona]);

  // Gulirkan sorotan agar selalu terlihat.
  useEffect(() => {
    if (zona !== "barang") return;
    kisiRef.current
      ?.querySelector(`[data-indeks="${sorotBarang}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [sorotBarang, zona, tersaring.length]);

  useEffect(() => {
    if (zona !== "keranjang") return;
    document
      .querySelector(`[data-baris-keranjang="${sorotKeranjang}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [sorotKeranjang, zona]);

  // ── Aksi keranjang ──
  const tambah = useCallback((p: ProdukKasir, jumlah = 1) => {
    setGalat(null);
    setKeranjang((lama) => {
      const idx = lama.findIndex((b) => b.produkId === p.id);
      if (idx >= 0) {
        const baris = lama[idx];
        const qtyBaru = baris.qty + jumlah;
        if (p.lacakStok && qtyBaru > p.stok) {
          setGalat(`Stok ${p.nama} tinggal ${p.stok} ${p.satuan}.`);
          return lama;
        }
        const salin = [...lama];
        salin[idx] = { ...baris, qty: qtyBaru };
        return salin;
      }

      if (p.lacakStok && p.stok < jumlah) {
        setGalat(`${p.nama} sedang kosong.`);
        return lama;
      }

      return [
        ...lama,
        {
          produkId: p.id,
          nama: p.nama,
          satuan: p.satuan,
          harga: p.hargaJual,
          qty: jumlah,
          stok: p.stok,
          lacakStok: p.lacakStok,
        },
      ];
    });
  }, []);

  const ubahQty = useCallback((produkId: string, qtyBaru: number) => {
    setGalat(null);
    setKeranjang((lama) => {
      if (qtyBaru <= 0) return lama.filter((b) => b.produkId !== produkId);
      return lama.map((b) => {
        if (b.produkId !== produkId) return b;
        if (b.lacakStok && qtyBaru > b.stok) {
          setGalat(`Stok ${b.nama} tinggal ${b.stok} ${b.satuan}.`);
          return b;
        }
        return { ...b, qty: qtyBaru };
      });
    });
  }, []);

  const kosongkan = useCallback(() => {
    setKeranjang([]);
    setDiskon("");
    setCatatan("");
    setGalat(null);
    setTanyaKosong(false);
    setZona("barang");
  }, []);

  const fokusCari = useCallback(() => {
    kolomCari.current?.focus();
    kolomCari.current?.select();
  }, []);

  // ── Pintasan papan ketik kasir ──
  useEffect(() => {
    function tangani(e: KeyboardEvent) {
      // Dialog punya penangannya sendiri.
      if (bukaBayar || struk) return;

      // Kursor sedang di menu samping — biarkan kerangka yang mengurus.
      if (menuSampingAktif()) return;

      // Konfirmasi pengosongan keranjang.
      if (tanyaKosong) {
        if (e.key === "Enter") {
          e.preventDefault();
          kosongkan();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setTanyaKosong(false);
        }
        return;
      }

      // ── Perintah Alt + huruf ──
      if (altHuruf(e, "b")) {
        e.preventDefault();
        if (keranjang.length > 0) setBukaBayar(true);
        else setGalat("Keranjang masih kosong.");
        return;
      }

      if (altHuruf(e, "x")) {
        e.preventDefault();
        if (keranjang.length > 0) setTanyaKosong(true);
        return;
      }

      // Alt+K berpindah ke saringan kategori berikutnya.
      if (altHuruf(e, "k")) {
        e.preventDefault();
        if (kategori.length === 0) return;
        const urutan: Array<string | null> = [null, ...kategori.map((k) => k.id)];
        const posisi = urutan.indexOf(kategoriAktif);
        setKategoriAktif(urutan[(posisi + 1) % urutan.length]);
        setSorotBarang(0);
        setZona("barang");
        return;
      }

      // Sisa pintasan tidak memakai Alt sama sekali.
      if (adaPengubah(e) && !e.shiftKey) return;

      // ── Tab: pindah zona ──
      // Hanya dibajak saat pengguna memang sedang dalam alur kasir, yaitu
      // kursor di kolom pencarian atau sedang berada di zona keranjang.
      // Di luar itu Tab tetap berpindah fokus seperti biasa.
      if (e.key === "Tab") {
        const diCari = (e.target as HTMLElement | null)?.hasAttribute?.("data-cari-utama") === true;
        if (!diCari && zona !== "keranjang") return;

        e.preventDefault();
        if (zona === "barang") {
          if (keranjang.length === 0) {
            setGalat("Keranjang masih kosong.");
            return;
          }
          setZona("keranjang");
        } else {
          setZona("barang");
          fokusCari();
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (cari) {
          setCari("");
          fokusCari();
        } else if (zona === "keranjang") {
          setZona("barang");
          fokusCari();
        }
        return;
      }

      // ── Zona daftar barang ──
      if (zona === "barang") {
        const kolom = hitungKolom(kisiRef.current);

        if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "ArrowUp") {
          // Sudah mentok di kolom paling kiri → keluar ke menu samping.
          const diTepiKiri = tersaring.length === 0 || sorotBarang % kolom === 0;
          if (e.key === "ArrowLeft" && diTepiKiri) {
            e.preventDefault();
            masukMenuSamping();
            return;
          }

          if (tersaring.length === 0) return;
          e.preventDefault();

          const langkah =
            e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "ArrowDown" ? kolom : -kolom;

          setSorotBarang((s) => {
            const berikut = s + langkah;
            if (berikut < 0 || berikut >= tersaring.length) return s;
            return berikut;
          });
          return;
        }

        if (e.key === "Enter") {
          e.preventDefault();
          const pilihan = tersaring[sorotBarang];
          if (pilihan) {
            tambah(pilihan);
            // Kosongkan pencarian supaya barcode berikutnya langsung terbaca.
            if (cari) setCari("");
          }
          return;
        }
      }

      // ── Zona keranjang ──
      if (zona === "keranjang" && keranjang.length > 0) {
        const baris = keranjang[sorotKeranjang];

        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setSorotKeranjang((s) => Math.min(keranjang.length - 1, s + 1));
            return;
          case "ArrowUp":
            e.preventDefault();
            setSorotKeranjang((s) => Math.max(0, s - 1));
            return;
          case "ArrowRight":
            e.preventDefault();
            if (baris) ubahQty(baris.produkId, baris.qty + 1);
            return;
          case "ArrowLeft":
            e.preventDefault();
            if (baris) ubahQty(baris.produkId, baris.qty - 1);
            return;
          case "Delete":
            e.preventDefault();
            if (baris) ubahQty(baris.produkId, 0);
            return;
          case "Enter":
            e.preventDefault();
            setBukaBayar(true);
            return;
        }
      }
    }

    // Fase tangkap supaya halaman ini lebih dulu memutuskan nasib tombol
    // panah daripada penangan menu samping di kerangka aplikasi.
    window.addEventListener("keydown", tangani, true);
    return () => window.removeEventListener("keydown", tangani, true);
  }, [
    bukaBayar,
    struk,
    tanyaKosong,
    zona,
    cari,
    tersaring,
    sorotBarang,
    keranjang,
    sorotKeranjang,
    kategori,
    kategoriAktif,
    tambah,
    ubahQty,
    kosongkan,
    fokusCari,
  ]);

  // ── Simpan penjualan ──
  async function bayar() {
    if (keranjang.length === 0 || menyimpan) return;
    setMenyimpan(true);
    setGalat(null);

    const hasil: HasilCheckout = await simpanPenjualan({
      item: keranjang.map((b) => ({ produkId: b.produkId, qty: b.qty })),
      diskon: nilaiDiskon,
      metodeBayar: metode,
      dibayar: metode === "TUNAI" ? nilaiTunai : total,
      catatan: catatan || undefined,
    });

    setMenyimpan(false);

    if (!hasil.sukses) {
      setGalat(hasil.pesan);
      return;
    }

    setStruk({
      nomor: hasil.transaksi.nomor,
      kodeNota: hasil.transaksi.kodeNota,
      total: hasil.transaksi.total,
      kembalian: hasil.transaksi.kembalian,
      metode,
    });
    setBukaBayar(false);
    kosongkan();
    setTunai("");
    setMetode("TUNAI");
    router.refresh();
  }

  function transaksiBaru() {
    setStruk(null);
    setZona("barang");
    setTimeout(fokusCari, 50);
  }

  // ── Petunjuk bawah layar ──
  const petunjuk: Petunjuk[] =
    zona === "barang"
      ? [
          { tombol: ["↑", "↓", "←", "→"], aksi: "Pilih barang" },
          { tombol: ["Enter"], aksi: "Masukkan keranjang" },
          { tombol: ["Tab"], aksi: "Ke keranjang" },
          { tombol: ["Alt", "B"], aksi: "Bayar" },
          { tombol: ["Alt", "K"], aksi: "Kategori" },
          { tombol: ["←"], aksi: "Menu samping" },
        ]
      : [
          { tombol: ["↑", "↓"], aksi: "Pilih baris" },
          { tombol: ["←", "→"], aksi: "Jumlah" },
          { tombol: ["Del"], aksi: "Hapus baris" },
          { tombol: ["Enter"], aksi: "Bayar" },
          { tombol: ["Tab"], aksi: "Ke daftar barang" },
        ];

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:h-dvh">
      <div className="grid min-h-0 flex-1 grid-rows-[1fr_auto] lg:grid-cols-[1fr_380px] lg:grid-rows-1">
        {/* ── Panel barang ── */}
        <section
          className={cn(
            "flex min-h-0 flex-col border-r-2 transition-colors",
            zona === "barang" ? "border-r-merek/30" : "border-r-garis",
          )}
        >
          <div className="border-b border-garis bg-white px-4 py-3">
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-tinta-4">
                <Ikon nama="cari" size={17} />
              </span>
              <input
                ref={kolomCari}
                value={cari}
                onChange={(e) => {
                  setCari(e.target.value);
                  setZona("barang");
                  setSorotBarang(0);
                }}
                placeholder="Ketik nama barang atau pindai barcode…"
                className="h-11 w-full rounded-lg border border-garis-2 bg-kertas pr-4 pl-10 text-[14.5px] font-medium text-tinta placeholder:text-tinta-4 focus:border-merek focus:bg-white focus:ring-2 focus:ring-merek/15 focus:outline-none"
                autoFocus
                autoComplete="off"
                data-cari-utama
                aria-label="Cari barang"
              />
            </div>

            {kategori.length > 0 && (
              <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <span className="hidden shrink-0 items-center gap-1 pr-0.5 lg:flex">
                  <Kunci tombol={["Alt", "K"]} />
                </span>
                <button
                  type="button"
                  onClick={() => setKategoriAktif(null)}
                  className={cn(
                    "shrink-0 rounded-lg px-2.5 py-1.5 text-[12.5px] font-bold transition-colors",
                    kategoriAktif === null
                      ? "bg-tinta text-white"
                      : "bg-kertas-2 text-tinta-2 hover:bg-garis",
                  )}
                >
                  Semua
                </button>
                {kategori.map((kt) => (
                  <button
                    key={kt.id}
                    type="button"
                    onClick={() => setKategoriAktif(kt.id === kategoriAktif ? null : kt.id)}
                    className={cn(
                      "shrink-0 rounded-lg px-2.5 py-1.5 text-[12.5px] font-bold transition-colors",
                      kategoriAktif === kt.id
                        ? "bg-tinta text-white"
                        : "bg-kertas-2 text-tinta-2 hover:bg-garis",
                    )}
                  >
                    {kt.nama}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {tersaring.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <span className="flex size-12 items-center justify-center rounded-xl border border-dashed border-garis-2 text-tinta-4">
                  <Ikon nama="kotak" size={22} />
                </span>
                <div>
                  <p className="text-[15px] font-bold text-tinta-2">
                    {produk.length === 0 ? "Belum ada barang" : "Tidak ada yang cocok"}
                  </p>
                  <p className="mt-1 text-[13px] text-tinta-3">
                    {produk.length === 0
                      ? "Tambahkan barang dulu supaya bisa mulai jualan."
                      : `Tidak ada barang dengan kata "${cari}".`}
                  </p>
                </div>
                {produk.length === 0 && (
                  <Link
                    href="/app/produk"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-merek px-3.5 text-[13px] font-bold text-white"
                  >
                    <Ikon nama="tambah" size={15} />
                    Tambah barang
                  </Link>
                )}
              </div>
            ) : (
              <div
                ref={kisiRef}
                className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4"
                role="listbox"
                aria-label="Daftar barang"
              >
                {tersaring.map((p, i) => {
                  const habis = p.lacakStok && p.stok <= 0;
                  const diKeranjang = keranjang.find((b) => b.produkId === p.id)?.qty ?? 0;
                  const disorot = zona === "barang" && i === sorotBarang;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      data-indeks={i}
                      role="option"
                      aria-selected={disorot}
                      disabled={habis}
                      tabIndex={-1}
                      onClick={() => {
                        setZona("barang");
                        setSorotBarang(i);
                        tambah(p);
                      }}
                      className={cn(
                        "group relative flex flex-col rounded-xl border-2 bg-white p-3 text-left transition-all",
                        habis
                          ? "cursor-not-allowed border-garis opacity-55"
                          : "hover:-translate-y-px hover:shadow-[var(--shadow-naik)] active:translate-y-0",
                        disorot
                          ? "border-merek shadow-[0_0_0_3px_var(--color-merek-muda)]"
                          : "border-garis hover:border-merek/40",
                      )}
                    >
                      {diKeranjang > 0 && (
                        <span className="angka absolute -top-2 -right-2 flex min-w-[22px] items-center justify-center rounded-full bg-merek px-1 py-0.5 text-[11px] font-extrabold text-white shadow-sm">
                          {diKeranjang}
                        </span>
                      )}

                      <span className="line-clamp-2 min-h-[2.4em] text-[13.5px] leading-snug font-bold text-tinta">
                        {p.nama}
                      </span>

                      <span className="angka mt-1.5 text-[15px] font-extrabold text-merek">
                        {rupiah(p.hargaJual)}
                      </span>

                      <span className="mt-1 flex items-center gap-1 text-[11.5px] font-medium">
                        {!p.lacakStok ? (
                          <span className="text-tinta-4">Tanpa stok</span>
                        ) : habis ? (
                          <span className="font-bold text-merah">Habis</span>
                        ) : (
                          <span className={cn(p.stok <= 5 ? "text-kuning" : "text-tinta-4")}>
                            Sisa {p.stok} {p.satuan}
                          </span>
                        )}
                      </span>

                      {disorot && !habis && (
                        <span className="mt-1.5 hidden items-center gap-1 text-[10.5px] font-bold text-merek lg:flex">
                          <Kunci tombol={["Enter"]} />
                          tambah
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Panel keranjang ── */}
        <aside
          className={cn(
            "flex min-h-0 flex-col border-l-2 bg-white transition-colors lg:h-dvh",
            zona === "keranjang" ? "border-l-kuning/40" : "border-l-transparent",
          )}
        >
          <header className="hidden items-center justify-between border-b border-garis px-4 py-3.5 lg:flex">
            <div>
              <h1 className="flex items-center gap-2 text-[15px] font-extrabold tracking-[-0.01em]">
                Keranjang
                {zona === "keranjang" && (
                  <span className="rounded bg-kuning-muda px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-kuning uppercase">
                    aktif
                  </span>
                )}
              </h1>
              <p className="text-[12px] text-tinta-3">
                {jumlahItem > 0 ? `${jumlahItem} barang` : "Belum ada barang"}
              </p>
            </div>
            {keranjang.length > 0 && (
              <button
                type="button"
                onClick={() => setTanyaKosong(true)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12.5px] font-bold text-tinta-3 hover:bg-merah-muda hover:text-merah"
              >
                <Ikon nama="sampah" size={13} />
                Kosongkan
                <Kunci tombol={["Alt", "X"]} />
              </button>
            )}
          </header>

          <div className="hidden min-h-0 flex-1 overflow-y-auto lg:block">
            {keranjang.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-xl border border-dashed border-garis-2 text-tinta-4">
                  <Ikon nama="keranjang" size={22} />
                </span>
                <p className="mt-3 text-[14px] font-bold text-tinta-2">Keranjang kosong</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-tinta-3">
                  Ketik nama barang lalu tekan <Kunci tombol={["Enter"]} />
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-garis">
                {keranjang.map((b, i) => {
                  const disorot = zona === "keranjang" && i === sorotKeranjang;
                  return (
                    <li
                      key={b.produkId}
                      data-baris-keranjang={i}
                      onClick={() => {
                        setZona("keranjang");
                        setSorotKeranjang(i);
                      }}
                      className={cn(
                        "flex items-start gap-2.5 border-l-[3px] px-4 py-3 transition-colors",
                        disorot
                          ? "border-l-kuning bg-kuning-muda/45"
                          : "border-l-transparent hover:bg-kertas/60",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold text-tinta">{b.nama}</p>
                        <p className="angka mt-0.5 text-[12px] text-tinta-3">
                          {rupiah(b.harga)} × {b.qty} {b.satuan}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => ubahQty(b.produkId, b.qty - 1)}
                          className="flex size-7 items-center justify-center rounded-md border border-garis-2 text-tinta-2 hover:bg-kertas-2"
                          aria-label={`Kurangi ${b.nama}`}
                          tabIndex={-1}
                        >
                          <span className="text-[15px] leading-none font-bold">−</span>
                        </button>
                        <input
                          value={b.qty}
                          onChange={(e) => {
                            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                            ubahQty(b.produkId, Number.isFinite(n) ? n : 0);
                          }}
                          inputMode="numeric"
                          className="angka h-7 w-9 rounded-md border border-garis-2 text-center text-[13px] font-bold focus:border-merek focus:outline-none"
                          aria-label={`Jumlah ${b.nama}`}
                          tabIndex={-1}
                        />
                        <button
                          type="button"
                          onClick={() => ubahQty(b.produkId, b.qty + 1)}
                          className="flex size-7 items-center justify-center rounded-md border border-garis-2 text-tinta-2 hover:bg-kertas-2"
                          aria-label={`Tambah ${b.nama}`}
                          tabIndex={-1}
                        >
                          <span className="text-[15px] leading-none font-bold">+</span>
                        </button>
                      </div>

                      <span className="angka w-20 shrink-0 text-right text-[13.5px] font-extrabold text-tinta">
                        {rupiah(b.harga * b.qty)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {galat && (
            <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-merah-garis bg-merah-muda px-3 py-2 text-[12.5px] font-semibold text-merah">
              <Ikon nama="peringatan" size={14} className="mt-0.5" />
              {galat}
            </div>
          )}

          <div className="border-t border-garis bg-kertas p-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[13px] text-tinta-2">
                <span>Subtotal ({jumlahItem} barang)</span>
                <span className="angka font-semibold">{rupiah(subtotal)}</span>
              </div>
              {nilaiDiskon > 0 && (
                <div className="flex justify-between text-[13px] text-merah">
                  <span>Diskon</span>
                  <span className="angka font-semibold">−{rupiah(nilaiDiskon)}</span>
                </div>
              )}
              {pajak > 0 && (
                <div className="flex justify-between text-[13px] text-tinta-2">
                  <span>Pajak {persenPajak}%</span>
                  <span className="angka font-semibold">{rupiah(pajak)}</span>
                </div>
              )}
              <div className="garis-nota my-2" />
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-bold text-tinta-2">TOTAL</span>
                <span className="angka text-[24px] leading-none font-extrabold tracking-[-0.02em] text-tinta">
                  {rupiah(total)}
                </span>
              </div>
            </div>

            <Tombol
              ukuran="besar"
              penuh
              className="mt-3.5"
              disabled={keranjang.length === 0}
              onClick={() => setBukaBayar(true)}
            >
              Bayar
              <span className="ml-1 hidden rounded bg-white/15 px-1.5 py-0.5 text-[10.5px] font-bold lg:inline">
                Alt + B
              </span>
            </Tombol>
          </div>
        </aside>
      </div>

      <BarPetunjuk petunjuk={petunjuk} zona={zona} />

      {/* ── Konfirmasi kosongkan ── */}
      {tanyaKosong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/50 p-4 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            className="animasi-naik w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl"
          >
            <p className="text-[15px] font-extrabold text-tinta">Kosongkan keranjang?</p>
            <p className="mt-1 text-[13px] leading-relaxed text-tinta-2">
              {jumlahItem} barang akan dikeluarkan dari keranjang.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setTanyaKosong(false)}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-garis-2 bg-white text-sm font-semibold text-tinta hover:bg-kertas-2"
              >
                Batal
                <Kunci tombol={["Esc"]} />
              </button>
              <button
                type="button"
                onClick={kosongkan}
                autoFocus
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-merah text-sm font-semibold text-white hover:bg-merah/90"
              >
                Kosongkan
                <Kunci tombol={["Enter"]} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog pembayaran ── */}
      {bukaBayar && (
        <DialogBayar
          total={total}
          subtotal={subtotal}
          pajak={pajak}
          persenPajak={persenPajak}
          diskon={diskon}
          setDiskon={setDiskon}
          metode={metode}
          setMetode={setMetode}
          tunai={tunai}
          setTunai={setTunai}
          catatan={catatan}
          setCatatan={setCatatan}
          kembalian={kembalian}
          menyimpan={menyimpan}
          galat={galat}
          onTutup={() => {
            setBukaBayar(false);
            setTimeout(fokusCari, 50);
          }}
          onBayar={bayar}
        />
      )}

      {/* ── Struk setelah berhasil ── */}
      {struk && <DialogStruk struk={struk} namaToko={namaToko} onSelesai={transaksiBaru} />}
    </div>
  );
}

/** Jumlah kolom kisi yang sedang dipakai, dibaca dari CSS agar ikut responsif. */
function hitungKolom(el: HTMLElement | null): number {
  if (!el) return 1;
  const template = window.getComputedStyle(el).gridTemplateColumns;
  const jumlah = template.split(" ").filter(Boolean).length;
  return Math.max(1, jumlah);
}

// ── Dialog pembayaran ───────────────────────────────────────────────────────

function DialogBayar({
  total,
  subtotal,
  pajak,
  persenPajak,
  diskon,
  setDiskon,
  metode,
  setMetode,
  tunai,
  setTunai,
  catatan,
  setCatatan,
  kembalian,
  menyimpan,
  galat,
  onTutup,
  onBayar,
}: {
  total: number;
  subtotal: number;
  pajak: number;
  persenPajak: number;
  diskon: number | "";
  setDiskon: (n: number | "") => void;
  metode: string;
  setMetode: (m: string) => void;
  tunai: number | "";
  setTunai: (n: number | "") => void;
  catatan: string;
  setCatatan: (s: string) => void;
  kembalian: number;
  menyimpan: boolean;
  galat: string | null;
  onTutup: () => void;
  onBayar: () => void;
}) {
  const kolomTunai = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => kolomTunai.current?.focus(), 60);
  }, []);

  const saran = useMemo(() => {
    const set = new Set<number>([total]);
    for (const kelipatan of [1000, 5000, 10_000, 50_000, 100_000]) {
      const naik = Math.ceil(total / kelipatan) * kelipatan;
      if (naik >= total) set.add(naik);
    }
    for (const lembar of [10_000, 20_000, 50_000, 100_000]) {
      if (lembar >= total) set.add(lembar);
    }
    return [...set].sort((a, b) => a - b).slice(0, 5);
  }, [total]);

  const kurang = metode === "TUNAI" && (typeof tunai !== "number" || tunai < total);

  // Pintasan khusus dialog. Huruf tetap aktif saat kursor di kolom uang
  // karena kolom itu hanya menerima angka.
  useEffect(() => {
    function tangani(e: KeyboardEvent) {
      const sasaran = e.target as HTMLElement | null;
      const diKolomUang = sasaran?.dataset?.uang === "1";
      const bolehHuruf = diKolomUang || !dalamIsian(sasaran);

      if (e.key === "Escape") {
        e.preventDefault();
        onTutup();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (!kurang && !menyimpan) onBayar();
        return;
      }

      if (!bolehHuruf) return;

      for (const m of METODE) {
        if (hurufTunggal(e, m.tombol)) {
          e.preventDefault();
          setMetode(m.nilai);
          return;
        }
      }

      if (hurufTunggal(e, "p")) {
        e.preventDefault();
        setTunai(total);
        return;
      }

      // Panah memilih saran pecahan uang.
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const posisi = saran.indexOf(typeof tunai === "number" ? tunai : -1);
        const berikut =
          e.key === "ArrowDown"
            ? Math.min(saran.length - 1, posisi + 1)
            : Math.max(0, (posisi < 0 ? saran.length : posisi) - 1);
        setTunai(saran[berikut]);
      }
    }

    window.addEventListener("keydown", tangani);
    return () => window.removeEventListener("keydown", tangani);
  }, [kurang, menyimpan, onBayar, onTutup, saran, setMetode, setTunai, total, tunai]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div
        className="animasi-naik flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Pembayaran"
      >
        <header className="flex items-center justify-between border-b border-garis px-5 py-3.5">
          <h2 className="text-[16px] font-extrabold tracking-[-0.015em]">Pembayaran</h2>
          <button
            type="button"
            onClick={onTutup}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-bold text-tinta-3 hover:bg-kertas-2"
            aria-label="Tutup"
          >
            <Kunci tombol={["Esc"]} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="rounded-xl bg-kertas p-4 text-center">
            <p className="text-[11px] font-bold tracking-[0.08em] text-tinta-3 uppercase">
              Total tagihan
            </p>
            <p className="angka mt-1 text-[34px] leading-none font-extrabold tracking-[-0.03em] text-tinta">
              {rupiah(total)}
            </p>
            {(pajak > 0 || (typeof diskon === "number" && diskon > 0)) && (
              <p className="angka mt-1.5 text-[12px] text-tinta-3">
                Subtotal {rupiah(subtotal)}
                {typeof diskon === "number" && diskon > 0 && ` − diskon ${rupiah(diskon)}`}
                {pajak > 0 && ` + pajak ${persenPajak}%`}
              </p>
            )}
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-[12.5px] font-bold text-tinta-2">Metode bayar</p>
            <div className="grid grid-cols-4 gap-1.5">
              {METODE.map((m) => (
                <button
                  key={m.nilai}
                  type="button"
                  onClick={() => setMetode(m.nilai)}
                  tabIndex={-1}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border py-2 text-[12.5px] font-bold transition-colors",
                    metode === m.nilai
                      ? "border-merek bg-merek-muda text-merek-tua"
                      : "border-garis-2 text-tinta-2 hover:bg-kertas-2",
                  )}
                >
                  {m.label}
                  <Kunci tombol={[m.tombol]} />
                </button>
              ))}
            </div>
          </div>

          {metode === "TUNAI" && (
            <div className="mt-4">
              <label htmlFor="tunai" className="mb-1.5 block text-[12.5px] font-bold text-tinta-2">
                Uang diterima
              </label>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-[14px] font-bold text-tinta-4">
                  Rp
                </span>
                <input
                  ref={kolomTunai}
                  id="tunai"
                  data-uang="1"
                  value={tunai === "" ? "" : tunai.toLocaleString("id-ID")}
                  onChange={(e) => {
                    const bersih = e.target.value.replace(/\D/g, "");
                    setTunai(bersih === "" ? "" : parseInt(bersih, 10));
                  }}
                  inputMode="numeric"
                  placeholder="0"
                  className="angka h-14 w-full rounded-xl border border-garis-2 bg-white pr-4 pl-11 text-right text-[24px] font-extrabold tracking-[-0.02em] focus:border-merek focus:ring-2 focus:ring-merek/15 focus:outline-none"
                  autoComplete="off"
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {saran.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTunai(n)}
                    tabIndex={-1}
                    className={cn(
                      "angka inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-bold transition-colors",
                      tunai === n
                        ? "border-merek bg-merek-muda text-merek-tua"
                        : "border-garis-2 text-tinta-2 hover:bg-kertas-2",
                    )}
                  >
                    {n === total ? "Uang pas" : rupiah(n)}
                    {n === total && <Kunci tombol={["P"]} />}
                  </button>
                ))}
                <span className="ml-auto hidden items-center gap-1 text-[11px] text-tinta-4 lg:flex">
                  <Kunci tombol={["↑", "↓"]} />
                  pilih
                </span>
              </div>

              {typeof tunai === "number" && tunai > 0 && (
                <div
                  className={cn(
                    "mt-3 flex items-center justify-between rounded-xl px-4 py-3",
                    kurang ? "bg-merah-muda" : "bg-hijau-muda",
                  )}
                >
                  <span className={cn("text-[13px] font-bold", kurang ? "text-merah" : "text-hijau")}>
                    {kurang ? "Masih kurang" : "Kembalian"}
                  </span>
                  <span
                    className={cn(
                      "angka text-[20px] font-extrabold tracking-[-0.02em]",
                      kurang ? "text-merah" : "text-hijau",
                    )}
                  >
                    {rupiah(Math.abs(kembalian))}
                  </span>
                </div>
              )}
            </div>
          )}

          <details className="group mt-4">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[12.5px] font-bold text-tinta-3 marker:hidden hover:text-tinta-2">
              <Ikon nama="kanan" size={12} className="transition-transform group-open:rotate-90" />
              Diskon &amp; catatan
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="diskon" className="mb-1 block text-[12px] font-semibold text-tinta-3">
                  Diskon (Rp)
                </label>
                <input
                  id="diskon"
                  value={diskon === "" ? "" : diskon.toLocaleString("id-ID")}
                  onChange={(e) => {
                    const bersih = e.target.value.replace(/\D/g, "");
                    setDiskon(bersih === "" ? "" : parseInt(bersih, 10));
                  }}
                  inputMode="numeric"
                  placeholder="0"
                  className="angka h-10 w-full rounded-lg border border-garis-2 px-3 text-[14px] font-semibold focus:border-merek focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="catatan" className="mb-1 block text-[12px] font-semibold text-tinta-3">
                  Catatan
                </label>
                <input
                  id="catatan"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="mis. pesanan Bu Rina"
                  maxLength={200}
                  className="h-10 w-full rounded-lg border border-garis-2 px-3 text-[14px] focus:border-merek focus:outline-none"
                />
              </div>
            </div>
          </details>

          {galat && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-merah-garis bg-merah-muda px-3 py-2 text-[12.5px] font-semibold text-merah">
              <Ikon nama="peringatan" size={14} className="mt-0.5" />
              {galat}
            </div>
          )}
        </div>

        <footer className="border-t border-garis bg-kertas p-4">
          <Tombol
            ukuran="besar"
            penuh
            disabled={kurang || menyimpan}
            onClick={onBayar}
            ikon={menyimpan ? undefined : "centang"}
          >
            {menyimpan ? "Menyimpan…" : `Selesaikan · ${rupiah(total)}`}
            {!menyimpan && (
              <span className="ml-1 hidden rounded bg-white/15 px-1.5 py-0.5 text-[10.5px] font-bold lg:inline">
                Enter
              </span>
            )}
          </Tombol>
        </footer>
      </div>
    </div>
  );
}

// ── Struk berhasil ──────────────────────────────────────────────────────────

function DialogStruk({
  struk,
  namaToko,
  onSelesai,
}: {
  struk: { nomor: string; kodeNota: string; total: number; kembalian: number; metode: string };
  namaToko: string;
  onSelesai: () => void;
}) {
  const [tautan, setTautan] = useState("");
  const [tersalin, setTersalin] = useState(false);

  useEffect(() => {
    setTautan(`${window.location.origin}/nota/${struk.kodeNota}`);
  }, [struk.kodeNota]);

  const pesanWa = encodeURIComponent(
    `Terima kasih sudah belanja di ${namaToko}!\n\nNota ${struk.nomor}\nTotal: ${rupiah(struk.total)}\n\nLihat nota digital:\n${tautan}`,
  );

  const salin = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tautan);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      setTersalin(false);
    }
  }, [tautan]);

  useEffect(() => {
    function tangani(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        onSelesai();
        return;
      }
      if (dalamIsian(e.target)) return;

      if (hurufTunggal(e, "n")) {
        e.preventDefault();
        window.open(`/nota/${struk.kodeNota}`, "_blank", "noreferrer");
      } else if (hurufTunggal(e, "w")) {
        e.preventDefault();
        window.open(`https://wa.me/?text=${pesanWa}`, "_blank", "noreferrer");
      } else if (hurufTunggal(e, "s")) {
        e.preventDefault();
        void salin();
      }
    }

    window.addEventListener("keydown", tangani);
    return () => window.removeEventListener("keydown", tangani);
  }, [onSelesai, pesanWa, salin, struk.kodeNota]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/55 p-4 backdrop-blur-[2px]">
      <div
        className="animasi-naik w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col items-center px-6 pt-7 pb-5 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-hijau-muda text-hijau">
            <Ikon nama="centang" size={28} />
          </span>
          <h2 className="mt-3.5 text-[19px] font-extrabold tracking-[-0.02em]">
            Transaksi tersimpan
          </h2>
          <p className="angka mt-0.5 text-[12.5px] text-tinta-3">{struk.nomor}</p>

          <div className="mt-4 w-full rounded-xl bg-kertas p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-tinta-2">Total</span>
              <span className="angka text-[17px] font-extrabold">{rupiah(struk.total)}</span>
            </div>
            {struk.metode === "TUNAI" && (
              <>
                <div className="garis-nota my-2.5" />
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] font-bold text-hijau">Kembalian</span>
                  <span className="angka text-[22px] font-extrabold tracking-[-0.02em] text-hijau">
                    {rupiah(struk.kembalian)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 border-t border-garis px-4 py-3">
          <a
            href={`/nota/${struk.kodeNota}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1 rounded-lg py-2.5 text-[11.5px] font-bold text-tinta-2 transition-colors hover:bg-kertas-2"
          >
            <Ikon nama="nota" size={17} />
            Lihat nota
            <Kunci tombol={["N"]} />
          </a>
          <a
            href={`https://wa.me/?text=${pesanWa}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1 rounded-lg py-2.5 text-[11.5px] font-bold text-tinta-2 transition-colors hover:bg-kertas-2"
          >
            <Ikon nama="wa" size={17} />
            Kirim WA
            <Kunci tombol={["W"]} />
          </a>
          <button
            type="button"
            onClick={salin}
            className="flex flex-col items-center gap-1 rounded-lg py-2.5 text-[11.5px] font-bold text-tinta-2 transition-colors hover:bg-kertas-2"
          >
            <Ikon nama={tersalin ? "centang" : "salin"} size={17} />
            {tersalin ? "Tersalin" : "Salin tautan"}
            <Kunci tombol={["S"]} />
          </button>
        </div>

        <div className="border-t border-garis p-4">
          <Tombol ukuran="besar" penuh onClick={onSelesai} autoFocus>
            Transaksi baru
            <span className="ml-1 hidden rounded bg-white/15 px-1.5 py-0.5 text-[10.5px] font-bold lg:inline">
              Enter
            </span>
          </Tombol>
        </div>
      </div>
    </div>
  );
}
