/**
 * Tests del recálculo de puntos de un partido (todas las quinielas a la vez).
 */
import { describe, it, expect } from "vitest";
import { recalcMatchPoints, type ScorablePrediction } from "./recalculate";

const result = { homeGoals: 2, awayGoals: 1 }; // gana local -> '1'

const p = (
  id: string,
  h: number | null,
  a: number | null,
  o: ScorablePrediction["predOutcome"] = null,
): ScorablePrediction => ({ id, predHomeGoals: h, predAwayGoals: a, predOutcome: o });

describe("recalcMatchPoints", () => {
  it("partido normal: 3 al que acierta el 1X2, 0 al que falla (sin bonus exacto)", () => {
    const preds = [
      p("a", null, null, "1"), // acierta 1X2 -> 3
      p("b", null, null, "2"), // falla -> 0
      p("c", 2, 1),            // marcador exacto, pero normal -> solo 3
    ];
    expect(recalcMatchPoints(false, result, preds)).toEqual([
      { id: "a", points: 3 },
      { id: "b", points: 0 },
      { id: "c", points: 3 },
    ]);
  });

  it("partido de la jornada: el marcador exacto suma el bonus (3 + 5)", () => {
    const preds = [
      p("a", 2, 1), // exacto -> 8
      p("b", 3, 0), // acierta 1X2 sin marcador -> 3
      p("c", 0, 1), // falla -> 0
    ];
    expect(recalcMatchPoints(true, result, preds)).toEqual([
      { id: "a", points: 8 },
      { id: "b", points: 3 },
      { id: "c", points: 0 },
    ]);
  });

  it("lista vacía -> sin actualizaciones", () => {
    expect(recalcMatchPoints(false, result, [])).toEqual([]);
  });
});
