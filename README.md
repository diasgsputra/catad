# Catad — Catatan Digital

Aplikasi kasir dan pembukuan berbasis langganan untuk UMKM Indonesia: warung
kelontong, kedai kopi, toko sembako, laundry, dan usaha kecil sejenisnya.

Setiap penjualan langsung tercatat, laporan laba tersusun sendiri, dan barang
yang mau habis diingatkan **sebelum** benar-benar kehabisan.

---

## Yang membedakan Catad: **Catad Insight**

Aplikasi kasir lain berhenti di angka — pemilik toko sendiri yang harus
menyimpulkan. Catad membaca kecepatan jual tiap barang, membandingkannya
dengan stok yang ada, lalu memberi tahu apa yang perlu dikerjakan hari ini.

| Bagian | Isinya |
| --- | --- |
| **Prediksi stok habis** | “Minyak goreng cukup 2 hari lagi” — dari total terjual 14 hari dibagi 14, bukan sekadar batas minimum statis. Disertai tingkat keandalan (tinggi/sedang/rendah) berdasarkan berapa hari barang itu benar-benar laku. |
| **Daftar belanja otomatis** | Apa yang harus dikulakan, berapa banyak (cukup 14 hari + 3 hari cadangan), dan berapa perkiraan modalnya. Bisa dicentang sambil belanja, disalin sebagai teks, atau dicetak. |
| **Modal yang mandek** | Barang yang tidak terjual sama sekali dalam 14 hari, lengkap dengan nilai modal yang tertahan di rak. |
| **Ringkasan bahasa manusia** | Kalimat, bukan tabel: apa yang naik, apa yang turun, jam paling ramai, margin yang menipis, arus kas yang melebihi pendapatan. |

Seluruh kesimpulan dirakit dari aturan tetap di [`src/lib/insight.ts`](src/lib/insight.ts)
— bukan model bahasa. Hasilnya konsisten, instan, dan setiap angkanya bisa
ditelusuri asalnya.

---

## Menjalankan

Butuh Docker. Port yang dipakai: **1061** (aplikasi) dan **1062** (PostgreSQL).

```bash
docker compose up -d --build
```

Buka <http://localhost:1061>. Migrasi dan data demo dijalankan otomatis oleh
service `migrasi` sebelum aplikasi hidup.

### Akun demo

| Akun | Masuk | Untuk melihat |
| --- | --- | --- |
| Pemilik, paket Pro | `demo@catad.id` / `catad123` | Warung Bu Sari — 21 hari transaksi, Catad Insight aktif |
| Kasir | `andi@catad.id` / `kasir123` | Tampilan terbatas: kasir & barang saja, tanpa laporan laba |
| Pemilik, paket Gratis | `budi@tendabiru.id` / `rahasia123` | Toko kedua — Catad Insight dalam keadaan terkunci |

Dua toko demo itu sekaligus membuktikan pemisahan data antar tenant.

### Deploy otomatis (GitHub Actions)

Setiap push atau merge ke `master` menjalankan
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml): diuji dulu,
baru dikirim ke server.

1. **Uji** — pasang dependensi, generate Prisma Client, periksa tipe, jalankan
   uji unit. Kalau tahap ini merah, deploy tidak dijalankan sama sekali.
2. **Deploy** — masuk lewat SSH, salin berkas proyek dengan `rsync`, lalu
   jalankan [`scripts/deploy-remote.sh`](scripts/deploy-remote.sh) yang
   membangun ulang image dan menyalakan `docker compose`.

Secret yang dibutuhkan di repositori: `SSH_HOST`, `SSH_PORT`, `SSH_USER`, dan
`SSH_PRIVATE_KEY`. Direktori tujuan bawaannya `/home/ubuntu/projects/catad`
dan bisa diubah lewat variabel repositori `DEPLOY_PATH`.

Port mengikuti rentang alokasi Catad **1061–1070**: aplikasi di `PORT_APP`
(1061) dan Postgres di `PORT_DB` (1062). Keduanya dibaca dari `.env`, jadi
bisa digeser tanpa menyunting `docker-compose.yml`.

