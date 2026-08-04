import type { Metadata } from "next";
import Link from "next/link";
import { Ikon } from "@/components/ikon";
import {
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
import { angka, persen, rupiah, tanggalPanjang } from "@/lib/format";
import { catatanPajak, KETERANGAN_REZIM, LABEL_REZIM } from "@/lib/pajak";
import { dataPajakTahunan, konfigurasiDariToko, tahunBertransaksi } from "@/lib/pajak-data";
import { wajibPemilik } from "@/lib/sesi";
import { kunciTanggal } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Laporan pajak" };
export const dynamic = "force-dynamic";

export default async function HalamanPajak({
  searchParams,
}: {
  searchParams: Promise<{ tahun?: string }>;
}) {
  const [k, sp] = await Promise.all([wajibPemilik(), searchParams]);

  const sekarang = new Date();
  const tahunSekarang = Number(kunciTanggal(sekarang).slice(0, 4));

  const boleh = k.paket.batas.fitur.pajak;

  const tahunTersedia = await tahunBertransaksi(k.toko.id);
  const daftarTahun =
    tahunTersedia.length > 0 ? tahunTersedia : [tahunSekarang];

  const diminta = Number(sp.tahun);
  const tahun = daftarTahun.includes(diminta) ? diminta : daftarTahun[0];

  if (!boleh) {
    return (
      <div className="p-4 sm:p-6">
        <JudulPajak tahun={tahun} />
        <Kartu className="mt-5">
          <Kosong
            ikon="nota"
            judul="Laporan pajak ada di paket Pro"
            pesan="Catad menyusun rekapitulasi peredaran bruto dan PPh Final setahun penuh dari catatan penjualan yang sudah ada, lalu menyiapkannya sebagai PDF siap cetak."
            aksi={
              <TautanTombol href="/app/pengaturan/langganan" ukuran="besar">
                Lihat paket Pro
              </TautanTombol>
            }
            className="py-12"
          />
        </Kartu>
      </div>
    );
  }

  const konfigurasi = konfigurasiDariToko(k.toko);
  const data = await dataPajakTahunan({ tokoId: k.toko.id, tahun, konfigurasi });

  const { pajak, labaRugi } = data;
  const adaData = pajak.totalPeredaranBruto > 0;
  const identitasLengkap = !!k.toko.npwp;
  const totalDasar = pajak.baris.reduce((j, b) => j + b.dasarPengenaan, 0);

  return (
    <div className="p-4 sm:p-6">
      <JudulPajak
        tahun={tahun}
        aksi={
          adaData ? (
            <a
              href={`/api/laporan/pajak?tahun=${tahun}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-merek px-4 text-[14px] font-bold text-white transition-colors hover:bg-merek-tua"
            >
              <Ikon nama="unduh" size={16} />
              Unduh PDF
            </a>
          ) : null
        }
      />

      {daftarTahun.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {daftarTahun.map((t) => (
            <Link
              key={t}
              href={`/app/pajak?tahun=${t}`}
              className={cn(
                "angka rounded-lg px-3 py-1.5 text-[13px] font-bold transition-colors",
                t === tahun ? "bg-tinta text-white" : "bg-kertas-2 text-tinta-2 hover:bg-garis",
              )}
            >
              {t}
            </Link>
          ))}
        </div>
      )}

      {!identitasLengkap && (
        <Peringatan nada="waspada" className="mt-4" judul="NPWP belum diisi">
          Dokumen tetap bisa diunduh, tetapi kepala laporannya akan menulis &ldquo;belum
          diisi&rdquo;.{" "}
          <Link href="/app/pengaturan" className="font-bold underline">
            Lengkapi identitas pajak
          </Link>{" "}
          supaya siap dilampirkan.
        </Peringatan>
      )}

      {konfigurasi.rezim === "FINAL_UMKM" && pajak.melebihiBatasFinal && (
        <Peringatan nada="bahaya" className="mt-4" judul="Melampaui batas skema PPh Final">
          Peredaran bruto {tahun} sebesar {rupiah(pajak.totalPeredaranBruto)} melampaui Rp4,8
          miliar, sehingga skema final tidak lagi berlaku.{" "}
          <Link href="/app/pengaturan" className="font-bold underline">
            Ubah dasar perhitungan di pengaturan
          </Link>{" "}
          dan hubungi konsultan pajak — angka di halaman ini tidak bisa dipakai apa adanya.
        </Peringatan>
      )}

      {!adaData ? (
        <Kartu className="mt-5">
          <Kosong
            ikon="kalender"
            judul={`Belum ada penjualan di ${tahun}`}
            pesan="Laporan pajak tersusun sendiri begitu ada transaksi yang tercatat."
            className="py-12"
          />
        </Kartu>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Statistik
              label="Peredaran bruto"
              nilai={rupiah(pajak.totalPeredaranBruto, { ringkas: true })}
              keterangan={`${angka(data.bulan.reduce((j, b) => j + b.jumlahTransaksi, 0))} transaksi`}
              ikon="grafik"
            />
            <Statistik
              label={konfigurasi.rezim === "TANPA_HITUNG" ? "Pajak" : "Pajak terutang"}
              nilai={
                konfigurasi.rezim === "TANPA_HITUNG" ? "dihitung di luar" : rupiah(pajak.pajakTerutang)
              }
              keterangan={
                pajak.setoranBulanan ? "disetor tiap masa pajak" : "dihitung setahun sekali"
              }
              ikon="nota"
              aksen={pajak.pajakTerutang > 0 ? "kuning" : "netral"}
            />
            <Statistik
              label="Laba bersih"
              nilai={rupiah(labaRugi.labaBersih, { ringkas: true })}
              keterangan={
                labaRugi.marjinBersih !== null
                  ? `marjin ${persen(labaRugi.marjinBersih, 1)}`
                  : undefined
              }
              ikon="dompet"
              aksen={labaRugi.labaBersih >= 0 ? "merek" : "merah"}
            />
            <Statistik
              label="Sisa fasilitas bebas"
              nilai={
                konfigurasi.fasilitasBebas > 0
                  ? rupiah(pajak.sisaFasilitas, { ringkas: true })
                  : "—"
              }
              keterangan={
                konfigurasi.fasilitasBebas > 0
                  ? `dari ${rupiah(konfigurasi.fasilitasBebas, { ringkas: true })} setahun`
                  : "tidak dipakai pada dasar perhitungan ini"
              }
              ikon="bintang"
            />
          </div>

          <Kartu className="mt-5 overflow-hidden">
            <KepalaKartu
              ikon="kalender"
              judul="Rekapitulasi per masa pajak"
              keterangan="Inilah rincian yang diminta sebagai lampiran SPT Tahunan."
            />
            <Tabel>
              <thead>
                <tr>
                  <Th>Masa pajak</Th>
                  <Th kanan>Peredaran bruto</Th>
                  <Th kanan className="hidden md:table-cell">Kumulatif</Th>
                  {/* Kolom pajak masa hanya bermakna pada skema yang disetor
                      bulanan. Pada rezim lain pajaknya dihitung sekali setahun,
                      jadi kolomnya dihilangkan daripada diisi nol. */}
                  {pajak.setoranBulanan && (
                    <>
                      <Th kanan className="hidden lg:table-cell">Bebas PPh</Th>
                      <Th kanan>Dasar kena</Th>
                      <Th kanan>Pajak masa</Th>
                      <Th kanan className="hidden xl:table-cell">Batas setor</Th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {pajak.baris.map((b) => (
                  <tr
                    key={b.bulan}
                    className={cn(b.peredaranBruto === 0 && "text-tinta-4")}
                  >
                    <Td>
                      <span className="text-[13px] font-semibold text-tinta">{b.namaBulan}</span>
                    </Td>
                    <Td kanan>
                      <span className="angka text-[13px] text-tinta-2">
                        {b.peredaranBruto > 0 ? rupiah(b.peredaranBruto) : "—"}
                      </span>
                    </Td>
                    <Td kanan className="hidden md:table-cell">
                      <span className="angka text-[12.5px] text-tinta-3">
                        {rupiah(b.kumulatif)}
                      </span>
                    </Td>
                    {pajak.setoranBulanan && (
                      <>
                        <Td kanan className="hidden lg:table-cell">
                          <span className="angka text-[12.5px] text-tinta-3">
                            {b.bagianBebas > 0 ? rupiah(b.bagianBebas) : "—"}
                          </span>
                        </Td>
                        <Td kanan>
                          <span className="angka text-[13px] text-tinta-2">
                            {b.dasarPengenaan > 0 ? rupiah(b.dasarPengenaan) : "—"}
                          </span>
                        </Td>
                        <Td kanan>
                          <span className="angka text-[13px] font-bold text-tinta">
                            {b.pajakMasa > 0 ? rupiah(b.pajakMasa) : "—"}
                          </span>
                        </Td>
                        <Td kanan className="hidden xl:table-cell">
                          <span className="angka text-[12px] text-tinta-4">
                            {b.pajakMasa > 0 ? b.jatuhTempoLabel : "—"}
                          </span>
                        </Td>
                      </>
                    )}
                  </tr>
                ))}

                <tr className="border-t-2 border-garis-2 bg-kertas/60">
                  <Td>
                    <span className="text-[13px] font-extrabold text-tinta">Jumlah setahun</span>
                  </Td>
                  <Td kanan>
                    <span className="angka text-[13px] font-extrabold text-tinta">
                      {rupiah(pajak.totalPeredaranBruto)}
                    </span>
                  </Td>
                  <Td kanan className="hidden md:table-cell" />
                  {pajak.setoranBulanan && (
                    <>
                      <Td kanan className="hidden lg:table-cell" />
                      <Td kanan>
                        <span className="angka text-[13px] font-extrabold text-tinta">
                          {rupiah(totalDasar)}
                        </span>
                      </Td>
                      <Td kanan>
                        <span className="angka text-[13px] font-extrabold text-merek-tua">
                          {rupiah(pajak.pajakTerutang)}
                        </span>
                      </Td>
                      <Td kanan className="hidden xl:table-cell" />
                    </>
                  )}
                </tr>
              </tbody>
            </Tabel>
          </Kartu>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <Kartu className="overflow-hidden">
              <KepalaKartu ikon="dompet" judul="Ringkasan laba rugi" />
              <dl className="divide-y divide-garis">
                <BarisLR label="Peredaran bruto (omzet)" nilai={labaRugi.peredaranBruto} />
                <BarisLR label="Harga pokok penjualan" nilai={-labaRugi.hargaPokokPenjualan} />
                <BarisLR label="Laba kotor" nilai={labaRugi.labaKotor} tebal />
                <BarisLR label="Biaya operasional" nilai={-labaRugi.biayaOperasional} />
                <BarisLR label="Laba bersih sebelum pajak" nilai={labaRugi.labaBersih} tebal />
                <BarisLR label={`Pajak penghasilan ${tahun}`} nilai={-pajak.pajakTerutang} />
                <BarisLR
                  label="Laba bersih setelah pajak"
                  nilai={labaRugi.labaBersih - pajak.pajakTerutang}
                  tebal
                  sorot
                />
              </dl>
              {data.pajakDaerahDipungut > 0 && (
                <p className="border-t border-garis px-4 py-3 text-[11.5px] leading-relaxed text-tinta-3">
                  Pajak daerah (PB1/PBJT) yang dipungut dari pembeli sepanjang {tahun}:{" "}
                  <strong className="angka font-bold text-tinta-2">
                    {rupiah(data.pajakDaerahDipungut)}
                  </strong>
                  . Tidak termasuk peredaran bruto maupun laba karena bukan penghasilan toko.
                </p>
              )}
            </Kartu>

            <div className="space-y-4">
              {/* Langkah perhitungan ditampilkan lebih dulu: pemilik toko perlu
                  bisa menelusuri asal angkanya, bukan cuma menerima hasilnya. */}
              <Kartu className="overflow-hidden">
                <KepalaKartu
                  ikon="grafik"
                  judul="Cara angkanya didapat"
                  keterangan={LABEL_REZIM[konfigurasi.rezim]}
                />
                <dl className="divide-y divide-garis">
                  {pajak.langkah.map((l) => (
                    <div
                      key={l.label}
                      className={cn(
                        "flex items-baseline justify-between gap-3 px-4 py-2.5",
                        l.hasil && "bg-merek-muda/40",
                      )}
                    >
                      <dt className="min-w-0">
                        <span
                          className={cn(
                            "block text-[12.5px]",
                            l.hasil ? "font-bold text-tinta" : "text-tinta-2",
                          )}
                        >
                          {l.label}
                        </span>
                        {l.rumus && (
                          <span className="block text-[11px] text-tinta-4">{l.rumus}</span>
                        )}
                      </dt>
                      <dd
                        className={cn(
                          "angka shrink-0 text-right text-[13px]",
                          l.hasil ? "font-extrabold text-tinta" : "font-semibold text-tinta-2",
                        )}
                      >
                        {rupiah(l.nilai)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="border-t border-garis px-4 py-3 text-[11.5px] leading-relaxed text-tinta-3">
                  {KETERANGAN_REZIM[konfigurasi.rezim]}{" "}
                  <Link href="/app/pengaturan" className="font-bold text-merek hover:underline">
                    Ubah dasar perhitungan
                  </Link>
                </p>
              </Kartu>

              <Kartu className="overflow-hidden">
                <KepalaKartu ikon="info" judul="Catatan" />
                <ul className="space-y-2.5 p-4">
                  {catatanPajak(pajak).map((c) => (
                    <li key={c} className="flex gap-2 text-[12.5px] leading-relaxed text-tinta-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-tinta-4" />
                      {c}
                    </li>
                  ))}
                </ul>
              </Kartu>
            </div>
          </div>

          <Peringatan nada="info" className="mt-5" judul="Sebelum dilaporkan">
            Dokumen ini kertas kerja yang disusun otomatis dari catatan penjualan Anda — bukan
            formulir SPT dan bukan nasihat perpajakan. Angkanya siap disalin ke SPT, tetapi
            periksa kembali dan hubungi konsultan pajak bila keadaan usaha Anda tidak sesederhana
            asumsi di atas.
          </Peringatan>

          <p className="mt-3 text-center text-[11.5px] text-tinta-4">
            Data per {tanggalPanjang(sekarang)}.
          </p>
        </>
      )}
    </div>
  );
}

function JudulPajak({ tahun, aksi }: { tahun: number; aksi?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-tinta">
          Laporan pajak
          <Lencana nada="merek">Pro</Lencana>
        </h1>
        <p className="mt-1 text-[13px] text-tinta-3">
          Rekapitulasi peredaran bruto dan PPh Final tahun pajak {tahun}, tersusun sendiri dari
          catatan penjualan.
        </p>
      </div>
      {aksi}
    </div>
  );
}

function BarisLR({
  label,
  nilai,
  tebal,
  sorot,
}: {
  label: string;
  nilai: number;
  tebal?: boolean;
  sorot?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 px-4 py-2.5",
        sorot && "bg-merek-muda/40",
      )}
    >
      <dt
        className={cn(
          "text-[12.5px]",
          tebal ? "font-bold text-tinta" : "text-tinta-3",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "angka text-right text-[13px]",
          tebal ? "font-extrabold text-tinta" : "font-semibold text-tinta-2",
          nilai < 0 && !tebal && "text-merah",
        )}
      >
        {rupiah(nilai)}
      </dd>
    </div>
  );
}
