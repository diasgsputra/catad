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
