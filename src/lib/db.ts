import { PrismaClient } from "@prisma/client";

/**
 * Satu instance Prisma untuk seluruh proses.
 * Di mode dev, Next melakukan hot-reload sehingga instance disimpan di
 * globalThis agar tidak membuka koneksi baru setiap perubahan file.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
