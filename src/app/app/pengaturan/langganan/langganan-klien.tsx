"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ikon } from "@/components/ikon";
import { Konfirmasi } from "@/components/modal";
import { Peringatan } from "@/components/ui";
import { ajukanLangganan, batalkanPengajuan, hentikanPro } from "@/actions/toko";
import { rupiah } from "@/lib/format";
import {
  pembayaranSiap,
  pesanKonfirmasi,
  tautanKonfirmasiWa,
  type TujuanPembayaran,
} from "@/lib/pembayaran";
import { cn } from "@/lib/utils";

type Siklus = "BULANAN" | "TAHUNAN";

/** Baris berisi satu nilai yang bisa disalin dengan sekali tekan. */
function BarisSalin({
  label,
  nilai,
  tampilan,
}: {
  label: string;
  nilai: string;
  tampilan?: string;
}) {
  const [tersalin, setTersalin] = useState(false);

  const salin = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(nilai);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      // Peramban menolak akses papan klip — nomornya tetap terlihat dan bisa
      // ditandai sendiri, jadi tidak perlu memunculkan galat apa pun.
      setTersalin(false);
    }
  }, [nilai]);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-garis-2 bg-white px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-bold tracking-[0.06em] text-tinta-3 uppercase">{label}</p>
        <p className="angka truncate text-[17px] font-extrabold tracking-[-0.01em] text-tinta">
          {tampilan ?? nilai}
        </p>
      </div>
      <button
        type="button"
        onClick={salin}
        className={cn(
          "flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[12px] font-bold transition-colors",
          tersalin
            ? "border-merek-garis bg-merek-muda text-merek-tua"
            : "border-garis-2 text-tinta-2 hover:bg-kertas-2",
        )}
        aria-label={`Salin ${label}`}
      >
        <Ikon nama={tersalin ? "centang" : "salin"} size={14} />
        {tersalin ? "Tersalin" : "Salin"}
      </button>
    </div>
  );
}

