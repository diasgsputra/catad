import Link from "next/link";
import { Logo, LogoMark } from "@/components/logo";
import { Ikon, type NamaIkon } from "@/components/ikon";
import { TautanTombol } from "@/components/ui";
import { HARGA_PRO_BULANAN, HARI_UJI_COBA } from "@/lib/plan";
import { rupiah } from "@/lib/format";

export default function Beranda() {
  return (
    <div className="min-h-dvh bg-kertas">
      <NavAtas />
      <Hero />
      <UntukSiapa />
      <FiturUtama />
      <SorotInsight />
      <CaraKerja />
      <Harga />
      <Tanya />
      <KakiHalaman />
    </div>
  );
}

// ── Navigasi ────────────────────────────────────────────────────────────────

function NavAtas() {
  return (
    <header className="sticky top-0 z-40 border-b border-garis/80 bg-kertas/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="rounded-lg">
          <Logo size={30} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            ["Fitur", "#fitur"],
            ["Catad Insight", "#insight"],
            ["Cara kerja", "#cara-kerja"],
            ["Harga", "#harga"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-[13.5px] font-semibold text-tinta-2 transition-colors hover:bg-kertas-2 hover:text-tinta"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <TautanTombol href="/masuk" varian="hantu" ukuran="kecil">
            Masuk
          </TautanTombol>
          <TautanTombol href="/daftar" ukuran="kecil">
            Coba gratis
          </TautanTombol>
        </div>
      </div>
    </header>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="kertas-bertitik relative overflow-hidden border-b border-garis">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-merek-muda/50 to-transparent" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-merek-garis bg-white px-3 py-1 text-[12px] font-bold text-merek-tua">
            <Ikon nama="petir" size={12} isi />
            Gratis {HARI_UJI_COBA} hari, tanpa kartu kredit
          </span>

          <h1 className="mt-5 text-[38px] leading-[1.08] font-extrabold tracking-[-0.035em] text-tinta sm:text-[52px]">
            Aplikasi kasir
            <br />
            dan pembukuan
            <br />
            <span className="relative inline-block">
              untuk usaha kecil.
              <svg
                className="absolute -bottom-1.5 left-0 w-full"
                height="10"
                viewBox="0 0 200 10"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M2 7.5c40-4 78-5.5 196-4"
                  stroke="var(--color-emas)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-[16.5px] leading-relaxed text-tinta-2">
            Catad mencatat setiap penjualan, menghitung laba, dan
            <strong className="font-bold text-tinta"> memberi tahu barang yang akan habis</strong>{" "}
            sebelum stoknya benar-benar kosong. Dibuat untuk warung, toko kelontong, kedai, dan
            usaha sejenis.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <TautanTombol href="/daftar" ukuran="besar" ikonKanan="kanan">
              Coba gratis {HARI_UJI_COBA} hari
            </TautanTombol>
            <TautanTombol href="/masuk" varian="kedua" ukuran="besar">
              Lihat toko contoh
            </TautanTombol>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-4 border-t border-garis pt-6">
            {[
              ["Waktu satu transaksi", "Di bawah 10 detik"],
              ["Laporan harian", "Tersusun otomatis"],
              ["Perangkat", "HP dan laptop"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] font-bold uppercase tracking-[0.07em] text-tinta-4">{k}</dt>
                <dd className="mt-0.5 text-[15px] font-extrabold text-tinta">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <PratinjauProduk />
      </div>
    </section>
  );
}

/** Cuplikan antarmuka asli, dirakit dari komponen yang sama dengan aplikasinya. */
function PratinjauProduk() {
  return (
    <div className="relative animasi-naik">
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-merek/10 via-transparent to-emas/10 blur-2xl" />

      {/* Kartu insight */}
      <div className="kartu overflow-hidden shadow-[var(--shadow-melayang)]">
        <div className="flex items-center gap-2 border-b border-garis bg-white px-4 py-3">
          <LogoMark size={22} />
          <span className="text-[13px] font-extrabold tracking-[-0.01em]">Catad Insight</span>
          <span className="ml-auto rounded-md bg-kertas-2 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-tinta-3">
            HARI INI
          </span>
        </div>

        <div className="divide-y divide-garis">
          <BarisInsight
            nada="bahaya"
            ikon="stok-kosong"
            judul="Gula Pasir 1kg habis"
            pesan="Biasanya terjual 4 kg per hari. Perkiraan laba yang tidak terambil Rp12.000 per hari."
          />
          <BarisInsight
            nada="waspada"
            ikon="stok"
            judul="3 barang habis dalam 3 hari"
            pesan="Paling cepat Minyak Goreng 1L: sisa 6 pcs, cukup untuk 2 hari lagi."
          />
          <BarisInsight
            nada="baik"
            ikon="naik"
            judul="Penjualan hari ini 18% di atas rata-rata"
            pesan="Masuk Rp1.240.000 dari 37 transaksi."
          />
        </div>

        <div className="flex items-center justify-between gap-3 bg-kertas px-4 py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-tinta-4">
              Daftar belanja otomatis
            </p>
            <p className="angka mt-0.5 text-[15px] font-extrabold text-tinta">
              8 barang · {rupiah(1_845_000)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-lg bg-merek px-2.5 py-1.5 text-[12px] font-bold text-white">
            Buka
            <Ikon nama="kanan" size={12} />
          </span>
        </div>
      </div>

      {/* Nota kecil yang menumpuk */}
      <div className="absolute -bottom-10 -left-6 hidden w-52 rotate-[-5deg] sm:block">
        <div className="tepi-sobek rounded-t-lg border border-garis bg-white px-4 pt-3 pb-5 shadow-[var(--shadow-naik)]">
          <p className="text-center text-[11px] font-extrabold tracking-[-0.01em]">Warung Bu Sari</p>
          <p className="text-center text-[9px] text-tinta-4">TRX-20260725-0037</p>
          <div className="garis-nota my-2" />
          {[
            ["Es Teh Manis x2", "8.000"],
            ["Gorengan x5", "10.000"],
            ["Indomie Goreng", "9.000"],
          ].map(([a, b]) => (
            <div key={a} className="baris-nota text-[10px] text-tinta-2">
              <span>{a}</span>
              <span className="isi-titik" />
              <span className="angka font-semibold">{b}</span>
            </div>
          ))}
          <div className="garis-nota my-2" />
          <div className="baris-nota text-[11px] font-extrabold">
            <span>TOTAL</span>
            <span className="isi-titik" />
            <span className="angka">Rp27.000</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BarisInsight({
  nada,
  ikon,
  judul,
  pesan,
}: {
  nada: "bahaya" | "waspada" | "baik";
  ikon: NamaIkon;
  judul: string;
  pesan: string;
}) {
  const gaya = {
    bahaya: "bg-merah-muda text-merah",
    waspada: "bg-kuning-muda text-kuning",
    baik: "bg-hijau-muda text-hijau",
  }[nada];

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${gaya}`}>
        <Ikon nama={ikon} size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[13px] leading-snug font-bold text-tinta">{judul}</p>
        <p className="mt-0.5 text-[12px] leading-snug text-tinta-3">{pesan}</p>
      </div>
    </div>
  );
}

// ── Untuk siapa ─────────────────────────────────────────────────────────────

function UntukSiapa() {
  const jenis = [
    "Warung kelontong",
    "Kedai kopi",
    "Toko sembako",
    "Laundry",
    "Kios pulsa",
    "Toko bangunan",
    "Katering",
    "Apotek kecil",
  ];

  return (
    <section className="border-b border-garis bg-white py-8">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-tinta-4">
          Cocok untuk berbagai jenis usaha kecil
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
          {jenis.map((j) => (
            <span
              key={j}
              className="rounded-full border border-garis bg-kertas px-3 py-1 text-[13px] font-semibold text-tinta-2"
            >
              {j}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Fitur utama ─────────────────────────────────────────────────────────────

function FiturUtama() {
  const fitur: Array<{ ikon: NamaIkon; judul: string; isi: string; poin: string[] }> = [
    {
      ikon: "kasir",
      judul: "Pencatatan penjualan",
      isi: "Pilih barang lalu tekan bayar. Stok berkurang, laba dihitung, dan nota tersimpan dalam satu langkah.",
      poin: ["Kembalian dihitung otomatis", "Pencarian barang lewat papan ketik", "Tunai, QRIS, transfer, dan kartu"],
    },
    {
      ikon: "grafik",
      judul: "Laporan otomatis",
      isi: "Tidak perlu merekap manual di buku atau Excel. Setiap transaksi langsung memperbarui laporan harian dan bulanan.",
      poin: ["Laba rugi per hari", "Barang yang paling laku", "Jam paling ramai"],
    },
    {
      ikon: "kotak",
      judul: "Pemantauan stok",
      isi: "Catad menghitung kecepatan penjualan setiap barang, lalu memperkirakan berapa hari lagi stoknya habis.",
      poin: ["Peringatan sebelum stok kosong", "Riwayat keluar masuk barang", "Batas minimum per barang"],
    },
    {
      ikon: "toko",
      judul: "Data yang terpisah",
      isi: "Setiap toko memiliki datanya sendiri dan tidak tercampur dengan toko lain. Akun kasir dapat ditambahkan tanpa memberi akses ke laporan laba.",
      poin: ["Data antartoko tidak bercampur", "Peran pemilik dan kasir", "Nota digital untuk pembeli"],
    },
  ];

  return (
    <section id="fitur" className="scroll-mt-20 border-b border-garis py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-merek">Fitur utama</p>
          <h2 className="mt-2 text-[30px] leading-tight font-extrabold tracking-[-0.03em] text-tinta sm:text-[36px]">
            Pekerjaan pembukuan yang berjalan dengan sendirinya
          </h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-tinta-2">
            Pencatatan, perhitungan laba, dan pemantauan stok berlangsung otomatis setiap kali
            Anda melayani pembeli.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {fitur.map((f) => (
            <div key={f.judul} className="kartu group p-6 transition-shadow hover:shadow-[var(--shadow-naik)]">
              <span className="flex size-10 items-center justify-center rounded-xl bg-merek-muda text-merek">
                <Ikon nama={f.ikon} size={20} />
              </span>
              <h3 className="mt-4 text-[17px] font-extrabold tracking-[-0.015em] text-tinta">{f.judul}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-tinta-2">{f.isi}</p>
              <ul className="mt-4 space-y-1.5 border-t border-garis pt-4">
                {f.poin.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-[13px] text-tinta-2">
                    <Ikon nama="centang" size={13} className="text-merek" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Sorotan Catad Insight ───────────────────────────────────────────────────

function SorotInsight() {
  return (
    <section id="insight" className="scroll-mt-20 border-b border-garis bg-tinta py-20 text-white">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emas">
              Fitur unggulan
            </p>
            <h2 className="mt-2 text-[30px] leading-tight font-extrabold tracking-[-0.03em] sm:text-[38px]">
              Catad Insight: laporan yang disertai saran
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-white/70">
              Laporan biasa hanya menampilkan angka, dan pemilik toko sendiri yang harus
              menyimpulkannya. Catad Insight membandingkan kecepatan penjualan dengan sisa stok,
              lalu menyampaikan apa yang sebaiknya dikerjakan hari itu.
            </p>

            <ul className="mt-8 space-y-5">
              {[
                {
                  judul: "Perkiraan barang habis",
                  isi: "Misalnya, minyak goreng diperkirakan cukup untuk dua hari lagi. Angkanya dihitung dari penjualan 14 hari terakhir, bukan dari batas minimum yang ditetapkan manual.",
                },
                {
                  judul: "Daftar belanja otomatis",
                  isi: "Catad menyusun daftar barang yang perlu dibeli, jumlahnya, dan perkiraan modal yang dibutuhkan.",
                },
                {
                  judul: "Barang yang tidak bergerak",
                  isi: "Barang yang tidak terjual selama 14 hari ditandai, beserta nilai modal yang tertahan di dalamnya.",
                },
                {
                  judul: "Ringkasan harian",
                  isi: "Penjelasan singkat mengenai penjualan yang naik atau turun beserta penyebabnya, bukan sekadar tabel angka.",
                },
              ].map((x) => (
                <li key={x.judul} className="flex gap-3.5">
                  <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md bg-emas/15 text-emas">
                    <Ikon nama="centang" size={13} />
                  </span>
                  <div>
                    <p className="text-[15px] font-bold">{x.judul}</p>
                    <p className="mt-0.5 text-[13.5px] leading-relaxed text-white/60">{x.isi}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/50">
                Contoh daftar belanja
              </p>
              <span className="rounded-md bg-emas/15 px-2 py-0.5 text-[10px] font-bold text-emas">
                14 HARI KE DEPAN
              </span>
            </div>

            <div className="mt-4 space-y-px overflow-hidden rounded-xl">
              {[
                ["Gula Pasir 1kg", "Habis, terjual 4/hari", "60 pcs", 780_000, "bahaya"],
                ["Minyak Goreng 1L", "Cukup untuk 2 hari", "40 pcs", 620_000, "waspada"],
                ["Beras Pandan 5kg", "Cukup untuk 5 hari", "12 sak", 780_000, "waspada"],
                ["Telur Ayam", "Cukup untuk 6 hari", "8 kg", 224_000, "waspada"],
              ].map(([nama, alasan, qty, harga, nada]) => (
                <div
                  key={nama as string}
                  className="flex items-center gap-3 bg-white/[0.03] px-3.5 py-3"
                >
                  <span
                    className={`size-2 shrink-0 rounded-full ${
                      nada === "bahaya" ? "bg-merah-garis" : "bg-emas"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold">{nama as string}</p>
                    <p className="text-[11.5px] text-white/45">{alasan as string}</p>
                  </div>
                  <div className="text-right">
                    <p className="angka text-[13px] font-bold">{qty as string}</p>
                    <p className="angka text-[11.5px] text-white/45">
                      {rupiah(harga as number, { ringkas: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-[13px] text-white/60">Perkiraan modal belanja</span>
              <span className="angka text-[18px] font-extrabold text-emas">{rupiah(2_404_000)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Cara kerja ──────────────────────────────────────────────────────────────

function CaraKerja() {
  const langkah = [
    {
      judul: "Daftarkan toko",
      isi: "Isi nama toko dan alamat email. Tidak diperlukan kartu kredit maupun pemasangan aplikasi.",
    },
    {
      judul: "Masukkan daftar barang",
      isi: "Cukup nama, harga jual, dan harga modal. Harga modal digunakan untuk menghitung laba.",
    },
    {
      judul: "Gunakan saat melayani pembeli",
      isi: "Buka Catad di kasir. Laporan, stok, dan saran pembelian akan diperbarui dengan sendirinya.",
    },
  ];

  return (
    <section id="cara-kerja" className="scroll-mt-20 border-b border-garis py-20">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="text-center text-[30px] leading-tight font-extrabold tracking-[-0.03em] text-tinta sm:text-[36px]">
          Tiga langkah untuk mulai menggunakan
        </h2>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {langkah.map((l, i) => (
            <li key={l.judul} className="relative">
              <div className="flex items-center gap-3">
                <span className="angka flex size-9 items-center justify-center rounded-xl bg-tinta text-[15px] font-extrabold text-white">
                  {i + 1}
                </span>
                {i < langkah.length - 1 && (
                  <span className="hidden h-px flex-1 bg-[repeating-linear-gradient(to_right,var(--color-garis-2)_0_6px,transparent_6px_12px)] md:block" />
                )}
              </div>
              <h3 className="mt-4 text-[17px] font-extrabold tracking-[-0.015em] text-tinta">{l.judul}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-tinta-2">{l.isi}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── Harga ───────────────────────────────────────────────────────────────────

function Harga() {
  return (
    <section id="harga" className="scroll-mt-20 border-b border-garis bg-white py-20">
      <div className="mx-auto max-w-5xl px-5">
        <div className="text-center">
          <h2 className="text-[30px] leading-tight font-extrabold tracking-[-0.03em] text-tinta sm:text-[36px]">
            Pilihan paket dan harga
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15.5px] leading-relaxed text-tinta-2">
            Paket Gratis dapat digunakan selamanya. Setiap akun baru mendapat masa coba fitur Pro
            selama {HARI_UJI_COBA} hari.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-3xl gap-5 md:grid-cols-2">
          <div className="kartu flex flex-col p-6">
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-tinta-3">Gratis</p>
            <p className="mt-3 text-[34px] leading-none font-extrabold tracking-[-0.03em] text-tinta">
              Rp0
            </p>
            <p className="mt-1.5 text-[13px] text-tinta-3">Selamanya, untuk satu orang</p>

            <ul className="mt-6 flex-1 space-y-2.5 border-t border-garis pt-5">
              {[
                "Kasir tanpa batas transaksi",
                "Sampai 50 barang",
                "Laporan 30 hari terakhir",
                "Peringatan stok minimum",
                "Nota digital untuk pembeli",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2 text-[14px] text-tinta-2">
                  <Ikon nama="centang" size={14} className="mt-0.5 text-merek" />
                  {x}
                </li>
              ))}
            </ul>

            <TautanTombol href="/daftar" varian="kedua" ukuran="besar" penuh className="mt-6">
              Daftar gratis
            </TautanTombol>
          </div>

          <div className="relative flex flex-col rounded-xl border-2 border-merek bg-white p-6 shadow-[var(--shadow-naik)]">
            <span className="absolute -top-3 left-6 rounded-full bg-merek px-2.5 py-1 text-[10.5px] font-bold tracking-[0.06em] text-white uppercase">
              Paling banyak dipilih
            </span>

            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-merek">Pro</p>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="angka text-[34px] leading-none font-extrabold tracking-[-0.03em] text-tinta">
                {rupiah(HARGA_PRO_BULANAN)}
              </span>
              <span className="text-[14px] font-semibold text-tinta-3">/bulan</span>
            </p>
            <p className="mt-1.5 text-[13px] text-tinta-3">Per toko · bisa berhenti kapan saja</p>

            <ul className="mt-6 flex-1 space-y-2.5 border-t border-garis pt-5">
              {[
                "Semua yang ada di paket Gratis",
                "Catad Insight lengkap",
                "Daftar belanja otomatis",
                "Barang & laporan tanpa batas",
                "Sampai 10 akun kasir",
                "Unduh laporan (CSV)",
              ].map((x, i) => (
                <li key={x} className="flex items-start gap-2 text-[14px] text-tinta-2">
                  <Ikon nama="centang" size={14} className="mt-0.5 text-merek" />
                  <span className={i === 1 || i === 2 ? "font-semibold text-tinta" : undefined}>{x}</span>
                </li>
              ))}
            </ul>

            <TautanTombol href="/daftar" ukuran="besar" penuh className="mt-6">
              Coba Pro {HARI_UJI_COBA} hari
            </TautanTombol>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Tanya jawab ─────────────────────────────────────────────────────────────

function Tanya() {
  const tanya = [
    {
      t: "Apakah data toko saya bisa dilihat toko lain?",
      j: "Tidak. Setiap toko memiliki datanya sendiri, dan setiap permintaan data selalu disaring berdasarkan toko yang sedang masuk. Akun dari toko lain tidak memiliki jalur untuk membaca data toko Anda.",
    },
    {
      t: "Jika masa coba berakhir, apakah data saya hilang?",
      j: "Tidak. Akun akan turun ke paket Gratis dan seluruh data tetap utuh. Yang tidak bisa diakses hanya fitur Pro seperti Catad Insight, sampai Anda berlangganan.",
    },
    {
      t: "Apakah perlu memasang aplikasi di HP?",
      j: "Tidak perlu. Catad berjalan di peramban, sehingga dapat dibuka dari HP, tablet, maupun laptop. Tampilan kasirnya sudah disesuaikan untuk layar kecil.",
    },
    {
      t: "Bagaimana jika saya memiliki lebih dari satu toko?",
      j: "Buat satu akun untuk setiap toko. Datanya terpisah sepenuhnya, termasuk daftar barang, laporan, dan akun kasirnya.",
    },
    {
      t: "Apakah harga modal wajib diisi?",
      j: "Tidak wajib, tetapi sangat disarankan. Tanpa harga modal, Catad hanya dapat menghitung omzet dan bukan laba, serta daftar belanja tidak dapat memperkirakan biaya pembelian barang.",
    },
  ];

  return (
    <section className="border-b border-garis py-20">
      <div className="mx-auto max-w-3xl px-5">
        <h2 className="text-[30px] leading-tight font-extrabold tracking-[-0.03em] text-tinta sm:text-[34px]">
          Pertanyaan yang sering diajukan
        </h2>

        <div className="mt-8 divide-y divide-garis border-y border-garis">
          {tanya.map((x) => (
            <details key={x.t} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold text-tinta marker:hidden">
                {x.t}
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-kertas-2 text-tinta-3 transition-transform group-open:rotate-180">
                  <Ikon nama="bawah" size={14} />
                </span>
              </summary>
              <p className="mt-2.5 pr-10 text-[14px] leading-relaxed text-tinta-2">{x.j}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-merek-garis bg-merek-muda px-6 py-10 text-center">
          <LogoMark size={44} />
          <h3 className="text-[22px] font-extrabold tracking-[-0.025em] text-merek-tua">
            Mulai gratis selama {HARI_UJI_COBA} hari
          </h3>
          <p className="max-w-md text-[14.5px] leading-relaxed text-merek-tua/80">
            Pembuatan akun hanya membutuhkan satu menit. Laporan pertama Anda akan tersedia pada
            hari yang sama.
          </p>
          <TautanTombol href="/daftar" ukuran="besar" ikonKanan="kanan" className="mt-1">
            Daftarkan toko
          </TautanTombol>
        </div>
      </div>
    </section>
  );
}

// ── Kaki halaman ────────────────────────────────────────────────────────────

function KakiHalaman() {
  return (
    <footer className="py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <LogoMark size={26} />
          <div>
            <p className="text-[13.5px] font-extrabold tracking-[-0.02em] text-tinta">Catad</p>
            <p className="text-[11px] text-tinta-4">Catatan Digital untuk UMKM Indonesia</p>
          </div>
        </div>

        <div className="flex items-center gap-5 text-[13px] text-tinta-3">
          <a href="#fitur" className="hover:text-tinta">Fitur</a>
          <a href="#harga" className="hover:text-tinta">Harga</a>
          <Link href="/masuk" className="hover:text-tinta">Masuk</Link>
        </div>
      </div>
    </footer>
  );
}
