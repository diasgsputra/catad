/**
 * Pengisi data demo lewat baris perintah.
 *
 * Dijalankan container migrasi setelah `prisma migrate deploy`, dan bisa juga
 * dipanggil manual dengan `npm run db:seed`. Logikanya sendiri ada di
 * `src/lib/data-demo.ts` supaya tombol "coba akun demo" di halaman masuk
 * memakai implementasi yang sama persis.
 */

import { PrismaClient } from "@prisma/client";
import { AKUN_DEMO, buatDataDemo, dataDemoAda } from "../src/lib/data-demo";

const db = new PrismaClient();

async function utama() {
  if (process.env.SEED_DEMO === "false") {
    console.log("SEED_DEMO=false — data demo dilewati.");
    console.log("Data demo tetap bisa dibuat kapan saja lewat tombol di halaman masuk.");
    return;
  }

  if (await dataDemoAda(db)) {
    console.log("Data demo sudah ada — tidak diisi ulang.");
    return;
  }

  console.log("Mengisi data demo Catad…");
  const ringkasan = await buatDataDemo(db);

  console.log("");
  console.log("Selesai. Akun yang bisa dipakai:");
  console.log(`  Pemilik (Pro)     : ${AKUN_DEMO.pemilik.email} / ${AKUN_DEMO.pemilik.sandi}`);
  console.log(`  Kasir             : ${AKUN_DEMO.kasir.email} / ${AKUN_DEMO.kasir.sandi}`);
  console.log(`  Toko lain (Gratis): ${AKUN_DEMO.kedua.email} / ${AKUN_DEMO.kedua.sandi}`);
  console.log("");

  for (const t of ringkasan) {
    console.log(
      `  ${t.toko}: ${t.produk} barang, ${t.transaksi} transaksi, omzet Rp${t.omzet.toLocaleString("id-ID")}`,
    );
  }
}

utama()
  .catch((galat) => {
    console.error("Gagal mengisi data demo:", galat);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