Server perlu punya `docker` (dengan plugin `docker compose`, bukan
`docker-compose` gaya lama), `rsync`, dan `curl`. Ketiganya diperiksa dulu di
awal deploy supaya galatnya jelas kalau ada yang kurang.

**Berkas `.env` di server dibuat sekali saja**, pada deploy pertama, dengan
sandi basis data dan `JWT_SECRET` yang diacak. Deploy berikutnya tidak pernah
menimpanya — kalau sandi basis data berubah, volume Postgres yang sudah berisi
data akan menolak koneksi. Berkas itu juga dikecualikan dari `rsync --delete`,
jadi aman disunting langsung di server. Isian bawaannya `SEED_DEMO=false`
supaya akun demo berkata sandi umum tidak ikut terpasang di server.

Kalau direktori proyek dipindah, skrip deploy membawa `.env` dari lokasi lama.
Bila `.env` tidak ketemu padahal volume basis datanya sudah ada, deploy
sengaja berhenti dan menjelaskan pilihannya — lebih baik gagal terang-terangan
daripada membuat sandi baru yang mengunci data lama.

Deploy tidak pernah berjalan dua kali bersamaan; kalau ada push beruntun,
yang berikutnya mengantre sampai yang sebelumnya selesai.

### Pengembangan tanpa Docker

```bash
docker compose up -d db     # cukup basis datanya
npm install
npx prisma migrate deploy
node prisma/seed.mjs
npm run dev
```

---

## Sepenuhnya bisa dijalankan tanpa mouse

Kasir warung sering satu tangan memegang barang, satu tangan di papan ketik.
Karena itu seluruh Catad bisa dioperasikan hanya dengan tombol sederhana:
huruf, angka, panah, Enter, Esc, dan tombol F.

Tidak ada yang perlu dihafal. Bar petunjuk di dasar layar selalu menampilkan
tombol yang relevan dengan keadaan saat itu, dan <kbd>?</kbd> membuka daftar
lengkapnya di halaman mana pun.

> **Tanpa tombol F.** Catad sengaja tidak memakai <kbd>F1</kbd>–<kbd>F12</kbd>.
> Di banyak laptop tombol itu baru aktif setelah menekan <kbd>Fn</kbd>, jadi
> yang seharusnya satu tombol justru terasa dua. Semua perintah memakai
> <kbd>Alt</kbd> + satu huruf, atau tombol tunggal yang ada di setiap papan
> ketik.

### Di mana saja

| Tombol | Fungsi |
| --- | --- |
| <kbd>?</kbd> | Buka daftar pintasan |
| <kbd>←</kbd> | Masuk ke menu samping (ditekan saat sudah mentok kiri) |
| <kbd>Alt</kbd> + <kbd>1</kbd>–<kbd>9</kbd> | Pindah halaman sesuai urutan menu kiri (nomornya tampil di menu) |
| <kbd>/</kbd> | Lompat ke kolom pencarian halaman |
| <kbd>Alt</kbd> + <kbd>K</kbd> | Saring kategori |
| <kbd>Esc</kbd> | Tutup dialog atau batalkan |

### Menu samping

Menu kiri adalah "zona" tersendiri, jadi berpindah halaman tidak perlu
menghafal nomor. Tekan <kbd>←</kbd> saat sorotan sudah mentok di tepi kiri
halaman — di kasir berarti barang di kolom paling kiri, di halaman daftar
berarti langsung.

| Tombol | Fungsi |
| --- | --- |
| <kbd>↑</kbd> <kbd>↓</kbd> | Pilih menu |
| <kbd>Enter</kbd> | Buka halaman yang dipilih |
| <kbd>→</kbd> atau <kbd>Esc</kbd> | Kembali ke isi halaman |

Saat zona ini aktif, tepi menu berubah warna dan muncul penanda **MENU** di
atas, jadi selalu jelas kursor sedang di mana.

### Kasir

Kolom pencarian selalu aktif supaya pemindai barcode langsung terbaca. Panah,
Tab, dan Enter tetap bekerja walau sedang mengetik. <kbd>Alt</kbd> juga aman
ditekan sambil mengetik karena tidak menghasilkan karakter apa pun.

