#!/usr/bin/env bash
#
# Dijalankan DI SERVER oleh GitHub Actions setelah berkas proyek disalin.
# Sengaja disimpan di repositori supaya langkah deploy bisa dibaca dan diaudit,
# bukan tersembunyi sebagai untaian perintah panjang di dalam berkas workflow.
#
set -euo pipefail

cd "$(dirname "$0")/.."
echo "==> Direktori kerja: $(pwd)"

# ── 1. Berkas lingkungan ────────────────────────────────────────────────────
# Dibuat sekali saat deploy pertama, lalu TIDAK PERNAH ditimpa. Kalau sandi
# basis data berubah di deploy berikutnya, volume Postgres yang sudah ada akan
# menolak koneksi dan seluruh data jadi tidak bisa dibuka.
if [ ! -f .env ]; then
  echo "==> .env belum ada, membuat yang baru dengan rahasia acak"

  acak() {
    if command -v openssl >/dev/null 2>&1; then
      openssl rand -hex "$1"
    else
      head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
    fi
  }

  SANDI_DB="$(acak 24)"
  RAHASIA_JWT="$(acak 32)"

  cat > .env <<EOF
# Dibuat otomatis saat deploy pertama pada $(date -u +"%Y-%m-%dT%H:%M:%SZ").
# Berkas ini TIDAK ditimpa oleh deploy berikutnya — aman untuk disunting.
POSTGRES_USER=catad
POSTGRES_PASSWORD=${SANDI_DB}
POSTGRES_DB=catad

JWT_SECRET=${RAHASIA_JWT}

# Setel true HANYA bila aplikasi diakses lewat HTTPS. Kalau masih HTTP biasa
# dan ini true, cookie sesi tidak akan pernah terkirim dan login selalu gagal.
COOKIE_SECURE=false

# Sengaja false di server: data demo memakai kata sandi yang tertulis di
# README (demo@catad.id / catad123). Ubah ke true sebentar bila memang ingin
# mengisi contoh data, lalu kembalikan ke false.
SEED_DEMO=false
EOF

  chmod 600 .env
  echo "==> .env dibuat (sandi basis data dan JWT_SECRET diacak)"
else
  echo "==> .env sudah ada, dipertahankan apa adanya"
fi

# ── 2. Bangun dan jalankan ──────────────────────────────────────────────────
echo "==> Membangun image"
docker compose build

echo "==> Menjalankan layanan"
# Layanan "migrasi" berjalan lebih dulu dan menerapkan migrasi basis data;
# layanan "app" baru dinyalakan setelah migrasi selesai tanpa galat.
docker compose up -d --remove-orphans

# ── 3. Tunggu sampai aplikasi benar-benar melayani ──────────────────────────
echo "==> Menunggu aplikasi sehat"
sehat=0
for _ in $(seq 1 40); do
  if curl -fsS --max-time 5 http://127.0.0.1:1061/api/health >/dev/null 2>&1; then
    sehat=1
    break
  fi
  sleep 3
done

if [ "$sehat" -ne 1 ]; then
  echo "!!! Aplikasi tidak kunjung sehat. Log 60 baris terakhir:" >&2
  docker compose logs --tail 60 app >&2 || true
  docker compose logs --tail 30 migrasi >&2 || true
  exit 1
fi

echo "==> Sehat: $(curl -fsS http://127.0.0.1:1061/api/health)"

# ── 4. Bersih-bersih ────────────────────────────────────────────────────────
# Image lama menumpuk setiap deploy dan bisa memenuhi disk server.
docker image prune -f >/dev/null 2>&1 || true

echo "==> Deploy selesai"
docker compose ps
