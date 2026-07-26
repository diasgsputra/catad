"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Ikon, type NamaIkon } from "@/components/ikon";
import { Modal } from "@/components/modal";
import { Bidang, Kolom, Peringatan, Pilih, Tombol } from "@/components/ui";
import { sesuaikanStok, type HasilAksi } from "@/actions/produk";

const AWAL: HasilAksi = {};

export type ProdukStok = {
  id: string;
  nama: string;
  satuan: string;
  stok: number;
};

/** Tombol + dialog untuk menambah, mengurangi, atau menyetel stok. */
export function AturStok({
  produk,
  produkTerpilih,
  label = "Atur stok",
  varian = "utama",
  ukuran = "sedang",
}: {
  produk: ProdukStok[];
  produkTerpilih?: string;
  label?: string;
  varian?: "utama" | "kedua" | "halus" | "hantu";
  ukuran?: "kecil" | "sedang";
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [keadaan, kirim, menunggu] = useActionState(sesuaikanStok, AWAL);
  const [tipe, setTipe] = useState<"MASUK" | "KELUAR" | "PENYESUAIAN">("MASUK");
  const [produkId, setProdukId] = useState(produkTerpilih ?? produk[0]?.id ?? "");

  const dipilih = produk.find((p) => p.id === produkId);

  useEffect(() => {
    if (keadaan.sukses) {
      setBuka(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keadaan]);

  useEffect(() => {
    if (buka) setProdukId(produkTerpilih ?? produk[0]?.id ?? "");
  }, [buka, produkTerpilih, produk]);

  return (
    <>
      <Tombol varian={varian} ukuran={ukuran} ikon="stok" onClick={() => setBuka(true)}>
        {label}
      </Tombol>

      <Modal
        buka={buka}
        onTutup={() => setBuka(false)}
        judul="Atur stok"
        keterangan="Setiap perubahan dicatat di riwayat mutasi."
        lebar="kecil"
      >
        <form action={kirim} className="space-y-4">
          {keadaan.galat?._ && <Peringatan nada="bahaya">{keadaan.galat._}</Peringatan>}

          <Bidang label="Barang" htmlFor="produkId" wajib>
            <Pilih
              id="produkId"
              name="produkId"
              value={produkId}
              onChange={(e) => setProdukId(e.target.value)}
              required
            >
              {produk.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} — sisa {p.stok} {p.satuan}
                </option>
              ))}
            </Pilih>
          </Bidang>

          <Bidang label="Jenis perubahan" htmlFor="tipe">
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { nilai: "MASUK", label: "Barang masuk" },
                  { nilai: "KELUAR", label: "Barang keluar" },
                  { nilai: "PENYESUAIAN", label: "Hitung ulang" },
                ] as const
              ).map((t) => (
                <button
                  key={t.nilai}
                  type="button"
                  onClick={() => setTipe(t.nilai)}
                  className={`rounded-lg border px-2 py-2 text-[12px] font-bold transition-colors ${
                    tipe === t.nilai
                      ? "border-merek bg-merek-muda text-merek-tua"
                      : "border-garis-2 text-tinta-2 hover:bg-kertas-2"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <input type="hidden" name="tipe" value={tipe} />
          </Bidang>

          <Bidang
            label={tipe === "PENYESUAIAN" ? "Jumlah stok sebenarnya" : "Jumlah"}
            htmlFor="qty"
            galat={keadaan.galat?.qty}
            petunjuk={
              tipe === "PENYESUAIAN"
                ? `Stok akan disetel tepat ke angka ini${dipilih ? ` (sekarang ${dipilih.stok})` : ""}.`
                : tipe === "MASUK"
                  ? "Misalnya setelah kulakan."
                  : "Misalnya barang rusak, kedaluwarsa, atau dipakai sendiri."
            }
            wajib
          >
            <Kolom
              id="qty"
              name="qty"
              type="number"
              min={tipe === "PENYESUAIAN" ? 0 : 1}
              defaultValue=""
              placeholder="0"
              galat={keadaan.galat?.qty}
              required
              className="angka"
              autoFocus
            />
          </Bidang>

          <Bidang label="Catatan" htmlFor="catatan">
            <Kolom id="catatan" name="catatan" placeholder="opsional, mis. kulakan dari agen" />
          </Bidang>

          <div className="flex gap-2 pt-1">
            <Tombol type="button" varian="kedua" penuh onClick={() => setBuka(false)}>
              Batal
            </Tombol>
            <Tombol type="submit" penuh disabled={menunggu || !produkId}>
              {menunggu ? "Menyimpan…" : "Simpan"}
            </Tombol>
          </div>
        </form>
      </Modal>
    </>
  );
}

/** Tombol kecil di baris tabel. */
export function TombolAturBaris({ produk, produkId }: { produk: ProdukStok[]; produkId: string }) {
  return (
    <span className="inline-flex">
      <AturStok
        produk={produk}
        produkTerpilih={produkId}
        label="Atur"
        varian="kedua"
        ukuran="kecil"
      />
    </span>
  );
}

export function IkonMutasi({ tipe }: { tipe: string }) {
  const peta: Record<string, { ikon: NamaIkon; kelas: string }> = {
    MASUK: { ikon: "naik", kelas: "bg-hijau-muda text-hijau" },
    KELUAR: { ikon: "turun", kelas: "bg-kuning-muda text-kuning" },
    PENJUALAN: { ikon: "kasir", kelas: "bg-merek-muda text-merek" },
    PENYESUAIAN: { ikon: "stok", kelas: "bg-biru-muda text-biru" },
    PEMBATALAN: { ikon: "silang", kelas: "bg-merah-muda text-merah" },
  };
  const g = peta[tipe] ?? { ikon: "stok" as NamaIkon, kelas: "bg-kertas-2 text-tinta-3" };

  return (
    <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${g.kelas}`}>
      <Ikon nama={g.ikon} size={14} />
    </span>
  );
}