| Tombol | Fungsi |
| --- | --- |
| ketik | Cari barang (nama atau kode) |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> | Pindah sorotan barang |
| <kbd>Enter</kbd> | Masukkan barang tersorot ke keranjang |
| <kbd>Tab</kbd> | Pindah antara daftar barang dan keranjang |
| <kbd>Alt</kbd> + <kbd>B</kbd> | Bayar |
| <kbd>Alt</kbd> + <kbd>K</kbd> | Ganti saringan kategori |
| <kbd>Alt</kbd> + <kbd>X</kbd> | Kosongkan keranjang |
| <kbd>←</kbd> di kolom paling kiri | Masuk ke menu samping |
| <kbd>Esc</kbd> | Hapus kata pencarian / kembali ke daftar barang |

Saat berada di keranjang: <kbd>↑</kbd> <kbd>↓</kbd> memilih baris,
<kbd>→</kbd> <kbd>←</kbd> menambah/mengurangi jumlah, <kbd>Del</kbd> menghapus
baris, dan <kbd>Enter</kbd> lanjut membayar.

Jadi satu penjualan penuh cukup begini: **ketik → <kbd>Enter</kbd> → …
→ <kbd>Tab</kbd> → <kbd>Enter</kbd> → <kbd>P</kbd> → <kbd>Enter</kbd>**.

### Dialog pembayaran

Kolom uang hanya menerima angka, jadi huruf bisa dipakai sebagai pintasan.

| Tombol | Fungsi |
| --- | --- |
| angka | Isi uang yang diterima |
| <kbd>P</kbd> | Uang pas |
| <kbd>T</kbd> <kbd>Q</kbd> <kbd>R</kbd> <kbd>K</kbd> | Tunai / QRIS / Transfer / Kartu |
| <kbd>↑</kbd> <kbd>↓</kbd> | Pilih saran pecahan uang |
| <kbd>Enter</kbd> | Selesaikan transaksi |

Setelah tersimpan: <kbd>Enter</kbd> mulai transaksi baru, <kbd>N</kbd> buka
nota, <kbd>W</kbd> kirim WhatsApp, <kbd>S</kbd> salin tautan.

### Tabel & daftar

<kbd>↑</kbd> <kbd>↓</kbd> memilih baris, <kbd>Enter</kbd> membuka,
<kbd>Del</kbd> menghapus, <kbd>N</kbd> menambah data baru,
<kbd>Alt</kbd> + <kbd>K</kbd> melompat ke saringan kategori, dan <kbd>←</kbd>
masuk ke menu samping.

---

## Fitur

**Kasir** — pencarian cepat, saringan kategori, keranjang dengan pengatur
jumlah, empat metode bayar, hitung kembalian otomatis dengan saran pecahan
uang, dan keranjang yang tersimpan di perangkat supaya tidak hilang saat
halaman tertutup. Seluruhnya bisa dijalankan tanpa mouse (lihat tabel di atas).

**Barang & stok** — kategori, harga modal (HPP), satuan, batas stok minimum,
barang tanpa pelacakan stok untuk jasa, penyesuaian stok (masuk/keluar/hitung
ulang), dan riwayat mutasi lengkap. Barang yang pernah terjual diarsipkan,
bukan dihapus, agar laporan lama tetap benar.

**Laporan otomatis** — pendapatan, laba kotor, pengeluaran, laba bersih,
grafik harian dua warna, barang paling laku, komposisi metode bayar, rata-rata
per hari dalam seminggu, dan unduhan CSV.

**Pengeluaran** — biaya operasional dicatat terpisah agar laba bersih jujur.
Halamannya mengingatkan agar kulakan tidak dicatat dua kali, karena modal
barang sudah terhitung lewat harga modal di tiap penjualan.

**Nota digital** — setiap transaksi punya tautan publik singkat
(`/nota/KODE`) yang bisa dikirim lewat WhatsApp atau dicetak. Halaman itu
hanya memuat apa yang memang tercetak di struk; harga modal dan laba tidak
pernah ikut terkirim.

**Multi-tenant** — satu toko = satu ruang data. Setiap kueri disaring dengan
`tokoId` dari sesi, dan id yang datang dari peramban tidak pernah dipercaya
begitu saja.

