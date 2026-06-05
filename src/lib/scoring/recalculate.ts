/**
 * RECÁLCULO DE PUNTOS — orquestación pura.
 *
 * Cuando un partido se resuelve, hay que recalcular los puntos de todas las
 * predicciones de ese partido (de TODAS las quinielas). Como el baremo es ÚNICO
 * y fijo, lo único que cambia entre partidos es si es el "partido de la jornada"
 * (destacado): ese dato se pasa una vez por partido.
 *
 * Esta capa NO toca la base de datos: recibe los datos ya leídos y devuelve la
 * lista de actualizaciones { id, points } que el adaptador de BD persistirá
 * (con service_role, ya que `points_awarded` lo escribe el sistema, no el
 * jugador). Así es 100% testeable y reutilizable.
 */
import { type MatchResult, type Outcome } from "./types";
import { scoreMatch } from "./match";

/** Predicción de partido lista para puntuar (forma neutral de BD). */
export interface ScorablePrediction {
  id: string;
  predHomeGoals: number | null;
  predAwayGoals: number | null;
  predOutcome: Outcome | null;
}

/** Resultado del recálculo: qué puntos escribir en cada predicción. */
export interface PointsUpdate {
  id: string;
  points: number;
}

/**
 * Recalcula los puntos de todas las predicciones de un partido ya finalizado.
 *
 * @param isFeatured  `true` si el partido es el destacado de su jornada.
 * @param result      Resultado oficial del partido.
 * @param predictions Predicciones de ese partido (de cualquier quiniela).
 */
export function recalcMatchPoints(
  isFeatured: boolean,
  result: MatchResult,
  predictions: ScorablePrediction[],
): PointsUpdate[] {
  return predictions.map((p) => ({
    id: p.id,
    points: scoreMatch(
      isFeatured,
      {
        predHomeGoals: p.predHomeGoals,
        predAwayGoals: p.predAwayGoals,
        predOutcome: p.predOutcome,
      },
      result,
    ),
  }));
}
