import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { GrafikBatang } from "@/components/grafik";
import { Kartu, KepalaKartu, Kosong, Peringatan, Statistik, Tabel, Td, Th } from "@/components/ui";
import { angka, rupiah, tanggalSingkat } from "@/lib/format";
import {
  nilaiBulanan,
  pendapatanBulananBerulang,
  pendapatanPerBulan,
  totalPendapatan,
  type Pembayaran,
} from "@/lib/keuangan-langganan";

export const metadata: Metadata = { title: "Keuangan" };
export const dynamic = "force-dynamic";

export default async function HalamanKeuangan() {
  const sekarang = new Date();

  // Hanya baris yang pembayarannya sudah dikonfirmasi. Status sengaja tidak
  // dipakai sebagai penyaring: langganan yang sudah dibayar lalu kedaluwarsa
  // atau dihentikan tetap uang yang pernah diterima.
  const baris = await db.langganan.findMany({
    where: { dibayarPada: { not: null } },
    select: {
      id: true,
      tokoId: true,
      jumlah: true,
      dibayarPada: true,
      periodeMulai: true,
      periodeSelesai: true,
      metode: true,
      toko: { select: { id: true, nama: true } },
    },
    orderBy: { dibayarPada: "desc" },
  });

  const pembayaran: Pembayaran[] = baris.map((b) => ({
    tokoId: b.tokoId,
    jumlah: b.jumlah,
    dibayarPada: b.dibayarPada as Date,
    periodeMulai: b.periodeMulai,
    periodeSelesai: b.periodeSelesai,
  }));

  const seri = pendapatanPerBulan(pembayaran, sekarang, 12);
  const total = totalPendapatan(pembayaran);
  const mrr = pendapatanBulananBerulang(pembayaran, sekarang);
  const bulanIni = seri[seri.length - 1];
  const bulanLalu = seri[seri.length - 2];

  const rataPerPembayaran =
    pembayaran.length > 0 ? Math.round(total / pembayaran.length) : 0;

  // Toko yang membayar paling banyak sepanjang waktu.
  const perToko = new Map<string, { nama: string; total: number; jumlah: number }>();
  for (const b of baris) {
    const ada = perToko.get(b.tokoId) ?? { nama: b.toko.nama, total: 0, jumlah: 0 };
    ada.total += b.jumlah;
    ada.jumlah += 1;
    perToko.set(b.tokoId, ada);
  }
  const teratas = [...perToko.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return (
    <div>
      <h1 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-tinta">
        Keuangan langganan
      </h1>
      <p className="mt-1 text-[13px] text-tinta-3">
        Semua angka di halaman ini berasal dari pembayaran yang sudah dikonfirmasi operator.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Statistik
          label="Total diterima"
          nilai={rupiah(total)}
          keterangan={`${angka(pembayaran.length)} pembayaran`}
          ikon="dompet"
          aksen="merek"
        />
        <Statistik
          label={`Bulan ini (${bulanIni?.label ?? "-"})`}
          nilai={rupiah(bulanIni?.nilai ?? 0)}
          keterangan={`${bulanIni?.jumlahPembayaran ?? 0} pembayaran`}
          tren={
            bulanLalu && bulanLalu.nilai > 0
              ? {
                  arah:
                    (bulanIni?.nilai ?? 0) > bulanLalu.nilai
                      ? "naik"
                      : (bulanIni?.nilai ?? 0) < bulanLalu.nilai
                        ? "turun"
                        : "rata",
                  teks: `dari ${rupiah(bulanLalu.nilai, { ringkas: true })} bulan lalu`,
                  baik: (bulanIni?.nilai ?? 0) >= bulanLalu.nilai,
                }
              : undefined
          }
          ikon="kalender"
        />
        <Statistik
          label="Berulang per bulan"
          nilai={rupiah(mrr)}
          keterangan="langganan yang masih berjalan"
          ikon="grafik"
        />
        <Statistik
          label="Rata-rata per pembayaran"
          nilai={rupiah(rataPerPembayaran)}
          keterangan="campuran paket bulanan & tahunan"
          ikon="nota"
        />
      </div>

      <Kartu className="mt-5">
        <KepalaKartu
          ikon="grafik"
          judul="Pendapatan 12 bulan terakhir"
          keterangan="Dihitung pada bulan uangnya diterima, bukan bulan masa berlakunya."
        />
        <div className="p-4">
          {total === 0 ? (
            <Kosong
              ikon="dompet"
              judul="Belum ada pembayaran"
              pesan="Angka akan muncul setelah ada pembayaran pertama yang dikonfirmasi."
              className="py-6"
            />
          ) : (
            <GrafikBatang
              data={seri.map((s) => ({ label: s.label, nilai: s.nilai }))}
              formatNilai={(n) => rupiah(n, { ringkas: true })}
              tampilkanLabelKe={2}
            />
          )}
        </div>
      </Kartu>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Kartu className="overflow-hidden">
          <KepalaKartu ikon="kalender" judul="Rincian per bulan" />
          <Tabel>
            <thead>
              <tr>
                <Th>Bulan</Th>
                <Th kanan>Pembayaran</Th>
                <Th kanan>Jumlah</Th>
              </tr>
            </thead>
            <tbody>
              {[...seri].reverse().map((s) => (
                <tr key={s.kunci} className={s.nilai === 0 ? "text-tinta-4" : undefined}>
                  <Td>
                    <span className="text-[13px] font-semibold text-tinta">{s.label}</span>
                  </Td>
                  <Td kanan>
                    <span className="angka text-[13px] text-tinta-2">{s.jumlahPembayaran}</span>
                  </Td>
                  <Td kanan>
                    <span className="angka text-[13px] font-bold text-tinta">
                      {rupiah(s.nilai)}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        </Kartu>

        <Kartu className="overflow-hidden">
          <KepalaKartu ikon="bintang" judul="Penyumbang terbesar" />
          {teratas.length === 0 ? (
            <Kosong ikon="toko" judul="Belum ada data" className="py-8" />
          ) : (
            <Tabel>
              <thead>
                <tr>
                  <Th>Toko</Th>
                  <Th kanan>Pembayaran</Th>
                  <Th kanan>Total</Th>
                </tr>
              </thead>
              <tbody>
                {teratas.map((t) => (
                  <tr key={t.id} className="hover:bg-kertas/60">
                    <Td>
                      <Link
                        href={`/admin/toko/${t.id}`}
                        className="text-[13px] font-bold text-tinta hover:text-merek hover:underline"
                      >
                        {t.nama}
                      </Link>
                    </Td>
                    <Td kanan>
                      <span className="angka text-[13px] text-tinta-2">{t.jumlah}</span>
                    </Td>
                    <Td kanan>
                      <span className="angka text-[13px] font-bold text-tinta">
                        {rupiah(t.total)}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tabel>
          )}
        </Kartu>
      </div>

      <Kartu className="mt-5 overflow-hidden">
        <KepalaKartu
          ikon="nota"
          judul="Pembayaran terakhir"
          keterangan="30 pembayaran terbaru."
        />
        {baris.length === 0 ? (
          <Kosong ikon="dompet" judul="Belum ada pembayaran" className="py-8" />
        ) : (
          <Tabel>
            <thead>
              <tr>
                <Th>Tanggal</Th>
                <Th>Toko</Th>
                <Th kanan className="hidden sm:table-cell">Periode</Th>
                <Th kanan className="hidden md:table-cell">Setara / bulan</Th>
                <Th kanan>Jumlah</Th>
              </tr>
            </thead>
            <tbody>
              {baris.slice(0, 30).map((b) => (
                <tr key={b.id} className="hover:bg-kertas/60">
                  <Td>
                    <span className="angka text-[12.5px] text-tinta-2">
                      {tanggalSingkat(b.dibayarPada as Date)}
                    </span>
                    <p className="text-[11px] text-tinta-4">
                      {b.metode.replace(/_/g, " ").toLowerCase()}
                    </p>
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/toko/${b.toko.id}`}
                      className="text-[13px] font-bold text-tinta hover:text-merek hover:underline"
                    >
                      {b.toko.nama}
                    </Link>
                  </Td>
                  <Td kanan className="hidden sm:table-cell">
                    <span className="angka text-[11.5px] text-tinta-3">
                      {tanggalSingkat(b.periodeMulai)} – {tanggalSingkat(b.periodeSelesai)}
                    </span>
                  </Td>
                  <Td kanan className="hidden md:table-cell">
                    <span className="angka text-[12.5px] text-tinta-3">
                      {rupiah(nilaiBulanan(b))}
                    </span>
                  </Td>
                  <Td kanan>
                    <span className="angka text-[13px] font-extrabold text-tinta">
                      {rupiah(b.jumlah)}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        )}
      </Kartu>

      <Peringatan nada="info" className="mt-5">
        Masa tenggang yang diberikan operator tidak muncul di halaman ini karena tidak ada uang
        yang diterima. Begitu pula langganan lama yang dulu diaktifkan tanpa pembayaran.
      </Peringatan>
    </div>
  );
}
