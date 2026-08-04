import type { Metadata } from "next";
import Link from "next/link";
import { wajibPemilik } from "@/lib/sesi";
import { siapkanInsight, JENDELA_VELOSITAS } from "@/lib/insight-data";
import {
  JudulHalaman,
  Kartu,
  KepalaKartu,
  Kosong,
  Lencana,
  Statistik,
  Tabel,
  TautanTombol,
  Td,
  Th,
} from "@/components/ui";
import { Ikon } from "@/components/ikon";
import { KartuInsight } from "@/components/kartu-insight";
import { PetaJam } from "@/components/grafik";
import { rupiah, tanggalPanjang, jarakHari } from "@/lib/format";
import { cn } from "@/lib/utils";
import { HARGA_PRO_BULANAN, HARI_UJI_COBA } from "@/lib/plan";
import { AMBANG_KRITIS_HARI, type StatusStok } from "@/lib/insight";
import { DaftarBelanja } from "./daftar-belanja";

export const metadata: Metadata = { title: "Catad Insight" };
export const dynamic = "force-dynamic";

const LABEL_STATUS: Record<StatusStok, { teks: string; nada: "merah" | "kuning" | "hijau" | "netral" }> = {
  HABIS: { teks: "Habis", nada: "merah" },
  KRITIS: { teks: "Kritis", nada: "merah" },
  WASPADA: { teks: "Menipis", nada: "kuning" },
  AMAN: { teks: "Aman", nada: "hijau" },
  TIDAK_BERGERAK: { teks: "Mandek", nada: "netral" },
};

