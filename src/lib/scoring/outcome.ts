/**
 * Utilidades de resultado 1/X/2 y validaciones compartidas por el motor.
 */
import { type MatchResult, type Outcome, ScoringError } from "./types";

/** Deriva el 1/X/2 a partir de un marcador. */
export function outcomeFromGoals(homeGoals: number, awayGoals: number): Outcome {
  if (homeGoals > awayGoals) return "1";
  if (homeGoals === awayGoals) return "X";
  return "2";
}

/** Valida que un resultado oficial sea usable (enteros no negativos). */
export function assertValidResult(result: MatchResult): void {
  if (
    !result ||
    !Number.isInteger(result.homeGoals) ||
    !Number.isInteger(result.awayGoals) ||
    result.homeGoals < 0 ||
    result.awayGoals < 0
  ) {
    throw new ScoringError(
      `Resultado de partido inválido: ${JSON.stringify(result)}`,
    );
  }
}

/** True si ambos goles del pronóstico están presentes y son válidos. */
export function hasPredictedGoals(
  home: number | null,
  away: number | null,
): home is number {
  return (
    home !== null &&
    away !== null &&
    Number.isInteger(home) &&
    Number.isInteger(away) &&
    home >= 0 &&
    away >= 0
  );
}
