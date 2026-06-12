import "server-only";

/**
 * "Historial" de la quiniela = pronósticos de cada jugador en los partidos que
 * YA EMPEZARON (en juego o finalizados). Antes del cierre los picks son secretos
 * (si no, se copiarían), así que aquí NUNCA se incluyen partidos futuros.
 *
 * Por cada partido empezado devuelve la lista de jugadores con su 1X2, el
 * marcador exacto (solo en el "partido de la jornada") y los puntos que sacó
 * (recalculados con el motor puro cuando el partido ya tiene resultado).
 *
 * Usa el cliente que reciba (RLS de miembro o service_role en modo admin). La
 * RLS permite leer los pronósticos de TODO el grupo (los usa el ranking), por lo
 * que esta lectura es válida para cualquier miembro.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTeam } from "@/data/tournament/teams";
import { isPredictionLocked } from "@/lib/matches/schedule";
import { scoreMatch } from "@/lib/scoring/match";
import { outcomeFromGoals } from "@/lib/scoring/outcome";
import type { Outcome } from "@/lib/scoring/types";
import type { StandingRow } from "@/lib/standings/fetch";
import { formatKickoff } from "@/lib/matches/format";

const PHASE_LABEL: Record<string, string> = {
  round32: "Dieciseisavos",
  round16: "Octavos",
  quarter: "Cuartos",
  semi: "Semifinales",
  third: "3.º puesto",
  final: "Final",
};

export interface PlayerPick {
  profileId: string;
  displayName: string;
  avatarStyle: string | null;
  avatarSeed: string | null;
  /** 1/X/2 elegido (derivado de los goles si era partido estrella). Null = no pronosticó. */
  outcome: Outcome | null;
  /** Marcador exacto pronosticado (solo en partido estrella). */
  homeGoals: number | null;
  awayGoals: number | null;
  /** Puntos en este partido. Null mientras el partido sigue en juego. */
  points: number | null;
}

export interface MatchPicks {
  matchNumber: number;
  groupLabel: string;
  home: { name: string; iso: string | null };
  away: { name: string; iso: string | null };
  whenLabel: string;
  /** Para ordenar (epoch ms); recientes arriba. */
  kickoffMs: number;
  featured: boolean;
  status: "live" | "finished";
  result: { home: number; away: number; outcome: Outcome } | null;
  picks: PlayerPick[];
}

interface MatchRow {
  match_number: number;
  phase: string;
  group_letter: string | null;
  kickoff_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
}
interface PredRow {
  profile_id: string;
  match_number: number;
  pred_home_goals: number | null;
  pred_away_goals: number | null;
  pred_outcome: Outcome | null;
}

/**
 * Devuelve los partidos ya empezados con los pronósticos de cada miembro,
 * ordenados con los más recientes arriba (en juego primero).
 *
 * @param members roster con nombre y avatar (la clasificación ya cargada).
 */
