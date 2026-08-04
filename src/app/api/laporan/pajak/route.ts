import { NextResponse, type NextRequest } from "next/server";
import { konteks } from "@/lib/sesi";
import { kunciTanggal, tanggalPanjang } from "@/lib/format";
import { laporanPajakPdf, namaBerkasLaporanPajak } from "@/lib/laporan-pajak-pdf";
import { dataPajakTahunan, konfigurasiDariToko } from "@/lib/pajak-data";

export const dynamic = "force-dynamic";

/** Cap waktu PDF, "YYYYMMDDHHmmSS" menurut WIB. */
function capWaktu(sekarang: Date): string {
  const wib = new Date(sekarang.getTime() + 7 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${wib.getUTCFullYear()}${p(wib.getUTCMonth() + 1)}${p(wib.getUTCDate())}` +
    `${p(wib.getUTCHours())}${p(wib.getUTCMinutes())}${p(wib.getUTCSeconds())}`
  );
}

/** Unduhan laporan pajak tahunan sebagai PDF. */
export async function GET(req: NextRequest) {
  const k = await konteks();

  // Laporan memuat modal, laba, dan identitas pajak — hanya pemilik.
  if (k.sesi.peran !== "PEMILIK") {
    return NextResponse.json(
      { galat: "Hanya pemilik yang bisa mengunduh laporan pajak." },
      { status: 403 },
    );
  }

  if (!k.paket.batas.fitur.pajak) {
    return NextResponse.json(
      { galat: "Laporan pajak hanya tersedia di paket Pro." },
      { status: 403 },
    );
  }

  const sekarang = new Date();
  const tahunSekarang = Number(kunciTanggal(sekarang).slice(0, 4));
  const diminta = Number(req.nextUrl.searchParams.get("tahun"));

  // Tahun dibatasi ke rentang yang masuk akal supaya angka sembarang dari URL
  // tidak memicu kueri rentang raksasa.
  const tahun =
    Number.isInteger(diminta) && diminta >= 2000 && diminta <= tahunSekarang + 1
      ? diminta
      : tahunSekarang;

  const data = await dataPajakTahunan({
    tokoId: k.toko.id,
    tahun,
    konfigurasi: konfigurasiDariToko(k.toko),
  });

  const pdf = laporanPajakPdf({
    data,
    identitas: {
      namaToko: k.toko.nama,
      namaWajibPajak: k.toko.namaWajibPajak,
      npwp: k.toko.npwp,
      jenisWajibPajak: k.toko.jenisWajibPajak,
      jenisUsaha: k.toko.jenisUsaha,
      alamat: k.toko.alamat,
    },
    dibuatLabel: tanggalPanjang(sekarang),
    dibuatPada: capWaktu(sekarang),
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${namaBerkasLaporanPajak(k.toko.nama, tahun)}"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "no-store",
    },
  });
}
