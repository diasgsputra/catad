import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Ikon } from "@/components/ikon";
import {
  Kartu,
  KepalaKartu,
  Lencana,
  Peringatan,
  Tabel,
  Td,
  Th,
} from "@/components/ui";
import { angka, jarakHari, rupiah, selisihHari, tanggalJam, tanggalSingkat } from "@/lib/format";
import { kelasToko } from "@/lib/keuangan-langganan";
import { HARGA_PRO_BULANAN, HARGA_PRO_TAHUNAN, statusPaket } from "@/lib/plan";
import { LABEL_AKSI } from "@/lib/sesi-admin";
import { AksiPengajuan } from "../../aksi-pengajuan";
import { AksiToko } from "./aksi-toko";

export const metadata: Metadata = { title: "Detail toko" };
export const dynamic = "force-dynamic";

const LABEL_STATUS: Record<string, string> = {
  MENUNGGU: "Menunggu",
  AKTIF: "Aktif",
  KEDALUWARSA: "Kedaluwarsa",
  DIBATALKAN: "Dibatalkan",
};

const NADA_STATUS: Record<string, "hijau" | "kuning" | "merah" | "netral"> = {
  MENUNGGU: "kuning",
  AKTIF: "hijau",
  KEDALUWARSA: "netral",
  DIBATALKAN: "merah",
};

