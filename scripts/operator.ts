/**
 * Mengelola akun operator panel Catad.
 *
 * Akun operator SENGAJA hanya bisa dibuat dari sini, tidak lewat halaman
 * pendaftaran. Panel operator bisa melihat dan mengubah seluruh toko; kalau ada
 * jalur pendaftaran mandiri, siapa pun yang menemukan alamatnya bisa mencoba
 * membuat akun. Satu-satunya cara masuk adalah lewat akses ke server.
 *
 * Pakai:
 *   npm run operator                              -- daftar akun operator
 *   npm run operator -- buat <email> "<nama>"     -- buat akun, sandi diacak
 *   npm run operator -- buat <email> "<nama>" <sandi>
 *   npm run operator -- sandi <email> [sandi]     -- ganti kata sandi
 *   npm run operator -- matikan <email>           -- nonaktifkan akun
 *   npm run operator -- nyalakan <email>          -- aktifkan kembali
 *   npm run operator -- buka <email>              -- lepas kunci gagal masuk
 *
 * Di server, jalankan lewat image migrasi (container app memakai output
 * standalone Next.js yang tidak memuat tsx maupun Prisma CLI):
 *   docker compose run --rm --no-deps migrasi npx tsx scripts/operator.ts
 */

import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function sandiAcak(): string {
  // 12 bita menjadi 16 aksara base64url — cukup kuat, dan masih bisa dibacakan
  // lewat telepon tanpa aksara yang membingungkan.
  return randomBytes(12).toString("base64url");
}

function tanggal(nilai: Date | null): string {
  if (!nilai) return "belum pernah";
  return nilai.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

async function cariAtauKeluar(email: string) {
  const operator = await db.operator.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, nama: true, email: true },
  });
  if (!operator) {
    console.error(`Operator dengan email "${email}" tidak ditemukan.`);
    process.exit(1);
  }
  return operator;
}

async function daftar() {
  const semua = await db.operator.findMany({
    select: {
      nama: true,
      email: true,
      aktif: true,
      masukTerakhir: true,
      terkunciSampai: true,
      gagalMasuk: true,
      dibuatPada: true,
    },
    orderBy: { dibuatPada: "asc" },
  });

  if (semua.length === 0) {
    console.log("Belum ada akun operator. Panel tidak bisa dibuka siapa pun.");
    console.log("");
    console.log('Buat akun pertama:  npm run operator -- buat operator@catad.id "Nama Anda"');
    return;
  }

  console.log(`${semua.length} akun operator:`);
  console.log("");
  const sekarang = new Date();
  for (const o of semua) {
    const terkunci = o.terkunciSampai && o.terkunciSampai > sekarang;
    console.log(`  ${o.nama} <${o.email}>`);
    console.log(`    status        : ${o.aktif ? "aktif" : "NONAKTIF"}${terkunci ? " — TERKUNCI" : ""}`);
    console.log(`    masuk terakhir: ${tanggal(o.masukTerakhir)}`);
    if (terkunci) {
      console.log(`    terkunci s/d  : ${tanggal(o.terkunciSampai)} (${o.gagalMasuk} gagal)`);
    }
    console.log("");
  }
}

