/**
 * Preferencias de notificaciones del usuario (por cuenta). GET devuelve los 4
 * interruptores (por defecto todo a true si no hay fila); POST los guarda.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULTS = { close: true, result: true, phase: true, rank: true };
type Prefs = typeof DEFAULTS;

function clean(body: Partial<Record<keyof Prefs, unknown>> | null): Prefs {
  return {
    close: body?.close !== false,
    result: body?.result !== false,
    phase: body?.phase !== false,
    rank: body?.rank !== false,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data } = (await admin
    .from("push_prefs")
    .select("close, result, phase, rank")
    .eq("profile_id", session.sub)
    .maybeSingle()) as { data: Prefs | null };
  return NextResponse.json({ ok: true, prefs: data ?? DEFAULTS });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Partial<Prefs> | null;
  const prefs = clean(body);
  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("push_prefs")
    .upsert({ profile_id: session.sub, ...prefs, updated_at: new Date().toISOString() }, {
      onConflict: "profile_id",
    });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, prefs });
}
