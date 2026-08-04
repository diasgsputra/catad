/**
 * Uji asap (smoke test) Catad.
 *
 * Dua bagian:
 *   A. Permukaan HTTP  — halaman publik, penjagaan sesi, nota digital.
 *   B. Keutuhan data    — isolasi antar tenant dan kebenaran hitungan uang/stok
 *                         langsung di basis data.
 *
 * Jalankan setelah aplikasi hidup:
 *   node scripts/smoke.mjs                 (bawaan http://localhost:1061)
 *   BASIS=http://localhost:1061 node scripts/smoke.mjs
 */

import { PrismaClient } from "@prisma/client";

const BASIS = process.env.BASIS ?? "http://localhost:1061";
const db = new PrismaClient();

let lulus = 0;
let gagal = 0;
const kegagalan = [];

function periksa(nama, kondisi, rincian = "") {
  if (kondisi) {
    lulus += 1;
    console.log(`  [32mOK[0m   ${nama}`);
  } else {
    gagal += 1;
    kegagalan.push(`${nama}${rincian ? ` — ${rincian}` : ""}`);
    console.log(`  [31mGAGAL[0m ${nama}${rincian ? ` — ${rincian}` : ""}`);
  }
}

function bagian(judul) {
  console.log(`\n[1m${judul}[0m`);
}

async function ambil(jalur, opsi = {}) {
  return fetch(`${BASIS}${jalur}`, { redirect: "manual", ...opsi });
}

// ── A. Permukaan HTTP ───────────────────────────────────────────────────────

async function ujiHttp() {
  bagian("A. Permukaan HTTP");

  // 1. Health check
  const sehat = await ambil("/api/health");
  const isiSehat = await sehat.json().catch(() => ({}));
  periksa("GET /api/health mengembalikan 200", sehat.status === 200, `status ${sehat.status}`);
  periksa("basis data terhubung", isiSehat.basisData === "terhubung", JSON.stringify(isiSehat));

  // 2. Halaman depan
  const depan = await ambil("/");
  const htmlDepan = await depan.text();
  periksa("GET / mengembalikan 200", depan.status === 200, `status ${depan.status}`);
  periksa("halaman depan menyebut nama produk", htmlDepan.includes("Catad"));
  periksa("halaman depan menampilkan harga Pro", htmlDepan.includes("49.000"));
  periksa(
    "halaman depan menjelaskan pembeda Catad Insight",
    htmlDepan.includes("Catad Insight"),
  );

  // 3. Penjagaan area aplikasi
  for (const jalur of [
    "/app",
    "/app/kasir",
    "/app/insight",
    "/app/laporan",
    "/app/produk",
    "/app/pengguna",
    "/app/pengaturan",
    "/app/pengaturan/pajak",
  ]) {
    const r = await ambil(jalur);
    const keLogin = r.status === 307 || r.status === 302;
    const tujuan = r.headers.get("location") ?? "";
    periksa(
      `${jalur} menolak tamu dan mengalihkan ke /masuk`,
      keLogin && tujuan.includes("/masuk"),
      `status ${r.status}, location ${tujuan || "-"}`,
    );
  }

  // 4. Unduhan CSV tidak boleh terbuka untuk tamu
  const csv = await ambil("/api/laporan/csv");
  periksa(
    "/api/laporan/csv tidak bisa diakses tamu",
    csv.status !== 200,
    `status ${csv.status}`,
  );

  // 5. Halaman masuk & daftar
  for (const jalur of ["/masuk", "/daftar"]) {
    const r = await ambil(jalur);
    periksa(`${jalur} bisa dibuka`, r.status === 200, `status ${r.status}`);
  }

  // Tombol "coba pakai toko contoh" harus ada, dan teksnya menyesuaikan
  // apakah data demo sudah tersedia atau baru akan disiapkan.
  const halamanMasuk = await (await ambil("/masuk")).text();
  const demoAda =
    (await db.pengguna.findUnique({
      where: { email: "demo@catad.id" },
      select: { id: true },
    })) !== null;

  periksa(
    "halaman masuk menyediakan tombol toko contoh",
    halamanMasuk.includes("Coba pakai toko contoh"),
  );

  periksa(
    demoAda
      ? "tombol menyebut toko contoh sudah siap"
      : "tombol menawarkan menyiapkan toko contoh lebih dulu",
    demoAda
      ? halamanMasuk.includes("Toko contoh sudah siap")
      : halamanMasuk.includes("akan menyiapkan toko contoh"),
    `data demo ada: ${demoAda}`,
  );

  // 6. Nota digital publik
  const contohNota = await db.transaksi.findFirst({
    where: { status: "SELESAI" },
    select: {
      kodeNota: true,
      nomor: true,
      total: true,
      totalModal: true,
      laba: true,
      toko: { select: { nama: true } },
      item: { select: { namaProduk: true, modalSatuan: true } },
    },
    orderBy: { dibuatPada: "desc" },
  });

  if (!contohNota) {
    periksa("ada transaksi untuk diuji notanya", false, "basis data belum berisi transaksi");
  } else {
    const nota = await ambil(`/nota/${contohNota.kodeNota}`);
    const htmlNota = await nota.text();

    periksa("nota digital bisa dibuka tanpa login", nota.status === 200, `status ${nota.status}`);
    periksa("nota menampilkan nama toko", htmlNota.includes(contohNota.toko.nama));
    periksa("nota menampilkan nomor nota", htmlNota.includes(contohNota.nomor));
    periksa(
      "nota menampilkan total belanja",
      htmlNota.includes(contohNota.total.toLocaleString("id-ID")),
    );

    // Yang paling penting: nota publik tidak boleh membocorkan modal & laba.
    const modalBocor = contohNota.totalModal > 0 &&
      htmlNota.includes(contohNota.totalModal.toLocaleString("id-ID"));
    const labaBocor = contohNota.laba > 0 &&
      htmlNota.includes(`>${contohNota.laba.toLocaleString("id-ID")}<`);

    periksa("nota publik TIDAK membocorkan total modal", !modalBocor);
    periksa("nota publik TIDAK membocorkan laba", !labaBocor);

    // Diperiksa hanya di dalam <body>: bagian <head> memuat deskripsi umum
    // situs yang memang menyebut kata "laba" sebagai bahan pemasaran.
    const badanNota = htmlNota.slice(htmlNota.indexOf("<body"));
    periksa(
      "isi nota publik tidak menyebut kata modal/laba",
      !/\bmodal\b|\blaba\b/i.test(badanNota),
    );

    // Harga modal tiap barang juga tidak boleh ikut terkirim.
    const modalBarangBocor = contohNota.item.some(
      (i) => i.modalSatuan > 0 && badanNota.includes(`${i.modalSatuan.toLocaleString("id-ID")}`),
    );
    periksa("nota publik tidak membocorkan harga modal per barang", !modalBarangBocor);

    const notaPalsu = await ambil("/nota/TIDAKADA1");
    periksa("kode nota tidak dikenal menghasilkan 404", notaPalsu.status === 404, `status ${notaPalsu.status}`);
  }
}