export default async function HalamanInsight() {
  // Insight menampilkan modal & laba, jadi khusus pemilik.
  const k = await wajibPemilik();
  const d = await siapkanInsight(k.toko.id);
  const bolehInsight = k.paket.batas.fitur.insight;

  if (!bolehInsight) {
    return (
      <div className="p-4 sm:p-6">
        <JudulHalaman
          judul="Catad Insight"
          keterangan="Prediksi stok, daftar belanja otomatis, dan ringkasan harian."
        />
        <TerkunciPro perluTindakan={d.ringkasStok.perluTindakan} />
      </div>
    );
  }

  const { prediksi, belanja, stokMati, ringkasStok, briefing } = d;
  const dipantau = prediksi.filter((p) => p.status !== "TIDAK_BERGERAK" || p.produk.stok > 0);

  return (
    <div className="p-4 sm:p-6">
      <JudulHalaman
        judul="Catad Insight"
        keterangan={`Dihitung dari penjualan ${JENDELA_VELOSITAS} hari terakhir · ${tanggalPanjang(d.sekarang)}`}
        aksi={
          <TautanTombol href="/app/stok" varian="kedua" ikon="stok">
            Kelola stok
          </TautanTombol>
        }
      />

      {/* Ringkasan angka */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Statistik
          label="Perlu dibeli"
          nilai={belanja.baris.length}
          ikon="keranjang"
          aksen={belanja.baris.length > 0 ? "kuning" : "netral"}
          keterangan={`estimasi ${rupiah(belanja.totalEstimasi, { ringkas: true })}`}
        />
        <Statistik
          label="Stok habis"
          nilai={ringkasStok.HABIS}
          ikon="stok-kosong"
          aksen={ringkasStok.HABIS > 0 ? "merah" : "netral"}
          keterangan="kehilangan penjualan"
        />
        <Statistik
          label={`Habis < ${AMBANG_KRITIS_HARI} hari`}
          nilai={ringkasStok.KRITIS}
          ikon="peringatan"
          aksen={ringkasStok.KRITIS > 0 ? "kuning" : "netral"}
          keterangan="siapkan kulakan"
        />
        <Statistik
          label="Modal mandek"
          nilai={rupiah(
            stokMati.reduce((t, s) => t + s.modalTertahan, 0),
            { ringkas: true },
          )}
          ikon="stok-mati"
          keterangan={`di ${stokMati.length} barang`}
        />
      </div>

      {/* Briefing harian */}
      <Kartu className="mt-5 overflow-hidden">
        <KepalaKartu
          ikon="insight"
          judul="Ringkasan hari ini"
          keterangan="Disusun otomatis dari data toko, bukan perkiraan kasar"
        />
        <ul className="divide-y divide-garis">
          {briefing.map((s) => (
            <li key={s.id}>
              <KartuInsight insight={s} />
            </li>
          ))}
        </ul>
      </Kartu>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        {/* Daftar belanja */}
        <Kartu id="belanja" className="scroll-mt-6 overflow-hidden">
          <KepalaKartu
            ikon="keranjang"
            judul="Daftar belanja otomatis"
            keterangan={`Cukup untuk ${belanja.horizonHari} hari ke depan`}
          />
          <DaftarBelanja
            horizonHari={belanja.horizonHari}
            namaToko={k.toko.nama}
            baris={belanja.baris.map((b) => ({
              id: b.produk.id,
              nama: b.produk.nama,
              satuan: b.produk.satuan,
              qtySaran: b.qtySaran,
              estimasiBiaya: b.estimasiBiaya,
              hariTersisa: b.hariTersisa,
              status: b.status,
              alasan: b.alasan,
              stok: b.produk.stok,
            }))}
          />
        </Kartu>

        <div className="space-y-5">
          {/* Jam sibuk */}
          <Kartu>
            <KepalaKartu
              ikon="jam"
              judul="Jam paling ramai"
              keterangan="Sebaran penjualan 30 hari terakhir"
            />
            <div className="p-4">
              <PetaJam data={d.emberJam} />
              <p className="mt-3 text-[12.5px] leading-relaxed text-tinta-3">
                Kotak yang lebih gelap berarti pendapatan lebih besar di jam itu. Pakai ini untuk
                menentukan kapan stok dan tenaga perlu disiapkan.
              </p>
            </div>
          </Kartu>

          {/* Barang mandek */}
          <Kartu id="mandek" className="scroll-mt-6 overflow-hidden">
            <KepalaKartu
              ikon="stok-mati"
              judul="Barang mandek"
              keterangan={`Tidak terjual dalam ${JENDELA_VELOSITAS} hari terakhir`}
            />
            {stokMati.length === 0 ? (
              <Kosong
                judul="Semua barang bergerak"
                pesan="Tidak ada modal yang tertahan di barang yang tidak laku."
                ikon="centang"
                className="py-10"
              />
            ) : (
              <>
                <ul className="max-h-80 divide-y divide-garis overflow-y-auto">
                  {stokMati.slice(0, 12).map((s) => (
                    <li key={s.produk.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-bold text-tinta">
                          {s.produk.nama}
                        </p>
                        <p className="text-[11.5px] text-tinta-3">
                          Sisa {s.produk.stok} {s.produk.satuan}
                          {s.hariTanpaPenjualan !== null
                            ? ` · terakhir laku ${jarakHari(-s.hariTanpaPenjualan)}`
                            : " · belum pernah terjual"}
                        </p>
                      </div>
                      <span className="angka shrink-0 text-[13px] font-bold text-tinta-2">
                        {s.modalTertahan > 0 ? rupiah(s.modalTertahan) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-garis bg-kertas px-4 py-3 text-[12px] leading-relaxed text-tinta-3">
                  Pertimbangkan diskon, jual bundling dengan barang laris, atau hentikan kulakan
                  barang ini.
                </div>
              </>
            )}
          </Kartu>
        </div>
      </div>

      {/* Prediksi stok lengkap */}
      <Kartu className="mt-5 overflow-hidden">
        <KepalaKartu
          ikon="stok"
          judul="Prediksi stok habis"
          keterangan={`${dipantau.length} barang dipantau · dihitung dari kecepatan jual nyata`}
        />
        {dipantau.length === 0 ? (
          <Kosong
            judul="Belum ada barang dengan pelacakan stok"
            pesan="Aktifkan pelacakan stok pada barang agar Catad bisa memprediksi kapan habis."
            aksi={
              <TautanTombol href="/app/produk" ukuran="kecil" ikon="tambah">
                Kelola barang
              </TautanTombol>
            }
          />
        ) : (
          <Tabel>
            <thead>
              <tr>
                {/* Enam kolom tidak muat di ponsel. Sisa dan laku/hari turun
                    ke dalam sel nama; yang tersisa di layar sempit adalah dua
                    hal yang menentukan tindakan: kapan habis, dan statusnya. */}
                <Th>Barang</Th>
                <Th kanan className="hidden md:table-cell">Sisa</Th>
                <Th kanan className="hidden md:table-cell">Laku/hari</Th>
                <Th kanan>
                  <span className="sm:hidden">Habis</span>
                  <span className="hidden sm:inline">Perkiraan habis</span>
                </Th>
                <Th kanan className="hidden lg:table-cell">Keandalan</Th>
                <Th kanan>Status</Th>
              </tr>
            </thead>
            <tbody>
              {dipantau.map((p) => {
                const label = LABEL_STATUS[p.status];
                return (
                  <tr key={p.produk.id} className="hover:bg-kertas/60">
                    <Td>
                      <p className="truncate text-[13.5px] font-semibold text-tinta">
                        {p.produk.nama}
                      </p>
                      <p className="angka mt-0.5 text-[11.5px] text-tinta-3 md:hidden">
                        <span className={cn(p.produk.stok <= 0 && "font-bold text-merah")}>
                          sisa {p.produk.stok} {p.produk.satuan}
                        </span>
                        {p.perHari > 0 && (
                          <> · {p.perHari.toFixed(1).replace(".", ",")}/hari</>
                        )}
                      </p>
                    </Td>
                    <Td kanan className="hidden md:table-cell">
                      <span
                        className={cn(
                          "angka text-[13.5px] font-bold",
                          p.produk.stok <= 0 ? "text-merah" : "text-tinta",
                        )}
                      >
                        {p.produk.stok}
                        <span className="ml-0.5 text-[11px] font-medium text-tinta-4">
                          {p.produk.satuan}
                        </span>
                      </span>
                    </Td>
                    <Td kanan className="hidden md:table-cell">
                      <span className="angka text-[13px] text-tinta-2">
                        {p.perHari > 0 ? p.perHari.toFixed(1).replace(".", ",") : "—"}
                      </span>
                    </Td>
                    <Td kanan>
                      {p.hariTersisa === null ? (
                        <span className="text-[12.5px] text-tinta-4">
                          <span className="sm:hidden">—</span>
                          <span className="hidden sm:inline">belum bisa dihitung</span>
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "angka text-[13px] font-bold",
                            p.hariTersisa <= AMBANG_KRITIS_HARI ? "text-merah" : "text-tinta-2",
                          )}
                        >
                          {p.hariTersisa === 0 ? "hari ini" : `${p.hariTersisa} hari`}
                        </span>
                      )}
                    </Td>
                    <Td kanan className="hidden lg:table-cell">
                      <span
                        className={cn(
                          "text-[11.5px] font-semibold",
                          p.keandalan === "tinggi"
                            ? "text-hijau"
                            : p.keandalan === "sedang"
                              ? "text-kuning"
                              : "text-tinta-4",
                        )}
                      >
                        {p.keandalan}
                      </span>
                    </Td>
                    <Td kanan>
                      <Lencana nada={label.nada}>{label.teks}</Lencana>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabel>
        )}
        <div className="border-t border-garis bg-kertas px-4 py-3 text-[11.5px] leading-relaxed text-tinta-3">
          <strong className="font-bold text-tinta-2">Cara Catad menghitung:</strong> total unit
          terjual dalam {JENDELA_VELOSITAS} hari dibagi {JENDELA_VELOSITAS} hari, lalu stok saat ini
          dibagi angka itu. Keandalan “rendah” berarti barang baru terjual di sedikit hari, jadi
          angkanya masih kasar.
        </div>
      </Kartu>
    </div>
  );
}

function TerkunciPro({ perluTindakan }: { perluTindakan: number }) {
  const contoh = [
    {
      ikon: "stok" as const,
      judul: "Prediksi stok habis",
      isi: "“Minyak goreng cukup 2 hari lagi” — dari kecepatan jual nyata, bukan sekadar batas minimum.",
    },
    {
      ikon: "keranjang" as const,
      judul: "Daftar belanja otomatis",
      isi: "Apa yang harus dikulakan, berapa banyak, dan berapa perkiraan modalnya.",
    },
    {
      ikon: "stok-mati" as const,
      judul: "Modal yang mandek",
      isi: "Barang yang tidak laku beserta nilai modal yang tertahan di rak.",
    },
    {
      ikon: "insight" as const,
      judul: "Ringkasan bahasa manusia",
      isi: "Apa yang naik, apa yang turun, dan apa yang sebaiknya dilakukan hari ini.",
    },
  ];

  return (
    <>
      <Kartu className="mt-5 overflow-hidden">
        <div className="flex flex-col items-center border-b border-garis bg-tinta px-6 py-10 text-center text-white">
          <span className="flex size-12 items-center justify-center rounded-xl bg-white/10 text-emas">
            <Ikon nama="kunci" size={22} />
          </span>
          <h2 className="mt-4 text-[22px] font-extrabold tracking-[-0.025em]">
            Catad Insight ada di paket Pro
          </h2>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-white/65">
            {perluTindakan > 0 ? (
              <>
                Saat ini ada <strong className="font-bold text-white">{perluTindakan} barang</strong>{" "}
                yang perlu diperhatikan. Aktifkan Pro untuk melihat mana yang harus dibeli dan
                berapa banyak.
              </>
            ) : (
              <>
                Aktifkan Pro untuk mengubah data penjualan Anda menjadi saran yang dapat langsung
                dikerjakan.
              </>
            )}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <TautanTombol href="/app/pengaturan/langganan" ukuran="besar">
              Aktifkan Pro · {rupiah(HARGA_PRO_BULANAN)}/bulan
            </TautanTombol>
          </div>
          <p className="mt-3 text-[12px] text-white/40">
            Uji coba {HARI_UJI_COBA} hari sudah pernah dipakai untuk toko ini.
          </p>
        </div>

        <div className="grid gap-px bg-garis sm:grid-cols-2">
          {contoh.map((c) => (
            <div key={c.judul} className="bg-white p-5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-merek-muda text-merek">
                <Ikon nama={c.ikon} size={17} />
              </span>
              <p className="mt-3 text-[14.5px] font-extrabold text-tinta">{c.judul}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-tinta-2">{c.isi}</p>
            </div>
          ))}
        </div>
      </Kartu>

      <p className="mt-4 text-center text-[13px] text-tinta-3">
        Sementara itu, peringatan stok minimum tetap bisa dilihat di{" "}
        <Link href="/app/stok" className="font-bold text-merek hover:underline">
          halaman Stok
        </Link>
        .
      </p>
    </>
  );
}