**Peran** — pemilik melihat semuanya; kasir hanya kasir, transaksi, barang,
dan stok. Angka laba dan modal tidak pernah dikirim ke halaman kasir.

**Langganan** — Gratis (50 barang, riwayat 30 hari, 1 akun) dan Pro
(Rp49.000/bulan, tanpa batas, 10 akun, Catad Insight, ekspor CSV). Semua akun
baru otomatis mencoba Pro selama 7 hari.

Batas jumlah akun ditegakkan saat masuk, bukan hanya saat akun ditambahkan.
Toko yang membuat beberapa akun kasir selama masa uji coba akan melihat akun
berlebihnya berstatus **Terkunci** begitu uji coba habis — datanya tetap
tersimpan, hanya tidak bisa dipakai masuk sampai berlangganan atau akunnya
dihapus. Pemilik toko selalu lolos kuota supaya tetap bisa mengurus langganan.

### Pembayaran langganan

Pembayaran lewat transfer bank, dikonfirmasi lewat WhatsApp. Halaman
`/app/pengaturan/langganan` menampilkan nomor rekening dan nomor WhatsApp
beserta tombol salin, dan mencatat pengajuan sebagai langganan berstatus
`MENUNGGU`.

Nomor rekening dan nomor WhatsApp disimpan di basis data
(`PengaturanLayanan`), bukan dipatok di dalam kode, dan diubah lewat panel
operator. Kalau salah satunya belum lengkap, halaman langganan mengakui bahwa
pembayaran sedang belum bisa dilayani — menampilkan rekening kosong lebih buruk
daripada berterus terang.

Pengaktifan dilakukan operator setelah dana masuk, lewat panel atau baris
perintah:

```bash
npm run pro                          # lihat pengajuan yang menunggu
npm run pro -- <slug|email>          # aktifkan 1 bulan
npm run pro -- <slug|email> tahunan  # aktifkan 1 tahun
```

> Pengaktifan tidak pernah tersedia bagi pengguna aplikasi. Server action adalah
> endpoint yang bisa dipanggil siapa pun yang punya sesi, jadi tombol
> "aktifkan Pro" di sisi pengguna sama artinya dengan membagikan paket Pro
> gratis kepada siapa pun yang mau memanggilnya langsung.

---

## Laporan pajak

`/app/pajak` — menyusun **Rekapitulasi Peredaran Bruto dan PPh Final** setahun
penuh dari catatan penjualan yang sudah ada, lalu mengunduhnya sebagai PDF.
Fitur paket Pro, khusus pemilik.

Bentuknya mengikuti yang memang diminta DJP sebagai lampiran SPT Tahunan bagi
wajib pajak UMKM skema final: rekap peredaran bruto **per bulan** beserta PPh
terutang masing-masing. Wajib pajak skema ini tidak diwajibkan menyelenggarakan
pembukuan penuh — cukup pencatatan, dan pencatatan itulah yang sudah dikerjakan
Catad setiap hari.

### Aturan yang dipakai

- Tarif **0,5% dari peredaran bruto** (PP 23/2018 → PP 55/2022 → **PP 20/2026**,
  yang menghapus batas waktu bagi Orang Pribadi dan Perseroan Perorangan).
- **Rp500 juta pertama bebas PPh** untuk Wajib Pajak Orang Pribadi, kumulatif
  setahun. Badan tidak mendapat fasilitas ini.
- Batas skema final **Rp4,8 miliar setahun**; di atas itu laporan memberi
  peringatan keras dan menyuruh menghubungi konsultan pajak.
- Setor paling lambat **tanggal 15** bulan berikutnya (PMK 81/2024 Pasal 94).

### Dua keputusan perhitungan yang mudah salah

**Peredaran bruto bukan `total`, melainkan `subtotal − diskon`.** Kolom `pajak`
memuat PB1/PBJT yang dipungut dari pembeli untuk disetor ke pemerintah daerah.
Uang itu bukan penghasilan toko; memasukkannya membuat pajak terutang lebih
besar daripada seharusnya.

**Transaksi berstatus DIBATALKAN tidak ikut.** Transaksi yang dibatalkan tidak
pernah menjadi penghasilan.

