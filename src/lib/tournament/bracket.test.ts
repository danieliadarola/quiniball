import { describe, it, expect } from "vitest";
import { buildKnockoutBracket, type BracketMatchInput, type MyBracketPick } from "./bracket";

/** Cruce de eliminatoria mínimo (equipos reales para no inventar datos). */
function km(
  matchNumber: number,
  phase: string,
  home: string | null,
  away: string | null,
  hg: number | null,
  ag: number | null,
  kickoff: string,
  placeholders: [string | null, string | null] = [null, null],
): BracketMatchInput {
  return {
    match_number: matchNumber,
    phase,
    kickoff_at: kickoff,
    home_team_id: home,
    away_team_id: away,
    home_placeholder: placeholders[0],
    away_placeholder: placeholders[1],
    home_goals: hg,
    away_goals: ag,
  };
}

describe("buildKnockoutBracket", () => {
  it("ordena las rondas y omite las que no tienen partidos", () => {
    const rounds = buildKnockoutBracket(
      [
        km(101, "final", null, null, null, null, "2026-07-19T17:00:00Z", ["Gan. SF1", "Gan. SF2"]),
        km(73, "round32", "rsa", "can", 0, 1, "2026-06-28T19:00:00Z"),
      ],
      new Map(),
      new Set(),
      Date.parse("2026-06-29T00:00:00Z"),
    );
    expect(rounds.map((r) => r.phase)).toEqual(["round32", "final"]);
  });

  it("marca el clasificado por el marcador real", () => {
    const [r] = buildKnockoutBracket(
      [km(73, "round32", "rsa", "can", 0, 1, "2026-06-28T19:00:00Z")],
      new Map(),
      new Set(),
      Date.parse("2026-06-29T00:00:00Z"),
    );
    const m = r.matches[0];
    expect(m.hasResult).toBe(true);
    expect(m.winner).toBe("away");
  });

  it("evalúa mi pronóstico: acierto y puntos del 1X2", () => {
    const picks = new Map<number, MyBracketPick>([
      [73, { outcome: "2", homeGoals: null, awayGoals: null }],
    ]);
    const [r] = buildKnockoutBracket(
      [km(73, "round32", "rsa", "can", 0, 1, "2026-06-28T19:00:00Z")],
      picks,
      new Set(),
      Date.parse("2026-06-29T00:00:00Z"),
    );
    const m = r.matches[0];
    expect(m.myOutcome).toBe("2");
    expect(m.myCorrect).toBe(true);
    expect(m.myPoints).toBe(3);
  });

  it("sin pronóstico en partido jugado: correcto=null y 0 puntos", () => {
    const [r] = buildKnockoutBracket(
      [km(73, "round32", "rsa", "can", 0, 1, "2026-06-28T19:00:00Z")],
      new Map(),
      new Set(),
      Date.parse("2026-06-29T00:00:00Z"),
    );
    const m = r.matches[0];
    expect(m.myOutcome).toBeNull();
    expect(m.myCorrect).toBeNull();
    expect(m.myPoints).toBe(0);
  });

  it("propaga el clasificado: 'Ganador 73' muestra al ganador real del 73", () => {
    const [r32, r16] = buildKnockoutBracket(
      [
        km(73, "round32", "rsa", "can", 0, 1, "2026-06-28T19:00:00Z"),
        km(89, "round16", null, null, null, null, "2026-07-04T17:00:00Z", ["Ganador 73", "Ganador 74"]),
      ],
      new Map(),
      new Set(),
      Date.parse("2026-06-29T00:00:00Z"),
    );
    void r32;
    const octavos = r16.matches[0];
    expect(octavos.home.name).toBe("Canadá");
    expect(octavos.home.iso).toBe("ca");
    // El rival (Ganador 74) aún no está decidido: sigue como etiqueta.
    expect(octavos.away.name).toBeNull();
    expect(octavos.away.placeholder).toBe("Ganador 74");
  });

  it("cruce sin equipos: usa la etiqueta de origen y no hay resultado", () => {
    const [r] = buildKnockoutBracket(
      [km(101, "final", null, null, null, null, "2026-07-19T17:00:00Z", ["Gan. SF1", "Gan. SF2"])],
      new Map(),
      new Set(),
      Date.parse("2026-07-01T00:00:00Z"),
    );
    const m = r.matches[0];
    expect(m.home.name).toBeNull();
    expect(m.home.placeholder).toBe("Gan. SF1");
    expect(m.hasResult).toBe(false);
    expect(m.winner).toBeNull();
  });
});
