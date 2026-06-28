/**
 * CUADRO DE ELIMINATORIAS (real + mi pronóstico).
 *
 * Función pura que arma las rondas del torneo (dieciseisavos → final) a partir
 * de los partidos de fase final y los pronósticos del jugador que mira. Por cada
 * cruce devuelve:
 *   · los equipos (o su etiqueta de origen si aún no se conocen: "Ganador 73"…),
 *   · el marcador y quién pasó de ronda (resultado REAL),
 *   · el 1X2 que pronosticó el jugador, si acertó y los puntos (mi pronóstico).
 *
 * No conoce la BD ni la UI: recibe filas ya leídas y devuelve un VM listo para
 * pintar. Igual de testeable que el motor de puntos.
 */
import { getTeam } from "@/data/tournament/teams";
import { formatKickoff } from "@/lib/matches/format";
import { outcomeFromGoals } from "@/lib/scoring/outcome";
import { scoreMatch } from "@/lib/scoring/match";
import { isPredictionLocked } from "@/lib/matches/schedule";
import type { Outcome } from "@/lib/scoring/types";

/** Orden y etiqueta de las rondas de eliminatoria. */
const KNOCKOUT_ORDER: { phase: string; label: string }[] = [
  { phase: "round32", label: "Dieciseisavos" },
  { phase: "round16", label: "Octavos" },
  { phase: "quarter", label: "Cuartos" },
  { phase: "semi", label: "Semifinales" },
  { phase: "third", label: "3.º puesto" },
  { phase: "final", label: "Final" },
];

export interface BracketMatchInput {
  match_number: number;
  phase: string;
  kickoff_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home_goals: number | null;
  away_goals: number | null;
}

/** Pronóstico del jugador para un partido (1X2 directo o derivado de goles). */
export interface MyBracketPick {
  outcome: Outcome | null;
  homeGoals: number | null;
  awayGoals: number | null;
}

export interface BracketTeam {
  /** Nombre del equipo, o null si todavía no se conoce. */
  name: string | null;
  iso: string | null;
  /** Etiqueta de origen mientras no haya equipo ("Ganador 73", "1º Grupo A"). */
  placeholder: string | null;
}

export interface BracketMatch {
  matchNumber: number;
  home: BracketTeam;
  away: BracketTeam;
  homeGoals: number | null;
  awayGoals: number | null;
  hasResult: boolean;
  /** Lado que pasó de ronda (null si aún no hay resultado o quedó igualado). */
  winner: "home" | "away" | null;
  whenLabel: string;
  locked: boolean;
  /** 1/X/2 del jugador. Null = no pronosticó. */
  myOutcome: Outcome | null;
  /** ¿Acertó el 1X2? Null si el partido no ha terminado o no pronosticó. */
  myCorrect: boolean | null;
  /** Puntos del jugador en este cruce. Null mientras no haya resultado. */
  myPoints: number | null;
  /** ¿Es el partido estrella de esta quiniela (puntúa exacto)? */
  featured: boolean;
}

export interface BracketRound {
  phase: string;
  label: string;
  matches: BracketMatch[];
}

function teamOf(id: string | null, placeholder: string | null): BracketTeam {
  const t = id ? getTeam(id) : undefined;
  return { name: t?.name ?? null, iso: t?.iso ?? null, placeholder: placeholder ?? null };
}

function buildMatch(
  m: BracketMatchInput,
  pick: MyBracketPick | undefined,
  featured: boolean,
  now: number,
): BracketMatch {
  const hasResult = m.home_goals !== null && m.away_goals !== null;
  const winner: BracketMatch["winner"] = hasResult
    ? m.home_goals! > m.away_goals!
      ? "home"
      : m.home_goals! < m.away_goals!
        ? "away"
        : null
    : null;

  const myOutcome: Outcome | null = pick
    ? pick.outcome ??
      (pick.homeGoals !== null && pick.awayGoals !== null
        ? outcomeFromGoals(pick.homeGoals, pick.awayGoals)
        : null)
    : null;

  let myCorrect: boolean | null = null;
  let myPoints: number | null = null;
  if (hasResult) {
    const actual = outcomeFromGoals(m.home_goals!, m.away_goals!);
    myCorrect = myOutcome === null ? null : myOutcome === actual;
    myPoints = pick
      ? scoreMatch(
          featured,
          { predHomeGoals: pick.homeGoals, predAwayGoals: pick.awayGoals, predOutcome: pick.outcome },
          { homeGoals: m.home_goals!, awayGoals: m.away_goals! },
        )
      : 0;
  }

  return {
    matchNumber: m.match_number,
    home: teamOf(m.home_team_id, m.home_placeholder),
    away: teamOf(m.away_team_id, m.away_placeholder),
    homeGoals: m.home_goals,
    awayGoals: m.away_goals,
    hasResult,
    winner,
    whenLabel: formatKickoff(m.kickoff_at),
    locked: isPredictionLocked(Date.parse(m.kickoff_at), now),
    myOutcome,
    myCorrect,
    myPoints,
    featured,
  };
}

/**
 * Arma las rondas de eliminatoria presentes en el calendario, en orden, con los
 * cruces de cada una ordenados cronológicamente. Las rondas sin partidos en la
 * BD se omiten (el cuadro crece según avanza el torneo).
 */
export function buildKnockoutBracket(
  matches: BracketMatchInput[],
  myPicks: Map<number, MyBracketPick>,
  featured: Set<number>,
  now: number = Date.now(),
): BracketRound[] {
  const rounds: BracketRound[] = [];
  for (const { phase, label } of KNOCKOUT_ORDER) {
    const ms = matches
      .filter((m) => m.phase === phase)
      .sort(
        (a, b) =>
          Date.parse(a.kickoff_at) - Date.parse(b.kickoff_at) || a.match_number - b.match_number,
      );
    if (ms.length === 0) continue;
    rounds.push({
      phase,
      label,
      matches: ms.map((m) =>
        buildMatch(m, myPicks.get(m.match_number), featured.has(m.match_number), now),
      ),
    });
  }
  return rounds;
}
