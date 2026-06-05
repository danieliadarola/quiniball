/**
 * API pública del motor de puntuación (modelo único).
 *
 * Uso típico (servidor, al cerrar un resultado):
 *   import { recalcMatchPoints } from "@/lib/scoring";
 */
export * from "./types";
export { outcomeFromGoals } from "./outcome";
export { scoreMatch } from "./match";
export {
  recalcMatchPoints,
  type ScorablePrediction,
  type PointsUpdate,
} from "./recalculate";
