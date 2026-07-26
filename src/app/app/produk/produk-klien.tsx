"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ikon } from "@/components/ikon";
import { Modal, Konfirmasi } from "@/components/modal";
import {
  Bidang,
  Kolom,
  Kosong,
  Kunci,
  Lencana,
  Peringatan,
  Pilih,
  Tabel,
  Td,
  Th,
  Tombol,
} from "@/components/ui";
import { BarPetunjukHalaman } from "@/components/navigasi-daftar";
import { masukMenuSamping } from "@/components/pintasan-global";
import {
  adaPengubah,
  altHuruf,
  dalamIsian,
  hurufTunggal,
  kursorMasihBisaKeKiri,
  menuSampingAktif,
} from "@/lib/pintasan";
import { rupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  hapusProduk,
  simpanKategori,
  simpanProduk,
  ubahAktifProduk,
  type HasilAksi,
} from "@/actions/produk";

export type BarisProduk = {
  id: string;
  nama: string;
  kode: string | null;
  satuan: string;
  hargaJual: number;
  hargaModal: number;
  stok: number;
  stokMinimum: number;
  lacakStok: boolean;
  aktif: boolean;
  kategoriId: string | null;
  kategoriNama: string | null;
  pernahTerjual: boolean;
};

export type KategoriPilihan = { id: string; nama: string; warna: string; jumlah: number };

const AWAL: HasilAksi = {};