// ── B. Keutuhan data ────────────────────────────────────────────────────────

async function ujiData() {
  bagian("B. Keutuhan data & isolasi tenant");

  const toko = await db.toko.findMany({ select: { id: true, nama: true } });
  periksa("ada minimal dua toko untuk menguji isolasi", toko.length >= 2, `${toko.length} toko`);

  // 1. Tidak ada relasi yang menyeberang antar toko.
  const itemSalahToko = await db.itemTransaksi.count({
    where: { produk: { isNot: null }, NOT: { produk: { tokoId: { equals: db.transaksi.fields.tokoId } } } },
  }).catch(() => null);

  // Perbandingan antar-tabel di atas tidak selalu didukung; lakukan manual.
  let bocorItem = 0;
  const semuaItem = await db.itemTransaksi.findMany({
    select: {
      produk: { select: { tokoId: true } },
      transaksi: { select: { tokoId: true } },
    },
  });
  for (const it of semuaItem) {
    if (it.produk && it.produk.tokoId !== it.transaksi.tokoId) bocorItem += 1;
  }
  periksa(
    "setiap item transaksi memakai produk dari toko yang sama",
    bocorItem === 0,
    `${bocorItem} item menyeberang (${itemSalahToko === null ? "cek manual" : "cek ganda"})`,
  );

  let bocorMutasi = 0;
  const semuaMutasi = await db.mutasiStok.findMany({
    select: { tokoId: true, produk: { select: { tokoId: true } } },
  });
  for (const m of semuaMutasi) {
    if (m.produk.tokoId !== m.tokoId) bocorMutasi += 1;
  }
  periksa("setiap mutasi stok sejalan dengan toko produknya", bocorMutasi === 0, `${bocorMutasi} bocor`);

  let bocorPengguna = 0;
  const semuaTrx = await db.transaksi.findMany({
    select: { tokoId: true, pengguna: { select: { tokoId: true } } },
  });
  for (const t of semuaTrx) {
    if (t.pengguna && t.pengguna.tokoId !== t.tokoId) bocorPengguna += 1;
  }
  periksa("setiap transaksi dilayani pengguna dari toko yang sama", bocorPengguna === 0, `${bocorPengguna} bocor`);

  // 2. Email pengguna unik secara global (satu email tidak dipakai dua toko).
  const pengguna = await db.pengguna.findMany({ select: { email: true } });
  const emailUnik = new Set(pengguna.map((p) => p.email));
  periksa("email pengguna unik lintas toko", emailUnik.size === pengguna.length);

  // 3. Kode nota unik secara global.
  const kode = await db.transaksi.findMany({ select: { kodeNota: true } });
  const kodeUnik = new Set(kode.map((k) => k.kodeNota));
  periksa("kode nota publik tidak pernah bertabrakan", kodeUnik.size === kode.length, `${kode.length - kodeUnik.size} duplikat`);

  // 4. Nomor nota unik per toko.
  const nomor = await db.transaksi.findMany({ select: { tokoId: true, nomor: true } });
  const nomorUnik = new Set(nomor.map((n) => `${n.tokoId}|${n.nomor}`));
  periksa("nomor nota unik per toko", nomorUnik.size === nomor.length, `${nomor.length - nomorUnik.size} duplikat`);

  // 5. Aritmetika uang di setiap transaksi.
  const transaksi = await db.transaksi.findMany({
    select: {
      nomor: true,
      subtotal: true,
      diskon: true,
      pajak: true,
      total: true,
      totalModal: true,
      laba: true,
      dibayar: true,
      kembalian: true,
      metodeBayar: true,
      item: { select: { subtotal: true, qty: true, hargaSatuan: true, diskon: true, modalSatuan: true } },
    },
  });

  let salahTotal = 0;
  let salahLaba = 0;
  let salahJumlahItem = 0;
  let salahKembalian = 0;
  let salahBaris = 0;

  for (const t of transaksi) {
    if (t.subtotal - t.diskon + t.pajak !== t.total) salahTotal += 1;
    if (t.subtotal - t.diskon - t.totalModal !== t.laba) salahLaba += 1;

    const jumlahBaris = t.item.reduce((s, i) => s + i.subtotal, 0);
    if (jumlahBaris !== t.subtotal) salahJumlahItem += 1;

    const modalBaris = t.item.reduce((s, i) => s + i.modalSatuan * i.qty, 0);
    if (modalBaris !== t.totalModal) salahBaris += 1;

    if (t.dibayar - t.total !== t.kembalian) salahKembalian += 1;
  }

  periksa(`total = subtotal − diskon + pajak (${transaksi.length} transaksi)`, salahTotal === 0, `${salahTotal} salah`);
  periksa("laba = subtotal − diskon − modal", salahLaba === 0, `${salahLaba} salah`);
  periksa("subtotal nota = jumlah subtotal barisnya", salahJumlahItem === 0, `${salahJumlahItem} salah`);
  periksa("total modal nota = jumlah modal barisnya", salahBaris === 0, `${salahBaris} salah`);
  periksa("kembalian = dibayar − total", salahKembalian === 0, `${salahKembalian} salah`);

  // 6. Tidak ada nilai uang negatif yang tidak masuk akal.
  const negatif = transaksi.filter((t) => t.total < 0 || t.subtotal < 0 || t.kembalian < 0);
  periksa("tidak ada nota bernilai negatif", negatif.length === 0, `${negatif.length} nota`);

  // 7. Rantai mutasi stok konsisten.
  const mutasi = await db.mutasiStok.findMany({
    select: { qty: true, stokSebelum: true, stokSesudah: true },
  });
  const rantaiSalah = mutasi.filter((m) => m.stokSebelum + m.qty !== m.stokSesudah);
  periksa(
    `stokSesudah = stokSebelum + qty (${mutasi.length} mutasi)`,
    rantaiSalah.length === 0,
    `${rantaiSalah.length} salah`,
  );

  // 8. Stok produk sekarang = stokSesudah pada mutasi terakhirnya.
  const produk = await db.produk.findMany({
    where: { lacakStok: true },
    select: {
      nama: true,
      stok: true,
      mutasi: { select: { stokSesudah: true }, orderBy: { dibuatPada: "desc" }, take: 1 },
    },
  });

  const stokMeleset = produk.filter(
    (p) => p.mutasi.length > 0 && p.mutasi[0].stokSesudah !== p.stok,
  );
  periksa(
    `stok produk sesuai mutasi terakhir (${produk.length} produk)`,
    stokMeleset.length === 0,
    stokMeleset.map((p) => `${p.nama}: ${p.stok} vs ${p.mutasi[0].stokSesudah}`).join("; "),
  );

  // 9. Tidak ada stok negatif.
  const stokNegatif = await db.produk.count({ where: { lacakStok: true, stok: { lt: 0 } } });
  periksa("tidak ada produk berstok negatif", stokNegatif === 0, `${stokNegatif} produk`);

  // 10. Setiap toko punya minimal satu pemilik.
  for (const t of toko) {
    const pemilik = await db.pengguna.count({ where: { tokoId: t.id, peran: "PEMILIK" } });
    periksa(`toko "${t.nama}" punya pemilik`, pemilik >= 1, `${pemilik} pemilik`);
  }

  // 11. Kode barang unik di dalam satu toko.
  const barang = await db.produk.findMany({
    where: { kode: { not: null } },
    select: { tokoId: true, kode: true },
  });
  const kodeBarangUnik = new Set(barang.map((b) => `${b.tokoId}|${b.kode}`));
  periksa("kode barang unik per toko", kodeBarangUnik.size === barang.length);

  // 12. Ringkasan data demo (informatif, sekaligus memastikan tidak kosong).
  for (const t of toko) {
    const [jumlahTrx, jumlahProduk, omzet] = await Promise.all([
      db.transaksi.count({ where: { tokoId: t.id, status: "SELESAI" } }),
      db.produk.count({ where: { tokoId: t.id } }),
      db.transaksi.aggregate({
        where: { tokoId: t.id, status: "SELESAI" },
        _sum: { total: true, laba: true },
      }),
    ]);

    periksa(
      `toko "${t.nama}" berisi data (${jumlahProduk} barang, ${jumlahTrx} transaksi, omzet Rp${(omzet._sum.total ?? 0).toLocaleString("id-ID")}, laba Rp${(omzet._sum.laba ?? 0).toLocaleString("id-ID")})`,
      jumlahProduk > 0 && jumlahTrx > 0,
    );
  }
}

