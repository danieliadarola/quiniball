"use server";

/**
 * ACCIONES DE ADMINISTRADOR (fundador) — edición de pronósticos ajenos.
 *
 * Permiten que SOLO el admin global (`profiles.is_admin`) corrija el pronóstico
 * de cualquier participante en cualquier partido, incluido uno ya finalizado
 * (recalculando sus puntos). Es una herramienta de soporte privada: NO deja
 * rastro en el Historial (no se inserta en `group_events`).
 *
 * Seguridad:
 *  - Doble verificación de admin en CADA acción (nunca se confía en el cliente).
 *  - Escritura con `service_role`, que omite la RLS y el cierre por kickoff.
 *  - Se valida que el jugador objetivo pertenezca de verdad a la quiniela.
 *
 * Los puntos se recalculan SIEMPRE en el servidor con el motor puro (`scoreMatch`),
 * de forma autoritativa; lo que mande el cliente solo se usa para previsualizar.
 */
import { revalidatePath } from "next/cache";
import { isCurrentUserAdmin } from "@/lib/admin/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { hashPin } from "@/lib/auth/pin";
import { scoreMatch } from "@/lib/scoring/match";
import type { Outcome } from "@/lib/scoring/types";

/** Estado actual del pronóstico de un jugador en un partido (para precargar). */
export interface AdminTarget {
  playerName: string;
  finished: boolean;
  featured: boolean;
  result: { home: number; away: number } | null;
  current: {
    outcome: Outcome | null;
    homeGoals: number | null;
    awayGoals: number | null;
    pointsAwarded: number | null;
  } | null;
}

export interface LoadResult {
  error?: string;
  data?: AdminTarget;
}

export interface SaveResult {
  error?: string;
  ok?: boolean;
  newPoints?: number;
}

export interface ResetPinResult {
  error?: string;
  ok?: boolean;
  /** PIN temporal generado (se muestra UNA vez al admin para dárselo). */
  tempPin?: string;
  playerName?: string;
}

function deriveOutcome(h: number, a: number): Outcome {
  return h > a ? "1" : h === a ? "X" : "2";
}

function validGoals(n: unknown): n is number {
  return Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 99;
}

interface MatchRow {
  home_goals: number | null;
  away_goals: number | null;
}

/**
 * Carga el contexto de edición: pronóstico actual del jugador objetivo + estado
 * del partido (finalizado/destacado/resultado). Solo lectura, admin-gated.
 */
export async function loadAdminTarget(
  groupId: string,
  profileId: string,
  matchNumber: number,
): Promise<LoadResult> {
  try {
    if (!groupId || !profileId || !Number.isInteger(matchNumber)) {
      return { error: "Datos no válidos." };
    }
    if (!(await isCurrentUserAdmin())) return { error: "No autorizado." };

    const admin = createSupabaseAdmin();

    // El jugador debe pertenecer a la quiniela.
    const { data: member } = (await admin
      .from("group_members")
      .select("profile_id")
      .eq("group_id", groupId)
      .eq("profile_id", profileId)
      .maybeSingle()) as { data: { profile_id: string } | null };
    if (!member) return { error: "Ese jugador no pertenece a la quiniela." };

    const [{ data: match }, { data: feat }, { data: pred }, { data: prof }] =
      await Promise.all([
        admin
          .from("matches")
          .select("home_goals, away_goals")
          .eq("match_number", matchNumber)
          .maybeSingle() as unknown as Promise<{ data: MatchRow | null }>,
        admin
          .from("group_featured_matches")
          .select("match_number")
          .eq("group_id", groupId)
          .eq("match_number", matchNumber)
          .maybeSingle() as unknown as Promise<{ data: { match_number: number } | null }>,
        admin
          .from("predictions")
          .select("pred_home_goals, pred_away_goals, pred_outcome, points_awarded")
          .eq("group_id", groupId)
          .eq("profile_id", profileId)
          .eq("match_number", matchNumber)
          .maybeSingle() as unknown as Promise<{
          data: {
            pred_home_goals: number | null;
            pred_away_goals: number | null;
            pred_outcome: Outcome | null;
            points_awarded: number | null;
          } | null;
        }>,
        admin
          .from("profiles")
          .select("display_name")
          .eq("id", profileId)
          .maybeSingle() as unknown as Promise<{ data: { display_name: string } | null }>,
      ]);

    if (!match) return { error: "Partido no encontrado." };

    const finished = match.home_goals !== null && match.away_goals !== null;

    return {
      data: {
        playerName: prof?.display_name ?? "Jugador",
        finished,
        featured: feat !== null,
        result: finished ? { home: match.home_goals!, away: match.away_goals! } : null,
        current: pred
          ? {
              outcome: pred.pred_outcome,
              homeGoals: pred.pred_home_goals,
              awayGoals: pred.pred_away_goals,
              pointsAwarded: pred.points_awarded,
            }
          : null,
      },
    };
  } catch {
    return { error: "No se pudo cargar el pronóstico." };
  }
}

