import "server-only";

/**
 * NÚCLEO resultado → recálculo (independiente de la fuente).
 *
 * Recibe un resultado oficial (de un admin a mano HOY, o de la API de resultados
 * MAÑANA) y:
 *   1) averigua si el partido es el "destacado" de su jornada (matchdays),
 *   2) lee todas las predicciones de ese partido (de TODAS las quinielas),
 *   3) calcula los puntos con el motor puro (baremo único: 1X2 = 3, +5 exacto
 *      solo si es destacado),
 *   4) aplica marcador + puntos en una sola transacción (RPC atómica).
 *
 * El ranking se actualiza solo en los clientes vía Realtime (suscripción a
 * `matches`). Escribe con service_role: `points_awarded` lo fija el sistema.
 */
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { recalcMatchPoints, type ScorablePrediction } from "@/lib/scoring";
import type { MatchResult, Outcome } from "@/lib/scoring/types";

export interface ApplyResultOutcome {
  ok: boolean;
  error?: string;
  predictionsUpdated: number;
}

interface PredictionRow {
  id: string;
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

  // 1) ¿Es el partido destacado de alguna jornada?
  const { data: featuredRow, error: fErr } = (await admin
    .from("matchdays")
    .select("id")
    .eq("featured_match_number", matchNumber)
    .maybeSingle()) as { data: { id: number } | null; error: { message: string } | null };
  if (fErr) return { ok: false, error: fErr.message, predictionsUpdated: 0 };
  const isFeatured = featuredRow !== null;

  // 2) Predicciones del partido (de todas las quinielas).
  const { data: preds, error: pErr } = (await admin
    .from("predictions")
    .select("id, pred_home_goals, pred_away_goals, pred_outcome")
    .eq("match_number", matchNumber)) as { data: PredictionRow[] | null; error: { message: string } | null };
  if (pErr) return { ok: false, error: pErr.message, predictionsUpdated: 0 };

  const predictions = preds ?? [];

  // 3) Puntos con el motor puro (ya testeado).
  const result: MatchResult = { homeGoals, awayGoals };
  const scorable: ScorablePrediction[] = predictions.map((p) => ({
    id: p.id,
    predHomeGoals: p.pred_home_goals,
    predAwayGoals: p.pred_away_goals,
    predOutcome: p.pred_outcome,
  }));

  const updates = recalcMatchPoints(isFeatured, result, scorable);

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
