/**
 * AUDITORÍA DE PUNTUACIÓN (solo lectura, todas las quinielas y jugadores).
 *
 * Recalcula desde cero los puntos de cada pronóstico sobre un partido finalizado
 * con las MISMAS reglas del motor (src/lib/scoring/match.ts) y los compara con el
 * `points_awarded` guardado en la BD. Además comprueba:
 *   · que ningún partido finalizado se quedó sin puntuar,
 *   · que no hay puntos asignados en partidos aún sin resultado,
 *   · que el total del ranking (vista standings) cuadra con la suma real de puntos.
 *
 * Reglas (fijas): acertar 1X2 = 3 pts (todos los partidos); si el partido es el
 * "estrella" de esa quiniela y además se clava el marcador exacto = +5 (máx 8).
 * El 1X2 se toma de pred_outcome o, si está vacío, se deriva de los goles.
 *
 * NO modifica nada: usa el cliente admin (service_role) solo para leer y saltarse
 * la RLS, de modo que ve TODAS las quinielas. Paginación incluida porque la tabla
 * de pronósticos supera el tope de 1000 filas de PostgREST.
 *
 * Uso: node --env-file=.env.local scripts/audit-scoring.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env.local).");
  process.exit(1);
}
const admin = createClient(url, service, { auth: { persistSession: false } });

const ok = (m) => console.log(`✅ ${m}`);
const fail = (m) => { console.error(`❌ ${m}`); process.exitCode = 1; };

// --- Reglas del motor (espejo de src/lib/scoring) --------------------------
const POINTS = { outcome: 3, exactBonus: 5 };

/** 1/X/2 del jugador: pred_outcome si existe, si no se deriva de los goles. */
function predictedOutcome(p) {
  const o = (p.pred_outcome ?? "").trim();
  if (o) return o;
  if (p.pred_home_goals !== null && p.pred_away_goals !== null) {
    return p.pred_home_goals > p.pred_away_goals
      ? "1"
      : p.pred_home_goals === p.pred_away_goals
        ? "X"
        : "2";
  }
  return null;
}

/** Puntos esperados de un pronóstico dado el partido finalizado y si es estrella. */
function expectedPoints(p, match, featured) {
  let pts = predictedOutcome(p) === match.actual ? POINTS.outcome : 0;
  const exact =
    p.pred_home_goals !== null &&
    p.pred_away_goals !== null &&
    p.pred_home_goals === match.home_goals &&
    p.pred_away_goals === match.away_goals;
  if (featured && exact) pts += POINTS.exactBonus;
  return pts;
}

/** Lee una tabla entera paginando (PostgREST corta a 1000 filas por respuesta). */
async function fetchAll(table, columns, orderCol) {
  const PAGE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .order(orderCol, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    all.push(...(data ?? []));
    if ((data ?? []).length < PAGE) break;
  }
  return all;
}

