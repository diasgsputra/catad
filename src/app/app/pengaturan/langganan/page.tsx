import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { konteks } from "@/lib/sesi";
import { Kartu, KepalaKartu, Lencana, Peringatan, Tabel, Td, Th } from "@/components/ui";
import { Ikon } from "@/components/ikon";
import { rupiah, tanggalSingkat } from "@/lib/format";
import { tujuanPembayaran } from "@/lib/pengaturan-layanan";
import {
  HARGA_PRO_BULANAN,
  HARGA_PRO_TAHUNAN,
  HARI_UJI_COBA,
  PAKET,
} from "@/lib/plan";
import { PanelBerlangganan, TombolBatalPengajuan, TombolHenti } from "./langganan-klien";

export const metadata: Metadata = { title: "Langganan" };
export const dynamic = "force-dynamic";

const FITUR_BANDING: Array<{ label: string; gratis: string | boolean; pro: string | boolean }> = [
  { label: "Transaksi kasir", gratis: "Tanpa batas", pro: "Tanpa batas" },
  { label: "Jumlah barang", gratis: `${PAKET.GRATIS.maksProduk} barang`, pro: "Tanpa batas" },
  { label: "Riwayat laporan", gratis: `${PAKET.GRATIS.riwayatHari} hari`, pro: "Tanpa batas" },
  { label: "Peringatan stok minimum", gratis: true, pro: true },
  { label: "Nota digital & WhatsApp", gratis: true, pro: true },
  { label: "Catad Insight (prediksi stok)", gratis: false, pro: true },
  { label: "Daftar belanja otomatis", gratis: false, pro: true },
  { label: "Deteksi barang mandek", gratis: false, pro: true },
  { label: "Laporan pajak tahunan (PDF)", gratis: false, pro: true },
  { label: "Unduh laporan CSV", gratis: false, pro: true },
  { label: "Akun kasir", gratis: "1 akun", pro: `${PAKET.PRO.maksPengguna} akun` },
];

const NADA_STATUS: Record<string, "hijau" | "kuning" | "merah" | "netral"> = {
  MENUNGGU: "kuning",
  AKTIF: "hijau",
  KEDALUWARSA: "netral",
  DIBATALKAN: "merah",
};

const LABEL_STATUS: Record<string, string> = {
  MENUNGGU: "Menunggu",
  AKTIF: "Aktif",
  KEDALUWARSA: "Kedaluwarsa",
  DIBATALKAN: "Dibatalkan",
};