### PDF ditulis sendiri, tanpa pustaka

`src/lib/pdf.ts` menulis format PDF langsung. Dokumen yang diperlukan hanya
berisi teks, garis, dan kotak, sehingga tidak sebanding dengan menyeret pustaka
PDF beserta binariknya ke dalam image Alpine. Dua hal yang membuatnya tetap
kecil: hanya memakai font bawaan PDF (tidak perlu disematkan), dan semua angka
memakai Courier yang lebarnya tetap sehingga kolom rupiah bisa dirata-kanankan
dengan aritmetika sederhana, tanpa tabel metrik font.

Contoh dokumen bisa dibuat tanpa basis data:

```bash
npx tsx scripts/contoh-laporan-pajak.ts contoh.pdf
```

> Dokumennya **kertas kerja**, bukan formulir SPT dan bukan nasihat perpajakan.
> Ia menyiapkan angka yang perlu disalin ke SPT, bukan menggantikannya. Kalimat
> itu ikut tercetak di dalam PDF, bukan hanya tampil di layar.

---

## Panel operator

`/admin` — untuk pengelola layanan Catad, bukan pemilik toko. Isinya: ringkasan
pelanggan, pengajuan yang menunggu konfirmasi, daftar toko dengan saringan dan
pencarian, detail tiap toko beserta tindakan (konfirmasi pembayaran,
perpanjang, beri masa tenggang, hentikan, blokir), laporan keuangan langganan,
pengaturan tujuan pembayaran, dan jejak audit.

### Akun operator

Hanya dibuat dari baris perintah. Tidak ada pendaftaran mandiri — panel ini
bisa melihat seluruh toko, jadi satu-satunya jalan masuk adalah akses ke
server.

```bash
npm run operator                                  # daftar akun
npm run operator -- buat <email> "<nama>"         # buat, sandi diacak
npm run operator -- sandi <email>                 # ganti sandi
npm run operator -- matikan <email>               # nonaktifkan
npm run operator -- buka <email>                  # lepas kunci gagal masuk
```

Di server, jalankan lewat image `migrasi` — container `app` memakai output
standalone Next.js yang tidak memuat tsx maupun Prisma CLI:

```bash
docker compose run --rm --no-deps migrasi npx tsx scripts/operator.ts
```

### Pemisahan dari sesi toko

Sesi operator terpisah total dari sesi toko, dengan tiga lapis pembeda: nama
cookie berbeda, klaim `iss`/`aud` berbeda (ikut ditandatangani, jadi tidak bisa
diubah tanpa rahasia), dan kunci tanda tangan yang diturunkan dari `JWT_SECRET`
dengan pemisah domain. Token toko yang sah tidak akan pernah diterima di panel,
dan sebaliknya — keduanya diuji dari dua arah di `src/tests/auth-admin.test.ts`
dan di uji asap.

Cookie operator memakai `sameSite=strict` dan berumur 8 jam, bukan 30 hari
seperti sesi toko: satu sesi operator yang bocor membuka semua toko sekaligus.
Akun operator dikunci 15 menit setelah 5 percobaan gagal.

### Pendapatan dihitung dari `dibayarPada`, bukan status

Baris `Langganan` punya kolom `dibayarPada` yang hanya terisi saat operator
mengonfirmasi uang masuk. Laporan keuangan menjumlahkan kolom itu, bukan
menyaring `status`.

Alasannya: status berubah sepanjang umur baris. Langganan yang sudah dibayar
akan menjadi `KEDALUWARSA` atau `DIBATALKAN` nanti. Kalau pendapatan dihitung
dari status, uang yang sudah diterima akan lenyap dari laporan begitu masa
berlakunya habis. Efek sampingnya juga tepat: langganan lama yang dulu
diaktifkan tanpa pembayaran dan masa tenggang yang diberikan gratis bernilai
null di kolom ini, jadi tidak pernah terhitung sebagai pendapatan.

### Blokir toko

Blokir menutup akses seluruh akun toko, termasuk pemiliknya, dan diperiksa di
dua tempat: saat masuk dan pada setiap halaman `/app`. Pemeriksaan kedua yang
membuat sesi yang sedang berjalan langsung berhenti — tanpa itu, transaksi
masih bisa masuk sampai tokennya kedaluwarsa. Data toko tidak pernah dihapus.

