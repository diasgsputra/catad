import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { Ikon } from "@/components/ikon";
import { Kartu, KepalaKartu, Kosong, Lencana, Tabel, Td, Th } from "@/components/ui";
import { angka, jarakHari, selisihHari, tanggalSingkat } from "@/lib/format";
import { kelasToko, type KelasToko } from "@/lib/keuangan-langganan";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Toko" };
export const dynamic = "force-dynamic";

const SARINGAN: Array<{ nilai: "semua" | KelasToko; label: string }> = [
  { nilai: "semua", label: "Semua" },
  { nilai: "berlangganan", label: "Berlangganan" },
  { nilai: "uji-coba", label: "Uji coba" },
  { nilai: "gratis", label: "Gratis" },
  { nilai: "diblokir", label: "Diblokir" },
];

const NADA_KELAS: Record<KelasToko, "merek" | "kuning" | "netral" | "merah"> = {
  berlangganan: "merek",
  "uji-coba": "kuning",
  gratis: "netral",
  diblokir: "merah",
};

const LABEL_KELAS: Record<KelasToko, string> = {
  berlangganan: "Berlangganan",
  "uji-coba": "Uji coba",
  gratis: "Gratis",
  diblokir: "Diblokir",
};

export default async function HalamanDaftarToko({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kelas?: string }>;
}) {
  const sp = await searchParams;
  const cari = (sp.q ?? "").trim();
  const kelasDipilih = SARINGAN.some((s) => s.nilai === sp.kelas)
    ? (sp.kelas as "semua" | KelasToko)
    : "semua";

  // Pencarian dikerjakan basis data; pengelompokan paket dikerjakan di memori.
  // Kelas toko ditentukan `kelasToko()` yang juga dipakai halaman ringkasan —
  // menuliskannya ulang sebagai kondisi SQL berarti ada dua sumber kebenaran
  // yang cepat atau lambat berbeda hasil.
  const where: Prisma.TokoWhereInput = cari
    ? {
        OR: [
          { nama: { contains: cari, mode: "insensitive" } },
          { slug: { contains: cari, mode: "insensitive" } },
          { pengguna: { some: { email: { contains: cari, mode: "insensitive" } } } },
        ],
      }
    : {};

  const daftar = await db.toko.findMany({
    where,
    select: {
      id: true,
      nama: true,
      slug: true,
      jenisUsaha: true,
      diblokir: true,
      paket: true,
      trialSampai: true,
      proSampai: true,
      dibuatPada: true,
      pengguna: {
        where: { peran: "PEMILIK" },
        select: { email: true, masukTerakhir: true },
        orderBy: { dibuatPada: "asc" },
        take: 1,
      },
      _count: { select: { transaksi: true, pengguna: true } },
    },
    orderBy: { dibuatPada: "desc" },
    take: 300,
  });

  const sekarang = new Date();

  const berkelas = daftar.map((t) => ({ ...t, kelas: kelasToko(t, sekarang) }));
  const tersaring =
    kelasDipilih === "semua" ? berkelas : berkelas.filter((t) => t.kelas === kelasDipilih);

  const tautanSaringan = (nilai: string) => {
    const p = new URLSearchParams();
    if (cari) p.set("q", cari);
    if (nilai !== "semua") p.set("kelas", nilai);
    const s = p.toString();
    return s ? `/admin/toko?${s}` : "/admin/toko";
  };

  return (
    <div>
      <h1 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-tinta">
        Toko pelanggan
      </h1>
      <p className="mt-1 text-[13px] text-tinta-3">
        {angka(tersaring.length)} toko ditampilkan
        {daftar.length >= 300 && " — dibatasi 300 terbaru"}. Tekan{" "}
        <strong className="font-bold text-tinta-2">Kelola</strong> untuk mengubah langganan,
        memberi masa tenggang, atau memblokir toko.
      </p>

      {/* Pencarian memakai formulir GET biasa supaya tetap bekerja tanpa
          JavaScript dan hasilnya bisa ditandai sebagai penanda halaman. */}
      <form method="get" className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-tinta-4">
            <Ikon nama="cari" size={16} />
          </span>
          <input
            type="search"
            name="q"
            defaultValue={cari}
            placeholder="Cari nama toko, slug, atau email pemilik…"
            className="h-10 w-full rounded-lg border border-garis-2 bg-white pr-3 pl-9 text-[14px] font-medium text-tinta placeholder:text-tinta-4 focus:border-merek focus:ring-2 focus:ring-merek/15 focus:outline-none"
          />
        </div>
        {kelasDipilih !== "semua" && <input type="hidden" name="kelas" value={kelasDipilih} />}
        <button
          type="submit"
          className="h-10 shrink-0 rounded-lg bg-tinta px-4 text-[13.5px] font-bold text-white hover:bg-tinta-2"
        >
          Cari
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {SARINGAN.map((s) => (
          <Link
            key={s.nilai}
            href={tautanSaringan(s.nilai)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-[12.5px] font-bold transition-colors",
              kelasDipilih === s.nilai
                ? "bg-tinta text-white"
                : "bg-kertas-2 text-tinta-2 hover:bg-garis",
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <Kartu className="mt-4 overflow-hidden">
        <KepalaKartu ikon="toko" judul="Daftar toko" />

        {tersaring.length === 0 ? (
          <Kosong
            ikon="cari"
            judul="Tidak ada toko yang cocok"
            pesan={
              cari
                ? `Tidak ada toko dengan kata "${cari}" pada saringan ini.`
                : "Belum ada toko pada kelompok ini."
            }
            className="py-10"
          />
        ) : (
          <Tabel>
            <thead>
              <tr>
                <Th>Toko</Th>
                <Th>Status</Th>
                <Th kanan className="hidden lg:table-cell">Berakhir</Th>
                <Th kanan className="hidden md:table-cell">Transaksi</Th>
                <Th kanan className="hidden xl:table-cell">Masuk terakhir</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {tersaring.map((t) => {
                const pemilik = t.pengguna[0];
                const berakhir =
                  t.kelas === "berlangganan"
                    ? t.proSampai
                    : t.kelas === "uji-coba"
                      ? t.trialSampai
                      : null;

                return (
                  <tr key={t.id} className="hover:bg-kertas/60">
                    <Td>
                      <Link
                        href={`/admin/toko/${t.id}`}
                        className="text-[13.5px] font-bold text-tinta underline decoration-garis-2 decoration-from-font underline-offset-2 hover:text-merek hover:decoration-merek"
                      >
                        {t.nama}
                      </Link>
                      <p className="truncate text-[11.5px] text-tinta-3">
                        {pemilik?.email ?? "tanpa pemilik"}
                      </p>
                      <p className="text-[11px] text-tinta-4">
                        {t.jenisUsaha} · {t._count.pengguna} akun · daftar{" "}
                        {tanggalSingkat(t.dibuatPada)}
                      </p>
                    </Td>

                    <Td>
                      <Lencana nada={NADA_KELAS[t.kelas]}>{LABEL_KELAS[t.kelas]}</Lencana>
                    </Td>

                    <Td kanan className="hidden lg:table-cell">
                      {berakhir ? (
                        <>
                          <span className="angka text-[12.5px] text-tinta-2">
                            {tanggalSingkat(berakhir)}
                          </span>
                          <p className="text-[11px] text-tinta-4">
                            {jarakHari(selisihHari(sekarang, berakhir))}
                          </p>
                        </>
                      ) : (
                        <span className="text-[12px] text-tinta-4">—</span>
                      )}
                    </Td>

                    <Td kanan className="hidden md:table-cell">
                      <span className="angka text-[13px] text-tinta-2">
                        {angka(t._count.transaksi)}
                      </span>
                    </Td>

                    <Td kanan className="hidden xl:table-cell">
                      <span className="angka text-[12px] text-tinta-3">
                        {pemilik?.masukTerakhir ? tanggalSingkat(pemilik.masukTerakhir) : "belum"}
                      </span>
                    </Td>

                    {/* Kolom aksi yang benar-benar terlihat. Sebelumnya satu-satunya
                        jalan ke halaman kelola adalah nama toko yang tidak diberi
                        warna maupun garis bawah — kemampuan yang tidak kelihatan
                        sama saja dengan tidak ada. */}
                    <Td kanan>
                      <Link
                        href={`/admin/toko/${t.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-garis-2 px-2.5 py-1.5 text-[12.5px] font-bold whitespace-nowrap text-tinta-2 transition-colors hover:border-merek hover:bg-merek-muda hover:text-merek-tua"
                      >
                        Kelola
                        <Ikon nama="kanan" size={12} />
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Tabel>
        )}
      </Kartu>
    </div>
  );
}
