import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { Kartu, KepalaKartu, Kosong, Lencana } from "@/components/ui";
import { tanggalJam } from "@/lib/format";
import { AKSI, LABEL_AKSI } from "@/lib/sesi-admin";

export const metadata: Metadata = { title: "Jejak operator" };
export const dynamic = "force-dynamic";

/** Tindakan yang mengubah keadaan pelanggan disorot; sekadar masuk tidak. */
const NADA_AKSI: Record<string, "merek" | "merah" | "kuning" | "netral"> = {
  [AKSI.masuk]: "netral",
  [AKSI.konfirmasiBayar]: "merek",
  [AKSI.perpanjang]: "merek",
  [AKSI.tolakPengajuan]: "kuning",
  [AKSI.hentikanPro]: "kuning",
  [AKSI.blokir]: "merah",
  [AKSI.bukaBlokir]: "kuning",
  [AKSI.ubahPengaturan]: "kuning",
};

export default async function HalamanJejak() {
  const jejak = await db.jejakOperator.findMany({
    select: {
      id: true,
      aksi: true,
      operatorNama: true,
      tokoId: true,
      tokoNama: true,
      rincian: true,
      dibuatPada: true,
    },
    orderBy: { dibuatPada: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-tinta">
        Jejak operator
      </h1>
      <p className="mt-1 text-[13px] text-tinta-3">
        200 tindakan terakhir. Nama operator dan nama toko disimpan apa adanya di setiap baris,
        jadi jejaknya tetap terbaca walau akun atau tokonya sudah dihapus.
      </p>

      <Kartu className="mt-5 overflow-hidden">
        <KepalaKartu ikon="jam" judul="Riwayat tindakan" />

        {jejak.length === 0 ? (
          <Kosong
            ikon="jam"
            judul="Belum ada tindakan tercatat"
            pesan="Setiap konfirmasi pembayaran, blokir, dan perubahan pengaturan akan muncul di sini."
            className="py-10"
          />
        ) : (
          <ul className="divide-y divide-garis">
            {jejak.map((j) => (
              <li key={j.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Lencana nada={NADA_AKSI[j.aksi] ?? "netral"}>
                      {LABEL_AKSI[j.aksi] ?? j.aksi}
                    </Lencana>
                    {j.tokoNama && (
                      <span className="text-[13px] font-bold text-tinta">
                        {j.tokoId ? (
                          <Link
                            href={`/admin/toko/${j.tokoId}`}
                            className="hover:text-merek hover:underline"
                          >
                            {j.tokoNama}
                          </Link>
                        ) : (
                          j.tokoNama
                        )}
                      </span>
                    )}
                  </div>
                  <span className="angka shrink-0 text-[11.5px] text-tinta-4">
                    {tanggalJam(j.dibuatPada)}
                  </span>
                </div>

                <p className="mt-0.5 text-[11.5px] text-tinta-3">{j.operatorNama}</p>
                {j.rincian && <p className="mt-0.5 text-[12px] text-tinta-2">{j.rincian}</p>}
              </li>
            ))}
          </ul>
        )}
      </Kartu>
    </div>
  );
}
