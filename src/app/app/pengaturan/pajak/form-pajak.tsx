"use client";

import { useActionState, useState } from "react";
import {
  Bidang,
  Kartu,
  KepalaKartu,
  Kolom,
  Peringatan,
  Pilih,
  Tombol,
} from "@/components/ui";
import { simpanPengaturanPajak } from "@/actions/toko";
import type { HasilAksi } from "@/actions/produk";
import {
  KETERANGAN_REZIM,
  LABEL_REZIM,
  PILIHAN_PTKP,
  type RezimPajak,
} from "@/lib/pajak";
import { TabelRezim } from "./tabel-rezim";

/**
 * Formulir pengaturan pajak, lengkap dengan tabel rujukannya.
 *
 * Satu komponen klien untuk keduanya karena tabel rujukan menyorot pilihan yang
 * sedang dipilih, bukan yang tersimpan. Memecahnya menjadi dua komponen berarti
 * sorotannya baru berpindah setelah disimpan — persis saat penjelasannya paling
 * tidak dibutuhkan.
 *
 * Isian parameternya berubah mengikuti rezim: menampilkan semuanya sekaligus
 * membuat pemilik warung mengisi kolom PPh badan yang tidak pernah dipakainya,
 * dan menyembunyikannya di balik dokumentasi membuat apotek yang butuh Norma
 * tidak menemukannya.
 */

const AWAL: HasilAksi = {};

const REZIM: RezimPajak[] = [
  "FINAL_UMKM",
  "NPPN",
  "PEMBUKUAN_OP",
  "PEMBUKUAN_BADAN",
  "TANPA_HITUNG",
];