export default async function HalamanDetailToko({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const toko = await db.toko.findUnique({
    where: { id },
    select: {
      id: true,
      nama: true,
      slug: true,
      jenisUsaha: true,
      alamat: true,
      telepon: true,
      waToko: true,
      paket: true,
      trialSampai: true,
      proSampai: true,
      diblokir: true,
      alasanBlokir: true,
      diblokirPada: true,
      dibuatPada: true,
      pengguna: {
        select: {
          id: true,
          nama: true,
          email: true,
          peran: true,
          aktif: true,
          masukTerakhir: true,
        },
        orderBy: [{ peran: "asc" }, { dibuatPada: "asc" }],
      },
      langganan: {
        select: {
          id: true,
          jumlah: true,
          status: true,
          metode: true,
          periodeMulai: true,
          periodeSelesai: true,
          dibayarPada: true,
          dibuatPada: true,
        },
        orderBy: { dibuatPada: "desc" },
        take: 20,
      },
      _count: { select: { transaksi: true, produk: true } },
    },
  });

  if (!toko) notFound();

  const sekarang = new Date();
  const status = statusPaket(toko, sekarang);
  const kelas = kelasToko(toko, sekarang);
  const menunggu = toko.langganan.filter((l) => l.status === "MENUNGGU");

  const totalDibayar = toko.langganan
    .filter((l) => l.dibayarPada)
    .reduce((jumlah, l) => jumlah + l.jumlah, 0);

  const jejak = await db.jejakOperator.findMany({
    where: { tokoId: toko.id },
    select: { id: true, aksi: true, operatorNama: true, rincian: true, dibuatPada: true },
    orderBy: { dibuatPada: "desc" },
    take: 15,
  });

  return (
    <div>
      <Link
        href="/admin/toko"
        className="mb-2 inline-flex min-h-10 items-center gap-1 text-[12.5px] sm:min-h-0 font-bold text-tinta-3 hover:text-tinta"
      >
        <Ikon nama="kiri" size={12} />
        Daftar toko
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-tinta">
            {toko.nama}
            {kelas === "diblokir" && <Lencana nada="merah" ikon="kunci">Diblokir</Lencana>}
            {kelas === "berlangganan" && <Lencana nada="merek">Berlangganan</Lencana>}
            {kelas === "uji-coba" && <Lencana nada="kuning">Uji coba</Lencana>}
            {kelas === "gratis" && <Lencana nada="netral">Gratis</Lencana>}
          </h1>
          <p className="mt-1 text-[13px] text-tinta-3">
            {toko.slug} · {toko.jenisUsaha} · terdaftar {tanggalSingkat(toko.dibuatPada)}
          </p>
        </div>
      </div>

      {toko.diblokir && (
        <Peringatan nada="bahaya" className="mt-4" judul="Toko ini diblokir">
          {toko.alasanBlokir || "Tanpa catatan alasan."}
          {toko.diblokirPada && (
            <span className="mt-1 block text-[12px]">
              Sejak {tanggalJam(toko.diblokirPada)}.
            </span>
          )}
        </Peringatan>
      )}

      {menunggu.length > 0 && (
        <Kartu className="mt-4 overflow-hidden">
          <KepalaKartu
            ikon="nota"
            judul="Pengajuan menunggu konfirmasi"
            keterangan="Konfirmasi hanya setelah dana benar-benar masuk ke rekening."
          />
          <div className="divide-y divide-garis">
            {menunggu.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="angka text-[15px] font-extrabold text-tinta">
                    {rupiah(l.jumlah)}
                  </p>
                  <p className="text-[11.5px] text-tinta-3">
                    {selisihHari(l.periodeMulai, l.periodeSelesai) > 60 ? "Tahunan" : "Bulanan"} ·
                    diajukan {tanggalSingkat(l.dibuatPada)}
                  </p>
                </div>
                <div className="min-w-[190px]">
                  <AksiPengajuan langgananId={l.id} namaToko={toko.nama} jumlah={l.jumlah} />
                </div>
              </div>
            ))}
          </div>
        </Kartu>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* ── Keadaan paket ── */}
        <Kartu className="overflow-hidden">
          <KepalaKartu ikon="bintang" judul="Paket & masa berlaku" />
          <dl className="divide-y divide-garis">
            <Baris label="Paket efektif" nilai={status.aktif === "PRO" ? "Catad Pro" : "Catad Gratis"} />
            <Baris
              label="Sumber"
              nilai={
                status.sumber === "berbayar"
                  ? "Langganan berbayar"
                  : status.sumber === "uji-coba"
                    ? "Masa uji coba"
                    : "Paket gratis"
              }
            />
            <Baris
              label="Uji coba berakhir"
              nilai={toko.trialSampai ? tanggalSingkat(toko.trialSampai) : "—"}
            />
            <Baris
              label="Pro berlaku sampai"
              nilai={
                toko.proSampai ? (
                  <>
                    {tanggalSingkat(toko.proSampai)}
                    <span className="ml-1.5 text-[11.5px] text-tinta-4">
                      {jarakHari(selisihHari(sekarang, toko.proSampai))}
                    </span>
                  </>
                ) : (
                  "—"
                )
              }
            />
            <Baris label="Total sudah dibayar" nilai={rupiah(totalDibayar)} />
            <Baris label="Jumlah barang" nilai={angka(toko._count.produk)} />
            <Baris label="Jumlah transaksi" nilai={angka(toko._count.transaksi)} />
            {toko.waToko && <Baris label="WhatsApp toko" nilai={toko.waToko} />}
            {toko.telepon && <Baris label="Telepon" nilai={toko.telepon} />}
            {toko.alamat && <Baris label="Alamat" nilai={toko.alamat} />}
          </dl>
        </Kartu>

        {/* ── Tindakan ── */}
        <Kartu className="overflow-hidden">
          <KepalaKartu ikon="gerigi" judul="Tindakan operator" />
          <div className="p-4">
            <AksiToko
              tokoId={toko.id}
              namaToko={toko.nama}
              diblokir={toko.diblokir}
              sedangPro={status.sumber === "berbayar"}
              hargaBulanan={HARGA_PRO_BULANAN}
              hargaTahunan={HARGA_PRO_TAHUNAN}
            />
          </div>
        </Kartu>
      </div>

      {/* ── Akun ── */}
      <Kartu className="mt-4 overflow-hidden">
        <KepalaKartu
          ikon="orang"
          judul="Akun toko"
          keterangan={`${toko.pengguna.length} akun`}
        />
        <Tabel>
          <thead>
            <tr>
              <Th>Nama</Th>
              <Th>Peran</Th>
              <Th kanan>Status</Th>
              <Th kanan className="hidden sm:table-cell">Masuk terakhir</Th>
            </tr>
          </thead>
          <tbody>
            {toko.pengguna.map((p) => (
              <tr key={p.id}>
                <Td>
                  <p className="text-[13.5px] font-bold text-tinta">{p.nama}</p>
                  <p className="text-[11.5px] text-tinta-3">{p.email}</p>
                </Td>
                <Td>
                  <Lencana nada={p.peran === "PEMILIK" ? "merek" : "netral"}>
                    {p.peran === "PEMILIK" ? "Pemilik" : "Kasir"}
                  </Lencana>
                </Td>
                <Td kanan>
                  {p.aktif ? (
                    <Lencana nada="hijau">Aktif</Lencana>
                  ) : (
                    <Lencana nada="merah">Nonaktif</Lencana>
                  )}
                </Td>
                <Td kanan className="hidden sm:table-cell">
                  <span className="angka text-[12px] text-tinta-3">
                    {p.masukTerakhir ? tanggalJam(p.masukTerakhir) : "belum pernah"}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      </Kartu>

      {/* ── Riwayat langganan ── */}
      {toko.langganan.length > 0 && (
        <Kartu className="mt-4 overflow-hidden">
          <KepalaKartu ikon="nota" judul="Riwayat langganan" />
          <Tabel>
            <thead>
              <tr>
                <Th>Periode</Th>
                <Th kanan>Jumlah</Th>
                <Th kanan>Dibayar</Th>
                <Th kanan>Status</Th>
              </tr>
            </thead>
            <tbody>
              {toko.langganan.map((l) => (
                <tr key={l.id}>
                  <Td>
                    <span className="angka text-[12.5px] text-tinta-2">
                      {tanggalSingkat(l.periodeMulai)} – {tanggalSingkat(l.periodeSelesai)}
                    </span>
                    <p className="text-[11px] text-tinta-4">
                      {l.metode.replace(/_/g, " ").toLowerCase()}
                    </p>
                  </Td>
                  <Td kanan>
                    <span className="angka text-[13px] font-bold text-tinta">
                      {rupiah(l.jumlah)}
                    </span>
                  </Td>
                  <Td kanan>
                    {l.dibayarPada ? (
                      <span className="angka text-[12px] text-tinta-2">
                        {tanggalSingkat(l.dibayarPada)}
                      </span>
                    ) : (
                      <span className="text-[11.5px] text-tinta-4">belum</span>
                    )}
                  </Td>
                  <Td kanan>
                    <Lencana nada={NADA_STATUS[l.status] ?? "netral"}>
                      {LABEL_STATUS[l.status] ?? l.status}
                    </Lencana>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        </Kartu>
      )}

      {/* ── Jejak untuk toko ini ── */}
      {jejak.length > 0 && (
        <Kartu className="mt-4 overflow-hidden">
          <KepalaKartu ikon="jam" judul="Jejak tindakan pada toko ini" />
          <ul className="divide-y divide-garis">
            {jejak.map((j) => (
              <li key={j.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13px] font-bold text-tinta">
                    {LABEL_AKSI[j.aksi] ?? j.aksi}
                  </p>
                  <span className="angka text-[11.5px] text-tinta-4">
                    {tanggalJam(j.dibuatPada)}
                  </span>
                </div>
                <p className="text-[11.5px] text-tinta-3">{j.operatorNama}</p>
                {j.rincian && (
                  <p className="mt-0.5 text-[12px] text-tinta-2">{j.rincian}</p>
                )}
              </li>
            ))}
          </ul>
        </Kartu>
      )}
    </div>
  );
}

function Baris({ label, nilai }: { label: string; nilai: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <dt className="text-[12.5px] text-tinta-3">{label}</dt>
      <dd className="text-right text-[13px] font-semibold text-tinta">{nilai}</dd>
    </div>
  );
}
