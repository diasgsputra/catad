import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { konteks } from "@/lib/sesi";
import { Kartu, KepalaKartu, Lencana, Peringatan, TautanTombol } from "@/components/ui";
import { Ikon } from "@/components/ikon";
import { rupiah, tanggalPanjang, jamMenit } from "@/lib/format";
import { AksiTransaksi } from "./aksi";

export const metadata: Metadata = { title: "Detail transaksi" };
export const dynamic = "force-dynamic";

const LABEL_METODE: Record<string, string> = {
  TUNAI: "Tunai",
  QRIS: "QRIS",
  TRANSFER: "Transfer bank",
  KARTU: "Kartu debit/kredit",
};

export default async function DetailTransaksi({ params }: { params: Promise<{ id: string }> }) {
  const [k, p] = await Promise.all([konteks(), params]);

  const trx = await db.transaksi.findFirst({
    // Saringan tokoId memastikan nota toko lain tidak bisa dibuka.
    where: { id: p.id, tokoId: k.toko.id },
    select: {
      id: true,
      nomor: true,
      kodeNota: true,
      subtotal: true,
      diskon: true,
      pajak: true,
      total: true,
      totalModal: true,
      laba: true,
      metodeBayar: true,
      dibayar: true,
      kembalian: true,
      catatan: true,
      status: true,
      dibuatPada: true,
      pengguna: { select: { nama: true } },
      pelanggan: { select: { nama: true } },
      item: {
        select: {
          id: true,
          namaProduk: true,
          satuan: true,
          hargaSatuan: true,
          modalSatuan: true,
          qty: true,
          diskon: true,
          subtotal: true,
        },
      },
    },
  });

  if (!trx) notFound();

  const dibatalkan = trx.status === "DIBATALKAN";
  const margin = trx.total > 0 ? Math.round((trx.laba / trx.total) * 100) : 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/app/transaksi"
            className="mb-2 inline-flex items-center gap-1 text-[12.5px] font-bold text-tinta-3 hover:text-tinta"
          >
            <Ikon nama="kiri" size={12} />
            Semua transaksi
          </Link>
          <h1 className="angka flex items-center gap-2 text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-tinta">
            {trx.nomor}
            {dibatalkan && <Lencana nada="merah">Dibatalkan</Lencana>}
          </h1>
          <p className="mt-1 text-[13px] text-tinta-3">
            {tanggalPanjang(trx.dibuatPada)} · {jamMenit(trx.dibuatPada)}
            {trx.pengguna?.nama ? ` · dilayani ${trx.pengguna.nama}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TautanTombol
            href={`/nota/${trx.kodeNota}`}
            target="_blank"
            varian="kedua"
            ikon="nota"
          >
            Nota digital
          </TautanTombol>
          {!dibatalkan && k.sesi.peran === "PEMILIK" && (
            <AksiTransaksi id={trx.id} nomor={trx.nomor} />
          )}
        </div>
      </div>

      {dibatalkan && (
        <Peringatan nada="waspada" className="mt-4" judul="Transaksi ini sudah dibatalkan">
          Stok barangnya sudah dikembalikan dan nilainya tidak dihitung dalam laporan.
        </Peringatan>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Kartu className="overflow-hidden">
          <KepalaKartu ikon="keranjang" judul="Rincian barang" keterangan={`${trx.item.length} baris`} />

          <ul className="divide-y divide-garis">
            {trx.item.map((it) => (
              <li key={it.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold text-tinta">{it.namaProduk}</p>
                  <p className="angka mt-0.5 text-[12px] text-tinta-3">
                    {rupiah(it.hargaSatuan)} × {it.qty} {it.satuan}
                    {it.diskon > 0 && ` · diskon ${rupiah(it.diskon)}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="angka text-[13.5px] font-extrabold text-tinta">
                    {rupiah(it.subtotal)}
                  </p>
                  {k.sesi.peran === "PEMILIK" && it.modalSatuan > 0 && (
                    <p className="angka text-[11px] text-tinta-4">
                      modal {rupiah(it.modalSatuan * it.qty)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-1.5 border-t border-garis bg-kertas px-4 py-4">
            <div className="flex justify-between text-[13px] text-tinta-2">
              <span>Subtotal</span>
              <span className="angka font-semibold">{rupiah(trx.subtotal)}</span>
            </div>
            {trx.diskon > 0 && (
              <div className="flex justify-between text-[13px] text-merah">
                <span>Diskon nota</span>
                <span className="angka font-semibold">−{rupiah(trx.diskon)}</span>
              </div>
            )}
            {trx.pajak > 0 && (
              <div className="flex justify-between text-[13px] text-tinta-2">
                <span>Pajak / servis</span>
                <span className="angka font-semibold">{rupiah(trx.pajak)}</span>
              </div>
            )}
            <div className="garis-nota my-2" />
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] font-bold text-tinta">TOTAL</span>
              <span className="angka text-[22px] leading-none font-extrabold tracking-[-0.02em] text-tinta">
                {rupiah(trx.total)}
              </span>
            </div>
          </div>
        </Kartu>

        <div className="space-y-5">
          <Kartu>
            <KepalaKartu ikon="dompet" judul="Pembayaran" />
            <dl className="divide-y divide-garis">
              {[
                ["Metode", LABEL_METODE[String(trx.metodeBayar)] ?? String(trx.metodeBayar)],
                ["Uang diterima", rupiah(trx.dibayar)],
                ["Kembalian", rupiah(trx.kembalian)],
                ...(trx.pelanggan?.nama ? [["Pelanggan", trx.pelanggan.nama]] : []),
              ].map(([label, nilai]) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <dt className="text-[13px] text-tinta-3">{label}</dt>
                  <dd className="angka text-[13px] font-bold text-tinta">{nilai}</dd>
                </div>
              ))}
            </dl>
          </Kartu>

          {/* Angka laba & modal hanya untuk pemilik. */}
          {k.sesi.peran === "PEMILIK" && (
            <Kartu>
              <KepalaKartu ikon="naik" judul="Untung transaksi ini" />
              <div className="p-4">
                <p className="angka text-[26px] leading-none font-extrabold tracking-[-0.025em] text-hijau">
                  {rupiah(trx.laba)}
                </p>
                <p className="mt-1.5 text-[12.5px] text-tinta-3">
                  Margin {margin}% · modal {rupiah(trx.totalModal)}
                </p>
                {trx.totalModal === 0 && (
                  <p className="mt-2 rounded-lg bg-kuning-muda px-2.5 py-2 text-[12px] leading-snug text-kuning">
                    Harga modal barang belum diisi, jadi angka laba ini sama dengan pendapatan.
                  </p>
                )}
              </div>
            </Kartu>
          )}

          {trx.catatan && (
            <Kartu>
              <KepalaKartu ikon="nota" judul="Catatan" />
              <p className="px-4 py-3.5 text-[13.5px] leading-relaxed text-tinta-2">{trx.catatan}</p>
            </Kartu>
          )}
        </div>
      </div>
    </div>
  );
}