export type NilaiPajak = {
  npwp: string | null;
  namaWajibPajak: string | null;
  jenisWajibPajak: "ORANG_PRIBADI" | "BADAN";
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
  namaToko,
  bolehUbah,
}: {
  nilai: NilaiPajak;
  namaToko: string;
  bolehUbah: boolean;
}) {
  const [keadaan, kirim, menunggu] = useActionState(simpanPengaturanPajak, AWAL);
  const [rezim, setRezim] = useState<RezimPajak>(nilai.rezimPajak);
  const [jenisWp, setJenisWp] = useState(nilai.jenisWajibPajak);

  const galat = keadaan.galat;
  const pakaiFinal = rezim === "FINAL_UMKM";
  const pakaiNorma = rezim === "NPPN";
  const pakaiPtkp = rezim === "NPPN" || rezim === "PEMBUKUAN_OP";
  const pakaiBadan = rezim === "PEMBUKUAN_BADAN";

  // Sejak PP 20/2026 skema final tertutup bagi badan, dan fasilitas Rp500 juta
  // memang tidak pernah berlaku untuk badan. Diperingatkan, bukan dilarang:
  // aturan bisa berubah lagi, dan menolak simpan akan mengunci pemilik toko
  // yang keadaannya tidak kami ketahui.
  const badanPakaiFinal = jenisWp === "BADAN" && pakaiFinal;
  const badanPakaiPtkp = jenisWp === "BADAN" && pakaiPtkp;
  const oPPakaiBadan = jenisWp === "ORANG_PRIBADI" && pakaiBadan;

  return (
    <div className="mt-5 space-y-5">
      <Kartu className="overflow-hidden">
        <KepalaKartu
          ikon="info"
          judul="Lima dasar perhitungan yang dikenal ketentuan pajak"
          keterangan="Bacaan rujukan untuk memilih. Baris yang disorot adalah pilihan Anda sekarang."
        />
        <TabelRezim sorot={rezim} />
        <div className="space-y-2 border-t border-garis px-4 py-3">
          <p className="text-[11.5px] leading-relaxed text-tinta-3">
            Angka pada tabel adalah ketentuan umum yang berlaku sekarang. Yang benar-benar dipakai
            laporan Anda adalah nilai pada formulir di bawah, sehingga tarif yang berbeda tetap
            bisa diisi bila aturannya berubah.
          </p>
          <p className="text-[11.5px] leading-relaxed text-tinta-3">
            Di luar skema final, pajak setahun umumnya masih dicicil lewat angsuran PPh Pasal 25
            tiap bulan. Catad tidak menghitungnya karena besarannya mengacu pada SPT tahun
            sebelumnya, bukan pada penjualan tahun berjalan.
          </p>
          <p className="text-[11.5px] leading-relaxed text-tinta-3">
            PPN juga tidak dihitung: menentukan PPN terutang memerlukan pajak masukan dari faktur
            pembelian, dan Catad tidak mencatatnya.
          </p>
        </div>
      </Kartu>

      <form action={kirim} className="space-y-5">
        {galat?._ && <Peringatan nada="bahaya">{galat._}</Peringatan>}
        {keadaan.sukses && keadaan.pesan && (
          <Peringatan nada="sukses">{keadaan.pesan}</Peringatan>
        )}

        <Kartu>
          <KepalaKartu
            ikon="grafik"
            judul="Dasar perhitungan"
            keterangan="Menentukan bagaimana laporan pajak menghitung angkanya."
          />
          <div className="space-y-4 p-4">
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

            <p className="rounded-lg bg-kertas-2 px-3 py-2 text-[12px] leading-relaxed text-tinta-2">
              {KETERANGAN_REZIM[rezim]}
            </p>

            {badanPakaiFinal && (
              <Peringatan nada="waspada" judul="Periksa lagi pilihan ini">
                Jenis wajib pajaknya diisi Badan, tetapi skema PPh Final UMKM sejak PP 20/2026
                hanya terbuka untuk orang pribadi dan Perseroan Perorangan. Fasilitas peredaran
                bruto bebas PPh juga tidak berlaku bagi badan.
              </Peringatan>
            )}

            {badanPakaiPtkp && (
              <Peringatan nada="waspada" judul="Periksa lagi pilihan ini">
                PTKP adalah pengurang untuk orang pribadi. Badan usaha tidak mendapatkannya.
              </Peringatan>
            )}

            {oPPakaiBadan && (
              <Peringatan nada="waspada" judul="Periksa lagi pilihan ini">
                Jenis wajib pajaknya diisi Orang Pribadi, tetapi tarif PPh badan dipakai. Salah
                satunya perlu disesuaikan.
              </Peringatan>
            )}

            {pakaiFinal && (
              <div className="grid gap-4 sm:grid-cols-2">
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
            )}

            {pakaiPtkp && (
              <Bidang
                label="PTKP setahun"
                htmlFor="ptkpSetahun"
                galat={galat?.ptkpSetahun}
                petunjuk={PILIHAN_PTKP.map(
                  (p) =>
                    `${p.label.split(" — ")[0]} ${(p.nilai / 1_000_000)
                      .toString()
                      .replace(".", ",")} juta`,
                ).join(" · ")}
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
            )}

            {pakaiBadan && (
              <div className="space-y-4">
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
                      Pengurangan tarif 50% atas penghasilan kena pajak dari bagian peredaran
                      bruto sampai Rp4,8 miliar. Berlaku untuk badan dengan peredaran bruto sampai
                      Rp50 miliar.
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
        </Kartu>

        <Kartu>
          <KepalaKartu
            ikon="nota"
            judul="Identitas pajak"
            keterangan="Muncul di kepala dokumen laporan. Boleh dikosongkan — data ini tidak pernah dikirim ke mana pun."
          />
          <div className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Bidang
                label="NPWP / NIK"
                htmlFor="npwp"
                galat={galat?.npwp}
                petunjuk="Boleh ditulis dengan titik dan tanda hubung."
              >
                <Kolom
                  id="npwp"
                  name="npwp"
                  defaultValue={nilai.npwp ?? ""}
                  placeholder="00.000.000.0-000.000"
                  galat={galat?.npwp}
                  disabled={!bolehUbah}
                  className="angka"
                />
              </Bidang>

              <Bidang
                label="Jenis wajib pajak"
                htmlFor="jenisWajibPajak"
                petunjuk="Menentukan pilihan mana yang wajar untuk usaha Anda."
              >
                <Pilih
                  id="jenisWajibPajak"
                  name="jenisWajibPajak"
                  value={jenisWp}
                  onChange={(e) => setJenisWp(e.target.value as "ORANG_PRIBADI" | "BADAN")}
                  disabled={!bolehUbah}
                >
                  <option value="ORANG_PRIBADI">Orang Pribadi</option>
                  <option value="BADAN">Badan (PT / CV / koperasi)</option>
                </Pilih>
              </Bidang>
            </div>

            <Bidang
              label="Nama wajib pajak"
              htmlFor="namaWajibPajak"
              petunjuk="Isi bila berbeda dari nama toko. Kosong berarti memakai nama toko."
            >
              <Kolom
                id="namaWajibPajak"
                name="namaWajibPajak"
                defaultValue={nilai.namaWajibPajak ?? ""}
                placeholder={namaToko}
                disabled={!bolehUbah}
              />
            </Bidang>
          </div>
        </Kartu>

        {bolehUbah && (
          <div className="flex justify-end">
            <Tombol type="submit" disabled={menunggu}>
              {menunggu ? "Menyimpan…" : "Simpan pengaturan pajak"}
            </Tombol>
          </div>
        )}
      </form>
    </div>
  );
}
