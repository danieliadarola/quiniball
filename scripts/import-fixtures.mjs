/**
 * Importa / sincroniza el calendario del Mundial 2026 desde football-data.org
 * hacia la tabla `matches`. Fuente de la verdad para fechas, equipos y estado.
 *
 * Estrategia de emparejamiento (idempotente):
 *   1. Si el partido ya tiene `fd_match_id`, se usa ese vínculo directo.
 *   2. Fase de grupos: se empareja por el CONJUNTO de equipos {local, visitante}
 *      dentro del mismo grupo (cada pareja juega una sola vez).
 *   3. Eliminatorias: se empareja por (fase, orden cronológico), porque los
 *      equipos aún no están definidos (vienen como null en la API).
 *
 * Una vez emparejado, graba `fd_match_id` para que las siguientes ejecuciones
 * sean directas y estables.
 *
 * Qué sincroniza: kickoff_at (UTC exacto), status, equipos (cuando la API los
 * conoce) y marcador (si el partido terminó). Conserva sedes y placeholders.
 *
 * NOTA: este script solo escribe en datos maestros (`matches`). NO recalcula
 * puntuaciones; eso lo hace el flujo de resultados (apply_match_result) cuando
 * llegue la Fase E. Hoy todos los partidos están sin jugar.
 *
 * Uso:
 *   node --env-file=.env.local scripts/import-fixtures.mjs
 *   node --env-file=.env.local scripts/import-fixtures.mjs --dry   (no escribe)
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const token = process.env.FOOTBALLDATA_TOKEN;
const DRY = process.argv.includes("--dry");

if (!url || !service) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
if (!token) {
  console.error("❌ Falta FOOTBALLDATA_TOKEN en .env.local");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });

// --- Mapeos entre football-data.org y nuestro esquema -----------------------

/** football-data usa algún código distinto del nuestro (FIFA). */
const TLA_OVERRIDES = { URY: "uru", CUR: "cuw" };

/** Convierte el `tla` de la API al id de nuestra tabla `teams` (minúsculas). */
function tlaToTeamId(tla) {
  if (!tla) return null;
  return TLA_OVERRIDES[tla] ?? tla.toLowerCase();
}

/** stage de la API -> nuestra `phase`. */
const STAGE_TO_PHASE = {
  GROUP_STAGE: "group",
  LAST_32: "round32",
  LAST_16: "round16",
  QUARTER_FINALS: "quarter",
  SEMI_FINALS: "semi",
  THIRD_PLACE: "third",
  FINAL: "final",
};

/** status de la API -> nuestro enum `match_status`. */
function mapStatus(s) {
  switch (s) {
    case "IN_PLAY":
    case "PAUSED":
      return "live";
    case "FINISHED":
      return "finished";
    default:
      // SCHEDULED, TIMED, POSTPONED, SUSPENDED, CANCELLED...
      return "scheduled";
  }
}

// --- 1. Descargar fixtures de la API ----------------------------------------

