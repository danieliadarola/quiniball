/**
 * Verifica el núcleo resultado → recálculo con datos reales (modelo único):
 *  - 1X2 en un partido normal (3 pts) y marcador exacto en el "partido de la
 *    jornada" (1X2 + exacto = 8 pts),
 *  - la RPC atómica `apply_match_result` (service_role) escribe marcador + puntos,
 *  - el ranking (vista standings) refleja el total correcto,
 *  - SEGURIDAD: un usuario autenticado NO puede llamar a apply_match_result.
 *
 * Uso: node --env-file=.env.local scripts/check-results.mjs
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
  const email = `res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`;
  const { data } = await admin.from("profiles")
    .insert({ display_name: name, email, pin_hash: "x", email_verified: true }).select("id").single();
  return data.id;
}

const p = await newProfile("Jugador R");
let g = null;
const NORMAL = 1; // partido normal -> 1X2
const { data: md } = await admin.from("matchdays")
  .select("featured_match_number").eq("code", "J1").single();
const FEATURED = md.featured_match_number; // partido de la jornada 1

try {
  const sb = clientFor(await mint(p));

  const { data: grp, error: gErr } = await sb.rpc("create_group", {
    p_name: "Liga R", p_join_code: "RESR01",
  }).single();
  if (gErr) throw new Error("create_group: " + gErr.message);
  g = grp.id;
  ok(`Quiniela creada (destacado J1 = partido #${FEATURED})`);

  // Pronósticos: 1X2 en el normal, marcador exacto en el destacado.
  await sb.from("predictions").insert({ group_id: g, profile_id: p, match_number: NORMAL, pred_outcome: "1" });
  await sb.from("predictions").insert({ group_id: g, profile_id: p, match_number: FEATURED, pred_home_goals: 2, pred_away_goals: 1 });

  const { data: predN } = await admin.from("predictions").select("id").eq("group_id", g).eq("match_number", NORMAL).single();
  const { data: predF } = await admin.from("predictions").select("id").eq("group_id", g).eq("match_number", FEATURED).single();

  // Aplicación atómica (service_role): normal 2-1 (3 pts) y destacado 2-1 (8 pts).
  let r = await admin.rpc("apply_match_result", { p_match_number: NORMAL, p_home: 2, p_away: 1, p_points: [{ id: predN.id, points: 3 }] });
  if (r.error) throw new Error("apply normal: " + r.error.message);
  r = await admin.rpc("apply_match_result", { p_match_number: FEATURED, p_home: 2, p_away: 1, p_points: [{ id: predF.id, points: 8 }] });
  if (r.error) throw new Error("apply destacado: " + r.error.message);
  ok("RPC apply_match_result OK con service_role (tras el revoke)");

  // Ranking: 3 (normal) + 8 (destacado) = 11, 1 marcador exacto.
  const { data: s } = await admin.from("standings")
    .select("total_points, exact_hits, outcome_hits").eq("group_id", g).single();
  s.total_points === 11 && s.exact_hits === 1
    ? ok("Standings: 11 pts (3 normal + 8 destacado), 1 exacto ✔")
    : fail(`Standings inesperado: ${JSON.stringify(s)}`);

  // SEGURIDAD: un usuario autenticado NO debe poder aplicar resultados.
  const r2 = await sb.rpc("apply_match_result", { p_match_number: NORMAL, p_home: 9, p_away: 9, p_points: [] });
  if (r2.error) ok(`Seguridad: usuario normal NO puede aplicar resultados (${r2.error.code ?? "denegado"})`);
  else fail("Seguridad: un usuario normal pudo llamar apply_match_result (¡FALLO!)");
} catch (e) {
  fail(e.message);
} finally {
  if (g) await admin.from("groups").delete().eq("id", g);
  await admin.from("profiles").delete().eq("id", p);
  await admin.from("matches").update({ home_goals: null, away_goals: null, status: "scheduled" })
    .in("match_number", [NORMAL, FEATURED]);
  console.log("   · Datos de prueba eliminados y partidos restaurados.");
}
