/**
 * Tests del motor de puntuación (modelo único). Ejecutar con: `npm run test`
 */
import { describe, it, expect } from "vitest";
import { ScoringError, type MatchPrediction } from "./types";
import { outcomeFromGoals } from "./outcome";
import { scoreMatch } from "./match";

const pred = (
  h: number | null,
  a: number | null,
  o: MatchPrediction["predOutcome"] = null,
): MatchPrediction => ({ predHomeGoals: h, predAwayGoals: a, predOutcome: o });

// ---------------------------------------------------------------------------
describe("outcomeFromGoals", () => {
  it("deriva 1/X/2 correctamente", () => {
    expect(outcomeFromGoals(2, 1)).toBe("1");
    expect(outcomeFromGoals(1, 1)).toBe("X");
    expect(outcomeFromGoals(0, 3)).toBe("2");
  });
});

// ---------------------------------------------------------------------------
describe("scoreMatch — partido NORMAL (solo 1X2)", () => {
  it("acierta el 1X2 con predOutcome -> 3", () => {
    expect(scoreMatch(false, pred(null, null, "1"), { homeGoals: 2, awayGoals: 1 })).toBe(3);
  });
  it("acierta el 1X2 derivado de goles -> 3", () => {
    expect(scoreMatch(false, pred(2, 1), { homeGoals: 3, awayGoals: 0 })).toBe(3);
  });
  it("falla el 1X2 -> 0", () => {
    expect(scoreMatch(false, pred(null, null, "2"), { homeGoals: 2, awayGoals: 1 })).toBe(0);
  });
  it("clava el marcador exacto pero NO es destacado -> solo 3 (sin bonus)", () => {
    expect(scoreMatch(false, pred(2, 1), { homeGoals: 2, awayGoals: 1 })).toBe(3);
  });
  it("sin pronóstico -> 0", () => {
    expect(scoreMatch(false, pred(null, null), { homeGoals: 1, awayGoals: 1 })).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe("scoreMatch — partido DE LA JORNADA (1X2 + exacto)", () => {
  it("acierta 1X2 y marcador exacto -> 3 + 5 = 8", () => {
    expect(scoreMatch(true, pred(2, 1), { homeGoals: 2, awayGoals: 1 })).toBe(8);
  });
  it("acierta el 1X2 pero no el marcador -> solo 3", () => {
    expect(scoreMatch(true, pred(3, 0), { homeGoals: 2, awayGoals: 1 })).toBe(3);
  });
  it("falla el 1X2 (aunque el marcador estuviera cerca) -> 0", () => {
    expect(scoreMatch(true, pred(1, 2), { homeGoals: 2, awayGoals: 1 })).toBe(0);
  });
  it("empate exacto acertado -> 8", () => {
    expect(scoreMatch(true, pred(1, 1), { homeGoals: 1, awayGoals: 1 })).toBe(8);
  });
});

// ---------------------------------------------------------------------------
describe("scoreMatch — validación", () => {
  it("lanza ScoringError con resultado inválido", () => {
    expect(() => scoreMatch(false, pred(1, 0), { homeGoals: -1, awayGoals: 0 })).toThrow(ScoringError);
  });
});