async function fetchFixtures() {
  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
    { headers: { "X-Auth-Token": token } },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data ${res.status}: ${body}`);
  }
  const data = await res.json();
  if (!Array.isArray(data.matches)) {
    throw new Error("Respuesta inesperada: falta el array `matches`.");
  }
  return data.matches;
}

// --- 2. Cargar partidos locales ---------------------------------------------

async function loadLocalMatches() {
  const { data, error } = await admin
    .from("matches")
    .select("match_number, phase, group_letter, home_team_id, away_team_id, fd_match_id")
    .order("match_number");
  if (error) throw new Error(`Error leyendo matches: ${error.message}`);
  return data;
}

// --- 3. Emparejar API <-> local ---------------------------------------------

/** Clave de conjunto de equipos para fase de grupos (orden indiferente). */
function pairKey(a, b) {
  return [a, b].sort().join("|");
}

function buildMatching(fixtures, locals) {
  const byMatchNumber = new Map(); // match_number -> fixture
  const usedLocal = new Set(); // match_number ya asignados
  const usedFixture = new Set(); // fx.id ya asignados

  const assign = (local, fx) => {
    byMatchNumber.set(local.match_number, fx);
    usedLocal.add(local.match_number);
    usedFixture.add(fx.id);
  };

  // a) Vínculos ya existentes por fd_match_id.
  const fixtureById = new Map(fixtures.map((fx) => [fx.id, fx]));
  for (const m of locals) {
    if (m.fd_match_id && fixtureById.has(m.fd_match_id)) {
      assign(m, fixtureById.get(m.fd_match_id));
    }
  }

  // b) Fase de grupos por conjunto de equipos {local, visitante}.
  const localGroupByKey = new Map();
  for (const m of locals) {
    if (m.phase === "group" && m.home_team_id && m.away_team_id && !usedLocal.has(m.match_number)) {
      localGroupByKey.set(pairKey(m.home_team_id, m.away_team_id), m);
    }
  }
  for (const fx of fixtures) {
    if (usedFixture.has(fx.id) || fx.stage !== "GROUP_STAGE") continue;
    const home = tlaToTeamId(fx.homeTeam?.tla);
    const away = tlaToTeamId(fx.awayTeam?.tla);
    const local = home && away ? localGroupByKey.get(pairKey(home, away)) : null;
    if (local && !usedLocal.has(local.match_number)) {
      assign(local, fx);
    } else {
      console.warn(`⚠️  Grupo sin emparejar: ${fx.homeTeam?.tla} vs ${fx.awayTeam?.tla} (fd ${fx.id})`);
    }
  }

  // c) Eliminatorias por (fase, orden cronológico).
  const localKOByPhase = new Map();
  for (const m of locals) {
    if (m.phase !== "group" && !usedLocal.has(m.match_number)) {
      if (!localKOByPhase.has(m.phase)) localKOByPhase.set(m.phase, []);
      localKOByPhase.get(m.phase).push(m);
    }
  }
  for (const list of localKOByPhase.values()) list.sort((a, b) => a.match_number - b.match_number);

  const koByPhase = new Map();
  for (const fx of fixtures) {
    if (usedFixture.has(fx.id) || fx.stage === "GROUP_STAGE") continue;
    const phase = STAGE_TO_PHASE[fx.stage];
    if (!phase) {
      console.warn(`⚠️  Stage desconocido: ${fx.stage} (fd ${fx.id})`);
      continue;
    }
    if (!koByPhase.has(phase)) koByPhase.set(phase, []);
    koByPhase.get(phase).push(fx);
  }
  for (const [phase, list] of koByPhase) {
    list.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
    const locies = localKOByPhase.get(phase) ?? [];
    if (list.length !== locies.length) {
      console.warn(`⚠️  ${phase}: API trae ${list.length} partidos y local tiene ${locies.length}.`);
    }
    list.forEach((fx, i) => {
      const local = locies[i];
      if (local) assign(local, fx);
    });
  }

  return byMatchNumber;
}

// --- 4. Construir y aplicar updates -----------------------------------------

function buildUpdate(fx) {
  const update = {
    fd_match_id: fx.id,
    kickoff_at: fx.utcDate,
    status: mapStatus(fx.status),
  };

  // Equipos: solo si la API los conoce (grupos siempre; KO cuando se definan).
  const home = tlaToTeamId(fx.homeTeam?.tla);
  const away = tlaToTeamId(fx.awayTeam?.tla);
  if (home) update.home_team_id = home;
  if (away) update.away_team_id = away;

  // Marcador: solo si el partido terminó.
  if (fx.status === "FINISHED" && fx.score?.fullTime) {
    update.home_goals = fx.score.fullTime.home;
    update.away_goals = fx.score.fullTime.away;
  }

  return update;
}

async function run() {
  console.log(`→ Descargando calendario del Mundial 2026${DRY ? " (DRY RUN)" : ""}...`);
  const fixtures = await fetchFixtures();
  const locals = await loadLocalMatches();
  console.log(`  API: ${fixtures.length} partidos · Local: ${locals.length} partidos`);

  const matching = buildMatching(fixtures, locals);
  console.log(`  Emparejados: ${matching.size}/${locals.length}`);

  let updated = 0;
  for (const [matchNumber, fx] of [...matching.entries()].sort((a, b) => a[0] - b[0])) {
    const update = buildUpdate(fx);
    if (DRY) {
      const teams = `${update.home_team_id ?? "?"}-${update.away_team_id ?? "?"}`;
      console.log(`  #${matchNumber} ← fd ${fx.id} · ${update.kickoff_at} · ${teams} · ${update.status}`);
      continue;
    }
    const { error } = await admin.from("matches").update(update).eq("match_number", matchNumber);
    if (error) {
      console.error(`❌ #${matchNumber}: ${error.message}`);
      process.exit(1);
    }
    updated++;
  }

  if (matching.size < locals.length) {
    console.warn(`⚠️  ${locals.length - matching.size} partidos locales no se emparejaron.`);
  }
  console.log(`\n✅ Hecho. ${DRY ? "(dry run, sin cambios)" : `${updated} partidos sincronizados.`}`);
}

run().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
