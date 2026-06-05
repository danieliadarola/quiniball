/**
 * Puntuación de un PRONÓSTICO DE PARTIDO (modelo único).
 *
 * Función pura: recibe si el partido es el "destacado" de la jornada, el
 * pronóstico y el resultado oficial, y devuelve los puntos.
 *   · Acierto del 1X2 -> POINTS.outcome (3) en cualquier partido.
 *   · Si es destacado y además clava el marcador exacto -> +POINTS.exactBonus (5).
 * Un pronóstico vacío puntúa 0; un resultado inválido lanza ScoringError.
 */
import { type MatchPrediction, type MatchResult, type Outcome, POINTS } from "./types";
import { assertValidResult, outcomeFromGoals } from "./outcome";

/**
 * Resuelve el 1/X/2 del jugador: usa `predOutcome` si existe (partido normal) o
 * lo deriva de los goles pronosticados (partido destacado). Null si no hay nada.
 */
function predictedOutcome(pred: MatchPrediction): Outcome | null {
  if (pred.predOutcome) return pred.predOutcome;
  const { predHomeGoals: h, predAwayGoals: a } = pred;
  if (h !== null && a !== null) return outcomeFromGoals(h, a);
  return null;
}

/** ¿El marcador exacto pronosticado coincide con el resultado? */
function isExactHit(pred: MatchPrediction, result: MatchResult): boolean {
  const { predHomeGoals: h, predAwayGoals: a } = pred;
  return h !== null && a !== null && h === result.homeGoals && a === result.awayGoals;
}

/**
 * Puntúa un pronóstico de partido.
 * @param isFeatured `true` si es el "partido de la jornada" (puntúa también exacto).
 */
export function scoreMatch(
  isFeatured: boolean,
  pred: MatchPrediction,
  result: MatchResult,
): number {
  assertValidResult(result);

  const predicted = predictedOutcome(pred);
  const actual = outcomeFromGoals(result.homeGoals, result.awayGoals);

  let points = predicted !== null && predicted === actual ? POINTS.outcome : 0;

  // El bonus por marcador exacto solo existe en el partido destacado.
  if (isFeatured && isExactHit(pred, result)) {
    points += POINTS.exactBonus;
  }

  return points;
}
