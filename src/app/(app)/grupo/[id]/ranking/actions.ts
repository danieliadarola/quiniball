"use server";

/**
 * Server Action que reconsulta la clasificación con la sesión del jugador.
 * La invoca el cliente al recibir un cambio de `matches` por Realtime, así el
 * JWT permanece en la cookie httpOnly (no se expone al navegador).
 */
import { getSupabaseForCurrentUser } from "@/lib/auth/session";
import { fetchStandings, type StandingRow } from "@/lib/standings/fetch";

export async function refreshStandings(groupId: string): Promise<StandingRow[]> {
  if (!groupId) return [];
  const sb = await getSupabaseForCurrentUser();
  if (!sb) return [];
  // La RLS garantiza que solo un miembro obtiene filas de su quiniela.
  return fetchStandings(sb, groupId);
}