/**
 * Guarda (crea o sobrescribe) el pronóstico de un jugador y, si el partido ya
 * terminó, recalcula sus puntos. Admin-gated y autoritativo en el servidor.
 */
export async function saveAdminPrediction(input: {
  groupId: string;
  profileId: string;
  matchNumber: number;
  outcome: Outcome;
  homeGoals?: number | null;
  awayGoals?: number | null;
}): Promise<SaveResult> {
  try {
    const { groupId, profileId, matchNumber } = input;
    if (!groupId || !profileId || !Number.isInteger(matchNumber)) {
      return { error: "Datos no válidos." };
    }
    if (!["1", "X", "2"].includes(input.outcome)) {
      return { error: "Resultado 1·X·2 no válido." };
    }
    if (!(await isCurrentUserAdmin())) return { error: "No autorizado." };

    const admin = createSupabaseAdmin();

    // Verificar pertenencia del jugador a la quiniela.
    const { data: member } = (await admin
      .from("group_members")
      .select("profile_id")
      .eq("group_id", groupId)
      .eq("profile_id", profileId)
      .maybeSingle()) as { data: { profile_id: string } | null };
    if (!member) return { error: "Ese jugador no pertenece a la quiniela." };

    // Partido (para saber si está finalizado y su marcador).
    const { data: match } = (await admin
      .from("matches")
      .select("home_goals, away_goals")
      .eq("match_number", matchNumber)
      .maybeSingle()) as { data: MatchRow | null };
    if (!match) return { error: "Partido no encontrado." };

    // ¿Es el partido estrella de ESTA quiniela? (admite marcador exacto).
    const { data: feat } = (await admin
      .from("group_featured_matches")
      .select("match_number")
      .eq("group_id", groupId)
      .eq("match_number", matchNumber)
      .maybeSingle()) as { data: { match_number: number } | null };
    const featured = feat !== null;

    // Construir el pronóstico. El marcador exacto solo se guarda en el partido
    // estrella y, si se da, el 1X2 se deriva de él para no haber contradicción
    // (misma regla que el flujo normal de jugador).
    let predOutcome: Outcome = input.outcome;
    let ph: number | null = null;
    let pa: number | null = null;
    if (featured && input.homeGoals != null && input.awayGoals != null) {
      if (!validGoals(input.homeGoals) || !validGoals(input.awayGoals)) {
        return { error: "Marcador no válido." };
      }
      ph = input.homeGoals;
      pa = input.awayGoals;
      predOutcome = deriveOutcome(ph, pa);
    }

    // Recalcular puntos SOLO si el partido ya está finalizado.
    let points: number | null = null;
    if (match.home_goals !== null && match.away_goals !== null) {
      points = scoreMatch(
        featured,
        { predHomeGoals: ph, predAwayGoals: pa, predOutcome },
        { homeGoals: match.home_goals, awayGoals: match.away_goals },
      );
    }

    const { error } = await admin.from("predictions").upsert(
      {
        group_id: groupId,
        profile_id: profileId,
        match_number: matchNumber,
        pred_home_goals: ph,
        pred_away_goals: pa,
        pred_outcome: predOutcome,
        points_awarded: points,
      },
      { onConflict: "group_id,profile_id,match_number" },
    );
    if (error) return { error: "No se pudo guardar el cambio." };

    revalidatePath(`/grupo/${groupId}`);
    revalidatePath(`/grupo/${groupId}/calendario`);
    return { ok: true, newPoints: points ?? 0 };
  } catch {
    return { error: "Error inesperado al guardar." };
  }
}

/**
 * Resetea el PIN de un jugador a uno TEMPORAL de 4 dígitos. Solo el admin
 * global. Devuelve el PIN temporal (que el admin transmite a la persona); al
 * entrar con él, la app obliga a elegir uno nuevo (must_reset_pin = true).
 */
export async function resetMemberPin(profileId: string): Promise<ResetPinResult> {
  try {
    if (!profileId) return { error: "Datos no válidos." };
    if (!(await isCurrentUserAdmin())) return { error: "No autorizado." };

    const admin = createSupabaseAdmin();

    const { data: prof } = (await admin
      .from("profiles")
      .select("id, display_name")
      .eq("id", profileId)
      .maybeSingle()) as { data: { id: string; display_name: string } | null };
    if (!prof) return { error: "No se encontró a ese jugador." };

    // PIN temporal de 4 dígitos (admite ceros a la izquierda, p.ej. "0421").
    const tempPin = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const pin_hash = await hashPin(tempPin);

    const { error } = await admin
      .from("profiles")
      .update({
        pin_hash,
        must_reset_pin: true,
        // Limpia cualquier bloqueo por intentos fallidos para que pueda entrar ya.
        failed_attempts: 0,
        locked_until: null,
      })
      .eq("id", profileId);
    if (error) return { error: "No se pudo resetear el PIN. Inténtalo de nuevo." };

    return { ok: true, tempPin, playerName: prof.display_name };
  } catch {
    return { error: "Error inesperado al resetear el PIN." };
  }
}
