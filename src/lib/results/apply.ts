import "server-only";

/**
 * NÚCLEO resultado → recálculo (independiente de la fuente).
 *
 * Recibe un resultado oficial (de un admin a mano HOY, o de la API de resultados
 * MAÑANA) y:
 *   1) averigua en QUÉ quinielas este partido es el "destacado" (es por grupo),
 *   2) lee todas las predicciones de ese partido (de TODAS las quinielas), con
 *      su group_id,
 *   3) calcula los puntos con el motor puro (1X2 = 3; +5 exacto solo si el
 *      partido es el destacado DE ESA quiniela),
 *   4) aplica marcador + puntos en una sola transacción (RPC atómica).
 *
 * El ranking se actualiza solo en los clientes vía Realtime (suscripción a
 * `matches`). Escribe con service_role: `points_awarded` lo fija el sistema.
 */
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { recalcMatchPoints, type ScorablePrediction } from "@/lib/scoring";
import { exactBonusFor, FINAL_MATCH_NUMBER, type MatchResult, type Outcome } from "@/lib/scoring/types";

export interface ApplyResultOutcome {
  ok: boolean;
  error?: string;
  predictionsUpdated: number;
}

interface PredictionRow {
  id: string;
  group_id: string;
  pred_home_goals: number | null;
  pred_away_goals: number | null;
  pred_outcome: Outcome | null;
}

export async function applyMatchResult(
  matchNumber: number,
  homeGoals: number,
  awayGoals: number,
): Promise<ApplyResultOutcome> {
  if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) {
    return { ok: false, error: "Marcador no válido.", predictionsUpdated: 0 };
  }

  const admin = createSupabaseAdmin();

  // 1) ¿En qué quinielas es ESTE el partido destacado? (es por grupo)
  const { data: featuredRows, error: fErr } = (await admin
    .from("group_featured_matches")
    .select("group_id")
    .eq("match_number", matchNumber)) as {
    data: { group_id: string }[] | null;
    error: { message: string } | null;
  };
  if (fErr) return { ok: false, error: fErr.message, predictionsUpdated: 0 };
  const featuredGroups = new Set((featuredRows ?? []).map((r) => r.group_id));

  // 2) Predicciones del partido (de todas las quinielas), con su grupo.
  const { data: preds, error: pErr } = (await admin
    .from("predictions")
    .select("id, group_id, pred_home_goals, pred_away_goals, pred_outcome")
    .eq("match_number", matchNumber)) as { data: PredictionRow[] | null; error: { message: string } | null };
  if (pErr) return { ok: false, error: pErr.message, predictionsUpdated: 0 };

  const predictions = preds ?? [];

  // 3) Puntos con el motor puro (ya testeado). El bonus por marcador exacto solo
  //    aplica a las predicciones cuya quiniela tiene este partido como estrella.
  //    La GRAN FINAL (#104) es estrella de TODAS las quinielas y su marcador
  //    exacto vale el doble (10 en vez de 5).
  const isFinal = matchNumber === FINAL_MATCH_NUMBER;
  const result: MatchResult = { homeGoals, awayGoals };
  const scorable: ScorablePrediction[] = predictions.map((p) => ({
    id: p.id,
    predHomeGoals: p.pred_home_goals,
    predAwayGoals: p.pred_away_goals,
    predOutcome: p.pred_outcome,
    // La final es estrella para todos aunque a un grupo le faltara la fila.
    featured: isFinal || featuredGroups.has(p.group_id),
  }));

  const updates = recalcMatchPoints(false, result, scorable, exactBonusFor(matchNumber));

  // 4) Aplicación atómica (marcador + puntos) en una transacción.
  const { error: rErr } = await admin.rpc("apply_match_result", {
    p_match_number: matchNumber,
    p_home: homeGoals,
    p_away: awayGoals,
    p_points: updates,
  });
  if (rErr) {
    const msg = rErr.message.includes("MATCH_NOT_FOUND")
      ? "El partido no existe."
      : "No se pudo guardar el resultado.";
    return { ok: false, error: msg, predictionsUpdated: 0 };
  }

  return { ok: true, predictionsUpdated: updates.length };
}
