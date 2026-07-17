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
import { type MatchResult, type Outcome, POINTS } from "./types";
import { scoreMatch } from "./match";

/** Predicción de partido lista para puntuar (forma neutral de BD). */
export interface ScorablePrediction {
  id: string;
  predHomeGoals: number | null;
  predAwayGoals: number | null;
  predOutcome: Outcome | null;
  /**
   * Destacado POR PREDICCIÓN: si se indica, prevalece sobre el `isFeatured`
   * global. Necesario ahora que el partido estrella es propio de cada quiniela
   * (un mismo partido puede ser estrella en una quiniela y normal en otra).
   */
  featured?: boolean;
}

/** Resultado del recálculo: qué puntos escribir en cada predicción. */
export interface PointsUpdate {
  id: string;
  points: number;
}

/**
 * Recalcula los puntos de todas las predicciones de un partido ya finalizado.
 *
 * @param isFeatured  Destacado por DEFECTO del partido. Cada predicción puede
 *                    anularlo con su propio `featured` (destacado por quiniela).
 * @param result      Resultado oficial del partido.
 * @param predictions Predicciones de ese partido (de cualquier quiniela).
 * @param exactBonus  Puntos del marcador exacto en este partido (por defecto 5;
 *                    la GRAN FINAL pasa 10 — ver `exactBonusFor`).
 */
export function recalcMatchPoints(
  isFeatured: boolean,
  result: MatchResult,
  predictions: ScorablePrediction[],
  exactBonus: number = POINTS.exactBonus,
): PointsUpdate[] {
  return predictions.map((p) => ({
    id: p.id,
    points: scoreMatch(
      p.featured ?? isFeatured,
      {
        predHomeGoals: p.predHomeGoals,
        predAwayGoals: p.predAwayGoals,
        predOutcome: p.predOutcome,
      },
      result,
      exactBonus,
    ),
  }));
}
