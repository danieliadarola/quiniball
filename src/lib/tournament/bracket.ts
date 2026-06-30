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
  /** Marcador a los 90' (reglamentario): es lo que puntúa el 1X2. */
  home_goals: number | null;
  away_goals: number | null;
  /** Clasificado tras prórroga/penales (null si se decidió en los 90'). */
  winner_team_id?: string | null;
  /** Tanda de penales, solo para mostrar (null si no la hubo). */
  pen_home?: number | null;
  pen_away?: number | null;
}

/**
 * Lado que SE CLASIFICA. Si el partido se decidió fuera de los 90' lo dicta
 * `winner_team_id` (con empate a 90' el marcador no basta); si no, se deduce
 * del marcador como siempre. Null si aún no hay resultado o quedó igualado y
 * sin clasificado conocido.
 */
export function decidedSide(m: BracketMatchInput): "home" | "away" | null {
  if (m.winner_team_id) {
    if (m.winner_team_id === m.home_team_id) return "home";
    if (m.winner_team_id === m.away_team_id) return "away";
  }
  if (m.home_goals == null || m.away_goals == null || m.home_goals === m.away_goals) return null;
  return m.home_goals > m.away_goals ? "home" : "away";
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
  /** Cómo se decidió: en los 90' ("regular"), en la prórroga o en penales. */
  decidedBy: "regular" | "extra" | "penalties";
  /** Tanda de penales (para mostrar), null si no la hubo. */
  penHome: number | null;
  penAway: number | null;
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

/** Nº de partido referido por "Ganador 73" / "Perdedor 101" (o null). */
function refOf(placeholder: string | null, kind: "Ganador" | "Perdedor"): number | null {
  if (!placeholder) return null;
  const m = new RegExp(`^${kind}\\s+(\\d+)`, "i").exec(placeholder.trim());
  return m ? Number(m[1]) : null;
}

/**
 * Resuelve el equipo CONCRETO de cada lado de un cruce, incluso si el partido
 * siguiente aún no tiene el id propagado en la BD: si la casilla dice
 * "Ganador N" y el partido N ya terminó con un ganador, devuelve ese equipo
 * (en cascada para rondas posteriores). Para "Perdedor N", el perdedor.
 */
function makeResolver(matches: BracketMatchInput[]) {
  const byNum = new Map(matches.map((m) => [m.match_number, m]));
  const winMemo = new Map<number, string | null>();

  function sideId(m: BracketMatchInput, side: "home" | "away"): string | null {
    const id = side === "home" ? m.home_team_id : m.away_team_id;
    if (id) return id;
    const ph = side === "home" ? m.home_placeholder : m.away_placeholder;
    const w = refOf(ph, "Ganador");
    if (w != null) return winnerOf(w);
    const l = refOf(ph, "Perdedor");
    if (l != null) return loserOf(l);
    return null;
  }

  function winnerOf(n: number): string | null {
    if (winMemo.has(n)) return winMemo.get(n)!;
    winMemo.set(n, null); // corta posibles ciclos
    const m = byNum.get(n);
    const side = m ? decidedSide(m) : null;
    const res = m && side ? sideId(m, side) : null;
    winMemo.set(n, res);
    return res;
  }

  function loserOf(n: number): string | null {
    const m = byNum.get(n);
    const side = m ? decidedSide(m) : null;
    if (!m || !side) return null;
    return sideId(m, side === "home" ? "away" : "home");
  }

  return { sideId };
}

function buildMatch(
  m: BracketMatchInput,
  homeId: string | null,
  awayId: string | null,
  pick: MyBracketPick | undefined,
  featured: boolean,
  now: number,
): BracketMatch {
  const hasResult = m.home_goals !== null && m.away_goals !== null;
  // El que pasa de ronda: por penales/prórroga si los hubo, si no por el 90'.
  const winner: BracketMatch["winner"] = hasResult ? decidedSide(m) : null;
  const penHome = m.pen_home ?? null;
  const penAway = m.pen_away ?? null;
  const decidedBy: BracketMatch["decidedBy"] =
    penHome != null
      ? "penalties"
      : m.winner_team_id && m.home_goals != null && m.home_goals === m.away_goals
        ? "extra"
        : "regular";

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
    home: teamOf(homeId, m.home_placeholder),
    away: teamOf(awayId, m.away_placeholder),
    homeGoals: m.home_goals,
    awayGoals: m.away_goals,
    hasResult,
    winner,
    decidedBy,
    penHome,
    penAway,
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
  const { sideId } = makeResolver(matches);
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
        buildMatch(
          m,
          sideId(m, "home"),
          sideId(m, "away"),
          myPicks.get(m.match_number),
          featured.has(m.match_number),
          now,
        ),
      ),
    });
  }
  return rounds;
}
