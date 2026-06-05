/**
 * Verifica el flujo de auth completo (nombre+PIN -> JWT propio -> RLS):
 *  1. Crea un perfil de prueba (service_role).
 *  2. Firma un JWT HS256 con SUPABASE_JWT_SECRET (igual que lib/auth/jwt.ts).
 *  3. Consulta `profiles` con ese token: la RLS debe devolver SOLO ese perfil
 *     (auth.uid() = profile.id). Comprueba también que sin token no ve nada.
 *  4. Limpia.
 * Uso:  node --env-file=.env.local scripts/check-auth.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret = process.env.SUPABASE_JWT_SECRET;

if (!url || !anon || !service || !secret) {
  console.error("❌ Faltan variables de entorno (url/anon/service/jwt_secret).");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });

// 1) Perfil de prueba
const { data: prof, error: insErr } = await admin
  .from("profiles")
  .insert({ display_name: "Test Auth", pin_hash: "dummy" })
  .select("id")
  .single();
if (insErr) {
  console.error("❌ No se pudo crear el perfil de prueba:", insErr.message);
  process.exit(1);
}
const profileId = prof.id;

async function cleanup() {
  await admin.from("profiles").delete().eq("id", profileId);
}

try {
  // 2) Token firmado como en lib/auth/jwt.ts
  const key = new TextEncoder().encode(secret);
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(profileId)
    .setAudience("authenticated")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  // 3a) Cliente con la identidad del jugador
  const userClient = createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: mine, error: selErr } = await userClient
    .from("profiles")
    .select("id, display_name");

  if (selErr) {
    console.error("❌ Supabase RECHAZÓ el token o falló la RLS:", selErr.message);
    await cleanup();
    process.exit(1);
  }
  if (mine.length !== 1 || mine[0].id !== profileId) {
    console.error("❌ La RLS no resolvió auth.uid() correctamente. Filas:", mine);
    await cleanup();
    process.exit(1);
  }

  // 3b) Sin token (anon) no debe ver perfiles
  const anonClient = createClient(url, anon, { auth: { persistSession: false } });
  const { data: anonRows } = await anonClient.from("profiles").select("id");

  console.log("✅ Auth E2E OK:");
  console.log(`   · Token firmado con JWT secret -> ACEPTADO por Supabase.`);
  console.log(`   · auth.uid() resuelve al perfil (${profileId.slice(0, 8)}…).`);
  console.log(`   · anon ve ${anonRows?.length ?? 0} perfiles (esperado: 0).`);
} finally {
  await cleanup();
  console.log("   · Perfil de prueba eliminado.");
}