export async function fetchMatchPicks(
  db: SupabaseClient,
  groupId: string,
  members: StandingRow[],
  now: number = Date.now(),
): Promise<MatchPicks[]> {
  try {
    const [{ data: matchRows }, { data: featRows }, { data: predRows }] = await Promise.all([
      db
        .from("matches")
        .select(
          "match_number, phase, group_letter, kickoff_at, home_team_id, away_team_id, home_goals, away_goals",
        ) as unknown as Promise<{ data: MatchRow[] | null }>,
      db
        .from("group_featured_matches")
        .select("match_number")
        .eq("group_id", groupId) as unknown as Promise<{ data: { match_number: number }[] | null }>,
      db
        .from("predictions")
        .select("profile_id, match_number, pred_home_goals, pred_away_goals, pred_outcome")
        .eq("group_id", groupId) as unknown as Promise<{ data: PredRow[] | null }>,
    ]);

    const featured = new Set((featRows ?? []).map((f) => f.match_number));

    // Solo partidos con rivales conocidos y cuyo cierre YA pasó (empezados).
    const started = (matchRows ?? []).filter(
      (m) =>
        m.home_team_id &&
        m.away_team_id &&
        isPredictionLocked(Date.parse(m.kickoff_at), now),
    );
    const startedNums = new Set(started.map((m) => m.match_number));

    // Pronósticos indexados por partido → perfil. Solo de partidos empezados:
    // así jamás se envían al cliente picks de partidos aún abiertos.
    const byMatch = new Map<number, Map<string, PredRow>>();
    for (const p of predRows ?? []) {
      if (!startedNums.has(p.match_number)) continue;
      let mm = byMatch.get(p.match_number);
      if (!mm) {
        mm = new Map();
        byMatch.set(p.match_number, mm);
      }
      mm.set(p.profile_id, p);
    }

    const items: MatchPicks[] = started.map((m) => {
      const hasResult = m.home_goals !== null && m.away_goals !== null;
      const result = hasResult
        ? {
            home: m.home_goals!,
            away: m.away_goals!,
            outcome: outcomeFromGoals(m.home_goals!, m.away_goals!),
          }
        : null;
      const isFeat = featured.has(m.match_number);
      const home = m.home_team_id ? getTeam(m.home_team_id) : undefined;
      const away = m.away_team_id ? getTeam(m.away_team_id) : undefined;
      const profilePicks = byMatch.get(m.match_number);

      const picks: PlayerPick[] = members.map((mem) => {
        const p = profilePicks?.get(mem.profileId);
        const outcome: Outcome | null = p
          ? p.pred_outcome ??
            (p.pred_home_goals !== null && p.pred_away_goals !== null
              ? outcomeFromGoals(p.pred_home_goals, p.pred_away_goals)
              : null)
          : null;
        let points: number | null = null;
        if (result) {
          points = p
            ? scoreMatch(
                isFeat,
                {
                  predHomeGoals: p.pred_home_goals,
                  predAwayGoals: p.pred_away_goals,
                  predOutcome: p.pred_outcome,
                },
                { homeGoals: result.home, awayGoals: result.away },
              )
            : 0;
        }
        return {
          profileId: mem.profileId,
          displayName: mem.displayName,
          avatarStyle: mem.avatarStyle,
          avatarSeed: mem.avatarSeed,
          outcome,
          homeGoals: isFeat && p ? p.pred_home_goals : null,
          awayGoals: isFeat && p ? p.pred_away_goals : null,
          points,
        };
      });

      // Dentro del partido: más puntos arriba; a igualdad, quien pronosticó
      // antes que quien no; luego alfabético.
      picks.sort((a, b) => {
        const pa = a.points ?? -1;
        const pb = b.points ?? -1;
        if (pa !== pb) return pb - pa;
        const da = a.outcome !== null ? 0 : 1;
        const dbb = b.outcome !== null ? 0 : 1;
        if (da !== dbb) return da - dbb;
        return a.displayName.localeCompare(b.displayName, "es");
      });

      const groupLabel =
        m.phase === "group" && m.group_letter
          ? `Grupo ${m.group_letter}`
          : PHASE_LABEL[m.phase] ?? "";

      return {
        matchNumber: m.match_number,
        groupLabel,
        home: { name: home?.name ?? "?", iso: home?.iso ?? null },
        away: { name: away?.name ?? "?", iso: away?.iso ?? null },
        whenLabel: formatKickoff(m.kickoff_at),
        kickoffMs: Date.parse(m.kickoff_at),
        featured: isFeat,
        status: result ? "finished" : "live",
        result,
        picks,
      };
    });

    // Recientes arriba: en juego primero, luego finalizados por kickoff desc.
    items.sort((a, b) => {
      const la = a.status === "live" ? 0 : 1;
      const lb = b.status === "live" ? 0 : 1;
      if (la !== lb) return la - lb;
      return b.kickoffMs - a.kickoffMs;
    });

    return items;
  } catch {
    // Ante cualquier fallo de lectura, historial vacío (no rompemos la pantalla).
    return [];
  }
}
