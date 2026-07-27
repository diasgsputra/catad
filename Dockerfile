# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────
# Catad — Catat Digital
# Build multi-stage: deps → builder → (migrator | runner)
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ── Dependencies (termasuk devDependencies, dipakai build & migrator) ──
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ── Build Next.js ──
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# URL palsu: hanya agar Prisma Client bisa di-generate saat build.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# ── Migrator: menjalankan migrasi + seed sebelum aplikasi hidup ──
FROM base AS migrator
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY prisma ./prisma
# Pengisi data demo memakai src/lib/data-demo.ts, implementasi yang sama
# dengan tombol "coba akun demo" di aplikasi.
COPY src ./src
RUN npx prisma generate
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts"]

# ── Runner: image tipis berbasis output standalone ──
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
