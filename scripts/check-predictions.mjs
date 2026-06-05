/**
 * Verifica el flujo de pronósticos con RLS real:
 *  - un miembro puede crear su pronóstico antes del kickoff,
 *  - solo ve los suyos (los ajenos quedan ocultos hasta el inicio del partido),
 *  - un ajeno al grupo no puede insertar.
 * Uso: node --env-file=.env.local scripts/check-predictions.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);

const admin = createClient(url, service, { auth: { persistSession: false } });
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); process.exitCode = 1; };

async function mint(profileId) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(profileId).setAudience("authenticated")
    .setIssuedAt(now).setExpirationTime(now + 3600).sign(secret);
}
const clientFor = (token) =>
  createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

async function newProfile(name) {
  const { data } = await admin.from("profiles")
    .insert({ display_name: name, pin_hash: "x" }).select("id").single();
  return data.id;
}

const owner = await newProfile("Organizador");
const joiner = await newProfile("Compañero");
const outsider = await newProfile("Ajeno");
let groupId = null;
const MATCH = 1; // México vs Sudáfrica, 11-jun (en el futuro): el cierre está abierto.

try {
  const ownerSb = clientFor(await mint(owner));
  const joinerSb = clientFor(await mint(joiner));
  const outsiderSb = clientFor(await mint(outsider));

  const { data: g, error: cErr } = await ownerSb.rpc("create_group", {
    p_name: "Porra Pronósticos", p_mode: "mixto", p_knockout: "phased",
    p_lock: "per_match", p_join_code: "PRD123", p_extras: [],
  }).single();
  if (cErr) throw new Error("create_group: " + cErr.message);
  groupId = g.id;
  await joinerSb.rpc("join_group", { p_code: "PRD123" });
  ok("Quiniela creada y compañero unido");

  // 1) El organizador crea su pronóstico (antes del kickoff) → permitido
  const { error: insErr } = await ownerSb.from("predictions").insert({
    group_id: groupId, profile_id: owner, match_number: MATCH,
    pred_home_goals: 2, pred_away_goals: 1,
  });
  insErr ? fail("No se pudo crear el pronóstico propio: " + insErr.message)
         : ok("El organizador crea su pronóstico antes del kickoff");

  // 2) Lee el suyo
  const { data: own } = await ownerSb.from("predictions")
    .select("pred_home_goals, pred_away_goals").eq("group_id", groupId).eq("match_number", MATCH).maybeSingle();
  own && own.pred_home_goals === 2 ? ok("El organizador ve su propio pronóstico")
                                   : fail("El organizador no ve su pronóstico");

  // 3) El compañero NO ve el pronóstico ajeno antes del kickoff (anti-trampas)
  const { data: spy } = await joinerSb.from("predictions")
    .select("id").eq("group_id", groupId).eq("profile_id", owner).maybeSingle();
  spy ? fail("FUGA: un miembro ve el pronóstico ajeno antes del kickoff")
      : ok("Los pronósticos ajenos quedan ocultos hasta el kickoff (RLS)");

  // 4) Un ajeno al grupo no puede insertar
  const { error: outErr } = await outsiderSb.from("predictions").insert({
    group_id: groupId, profile_id: outsider, match_number: MATCH, pred_outcome: "1",
  });
  outErr ? ok("Un ajeno no puede pronosticar en una quiniela que no es suya (RLS)")
         : fail("FUGA: un ajeno pudo insertar un pronóstico");

  // 5) Upsert: actualizar el propio pronóstico (mismo onConflict que la app)
  const { error: upErr } = await ownerSb.from("predictions").upsert({
    group_id: groupId, profile_id: owner, match_number: MATCH,
    pred_home_goals: 3, pred_away_goals: 0,
  }, { onConflict: "group_id,profile_id,match_number" });
  const { data: updated } = await ownerSb.from("predictions")
    .select("pred_home_goals").eq("group_id", groupId).eq("match_number", MATCH).maybeSingle();
  !upErr && updated?.pred_home_goals === 3 ? ok("El upsert actualiza el pronóstico propio")
                                           : fail("El upsert no actualizó el pronóstico");
} catch (e) {
  fail(e.message);
} finally {
  if (groupId) await admin.from("groups").delete().eq("id", groupId);
  await admin.from("profiles").delete().in("id", [owner, joiner, outsider]);
  console.log("   · Datos de prueba eliminados.");
}
