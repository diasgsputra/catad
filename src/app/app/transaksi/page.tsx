import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { konteks } from "@/lib/sesi";
import {
  JudulHalaman,
  Kartu,
  Kosong,
  Lencana,
  Statistik,
  Tabel,
  TautanTombol,
  Td,
  Th,
} from "@/components/ui";
import { Ikon } from "@/components/ikon";
import {
  akhirHariWib,
  awalHariWib,
  dariInputTanggal,
  jamMenit,
  nilaiInputTanggal,
  rupiah,
  tambahHari,
  tanggalSingkat,
} from "@/lib/format";
import { agregasi } from "@/lib/laporan";
import { NavigasiDaftar } from "@/components/navigasi-daftar";
import { SaringTransaksi } from "./saring";

export const metadata: Metadata = { title: "Transaksi" };
export const dynamic = "force-dynamic";

const PER_HALAMAN = 40;

const LABEL_METODE: Record<string, string> = {
  TUNAI: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  KARTU: "Kartu",
};

export default async function HalamanTransaksi({
  searchParams,
}: {
  searchParams: Promise<{
    mulai?: string;
    selesai?: string;
    metode?: string;
    cari?: string;
    hal?: string;
    status?: string;
  }>;
}) {
  const [k, sp] = await Promise.all([konteks(), searchParams]);
  const sekarang = new Date();

  const selesai = akhirHariWib(sp.selesai ? dariInputTanggal(sp.selesai) : sekarang);
  const mulai = awalHariWib(sp.mulai ? dariInputTanggal(sp.mulai) : tambahHari(sekarang, -6));
  const halaman = Math.max(1, parseInt(sp.hal ?? "1", 10) || 1);

  const saringan = {
    tokoId: k.toko.id,
    dibuatPada: { gte: mulai, lte: selesai },
    ...(sp.metode ? { metodeBayar: sp.metode as "TUNAI" } : {}),
    ...(sp.status === "dibatalkan"
      ? { status: "DIBATALKAN" as const }
      : sp.status === "semua"
        ? {}
        : { status: "SELESAI" as const }),
    ...(sp.cari
      ? {
          OR: [
            { nomor: { contains: sp.cari, mode: "insensitive" as const } },
            { catatan: { contains: sp.cari, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [transaksi, jumlah, semuaTerpilih] = await Promise.all([
    db.transaksi.findMany({
      where: saringan,
      select: {
        id: true,
        nomor: true,
        total: true,
        laba: true,
        diskon: true,
        metodeBayar: true,
        status: true,
        dibuatPada: true,
        catatan: true,
        pengguna: { select: { nama: true } },
        item: { select: { namaProduk: true, qty: true } },
      },
      orderBy: { dibuatPada: "desc" },
      skip: (halaman - 1) * PER_HALAMAN,
      take: PER_HALAMAN,
    }),
    db.transaksi.count({ where: saringan }),
    db.transaksi.findMany({
      where: saringan,
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

  const ringkas = agregasi(semuaTerpilih.map((t) => ({ ...t, metodeBayar: String(t.metodeBayar) })));
  const totalHalaman = Math.max(1, Math.ceil(jumlah / PER_HALAMAN));
  const pemilik = k.sesi.peran === "PEMILIK";

  const kueri = new URLSearchParams({
    mulai: nilaiInputTanggal(mulai),
    selesai: nilaiInputTanggal(selesai),
    ...(sp.metode ? { metode: sp.metode } : {}),
    ...(sp.cari ? { cari: sp.cari } : {}),
    ...(sp.status ? { status: sp.status } : {}),
  });

  return (
    <div className="p-4 sm:p-6">
      <JudulHalaman
        judul="Transaksi"
        keterangan={`${tanggalSingkat(mulai)} – ${tanggalSingkat(selesai)}`}
        aksi={
          <TautanTombol href="/app/kasir" ikon="kasir">
            Buka kasir
          </TautanTombol>
        }
      />

      <div className="mt-4">
        <SaringTransaksi
          mulai={nilaiInputTanggal(mulai)}
          selesai={nilaiInputTanggal(selesai)}
          metode={sp.metode ?? ""}
          cari={sp.cari ?? ""}
          status={sp.status ?? "selesai"}
        />
      </div>

      <div className={pemilik ? "mt-4 grid gap-3 sm:grid-cols-3" : "mt-4 grid gap-3 sm:grid-cols-2"}>
        <Statistik label="Transaksi" nilai={jumlah} ikon="nota" />
        <Statistik label="Pendapatan" nilai={rupiah(ringkas.pendapatan)} ikon="kasir" aksen="merek" />
        {/* Laba hanya ditampilkan ke pemilik. */}
        {pemilik && (
          <Statistik
            label="Laba kotor"
            nilai={rupiah(ringkas.labaKotor)}
            ikon="naik"
            keterangan={
              ringkas.marginPersen !== null
                ? `margin ${Math.round(ringkas.marginPersen)}%`
                : undefined
            }
          />
        )}
      </div>

      <Kartu className="mt-5 overflow-hidden">
        {transaksi.length === 0 ? (
          <Kosong
            judul="Tidak ada transaksi"
            pesan="Coba ubah rentang tanggal atau saringan yang dipakai."
            ikon="nota"
            aksi={
              <TautanTombol href="/app/kasir" ukuran="kecil" ikon="kasir">
                Buka kasir
              </TautanTombol>
            }
          />
        ) : (
          <>
            <Tabel>
              <thead>
                <tr>
                  <Th>Nota</Th>
                  <Th className="hidden md:table-cell">Barang</Th>
                  <Th className="hidden sm:table-cell">Bayar</Th>
                  {pemilik && <Th kanan className="hidden lg:table-cell">Laba</Th>}
                  <Th kanan>Total</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {transaksi.map((t, i) => {
                  const ringkasBarang = t.item
                    .slice(0, 2)
                    .map((it) => `${it.namaProduk}${it.qty > 1 ? ` ×${it.qty}` : ""}`)
                    .join(", ");
                  const sisa = t.item.length - 2;

                  return (
                    <tr key={t.id} data-baris={i} className="group hover:bg-kertas/60">
                      <Td>
                        <p className="angka text-[13px] font-bold text-tinta">{t.nomor}</p>
                        <p className="text-[11.5px] text-tinta-3">
                          {tanggalSingkat(t.dibuatPada)} · {jamMenit(t.dibuatPada)}
                          {t.pengguna?.nama ? ` · ${t.pengguna.nama}` : ""}
                        </p>
                      </Td>

                      <Td className="hidden md:table-cell">
                        <p className="max-w-[280px] truncate text-[13px] text-tinta-2">
                          {ringkasBarang}
                          {sisa > 0 && <span className="text-tinta-4"> +{sisa} lagi</span>}
                        </p>
                        {t.catatan && (
                          <p className="max-w-[280px] truncate text-[11.5px] text-tinta-4">
                            {t.catatan}
                          </p>
                        )}
                      </Td>

                      <Td className="hidden sm:table-cell">
                        <span className="text-[12.5px] font-semibold text-tinta-2">
                          {LABEL_METODE[String(t.metodeBayar)] ?? String(t.metodeBayar)}
                        </span>
                        {t.status === "DIBATALKAN" && (
                          <Lencana nada="merah" className="ml-1.5">
                            Batal
                          </Lencana>
                        )}
                      </Td>

                      {pemilik && (
                        <Td kanan className="hidden lg:table-cell">
                          <span className="angka text-[13px] text-hijau">{rupiah(t.laba)}</span>
                        </Td>
                      )}

                      <Td kanan>
                        <span
                          className={
                            t.status === "DIBATALKAN"
                              ? "angka text-[14px] font-bold text-tinta-4 line-through"
                              : "angka text-[14px] font-extrabold text-tinta"
                          }
                        >
                          {rupiah(t.total)}
                        </span>
                      </Td>

                      <Td kanan>
                        <Link
                          href={`/app/transaksi/${t.id}`}
                          className="inline-flex size-7 items-center justify-center rounded-md text-tinta-4 transition-colors group-hover:bg-kertas-2 group-hover:text-tinta"
                          aria-label={`Lihat ${t.nomor}`}
                        >
                          <Ikon nama="kanan" size={14} />
                        </Link>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabel>

            {totalHalaman > 1 && (
              <div className="flex items-center justify-between border-t border-garis bg-kertas px-4 py-3">
                <p className="text-[12.5px] text-tinta-3">
                  Halaman <strong className="angka font-bold text-tinta-2">{halaman}</strong> dari{" "}
                  <strong className="angka font-bold text-tinta-2">{totalHalaman}</strong> ·{" "}
                  {jumlah} transaksi
                </p>
                <div className="flex gap-1.5">
                  {halaman > 1 && (
                    <Link
                      href={`/app/transaksi?${kueri}&hal=${halaman - 1}`}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-garis-2 bg-white px-2.5 text-[12.5px] font-bold text-tinta-2 hover:bg-kertas-2"
                    >
                      <Ikon nama="kiri" size={12} />
                      Sebelumnya
                    </Link>
                  )}
                  {halaman < totalHalaman && (
                    <Link
                      href={`/app/transaksi?${kueri}&hal=${halaman + 1}`}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-garis-2 bg-white px-2.5 text-[12.5px] font-bold text-tinta-2 hover:bg-kertas-2"
                    >
                      Berikutnya
                      <Ikon nama="kanan" size={12} />
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Kartu>

      <NavigasiDaftar
        hrefs={transaksi.map((t) => `/app/transaksi/${t.id}`)}
        tambahHref="/app/kasir"
        labelTambah="Transaksi baru"
        labelBuka="Buka nota"
      />
    </div>
  );
}
