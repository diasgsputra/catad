import type { Metadata } from "next";
import { db } from "@/lib/db";
import { wajibPemilik } from "@/lib/sesi";
import {
  JudulHalaman,
  Kartu,
  KepalaKartu,
  Kosong,
  Peringatan,
  Statistik,
  Tabel,
  Td,
  Th,
} from "@/components/ui";
import { BarisProgres } from "@/components/grafik";
import {
  akhirHariWib,
  awalHariWib,
  nilaiInputTanggal,
  rupiah,
  tanggalSingkat,
  tambahHari,
} from "@/lib/format";
import { agregasi } from "@/lib/laporan";
import { TombolCatat, TombolHapus } from "./pengeluaran-klien";

export const metadata: Metadata = { title: "Pengeluaran" };
export const dynamic = "force-dynamic";

export default async function HalamanPengeluaran() {
  // Pengeluaran & laba bersih hanya untuk pemilik.
  const k = await wajibPemilik();
  const sekarang = new Date();

  const awalBulan = awalHariWib(
    new Date(Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth(), 1)),
  );
  const akhirHariIni = akhirHariWib(sekarang);
  const awal90 = awalHariWib(tambahHari(sekarang, -89));

  const [pengeluaran, transaksiBulan] = await Promise.all([
    db.pengeluaran.findMany({
      where: { tokoId: k.toko.id, tanggal: { gte: awal90, lte: akhirHariIni } },
      select: {
        id: true,
        kategori: true,
        jumlah: true,
        keterangan: true,
        tanggal: true,
        pengguna: { select: { nama: true } },
      },
      orderBy: { tanggal: "desc" },
      take: 100,
    }),
    db.transaksi.findMany({
      where: {
        tokoId: k.toko.id,
        status: "SELESAI",
        dibuatPada: { gte: awalBulan, lte: akhirHariIni },
      },
      select: {
        id: true,
        total: true,
        subtotal: true,
        diskon: true,
        totalModal: true,
        laba: true,
        metodeBayar: true,
        dibuatPada: true,
      },
    }),
  ]);

  const bulanIni = pengeluaran.filter((p) => p.tanggal >= awalBulan);
  const totalBulanIni = bulanIni.reduce((t, p) => t + p.jumlah, 0);
  const total90 = pengeluaran.reduce((t, p) => t + p.jumlah, 0);

  const labaKotorBulan = agregasi(
    transaksiBulan.map((t) => ({ ...t, metodeBayar: String(t.metodeBayar) })),
  ).labaKotor;
  const labaBersih = labaKotorBulan - totalBulanIni;

  // Rekap per kategori bulan ini.
  const perKategori = new Map<string, number>();
  for (const p of bulanIni) {
    perKategori.set(p.kategori, (perKategori.get(p.kategori) ?? 0) + p.jumlah);
  }
  const daftarKategori = [...perKategori.entries()]
    .map(([kategori, jumlah]) => ({ kategori, jumlah }))
    .sort((a, b) => b.jumlah - a.jumlah);
  const maksKategori = Math.max(1, ...daftarKategori.map((x) => x.jumlah));

  return (
    <div className="p-4 sm:p-6">
      <JudulHalaman
        judul="Pengeluaran"
        keterangan="Catat biaya operasional agar laba bersih toko terhitung sebagaimana mestinya."
        aksi={<TombolCatat tanggalBawaan={nilaiInputTanggal(sekarang)} />}
      />

      <Peringatan nada="info" className="mt-4" judul="Jangan catat kulakan dua kali">
        Modal barang sudah otomatis terhitung dari harga modal tiap penjualan. Kalau belanja stok
        dicatat lagi di sini, modalnya terhitung dua kali dan laba bersih terlihat lebih kecil dari
        kenyataan. Halaman ini paling tepat untuk biaya operasional: sewa, gaji, listrik, transport,
        dan sejenisnya.
      </Peringatan>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Statistik
          label="Pengeluaran bulan ini"
          nilai={rupiah(totalBulanIni)}
          ikon="dompet"
          aksen={totalBulanIni > labaKotorBulan ? "merah" : "netral"}
          keterangan={`${bulanIni.length} catatan`}
        />
        <Statistik
          label="Laba kotor bulan ini"
          nilai={rupiah(labaKotorBulan)}
          ikon="naik"
          keterangan="dari penjualan"
        />
        <Statistik
          label="Laba bersih bulan ini"
          nilai={rupiah(labaBersih)}
          ikon="dompet"
          aksen={labaBersih >= 0 ? "merek" : "merah"}
          keterangan="laba kotor − pengeluaran"
        />
        <Statistik
          label="Total 90 hari"
          nilai={rupiah(total90, { ringkas: true })}
          ikon="kalender"
          keterangan={`${pengeluaran.length} catatan`}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Kartu className="overflow-hidden">
          <KepalaKartu
            ikon="nota"
            judul="Riwayat pengeluaran"
            keterangan="90 hari terakhir, maksimal 100 catatan"
          />
          {pengeluaran.length === 0 ? (
            <Kosong
              judul="Belum ada pengeluaran dicatat"
              pesan="Catat biaya seperti kulakan, gaji, sewa, atau listrik agar laba bersih terhitung."
              ikon="dompet"
              aksi={<TombolCatat tanggalBawaan={nilaiInputTanggal(sekarang)} />}
            />
          ) : (
            <Tabel>
              <thead>
                <tr>
                  <Th>Kategori</Th>
                  <Th className="hidden sm:table-cell">Keterangan</Th>
                  <Th kanan>Tanggal</Th>
                  <Th kanan>Jumlah</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {pengeluaran.map((p) => (
                  <tr key={p.id} className="group hover:bg-kertas/60">
                    <Td>
                      <p className="text-[13.5px] font-bold text-tinta">{p.kategori}</p>
                      {p.pengguna?.nama && (
                        <p className="text-[11.5px] text-tinta-4">dicatat {p.pengguna.nama}</p>
                      )}
                    </Td>
                    <Td className="hidden sm:table-cell">
                      <p className="max-w-[240px] truncate text-[13px] text-tinta-2">
                        {p.keterangan || "—"}
                      </p>
                    </Td>
                    <Td kanan>
                      <span className="angka text-[12.5px] text-tinta-3">
                        {tanggalSingkat(p.tanggal)}
                      </span>
                    </Td>
                    <Td kanan>
                      <span className="angka text-[13.5px] font-extrabold text-tinta">
                        {rupiah(p.jumlah)}
                      </span>
                    </Td>
                    <Td kanan>
                      <span className="inline-flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <TombolHapus id={p.id} kategori={p.kategori} jumlah={p.jumlah} />
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tabel>
          )}
        </Kartu>

        <Kartu>
          <KepalaKartu ikon="grafik" judul="Ke mana uang pergi" keterangan="Bulan ini, per kategori" />
          <div className="space-y-3.5 p-4">
            {daftarKategori.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-tinta-3">
                Belum ada pengeluaran bulan ini.
              </p>
            ) : (
              daftarKategori.map((x) => (
                <BarisProgres
                  key={x.kategori}
                  label={x.kategori}
                  nilai={x.jumlah}
                  maks={maksKategori}
                  keterangan={rupiah(x.jumlah)}
                  warna={x.jumlah === maksKategori ? "bg-kuning" : "bg-kuning/45"}
                />
              ))
            )}
          </div>
        </Kartu>
      </div>
    </div>
  );
}