async function buat(email: string, nama: string, sandiDiberikan?: string) {
  const bersih = email.toLowerCase().trim();

  if (!bersih.includes("@")) {
    console.error(`"${email}" bukan alamat email yang sah.`);
    process.exit(1);
  }
  if (!nama || nama.trim().length < 2) {
    console.error("Nama operator wajib diisi, minimal 2 aksara.");
    process.exit(1);
  }
  if (sandiDiberikan && sandiDiberikan.length < 10) {
    console.error("Kata sandi operator minimal 10 aksara.");
    process.exit(1);
  }

  const sudahAda = await db.operator.findUnique({ where: { email: bersih }, select: { id: true } });
  if (sudahAda) {
    console.error(`Email "${bersih}" sudah dipakai. Untuk mengganti sandinya:`);
    console.error(`  npm run operator -- sandi ${bersih}`);
    process.exit(1);
  }

  const sandi = sandiDiberikan ?? sandiAcak();

  await db.operator.create({
    data: {
      nama: nama.trim(),
      email: bersih,
      kataSandiHash: await bcrypt.hash(sandi, 10),
    },
  });

  console.log("Akun operator dibuat.");
  console.log("");
  console.log(`  Email      : ${bersih}`);
  console.log(`  Kata sandi : ${sandi}`);
  console.log("");
  if (!sandiDiberikan) {
    console.log("Kata sandi ini hanya ditampilkan sekali. Simpan sekarang.");
  }
  console.log("Masuk lewat /admin/masuk.");
}

async function gantiSandi(email: string, sandiDiberikan?: string) {
  if (sandiDiberikan && sandiDiberikan.length < 10) {
    console.error("Kata sandi operator minimal 10 aksara.");
    process.exit(1);
  }

  const operator = await cariAtauKeluar(email);
  const sandi = sandiDiberikan ?? sandiAcak();

  await db.operator.update({
    where: { id: operator.id },
    data: {
      kataSandiHash: await bcrypt.hash(sandi, 10),
      // Ganti sandi sekaligus melepas kunci — kalau tidak, operator yang baru
      // menerima sandi barunya masih harus menunggu kuncinya lewat.
      gagalMasuk: 0,
      terkunciSampai: null,
    },
  });

  console.log(`Kata sandi ${operator.email} diganti.`);
  console.log("");
  console.log(`  Kata sandi : ${sandi}`);
}

async function ubahAktif(email: string, aktif: boolean) {
  const operator = await cariAtauKeluar(email);

  await db.operator.update({ where: { id: operator.id }, data: { aktif } });

  console.log(`${operator.email} ${aktif ? "diaktifkan" : "dinonaktifkan"}.`);
  if (!aktif) {
    console.log("Sesi yang sedang berjalan juga langsung berhenti — akunnya");
    console.log("diperiksa ulang ke basis data pada setiap halaman panel.");
  }
}

async function bukaKunci(email: string) {
  const operator = await cariAtauKeluar(email);
  await db.operator.update({
    where: { id: operator.id },
    data: { gagalMasuk: 0, terkunciSampai: null },
  });
  console.log(`Kunci gagal masuk untuk ${operator.email} dilepas.`);
}

async function utama() {
  const arg = process.argv.slice(2).filter((a) => a.trim() !== "");

  if (arg.length === 0) {
    await daftar();
    return;
  }

  const perintah = arg[0].toLowerCase();

  switch (perintah) {
    case "buat":
      if (arg.length < 3) {
        console.error('Pakai: npm run operator -- buat <email> "<nama>" [sandi]');
        process.exit(1);
      }
      await buat(arg[1], arg[2], arg[3]);
      return;

    case "sandi":
      if (arg.length < 2) {
        console.error("Pakai: npm run operator -- sandi <email> [sandi]");
        process.exit(1);
      }
      await gantiSandi(arg[1], arg[2]);
      return;

    case "matikan":
    case "nyalakan":
      if (arg.length < 2) {
        console.error(`Pakai: npm run operator -- ${perintah} <email>`);
        process.exit(1);
      }
      await ubahAktif(arg[1], perintah === "nyalakan");
      return;

    case "buka":
      if (arg.length < 2) {
        console.error("Pakai: npm run operator -- buka <email>");
        process.exit(1);
      }
      await bukaKunci(arg[1]);
      return;

    default:
      console.error(`Perintah "${perintah}" tidak dikenali.`);
      console.error("Yang tersedia: buat, sandi, matikan, nyalakan, buka.");
      console.error("Tanpa argumen menampilkan daftar akun.");
      process.exit(1);
  }
}

utama()
  .catch((galat) => {
    console.error("Gagal:", galat);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