export default async function HalamanLangganan() {
  const k = await konteks();
  const sedangPro = k.paket.aktif === "PRO";
  const bolehUbah = k.sesi.peran === "PEMILIK";

  const tujuan = await tujuanPembayaran();

  // Pengajuan yang sudah dicatat tapi pembayarannya belum dikonfirmasi.
  const pengajuan = await db.langganan.findFirst({
    where: { tokoId: k.toko.id, status: "MENUNGGU" },
    select: { id: true, jumlah: true, dibuatPada: true },
    orderBy: { dibuatPada: "desc" },
  });

  const riwayat = await db.langganan.findMany({
    where: { tokoId: k.toko.id },
    select: {
      id: true,
      paket: true,
      jumlah: true,
      periodeMulai: true,
      periodeSelesai: true,
      status: true,
      metode: true,
      dibuatPada: true,
    },
    orderBy: { dibuatPada: "desc" },
    take: 12,
  });

  return (
    <div className="p-4 sm:p-6">
      <Link
        href="/app/pengaturan"
        className="mb-2 inline-flex items-center gap-1 text-[12.5px] font-bold text-tinta-3 hover:text-tinta"
      >
        <Ikon nama="kiri" size={12} />
        Pengaturan
      </Link>

      <h1 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-tinta">
        Langganan
      </h1>
      <p className="mt-1 text-[13px] text-tinta-3">
        Paket menentukan fitur analisis yang terbuka. Data toko tidak pernah dihapus saat paket
        berubah.
      </p>

      {/* Status sekarang */}
      <Kartu className="mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-garis bg-kertas px-5 py-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.08em] text-tinta-3 uppercase">
              Paket aktif
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[20px] font-extrabold tracking-[-0.02em] text-tinta">
                {k.paket.aktif === "PRO" ? "Catad Pro" : "Catad Gratis"}
              </span>
              {k.paket.sumber === "uji-coba" && <Lencana nada="kuning">Uji coba</Lencana>}
              {k.paket.sumber === "berbayar" && <Lencana nada="merek">Berbayar</Lencana>}
            </div>
          </div>

          <div className="text-right">
            {k.paket.sumber === "uji-coba" && (
              <p className="text-[13px] text-tinta-2">
                Uji coba berakhir dalam{" "}
                <strong className="angka font-bold text-tinta">{k.paket.sisaUjiCoba} hari</strong>
              </p>
            )}
            {k.paket.sumber === "berbayar" && k.toko.proSampai && (
              <p className="text-[13px] text-tinta-2">
                Aktif sampai{" "}
                <strong className="angka font-bold text-tinta">
                  {tanggalSingkat(k.toko.proSampai)}
                </strong>
              </p>
            )}
            {k.paket.sumber === "gratis" && (
              <p className="text-[13px] text-tinta-2">
                {k.paket.ujiCobaHabis ? "Masa uji coba sudah berakhir" : "Belum pernah berlangganan"}
              </p>
            )}
          </div>
        </div>

        {pengajuan && (
          <Peringatan nada="waspada" className="m-4" judul="Menunggu konfirmasi pembayaran">
            Pengajuan sebesar{" "}
            <strong className="angka font-bold">{rupiah(pengajuan.jumlah)}</strong> tercatat pada{" "}
            {tanggalSingkat(pengajuan.dibuatPada)}. Paket Pro aktif setelah bukti transfer dicek.
            <span className="mt-2 block">
              <TombolBatalPengajuan />
            </span>
          </Peringatan>
        )}
      </Kartu>

      {/* Dua paket */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Kartu className="flex flex-col p-5">
          <p className="text-[12px] font-bold tracking-[0.08em] text-tinta-3 uppercase">Gratis</p>
          <p className="angka mt-2 text-[30px] leading-none font-extrabold tracking-[-0.03em] text-tinta">
            Rp0
          </p>
          <p className="mt-1 text-[12.5px] text-tinta-3">Selamanya, tanpa batas transaksi</p>

          <div className="mt-4 flex-1" />

          {sedangPro ? (
            bolehUbah ? (
              <div className="text-center">
                <TombolHenti />
              </div>
            ) : null
          ) : (
            <div className="rounded-lg bg-kertas-2 py-2.5 text-center text-[13px] font-bold text-tinta-3">
              Paket Anda saat ini
            </div>
          )}
        </Kartu>

        <Kartu className="flex flex-col border-2 border-merek p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-bold tracking-[0.08em] text-merek uppercase">Pro</p>
            <Lencana nada="merek">Hemat 2 bulan / tahun</Lencana>
          </div>

          <p className="mt-2 flex items-baseline gap-1.5">
            <span className="angka text-[30px] leading-none font-extrabold tracking-[-0.03em] text-tinta">
              {rupiah(HARGA_PRO_BULANAN)}
            </span>
            <span className="text-[13px] font-semibold text-tinta-3">/bulan</span>
          </p>
          <p className="mt-1 text-[12.5px] text-tinta-3">
            atau {rupiah(HARGA_PRO_TAHUNAN)}/tahun · per toko
          </p>

          <div className="mt-4 flex-1" />

          {bolehUbah ? (
            <p className="text-[12.5px] leading-relaxed text-tinta-3">
              {sedangPro
                ? "Perpanjangan diatur pada bagian di bawah."
                : "Cara berlangganan ada pada bagian di bawah."}
            </p>
          ) : (
            <p className="rounded-lg bg-kertas-2 py-2.5 text-center text-[12.5px] font-semibold text-tinta-3">
              Hanya pemilik toko yang bisa mengatur langganan.
            </p>
          )}
        </Kartu>
      </div>

      {bolehUbah && (
        <Kartu className="mt-5">
          <KepalaKartu
            ikon="dompet"
            judul={sedangPro ? "Perpanjang langganan" : "Berlangganan Pro"}
            keterangan="Pembayaran lewat transfer bank, lalu dikonfirmasi melalui WhatsApp."
          />
          <div className="p-4 sm:p-5">
            <PanelBerlangganan
              namaToko={k.toko.nama}
              hargaBulanan={HARGA_PRO_BULANAN}
              hargaTahunan={HARGA_PRO_TAHUNAN}
              sedangPro={sedangPro}
              tujuan={tujuan}
              adaPengajuan={!!pengajuan}
            />
          </div>
        </Kartu>
      )}

      {/* Perbandingan fitur */}
      <Kartu className="mt-5 overflow-hidden">
        <KepalaKartu ikon="grafik" judul="Perbandingan fitur" />
        <Tabel>
          <thead>
            <tr>
              <Th>Fitur</Th>
              <Th kanan>Gratis</Th>
              <Th kanan>Pro</Th>
            </tr>
          </thead>
          <tbody>
            {FITUR_BANDING.map((f) => (
              <tr key={f.label} className="hover:bg-kertas/60">
                <Td>
                  <span className="text-[13.5px] font-semibold text-tinta">{f.label}</span>
                </Td>
                <Td kanan>
                  <SelFitur nilai={f.gratis} />
                </Td>
                <Td kanan>
                  <SelFitur nilai={f.pro} sorot />
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      </Kartu>

      {/* Riwayat */}
      {riwayat.length > 0 && (
        <Kartu className="mt-5 overflow-hidden">
          <KepalaKartu ikon="nota" judul="Riwayat langganan" />
          <Tabel>
            <thead>
              <tr>
                <Th>Periode</Th>
                <Th>Paket</Th>
                <Th kanan>Jumlah</Th>
                <Th kanan>Status</Th>
              </tr>
            </thead>
            <tbody>
              {riwayat.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <span className="angka text-[13px] text-tinta-2">
                      {tanggalSingkat(r.periodeMulai)} – {tanggalSingkat(r.periodeSelesai)}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-[13px] font-semibold text-tinta">{r.paket}</span>
                    <span className="ml-1.5 text-[11.5px] text-tinta-4">
                      {r.metode.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </Td>
                  <Td kanan>
                    <span className="angka text-[13px] font-bold text-tinta">
                      {rupiah(r.jumlah)}
                    </span>
                  </Td>
                  <Td kanan>
                    <Lencana nada={NADA_STATUS[r.status] ?? "netral"}>
                      {LABEL_STATUS[r.status] ?? r.status}
                    </Lencana>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        </Kartu>
      )}

      <p className="mt-5 text-center text-[12px] text-tinta-4">
        Semua akun baru mendapat uji coba Pro {HARI_UJI_COBA} hari secara otomatis.
      </p>
    </div>
  );
}

function SelFitur({ nilai, sorot }: { nilai: string | boolean; sorot?: boolean }) {
  if (typeof nilai === "boolean") {
    return nilai ? (
      <span className={sorot ? "inline-flex text-merek" : "inline-flex text-hijau"}>
        <Ikon nama="centang" size={15} />
      </span>
    ) : (
      <span className="inline-flex text-tinta-4">
        <Ikon nama="silang" size={14} />
      </span>
    );
  }

  return (
    <span
      className={
        sorot
          ? "text-[13px] font-bold text-merek-tua"
          : "text-[13px] font-semibold text-tinta-2"
      }
    >
      {nilai}
    </span>
  );
}