Alasan blokir yang ditulis operator tidak ditampilkan ke pemilik toko: catatan
itu untuk keperluan internal.

---

## Susunan teknis

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Prisma + PostgreSQL 16 ·
autentikasi JWT di cookie `httpOnly` (jose + bcryptjs) · Docker multi-stage.

Tanpa pustaka grafik, tanpa pustaka ikon, tanpa pustaka komponen: grafik dan
ikon digambar sendiri sebagai SVG. Halaman laporan tidak mengirim JavaScript
grafik apa pun ke peramban.

```
prisma/schema.prisma      10 model, semuanya terikat ke Toko (tenant)
prisma/seed.mjs           data demo dua toko
src/lib/insight.ts        mesin Catad Insight (fungsi murni, teruji)
src/lib/insight-data.ts   jembatan basis data → mesin insight
src/lib/laporan.ts        agregasi laporan
src/lib/format.ts         rupiah & tanggal WIB
src/lib/plan.ts           batas paket & masa uji coba
src/lib/sesi.ts           sesi + konteks toko + penjaga peran
src/actions/              server action (kasir, produk, pengeluaran, toko, auth)
src/app/                  halaman
src/components/           komponen bersama (ui, ikon, grafik, kerangka)
src/tests/                110 uji unit
scripts/smoke.mjs         74 uji asap terhadap aplikasi yang sedang berjalan
```

### Keputusan yang perlu diketahui

- **Uang disimpan sebagai bilangan bulat rupiah.** Tidak ada desimal, jadi
  tidak ada galat pembulatan floating point pada laba.
- **Harga modal disalin ke setiap baris nota.** Mengubah harga modal barang
  hari ini tidak akan mengubah laba yang sudah tercatat kemarin.
- **Zona waktu WIB dihitung dengan offset tetap (+7).** Batas hari selalu
  pukul 00.00 WIB, tidak tergantung zona waktu server.
- **Checkout berjalan dalam satu transaksi basis data.** Stok, mutasi, dan
  nota tidak pernah setengah jadi; stok diperiksa sebelum apa pun ditulis.
- **Semua ekspor dari berkas `"use server"` harus fungsi async.** Konstanta
  biasa berubah menjadi referensi aksi saat build — itu sebabnya daftar
  kategori pengeluaran ditaruh di `src/lib/kategori-pengeluaran.ts`.

---

## Pengujian

```bash
npm test          # 110 uji unit (vitest)
npm run lint      # tsc --noEmit
npm run smoke     # 74 uji terhadap aplikasi yang sedang berjalan
```

Uji unit menyasar bagian yang paling mudah salah diam-diam: batas hari WIB,
pembulatan rupiah, prediksi stok, penyusunan daftar belanja, agregasi laporan,
dan aturan masa uji coba.

Uji asap memeriksa tiga hal terhadap aplikasi yang benar-benar berjalan:

- **Permukaan HTTP** — halaman publik, semua rute `/app` menolak tamu, dan
  nota digital tidak membocorkan modal maupun laba.
- **Keutuhan data** — tidak ada relasi yang menyeberang antar toko, dan setiap
  nota memenuhi `total = subtotal − diskon + pajak`,
  `laba = subtotal − diskon − modal`, serta rantai mutasi stok yang utuh.
- **Hak akses** — kasir ditolak di halaman laba, paket Gratis ditolak di
  Catad Insight dan unduhan CSV, transaksi toko lain menghasilkan 404, dan
  token sesi palsu ditolak.

`npm run smoke` membaca `JWT_SECRET` dari lingkungan untuk membuat sesi uji:

```bash
set -a && . ./.env && set +a && npm run smoke
```

---

## Catatan pemasangan

- Volume basis data bernama `catad-claude-pgdata`.
- Ganti `JWT_SECRET` di `.env` sebelum dipakai sungguhan, dan setel
  `COOKIE_SECURE=true` bila diakses lewat HTTPS.
- Setel `SEED_DEMO=false` untuk memasang tanpa data demo.
