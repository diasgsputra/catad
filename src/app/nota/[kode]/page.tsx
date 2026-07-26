import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LogoMark } from "@/components/logo";
import { Ikon } from "@/components/ikon";
import { rupiah, tanggalPanjang, jamMenit } from "@/lib/format";
import { TombolCetak } from "./tombol-cetak";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nota digital",
  // Deskripsi sendiri, supaya nota yang dibagikan ke pembeli tidak membawa
  // teks pemasaran dari halaman utama.
  description: "Nota digital pembelian.",
  robots: { index: false, follow: false },
};

const LABEL_METODE: Record<string, string> = {
  TUNAI: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  KARTU: "Kartu",
};

/**
 * Nota digital yang bisa dibagikan ke pembeli.
 *
 * Halaman ini publik (siapa pun yang punya kode bisa membuka), jadi isinya
 * dibatasi hanya pada apa yang memang tercetak di struk: barang, harga, dan
 * total. Harga modal, laba, dan data toko lain tidak pernah dikirim ke sini.
 */
export default async function HalamanNota({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params;

  const trx = await db.transaksi.findUnique({
    where: { kodeNota: kode.toUpperCase() },
    select: {
      nomor: true,
      subtotal: true,
      diskon: true,
      pajak: true,
      total: true,
      dibayar: true,
      kembalian: true,
      metodeBayar: true,
      status: true,
      catatan: true,
      dibuatPada: true,
      pengguna: { select: { nama: true } },
      toko: {
        select: { nama: true, alamat: true, telepon: true, catatanNota: true, jenisUsaha: true },
      },
      item: {
        select: { id: true, namaProduk: true, qty: true, satuan: true, hargaSatuan: true, diskon: true, subtotal: true },
      },
    },
  });

  if (!trx) notFound();

  const dibatalkan = trx.status === "DIBATALKAN";

  return (
    <div className="min-h-dvh bg-kertas-2 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-sm">
        {/* Struk */}
        <div className="tepi-sobek relative bg-white px-6 pt-7 pb-8 shadow-[var(--shadow-naik)]">
          <div className="flex flex-col items-center text-center">
            <LogoMark size={34} />
            <h1 className="mt-2.5 text-[17px] font-extrabold tracking-[-0.02em] text-tinta">
              {trx.toko.nama}
            </h1>
            {trx.toko.alamat && (
              <p className="mt-0.5 text-[11.5px] leading-snug text-tinta-3">{trx.toko.alamat}</p>
            )}
            {trx.toko.telepon && (
              <p className="angka text-[11.5px] text-tinta-3">{trx.toko.telepon}</p>
            )}
          </div>

          <div className="garis-nota my-4" />

          <div className="space-y-0.5 text-[11.5px] text-tinta-3">
            <div className="flex justify-between">
              <span>No. nota</span>
              <span className="angka font-semibold text-tinta-2">{trx.nomor}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal</span>
              <span className="angka font-semibold text-tinta-2">
                {tanggalPanjang(trx.dibuatPada)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Jam</span>
              <span className="angka font-semibold text-tinta-2">{jamMenit(trx.dibuatPada)}</span>
            </div>
            {trx.pengguna?.nama && (
              <div className="flex justify-between">
                <span>Kasir</span>
                <span className="font-semibold text-tinta-2">{trx.pengguna.nama}</span>
              </div>
            )}
          </div>

          <div className="garis-nota my-4" />

          {dibatalkan && (
            <div className="mb-4 rounded-lg border border-merah-garis bg-merah-muda px-3 py-2 text-center text-[12px] font-bold text-merah">
              NOTA INI SUDAH DIBATALKAN
            </div>
          )}

          <ul className="space-y-2.5">
            {trx.item.map((it) => (
              <li key={it.id}>
                <p className="text-[13px] font-bold text-tinta">{it.namaProduk}</p>
                <div className="baris-nota mt-0.5 text-[11.5px] text-tinta-3">
                  <span className="angka">
                    {it.qty} {it.satuan} × {rupiah(it.hargaSatuan)}
                    {it.diskon > 0 && ` − ${rupiah(it.diskon)}`}
                  </span>
                  <span className="isi-titik" />
                  <span className="angka font-bold text-tinta">{rupiah(it.subtotal)}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="garis-nota my-4" />

          <div className="space-y-1 text-[12px]">
            <div className="flex justify-between text-tinta-2">
              <span>Subtotal</span>
              <span className="angka font-semibold">{rupiah(trx.subtotal)}</span>
            </div>
            {trx.diskon > 0 && (
              <div className="flex justify-between text-tinta-2">
                <span>Diskon</span>
                <span className="angka font-semibold">−{rupiah(trx.diskon)}</span>
              </div>
            )}
            {trx.pajak > 0 && (
              <div className="flex justify-between text-tinta-2">
                <span>Pajak / servis</span>
                <span className="angka font-semibold">{rupiah(trx.pajak)}</span>
              </div>
            )}
          </div>

          <div className="garis-nota my-3" />

          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-extrabold tracking-[0.02em] text-tinta">TOTAL</span>
            <span className="angka text-[22px] leading-none font-extrabold tracking-[-0.02em] text-tinta">
              {rupiah(trx.total)}
            </span>
          </div>

          <div className="mt-3 space-y-1 text-[12px] text-tinta-2">
            <div className="flex justify-between">
              <span>{LABEL_METODE[String(trx.metodeBayar)] ?? String(trx.metodeBayar)}</span>
              <span className="angka font-semibold">{rupiah(trx.dibayar)}</span>
            </div>
            {trx.kembalian > 0 && (
              <div className="flex justify-between">
                <span>Kembalian</span>
                <span className="angka font-semibold">{rupiah(trx.kembalian)}</span>
              </div>
            )}
          </div>

          {trx.catatan && (
            <>
              <div className="garis-nota my-4" />
              <p className="text-[11.5px] leading-relaxed text-tinta-3">
                <span className="font-bold text-tinta-2">Catatan: </span>
                {trx.catatan}
              </p>
            </>
          )}

          <div className="garis-nota my-4" />

          <p className="text-center text-[12px] leading-relaxed font-semibold text-tinta-2">
            {trx.toko.catatanNota || "Terima kasih sudah berbelanja"}
          </p>

          <p className="mt-4 flex items-center justify-center gap-1 text-[10px] text-tinta-4">
            Dicatat dengan
            <span className="font-bold text-tinta-3">Catad</span>
          </p>
        </div>

        {/* Aksi di bawah struk */}
        <div className="mt-5 flex items-center justify-center gap-2 tanpa-cetak">
          <TombolCetak />
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-garis-2 bg-white px-3.5 text-[13px] font-bold text-tinta-2 transition-colors hover:bg-white/70"
          >
            <Ikon nama="info" size={15} />
            Tentang Catad
          </Link>
        </div>

        <p className="mt-4 text-center text-[11.5px] leading-relaxed text-tinta-4">
          Nota ini dibuat otomatis oleh Catad — aplikasi kasir digital untuk UMKM.
        </p>
      </div>
    </div>
  );
}
