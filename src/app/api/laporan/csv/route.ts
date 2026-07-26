import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { konteks } from "@/lib/sesi";
import {
  akhirHariWib,
  awalHariWib,
  dariInputTanggal,
  jamMenit,
  kunciTanggal,
  tambahHari,
} from "@/lib/format";

export const dynamic = "force-dynamic";

/** Satu sel CSV yang aman: tanda kutip di-escape, teks selalu dikutip. */
function sel(nilai: string | number | null | undefined): string {
  if (nilai === null || nilai === undefined) return "";
  if (typeof nilai === "number") return String(nilai);
  return `"${nilai.replace(/"/g, '""')}"`;
}

/** Unduhan laporan CSV. Hanya untuk paket yang punya fitur ekspor. */
export async function GET(req: NextRequest) {
  const k = await konteks();

  // Laporan berisi modal & laba — hanya pemilik.
  if (k.sesi.peran !== "PEMILIK") {
    return NextResponse.json({ galat: "Hanya pemilik yang bisa mengunduh laporan." }, { status: 403 });
  }

  if (!k.paket.batas.fitur.ekspor) {
    return NextResponse.json(
      { galat: "Fitur unduh laporan hanya tersedia di paket Pro." },
      { status: 403 },
    );
  }

  const sp = req.nextUrl.searchParams;
  const sekarang = new Date();
  const selesai = akhirHariWib(sp.get("selesai") ? dariInputTanggal(sp.get("selesai")!) : sekarang);
  const mulaiDiminta = awalHariWib(
    sp.get("mulai") ? dariInputTanggal(sp.get("mulai")!) : tambahHari(sekarang, -29),
  );

  // Hormati batas riwayat paket, sama seperti di halaman laporan.
  const batas = k.paket.batas.riwayatHari;
  const paling = Number.isFinite(batas)
    ? awalHariWib(tambahHari(sekarang, -(batas - 1)))
    : null;
  const mulai = paling && mulaiDiminta < paling ? paling : mulaiDiminta;

  const transaksi = await db.transaksi.findMany({
    where: {
      tokoId: k.toko.id,
      status: "SELESAI",
      dibuatPada: { gte: mulai, lte: selesai },
    },
    select: {
      nomor: true,
      dibuatPada: true,
      subtotal: true,
      diskon: true,
      pajak: true,
      total: true,
      totalModal: true,
      laba: true,
      metodeBayar: true,
      catatan: true,
      pengguna: { select: { nama: true } },
      item: { select: { namaProduk: true, qty: true, satuan: true } },
    },
    orderBy: { dibuatPada: "asc" },
  });

  const baris: string[] = [];

  baris.push(
    [
      "Tanggal",
      "Jam",
      "Nomor nota",
      "Barang",
      "Jumlah item",
      "Subtotal",
      "Diskon",
      "Pajak",
      "Total",
      "Modal",
      "Laba kotor",
      "Metode bayar",
      "Kasir",
      "Catatan",
    ].join(","),
  );

  let totalPendapatan = 0;
  let totalLaba = 0;
  let totalModal = 0;

  for (const t of transaksi) {
    totalPendapatan += t.total;
    totalLaba += t.laba;
    totalModal += t.totalModal;

    const rincian = t.item.map((i) => `${i.namaProduk} x${i.qty}`).join("; ");
    const jumlahItem = t.item.reduce((s, i) => s + i.qty, 0);

    baris.push(
      [
        sel(kunciTanggal(t.dibuatPada)),
        sel(jamMenit(t.dibuatPada)),
        sel(t.nomor),
        sel(rincian),
        jumlahItem,
        t.subtotal,
        t.diskon,
        t.pajak,
        t.total,
        t.totalModal,
        t.laba,
        sel(String(t.metodeBayar)),
        sel(t.pengguna?.nama ?? ""),
        sel(t.catatan ?? ""),
      ].join(","),
    );
  }

  baris.push("");
  baris.push(
    [
      sel("RINGKASAN"),
      "",
      sel(`${transaksi.length} transaksi`),
      "",
      "",
      "",
      "",
      "",
      totalPendapatan,
      totalModal,
      totalLaba,
      "",
      "",
      "",
    ].join(","),
  );

  // BOM di depan agar Excel di Windows membaca UTF-8 dengan benar.
  const csv = `﻿${baris.join("\r\n")}`;
  const namaBerkas = `catad-laporan-${kunciTanggal(mulai)}-sd-${kunciTanggal(selesai)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
      "Cache-Control": "no-store",
    },
  });
}
