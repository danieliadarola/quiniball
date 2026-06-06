/**
 * Endpoint de sincronización automática de resultados.
 *
 * Lo invoca el cron de Supabase (pg_cron + pg_net) cada pocos minutos, y también
 * puede dispararse a mano para pruebas. Protegido por un secreto compartido
 * (CRON_SECRET) en la cabecera `x-cron-secret` o el query `?key=`.
 *
 * Reutiliza el mismo motor de resultados que el panel de admin, así que puntos y
 * ranking quedan consistentes vengan de donde vengan.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { syncResults } from "@/lib/results/sync";

// Toca service_role y red: forzamos Node y ejecución dinámica (sin caché).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const url = new URL(req.url);
  const provided = req.headers.get("x-cron-secret") ?? url.searchParams.get("key") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual exige misma longitud; comparamos primero el tamaño.
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  const report = await syncResults();
  return NextResponse.json(report, { status: report.ok ? 200 : 502 });
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
