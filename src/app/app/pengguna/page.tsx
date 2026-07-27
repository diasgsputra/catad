import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { wajibPemilik } from "@/lib/sesi";
import {
  JudulHalaman,
  Kartu,
  KepalaKartu,
  Lencana,
  Peringatan,
  Tabel,
  Td,
  Th,
} from "@/components/ui";
import { Ikon } from "@/components/ikon";
import { inisial } from "@/lib/utils";
import { tanggalJam } from "@/lib/format";
import { AksiPengguna, TombolTambahPengguna } from "./pengguna-klien";

export const metadata: Metadata = { title: "Akun kasir" };
export const dynamic = "force-dynamic";

export default async function HalamanPengguna() {
  const k = await wajibPemilik();

  const pengguna = await db.pengguna.findMany({
    where: { tokoId: k.toko.id },
    select: {
      id: true,
      nama: true,
      email: true,
      peran: true,
      aktif: true,
      masukTerakhir: true,
      dibuatPada: true,
      _count: { select: { transaksi: true } },
    },
    orderBy: [{ peran: "asc" }, { dibuatPada: "asc" }],
  });

  const kuotaHabis = pengguna.length >= k.paket.batas.maksPengguna;

  return (
    <div className="p-4 sm:p-6">
      <JudulHalaman
        judul="Akun kasir"
        keterangan="Beri akses kasir tanpa membuka laporan laba toko."
        aksi={<TombolTambahPengguna kuotaHabis={kuotaHabis} />}
      />

      {kuotaHabis && (
        <Peringatan nada="waspada" className="mt-4" judul="Kuota akun penuh">
          Paket {k.paket.aktif === "PRO" ? "Pro" : "Gratis"} dibatasi{" "}
          {k.paket.batas.maksPengguna} akun.{" "}
          {k.paket.aktif !== "PRO" && (
            <>
              <Link href="/app/pengaturan/langganan" className="font-bold underline">
                Upgrade ke Pro
              </Link>{" "}
              untuk menambah sampai 10 akun.
            </>
          )}
        </Peringatan>
      )}

      <Kartu className="mt-5 overflow-hidden">
        <KepalaKartu
          ikon="orang"
          judul="Daftar akun"
          keterangan={`${pengguna.length} dari ${k.paket.batas.maksPengguna} akun terpakai`}
        />
        <Tabel>
          <thead>
            <tr>
              <Th>Nama</Th>
              <Th className="hidden sm:table-cell">Peran</Th>
              <Th kanan className="hidden md:table-cell">Transaksi</Th>
              <Th kanan className="hidden lg:table-cell">Masuk terakhir</Th>
              <Th kanan>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {pengguna.map((p) => (
              <tr key={p.id} className="hover:bg-kertas/60">
                <Td>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-kertas-2 text-[11.5px] font-extrabold text-tinta-2">
                      {inisial(p.nama)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-bold text-tinta">{p.nama}</p>
                      <p className="truncate text-[11.5px] text-tinta-3">{p.email}</p>
                    </div>
                  </div>
                </Td>

                <Td className="hidden sm:table-cell">
                  <Lencana nada={p.peran === "PEMILIK" ? "merek" : "netral"}>
                    {p.peran === "PEMILIK" ? "Pemilik" : "Kasir"}
                  </Lencana>
                </Td>

                <Td kanan className="hidden md:table-cell">
                  <span className="angka text-[13px] text-tinta-2">{p._count.transaksi}</span>
                </Td>

                <Td kanan className="hidden lg:table-cell">
                  <span className="angka text-[12px] text-tinta-3">
                    {p.masukTerakhir ? tanggalJam(p.masukTerakhir) : "belum pernah"}
                  </span>
                </Td>

                <Td kanan>
                  {p.aktif ? (
                    <Lencana nada="hijau" ikon="centang">
                      Aktif
                    </Lencana>
                  ) : (
                    <Lencana nada="merah">Nonaktif</Lencana>
                  )}
                </Td>

                <Td kanan>
                  <AksiPengguna
                    id={p.id}
                    nama={p.nama}
                    aktif={p.aktif}
                    diriSendiri={p.id === k.sesi.uid}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabel>
      </Kartu>

      <Kartu className="mt-5">
        <KepalaKartu ikon="kunci" judul="Apa saja yang bisa diakses kasir" />
        <div className="grid gap-px bg-garis sm:grid-cols-2">
          <div className="bg-white p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-hijau">
              <Ikon nama="centang" size={14} />
              Bisa diakses kasir
            </p>
            <ul className="mt-2 space-y-1 text-[12.5px] text-tinta-2">
              <li>Halaman kasir dan menyimpan penjualan</li>
              <li>Daftar &amp; detail transaksi</li>
              <li>Melihat stok dan mengatur stok</li>
              <li>Menambah atau mengubah barang</li>
            </ul>
          </div>
          <div className="bg-white p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-merah">
              <Ikon nama="silang" size={14} />
              Khusus pemilik
            </p>
            <ul className="mt-2 space-y-1 text-[12.5px] text-tinta-2">
              <li>Ringkasan, laporan laba, dan Catad Insight</li>
              <li>Mencatat pengeluaran</li>
              <li>Mengelola akun kasir &amp; pengaturan toko</li>
              <li>Mengatur langganan dan membatalkan transaksi</li>
            </ul>
          </div>
        </div>
      </Kartu>
    </div>
  );
}