export function ProdukKlien({
  produk,
  kategori,
  batasProduk,
  paketAktif,
}: {
  produk: BarisProduk[];
  kategori: KategoriPilihan[];
  batasProduk: number;
  paketAktif: string;
}) {
  const router = useRouter();
  const [cari, setCari] = useState("");
  const [saringKategori, setSaringKategori] = useState<string>("");
  const [tampilArsip, setTampilArsip] = useState(false);
  const [sedangEdit, setSedangEdit] = useState<BarisProduk | null>(null);
  const [bukaForm, setBukaForm] = useState(false);
  const [bukaKategori, setBukaKategori] = useState(false);
  const [akanHapus, setAkanHapus] = useState<BarisProduk | null>(null);
  const [kabar, setKabar] = useState<string | null>(null);
  const [sorot, setSorot] = useState(-1);
  const [proses, mulaiProses] = useTransition();
  const kolomKategori = useRef<HTMLSelectElement>(null);

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return produk.filter((p) => {
      if (!tampilArsip && !p.aktif) return false;
      if (saringKategori && p.kategoriId !== saringKategori) return false;
      if (!q) return true;
      return p.nama.toLowerCase().includes(q) || (p.kode ?? "").toLowerCase().includes(q);
    });
  }, [produk, cari, saringKategori, tampilArsip]);

  const jumlahAktif = produk.filter((p) => p.aktif).length;
  const sisaKuota = Number.isFinite(batasProduk) ? batasProduk - produk.length : Infinity;
  const kuotaHabis = sisaKuota <= 0;

  useEffect(() => {
    if (!kabar) return;
    const t = setTimeout(() => setKabar(null), 4000);
    return () => clearTimeout(t);
  }, [kabar]);

  // Sorotan direset setiap kali daftar berubah karena pencarian/saringan.
  useEffect(() => {
    setSorot(-1);
  }, [cari, saringKategori, tampilArsip]);

  // ── Pintasan papan ketik daftar barang ──
  useEffect(() => {
    // Saat dialog terbuka, dialog itu yang memegang papan ketik.
    if (bukaForm || bukaKategori || akanHapus) return;

    function tangani(e: KeyboardEvent) {
      if (adaPengubah(e) || menuSampingAktif()) return;

      const sasaran = e.target as HTMLElement | null;
      const diCariUtama = sasaran?.hasAttribute?.("data-cari-utama") === true;
      if (dalamIsian(sasaran) && !diCariUtama) return;

      if (e.key === "ArrowDown") {
        if (tersaring.length === 0) return;
        e.preventDefault();
        setSorot((s) => Math.min(tersaring.length - 1, s + 1));
        return;
      }
      if (e.key === "ArrowUp") {
        if (tersaring.length === 0) return;
        e.preventDefault();
        setSorot((s) => Math.max(0, s - 1));
        return;
      }
      if (e.key === "Enter" && sorot >= 0 && tersaring[sorot]) {
        e.preventDefault();
        bukaUbah(tersaring[sorot]);
        return;
      }
      if (e.key === "Escape" && sorot >= 0) {
        e.preventDefault();
        setSorot(-1);
        return;
      }
      if (e.key === "Delete" && sorot >= 0 && tersaring[sorot]) {
        e.preventDefault();
        setAkanHapus(tersaring[sorot]);
        return;
      }

      // Halaman ini tidak punya navigasi kiri-kanan, jadi ← langsung
      // memindahkan kursor ke menu samping.
      if (e.key === "ArrowLeft" && !kursorMasihBisaKeKiri(sasaran)) {
        e.preventDefault();
        masukMenuSamping();
        return;
      }

      if (dalamIsian(sasaran)) return;

      if (hurufTunggal(e, "n") && !kuotaHabis) {
        e.preventDefault();
        bukaTambah();
      }
    }

    function tanganiAlt(e: KeyboardEvent) {
      if (bukaForm || bukaKategori || akanHapus) return;

      // Alt+K melompat ke saringan kategori dan langsung membukanya.
      if (altHuruf(e, "k")) {
        e.preventDefault();
        const el = kolomKategori.current;
        el?.focus();
        // showPicker langsung membuka daftar pilihan di peramban yang mendukung.
        (el as unknown as { showPicker?: () => void })?.showPicker?.();
      }
    }

    // Fase tangkap agar halaman ini lebih dulu memutuskan nasib tombol panah
    // daripada penangan menu samping di kerangka aplikasi.
    window.addEventListener("keydown", tangani, true);
    window.addEventListener("keydown", tanganiAlt, true);
    return () => {
      window.removeEventListener("keydown", tangani, true);
      window.removeEventListener("keydown", tanganiAlt, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bukaForm, bukaKategori, akanHapus, tersaring, sorot, kuotaHabis]);

  // Jaga baris tersorot tetap terlihat.
  useEffect(() => {
    if (sorot < 0) return;
    document.querySelector(`[data-baris="${sorot}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sorot]);

  function bukaTambah() {
    setSedangEdit(null);
    setBukaForm(true);
  }

  function bukaUbah(p: BarisProduk) {
    setSedangEdit(p);
    setBukaForm(true);
  }

  function konfirmasiHapus() {
    if (!akanHapus) return;
    const target = akanHapus;
    mulaiProses(async () => {
      const hasil = await hapusProduk(target.id);
      setAkanHapus(null);
      setKabar(hasil.pesan ?? null);
      router.refresh();
    });
  }

  function alihkanAktif(p: BarisProduk) {
    mulaiProses(async () => {
      const hasil = await ubahAktifProduk(p.id, !p.aktif);
      setKabar(hasil.pesan ?? null);
      router.refresh();
    });
  }

  return (
    <>
      {kabar && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2">
          <div className="animasi-naik flex items-center gap-2 rounded-lg border border-garis bg-white px-4 py-2.5 text-[13px] font-semibold text-tinta shadow-[var(--shadow-melayang)]">
            <Ikon nama="centang" size={15} className="text-hijau" />
            {kabar}
          </div>
        </div>
      )}

      {/* Bar alat — pencarian dan saringan sejajar agar mudah dijangkau Tab */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <label
            htmlFor="cari-barang"
            className="mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.06em] text-tinta-3 uppercase"
          >
            Cari
            <Kunci tombol={["/"]} className="hidden lg:inline-flex" />
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-tinta-4">
              <Ikon nama="cari" size={16} />
            </span>
            <input
              id="cari-barang"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Nama atau kode barang…"
              data-cari-utama
              aria-label="Cari barang"
              className="h-10 w-full rounded-lg border border-garis-2 bg-white pr-3 pl-9 text-sm placeholder:text-tinta-4 focus:border-merek focus:ring-2 focus:ring-merek/15 focus:outline-none"
            />
          </div>
        </div>

        <div className="w-[210px]">
          <label
            htmlFor="saring-kategori"
            className="mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.06em] text-tinta-3 uppercase"
          >
            Kategori
            <Kunci tombol={["Alt", "K"]} className="hidden lg:inline-flex" />
          </label>
          <Pilih
            id="saring-kategori"
            ref={kolomKategori}
            value={saringKategori}
            onChange={(e) => setSaringKategori(e.target.value)}
          >
            <option value="">Semua kategori</option>
            {kategori.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama} ({k.jumlah})
              </option>
            ))}
          </Pilih>
        </div>

        <Tombol varian="kedua" ikon="gerigi" onClick={() => setBukaKategori(true)}>
          Kelola kategori
        </Tombol>

        <Tombol ikon="tambah" onClick={bukaTambah} disabled={kuotaHabis}>
          Tambah barang
          <Kunci tombol={["N"]} className="ml-1 hidden lg:inline-flex" />
        </Tombol>
      </div>

      {kuotaHabis && (
        <Peringatan nada="waspada" className="mt-3" judul="Kuota barang penuh">
          Paket {paketAktif === "PRO" ? "Pro" : "Gratis"} dibatasi {batasProduk} barang. Upgrade ke
          Pro untuk menambah barang tanpa batas.
        </Peringatan>
      )}

      {/* Ringkasan kecil */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-tinta-3">
        <span>
          <strong className="angka font-bold text-tinta-2">{jumlahAktif}</strong> barang aktif
        </span>
        {Number.isFinite(batasProduk) && (
          <span>
            Kuota terpakai{" "}
            <strong className="angka font-bold text-tinta-2">
              {produk.length}/{batasProduk}
            </strong>
          </span>
        )}
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 font-semibold">
          <input
            type="checkbox"
            checked={tampilArsip}
            onChange={(e) => setTampilArsip(e.target.checked)}
            className="size-3.5 accent-[var(--color-merek)]"
          />
          Tampilkan arsip
        </label>
      </div>

      {/* Tabel */}
      <div className="kartu mt-3 overflow-hidden">
        {tersaring.length === 0 ? (
          <Kosong
            judul={produk.length === 0 ? "Belum ada barang" : "Tidak ada yang cocok"}
            pesan={
              produk.length === 0
                ? "Tambahkan barang jualanmu supaya bisa mulai mencatat penjualan."
                : "Coba ubah kata pencarian atau saringan kategori."
            }
            aksi={
              produk.length === 0 ? (
                <Tombol ikon="tambah" onClick={bukaTambah}>
                  Tambah barang pertama
                </Tombol>
              ) : undefined
            }
          />
        ) : (
          <Tabel>
            <thead>
              <tr>
                <Th>Barang</Th>
                <Th kanan>Harga jual</Th>
                <Th kanan className="hidden sm:table-cell">Modal</Th>
                <Th kanan className="hidden md:table-cell">Untung</Th>
                <Th kanan>Stok</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {tersaring.map((p, i) => {
                const untung = p.hargaJual - p.hargaModal;
                const margin = p.hargaJual > 0 ? Math.round((untung / p.hargaJual) * 100) : 0;
                const stokRendah = p.lacakStok && p.stok <= p.stokMinimum;

                return (
                  <tr
                    key={p.id}
                    data-baris={i}
                    data-sorot={i === sorot ? "true" : undefined}
                    onClick={() => setSorot(i)}
                    className={cn("group hover:bg-kertas/60", !p.aktif && "opacity-60")}
                  >
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-bold text-tinta">{p.nama}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-tinta-3">
                            {p.kode && <span className="angka">{p.kode}</span>}
                            {p.kode && p.kategoriNama && <span>·</span>}
                            {p.kategoriNama && <span>{p.kategoriNama}</span>}
                            {!p.aktif && <Lencana nada="netral">Arsip</Lencana>}
                          </p>
                        </div>
                      </div>
                    </Td>

                    <Td kanan>
                      <span className="angka text-[13.5px] font-bold text-tinta">
                        {rupiah(p.hargaJual)}
                      </span>
                    </Td>

                    <Td kanan className="hidden sm:table-cell">
                      <span className="angka text-[13px] text-tinta-3">
                        {p.hargaModal > 0 ? rupiah(p.hargaModal) : "—"}
                      </span>
                    </Td>

                    <Td kanan className="hidden md:table-cell">
                      {p.hargaModal > 0 ? (
                        <span
                          className={cn(
                            "angka text-[13px] font-semibold",
                            untung > 0 ? "text-hijau" : "text-merah",
                          )}
                        >
                          {rupiah(untung)}
                          <span className="ml-1 text-[11px] font-medium opacity-70">{margin}%</span>
                        </span>
                      ) : (
                        <span className="text-[12px] text-tinta-4">belum diisi</span>
                      )}
                    </Td>

                    <Td kanan>
                      {!p.lacakStok ? (
                        <span className="text-[12px] text-tinta-4">tanpa stok</span>
                      ) : (
                        <span
                          className={cn(
                            "angka text-[13.5px] font-bold",
                            p.stok <= 0 ? "text-merah" : stokRendah ? "text-kuning" : "text-tinta",
                          )}
                        >
                          {p.stok}
                          <span className="ml-0.5 text-[11px] font-medium text-tinta-4">
                            {p.satuan}
                          </span>
                        </span>
                      )}
                    </Td>

                    <Td>
                      <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => bukaUbah(p)}
                          className="flex size-7 items-center justify-center rounded-md text-tinta-3 hover:bg-kertas-2 hover:text-tinta"
                          aria-label={`Ubah ${p.nama}`}
                          title="Ubah"
                        >
                          <Ikon nama="pensil" size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => alihkanAktif(p)}
                          disabled={proses}
                          className="flex size-7 items-center justify-center rounded-md text-tinta-3 hover:bg-kertas-2 hover:text-tinta"
                          aria-label={p.aktif ? `Arsipkan ${p.nama}` : `Aktifkan ${p.nama}`}
                          title={p.aktif ? "Arsipkan" : "Aktifkan"}
                        >
                          <Ikon nama={p.aktif ? "kotak" : "centang"} size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAkanHapus(p)}
                          className="flex size-7 items-center justify-center rounded-md text-tinta-3 hover:bg-merah-muda hover:text-merah"
                          aria-label={`Hapus ${p.nama}`}
                          title="Hapus"
                        >
                          <Ikon nama="sampah" size={14} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabel>
        )}
      </div>

      <FormProduk
        buka={bukaForm}
        onTutup={() => setBukaForm(false)}
        produk={sedangEdit}
        kategori={kategori}
        onSelesai={(pesan) => {
          setBukaForm(false);
          setKabar(pesan);
          router.refresh();
        }}
      />

      <DialogKategori
        buka={bukaKategori}
        onTutup={() => setBukaKategori(false)}
        kategori={kategori}
        onSelesai={(pesan) => {
          setKabar(pesan);
          router.refresh();
        }}
      />

      <Konfirmasi
        buka={!!akanHapus}
        onTutup={() => setAkanHapus(null)}
        onSetuju={konfirmasiHapus}
        sedangProses={proses}
        judul={`Hapus ${akanHapus?.nama ?? "barang"}?`}
        pesan={
          akanHapus?.pernahTerjual
            ? "Barang ini sudah punya riwayat penjualan, jadi hanya akan diarsipkan agar laporan lama tetap benar."
            : "Barang akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
        }
        labelSetuju={akanHapus?.pernahTerjual ? "Arsipkan" : "Hapus"}
      />

      <BarPetunjukHalaman
        petunjuk={[
          { tombol: ["↑", "↓"], aksi: "Pilih barang" },
          { tombol: ["Enter"], aksi: "Ubah" },
          { tombol: ["Del"], aksi: "Hapus" },
          { tombol: ["/"], aksi: "Cari" },
          { tombol: ["Alt", "K"], aksi: "Kategori" },
          { tombol: ["N"], aksi: "Tambah barang" },
          { tombol: ["←"], aksi: "Menu samping" },
        ]}
      />
    </>
  );
}

// ── Formulir barang ─────────────────────────────────────────────────────────

function FormProduk({
  buka,
  onTutup,
  produk,
  kategori,
  onSelesai,
}: {
  buka: boolean;
  onTutup: () => void;
  produk: BarisProduk | null;
  kategori: KategoriPilihan[];
  onSelesai: (pesan: string) => void;
}) {
  const [keadaan, kirim, menunggu] = useActionState(simpanProduk, AWAL);
  const [lacakStok, setLacakStok] = useState(produk?.lacakStok ?? true);

  useEffect(() => {
    setLacakStok(produk?.lacakStok ?? true);
  }, [produk, buka]);

  useEffect(() => {
    if (keadaan.sukses && keadaan.pesan) onSelesai(keadaan.pesan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keadaan]);

  return (
    <Modal
      buka={buka}
      onTutup={onTutup}
      judul={produk ? "Ubah barang" : "Tambah barang"}
      keterangan={
        produk ? undefined : "Isi harga modal supaya Catad bisa menghitung untungmu."
      }
      lebar="sedang"
    >
      <form action={kirim} id="form-produk" className="space-y-4">
        {produk && <input type="hidden" name="id" value={produk.id} />}
        {keadaan.galat?._ && <Peringatan nada="bahaya">{keadaan.galat._}</Peringatan>}

        <Bidang label="Nama barang" htmlFor="nama" galat={keadaan.galat?.nama} wajib>
          <Kolom
            id="nama"
            name="nama"
            defaultValue={produk?.nama}
            placeholder="Indomie Goreng"
            galat={keadaan.galat?.nama}
            required
            autoFocus
          />
        </Bidang>

        <div className="grid gap-4 sm:grid-cols-2">
          <Bidang label="Kode / barcode" htmlFor="kode" galat={keadaan.galat?.kode}>
            <Kolom
              id="kode"
              name="kode"
              defaultValue={produk?.kode ?? ""}
              placeholder="opsional"
              galat={keadaan.galat?.kode}
            />
          </Bidang>

          <Bidang label="Kategori" htmlFor="kategoriId">
            <Pilih id="kategoriId" name="kategoriId" defaultValue={produk?.kategoriId ?? ""}>
              <option value="">Tanpa kategori</option>
              {kategori.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </Pilih>
          </Bidang>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Bidang label="Harga jual" htmlFor="hargaJual" galat={keadaan.galat?.hargaJual} wajib>
            <Kolom
              id="hargaJual"
              name="hargaJual"
              type="number"
              min={0}
              step={100}
              defaultValue={produk?.hargaJual ?? ""}
              placeholder="0"
              galat={keadaan.galat?.hargaJual}
              required
              className="angka"
            />
          </Bidang>

          <Bidang label="Harga modal" htmlFor="hargaModal" galat={keadaan.galat?.hargaModal}>
            <Kolom
              id="hargaModal"
              name="hargaModal"
              type="number"
              min={0}
              step={100}
              defaultValue={produk?.hargaModal ?? 0}
              placeholder="0"
              galat={keadaan.galat?.hargaModal}
              className="angka"
            />
          </Bidang>

          <Bidang label="Satuan" htmlFor="satuan">
            <Kolom id="satuan" name="satuan" defaultValue={produk?.satuan ?? "pcs"} placeholder="pcs" />
          </Bidang>
        </div>

        <div className="rounded-lg border border-garis bg-kertas p-3.5">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              name="lacakStok"
              checked={lacakStok}
              onChange={(e) => setLacakStok(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--color-merek)]"
            />
            <span>
              <span className="block text-[13px] font-bold text-tinta">Lacak stok barang ini</span>
              <span className="block text-[12px] leading-snug text-tinta-3">
                Matikan untuk jasa atau barang tanpa hitungan stok (mis. jasa cuci, parkir).
              </span>
            </span>
          </label>

          {lacakStok && (
            <div className="mt-3.5 grid gap-4 border-t border-garis pt-3.5 sm:grid-cols-2">
              <Bidang
                label="Stok saat ini"
                htmlFor="stok"
                galat={keadaan.galat?.stok}
                petunjuk={produk ? "Perubahan dicatat sebagai penyesuaian." : undefined}
              >
                <Kolom
                  id="stok"
                  name="stok"
                  type="number"
                  min={0}
                  defaultValue={produk?.stok ?? 0}
                  galat={keadaan.galat?.stok}
                  className="angka"
                />
              </Bidang>

              <Bidang
                label="Stok minimum"
                htmlFor="stokMinimum"
                petunjuk="Batas untuk peringatan stok menipis."
              >
                <Kolom
                  id="stokMinimum"
                  name="stokMinimum"
                  type="number"
                  min={0}
                  defaultValue={produk?.stokMinimum ?? 5}
                  className="angka"
                />
              </Bidang>
            </div>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-tinta-2">
          <input
            type="checkbox"
            name="aktif"
            defaultChecked={produk?.aktif ?? true}
            className="size-4 accent-[var(--color-merek)]"
          />
          Tampilkan di kasir
        </label>

        <div className="flex gap-2 pt-1">
          <Tombol type="button" varian="kedua" penuh onClick={onTutup}>
            Batal
          </Tombol>
          <Tombol type="submit" penuh disabled={menunggu}>
            {menunggu ? "Menyimpan…" : produk ? "Simpan perubahan" : "Tambah barang"}
          </Tombol>
        </div>
      </form>
    </Modal>
  );
}

// ── Kelola kategori ─────────────────────────────────────────────────────────

function DialogKategori({
  buka,
  onTutup,
  kategori,
  onSelesai,
}: {
  buka: boolean;
  onTutup: () => void;
  kategori: KategoriPilihan[];
  onSelesai: (pesan: string) => void;
}) {
  const [keadaan, kirim, menunggu] = useActionState(simpanKategori, AWAL);

  useEffect(() => {
    if (keadaan.sukses && keadaan.pesan) onSelesai(keadaan.pesan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keadaan]);

  return (
    <Modal buka={buka} onTutup={onTutup} judul="Kategori barang" lebar="kecil">
      <form action={kirim} className="flex gap-2">
        <div className="flex-1">
          <Kolom name="nama" placeholder="Nama kategori baru" galat={keadaan.galat?.nama} required />
          {keadaan.galat?.nama && (
            <p className="mt-1 text-xs font-medium text-merah">{keadaan.galat.nama}</p>
          )}
        </div>
        <Tombol type="submit" ikon="tambah" disabled={menunggu}>
          Tambah
        </Tombol>
      </form>

      <ul className="mt-4 divide-y divide-garis border-t border-garis">
        {kategori.length === 0 ? (
          <li className="py-6 text-center text-[13px] text-tinta-3">Belum ada kategori.</li>
        ) : (
          kategori.map((k) => (
            <li key={k.id} className="flex items-center gap-2.5 py-2.5">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: k.warna }} />
              <span className="flex-1 text-[13.5px] font-semibold text-tinta">{k.nama}</span>
              <span className="angka text-[12px] text-tinta-3">{k.jumlah} barang</span>
            </li>
          ))
        )}
      </ul>
    </Modal>
  );
}
