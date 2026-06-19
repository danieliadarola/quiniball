/**
 * Clasificación REAL de la fase de grupos del Mundial (no de la quiniela).
 *
 * Se calcula a partir de los resultados oficiales guardados en la tabla
 * `matches` (los mismos que sincronizamos desde la API). Función pura y sin
 * dependencias de React: fácil de testear y de reutilizar en el servidor.
 *
 * Desempates aplicados (simplificación práctica de los criterios FIFA): puntos,
 * luego diferencia de goles, luego goles a favor y, por estabilidad, el nombre.
 * No se aplica el head-to-head (rara vez decide y requiere más reglas).
 */
import { GROUPS, GROUP_LETTERS } from "@/data/tournament/groups";
import { getTeam } from "@/data/tournament/teams";

/** Forma mínima de un partido que necesita el cálculo (subconjunto de la fila BD). */
export interface GroupMatchInput {
  phase: string;
  group_letter: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_goals: number | null;
  away_goals: number | null;
  kickoff_at: string;
}

export type FormResult = "W" | "D" | "L";

export interface GroupTeamStanding {
  teamId: string;
  name: string;
  iso: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  /** Resultados en orden cronológico (más reciente al final), hasta 5. */
  form: FormResult[];
}

export interface GroupStandings {
  letter: string;
  rows: GroupTeamStanding[];
}

interface Acc extends GroupTeamStanding {
  _form: { kickoff: number; r: FormResult }[];
}

const POINTS = { win: 3, draw: 1, loss: 0 } as const;

/** Calcula la clasificación de los 12 grupos (A–L). */
export function computeGroupStandings(matches: GroupMatchInput[]): GroupStandings[] {
  // Inicializa cada grupo con sus 4 selecciones (aparecen aunque no hayan jugado).
  const byTeam = new Map<string, Acc>();
  for (const g of GROUPS) {
    for (const teamId of g.teamIds) {
      const t = getTeam(teamId);
      byTeam.set(teamId, {
        teamId,
        name: t?.name ?? teamId,
        iso: t?.iso ?? "",
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
        form: [],
        _form: [],
      });
    }
  }

  for (const m of matches) {
    if (m.phase !== "group") continue;
    if (!m.home_team_id || !m.away_team_id) continue;
    if (m.home_goals === null || m.away_goals === null) continue; // sin terminar

    const home = byTeam.get(m.home_team_id);
    const away = byTeam.get(m.away_team_id);
    if (!home || !away) continue;

    const hg = m.home_goals;
    const ag = m.away_goals;
    const kickoff = Date.parse(m.kickoff_at);

    home.played++;
    away.played++;
    home.goalsFor += hg;
    home.goalsAgainst += ag;
    away.goalsFor += ag;
    away.goalsAgainst += hg;

    if (hg > ag) {
      home.won++; home.points += POINTS.win;
      away.lost++; away.points += POINTS.loss;
      home._form.push({ kickoff, r: "W" });
      away._form.push({ kickoff, r: "L" });
    } else if (hg < ag) {
      away.won++; away.points += POINTS.win;
      home.lost++; home.points += POINTS.loss;
      away._form.push({ kickoff, r: "W" });
      home._form.push({ kickoff, r: "L" });
    } else {
      home.drawn++; home.points += POINTS.draw;
      away.drawn++; away.points += POINTS.draw;
      home._form.push({ kickoff, r: "D" });
      away._form.push({ kickoff, r: "D" });
    }
  }

  return GROUP_LETTERS.map((letter) => {
    const group = GROUPS.find((g) => g.letter === letter);
    const rows = (group?.teamIds ?? [])
      .map((id) => byTeam.get(id))
      .filter((x): x is Acc => Boolean(x))
      .map((acc) => {
        acc.goalDiff = acc.goalsFor - acc.goalsAgainst;
        acc.form = acc._form
          .sort((a, b) => a.kickoff - b.kickoff)
          .map((f) => f.r)
          .slice(-5);
        // Quita el campo auxiliar del resultado público.
        const { _form, ...row } = acc;
        void _form;
        return row as GroupTeamStanding;
      })
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.goalDiff - a.goalDiff ||
          b.goalsFor - a.goalsFor ||
          a.name.localeCompare(b.name, "es"),
      );
    return { letter, rows };
  });
}