// ── Pengalihan (redirect) ────────────────────────────────────────

/**
 * Setiap pengalihan harus memakai lokasi relatif.
 *
 * Di dalam container, origin yang terbaca server adalah alamat bind-nya
 * (0.0.0.0:3000), bukan alamat yang dibuka pengguna. Kalau ada Location
 * absolut, peramban akan dilempar ke alamat yang tidak bisa diakses.
 */
async function ujiPengalihan() {
  bagian("D. Pengalihan tidak boleh memakai alamat internal");

  const jalurUji = [
    { jalur: "/keluar", opsi: { method: "POST" }, nama: "tombol keluar" },
    { jalur: "/keluar", opsi: {}, nama: "keluar saat sesi kedaluwarsa" },
    { jalur: "/app", opsi: {}, nama: "penjagaan /app" },
    { jalur: "/app/kasir", opsi: {}, nama: "penjagaan /app/kasir" },
  ];

  for (const u of jalurUji) {
    const r = await ambil(u.jalur, u.opsi);
    const lokasi = r.headers.get("location") ?? "";

    periksa(
      `${u.nama} mengalihkan ke lokasi relatif`,
      lokasi.startsWith("/"),
      `location: ${lokasi || "(kosong)"}`,
    );
    periksa(
      `${u.nama} tidak membocorkan alamat internal server`,
      !/0\.0\.0\.0|127\.0\.0\.1|:3000/.test(lokasi),
      `location: ${lokasi || "(kosong)"}`,
    );
  }

  // Tombol keluar harus benar-benar menghapus cookie sesi.
  const keluar = await ambil("/keluar", { method: "POST" });
  const kuki = keluar.headers.get("set-cookie") ?? "";
  periksa(
    "keluar menghapus cookie sesi",
    kuki.includes("catad_sesi=") && /Expires=Thu, 01 Jan 1970|Max-Age=0/i.test(kuki),
    kuki || "(tidak ada set-cookie)",
  );

  // Diikuti sampai tuntas: harus mendarat di halaman masuk yang bisa dibuka.
  const akhir = await fetch(`${BASIS}/keluar`, { method: "POST", redirect: "follow" });
  periksa(
    "mengikuti pengalihan keluar mendarat di /masuk",
    akhir.ok && akhir.url === `${BASIS}/masuk`,
    `url akhir: ${akhir.url}, status ${akhir.status}`,
  );
}

// ── C. Hak akses peran & paket ──────────────────────────────────────────────

/**
 * Membuat cookie sesi yang sah memakai JWT_SECRET yang sama dengan aplikasi,
 * supaya jalur khusus pemilik / khusus Pro bisa diuji tanpa mengisi formulir.
 */
