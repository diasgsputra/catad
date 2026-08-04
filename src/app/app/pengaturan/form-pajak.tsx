"use client";

import { useState } from "react";
import { Bidang, Kolom, Pilih } from "@/components/ui";
import {
  KETERANGAN_REZIM,
  LABEL_REZIM,
  PILIHAN_PTKP,
  type RezimPajak,
} from "@/lib/pajak";

/**
 * Bagian dasar perhitungan pajak pada formulir pengaturan toko.
 *
 * Komponen klien tersendiri karena isiannya berubah mengikuti rezim yang
 * dipilih: menampilkan semua parameter sekaligus akan membuat pemilik warung
 * mengisi kolom PPh badan yang tidak pernah dipakainya, dan menyembunyikannya
 * di balik dokumentasi akan membuat apotek yang butuh Norma tidak menemukannya.
 *
 * Nilainya tetap dikirim sebagai bagian dari formulir induk — tidak ada
 * penyimpanan terpisah, sehingga satu tombol simpan tetap menyimpan semuanya.
 */

const REZIM: RezimPajak[] = [
  "FINAL_UMKM",
  "NPPN",
  "PEMBUKUAN_OP",
  "PEMBUKUAN_BADAN",
  "TANPA_HITUNG",
];

export type NilaiPajak = {
  rezimPajak: RezimPajak;
  tarifFinalBps: number;
  fasilitasBebas: number;
  normaBps: number;
  ptkpSetahun: number;
  tarifBadanBps: number;
  pakai31E: boolean;
};

