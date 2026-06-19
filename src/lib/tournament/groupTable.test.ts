import { describe, it, expect } from "vitest";
import { computeGroupStandings, type GroupMatchInput } from "./groupTable";

/**
 * Usa selecciones reales del Grupo A (mex, rsa, kor, cze) para no depender de
 * datos inventados. Solo importa la lógica de agregación y orden.
 */
function m(
  home: string,
  away: string,
  hg: number | null,
  ag: number | null,
  kickoff: string,
): GroupMatchInput {
  return {
    phase: "group",
    group_letter: "A",
    home_team_id: home,
    away_team_id: away,
    home_goals: hg,
    away_goals: ag,
    kickoff_at: kickoff,
  };
}

describe("computeGroupStandings", () => {
  it("incluye los 12 grupos con sus 4 equipos aunque no hayan jugado", () => {
    const groups = computeGroupStandings([]);
    expect(groups).toHaveLength(12);
    for (const g of groups) {
      expect(g.rows).toHaveLength(4);
      expect(g.rows.every((r) => r.played === 0 && r.points === 0)).toBe(true);
    }
  });

  it("suma puntos, goles y forma, y ordena por pts → DG → GF", () => {
    const matches = [
      m("mex", "rsa", 3, 0, "2026-06-11T20:00:00-06:00"), // mex gana
      m("kor", "cze", 1, 1, "2026-06-11T23:00:00-06:00"), // empate
      m("mex", "kor", 2, 2, "2026-06-15T20:00:00-06:00"), // empate
      m("cze", "rsa", 0, 0, "2026-06-15T23:00:00-06:00"), // empate
    ];
    const groupA = computeGroupStandings(matches).find((g) => g.letter === "A")!;

    const mex = groupA.rows.find((r) => r.teamId === "mex")!;
    expect(mex.played).toBe(2);
    expect(mex.points).toBe(4); // victoria + empate
    expect(mex.goalsFor).toBe(5);
    expect(mex.goalsAgainst).toBe(2);
    expect(mex.goalDiff).toBe(3);
    expect(mex.form).toEqual(["W", "D"]); // cronológico

    // México lidera por puntos.
    expect(groupA.rows[0].teamId).toBe("mex");
    // Sudáfrica, con 1 punto y peor DG, va por detrás de Corea (2 pts).
    const rsa = groupA.rows.find((r) => r.teamId === "rsa")!;
    expect(rsa.points).toBe(1);
  });

  it("ignora partidos sin terminar o de otras fases", () => {
    const matches = [
      m("mex", "rsa", null, null, "2026-06-11T20:00:00-06:00"), // sin resultado
      { ...m("kor", "cze", 1, 0, "2026-06-11T23:00:00-06:00"), phase: "round32" }, // otra fase
    ];
    const groupA = computeGroupStandings(matches).find((g) => g.letter === "A")!;
    expect(groupA.rows.every((r) => r.played === 0)).toBe(true);
  });
});
