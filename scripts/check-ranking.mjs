/**
 * Verifica la vista `standings` (ranking) con datos reales:
 *  - suma de puntos por jugador,
 *  - conteo de marcadores exactos y aciertos 1X2,
 *  - orden y desempate del ranking.
 * Usa el cliente admin (service_role) para comprobar el cálculo del SQL sin el
 * filtro de RLS. La visibilidad por RLS ya se valida en check-predictions.mjs.
 *
 * Uso: node --env-file=.env.local scripts/check-ranking.mjs
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

const winner = await newProfile("Acertante");
const loser = await newProfile("Despistado");
let groupId = null;
const MATCH = 1; // México vs Sudáfrica

try {
  const winnerSb = clientFor(await mint(winner));
  const loserSb = clientFor(await mint(loser));

  const { data: g, error: cErr } = await winnerSb.rpc("create_group", {
    p_name: "Porra Ranking", p_mode: "mixto", p_knockout: "phased",
    p_lock: "per_match", p_join_code: "RNK123", p_extras: [],
  }).single();
  if (cErr) throw new Error("create_group: " + cErr.message);
  groupId = g.id;
  await loserSb.rpc("join_group", { p_code: "RNK123" });

  // Pronósticos (antes del kickoff): acertante 2-1 (exacto), despistado 1-1.
  await winnerSb.from("predictions").insert({
    group_id: groupId, profile_id: winner, match_number: MATCH,
    pred_home_goals: 2, pred_away_goals: 1,
  });
  await loserSb.from("predictions").insert({
    group_id: groupId, profile_id: loser, match_number: MATCH,
    pred_home_goals: 1, pred_away_goals: 1,
  });
  ok("Quiniela creada con dos pronósticos");

  // Simulamos el resultado oficial 2-1 y el recálculo de puntos (motor ya testeado).
  await admin.from("matches").update({ home_goals: 2, away_goals: 1, status: "finished" }).eq("match_number", MATCH);
  await admin.from("predictions").update({ points_awarded: 5 }).eq("group_id", groupId).eq("profile_id", winner);
  await admin.from("predictions").update({ points_awarded: 0 }).eq("group_id", groupId).eq("profile_id", loser);

  // Leemos la clasificación (admin: comprobamos el cálculo del SQL).
  const { data: rows, error: sErr } = await admin.from("standings")
    .select("profile_id, display_name, total_points, exact_hits, outcome_hits, rank")
    .eq("group_id", groupId).order("rank", { ascending: true });
  if (sErr) throw new Error("standings: " + sErr.message);

  const first = rows[0];
  const second = rows[1];
  first?.profile_id === winner && first.rank === 1 && first.total_points === 5
    ? ok(`1.º correcto: ${first.display_name} con ${first.total_points} pts`)
    : fail(`1.º inesperado: ${JSON.stringify(first)}`);
  first?.exact_hits === 1 && first?.outcome_hits === 1
    ? ok("Conteo de aciertos del líder correcto (1 exacto, 1 de 1X2)")
    : fail(`Aciertos inesperados: ${JSON.stringify(first)}`);
  second?.profile_id === loser && second.rank === 2 && second.total_points === 0
    ? ok(`2.º correcto: ${second.display_name} con ${second.total_points} pts`)
    : fail(`2.º inesperado: ${JSON.stringify(second)}`);
} catch (e) {
  fail(e.message);
} finally {
  if (groupId) await admin.from("groups").delete().eq("id", groupId);
  await admin.from("profiles").delete().in("id", [winner, loser]);
  // Restaurar el partido maestro (no dejar resultado de prueba).
  await admin.from("matches").update({ home_goals: null, away_goals: null, status: "scheduled" }).eq("match_number", MATCH);
  console.log("   · Datos de prueba eliminados y partido restaurado.");
}