async function cookieSesi(email) {
  const { SignJWT } = await import("jose");

  const pengguna = await db.pengguna.findUnique({
    where: { email },
    select: { id: true, nama: true, peran: true, tokoId: true, toko: { select: { nama: true } } },
  });
  if (!pengguna) return null;

  const rahasia = new TextEncoder().encode(process.env.JWT_SECRET);
  const token = await new SignJWT({
    uid: pengguna.id,
    tid: pengguna.tokoId,
    peran: pengguna.peran,
    nama: pengguna.nama,
    toko: pengguna.toko.nama,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("catad")
    .setExpirationTime("1h")
    .sign(rahasia);

  return `catad_sesi=${token}`;
}

async function ujiHakAkses() {
  bagian("C. Hak akses peran & paket");

  if (!process.env.JWT_SECRET) {
    periksa("JWT_SECRET tersedia untuk menguji sesi", false, "set JWT_SECRET dulu (lihat .env)");
    return;
  }

  // ── Kasir: tidak boleh membuka halaman yang memuat laba ──
  const kasir = await cookieSesi("andi@catad.id");
  if (!kasir) {
    periksa("akun kasir demo tersedia", false, "andi@catad.id tidak ditemukan");
  } else {
    for (const jalur of ["/app", "/app/laporan", "/app/insight", "/app/pengeluaran", "/app/pengguna"]) {
      const r = await ambil(jalur, { headers: { cookie: kasir } });
      const dialihkan = r.status === 307 || r.status === 302;
      periksa(
        `kasir tidak bisa membuka ${jalur}`,
        dialihkan,
        `status ${r.status}, location ${r.headers.get("location") ?? "-"}`,
      );
    }

    for (const jalur of ["/app/kasir", "/app/transaksi", "/app/produk", "/app/stok"]) {
      const r = await ambil(jalur, { headers: { cookie: kasir } });
      periksa(`kasir tetap bisa membuka ${jalur}`, r.status === 200, `status ${r.status}`);
    }

    const csvKasir = await ambil("/api/laporan/csv", { headers: { cookie: kasir } });
    periksa("kasir tidak bisa mengunduh laporan CSV", csvKasir.status === 403, `status ${csvKasir.status}`);

    const halamanKasir = await (await ambil("/app/kasir", { headers: { cookie: kasir } })).text();
    periksa(
      "menu analisis tidak muncul untuk kasir",
      !halamanKasir.includes("/app/laporan") && !halamanKasir.includes("/app/insight"),
    );
  }

  // ── Pemilik paket Gratis: Catad Insight terkunci ──
  const gratis = await cookieSesi("budi@tendabiru.id");
  if (!gratis) {
    periksa("akun toko paket gratis tersedia", false, "budi@tendabiru.id tidak ditemukan");
  } else {
    const insight = await ambil("/app/insight", { headers: { cookie: gratis } });
    const isiInsight = await insight.text();

    periksa("pemilik paket gratis bisa membuka halaman Insight", insight.status === 200, `status ${insight.status}`);
    periksa("halaman Insight menampilkan keadaan terkunci", isiInsight.includes("paket Pro"));
    periksa(
      "daftar belanja otomatis tidak diberikan ke paket gratis",
      !isiInsight.includes("Daftar belanja otomatis") ||
        isiInsight.includes("Catad Insight ada di paket Pro"),
    );

    const csvGratis = await ambil("/api/laporan/csv", { headers: { cookie: gratis } });
    periksa("paket gratis tidak bisa mengunduh CSV", csvGratis.status === 403, `status ${csvGratis.status}`);

    const laporanGratis = await (await ambil("/app/laporan", { headers: { cookie: gratis } })).text();
    periksa("tombol unduh CSV tidak muncul di paket gratis", !laporanGratis.includes("Unduh CSV"));

    // ── Isolasi tenant: nomor nota toko lain tidak boleh bisa dibuka ──
    const notaTokoLain = await db.transaksi.findFirst({
      where: { toko: { slug: "warung-bu-sari" } },
      select: { id: true },
    });
    if (notaTokoLain) {
      const r = await ambil(`/app/transaksi/${notaTokoLain.id}`, { headers: { cookie: gratis } });
      periksa(
        "transaksi milik toko lain tidak bisa dibuka (isolasi tenant)",
        r.status === 404,
        `status ${r.status}`,
      );
    }
  }

  // ── Pemilik paket Pro: semuanya terbuka ──
  const pro = await cookieSesi("demo@catad.id");
  if (pro) {
    for (const jalur of ["/app", "/app/laporan", "/app/insight", "/app/pengeluaran", "/app/pengguna"]) {
      const r = await ambil(jalur, { headers: { cookie: pro } });
      periksa(`pemilik Pro bisa membuka ${jalur}`, r.status === 200, `status ${r.status}`);
    }

    const csvPro = await ambil("/api/laporan/csv?mulai=2026-07-01&selesai=2026-07-31", {
      headers: { cookie: pro },
    });
    const isiCsv = await csvPro.text();
    periksa("pemilik Pro bisa mengunduh CSV", csvPro.status === 200, `status ${csvPro.status}`);
    periksa("CSV berisi baris judul kolom", isiCsv.includes("Nomor nota"));
    periksa("CSV berisi baris ringkasan", isiCsv.includes("RINGKASAN"));

    const insightPro = await (await ambil("/app/insight", { headers: { cookie: pro } })).text();
    periksa("pemilik Pro melihat daftar belanja otomatis", insightPro.includes("Daftar belanja otomatis"));
    periksa("pemilik Pro melihat prediksi stok habis", insightPro.includes("Prediksi stok habis"));
  }

  // ── Sesi yang dirusak harus ditolak ──
  const palsu = "catad_sesi=eyJhbGciOiJIUzI1NiJ9.eyJ1aWQiOiJwYWxzdSIsInRpZCI6InBhbHN1In0.tandatangan-palsu";
  const r = await ambil("/app", { headers: { cookie: palsu } });
  periksa(
    "token sesi palsu ditolak",
    r.status === 307 || r.status === 302,
    `status ${r.status}`,
  );
}

// ── E. Langganan & kuota akun ───────────────────────────────────────────────

async function ujiLangganan() {
  bagian("E. Langganan & kuota akun");

  if (!process.env.JWT_SECRET) {
    periksa("JWT_SECRET tersedia untuk menguji langganan", false, "set JWT_SECRET dulu");
    return;
  }

  // ── Halaman langganan memuat tujuan pembayaran yang sebenarnya ──
  const pemilik = await cookieSesi("budi@tendabiru.id");
  if (!pemilik) {
    periksa("akun pemilik paket gratis tersedia", false, "budi@tendabiru.id tidak ditemukan");
    return;
  }

  const r = await ambil("/app/pengaturan/langganan", { headers: { cookie: pemilik } });
  const isi = await r.text();

  // Nomornya dibaca dari basis data, bukan ditulis ulang di sini. Kalau
  // ditulis ulang, pengujiannya berhenti membuktikan bahwa halaman memang
  // mengikuti pengaturan dan hanya membuktikan dua tulisan sama.
  const aturan = await db.pengaturanLayanan.findUnique({ where: { id: "global" } });

  periksa("halaman langganan terbuka untuk pemilik", r.status === 200, `status ${r.status}`);
  periksa("baris pengaturan layanan ada", !!aturan);
  periksa("harga Pro bulanan Rp49.000", isi.includes("Rp49.000"));

  // ── Gerbang niat berlangganan ──
  // Petunjuk transfer TIDAK boleh muncul sebelum pemilik toko menyatakan niat.
  // Sebelum ada gerbang ini, orang yang cuma menengok harga langsung disuguhi
  // nomor rekening seolah sudah setuju berlangganan.
  const tokoPemilik = await db.toko.findFirst({
    where: { pengguna: { some: { email: "budi@tendabiru.id" } } },
    select: { id: true },
  });

  const belumMengajukan =
    (await db.langganan.count({
      where: { tokoId: tokoPemilik?.id, status: "MENUNGGU" },
    })) === 0;

  if (aturan && belumMengajukan) {
    // Yang diperiksa adalah penanda yang DIRENDER, bukan seluruh sumber
    // halaman. `PanelBerlangganan` adalah komponen klien, jadi nomor rekening
    // ikut terserialisasi sebagai propnya di dalam muatan RSC di <script> —
    // ada di sumber halaman walau tidak ditampilkan. Itu bukan kebocoran:
    // nomor rekening memang untuk menerima transfer, bukan rahasia. Yang
    // diminta di sini persetujuan, bukan kerahasiaan.
    const dirender = isi.replace(/<script[\s\S]*?<\/script>/g, " ");

    // Penanda dipilih yang benar-benar khas blok petunjuk. Frasa
    // "Cara berlangganan" tidak bisa dipakai: kartu paket Pro memuat penunjuk
    // "Cara berlangganan ada pada bagian di bawah" yang selalu ada.
    periksa(
      "petunjuk transfer belum dirender sebelum niat dinyatakan",
      !/ke rekening berikut/i.test(dirender),
    );
    periksa(
      "tombol konfirmasi WhatsApp belum dirender sebelum niat dinyatakan",
      !/Konfirmasi lewat WhatsApp/i.test(dirender),
    );
    periksa(
      "tombol pernyataan niat ditampilkan",
      /Lanjut berlangganan|Lanjut perpanjang/.test(dirender),
    );
  }

  // Sesudah pengajuan tercatat, petunjuknya harus terbuka sendiri tanpa perlu
  // menekan tombol niat lagi.
  if (aturan && tokoPemilik) {
    let pengajuanUji = null;
    try {
      pengajuanUji = await db.langganan.create({
        data: {
          tokoId: tokoPemilik.id,
          paket: "PRO",
          jumlah: 49_000,
          periodeMulai: new Date(),
          periodeSelesai: new Date(Date.now() + 30 * 86_400_000),
          status: "MENUNGGU",
          metode: "TRANSFER_UJI_ASAP",
        },
        select: { id: true },
      });

      const isiSesudah = await (
        await ambil("/app/pengaturan/langganan", { headers: { cookie: pemilik } })
      ).text();

      const waInternasional = `62${aturan.waNomor
        .replace(/\D/g, "")
        .replace(/^62/, "")
        .replace(/^0+/, "")}`;

      periksa(
        "rekening dari pengaturan tampil sesudah mengajukan",
        isiSesudah.includes(aturan.bankRekening),
        aturan.bankRekening,
      );
      periksa(
        "nomor WhatsApp dari pengaturan tampil sesudah mengajukan",
        isiSesudah.includes(aturan.waNomor),
      );
      periksa(
        "tautan wa.me memakai format internasional",
        isiSesudah.includes(`wa.me/${waInternasional}`),
        waInternasional,
      );
      periksa(
        "keadaan menunggu konfirmasi diberitahukan ke pemilik toko",
        /Menunggu konfirmasi pembayaran/i.test(isiSesudah),
      );
    } finally {
      if (pengajuanUji) await db.langganan.delete({ where: { id: pengajuanUji.id } });
    }

    const sisa = await db.langganan.count({ where: { metode: "TRANSFER_UJI_ASAP" } });
    periksa("pengajuan uji sudah dibersihkan", sisa === 0);
  }

  // Alasan teknis (payment gateway belum siap) tidak boleh bocor ke pengguna.
  const bocor = /disimulasik|simulasi|payment gateway/i.test(isi);
  periksa("tidak menyebut pembayaran disimulasikan", !bocor);

  // ── Kuota akun paket Gratis benar-benar berlaku ──
  const toko = await db.toko.findFirst({
    where: { pengguna: { some: { email: "budi@tendabiru.id" } } },
    select: { id: true },
  });

  const EMAIL_UJI = "uji-kuota.smoke@catad.invalid";
  let sementara = null;

  try {
    sementara = await db.pengguna.create({
      data: {
        tokoId: toko.id,
        nama: "Kasir Uji Kuota",
        email: EMAIL_UJI,
        // Bukan hash bcrypt yang sah, jadi akun ini tidak bisa dipakai masuk
        // lewat formulir walau pembersihannya gagal.
        kataSandiHash: "$2a$10$tidak-bisa-dipakai-masuk",
        peran: "KASIR",
      },
      select: { id: true },
    });

    const kasirBerlebih = await cookieSesi(EMAIL_UJI);
    const rKasir = await ambil("/app/kasir", { headers: { cookie: kasirBerlebih } });
    const tujuan = rKasir.headers.get("location") ?? "";

    periksa(
      "kasir di luar kuota paket Gratis dialihkan keluar",
      rKasir.status === 307 || rKasir.status === 302,
      `status ${rKasir.status}`,
    );
    periksa("pengalihannya menyertakan alasan kuota", tujuan.includes("alasan=kuota"), tujuan);

    // Hop kedua: /keluar harus meneruskan alasannya ke halaman masuk.
    const rKeluar = await ambil("/keluar?alasan=kuota");
    const tujuanKeluar = rKeluar.headers.get("location") ?? "";
    periksa(
      "halaman keluar meneruskan alasan ke halaman masuk",
      tujuanKeluar === "/masuk?alasan=kuota",
      tujuanKeluar,
    );

    // Alasan yang tidak dikenali diabaikan, bukan diteruskan mentah.
    const rNgawur = await ambil("/keluar?alasan=https://situs-lain.example");
    periksa(
      "alasan keluar yang tidak dikenali diabaikan",
      (rNgawur.headers.get("location") ?? "") === "/masuk",
      rNgawur.headers.get("location") ?? "-",
    );

    const rMasuk = await ambil("/masuk?alasan=kuota");
    const isiMasuk = await rMasuk.text();
    periksa("halaman masuk menjelaskan akun terkunci", isiMasuk.includes("terkunci"));

    // Pemilik tidak boleh ikut terkunci — kalau ikut, tokonya mati total.
    const rPemilik = await ambil("/app", { headers: { cookie: pemilik } });
    periksa("pemilik tetap bisa masuk walau kuota terlampaui", rPemilik.status === 200, `status ${rPemilik.status}`);

    const isiPengguna = await (
      await ambil("/app/pengguna", { headers: { cookie: pemilik } })
    ).text();
    periksa("daftar akun menandai akun yang terkunci", /terkunci/i.test(isiPengguna));
  } finally {
    if (sementara) {
      await db.pengguna.delete({ where: { id: sementara.id } });
    }
  }

  // Setelah dibersihkan, kuota kembali longgar.
  const sisa = await db.pengguna.count({ where: { email: EMAIL_UJI } });
  periksa("akun uji kuota sudah dibersihkan", sisa === 0);
}

// ── F. Panel operator ───────────────────────────────────────────────────────

/**
 * Membuat cookie sesi operator yang sah.
 *
 * Kuncinya diturunkan dari JWT_SECRET dengan pemisah domain yang sama seperti
 * `src/lib/auth-admin.ts`, dan penerbit/penerimanya juga harus cocok. Kalau
 * salah satu saja berbeda, tokennya ditolak — itu memang inti pemisahannya.
 */
async function cookieOperator() {
  const { SignJWT } = await import("jose");

  // Operator aktif mana pun yang ada, bukan alamat email tertentu. Alamatnya
  // berbeda antara mesin pengembangan dan server, jadi memakunya di sini
  // berarti pengujiannya gagal di salah satu tempat tanpa ada yang rusak.
  const operator = await db.operator.findFirst({
    where: { aktif: true },
    select: { id: true, nama: true, email: true },
    orderBy: { dibuatPada: "asc" },
  });
  if (!operator) return null;

  const bahan = new TextEncoder().encode(`catad:operator:v1:${process.env.JWT_SECRET}`);
  const kunci = new Uint8Array(await crypto.subtle.digest("SHA-256", bahan));

  const token = await new SignJWT({
    oid: operator.id,
    nama: operator.nama,
    email: operator.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("catad-operator")
    .setAudience("panel-operator")
    .setExpirationTime("1h")
    .sign(kunci);

  return { cookie: `catad_operator=${token}`, email: operator.email };
}

const HALAMAN_PANEL = ["/admin", "/admin/toko", "/admin/keuangan", "/admin/jejak", "/admin/pengaturan"];

async function ujiPanelOperator() {
  bagian("F. Panel operator");

  if (!process.env.JWT_SECRET) {
    periksa("JWT_SECRET tersedia untuk menguji panel", false, "set JWT_SECRET dulu");
    return;
  }

  // ── Tanpa sesi: seluruh panel tertutup ──
  for (const jalur of HALAMAN_PANEL) {
    const r = await ambil(jalur);
    const tujuan = r.headers.get("location") ?? "";
    periksa(
      `${jalur} tertutup tanpa sesi operator`,
      (r.status === 307 || r.status === 302) && tujuan.includes("/admin/masuk"),
      `status ${r.status}, location ${tujuan || "-"}`,
    );
  }

  const rMasuk = await ambil("/admin/masuk");
  periksa("halaman masuk operator terbuka", rMasuk.status === 200, `status ${rMasuk.status}`);
  const isiMasuk = await rMasuk.text();
  periksa("halaman masuk operator tidak diindeks mesin pencari", /noindex/i.test(isiMasuk));
  periksa(
    "halaman masuk operator tidak menawarkan pendaftaran",
    !/daftar/i.test(isiMasuk) || /hanya dibuat lewat baris perintah/i.test(isiMasuk),
  );

  // ── Sesi TOKO tidak boleh membuka panel ──
  // Ini pemeriksaan terpenting di bagian ini: satu kebocoran di sini membuat
  // setiap pemegang akun kasir bisa melihat dan mengubah semua toko.
  const sesiToko = await cookieSesi("demo@catad.id");
  if (sesiToko) {
    for (const jalur of HALAMAN_PANEL) {
      const r = await ambil(jalur, { headers: { cookie: sesiToko } });
      const tujuan = r.headers.get("location") ?? "";
      periksa(
        `sesi toko ditolak di ${jalur}`,
        (r.status === 307 || r.status === 302) && tujuan.includes("/admin/masuk"),
        `status ${r.status}, location ${tujuan || "-"}`,
      );
    }
  }

  // ── Sesi operator ──
  const sesiOperator = await cookieOperator();
  if (!sesiOperator) {
    periksa(
      "akun operator tersedia untuk pengujian",
      false,
      'jalankan: npm run operator -- buat <email> "<nama>"',
    );
    return;
  }

  const operator = sesiOperator.cookie;

  for (const jalur of HALAMAN_PANEL) {
    const r = await ambil(jalur, { headers: { cookie: operator } });
    periksa(`operator bisa membuka ${jalur}`, r.status === 200, `status ${r.status}`);
  }

  const isiPanel = await (await ambil("/admin", { headers: { cookie: operator } })).text();
  periksa("panel tidak diindeks mesin pencari", /noindex/i.test(isiPanel));
  periksa(
    "panel menyebut operator yang masuk",
    isiPanel.includes(sesiOperator.email),
    sesiOperator.email,
  );

  // ── Mengubah langganan harus bisa DITEMUKAN, bukan cuma ada ──
  // Kemampuannya pernah tersembunyi: satu-satunya jalan ke halaman kelola
  // adalah nama toko yang tidak diberi warna maupun garis bawah, sehingga dari
  // sisi operator seolah tidak ada cara mengubah status langganan sama sekali.
  const isiDaftarToko = await (
    await ambil("/admin/toko", { headers: { cookie: operator } })
  ).text();

  periksa("daftar toko menyediakan tombol kelola", isiDaftarToko.includes("Kelola"));

  const tokoPertama = await db.toko.findFirst({
    select: { id: true, nama: true },
    orderBy: { dibuatPada: "asc" },
  });

  if (tokoPertama) {
    periksa(
      "tombol kelola menunjuk halaman detail toko",
      isiDaftarToko.includes(`/admin/toko/${tokoPertama.id}`),
    );

    const isiDetail = await (
      await ambil(`/admin/toko/${tokoPertama.id}`, { headers: { cookie: operator } })
    ).text();

    for (const tindakan of ["1 bulan", "1 tahun", "tenggang", "Blokir toko"]) {
      periksa(
        `halaman kelola menyediakan tindakan "${tindakan}"`,
        isiDetail.includes(tindakan),
      );
    }

    const rHilang = await ambil("/admin/toko/tidak-ada-id-seperti-ini", {
      headers: { cookie: operator },
    });
    periksa(
      "id toko yang tidak ada menghasilkan 404, bukan galat",
      rHilang.status === 404,
      `status ${rHilang.status}`,
    );
  }

  // ── Sesi operator tidak boleh membuka aplikasi toko ──
  // Arah sebaliknya sama pentingnya: operator tidak punya toko, jadi tidak ada
  // ruang data yang boleh dibukanya lewat /app.
  for (const jalur of ["/app", "/app/kasir"]) {
    const r = await ambil(jalur, { headers: { cookie: operator } });
    const tujuan = r.headers.get("location") ?? "";
    periksa(
      `sesi operator ditolak di ${jalur}`,
      (r.status === 307 || r.status === 302) && tujuan.includes("/masuk"),
      `status ${r.status}, location ${tujuan || "-"}`,
    );
  }

  // ── Keluar panel ──
  const rKeluar = await ambil("/admin/keluar", { headers: { cookie: operator } });
  const lokasiKeluar = rKeluar.headers.get("location") ?? "";
  periksa(
    "keluar panel mengalihkan ke lokasi relatif",
    lokasiKeluar === "/admin/masuk",
    lokasiKeluar,
  );
  periksa(
    "keluar panel tidak membocorkan alamat internal server",
    !lokasiKeluar.includes("0.0.0.0") && !lokasiKeluar.includes(":3000"),
    lokasiKeluar,
  );
  periksa(
    "keluar panel menghapus cookie operator",
    (rKeluar.headers.get("set-cookie") ?? "").includes("catad_operator="),
  );

  // ── Blokir toko benar-benar menutup akses ──
  const tokoUji = await db.toko.findFirst({
    where: { pengguna: { some: { email: "budi@tendabiru.id" } } },
    select: { id: true, diblokir: true },
  });

  if (tokoUji) {
    try {
      await db.toko.update({
        where: { id: tokoUji.id },
        data: { diblokir: true, alasanBlokir: "uji asap", diblokirPada: new Date() },
      });

      const sesiDiblokir = await cookieSesi("budi@tendabiru.id");
      const rBlokir = await ambil("/app", { headers: { cookie: sesiDiblokir } });
      const tujuanBlokir = rBlokir.headers.get("location") ?? "";

      periksa(
        "toko yang diblokir dialihkan keluar dari /app",
        (rBlokir.status === 307 || rBlokir.status === 302) &&
          tujuanBlokir.includes("alasan=blokir"),
        `status ${rBlokir.status}, location ${tujuanBlokir || "-"}`,
      );

      const rKasirBlokir = await ambil("/app/kasir", { headers: { cookie: sesiDiblokir } });
      periksa(
        "toko yang diblokir tidak bisa membuka kasir",
        rKasirBlokir.status === 307 || rKasirBlokir.status === 302,
        `status ${rKasirBlokir.status}`,
      );

      const isiMasukBlokir = await (await ambil("/masuk?alasan=blokir")).text();
      periksa(
        "halaman masuk menjelaskan akses dihentikan",
        /dihentikan/i.test(isiMasukBlokir),
      );
      periksa(
        "alasan blokir internal tidak dibocorkan ke pemilik toko",
        !isiMasukBlokir.includes("uji asap"),
      );
    } finally {
      await db.toko.update({
        where: { id: tokoUji.id },
        data: { diblokir: false, alasanBlokir: null, diblokirPada: null },
      });
    }

    const kembali = await db.toko.findUnique({
      where: { id: tokoUji.id },
      select: { diblokir: true },
    });
    periksa("blokir uji sudah dibuka kembali", kembali?.diblokir === false);
  }

  // ── Pendapatan hanya dari baris yang sudah dibayar ──
  const adaBelumDibayar = await db.langganan.count({ where: { dibayarPada: null } });
  const sudahDibayar = await db.langganan.count({ where: { dibayarPada: { not: null } } });
  periksa(
    "pendapatan dibedakan dari status langganan",
    adaBelumDibayar + sudahDibayar > 0,
    `${sudahDibayar} dibayar, ${adaBelumDibayar} belum`,
  );

  const isiKeuangan = await (
    await ambil("/admin/keuangan", { headers: { cookie: operator } })
  ).text();
  periksa(
    "halaman keuangan menyatakan dasar perhitungannya",
    /sudah dikonfirmasi/i.test(isiKeuangan),
  );
}

// ── G. Laporan pajak ────────────────────────────────────────────────────────

async function ujiLaporanPajak() {
  bagian("G. Laporan pajak");

  if (!process.env.JWT_SECRET) {
    periksa("JWT_SECRET tersedia untuk menguji laporan pajak", false, "set JWT_SECRET dulu");
    return;
  }

  const tahun = new Date().getFullYear();

  // ── Pemilik paket Pro ──
  const pro = await cookieSesi("demo@catad.id");
  if (pro) {
    const halaman = await ambil("/app/pajak", { headers: { cookie: pro } });
    const isi = await halaman.text();

    periksa("pemilik Pro bisa membuka laporan pajak", halaman.status === 200, `status ${halaman.status}`);
    periksa("halaman menyebut peredaran bruto", /peredaran bruto/i.test(isi));
    periksa("halaman menyebut PPh Final", /PPh Final/i.test(isi));
    periksa(
      "halaman mengakui dirinya kertas kerja, bukan formulir SPT",
      /kertas kerja/i.test(isi) && /bukan formulir SPT/i.test(isi),
    );
    periksa("halaman menyebut dasar peraturannya", /PP 23\/2018/.test(isi));

    const pdf = await ambil(`/api/laporan/pajak?tahun=${tahun}`, { headers: { cookie: pro } });
    const bita = Buffer.from(await pdf.arrayBuffer());

    periksa("pemilik Pro bisa mengunduh PDF", pdf.status === 200, `status ${pdf.status}`);
    periksa(
      "tipe isinya application/pdf",
      (pdf.headers.get("content-type") ?? "").includes("application/pdf"),
      pdf.headers.get("content-type") ?? "-",
    );
    periksa(
      "berkas diunduh, bukan ditampilkan di tab",
      (pdf.headers.get("content-disposition") ?? "").startsWith("attachment;"),
    );
    periksa("berkasnya benar-benar PDF", bita.subarray(0, 5).toString() === "%PDF-");
    periksa("berkasnya diakhiri penanda akhir PDF", bita.toString("latin1").trimEnd().endsWith("%%EOF"));
    periksa("berkasnya tidak kosong", bita.length > 2000, `${bita.length} bita`);

    // Tahun sembarang dari URL tidak boleh memicu kueri rentang raksasa.
    const ngawur = await ambil("/api/laporan/pajak?tahun=999999", { headers: { cookie: pro } });
    periksa("tahun di luar rentang diabaikan, bukan diteruskan", ngawur.status === 200, `status ${ngawur.status}`);
  }

  // ── Pemilik paket Gratis: terkunci ──
  const gratis = await cookieSesi("budi@tendabiru.id");
  if (gratis) {
    const halaman = await ambil("/app/pajak", { headers: { cookie: gratis } });
    const isi = await halaman.text();

    periksa("pemilik paket gratis tetap bisa membuka halamannya", halaman.status === 200, `status ${halaman.status}`);
    periksa("halaman menawarkan paket Pro", /paket Pro/i.test(isi));
    // Angka pajak tidak boleh bocor ke paket gratis.
    periksa("rekapitulasi tidak ditampilkan ke paket gratis", !/Rekapitulasi per masa pajak/i.test(isi));

    const pdf = await ambil("/api/laporan/pajak", { headers: { cookie: gratis } });
    periksa("paket gratis tidak bisa mengunduh PDF", pdf.status === 403, `status ${pdf.status}`);
  }

  // ── Kasir: laporan memuat modal & laba, jadi tertutup ──
  const kasir = await cookieSesi("andi@catad.id");
  if (kasir) {
    const halaman = await ambil("/app/pajak", { headers: { cookie: kasir } });
    periksa(
      "kasir tidak bisa membuka laporan pajak",
      halaman.status === 307 || halaman.status === 302,
      `status ${halaman.status}`,
    );

    const pdf = await ambil("/api/laporan/pajak", { headers: { cookie: kasir } });
    periksa("kasir tidak bisa mengunduh PDF pajak", pdf.status === 403, `status ${pdf.status}`);
  }

  // ── Tanpa sesi ──
  const tamu = await ambil("/api/laporan/pajak");
  periksa(
    "tanpa sesi tidak bisa mengunduh PDF pajak",
    tamu.status === 307 || tamu.status === 302 || tamu.status === 403,
    `status ${tamu.status}`,
  );

  await ujiPengaturanPajak({ pro, gratis, kasir });
}

// ── H. Halaman pengaturan pajak ─────────────────────────────────────────────

/**
 * Pengaturan pajak berdiri sendiri, terpisah dari pengaturan toko.
 *
 * Yang diuji bukan cuma "halamannya ada", melainkan bahwa pemisahannya
 * benar-benar terjadi: istilah perpajakan tidak boleh tertinggal di pengaturan
 * biasa, dan jalan menuju halaman barunya harus terlihat. Halaman baru yang
 * tidak ditautkan sama saja dengan tidak ada.
 */
async function ujiPengaturanPajak({ pro, gratis, kasir }) {
  bagian("H. Pengaturan pajak");

  const NAMA_REZIM = [
    "PPh Final UMKM",
    "Norma Penghitungan Penghasilan Neto",
    "Pembukuan — orang pribadi",
    // "badan" berdiri sendiri ambigu bagi orang awam — badan apa?
    "Pembukuan — badan usaha",
    "Rekap saja, tanpa hitung pajak",
  ];

  const SUMBER = ["PP 23/2018", "PER-17/PJ/2015", "UU HPP", "31E"];

  if (pro) {
    const r = await ambil("/app/pengaturan/pajak", { headers: { cookie: pro } });
    const isi = await r.text();

    periksa("pemilik bisa membuka pengaturan pajak", r.status === 200, `status ${r.status}`);

    for (const nama of NAMA_REZIM) {
      periksa(`tabel rujukan menyebut "${nama}"`, isi.includes(nama));
    }
    for (const s of SUMBER) {
      periksa(`tabel rujukan mencantumkan sumber ${s}`, isi.includes(s));
    }

    periksa(
      "istilah resmi diterjemahkan ke bahasa sehari-hari",
      /dihitung dari omzet/i.test(isi) && /dihitung dari untung/i.test(isi),
    );
    periksa(
      "halaman mengakui dirinya bukan nasihat perpajakan",
      /bukan nasihat perpajakan/i.test(isi),
    );
    periksa(
      "angsuran PPh Pasal 25 yang tidak dihitung disebutkan",
      /Pasal 25/.test(isi),
    );
    // Fasilitas Pasal 31E disebut sebagai angka jadinya, bukan cuma "potongan
    // 50%" yang menuntut pembacanya berhitung sendiri.
    periksa(
      "tabel rujukan menyebut tarif 11% dengan Pasal 31E",
      isi.includes("11% dengan Pasal 31E"),
    );
    periksa(
      'pilihan jenis wajib pajak menyebut "Badan Usaha"',
      isi.includes("Badan Usaha (PT / CV / koperasi)"),
    );
  }

  // Panel tarif efektif hanya muncul saat rezimnya pembukuan badan usaha,
  // jadi rezim toko uji ditukar sebentar lalu dikembalikan.
  await ujiPanelTarifEfektif();

  // Bukan fitur Pro: memilih dasar perhitungan harus bisa dilakukan sebelum
  // berlangganan, kalau tidak laporannya salah sejak unduhan pertama.
  if (gratis) {
    const r = await ambil("/app/pengaturan/pajak", { headers: { cookie: gratis } });
    periksa(
      "pemilik paket gratis juga bisa mengatur dasar perhitungan",
      r.status === 200,
      `status ${r.status}`,
    );
  }

  // NPWP dan dasar perhitungan bukan urusan kasir, sama seperti laporannya.
  if (kasir) {
    const r = await ambil("/app/pengaturan/pajak", { headers: { cookie: kasir } });
    periksa(
      "kasir tidak bisa membuka pengaturan pajak",
      r.status === 307 || r.status === 302,
      `status ${r.status}`,
    );
  }

  // ── Pemisahan dari pengaturan biasa ──
  if (pro) {
    const r = await ambil("/app/pengaturan", { headers: { cookie: pro } });
    const isi = await r.text();

    periksa(
      "pengaturan biasa menautkan halaman pengaturan pajak",
      isi.includes("/app/pengaturan/pajak"),
    );
    // Diperiksa lewat nama kolom formulir, bukan tulisan di layar: kartu
    // ringkasan memang menyebut dasar perhitungan yang sedang dipakai, jadi
    // mencocokkan teks akan gagal sendiri begitu toko contohnya berganti rezim.
    for (const kolom of ["npwp", "rezimPajak", "tarifBadanPersen", "ptkpSetahun"]) {
      // Dua bentuk: HTML hasil render, dan muatan RSC yang tanda kutipnya
      // dilarikan.
      const ada = isi.includes(`name="${kolom}"`) || isi.includes(`name=\\"${kolom}\\"`);
      periksa(`kolom ${kolom} sudah pindah dari pengaturan biasa`, !ada);
    }
  }
}

/**
 * Panel tarif efektif Pasal 31E.
 *
 * Isian PPh badan hanya dirender ketika rezim tersimpannya pembukuan badan
 * usaha, jadi rezim satu toko ditukar sebentar. Dikembalikan di `finally` dan
 * hasil pengembaliannya ikut diperiksa — uji yang meninggalkan data berubah
 * akan membuat uji berikutnya gagal tanpa sebab yang jelas.
 */
async function ujiPanelTarifEfektif() {
  const pemilik = await db.pengguna.findFirst({
    where: { peran: "PEMILIK" },
    select: { email: true, tokoId: true },
    orderBy: { dibuatPada: "asc" },
  });
  if (!pemilik) return;

  const semula = await db.toko.findUnique({
    where: { id: pemilik.tokoId },
    select: { rezimPajak: true, tarifBadanBps: true, pakai31E: true },
  });
  if (!semula) return;

  const cookie = await cookieSesi(pemilik.email);
  if (!cookie) return;

  try {
    await db.toko.update({
      where: { id: pemilik.tokoId },
      data: { rezimPajak: "PEMBUKUAN_BADAN", tarifBadanBps: 2200, pakai31E: true },
    });

    const isi = await (
      await ambil("/app/pengaturan/pajak", { headers: { cookie } })
    ).text();

    periksa("isian PPh badan usaha muncul pada rezimnya", /name="tarifBadanPersen"/.test(isi));
    periksa(
      "fasilitas Pasal 31E disebut sebagai tarif efektif, bukan cuma potongan 50%",
      /Tarif efektif/i.test(isi) && isi.includes("11%"),
    );
    periksa("tarif asalnya ikut disebut supaya asal angkanya terlihat", isi.includes("22%"));
  } finally {
    await db.toko.update({ where: { id: pemilik.tokoId }, data: semula });
  }

  const kembali = await db.toko.findUnique({
    where: { id: pemilik.tokoId },
    select: { rezimPajak: true },
  });
  periksa("rezim toko uji sudah dikembalikan", kembali?.rezimPajak === semula.rezimPajak);
}

// ── Jalankan ────────────────────────────────────────────────────────────────

async function utama() {
  console.log(`[1mUji asap Catad[0m — ${BASIS}`);

  try {
    await ujiHttp();
  } catch (galat) {
    gagal += 1;
    kegagalan.push(`Pengujian HTTP terhenti: ${galat.message}`);
    console.log(`  [31mGAGAL[0m pengujian HTTP terhenti — ${galat.message}`);
  }

  try {
    await ujiData();
  } catch (galat) {
    gagal += 1;
    kegagalan.push(`Pengujian data terhenti: ${galat.message}`);
    console.log(`  [31mGAGAL[0m pengujian data terhenti — ${galat.message}`);
  }

  try {
    await ujiPengalihan();
  } catch (galat) {
    gagal += 1;
    kegagalan.push(`Pengujian pengalihan terhenti: ${galat.message}`);
  }

  try {
    await ujiHakAkses();
  } catch (galat) {
    gagal += 1;
    kegagalan.push(`Pengujian hak akses terhenti: ${galat.message}`);
  }

  try {
    await ujiLangganan();
  } catch (galat) {
    gagal += 1;
    kegagalan.push(`Pengujian langganan terhenti: ${galat.message}`);
    console.log(`[31mGAGAL[0m pengujian langganan terhenti — ${galat.message}`);
  }

  try {
    await ujiPanelOperator();
  } catch (galat) {
    gagal += 1;
    kegagalan.push(`Pengujian panel operator terhenti: ${galat.message}`);
    console.log(`[31mGAGAL[0m pengujian panel operator terhenti — ${galat.message}`);
  }

  try {
    await ujiLaporanPajak();
  } catch (galat) {
    gagal += 1;
    kegagalan.push(`Pengujian laporan pajak terhenti: ${galat.message}`);
  }

  console.log("");
  console.log("─".repeat(64));
  console.log(`Hasil: [32m${lulus} lulus[0m, ${gagal > 0 ? `[31m${gagal} gagal[0m` : "0 gagal"}`);

  if (kegagalan.length > 0) {
    console.log("\nYang gagal:");
    for (const k of kegagalan) console.log(`  - ${k}`);
  }

  await db.$disconnect();
  process.exit(gagal > 0 ? 1 : 0);
}

utama();
