"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Kunci } from "./ui";
import { bukaBantuan, masukMenuSamping } from "./pintasan-global";
import {
  adaPengubah,
  dalamIsian,
  hurufTunggal,
  kursorMasihBisaKeKiri,
  menuSampingAktif,
} from "@/lib/pintasan";

/**
 * Menjadikan daftar yang dirender di server bisa dijelajahi dengan panah.
 *
 * Barisnya tetap dirender komponen server; komponen ini hanya menyorot baris
 * yang sedang dipilih lewat atribut `data-sorot` dan menangani tombolnya.
 * Setiap baris cukup diberi `data-baris={index}` di sisi server.
 *
 * Sekaligus menampilkan bar petunjuk di dasar layar supaya pintasannya
 * terlihat tanpa perlu dihafal.
 */
export function NavigasiDaftar({
  hrefs,
  tambahHref,
  labelTambah = "Tambah",
  labelBuka = "Buka",
}: {
  hrefs: string[];
  tambahHref?: string;
  labelTambah?: string;
  labelBuka?: string;
}) {
  const router = useRouter();
  const [sorot, setSorot] = useState(-1);

  // Sorotan hilang bila daftarnya berubah (mis. setelah menyaring).
  useEffect(() => {
    setSorot(-1);
  }, [hrefs.length]);

  // Tandai baris terpilih langsung di DOM — barisnya milik komponen server.
  useEffect(() => {
    const semua = document.querySelectorAll<HTMLElement>("[data-baris]");
    semua.forEach((el) => {
      const indeks = Number(el.dataset.baris);
      if (indeks === sorot) {
        el.dataset.sorot = "true";
        el.scrollIntoView({ block: "nearest" });
      } else {
        delete el.dataset.sorot;
      }
    });
  }, [sorot, hrefs.length]);

  useEffect(() => {
    function tangani(e: KeyboardEvent) {
      if (adaPengubah(e) || menuSampingAktif()) return;

      const sasaran = e.target as HTMLElement | null;
      const diCariUtama = sasaran?.hasAttribute?.("data-cari-utama") === true;
      const diIsianLain = dalamIsian(sasaran) && !diCariUtama;

      // Panah & Enter tetap jalan saat mengetik di kolom pencarian utama,
      // supaya bisa langsung mencari lalu memilih hasilnya.
      if (diIsianLain) return;

      if (e.key === "ArrowDown") {
        if (hrefs.length === 0) return;
        e.preventDefault();
        setSorot((s) => Math.min(hrefs.length - 1, s + 1));
        return;
      }

      if (e.key === "ArrowUp") {
        if (hrefs.length === 0) return;
        e.preventDefault();
        setSorot((s) => Math.max(0, s - 1));
        return;
      }

      if (e.key === "Enter" && sorot >= 0 && hrefs[sorot]) {
        e.preventDefault();
        router.push(hrefs[sorot]);
        return;
      }

      if (e.key === "Escape" && sorot >= 0) {
        e.preventDefault();
        setSorot(-1);
        return;
      }

      // Daftar tidak punya navigasi kiri-kanan, jadi ← langsung memindahkan
      // kursor ke menu samping.
      if (e.key === "ArrowLeft" && !kursorMasihBisaKeKiri(sasaran)) {
        e.preventDefault();
        masukMenuSamping();
        return;
      }

      // Huruf tunggal hanya di luar kolom isian.
      if (dalamIsian(sasaran)) return;

      if (tambahHref && hurufTunggal(e, "n")) {
        e.preventDefault();
        router.push(tambahHref);
      }
    }

    // Fase tangkap agar daftar ini lebih dulu memutuskan nasib tombol panah.
    window.addEventListener("keydown", tangani, true);
    return () => window.removeEventListener("keydown", tangani, true);
  }, [hrefs, sorot, router, tambahHref]);

  return (
    <BarPetunjukHalaman
      petunjuk={[
        { tombol: ["↑", "↓"], aksi: "Pilih baris" },
        { tombol: ["Enter"], aksi: labelBuka },
        { tombol: ["/"], aksi: "Cari" },
        ...(tambahHref ? [{ tombol: ["N"], aksi: labelTambah }] : []),
      ]}
    />
  );
}

/** Bar petunjuk tetap di dasar layar untuk halaman daftar. */
export function BarPetunjukHalaman({
  petunjuk,
}: {
  petunjuk: Array<{ tombol: string[]; aksi: string }>;
}) {
  return (
    <div className="sticky bottom-0 z-20 mt-5 hidden items-center gap-4 border-t border-garis bg-white/95 px-4 py-2 backdrop-blur-md lg:flex">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
        {petunjuk.map((p) => (
          <span key={p.aksi} className="flex items-center gap-1.5 whitespace-nowrap">
            <Kunci tombol={p.tombol} />
            <span className="text-[11.5px] font-medium text-tinta-3">{p.aksi}</span>
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={bukaBantuan}
        className="flex shrink-0 items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-kertas-2"
      >
        <Kunci tombol={["?"]} />
        <span className="text-[11.5px] font-bold text-tinta-2">Semua pintasan</span>
      </button>
    </div>
  );
}
