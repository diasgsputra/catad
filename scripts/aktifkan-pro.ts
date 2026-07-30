/**
 * Mengaktifkan paket Pro sebuah toko setelah pembayaran diterima.
 *
 * Pengaktifan sengaja hanya bisa dilakukan dari sini, bukan dari dalam
 * aplikasi. Server action adalah endpoint yang bisa dipanggil siapa pun yang
 * punya sesi, jadi aksi "aktifkan Pro" di sisi pengguna sama artinya dengan
 * membagikan paket Pro gratis. Yang bisa dilakukan pengguna hanyalah mengajukan
 * langganan; keputusan mengaktifkan ada di tangan operator setelah dana masuk.
 *
 * Pakai:
 *   npm run pro                          -- lihat daftar pengajuan yang menunggu
 *   npm run pro -- <slug|email>          -- aktifkan 1 bulan
 *   npm run pro -- <slug|email> tahunan  -- aktifkan 1 tahun
 *
 * Di server, jalankan lewat image `migrasi`. Container `app` memakai output
 * standalone Next.js yang tidak memuat tsx maupun Prisma CLI:
 *   docker compose run --rm --no-deps migrasi npx tsx scripts/aktifkan-pro.ts <slug|email>
 */

import { PrismaClient } from "@prisma/client";
import { tambahHari } from "../src/lib/format";
import { HARGA_PRO_BULANAN, HARGA_PRO_TAHUNAN } from "../src/lib/plan";

const db = new PrismaClient();

function rupiah(nilai: number): string {
  return `Rp${nilai.toLocaleString("id-ID")}`;
}

function tanggal(nilai: Date): string {
  return nilai.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Daftar pengajuan yang belum dikonfirmasi. */
async function tampilkanPengajuan() {
  const menunggu = await db.langganan.findMany({
    where: { status: "MENUNGGU" },
    select: {
      jumlah: true,
      dibuatPada: true,
      toko: {
        select: {
          nama: true,
          slug: true,
          pengguna: {
            where: { peran: "PEMILIK" },
            select: { email: true },
            orderBy: { dibuatPada: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { dibuatPada: "asc" },
  });

  if (menunggu.length === 0) {
    console.log("Tidak ada pengajuan yang menunggu konfirmasi.");
    console.log("");
    console.log("Untuk mengaktifkan langsung: npm run pro -- <slug|email> [bulanan|tahunan]");
    return;
  }

  console.log(`${menunggu.length} pengajuan menunggu konfirmasi:`);
  console.log("");
  for (const m of menunggu) {
    const email = m.toko.pengguna[0]?.email ?? "(pemilik tidak ditemukan)";
    console.log(`  ${m.toko.nama}`);
    console.log(`    slug   : ${m.toko.slug}`);
    console.log(`    email  : ${email}`);
    console.log(`    jumlah : ${rupiah(m.jumlah)}`);
    console.log(`    diajukan: ${tanggal(m.dibuatPada)}`);
    console.log("");
  }
  console.log("Aktifkan dengan: npm run pro -- <slug|email> [bulanan|tahunan]");
}

async function aktifkan(kunci: string, siklus: "BULANAN" | "TAHUNAN") {
  // Diterima slug toko maupun email pemiliknya — mana saja yang lebih mudah
  // dibaca dari pesan WhatsApp yang masuk.
  const toko = await db.toko.findFirst({
    where: {
      OR: [{ slug: kunci }, { pengguna: { some: { email: kunci.toLowerCase() } } }],
    },
    select: { id: true, nama: true, slug: true, proSampai: true, paket: true },
  });

  if (!toko) {
    console.error(`Toko tidak ditemukan untuk "${kunci}".`);
    console.error("Jalankan tanpa argumen untuk melihat daftar pengajuan.");
    process.exit(1);
  }

  const sekarang = new Date();
  const hari = siklus === "TAHUNAN" ? 365 : 30;
  const jumlah = siklus === "TAHUNAN" ? HARGA_PRO_TAHUNAN : HARGA_PRO_BULANAN;

  // Kalau langganan lama masih berjalan, periode baru menyambung dari sisanya
  // supaya hari yang sudah dibayar tidak hangus.
  const mulai = toko.proSampai && toko.proSampai > sekarang ? toko.proSampai : sekarang;
  const sampai = tambahHari(mulai, hari);

  const pengajuan = await db.langganan.findFirst({
    where: { tokoId: toko.id, status: "MENUNGGU" },
    select: { id: true },
    orderBy: { dibuatPada: "asc" },
  });

  await db.$transaction([
    db.toko.update({
      where: { id: toko.id },
      data: { paket: "PRO", proSampai: sampai },
    }),
    // Pengajuan yang ada dipakai ulang supaya riwayatnya tetap satu baris per
    // pembayaran, bukan satu "menunggu" menggantung plus satu "aktif".
    pengajuan
      ? db.langganan.update({
          where: { id: pengajuan.id },
          data: {
            jumlah,
            periodeMulai: mulai,
            periodeSelesai: sampai,
            status: "AKTIF",
          },
        })
      : db.langganan.create({
          data: {
            tokoId: toko.id,
            paket: "PRO",
            jumlah,
            periodeMulai: mulai,
            periodeSelesai: sampai,
            status: "AKTIF",
            metode: "TRANSFER_BCA",
          },
        }),
  ]);

  console.log(`Paket Pro aktif untuk ${toko.nama} (${toko.slug}).`);
  console.log(`  Siklus : ${siklus === "TAHUNAN" ? "tahunan" : "bulanan"} — ${rupiah(jumlah)}`);
  console.log(`  Berlaku: ${tanggal(mulai)} sampai ${tanggal(sampai)}`);
  if (!pengajuan) {
    console.log("  Catatan: tidak ada pengajuan menunggu, dicatat sebagai langganan baru.");
  }
}

async function utama() {
  const argumen = process.argv.slice(2).filter((a) => a.trim() !== "");

  if (argumen.length === 0) {
    await tampilkanPengajuan();
    return;
  }

  const kunci = argumen[0];
  const siklusMentah = (argumen[1] ?? "bulanan").toLowerCase();

  if (siklusMentah !== "bulanan" && siklusMentah !== "tahunan") {
    console.error(`Siklus "${siklusMentah}" tidak dikenali. Pakai "bulanan" atau "tahunan".`);
    process.exit(1);
  }

  await aktifkan(kunci, siklusMentah === "tahunan" ? "TAHUNAN" : "BULANAN");
}

utama()
  .catch((galat) => {
    console.error("Gagal mengaktifkan paket Pro:", galat);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
