import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  Kartu,
  KepalaKartu,
  Kosong,
  Lencana,
  Statistik,
  Tabel,
  Td,
  Th,
} from "@/components/ui";
import { jarakHari, rupiah, selisihHari, tanggalSingkat } from "@/lib/format";
import {
  pendapatanBulananBerulang,
  pendapatanPerBulan,
  ringkasPelanggan,
  totalPendapatan,
} from "@/lib/keuangan-langganan";
import { AksiPengajuan } from "./aksi-pengajuan";

export const metadata: Metadata = { title: "Ringkasan" };
export const dynamic = "force-dynamic";

export default async function HalamanRingkasan() {
  const sekarang = new Date();

  const [toko, pengajuan, pembayaran] = await Promise.all([
    db.toko.findMany({
      select: {
        id: true,
        nama: true,
        slug: true,
        diblokir: true,
        paket: true,
        trialSampai: true,
        proSampai: true,
      },
    }),
    db.langganan.findMany({
      where: { status: "MENUNGGU" },
      select: {
        id: true,
        jumlah: true,
        dibuatPada: true,
        periodeMulai: true,
        periodeSelesai: true,
        toko: { select: { id: true, nama: true, slug: true } },
      },
      orderBy: { dibuatPada: "asc" },
    }),
    // Penanda pendapatan adalah `dibayarPada`, bukan status. Lihat komentarnya
    // di skema Langganan.
    db.langganan.findMany({
      where: { dibayarPada: { not: null } },
      select: {
        tokoId: true,
        jumlah: true,
        dibayarPada: true,
        periodeMulai: true,
        periodeSelesai: true,
      },
    }),
  ]);

  const ringkasan = ringkasPelanggan(toko, sekarang);

  // `dibayarPada` sudah dipastikan tidak null oleh kueri; pemetaan ini hanya
  // untuk meyakinkan pemeriksa tipe.
  const terbayar = pembayaran.map((p) => ({ ...p, dibayarPada: p.dibayarPada as Date }));

  const bulanIni = pendapatanPerBulan(terbayar, sekarang, 1)[0];
  const mrr = pendapatanBulananBerulang(terbayar, sekarang);

  // Uji coba yang segera habis: inilah daftar calon pembeli terdekat, jadi
  // ditaruh di halaman depan panel, bukan disembunyikan di dalam saringan.
  const ujiCobaSegera = toko
    .filter(
      (t) =>
        !t.diblokir &&
        t.trialSampai &&
        t.trialSampai > sekarang &&
        !(t.proSampai && t.proSampai > sekarang) &&
        selisihHari(sekarang, t.trialSampai) <= 3,
    )
    .sort((a, b) => a.trialSampai!.getTime() - b.trialSampai!.getTime());

  return (
    <div>
      <h1 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-tinta">
        Ringkasan
      </h1>
      <p className="mt-1 text-[13px] text-tinta-3">
        Keadaan seluruh toko pelanggan Catad per {tanggalSingkat(sekarang)}.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Statistik
          label="Berlangganan"
          nilai={ringkasan.berlangganan}
          keterangan={`dari ${ringkasan.total} toko terdaftar`}
          ikon="bintang"
          aksen="merek"
        />
        <Statistik
          label="Masih uji coba"
          nilai={ringkasan.ujiCoba}
          keterangan={
            ringkasan.ujiCobaSegeraHabis > 0
              ? `${ringkasan.ujiCobaSegeraHabis} habis dalam 3 hari`
              : "belum ada yang segera habis"
          }
          ikon="jam"
          aksen={ringkasan.ujiCobaSegeraHabis > 0 ? "kuning" : "netral"}
        />
        <Statistik
          label="Pendapatan bulan ini"
          nilai={rupiah(bulanIni?.nilai ?? 0)}
          keterangan={`${bulanIni?.jumlahPembayaran ?? 0} pembayaran`}
          ikon="dompet"
          aksen="merek"
        />
        <Statistik
          label="Berulang per bulan"
          nilai={rupiah(mrr)}
          keterangan="dari langganan yang masih berjalan"
          ikon="grafik"
        />
      </div>

      {/* ── Menunggu konfirmasi ── */}
      <Kartu className="mt-5 overflow-hidden">
        <KepalaKartu
          ikon="nota"
          judul="Menunggu konfirmasi pembayaran"
          keterangan={
            pengajuan.length > 0
              ? `${pengajuan.length} pengajuan perlu diperiksa`
              : "Tidak ada pengajuan yang menggantung"
          }
        />

        {pengajuan.length === 0 ? (
          <Kosong
            ikon="centang"
            judul="Semua sudah beres"
            pesan="Pengajuan baru akan muncul di sini begitu pemilik toko menekan tombol berlangganan."
            className="py-8"
          />
        ) : (
          <Tabel>
            <thead>
              <tr>
                <Th>Toko</Th>
                <Th kanan>Jumlah</Th>
                <Th kanan className="hidden sm:table-cell">Diajukan</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {pengajuan.map((p) => (
                <tr key={p.id} className="hover:bg-kertas/60">
                  <Td>
                    <Link
                      href={`/admin/toko/${p.toko.id}`}
                      className="text-[13.5px] font-bold text-tinta hover:text-merek hover:underline"
                    >
                      {p.toko.nama}
                    </Link>
                    <p className="text-[11.5px] text-tinta-4">{p.toko.slug}</p>
                  </Td>
                  <Td kanan>
                    <span className="angka text-[13.5px] font-extrabold text-tinta">
                      {rupiah(p.jumlah)}
                    </span>
                    <p className="text-[11px] text-tinta-4">
                      {selisihHari(p.periodeMulai, p.periodeSelesai) > 60 ? "tahunan" : "bulanan"}
                    </p>
                  </Td>
                  <Td kanan className="hidden sm:table-cell">
                    <span className="angka text-[12px] text-tinta-3">
                      {tanggalSingkat(p.dibuatPada)}
                    </span>
                    <p className="text-[11px] text-tinta-4">
                      {jarakHari(selisihHari(p.dibuatPada, sekarang))}
                    </p>
                  </Td>
                  <Td kanan>
                    <AksiPengajuan
                      langgananId={p.id}
                      namaToko={p.toko.nama}
                      jumlah={p.jumlah}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        )}
      </Kartu>

      {/* ── Uji coba yang segera habis ── */}
      {ujiCobaSegera.length > 0 && (
        <Kartu className="mt-5 overflow-hidden">
          <KepalaKartu
            ikon="jam"
            judul="Uji coba segera berakhir"
            keterangan="Toko yang paling mungkin berlangganan dalam beberapa hari ke depan."
          />
          <Tabel>
            <thead>
              <tr>
                <Th>Toko</Th>
                <Th kanan>Berakhir</Th>
              </tr>
            </thead>
            <tbody>
              {ujiCobaSegera.map((t) => (
                <tr key={t.id} className="hover:bg-kertas/60">
                  <Td>
                    <Link
                      href={`/admin/toko/${t.id}`}
                      className="text-[13.5px] font-bold text-tinta hover:text-merek hover:underline"
                    >
                      {t.nama}
                    </Link>
                  </Td>
                  <Td kanan>
                    <Lencana nada="kuning">
                      {jarakHari(selisihHari(sekarang, t.trialSampai!))}
                    </Lencana>
                    <p className="angka mt-0.5 text-[11.5px] text-tinta-4">
                      {tanggalSingkat(t.trialSampai!)}
                    </p>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        </Kartu>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <RingkasKecil label="Paket Gratis" nilai={ringkasan.gratis} />
        <RingkasKecil label="Diblokir" nilai={ringkasan.diblokir} />
        <RingkasKecil
          label="Total pendapatan"
          nilai={rupiah(totalPendapatan(terbayar))}
          tautan="/admin/keuangan"
        />
      </div>
    </div>
  );
}

function RingkasKecil({
  label,
  nilai,
  tautan,
}: {
  label: string;
  nilai: React.ReactNode;
  tautan?: string;
}) {
  const isi = (
    <>
      <p className="text-[11.5px] font-bold tracking-[0.06em] text-tinta-3 uppercase">{label}</p>
      <p className="angka mt-1 text-[18px] font-extrabold tracking-[-0.02em] text-tinta">
        {nilai}
      </p>
    </>
  );

  if (tautan) {
    return (
      <Link
        href={tautan}
        className="kartu block p-4 transition-colors hover:border-merek/40 hover:bg-white"
      >
        {isi}
      </Link>
    );
  }

  return <div className="kartu p-4">{isi}</div>;
}