export function PanelBerlangganan({
  namaToko,
  hargaBulanan,
  hargaTahunan,
  sedangPro,
  tujuan,
}: {
  namaToko: string;
  hargaBulanan: number;
  hargaTahunan: number;
  sedangPro: boolean;
  tujuan: TujuanPembayaran;
}) {
  const router = useRouter();
  const [siklus, setSiklus] = useState<Siklus>("BULANAN");
  const [kabar, setKabar] = useState<string | null>(null);
  const [, mulai] = useTransition();

  const jumlah = siklus === "TAHUNAN" ? hargaTahunan : hargaBulanan;
  const siap = pembayaranSiap(tujuan);

  const tautanWa = tautanKonfirmasiWa(
    tujuan.waNomor,
    pesanKonfirmasi({ namaToko, siklus, jumlah: rupiah(jumlah) }),
  );

  // Pengajuan dicatat sambil jalan. Tautan WhatsApp tetap berupa anchor asli
  // yang membuka tab baru — kalau menunggu aksi server selesai lalu memanggil
  // window.open, penghadang pop-up peramban bisa memblokirnya.
  function catatPengajuan() {
    mulai(async () => {
      const hasil = await ajukanLangganan(siklus);
      setKabar(hasil.pesan ?? null);
      router.refresh();
    });
  }

  const pilihan: Array<{ nilai: Siklus; label: string; harga: number; catatan: string }> = [
    { nilai: "BULANAN", label: "Bulanan", harga: hargaBulanan, catatan: "per bulan, per toko" },
    { nilai: "TAHUNAN", label: "Tahunan", harga: hargaTahunan, catatan: "hemat 2 bulan" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[12.5px] font-bold text-tinta-2">
          {sedangPro ? "Pilih masa perpanjangan" : "Pilih masa langganan"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {pilihan.map((p) => (
            <button
              key={p.nilai}
              type="button"
              onClick={() => setSiklus(p.nilai)}
              aria-pressed={siklus === p.nilai}
              className={cn(
                "rounded-xl border-2 p-3 text-left transition-colors",
                siklus === p.nilai
                  ? "border-merek bg-merek-muda"
                  : "border-garis-2 bg-white hover:border-merek/40",
              )}
            >
              <span className="text-[12px] font-bold tracking-[0.06em] text-tinta-3 uppercase">
                {p.label}
              </span>
              <span className="angka mt-0.5 block text-[19px] leading-none font-extrabold tracking-[-0.02em] text-tinta">
                {rupiah(p.harga)}
              </span>
              <span className="mt-1 block text-[11.5px] text-tinta-3">{p.catatan}</span>
            </button>
          ))}
        </div>
      </div>

      {!siap ? (
        // Rekening kosong lebih buruk daripada mengakui bahwa pembayarannya
        // sedang belum bisa dilayani — pelanggan tidak jadi mentransfer ke
        // nomor yang salah.
        <Peringatan nada="waspada" judul="Pembayaran belum bisa dilayani">
          Tujuan pembayaran sedang belum tersedia. Silakan coba lagi nanti. Paket Gratis tetap
          bisa dipakai seperti biasa.
        </Peringatan>
      ) : (
        <div className="rounded-xl border border-garis bg-kertas p-4">
          <p className="text-[12.5px] font-bold text-tinta-2">Cara berlangganan</p>

          <ol className="mt-3 space-y-3">
            <li>
              <p className="flex items-baseline gap-2 text-[12.5px] text-tinta-2">
                <span className="angka flex size-5 shrink-0 items-center justify-center rounded-full bg-tinta text-[11px] font-extrabold text-white">
                  1
                </span>
                Transfer <strong className="angka font-bold text-tinta">{rupiah(jumlah)}</strong> ke
                rekening berikut.
              </p>
              <div className="mt-2 ml-7 space-y-2">
                <BarisSalin
                  label={`Rekening ${tujuan.bankNama}`}
                  nilai={tujuan.bankRekening}
                />
                {tujuan.bankPemilik && (
                  <p className="text-[12px] text-tinta-3">
                    Atas nama{" "}
                    <strong className="font-bold text-tinta-2">{tujuan.bankPemilik}</strong>
                  </p>
                )}
              </div>
            </li>

            <li>
              <p className="flex items-baseline gap-2 text-[12.5px] text-tinta-2">
                <span className="angka flex size-5 shrink-0 items-center justify-center rounded-full bg-tinta text-[11px] font-extrabold text-white">
                  2
                </span>
                Kirim bukti transfer lewat WhatsApp untuk dikonfirmasi.
              </p>
              <div className="mt-2 ml-7 space-y-2">
                <BarisSalin label="WhatsApp" nilai={tujuan.waNomor} />
                <a
                  href={tautanWa}
                  target="_blank"
                  rel="noreferrer"
                  onClick={catatPengajuan}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-merek text-[14px] font-bold text-white transition-colors hover:bg-merek-tua"
                >
                  <Ikon nama="wa" size={17} />
                  Konfirmasi lewat WhatsApp
                </a>
              </div>
            </li>
          </ol>

          <p className="mt-3 text-[11.5px] leading-relaxed text-tinta-3">
            Paket Pro diaktifkan setelah pembayaran dicek. Tulis nama toko{" "}
            <strong className="font-semibold text-tinta-2">{namaToko}</strong> pada pesan
            konfirmasi agar lebih cepat dicocokkan.
          </p>

          {tujuan.catatanPembayaran && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-tinta-3">
              {tujuan.catatanPembayaran}
            </p>
          )}
        </div>
      )}

      {kabar && <Peringatan nada="sukses">{kabar}</Peringatan>}
    </div>
  );
}

export function TombolBatalPengajuan() {
  const router = useRouter();
  const [kabar, setKabar] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  function jalankan() {
    mulai(async () => {
      const hasil = await batalkanPengajuan();
      setKabar(hasil.pesan ?? null);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={jalankan}
        disabled={proses}
        className="text-[12.5px] font-semibold text-tinta-3 underline decoration-garis-2 underline-offset-2 hover:text-merah"
      >
        {proses ? "Membatalkan…" : "Batalkan pengajuan"}
      </button>
      {kabar && (
        <Peringatan nada="info" className="mt-3">
          {kabar}
        </Peringatan>
      )}
    </>
  );
}

export function TombolHenti() {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [kabar, setKabar] = useState<string | null>(null);
  const [proses, mulai] = useTransition();

  function jalankan() {
    mulai(async () => {
      const hasil = await hentikanPro();
      setBuka(false);
      setKabar(hasil.pesan ?? null);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="text-[12.5px] font-semibold text-tinta-3 underline decoration-garis-2 underline-offset-2 hover:text-merah"
      >
        Hentikan langganan
      </button>

      {kabar && (
        <Peringatan nada="info" className="mt-3">
          {kabar}
        </Peringatan>
      )}

      <Konfirmasi
        buka={buka}
        onTutup={() => setBuka(false)}
        onSetuju={jalankan}
        sedangProses={proses}
        judul="Hentikan langganan Pro?"
        pesan="Akun akan kembali ke paket Gratis. Semua data tetap tersimpan, tapi Catad Insight, laporan penuh, dan unduh CSV tidak bisa dipakai lagi."
        labelSetuju="Hentikan"
      />
    </>
  );
}
