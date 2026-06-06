import "server-only";

/**
 * SINCRONIZACIÓN AUTOMÁTICA con football-data.org.
 *
 * Una sola pasada que mantiene la tabla `matches` al día y aplica los resultados
 * en cuanto un partido termina. Pensada para ejecutarse cada pocos minutos
 * (Supabase pg_cron → /api/sync). Es idempotente: solo escribe cuando algo
 * cambia, así puede correr en bucle sin efectos colaterales.
 *
 * Qué hace por cada partido (emparejado por `fd_match_id`, ya presente en los 104):
 *   1. Datos maestros: actualiza kickoff, estado (scheduled/live) y los equipos
 *      de las eliminatorias en cuanto la API los conoce.
 *   2. Resultado: si el partido FINALIZÓ y aún no lo teníamos así (o cambió el
 *      marcador), delega en `applyMatchResult`, que recalcula los puntos de
 *      todas las quinielas de forma atómica.
 *
 * NO contiene secretos ni lógica HTTP de entrada: eso vive en la ruta API.
 */
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { applyMatchResult } from "@/lib/results/apply";

const FOOTBALLDATA_URL =
  "https://api.football-data.org/v4/competitions/WC/matches?season=2026";

/** football-data usa algún código distinto del nuestro (FIFA). */
const TLA_OVERRIDES: Record<string, string> = { URY: "uru", CUR: "cuw" };

function tlaToTeamId(tla: string | null | undefined): string | null {
  if (!tla) return null;
  return TLA_OVERRIDES[tla] ?? tla.toLowerCase();
}

/** status de la API -> nuestro enum `match_status`. */
function mapStatus(s: string): "live" | "finished" | "scheduled" {
  switch (s) {
    case "IN_PLAY":
    case "PAUSED":
      return "live";
    case "FINISHED":
      return "finished";
    default:
      return "scheduled"; // SCHEDULED, TIMED, POSTPONED, SUSPENDED, CANCELLED…
  }
}

interface ApiFixture {
  id: number;
  status: string;
  utcDate: string;
  homeTeam?: { tla?: string | null } | null;
  awayTeam?: { tla?: string | null } | null;
  score?: { fullTime?: { home: number | null; away: number | null } | null } | null;
}

interface LocalMatch {
  match_number: number;
  fd_match_id: number | null;
  status: "scheduled" | "live" | "finished";
  kickoff_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
}

/** Resultado de una corrida (para logs y respuesta de la API). */
export interface SyncReport {
  ok: boolean;
  error?: string;
  fixtures: number;
  mastersUpdated: number;
  resultsApplied: number;
  /** Partidos que pasaron a finalizado en ESTA pasada (gancho de notificaciones). */
  newlyFinished: number[];
}

async function fetchFixtures(token: string): Promise<ApiFixture[]> {
  const res = await fetch(FOOTBALLDATA_URL, {
    headers: { "X-Auth-Token": token },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { matches?: ApiFixture[] };
  if (!Array.isArray(data.matches)) {
    throw new Error("Respuesta inesperada: falta el array `matches`.");
  }
  return data.matches;
}

/**
 * Sincroniza el calendario y aplica resultados nuevos. Lanza solo si no puede
 * arrancar (token/credenciales); los fallos por partido se acumulan en el log.
 */
export async function syncResults(): Promise<SyncReport> {
  const token = process.env.FOOTBALLDATA_TOKEN;
  if (!token) {
    return {
      ok: false,
      error: "Falta FOOTBALLDATA_TOKEN.",
      fixtures: 0,
      mastersUpdated: 0,
      resultsApplied: 0,
      newlyFinished: [],
    };
  }

  const admin = createSupabaseAdmin();
  const report: SyncReport = {
    ok: true,
    fixtures: 0,
    mastersUpdated: 0,
    resultsApplied: 0,
    newlyFinished: [],
  };

  try {
    const [fixtures, localResp] = await Promise.all([
      fetchFixtures(token),
      admin
        .from("matches")
        .select(
          "match_number, fd_match_id, status, kickoff_at, home_team_id, away_team_id, home_goals, away_goals",
        )
        .order("match_number"),
    ]);

    if (localResp.error) throw new Error(`Lectura de matches: ${localResp.error.message}`);
    const locals = (localResp.data ?? []) as LocalMatch[];
    report.fixtures = fixtures.length;

    const byId = new Map<number, ApiFixture>(fixtures.map((fx) => [fx.id, fx]));

    for (const m of locals) {
      if (!m.fd_match_id) continue;
      const fx = byId.get(m.fd_match_id);
      if (!fx) continue;

      const apiStatus = mapStatus(fx.status);
      const ft = fx.score?.fullTime;
      const finishedWithScore =
        apiStatus === "finished" && ft != null && ft.home != null && ft.away != null;

      // 1) Resultado: solo cuando finaliza por primera vez o cambia el marcador.
      if (finishedWithScore) {
        const changed =
          m.status !== "finished" || m.home_goals !== ft!.home || m.away_goals !== ft!.away;
        if (changed) {
          const wasUnfinished = m.status !== "finished";
          const res = await applyMatchResult(m.match_number, ft!.home!, ft!.away!);
          if (res.ok) {
            report.resultsApplied++;
            if (wasUnfinished) report.newlyFinished.push(m.match_number);
          } else {
            report.ok = false;
            report.error = `#${m.match_number}: ${res.error}`;
          }
        }
        continue; // un partido finalizado ya no cambia datos maestros
      }

      // 2) Datos maestros: kickoff, estado y equipos (cuando la API los conoce).
      const homeId = tlaToTeamId(fx.homeTeam?.tla) ?? m.home_team_id;
      const awayId = tlaToTeamId(fx.awayTeam?.tla) ?? m.away_team_id;
      const patch: Record<string, unknown> = {};
      // Comparamos por INSTANTE, no por texto: la API da ISO "…Z" y Postgres
      // devuelve "… +00"; son la misma hora pero distinto string.
      const sameInstant =
        fx.utcDate && new Date(fx.utcDate).getTime() === new Date(m.kickoff_at).getTime();
      if (fx.utcDate && !sameInstant) patch.kickoff_at = fx.utcDate;
      if (apiStatus !== m.status) patch.status = apiStatus;
      if (homeId !== m.home_team_id) patch.home_team_id = homeId;
      if (awayId !== m.away_team_id) patch.away_team_id = awayId;

      if (Object.keys(patch).length > 0) {
        const { error } = await admin
          .from("matches")
          .update(patch)
          .eq("match_number", m.match_number);
        if (error) {
          report.ok = false;
          report.error = `#${m.match_number} maestro: ${error.message}`;
        } else {
          report.mastersUpdated++;
        }
      }
    }
  } catch (e) {
    return {
      ...report,
      ok: false,
      error: e instanceof Error ? e.message : "Error desconocido en la sincronización.",
    };
  }

  return report;
}