try {
  // 1) Partidos finalizados → mapa con el 1X2 oficial.
  const matches = await fetchAll(
    "matches",
    "match_number, home_goals, away_goals",
    "match_number",
  );
  const finished = new Map();
  for (const m of matches) {
    if (m.home_goals === null || m.away_goals === null) continue;
    finished.set(m.match_number, {
      home_goals: m.home_goals,
      away_goals: m.away_goals,
      actual:
        m.home_goals > m.away_goals ? "1" : m.home_goals === m.away_goals ? "X" : "2",
    });
  }

  // 2) Partidos estrella por quiniela: clave "group_id|match_number".
  const feats = await fetchAll(
    "group_featured_matches",
    "group_id, match_number",
    "group_id",
  );
  const featured = new Set(feats.map((f) => `${f.group_id}|${f.match_number}`));

  // 3) Catálogos para informar con nombres.
  const groups = await fetchAll("groups", "id, name", "id");
  const groupName = new Map(groups.map((g) => [g.id, g.name]));
  const profiles = await fetchAll("profiles", "id, display_name", "id");
  const profName = new Map(profiles.map((p) => [p.id, p.display_name]));

  // 4) Todos los pronósticos (paginados).
  const preds = await fetchAll(
    "predictions",
    "id, group_id, profile_id, match_number, pred_home_goals, pred_away_goals, pred_outcome, points_awarded",
    "id",
  );

  // 5) Auditoría pronóstico a pronóstico.
  let auditados = 0;
  const mismatches = [];
  let puntosSinResultado = 0;
  let finalizadosSinPuntuar = 0;
  const perGroup = new Map(); // group_id → { auditados, discrepancias }

  for (const p of preds) {
    const m = finished.get(p.match_number);
    if (!m) {
      // Partido sin resultado: no debería tener puntos.
      if ((p.points_awarded ?? 0) !== 0) puntosSinResultado++;
      continue;
    }
    auditados++;
    const exp = expectedPoints(p, m, featured.has(`${p.group_id}|${p.match_number}`));
    const got = p.points_awarded;
    const g = perGroup.get(p.group_id) ?? { auditados: 0, discrepancias: 0 };
    g.auditados++;
    if (got === null) finalizadosSinPuntuar++;
    if (got !== exp) {
      g.discrepancias++;
      mismatches.push({
        quiniela: groupName.get(p.group_id) ?? p.group_id,
        jugador: profName.get(p.profile_id) ?? p.profile_id,
        partido: p.match_number,
        pron: predictedOutcome(p) ?? "—",
        marcador: `${m.home_goals}-${m.away_goals}`,
        esperado: exp,
        guardado: got,
      });
    }
    perGroup.set(p.group_id, g);
  }

  // 6) Ranking: total mostrado vs suma real de puntos por (quiniela, jugador).
  const realByKey = new Map();
  for (const p of preds) {
    const k = `${p.group_id}|${p.profile_id}`;
    realByKey.set(k, (realByKey.get(k) ?? 0) + (p.points_awarded ?? 0));
  }
  const standings = await fetchAll(
    "standings",
    "group_id, profile_id, total_points",
    "group_id",
  );
  const rankingDesajustes = [];
  for (const s of standings) {
    const real = realByKey.get(`${s.group_id}|${s.profile_id}`) ?? 0;
    if (real !== s.total_points) {
      rankingDesajustes.push({
        quiniela: groupName.get(s.group_id) ?? s.group_id,
        jugador: profName.get(s.profile_id) ?? s.profile_id,
        ranking: s.total_points,
        suma_real: real,
      });
    }
  }

  // --- Informe -------------------------------------------------------------
  console.log("\n── Auditoría de puntuación ──────────────────────────────");
  console.log(`Pronósticos sobre partidos finalizados auditados: ${auditados}`);

  mismatches.length === 0
    ? ok("Todos los puntos coinciden con el recálculo del motor")
    : fail(`${mismatches.length} pronósticos con puntos que NO coinciden`);

  finalizadosSinPuntuar === 0
    ? ok("No hay partidos finalizados sin puntuar")
    : fail(`${finalizadosSinPuntuar} pronósticos de partidos finalizados sin puntuar`);

  puntosSinResultado === 0
    ? ok("No hay puntos asignados en partidos sin resultado")
    : fail(`${puntosSinResultado} pronósticos con puntos en partidos sin resultado`);

  rankingDesajustes.length === 0
    ? ok("El total del ranking cuadra con la suma real de puntos")
    : fail(`${rankingDesajustes.length} filas de ranking no cuadran con la suma`);

  console.log("\nDesglose por quiniela:");
  for (const [gid, g] of perGroup) {
    const mark = g.discrepancias === 0 ? "✅" : "❌";
    console.log(`  ${mark} ${groupName.get(gid) ?? gid}: ${g.auditados} auditados, ${g.discrepancias} discrepancias`);
  }

  if (mismatches.length) {
    console.log("\nDetalle de discrepancias de puntos:");
    for (const d of mismatches) {
      console.log(
        `  · ${d.quiniela} / ${d.jugador} · partido #${d.partido} (${d.marcador}) ` +
          `pron ${d.pron}: esperado ${d.esperado}, guardado ${d.guardado}`,
      );
    }
  }

  if (rankingDesajustes.length) {
    console.log("\nDetalle de desajustes de ranking:");
    for (const d of rankingDesajustes) {
      console.log(`  · ${d.quiniela} / ${d.jugador}: ranking ${d.ranking}, suma real ${d.suma_real}`);
    }
  }

  console.log("\n─────────────────────────────────────────────────────────");
  if (process.exitCode === 1) {
    console.log("Resultado: ❌ revisar las discrepancias listadas arriba.");
  } else {
    console.log("Resultado: ✅ todo cuadra (selección ↔ puntos ↔ resultado).");
  }
} catch (e) {
  fail(e.message);
}
