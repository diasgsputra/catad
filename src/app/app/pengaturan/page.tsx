import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { konteks } from "@/lib/sesi";
import { JudulHalaman, Kartu, KepalaKartu, Lencana, Peringatan } from "@/components/ui";
import { Ikon } from "@/components/ikon";
import { tanggalSingkat } from "@/lib/format";
import { LABEL_REZIM } from "@/lib/pajak";
import { FormSandi, FormToko } from "./form-toko";

export const metadata: Metadata = { title: "Pengaturan" };
export const dynamic = "force-dynamic";

export default async function HalamanPengaturan() {
  const k = await konteks();
  const bolehUbah = k.sesi.peran === "PEMILIK";

  const [jumlahProduk, jumlahTransaksi, jumlahPengguna, tokoInfo] = await Promise.all([
    db.produk.count({ where: { tokoId: k.toko.id } }),
    db.transaksi.count({ where: { tokoId: k.toko.id } }),
    db.pengguna.count({ where: { tokoId: k.toko.id } }),
    db.toko.findUnique({ where: { id: k.toko.id }, select: { dibuatPada: true } }),
  ]);

  return (
    <div className="p-4 sm:p-6">
      <JudulHalaman
        judul="Pengaturan"
        keterangan="Identitas toko, nota, dan keamanan akun Anda."
      />

      {!bolehUbah && (
        <Peringatan nada="info" className="mt-4">
          Anda masuk sebagai kasir, sehingga pengaturan toko hanya dapat dilihat.
        </Peringatan>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Kartu>
            <KepalaKartu
              ikon="toko"
              judul="Identitas toko"
              keterangan="Dipakai di nota digital dan struk cetak."
            />
            <FormToko
              toko={{
                nama: k.toko.nama,
                jenisUsaha: k.toko.jenisUsaha,
                alamat: k.toko.alamat,
                telepon: k.toko.telepon,
                waToko: k.toko.waToko,
                catatanNota: k.toko.catatanNota,
                persenPajak: k.toko.persenPajak,
              }}
              bolehUbah={bolehUbah}
            />
          </Kartu>

          <Kartu>
            <KepalaKartu
              ikon="kunci"
              judul="Kata sandi"
              keterangan="Ganti secara berkala, terutama bila perangkat dipakai bersama."
            />
            <FormSandi />
          </Kartu>
        </div>

        <div className="space-y-5">
          <Kartu>
            <KepalaKartu ikon="petir" judul="Paket langganan" />
            <div className="p-4">
              <div className="flex items-center gap-2">
                <Lencana nada={k.paket.aktif === "PRO" ? "merek" : "netral"}>
                  {k.paket.aktif === "PRO" ? "Pro" : "Gratis"}
                </Lencana>
                {k.paket.sumber === "uji-coba" && (
                  <span className="text-[12.5px] font-semibold text-kuning">
                    uji coba · {k.paket.sisaUjiCoba} hari lagi
                  </span>
                )}
                {k.paket.sumber === "berbayar" && k.paket.sisaBerbayar !== null && (
                  <span className="text-[12.5px] font-semibold text-tinta-3">
                    aktif {k.paket.sisaBerbayar} hari lagi
                  </span>
                )}
              </div>

              <p className="mt-2.5 text-[13px] leading-relaxed text-tinta-2">
                {k.paket.aktif === "PRO"
                  ? "Catad Insight, laporan penuh, unduh CSV, dan akun kasir tambahan aktif."
                  : `Paket Gratis: sampai ${k.paket.batas.maksProduk} barang dan laporan ${k.paket.batas.riwayatHari} hari terakhir.`}
              </p>

              <Link
                href="/app/pengaturan/langganan"
                className="mt-3.5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-merek px-3.5 text-[13px] font-bold text-white transition-colors hover:bg-merek-tua"
              >
                {k.paket.aktif === "PRO" ? "Kelola langganan" : "Lihat paket Pro"}
                <Ikon nama="kanan" size={13} />
              </Link>
            </div>
          </Kartu>

          {/* Pengaturan pajak punya halaman sendiri karena isinya menuntut
              pertimbangan, bukan sekadar diisi. Kartu ini menyebutkan dasar
              yang sedang dipakai supaya pemilik toko tahu keadaannya tanpa
              perlu membukanya. */}
          {bolehUbah && (
            <Kartu>
              <KepalaKartu ikon="nota" judul="Pengaturan pajak" />
              <div className="p-4">
                {/* Susunannya sengaja sama dengan kartu langganan di atasnya —
                    label kecil, nilai tebal, lalu satu tombol utama. Kolom ini
                    berisi empat kartu berturut-turut; kalau tiap kartu memakai
                    bentuk sendiri, matanya tidak punya pegangan. */}
                <p className="text-[11px] font-bold tracking-[0.08em] text-tinta-3 uppercase">
                  Dasar perhitungan
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-[15px] leading-snug font-bold text-tinta">
                    {LABEL_REZIM[k.toko.rezimPajak]}
                  </span>
                  {!k.toko.npwp && <Lencana nada="kuning">NPWP kosong</Lencana>}
                </div>

                <Link
                  href="/app/pengaturan/pajak"
                  className="mt-3.5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-merek px-3.5 text-[13px] font-bold text-white transition-colors hover:bg-merek-tua"
                >
                  Buka pengaturan pajak
                  <Ikon nama="kanan" size={13} />
                </Link>
              </div>
            </Kartu>
          )}

          <Kartu>
            <KepalaKartu ikon="grafik" judul="Isi toko" />
            <dl className="divide-y divide-garis">
              {[
                ["Barang tercatat", `${jumlahProduk}`],
                ["Transaksi tersimpan", `${jumlahTransaksi}`],
                ["Akun pengguna", `${jumlahPengguna} / ${k.paket.batas.maksPengguna}`],
                [
                  "Toko dibuat",
                  tokoInfo ? tanggalSingkat(tokoInfo.dibuatPada) : "—",
                ],
              ].map(([label, nilai]) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-[13px] text-tinta-3">{label}</dt>
                  <dd className="angka text-[13px] font-bold text-tinta">{nilai}</dd>
                </div>
              ))}
            </dl>
          </Kartu>

          <Kartu>
            <KepalaKartu ikon="info" judul="Tentang perhitungan" />
            <ul className="space-y-2.5 p-4 text-[12.5px] leading-relaxed text-tinta-2">
              <li className="flex gap-2">
                <Ikon nama="centang" size={13} className="mt-0.5 shrink-0 text-merek" />
                Semua uang dicatat dalam rupiah bulat, tanpa sen, agar tidak ada selisih pembulatan.
              </li>
              <li className="flex gap-2">
                <Ikon nama="centang" size={13} className="mt-0.5 shrink-0 text-merek" />
                Laporan memakai zona waktu WIB (UTC+7), jadi batas hari selalu pukul 00.00 WIB.
              </li>
              <li className="flex gap-2">
                <Ikon nama="centang" size={13} className="mt-0.5 shrink-0 text-merek" />
                Harga modal disimpan ikut di setiap nota, jadi laba lama tidak berubah walau harga
                modal barang diperbarui.
              </li>
            </ul>
          </Kartu>
        </div>
      </div>
    </div>
  );
}
