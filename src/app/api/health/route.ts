import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Dipakai Docker healthcheck dan pemantauan sederhana. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", basisData: "terhubung", waktu: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "galat", basisData: "gagal", waktu: new Date().toISOString() },
      { status: 503 },
    );
  }
}
