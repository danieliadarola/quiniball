/**
 * Verifica la lógica de registro / verificación de email / login (capa de datos)
 * contra la BD real. Replica lo que hacen las Server Actions, sin la capa HTTP.
 * Uso:  node --env-file=.env.local scripts/check-register-login.mjs
 */
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, service, { auth: { persistSession: false } });

const email = `test_${Date.now()}@example.com`;
const pin = "1234";
const code = "482915";
let profileId = null;

const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); process.exitCode = 1; };

try {
  // 1) Registro: email OBLIGATORIO, sin verificar.
  const pin_hash = await bcrypt.hash(pin, 10);
  const { data: created, error: insErr } = await admin
    .from("profiles")
    .insert({ display_name: "Test RL", email, pin_hash, email_verified: false })
    .select("id, email_verified")
    .single();
  if (insErr) throw new Error("registro: " + insErr.message);
  profileId = created.id;
  if (created.email_verified === false) ok(`Registro: perfil sin verificar (${profileId.slice(0, 8)}…)`);
  else fail("Registro: debería nacer sin verificar");

  // 2) Email NOT NULL: insertar sin email debe fallar.
  const { error: noEmailErr } = await admin
    .from("profiles")
    .insert({ display_name: "Sin email", pin_hash });
  if (noEmailErr) ok("Email obligatorio: insert sin email rechazado por la BD");
  else fail("Email obligatorio: insert sin email NO rechazado (inesperado)");

  // 3) Emisión del código de verificación.
  const code_hash = await bcrypt.hash(code, 10);
  const { error: vErr } = await admin.from("email_verifications").upsert({
    profile_id: profileId,
    code_hash,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    attempts: 0,
    last_sent_at: new Date().toISOString(),
  });
  if (vErr) throw new Error("emisión código: " + vErr.message);
  ok("Verificación: código emitido y guardado (hash)");

  // 4) Código incorrecto -> rechazado.
  const { data: vrow } = await admin
    .from("email_verifications")
    .select("code_hash, expires_at, attempts")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (vrow && !(await bcrypt.compare("000000", vrow.code_hash))) ok("Código incorrecto: rechazado");
  else fail("Código incorrecto: aceptado (inesperado)");

  // 5) Código correcto -> verifica, limpia código y bloqueo.
  if (vrow && Date.parse(vrow.expires_at) > Date.now() && (await bcrypt.compare(code, vrow.code_hash))) {
    await admin.from("profiles").update({ email_verified: true, failed_attempts: 0, locked_until: null }).eq("id", profileId);
    await admin.from("email_verifications").delete().eq("profile_id", profileId);
    const { data: after } = await admin.from("profiles").select("email_verified").eq("id", profileId).single();
    if (after.email_verified === true) ok("Código correcto: email verificado y código eliminado");
    else fail("Código correcto: no se marcó verificado");
  } else {
    fail("Código correcto: comparación falló (inesperado)");
  }

  // 6) Login: PIN correcto / incorrecto.
  const { data: found } = await admin
    .from("profiles")
    .select("id, pin_hash, email_verified")
    .eq("email", email)
    .maybeSingle();
  if (found?.email_verified && (await bcrypt.compare(pin, found.pin_hash))) ok("Login: verificado + PIN correcto -> aceptado");
  else fail("Login: PIN correcto rechazado (inesperado)");
  if (found && !(await bcrypt.compare("0000", found.pin_hash))) ok("Login: PIN incorrecto -> rechazado");
  else fail("Login: PIN incorrecto aceptado (inesperado)");

  // 7) Bloqueo anti-fuerza-bruta: 5 fallos -> locked_until futuro.
  await admin.from("profiles").update({
    failed_attempts: 0,
    locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  }).eq("id", profileId);
  const { data: locked } = await admin.from("profiles").select("locked_until").eq("id", profileId).single();
  if (locked.locked_until && Date.parse(locked.locked_until) > Date.now()) ok("Bloqueo: locked_until aplicado");
  else fail("Bloqueo: no se aplicó (inesperado)");

  // 8) Email duplicado bloqueado por la BD.
  const { error: dupErr } = await admin
    .from("profiles")
    .insert({ display_name: "Dup", email, pin_hash, email_verified: false });
  if (dupErr && dupErr.code === "23505") ok("Email duplicado: bloqueado por la BD (23505)");
  else fail("Email duplicado: NO bloqueado (inesperado)");
} catch (e) {
  fail(e.message);
} finally {
  if (profileId) {
    await admin.from("email_verifications").delete().eq("profile_id", profileId);
    await admin.from("profiles").delete().eq("id", profileId);
    console.log("   · Datos de prueba eliminados.");
  }
}
