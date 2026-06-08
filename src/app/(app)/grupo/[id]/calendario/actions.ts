"use server";

/**
 * Server Action de pronósticos: guarda (crea o actualiza) la predicción del
 * jugador para un partido.
 *
 * El tipo de pronóstico depende de si el partido es el "destacado" de su
 * jornada (se calcula en el SERVIDOR, no se confía en el cliente):
 *  - Partido normal: se pide el 1X2.
 *  - Partido de la jornada: se pide el marcador exacto (el 1X2 se deriva).
 *
 * Defensa en profundidad sobre el cierre: la RLS ya impide insertar/editar tras
 * el kickoff; aquí damos además errores claros antes de tocar la BD.
 */
import { revalidatePath } from "next/cache";
import { getSession, getSupabaseForCurrentUser } from "@/lib/auth/session";
import { isPredictionLocked } from "@/lib/matches/schedule";
import type { Outcome } from "@/lib/scoring/types";

export interface PredictionState {
  error?: string;
  ok?: boolean;
}

function parseGoals(raw: FormDataEntryValue | null): number | null {
  const n = Number(String(raw ?? "").trim());
  if (!Number.isInteger(n) || n < 0 || n > 99) return null;
  return n;
}

export async function savePrediction(
  _prev: PredictionState,
  formData: FormData,
): Promise<PredictionState> {
  const groupId = String(formData.get("groupId") ?? "");
  const matchNumber = Number(formData.get("matchNumber"));
  if (!groupId || !Number.isInteger(matchNumber)) {
    return { error: "Datos del pronóstico no válidos." };
  }

  const session = await getSession();
  const sb = await getSupabaseForCurrentUser();
  if (!sb || !session) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  // Grupo: la RLS solo lo devuelve si eres miembro.
  const { data: group } = (await sb
    .from("groups")
    .select("id")
    .eq("id", groupId)
    .maybeSingle()) as { data: { id: string } | null };
  if (!group) return { error: "No perteneces a esta quiniela." };

  // Partido → kickoff y equipos.
  const { data: match } = (await sb
    .from("matches")
    .select("match_number, kickoff_at, home_team_id, away_team_id")
    .eq("match_number", matchNumber)
    .maybeSingle()) as {
    data: {
      match_number: number;
      kickoff_at: string;
      home_team_id: string | null;
      away_team_id: string | null;
    } | null;
  };
  if (!match) return { error: "Partido no encontrado." };
  if (!match.home_team_id || !match.away_team_id) {
    return { error: "Este partido aún no tiene rivales definidos." };
  }

  const now = Date.now();
  if (isPredictionLocked(Date.parse(match.kickoff_at), now)) {
    return { error: "El plazo se cierra 5 minutos antes del inicio y ya ha pasado." };
  }

  // ¿Es el partido estrella DE ESTA quiniela? (admite además marcador exacto).
  // El destacado es por grupo, así que se consulta contra group_featured_matches.
  const { data: featured } = (await sb
    .from("group_featured_matches")
    .select("match_number")
    .eq("group_id", groupId)
    .eq("match_number", matchNumber)
    .maybeSingle()) as { data: { match_number: number } | null };
  const isFeatured = featured !== null;

  // Todo partido lleva un pick 1·X·2 obligatorio.
  const outcome = String(formData.get("outcome") ?? "");
  if (!["1", "X", "2"].includes(outcome)) {
    return { error: "Elige un resultado: 1, X o 2." };
  }

  const prediction: {
    pred_home_goals: number | null;
    pred_away_goals: number | null;
    pred_outcome: Outcome;
  } = { pred_home_goals: null, pred_away_goals: null, pred_outcome: outcome as Outcome };

  // En el partido estrella, marcador exacto OPCIONAL (bonus). Si se envía, el
  // 1X2 se mantiene coherente con el marcador para no haber contradicción.
  if (isFeatured) {
    const home = parseGoals(formData.get("homeGoals"));
    const away = parseGoals(formData.get("awayGoals"));
    if (home !== null && away !== null) {
      prediction.pred_home_goals = home;
      prediction.pred_away_goals = away;
      prediction.pred_outcome = home > away ? "1" : home === away ? "X" : "2";
    }
  }

  const { error } = await sb.from("predictions").upsert(
    {
      group_id: groupId,
      profile_id: session.sub,
      match_number: matchNumber,
      ...prediction,
    },
    { onConflict: "group_id,profile_id,match_number" },
  );

  if (error) {
    return { error: "No se pudo guardar el pronóstico. Inténtalo de nuevo." };
  }

  revalidatePath(`/grupo/${groupId}/calendario`);
  return { ok: true };
}
