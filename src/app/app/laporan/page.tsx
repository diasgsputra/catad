import type { Metadata } from "next";
import Link from "next/link";
import { wajibPemilik } from "@/lib/sesi";
import { laporanRentang, rataPerHariMinggu } from "@/lib/laporan";
import {
  JudulHalaman,
  Kartu,
  KepalaKartu,
  Kosong,
  Lencana,
  Peringatan,
  Statistik,
  Tabel,
  TautanTombol,
  Td,
  Th,
} from "@/components/ui";
import { BarisProgres, Cincin, GrafikBatang } from "@/components/grafik";
import { Ikon } from "@/components/ikon";
import {
  awalHariWib,
  dariInputTanggal,
  nilaiInputTanggal,
  persen,
  rupiah,
  selisihHari,
  tambahHari,
  tanggalSingkat,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { PilihRentang } from "./pilih-rentang";

export const metadata: Metadata = { title: "Laporan" };
export const dynamic = "force-dynamic";

const LABEL_METODE: Record<string, string> = {
  TUNAI: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  KARTU: "Kartu",
};

export default async function HalamanLaporan({
  searchParams,
}: {
  searchParams: Promise<{ mulai?: string; selesai?: string }>;
}) {
  // Laporan berisi laba & modal — khusus pemilik.
  const [k, sp] = await Promise.all([wajibPemilik(), searchParams]);
  const sekarang = new Date();

  // Rentang bawaan: 30 hari terakhir.
  const selesaiDiminta = sp.selesai ? dariInputTanggal(sp.selesai) : awalHariWib(sekarang);
  const mulaiDiminta = sp.mulai ? dariInputTanggal(sp.mulai) : tambahHari(awalHariWib(sekarang), -29);

  // Batasi sesuai paket: paket Gratis hanya boleh melihat N hari ke belakang.
  const batasHari = k.paket.batas.riwayatHari;
  const paling = Number.isFinite(batasHari)
    ? tambahHari(awalHariWib(sekarang), -(batasHari - 1))
    : null;

  const dipotong = !!paling && mulaiDiminta.getTime() < paling.getTime();
  const mulai = dipotong ? paling! : mulaiDiminta;
  const selesai = selesaiDiminta.getTime() < mulai.getTime() ? mulai : selesaiDiminta;

  const lap = await laporanRentang(k.toko.id, mulai, selesai);

  // Bandingkan dengan rentang sebelumnya yang sama panjang.
  const panjang = Math.max(1, selisihHari(mulai, selesai) + 1);
  const bandingSelesai = tambahHari(mulai, -1);
  const bandingMulai = tambahHari(bandingSelesai, -(panjang - 1));
  const banding = await laporanRentang(k.toko.id, bandingMulai, bandingSelesai);

  const bedaPendapatan =
    banding.agregat.pendapatan > 0
      ? Math.round(
          ((lap.agregat.pendapatan - banding.agregat.pendapatan) / banding.agregat.pendapatan) * 100,
        )
      : null;

  const perHariMinggu = rataPerHariMinggu(lap.seri);
  const maksHariMinggu = Math.max(1, ...perHariMinggu.map((h) => h.rata));
  const maksProduk = Math.max(1, ...lap.produk.map((p) => p.qty));
  const adaData = lap.agregat.jumlahTransaksi > 0;

  return (
    <div className="p-4 sm:p-6">
      <JudulHalaman
        judul="Laporan"
        keterangan={`${tanggalSingkat(mulai)} – ${tanggalSingkat(selesai)} · ${panjang} hari`}
        aksi={
          k.paket.batas.fitur.ekspor ? (
            <TautanTombol
              href={`/api/laporan/csv?mulai=${nilaiInputTanggal(mulai)}&selesai=${nilaiInputTanggal(selesai)}`}
              varian="kedua"
              ikon="unduh"
            >
              Unduh CSV
            </TautanTombol>
          ) : undefined
        }
      />

      <div className="mt-4">
        <PilihRentang
          mulai={nilaiInputTanggal(mulai)}
          selesai={nilaiInputTanggal(selesai)}
          batasHari={Number.isFinite(batasHari) ? batasHari : null}
        />
      </div>

      {dipotong && (
        <Peringatan nada="waspada" className="mt-3" judul="Rentang dipendekkan">
          Paket Gratis hanya bisa melihat {batasHari} hari terakhir. Rentang disesuaikan mulai{" "}
          {tanggalSingkat(mulai)}.{" "}
          <Link href="/app/pengaturan/langganan" className="font-bold underline">
            Upgrade ke Pro
          </Link>{" "}
          untuk riwayat penuh.
        </Peringatan>
      )}

      {/* Angka utama */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Statistik
          label="Pendapatan"
          nilai={rupiah(lap.agregat.pendapatan)}
          ikon="kasir"
          aksen="merek"
          tren={
            bedaPendapatan !== null
              ? {
                  arah: bedaPendapatan >= 0 ? "naik" : "turun",
                  teks: persen(bedaPendapatan),
                  baik: bedaPendapatan >= 0,
                }
              : undefined
          }
          keterangan={`vs ${rupiah(banding.agregat.pendapatan, { ringkas: true })} periode lalu`}
        />
        <Statistik
          label="Laba kotor"
          nilai={rupiah(lap.agregat.labaKotor)}
          ikon="naik"
          keterangan={
            lap.agregat.marginPersen !== null
              ? `margin ${Math.round(lap.agregat.marginPersen)}%`
              : "belum ada data"
          }
        />
        <Statistik
          label="Pengeluaran"
          nilai={rupiah(lap.pengeluaran)}
          ikon="dompet"
          aksen={lap.pengeluaran > lap.agregat.labaKotor ? "merah" : "netral"}
          keterangan="biaya operasional tercatat"
        />
        <Statistik
          label="Laba bersih"
          nilai={rupiah(lap.labaBersih)}
          ikon="dompet"
          aksen={lap.labaBersih >= 0 ? "merek" : "merah"}
          keterangan="laba kotor − pengeluaran"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Statistik label="Transaksi" nilai={lap.agregat.jumlahTransaksi} ikon="nota" />
        <Statistik
          label="Rata-rata belanja"
          nilai={rupiah(lap.agregat.rataKeranjang)}
          ikon="keranjang"
          keterangan="per transaksi"
        />
        <Statistik
          label="Total diskon"
          nilai={rupiah(lap.agregat.diskon)}
          ikon="turun"
          keterangan="potongan yang diberikan"
        />
      </div>

      {/* Grafik harian */}
      <Kartu className="mt-5">
        <KepalaKartu
          ikon="grafik"
          judul="Pendapatan harian"
          keterangan="Bagian gelap menunjukkan laba kotor"
        />
        <div className="p-4">
          {!adaData ? (
            <Kosong
              judul="Belum ada transaksi di rentang ini"
              pesan="Coba pilih rentang tanggal lain."
              ikon="grafik"
              className="py-8"
            />
          ) : (
            <GrafikBatang
              data={lap.seri.map((s) => ({
                label: s.label,
                nilai: s.pendapatan,
                nilaiKedua: Math.max(0, s.laba),
                judul: `${tanggalSingkat(s.tanggal)}: ${rupiah(s.pendapatan)} · laba ${rupiah(s.laba)} · ${s.jumlahTransaksi} transaksi`,
              }))}
              tinggi={200}
              tampilkanLabelKe={lap.seri.length > 20 ? 5 : lap.seri.length > 10 ? 3 : 1}
            />
          )}
        </div>
      </Kartu>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        {/* Barang terlaris */}
        <Kartu className="overflow-hidden">
          <KepalaKartu ikon="bintang" judul="Barang paling laku" keterangan="Urut dari jumlah terjual" />
          {lap.produk.length === 0 ? (
            <Kosong judul="Belum ada barang terjual" ikon="kotak" className="py-10" />
          ) : (
            <Tabel>
              <thead>
                <tr>
                  <Th>Barang</Th>
                  <Th kanan className="hidden sm:table-cell">Terjual</Th>
                  <Th kanan>Pendapatan</Th>
                  <Th kanan className="hidden md:table-cell">Laba</Th>
                </tr>
              </thead>
              <tbody>
                {lap.produk.map((p, i) => (
                  <tr key={`${p.produkId ?? p.nama}-${i}`} className="hover:bg-kertas/60">
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "angka flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-extrabold",
                            i === 0
                              ? "bg-emas/20 text-kuning"
                              : "bg-kertas-2 text-tinta-3",
                          )}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <span className="block truncate text-[13.5px] font-semibold text-tinta">
                            {p.nama}
                          </span>
                          <span className="angka mt-0.5 block text-[11.5px] text-tinta-3 sm:hidden">
                            {p.qty} {p.satuan} terjual
                          </span>
                        </div>
                      </div>
                    </Td>
                    <Td kanan className="hidden sm:table-cell">
                      <span className="angka text-[13.5px] font-bold text-tinta">
                        {p.qty}
                        <span className="ml-0.5 text-[11px] font-medium text-tinta-4">
                          {p.satuan}
                        </span>
                      </span>
                    </Td>
                    <Td kanan>
                      <span className="angka text-[13px] text-tinta-2">{rupiah(p.pendapatan)}</span>
                    </Td>
                    <Td kanan className="hidden md:table-cell">
                      <span
                        className={cn(
                          "angka text-[13px] font-semibold",
                          p.laba >= 0 ? "text-hijau" : "text-merah",
                        )}
                      >
                        {rupiah(p.laba)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tabel>
          )}
        </Kartu>

        <div className="space-y-5">
          {/* Metode bayar */}
          <Kartu>
            <KepalaKartu ikon="dompet" judul="Cara pembeli membayar" />
            <div className="space-y-3.5 p-4">
              {lap.metode.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-tinta-3">Belum ada data.</p>
              ) : (
                lap.metode.map((m) => (
                  <BarisProgres
                    key={m.metode}
                    label={LABEL_METODE[m.metode] ?? m.metode}
                    nilai={m.nilai}
                    maks={lap.agregat.pendapatan}
                    keterangan={`${rupiah(m.nilai, { ringkas: true })} · ${m.persen}%`}
                  />
                ))
              )}
            </div>
          </Kartu>

          {/* Rata-rata per hari */}
          <Kartu>
            <KepalaKartu ikon="kalender" judul="Rata-rata per hari" keterangan="Hari mana yang paling ramai" />
            <div className="space-y-2.5 p-4">
              {perHariMinggu.map((h) => (
                <BarisProgres
                  key={h.indeks}
                  label={h.nama}
                  nilai={h.rata}
                  maks={maksHariMinggu}
                  keterangan={rupiah(h.rata, { ringkas: true })}
                  warna={h.rata === maksHariMinggu && h.rata > 0 ? "bg-merek" : "bg-merek/40"}
                />
              ))}
            </div>
          </Kartu>

          {/* Margin */}
          {lap.agregat.marginPersen !== null && (
            <Kartu>
              <KepalaKartu ikon="grafik" judul="Kesehatan margin" />
              <div className="flex items-center gap-4 p-4">
                <Cincin
                  persen={Math.max(0, Math.min(100, lap.agregat.marginPersen))}
                  ukuran={72}
                  label={`${Math.round(lap.agregat.marginPersen)}%`}
                />
                <div className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-tinta-2">
                  Dari setiap {rupiah(1000)} penjualan, sekitar{" "}
                  <strong className="angka font-bold text-tinta">
                    {rupiah(Math.round((lap.agregat.marginPersen / 100) * 1000))}
                  </strong>{" "}
                  menjadi laba kotor sebelum biaya operasional.
                  {lap.produk.some((p) => p.laba <= 0) && (
                    <span className="mt-1.5 block text-kuning">
                      Ada barang yang labanya nol atau minus — cek harga modalnya.
                    </span>
                  )}
                </div>
              </div>
            </Kartu>
          )}
        </div>
      </div>

      {!k.paket.batas.fitur.ekspor && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-garis-2 bg-white px-5 py-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-kertas-2 text-tinta-3">
              <Ikon nama="unduh" size={16} />
            </span>
            <div>
              <p className="text-[13.5px] font-bold text-tinta">Unduh laporan sebagai CSV</p>
              <p className="text-[12.5px] text-tinta-3">
                Tersedia di paket Pro — cocok untuk dibuka di Excel atau diserahkan ke akuntan.
              </p>
            </div>
          </div>
          <TautanTombol href="/app/pengaturan/langganan" varian="kedua" ukuran="kecil">
            Lihat paket Pro
          </TautanTombol>
        </div>
      )}
    </div>
  );
}
