"use client";

import { useActionState } from "react";
import { Bidang, Kolom, Peringatan, Pilih, Tombol } from "@/components/ui";
import { gantiSandi, simpanPengaturanToko } from "@/actions/toko";
import type { HasilAksi } from "@/actions/produk";
import { FormPajak, type NilaiPajak } from "./form-pajak";

const AWAL: HasilAksi = {};

const JENIS_USAHA = [
  "Warung / Toko Kelontong",
  "Kedai Kopi / Kafe",
  "Rumah Makan / Warteg",
  "Toko Sembako",
  "Laundry",
  "Toko Bangunan",
  "Apotek / Toko Obat",
  "Jasa / Lainnya",
];

export function FormToko({
  toko,
  bolehUbah,
}: {
  toko: {
    nama: string;
    jenisUsaha: string;
    alamat: string | null;
    telepon: string | null;
    waToko: string | null;
    catatanNota: string | null;
    persenPajak: number;
    npwp: string | null;
    namaWajibPajak: string | null;
    jenisWajibPajak: "ORANG_PRIBADI" | "BADAN";
    rezimPajak: NilaiPajak["rezimPajak"];
    tarifFinalBps: number;
    fasilitasBebas: number;
    normaBps: number;
    ptkpSetahun: number;
    tarifBadanBps: number;
    pakai31E: boolean;
  };
  bolehUbah: boolean;
}) {
  const [keadaan, kirim, menunggu] = useActionState(simpanPengaturanToko, AWAL);

  return (
    <form action={kirim} className="space-y-4 p-4">
      {keadaan.galat?._ && <Peringatan nada="bahaya">{keadaan.galat._}</Peringatan>}
      {keadaan.sukses && keadaan.pesan && <Peringatan nada="sukses">{keadaan.pesan}</Peringatan>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Bidang label="Nama toko" htmlFor="nama" galat={keadaan.galat?.nama} wajib>
          <Kolom
            id="nama"
            name="nama"
            defaultValue={toko.nama}
            galat={keadaan.galat?.nama}
            disabled={!bolehUbah}
            required
          />
        </Bidang>

        <Bidang label="Jenis usaha" htmlFor="jenisUsaha">
          <Pilih id="jenisUsaha" name="jenisUsaha" defaultValue={toko.jenisUsaha} disabled={!bolehUbah}>
            {[toko.jenisUsaha, ...JENIS_USAHA.filter((j) => j !== toko.jenisUsaha)].map((j) => (
              <option key={j} value={j}>
                {j}
              </option>
            ))}
          </Pilih>
        </Bidang>
      </div>

      <Bidang
        label="Alamat"
        htmlFor="alamat"
        petunjuk="Ditampilkan di nota digital yang dibagikan ke pembeli."
      >
        <Kolom
          id="alamat"
          name="alamat"
          defaultValue={toko.alamat ?? ""}
          placeholder="Jl. Melati No. 12, Bandung"
          disabled={!bolehUbah}
        />
      </Bidang>

      <div className="grid gap-4 sm:grid-cols-2">
        <Bidang label="Telepon toko" htmlFor="telepon">
          <Kolom
            id="telepon"
            name="telepon"
            defaultValue={toko.telepon ?? ""}
            placeholder="0812xxxxxxx"
            disabled={!bolehUbah}
            className="angka"
          />
        </Bidang>

        <Bidang label="WhatsApp toko" htmlFor="waToko" petunjuk="Untuk dicantumkan di nota.">
          <Kolom
            id="waToko"
            name="waToko"
            defaultValue={toko.waToko ?? ""}
            placeholder="628xxxxxxxxx"
            disabled={!bolehUbah}
            className="angka"
          />
        </Bidang>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Bidang
          label="Pajak / servis (%)"
          htmlFor="persenPajak"
          galat={keadaan.galat?.persenPajak}
          petunjuk="0 berarti tidak ada tambahan pajak di kasir."
        >
          <Kolom
            id="persenPajak"
            name="persenPajak"
            type="number"
            min={0}
            max={30}
            defaultValue={toko.persenPajak}
            galat={keadaan.galat?.persenPajak}
            disabled={!bolehUbah}
            className="angka"
          />
        </Bidang>

        <Bidang label="Ucapan di nota" htmlFor="catatanNota">
          <Kolom
            id="catatanNota"
            name="catatanNota"
            defaultValue={toko.catatanNota ?? ""}
            placeholder="Terima kasih sudah berbelanja"
            disabled={!bolehUbah}
          />
        </Bidang>
      </div>

      {/* ── Identitas pajak ──
          Hanya dipakai sebagai kepala dokumen laporan pajak. Boleh dikosongkan;
          toko yang belum punya NPWP tetap bisa memakai laporannya untuk
          pembukuan sendiri. */}
      <div className="border-t border-garis pt-4">
        <p className="text-[13px] font-bold text-tinta">Identitas pajak</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-tinta-3">
          Muncul di kepala dokumen laporan pajak. Boleh dikosongkan — data ini tidak pernah
          dikirim ke mana pun.
        </p>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Bidang
            label="NPWP / NIK"
            htmlFor="npwp"
            galat={keadaan.galat?.npwp}
            petunjuk="Boleh ditulis dengan titik dan tanda hubung."
          >
            <Kolom
              id="npwp"
              name="npwp"
              defaultValue={toko.npwp ?? ""}
              placeholder="00.000.000.0-000.000"
              galat={keadaan.galat?.npwp}
              disabled={!bolehUbah}
              className="angka"
            />
          </Bidang>

          <Bidang
            label="Jenis wajib pajak"
            htmlFor="jenisWajibPajak"
            petunjuk="Fasilitas Rp500 juta bebas PPh hanya untuk orang pribadi."
          >
            <Pilih
              id="jenisWajibPajak"
              name="jenisWajibPajak"
              defaultValue={toko.jenisWajibPajak}
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
          className="mt-4"
          petunjuk="Isi bila berbeda dari nama toko. Kosong berarti memakai nama toko."
        >
          <Kolom
            id="namaWajibPajak"
            name="namaWajibPajak"
            defaultValue={toko.namaWajibPajak ?? ""}
            placeholder={toko.nama}
            disabled={!bolehUbah}
          />
        </Bidang>
      </div>

      <FormPajak
        nilai={{
          rezimPajak: toko.rezimPajak,
          tarifFinalBps: toko.tarifFinalBps,
          fasilitasBebas: toko.fasilitasBebas,
          normaBps: toko.normaBps,
          ptkpSetahun: toko.ptkpSetahun,
          tarifBadanBps: toko.tarifBadanBps,
          pakai31E: toko.pakai31E,
        }}
        bolehUbah={bolehUbah}
        galat={keadaan.galat}
      />

      {bolehUbah && (
        <div className="flex justify-end pt-1">
          <Tombol type="submit" disabled={menunggu}>
            {menunggu ? "Menyimpan…" : "Simpan pengaturan"}
          </Tombol>
        </div>
      )}
    </form>
  );
}

export function FormSandi() {
  const [keadaan, kirim, menunggu] = useActionState(gantiSandi, AWAL);

  return (
    <form action={kirim} className="space-y-4 p-4">
      {keadaan.galat?._ && <Peringatan nada="bahaya">{keadaan.galat._}</Peringatan>}
      {keadaan.sukses && keadaan.pesan && <Peringatan nada="sukses">{keadaan.pesan}</Peringatan>}

      <Bidang label="Kata sandi sekarang" htmlFor="sandiLama" galat={keadaan.galat?.sandiLama} wajib>
        <Kolom
          id="sandiLama"
          name="sandiLama"
          type="password"
          autoComplete="current-password"
          galat={keadaan.galat?.sandiLama}
          required
        />
      </Bidang>

      <div className="grid gap-4 sm:grid-cols-2">
        <Bidang
          label="Kata sandi baru"
          htmlFor="sandiBaru"
          galat={keadaan.galat?.sandiBaru}
          petunjuk="Minimal 6 karakter."
          wajib
        >
          <Kolom
            id="sandiBaru"
            name="sandiBaru"
            type="password"
            autoComplete="new-password"
            galat={keadaan.galat?.sandiBaru}
            required
          />
        </Bidang>

        <Bidang label="Ulangi sandi baru" htmlFor="ulangiSandi" galat={keadaan.galat?.ulangiSandi} wajib>
          <Kolom
            id="ulangiSandi"
            name="ulangiSandi"
            type="password"
            autoComplete="new-password"
            galat={keadaan.galat?.ulangiSandi}
            required
          />
        </Bidang>
      </div>

      <div className="flex justify-end pt-1">
        <Tombol type="submit" varian="kedua" disabled={menunggu}>
          {menunggu ? "Menyimpan…" : "Ganti kata sandi"}
        </Tombol>
      </div>
    </form>
  );
}