export function FormPajak({
  nilai,
  bolehUbah,
  galat,
}: {
  nilai: NilaiPajak;
  bolehUbah: boolean;
  galat?: Record<string, string>;
}) {
  const [rezim, setRezim] = useState<RezimPajak>(nilai.rezimPajak);

  const pakaiFinal = rezim === "FINAL_UMKM";
  const pakaiNorma = rezim === "NPPN";
  const pakaiPtkp = rezim === "NPPN" || rezim === "PEMBUKUAN_OP";
  const pakaiBadan = rezim === "PEMBUKUAN_BADAN";

  return (
    <div className="border-t border-garis pt-4">
      <p className="text-[13px] font-bold text-tinta">Dasar perhitungan pajak</p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-tinta-3">
        Menentukan bagaimana laporan pajak menghitung angkanya. Pilih yang sesuai dengan keadaan
        usaha Anda — bila ragu, tanyakan ke konsultan pajak.
      </p>

      <div className="mt-3">
        <Bidang label="Cara menghitung pajak" htmlFor="rezimPajak">
          <Pilih
            id="rezimPajak"
            name="rezimPajak"
            value={rezim}
            onChange={(e) => setRezim(e.target.value as RezimPajak)}
            disabled={!bolehUbah}
          >
            {REZIM.map((r) => (
              <option key={r} value={r}>
                {LABEL_REZIM[r]}
              </option>
            ))}
          </Pilih>
        </Bidang>
        <p className="mt-1.5 rounded-lg bg-kertas-2 px-3 py-2 text-[11.5px] leading-relaxed text-tinta-2">
          {KETERANGAN_REZIM[rezim]}
        </p>
      </div>

      {pakaiFinal && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Bidang
            label="Tarif PPh Final (%)"
            htmlFor="tarifFinalPersen"
            galat={galat?.tarifFinalPersen}
            petunjuk="Ketentuan sekarang 0,5% dari peredaran bruto."
          >
            <Kolom
              id="tarifFinalPersen"
              name="tarifFinalPersen"
              type="number"
              step="0.01"
              min={0}
              max={50}
              defaultValue={nilai.tarifFinalBps / 100}
              galat={galat?.tarifFinalPersen}
              disabled={!bolehUbah}
              className="angka"
            />
          </Bidang>

          <Bidang
            label="Peredaran bruto bebas PPh setahun"
            htmlFor="fasilitasBebas"
            galat={galat?.fasilitasBebas}
            petunjuk="Rp500.000.000 untuk orang pribadi. Isi 0 untuk badan."
          >
            <Kolom
              id="fasilitasBebas"
              name="fasilitasBebas"
              type="number"
              min={0}
              step={1_000_000}
              defaultValue={nilai.fasilitasBebas}
              galat={galat?.fasilitasBebas}
              disabled={!bolehUbah}
              className="angka"
            />
          </Bidang>
        </div>
      )}

      {pakaiNorma && (
        <div className="mt-4">
          <Bidang
            label="Persentase norma (%)"
            htmlFor="normaPersen"
            galat={galat?.normaPersen}
            petunjuk="Ditetapkan menurut jenis usaha dan wilayah pada PER-17/PJ/2015. Contoh: pedagang eceran sekitar 25–30%."
          >
            <Kolom
              id="normaPersen"
              name="normaPersen"
              type="number"
              step="0.1"
              min={0}
              max={100}
              defaultValue={nilai.normaBps / 100}
              galat={galat?.normaPersen}
              disabled={!bolehUbah}
              className="angka"
            />
          </Bidang>
        </div>
      )}

      {pakaiPtkp && (
        <div className="mt-4">
          <Bidang
            label="PTKP setahun"
            htmlFor="ptkpSetahun"
            galat={galat?.ptkpSetahun}
            petunjuk={PILIHAN_PTKP.map((p) => `${p.label.split(" — ")[0]} ${(p.nilai / 1_000_000).toString().replace(".", ",")} juta`).join(" · ")}
          >
            <Kolom
              id="ptkpSetahun"
              name="ptkpSetahun"
              type="number"
              min={0}
              step={500_000}
              defaultValue={nilai.ptkpSetahun}
              galat={galat?.ptkpSetahun}
              disabled={!bolehUbah}
              className="angka"
            />
          </Bidang>
        </div>
      )}

      {pakaiBadan && (
        <div className="mt-4 space-y-4">
          <Bidang
            label="Tarif PPh badan (%)"
            htmlFor="tarifBadanPersen"
            galat={galat?.tarifBadanPersen}
            petunjuk="Tarif umum sekarang 22%."
          >
            <Kolom
              id="tarifBadanPersen"
              name="tarifBadanPersen"
              type="number"
              step="0.1"
              min={0}
              max={50}
              defaultValue={nilai.tarifBadanBps / 100}
              galat={galat?.tarifBadanPersen}
              disabled={!bolehUbah}
              className="angka"
            />
          </Bidang>

          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              name="pakai31E"
              defaultChecked={nilai.pakai31E}
              disabled={!bolehUbah}
              className="mt-0.5 size-4 shrink-0 rounded border-garis-2 accent-merek"
            />
            <span>
              <span className="block text-[13px] font-semibold text-tinta">
                Pakai fasilitas Pasal 31E
              </span>
              <span className="block text-[11.5px] leading-relaxed text-tinta-3">
                Pengurangan tarif 50% atas penghasilan kena pajak dari bagian peredaran bruto
                sampai Rp4,8 miliar. Berlaku untuk badan dengan peredaran bruto sampai Rp50
                miliar.
              </span>
            </span>
          </label>
        </div>
      )}

      {/* Parameter rezim yang sedang tidak tampil tetap dikirim apa adanya
          supaya tidak terhapus hanya karena pemilik toko berganti pilihan
          sebentar lalu menyimpan. */}
      {!pakaiFinal && (
        <>
          <input type="hidden" name="tarifFinalPersen" value={nilai.tarifFinalBps / 100} />
          <input type="hidden" name="fasilitasBebas" value={nilai.fasilitasBebas} />
        </>
      )}
      {!pakaiNorma && <input type="hidden" name="normaPersen" value={nilai.normaBps / 100} />}
      {!pakaiPtkp && <input type="hidden" name="ptkpSetahun" value={nilai.ptkpSetahun} />}
      {!pakaiBadan && (
        <>
          <input type="hidden" name="tarifBadanPersen" value={nilai.tarifBadanBps / 100} />
          {nilai.pakai31E && <input type="hidden" name="pakai31E" value="on" />}
        </>
      )}
    </div>
  );
}
