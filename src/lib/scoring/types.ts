/**
 * Tipos y constantes del MOTOR DE PUNTUACIÓN (modelo ÚNICO).
 *
 * Reglas FIJAS, iguales para todas las quinielas (ya no son configurables):
 *   · Todo el torneo se juega 1X2: acertar ganador/empate = 3 puntos.
 *   · 1 "partido de la jornada" por jornada (aleatorio y global) puntúa, además
 *     del 1X2, el marcador EXACTO: +5 puntos. Máximo en ese partido = 8.
 *
 * El motor es PURO: recibe (esDestacado, pronóstico, resultado) y devuelve los
 * puntos. No conoce la BD ni la UI; así es fácil de testear y reutilizar tanto
 * en el servidor (recálculo) como en el cliente (previsualización).
 */

// --- Resultados 1/X/2 ------------------------------------------------------

export type Outcome = "1" | "X" | "2"; // 1 = gana local, X = empate, 2 = gana visitante

// --- Baremo FIJO de la app -------------------------------------------------

export const POINTS = {
  /** Acertar el 1X2 (ganador/empate). Aplica a TODOS los partidos. */
  outcome: 3,
  /** Extra por marcador exacto. Solo el "partido de la jornada". */
  exactBonus: 5,
  /**
   * Extra por marcador exacto en la GRAN FINAL (partido estrella de todas las
   * quinielas). Vale el doble: acertar el resultado exacto de la final suma 10
   * (más los 3 del 1X2 = 13 en total).
   */
  finalExactBonus: 10,
} as const;

/**
 * Número de partido de la GRAN FINAL (numeración FIFA). Es la estrella común de
 * todas las quinielas del Mundial y su marcador exacto puntúa reforzado.
 */
export const FINAL_MATCH_NUMBER = 104;

/**
 * Bonus por marcador exacto que corresponde a un partido: la final vale el
 * doble (`finalExactBonus`); el resto, el bonus normal (`exactBonus`).
 */
export function exactBonusFor(matchNumber: number): number {
  return matchNumber === FINAL_MATCH_NUMBER ? POINTS.finalExactBonus : POINTS.exactBonus;
}

// --- Entradas del motor ----------------------------------------------------

/**
 * Pronóstico de un partido.
 *  - Partido normal: solo se rellena `predOutcome` (1/X/2).
 *  - Partido de la jornada: se rellenan los goles (`predHomeGoals`/`predAwayGoals`)
 *    y el 1X2 se deriva de ellos.
 */
export interface MatchPrediction {
  predHomeGoals: number | null;
  predAwayGoals: number | null;
  predOutcome: Outcome | null;
}

/** Resultado OFICIAL de un partido ya finalizado. */
export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
}

/** Error de dominio del motor (entradas inválidas). */
export class ScoringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScoringError";
  }
}
