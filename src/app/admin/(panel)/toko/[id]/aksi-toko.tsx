"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Konfirmasi, Modal } from "@/components/modal";
import { Bidang, Kolom, Peringatan, Tombol } from "@/components/ui";
import {
  blokirToko,
  bukaBlokirToko,
  hentikanProToko,
  perpanjangManual,
  type HasilAdmin,
} from "@/actions/admin";
import { rupiah } from "@/lib/format";

type Dialog = "bulanan" | "tahunan" | "tenggang" | "hentikan" | "blokir" | "bukaBlokir" | null;

export function AksiToko({
  tokoId,
  namaToko,
  diblokir,
  sedangPro,
  hargaBulanan,
  hargaTahunan,
}: {
  tokoId: string;
  namaToko: string;
  diblokir: boolean;
  sedangPro: boolean;
  hargaBulanan: number;
  hargaTahunan: number;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [alasan, setAlasan] = useState("");
  const [galatAlasan, setGalatAlasan] = useState<string | undefined>();
  const [kabar, setKabar] = useState<{ nada: "sukses" | "bahaya"; teks: string } | null>(null);
  const [proses, mulai] = useTransition();

  function tanggapi(hasil: HasilAdmin, tutup = true) {
    if (hasil.galat?.alasan) {
      setGalatAlasan(hasil.galat.alasan);
      return;
    }
    if (tutup) setDialog(null);
    if (hasil.pesan) {
      setKabar({ nada: hasil.sukses ? "sukses" : "bahaya", teks: hasil.pesan });
    }
    router.refresh();
  }

  function perpanjang(siklus: "BULANAN" | "TAHUNAN" | "TENGGANG") {
    mulai(async () => tanggapi(await perpanjangManual(tokoId, siklus)));
  }

  function hentikan() {
    mulai(async () => tanggapi(await hentikanProToko(tokoId)));
  }

  function blokir() {
    setGalatAlasan(undefined);
    mulai(async () => {
      const hasil = await blokirToko(tokoId, alasan);
      if (hasil.sukses) setAlasan("");
      tanggapi(hasil);
    });
  }

  function bukaBlokir() {
    mulai(async () => tanggapi(await bukaBlokirToko(tokoId)));
  }

  return (
    <div>
      {kabar && (
        <Peringatan nada={kabar.nada} className="mb-3">
          {kabar.teks}
        </Peringatan>
      )}

      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-[12px] font-bold tracking-[0.06em] text-tinta-3 uppercase">
            Langganan
          </p>
          <div className="flex flex-wrap gap-2">
            <Tombol ukuran="kecil" onClick={() => setDialog("bulanan")} disabled={proses}>
              {sedangPro ? "Perpanjang 1 bulan" : "Aktifkan 1 bulan"}
            </Tombol>
            <Tombol
              ukuran="kecil"
              varian="kedua"
              onClick={() => setDialog("tahunan")}
              disabled={proses}
            >
              {sedangPro ? "Perpanjang 1 tahun" : "Aktifkan 1 tahun"}
            </Tombol>
            <Tombol
              ukuran="kecil"
              varian="hantu"
              onClick={() => setDialog("tenggang")}
              disabled={proses}
            >
              Beri tenggang 7 hari
            </Tombol>
            {sedangPro && (
              <Tombol
                ukuran="kecil"
                varian="hantu"
                onClick={() => setDialog("hentikan")}
                disabled={proses}
              >
                Hentikan Pro
              </Tombol>
            )}
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-tinta-4">
            Perpanjangan menyambung dari tanggal berakhir yang ada, jadi hari yang sudah dibayar
            tidak hangus. Masa tenggang tidak dihitung sebagai pendapatan.
          </p>
        </div>

        <div className="border-t border-garis pt-4">
          <p className="mb-1.5 text-[12px] font-bold tracking-[0.06em] text-tinta-3 uppercase">
            Akses
          </p>
          {diblokir ? (
            <Tombol ukuran="kecil" varian="kedua" onClick={() => setDialog("bukaBlokir")} disabled={proses}>
              Buka blokir
            </Tombol>
          ) : (
            <Tombol
              ukuran="kecil"
              varian="bahaya"
              ikon="kunci"
              onClick={() => setDialog("blokir")}
              disabled={proses}
            >
              Blokir toko
            </Tombol>
          )}
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-tinta-4">
            Blokir menutup akses seluruh akun toko ini, termasuk pemiliknya. Data penjualan dan
            barang tidak dihapus dan akan utuh saat blokirnya dibuka.
          </p>
        </div>
      </div>

      <Konfirmasi
        buka={dialog === "bulanan"}
        onTutup={() => setDialog(null)}
        onSetuju={() => perpanjang("BULANAN")}
        sedangProses={proses}
        bahaya={false}
        judul={`${sedangPro ? "Perpanjang" : "Aktifkan"} Pro 1 bulan?`}
        pesan={`${rupiah(hargaBulanan)} akan tercatat sebagai pendapatan dari ${namaToko}. Pakai ini hanya bila dananya sudah benar-benar masuk.`}
        labelSetuju="Ya, catat & aktifkan"
      />

      <Konfirmasi
        buka={dialog === "tahunan"}
        onTutup={() => setDialog(null)}
        onSetuju={() => perpanjang("TAHUNAN")}
        sedangProses={proses}
        bahaya={false}
        judul={`${sedangPro ? "Perpanjang" : "Aktifkan"} Pro 1 tahun?`}
        pesan={`${rupiah(hargaTahunan)} akan tercatat sebagai pendapatan dari ${namaToko}. Pakai ini hanya bila dananya sudah benar-benar masuk.`}
        labelSetuju="Ya, catat & aktifkan"
      />

      <Konfirmasi
        buka={dialog === "tenggang"}
        onTutup={() => setDialog(null)}
        onSetuju={() => perpanjang("TENGGANG")}
        sedangProses={proses}
        bahaya={false}
        judul="Beri masa tenggang 7 hari?"
        pesan="Fitur Pro menyala 7 hari tanpa tagihan. Tidak masuk laporan pendapatan karena tidak ada uang yang diterima."
        labelSetuju="Beri tenggang"
      />

      <Konfirmasi
        buka={dialog === "hentikan"}
        onTutup={() => setDialog(null)}
        onSetuju={hentikan}
        sedangProses={proses}
        judul={`Hentikan Pro untuk ${namaToko}?`}
        pesan="Toko kembali ke paket Gratis sekarang. Riwayat pembayarannya tidak diubah, jadi laporan pendapatan tetap utuh."
        labelSetuju="Hentikan Pro"
      />

      <Konfirmasi
        buka={dialog === "bukaBlokir"}
        onTutup={() => setDialog(null)}
        onSetuju={bukaBlokir}
        sedangProses={proses}
        bahaya={false}
        judul={`Buka blokir ${namaToko}?`}
        pesan="Seluruh akun toko ini bisa dipakai masuk lagi seperti biasa."
        labelSetuju="Buka blokir"
      />

      <Modal
        buka={dialog === "blokir"}
        onTutup={() => setDialog(null)}
        judul={`Blokir ${namaToko}?`}
        keterangan="Alasannya dicatat di jejak audit dan hanya terlihat operator, tidak ditampilkan ke pemilik toko."
        lebar="kecil"
      >
        <div className="space-y-4">
          <Bidang label="Alasan blokir" htmlFor="alasan-blokir" galat={galatAlasan} wajib>
            <Kolom
              id="alasan-blokir"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="mis. tagihan tiga bulan tidak dibayar"
              galat={galatAlasan}
              maxLength={200}
              autoFocus
            />
          </Bidang>

          <div className="flex gap-2">
            <Tombol type="button" varian="kedua" penuh onClick={() => setDialog(null)}>
              Batal
            </Tombol>
            <Tombol type="button" varian="bahaya" penuh onClick={blokir} disabled={proses}>
              {proses ? "Memblokir…" : "Blokir toko"}
            </Tombol>
          </div>
        </div>
      </Modal>
    </div>
  );
}
