import type { Metadata } from "next";
import { Kartu, KepalaKartu, Peringatan } from "@/components/ui";
import { keWaInternasional, pembayaranSiap } from "@/lib/pembayaran";
import { tujuanPembayaran } from "@/lib/pengaturan-layanan";
import { FormPengaturan } from "./form-pengaturan";

export const metadata: Metadata = { title: "Pengaturan layanan" };
export const dynamic = "force-dynamic";

export default async function HalamanPengaturanLayanan() {
  const tujuan = await tujuanPembayaran();
  const siap = pembayaranSiap(tujuan);
  const waInternasional = keWaInternasional(tujuan.waNomor);

  return (
    <div>
      <h1 className="text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-tinta">
        Pengaturan layanan
      </h1>
      <p className="mt-1 text-[13px] text-tinta-3">
        Tujuan pembayaran yang ditampilkan di halaman langganan setiap pelanggan.
      </p>

      {!siap && (
        <Peringatan nada="waspada" className="mt-4" judul="Pembayaran belum bisa dilayani">
          Nomor rekening atau WhatsApp belum lengkap, jadi halaman langganan pelanggan sedang
          tidak menampilkan petunjuk transfer. Lengkapi di bawah.
        </Peringatan>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Kartu>
          <KepalaKartu
            ikon="dompet"
            judul="Tujuan pembayaran"
            keterangan="Perubahan langsung berlaku untuk semua pelanggan."
          />
          <div className="p-4 sm:p-5">
            <FormPengaturan tujuan={tujuan} />
          </div>
        </Kartu>

        <Kartu>
          <KepalaKartu ikon="info" judul="Yang dilihat pelanggan" />
          <div className="space-y-3 p-4 text-[12.5px] leading-relaxed text-tinta-2">
            <p>
              Halaman langganan menampilkan nomor rekening dan nomor WhatsApp beserta tombol
              salin, lalu satu tombol yang membuka WhatsApp dengan pesan konfirmasi sudah terisi
              nama toko, paket, dan jumlahnya.
            </p>

            <div className="rounded-lg border border-garis-2 bg-kertas p-3">
              <p className="text-[11px] font-bold tracking-[0.06em] text-tinta-3 uppercase">
                Tautan WhatsApp yang terbentuk
              </p>
              <p className="angka mt-1 break-all text-[12px] text-tinta">
                {waInternasional ? `wa.me/${waInternasional}` : "belum bisa dibentuk"}
              </p>
              <p className="mt-1.5 text-[11.5px] text-tinta-3">
                Nomor lokal diubah otomatis ke bentuk internasional. wa.me menolak awalan
                &ldquo;0&rdquo; maupun tanda &ldquo;+&rdquo;, jadi nomor boleh ditulis dengan gaya
                mana pun.
              </p>
            </div>

            <p className="text-[11.5px] text-tinta-3">
              Nama pemilik rekening bersifat pilihan. Kalau dibiarkan kosong, barisnya tidak
              ditampilkan sama sekali — lebih baik tidak ada daripada salah nama.
            </p>

            <p className="text-[11.5px] text-tinta-3">
              Harga paket tidak diatur di sini. Harga ditetapkan di dalam kode
              (<span className="angka">src/lib/plan.ts</span>) supaya perubahannya tercatat di
              riwayat perubahan kode dan ikut teruji.
            </p>
          </div>
        </Kartu>
      </div>
    </div>
  );
}
