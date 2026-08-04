import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { konteks } from "@/lib/sesi";
import {
  JudulHalaman,
  Kartu,
  KepalaKartu,
  Kosong,
  Lencana,
  Statistik,
  Tabel,
  Td,
  Th,
} from "@/components/ui";
import { Ikon } from "@/components/ikon";
import { rupiah, tanggalJam } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AturStok, IkonMutasi, TombolAturBaris, type ProdukStok } from "./stok-klien";

export const metadata: Metadata = { title: "Stok" };
export const dynamic = "force-dynamic";

export default async function HalamanStok() {
  const k = await konteks();

  const [produk, mutasi] = await Promise.all([
    db.produk.findMany({
      where: { tokoId: k.toko.id, aktif: true, lacakStok: true },
      select: {
        id: true,
        nama: true,
        satuan: true,
        stok: true,
        stokMinimum: true,
        hargaModal: true,
        hargaJual: true,
        kategori: { select: { nama: true } },
      },
      orderBy: [{ stok: "asc" }, { nama: "asc" }],
    }),
    db.mutasiStok.findMany({
      where: { tokoId: k.toko.id },
      select: {
        id: true,
        tipe: true,
        qty: true,
        stokSebelum: true,
        stokSesudah: true,
        catatan: true,
        dibuatPada: true,
        produk: { select: { nama: true, satuan: true } },
        pengguna: { select: { nama: true } },
      },
      orderBy: { dibuatPada: "desc" },
      take: 40,
    }),
  ]);

  const habis = produk.filter((p) => p.stok <= 0);
  const menipis = produk.filter((p) => p.stok > 0 && p.stok <= p.stokMinimum);
  const nilaiStok = produk.reduce((t, p) => t + Math.max(0, p.stok) * p.hargaModal, 0);
  const perluPerhatian = [...habis, ...menipis];

  const daftarUntukDialog: ProdukStok[] = produk.map((p) => ({
    id: p.id,
    nama: p.nama,
    satuan: p.satuan,
    stok: p.stok,
  }));

  return (
    <div className="p-4 sm:p-6">
      <JudulHalaman
        judul="Stok barang"
        keterangan="Pantau sisa barang dan catat setiap keluar-masuk."
        aksi={
          produk.length > 0 ? (
            <AturStok produk={daftarUntukDialog} />
          ) : (
            <Link
              href="/app/produk"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-merek px-4 text-sm font-semibold text-white"
            >
              <Ikon nama="tambah" size={16} />
              Tambah barang
            </Link>
          )
        }
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Statistik
          label="Barang dilacak"
          nilai={produk.length}
          ikon="kotak"
          keterangan="stok aktif dipantau"
        />
        <Statistik
          label="Stok menipis"
          nilai={menipis.length}
          ikon="peringatan"
          aksen={menipis.length > 0 ? "kuning" : "netral"}
          keterangan="di bawah batas minimum"
        />
        <Statistik
          label="Stok habis"
          nilai={habis.length}
          ikon="stok-kosong"
          aksen={habis.length > 0 ? "merah" : "netral"}
          keterangan="perlu segera dibeli"
        />
        <Statistik
          label="Nilai stok"
          nilai={rupiah(nilaiStok, { ringkas: true })}
          ikon="dompet"
          keterangan="modal yang ada di rak"
        />
      </div>

      {perluPerhatian.length > 0 && (
        <Kartu className="mt-5 overflow-hidden">
          <KepalaKartu
            ikon="peringatan"
            judul="Perlu perhatian"
            keterangan={`${habis.length} habis, ${menipis.length} menipis`}
            aksi={
              <Link
                href="/app/insight"
                className="inline-flex min-h-10 items-center gap-1 text-[12.5px] sm:min-h-0 font-bold text-merek hover:underline"
              >
                Lihat prediksi
                <Ikon nama="kanan" size={12} />
              </Link>
            }
          />
          <Tabel>
            <thead>
              <tr>
                <Th>Barang</Th>
                <Th kanan>Sisa</Th>
                <Th kanan className="hidden md:table-cell">Minimum</Th>
                <Th kanan className="hidden lg:table-cell">Nilai modal</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {perluPerhatian.map((p) => (
                <tr key={p.id} className="hover:bg-kertas/60">
                  <Td>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          p.stok <= 0 ? "bg-merah" : "bg-kuning",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-bold text-tinta">{p.nama}</p>
                        {p.kategori?.nama && (
                          <p className="text-[11.5px] text-tinta-3">{p.kategori.nama}</p>
                        )}
                        {/* Ambang minimum turun ke sini di layar sempit —
                            angka sisa tanpa ambangnya tidak bisa dinilai. */}
                        <p className="angka mt-0.5 text-[11.5px] text-tinta-4 md:hidden">
                          minimum {p.stokMinimum} {p.satuan}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td kanan>
                    {p.stok <= 0 ? (
                      <Lencana nada="merah">Habis</Lencana>
                    ) : (
                      <span className="angka text-[13.5px] font-bold text-kuning">
                        {p.stok} {p.satuan}
                      </span>
                    )}
                  </Td>
                  <Td kanan className="hidden md:table-cell">
                    <span className="angka text-[13px] text-tinta-3">{p.stokMinimum}</span>
                  </Td>
                  <Td kanan className="hidden lg:table-cell">
                    <span className="angka text-[13px] text-tinta-3">
                      {rupiah(Math.max(0, p.stok) * p.hargaModal)}
                    </span>
                  </Td>
                  <Td kanan>
                    <TombolAturBaris produk={daftarUntukDialog} produkId={p.id} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Tabel>
        </Kartu>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Kartu className="overflow-hidden">
          <KepalaKartu
            ikon="kotak"
            judul="Semua stok"
            keterangan={`${produk.length} barang dilacak`}
          />
          {produk.length === 0 ? (
            <Kosong
              judul="Belum ada barang dengan pelacakan stok"
              pesan="Aktifkan “Lacak stok” pada barang agar sisa persediaan terpantau otomatis."
            />
          ) : (
            <Tabel>
              <thead>
                <tr>
                  <Th>Barang</Th>
                  <Th kanan>Sisa</Th>
                  <Th kanan className="hidden md:table-cell">Nilai modal</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {produk.map((p) => {
                  const rendah = p.stok <= p.stokMinimum;
                  return (
                    <tr key={p.id} className="group hover:bg-kertas/60">
                      <Td>
                        <p className="truncate text-[13.5px] font-semibold text-tinta">{p.nama}</p>
                      </Td>
                      <Td kanan>
                        <span
                          className={cn(
                            "angka text-[13.5px] font-bold",
                            p.stok <= 0 ? "text-merah" : rendah ? "text-kuning" : "text-tinta",
                          )}
                        >
                          {p.stok}
                          <span className="ml-0.5 text-[11px] font-medium text-tinta-4">
                            {p.satuan}
                          </span>
                        </span>
                      </Td>
                      <Td kanan className="hidden md:table-cell">
                        <span className="angka text-[13px] text-tinta-3">
                          {rupiah(Math.max(0, p.stok) * p.hargaModal)}
                        </span>
                      </Td>
                      {/* Layar sentuh tidak punya "kursor lewat", jadi tombol
                          atur stok harus terlihat sejak awal di sana. */}
                      <Td kanan>
                        <span className="opacity-100 transition-opacity focus-within:opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                          <TombolAturBaris produk={daftarUntukDialog} produkId={p.id} />
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabel>
          )}
        </Kartu>

        <Kartu className="overflow-hidden">
          <KepalaKartu ikon="nota" judul="Riwayat mutasi" keterangan="40 perubahan terakhir" />
          {mutasi.length === 0 ? (
            <Kosong judul="Belum ada mutasi" pesan="Perubahan stok akan tercatat di sini." ikon="nota" />
          ) : (
            <ul className="max-h-[520px] divide-y divide-garis overflow-y-auto">
              {mutasi.map((m) => (
                <li key={m.id} className="flex items-start gap-2.5 px-4 py-3">
                  <IkonMutasi tipe={m.tipe} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-tinta">{m.produk.nama}</p>
                    <p className="text-[11.5px] text-tinta-3">
                      {tanggalJam(m.dibuatPada)}
                      {m.pengguna?.nama ? ` · ${m.pengguna.nama}` : ""}
                    </p>
                    {m.catatan && (
                      <p className="mt-0.5 truncate text-[11.5px] text-tinta-4">{m.catatan}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "angka text-[13px] font-extrabold",
                        m.qty > 0 ? "text-hijau" : "text-merah",
                      )}
                    >
                      {m.qty > 0 ? "+" : ""}
                      {m.qty}
                    </p>
                    <p className="angka text-[11px] text-tinta-4">
                      {m.stokSebelum} → {m.stokSesudah}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Kartu>
      </div>
    </div>
  );
}
