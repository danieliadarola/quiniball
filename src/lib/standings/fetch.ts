/**
 * Lectura de la clasificación (vista `standings`).
 *
 * La vista es SECURITY INVOKER: respeta la RLS del jugador que consulta. Como
 * los puntos solo existen tras el resultado (post-kickoff, ya visibles), los
 * totales son coherentes para todos los miembros.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface StandingRow {
  profileId: string;
  displayName: string;
  totalPoints: number;
  exactHits: number;
  outcomeHits: number;
  rank: number;
  avatarStyle: string | null;
  avatarSeed: string | null;
  /** Campeón de la quiniela (solo tras terminar el Mundial). Co-campeones si empate. */
  isChampion: boolean;
}

interface StandingDbRow {
  profile_id: string;
  display_name: string;
  total_points: number;
  exact_hits: number;
  outcome_hits: number;
  rank: number;
  avatar_style: string | null;
  avatar_seed: string | null;
  is_champion: boolean | null;
}

/** Devuelve la clasificación de una quiniela, ordenada por posición. */
export async function fetchStandings(
  sb: SupabaseClient,
  groupId: string,
): Promise<StandingRow[]> {
  const { data, error } = await sb
    .from("standings")
    .select(
      "profile_id, display_name, total_points, exact_hits, outcome_hits, rank, avatar_style, avatar_seed, is_champion",
    )
    .eq("group_id", groupId)
    .order("rank", { ascending: true });

  if (error || !data) return [];

  return (data as StandingDbRow[]).map((r) => ({
    profileId: r.profile_id,
    displayName: r.display_name,
    totalPoints: r.total_points,
    exactHits: r.exact_hits,
    outcomeHits: r.outcome_hits,
    rank: r.rank,
    avatarStyle: r.avatar_style,
    avatarSeed: r.avatar_seed,
    isChampion: r.is_champion ?? false,
  }));
}
