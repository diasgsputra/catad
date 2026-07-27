import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { konteks } from "@/lib/sesi";
import { siapkanInsight } from "@/lib/insight-data";
import {
  JudulHalaman,
  Kartu,
  KepalaKartu,
  Kosong,
  Lencana,
  Peringatan,
  Statistik,
  TautanTombol,
} from "@/components/ui";
import { Ikon, type NamaIkon } from "@/components/ikon";
import { GrafikBatang } from "@/components/grafik";
import { KartuInsight } from "@/components/kartu-insight";
import {
  jamMenit,
  persen,
  rupiah,
  tanggalPanjang,
  tanggalSingkat,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { HARGA_PRO_BULANAN } from "@/lib/plan";

export const metadata: Metadata = { title: "Ringkasan" };
export const dynamic = "force-dynamic";

export default async function HalamanRingkasan({
  searchParams,
}: {
  searchParams: Promise<{ baru?: string; galat?: string }>;
}) {
  const [k, sp] = await Promise.all([konteks(), searchParams]);

  // Ringkasan memuat angka laba, jadi khusus pemilik. Kasir langsung ke kasir.
  if (k.sesi.peran !== "PEMILIK") redirect("/app/kasir");

  const d = await siapkanInsight(k.toko.id);

  const [transaksiTerakhir, jumlahProduk] = await Promise.all([
    db.transaksi.findMany({
      where: { tokoId: k.toko.id, status: "SELESAI" },
      select: {
        id: true,
        nomor: true,
        kodeNota: true,
        total: true,
        metodeBayar: true,
        dibuatPada: true,
        _count: { select: { item: true } },
      },
      orderBy: { dibuatPada: "desc" },
      take: 6,
    }),
    db.produk.count({ where: { tokoId: k.toko.id } }),
  ]);

  const jam = new Date().getUTCHours() + 7;
  const sapaan = jam % 24 < 11 ? "Selamat pagi" : jam % 24 < 15 ? "Selamat siang" : jam % 24 < 18 ? "Selamat sore" : "Selamat malam";

  const belumSiap = jumlahProduk === 0;
  const sorotan = d.briefing.slice(0, 3);
  const seri14 = d.seri30.slice(-14);

  return (
    <div className="p-4 sm:p-6">
      <JudulHalaman
        judul={`${sapaan}, ${k.sesi.nama.split(" ")[0]}`}
        keterangan={tanggalPanjang(d.sekarang)}
        aksi={
          <>
            <TautanTombol href="/app/laporan" varian="kedua" ikon="grafik">
              Laporan
            </TautanTombol>
            <TautanTombol href="/app/kasir" ikon="kasir">
              Buka kasir
            </TautanTombol>
          </>
        }
      />

      {sp.galat === "khusus-pemilik" && (
        <Peringatan nada="waspada" className="mt-4">
          Halaman itu hanya bisa dibuka oleh pemilik toko.
        </Peringatan>
      )}

      {/* Panduan awal untuk toko yang baru dibuat */}
      {belumSiap && (
        <Kartu className="mt-5 overflow-hidden border-merek-garis">
          <div className="bg-merek-muda px-5 py-4">
            <p className="flex items-center gap-2 text-[15px] font-extrabold text-merek-tua">
              <Ikon nama="petir" size={16} isi />
              Tiga langkah sebelum mulai jualan
            </p>
            <p className="mt-0.5 text-[13px] text-merek-tua/75">
              Setelah barang masuk, semua laporan dan pengingat akan jalan sendiri.
            </p>
          </div>
          <ol className="divide-y divide-garis">
            {[
              {
                judul: "Masukkan barang jualan",
                isi: "Nama, harga jual, dan harga modal. Harga modal dipakai untuk hitung untung.",
                href: "/app/produk",
                label: "Tambah barang",
                selesai: false,
              },
              {
                judul: "Coba satu transaksi di kasir",
                isi: "Pilih barang, tekan bayar. Nota langsung tersimpan.",
                href: "/app/kasir",
                label: "Buka kasir",
                selesai: false,
              },
              {
                judul: "Lihat Catad Insight",
                isi: "Setelah beberapa transaksi, Catad mulai memberi saran belanja.",
                href: "/app/insight",
                label: "Lihat Insight",
                selesai: false,
              },
            ].map((l, i) => (
              <li key={l.judul} className="flex items-start gap-3 px-5 py-3.5">
                <span className="angka mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-garis-2 text-[12px] font-extrabold text-tinta-3">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-tinta">{l.judul}</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-tinta-3">{l.isi}</p>
                </div>
                <TautanTombol href={l.href} varian="kedua" ukuran="kecil" className="shrink-0">
                  {l.label}
                </TautanTombol>
              </li>
            ))}
          </ol>
        </Kartu>
      )}

      {sp.baru === "1" && !belumSiap && (
        <Peringatan nada="sukses" className="mt-4" judul="Toko berhasil dibuat">
          Fitur Pro aktif selama masa uji coba. Selamat mencoba Catad!
        </Peringatan>
      )}

      {k.paket.ujiCobaHabis && k.paket.aktif === "GRATIS" && (
        <Peringatan nada="waspada" className="mt-4" judul="Masa uji coba Pro sudah berakhir">
          Seluruh data Anda tetap aman. Berlangganan {rupiah(HARGA_PRO_BULANAN)}/bulan untuk
          mengaktifkan kembali Catad Insight dan laporan tanpa batas.{" "}
          <Link href="/app/pengaturan/langganan" className="font-bold underline">
            Lihat paket
          </Link>
        </Peringatan>
      )}

      {/* Angka hari ini */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Statistik
          label="Penjualan hari ini"
          nilai={rupiah(d.hariIni.pendapatan)}
          ikon="kasir"
          aksen="merek"
          tren={
            d.trenHariIni !== null && d.rataHarian7 > 0
              ? {
                  arah: d.trenHariIni >= 0 ? "naik" : "turun",
                  teks: persen(d.trenHariIni),
                  baik: d.trenHariIni >= 0,
                }
              : undefined
          }
          keterangan={d.rataHarian7 > 0 ? `rata-rata ${rupiah(d.rataHarian7, { ringkas: true })}` : "belum ada pembanding"}
        />
        <Statistik
          label="Laba kotor hari ini"
          nilai={rupiah(d.hariIni.labaKotor)}
          ikon="naik"
          aksen="netral"
          keterangan={
            d.hariIni.marginPersen !== null
              ? `margin ${Math.round(d.hariIni.marginPersen)}%`
              : "belum ada penjualan"
          }
        />
        <Statistik
          label="Transaksi hari ini"
          nilai={d.hariIni.jumlahTransaksi}
          ikon="nota"
          keterangan={`kemarin ${d.kemarin.jumlahTransaksi} transaksi`}
        />
        <Statistik
          label="Rata-rata belanja"
          nilai={rupiah(d.hariIni.rataKeranjang)}
          ikon="keranjang"
          keterangan="per transaksi hari ini"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          {/* Grafik 14 hari */}
          <Kartu>
            <KepalaKartu
              ikon="grafik"
              judul="Penjualan 14 hari terakhir"
              keterangan={`Total ${rupiah(seri14.reduce((t, s) => t + s.pendapatan, 0))}`}
              aksi={
                <Link
                  href="/app/laporan"
                  className="inline-flex items-center gap-1 text-[12.5px] font-bold text-merek hover:underline"
                >
                  Detail
                  <Ikon nama="kanan" size={12} />
                </Link>
              }
            />
            <div className="p-4">
              {seri14.every((s) => s.pendapatan === 0) ? (
                <Kosong
                  judul="Belum ada penjualan"
                  pesan="Grafik akan muncul setelah transaksi pertama tersimpan."
                  ikon="grafik"
                  className="py-8"
                />
              ) : (
                <GrafikBatang
                  data={seri14.map((s, i) => ({
                    label: s.label,
                    nilai: s.pendapatan,
                    sorot: i === seri14.length - 1,
                    judul: `${tanggalSingkat(s.tanggal)}: ${rupiah(s.pendapatan)} · ${s.jumlahTransaksi} transaksi`,
                  }))}
                  tampilkanLabelKe={2}
                />
              )}
            </div>
          </Kartu>

          {/* Sorotan Catad Insight */}
          <Kartu className="overflow-hidden">
            <KepalaKartu
              ikon="insight"
              judul="Catad Insight"
              keterangan="Kesimpulan penting hari ini"
              aksi={
                <Link
                  href="/app/insight"
                  className="inline-flex items-center gap-1 text-[12.5px] font-bold text-merek hover:underline"
                >
                  Semua insight
                  <Ikon nama="kanan" size={12} />
                </Link>
              }
            />
            {k.paket.batas.fitur.insight ? (
              <ul className="divide-y divide-garis">
                {sorotan.map((s) => (
                  <li key={s.id}>
                    <KartuInsight insight={s} ringkas />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4">
                <TeaserInsight jumlah={d.ringkasStok.perluTindakan} />
              </div>
            )}
          </Kartu>
        </div>

        <div className="space-y-5">
          {/* Perlu dibeli */}
          <Kartu className="overflow-hidden">
            <KepalaKartu
              ikon="stok"
              judul="Perlu segera dibeli"
              keterangan={
                d.ringkasStok.perluTindakan > 0
                  ? `${d.ringkasStok.HABIS} habis · ${d.ringkasStok.KRITIS} kritis`
                  : "Semua stok aman"
              }
              aksi={
                <Link
                  href="/app/stok"
                  className="inline-flex items-center gap-1 text-[12.5px] font-bold text-merek hover:underline"
                >
                  Kelola
                  <Ikon nama="kanan" size={12} />
                </Link>
              }
            />
            {d.belanja.baris.length === 0 ? (
              <Kosong
                judul="Tidak ada yang mendesak"
                pesan="Catad akan memberi tahu begitu ada barang yang mendekati habis."
                ikon="centang"
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-garis">
                {d.belanja.baris.slice(0, 5).map((b) => (
                  <li key={b.produk.id} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        b.status === "HABIS" ? "bg-merah" : "bg-kuning",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-tinta">{b.produk.nama}</p>
                      <p className="text-[11.5px] text-tinta-3">
                        {b.hariTersisa === null
                          ? "stok kosong"
                          : b.hariTersisa === 0
                            ? "bisa habis hari ini"
                            : `cukup ${b.hariTersisa} hari lagi`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="angka text-[13px] font-bold text-tinta">
                        {b.qtySaran} {b.produk.satuan}
                      </p>
                      {b.estimasiBiaya > 0 && (
                        <p className="angka text-[11px] text-tinta-4">
                          {rupiah(b.estimasiBiaya, { ringkas: true })}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {d.belanja.baris.length > 0 && (
              <div className="flex items-center justify-between border-t border-garis bg-kertas px-4 py-3">
                <span className="text-[12.5px] text-tinta-3">
                  {d.belanja.baris.length} barang · estimasi
                </span>
                <span className="angka text-[14px] font-extrabold text-tinta">
                  {rupiah(d.belanja.totalEstimasi)}
                </span>
              </div>
            )}
          </Kartu>

          {/* Transaksi terakhir */}
          <Kartu className="overflow-hidden">
            <KepalaKartu
              ikon="nota"
              judul="Transaksi terakhir"
              aksi={
                <Link
                  href="/app/transaksi"
                  className="inline-flex items-center gap-1 text-[12.5px] font-bold text-merek hover:underline"
                >
                  Semua
                  <Ikon nama="kanan" size={12} />
                </Link>
              }
            />
            {transaksiTerakhir.length === 0 ? (
              <Kosong
                judul="Belum ada transaksi"
                pesan="Transaksi pertama akan muncul di sini."
                ikon="nota"
                className="py-8"
                aksi={
                  <TautanTombol href="/app/kasir" ukuran="kecil" ikon="kasir">
                    Buka kasir
                  </TautanTombol>
                }
              />
            ) : (
              <ul className="divide-y divide-garis">
                {transaksiTerakhir.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/app/transaksi/${t.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-kertas/60"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-kertas-2 text-tinta-3">
                        <Ikon nama={ikonMetode(t.metodeBayar)} size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="angka truncate text-[12.5px] font-bold text-tinta">
                          {t.nomor}
                        </p>
                        <p className="text-[11.5px] text-tinta-3">
                          {jamMenit(t.dibuatPada)} · {t._count.item} barang
                        </p>
                      </div>
                      <span className="angka shrink-0 text-[13.5px] font-extrabold text-tinta">
                        {rupiah(t.total)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>
        </div>
      </div>
    </div>
  );
}

function ikonMetode(metode: string): NamaIkon {
  if (metode === "TUNAI") return "dompet";
  if (metode === "QRIS") return "petir";
  if (metode === "TRANSFER") return "kanan";
  return "kasir";
}

function TeaserInsight({ jumlah }: { jumlah: number }) {
  return (
    <div className="rounded-xl border border-dashed border-garis-2 bg-kertas p-5 text-center">
      <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-tinta text-emas">
        <Ikon nama="kunci" size={18} />
      </span>
      <p className="mt-3 text-[14.5px] font-extrabold text-tinta">Catad Insight terkunci</p>
      <p className="mx-auto mt-1 max-w-xs text-[12.5px] leading-relaxed text-tinta-3">
        {jumlah > 0 ? (
          <>
            Ada <strong className="font-bold text-tinta-2">{jumlah} barang</strong> yang perlu
            diperhatikan. Aktifkan Pro untuk melihat prediksi habis, daftar belanja otomatis, dan
            ringkasan harian.
          </>
        ) : (
          <>
            Aktifkan Pro untuk melihat prediksi stok habis, daftar belanja otomatis, dan ringkasan
            harian dalam bahasa manusia.
          </>
        )}
      </p>
      <div className="mt-4 flex items-center justify-center gap-2">
        <TautanTombol href="/app/pengaturan/langganan" ukuran="kecil">
          Aktifkan Pro
        </TautanTombol>
        <Lencana nada="netral">{rupiah(HARGA_PRO_BULANAN)}/bln</Lencana>
      </div>
    </div>
  );
}
