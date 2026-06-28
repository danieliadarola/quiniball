/**
 * Alta/baja de una suscripción Web Push del dispositivo actual.
 *
 * Autenticada por la sesión del usuario (cookie). Se guarda con service_role y
 * con el profile_id tomado de la sesión verificada (nunca del cliente), de modo
 * que si el endpoint cambia de cuenta en el mismo navegador, queda reasignado.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  } | null;
  const sub = body?.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ ok: false, error: "Suscripción inválida." }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      profile_id: session.sub,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      user_agent: req.headers.get("user-agent") ?? null,
    },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { endpoint?: string } | null;
  if (!body?.endpoint) return NextResponse.json({ ok: false }, { status: 400 });

  const admin = createSupabaseAdmin();
  await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", body.endpoint)
    .eq("profile_id", session.sub);
  return NextResponse.json({ ok: true });
}
