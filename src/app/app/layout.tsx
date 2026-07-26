import { konteks } from "@/lib/sesi";
import { db } from "@/lib/db";
import { Kerangka, type GrupNav } from "@/components/kerangka";

export const dynamic = "force-dynamic";

export default async function TataLetakApl({ children }: { children: React.ReactNode }) {
  const k = await konteks();

  // Jumlah barang yang perlu diperhatikan — dipakai sebagai lencana di menu.
  const perluStok = await db.produk.count({
    where: {
      tokoId: k.toko.id,
      aktif: true,
      lacakStok: true,
      stok: { lte: db.produk.fields.stokMinimum },
    },
  });

  const pemilik = k.sesi.peran === "PEMILIK";

  // Kasir tidak melihat menu analisis: laporan laba, insight, dan pengeluaran
  // memang khusus pemilik (dijaga juga di sisi server pada tiap halaman).
  const grup: GrupNav[] = [
    ...(pemilik
      ? [{ butir: [{ label: "Ringkasan", href: "/app", ikon: "grafik" as const }] }]
      : []),
    {
      judul: "Jualan",
      butir: [
        { label: "Kasir", href: "/app/kasir", ikon: "kasir" },
        { label: "Transaksi", href: "/app/transaksi", ikon: "nota" },
      ],
    },
    {
      judul: "Barang",
      butir: [
        { label: "Daftar barang", href: "/app/produk", ikon: "kotak" },
        { label: "Stok", href: "/app/stok", ikon: "stok", lencana: perluStok },
      ],
    },
    ...(pemilik
      ? [
          {
            judul: "Analisis",
            butir: [
              { label: "Catad Insight", href: "/app/insight", ikon: "insight" as const },
              { label: "Laporan", href: "/app/laporan", ikon: "grafik" as const },
              { label: "Pengeluaran", href: "/app/pengeluaran", ikon: "dompet" as const },
            ],
          },
        ]
      : []),
    {
      judul: "Toko",
      butir: [
        ...(pemilik
          ? [{ label: "Akun kasir", href: "/app/pengguna", ikon: "orang" as const }]
          : []),
        { label: "Pengaturan", href: "/app/pengaturan", ikon: "gerigi" },
      ],
    },
  ];

  return (
    <Kerangka
      grup={grup}
      pengguna={{ nama: k.sesi.nama, peran: k.sesi.peran, email: "" }}
      toko={{ nama: k.toko.nama, jenisUsaha: k.toko.jenisUsaha }}
      paket={{
        aktif: k.paket.aktif,
        sumber: k.paket.sumber,
        sisaUjiCoba: k.paket.sisaUjiCoba,
      }}
    >
      {children}
    </Kerangka>
  );
}
