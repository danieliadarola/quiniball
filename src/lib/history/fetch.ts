import "server-only";

/**
 * Historial de actividad de una quiniela. Combina dos fuentes y las ordena por
 * fecha (lo más reciente primero):
 *   · PUNTOS: se calculan al vuelo de predictions + matches finalizados (no se
 *     guardan). "Fran ganó 3 pts con España – Cabo Verde".
 *   · EVENTOS: altas/bajas y cambios de gestión, leídos de `group_events`.
 *
 * Usa el cliente admin (service_role): la pertenencia del usuario YA está
 * garantizada por la RLS en la página (si no es miembro, el grupo no carga).
 * Así resolvemos también nombres de ex-miembros (que la RLS ocultaría).
 */
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeam } from "@/data/tournament/teams";

export type HistoryKind =
  | "points"
  | "join"
  | "leave"
  | "remove"
  | "transfer"
  | "manager_add"
  | "manager_remove"
  | "rename";

export interface HistoryItem {
  id: string;
  at: string; // ISO, solo para ordenar
  when: string; // etiqueta formateada (es-ES, Europe/Madrid)
  kind: HistoryKind;
  actorId?: string;
  actor?: string;
  target?: string;
  points?: number;
  match?: string;
  name?: string;
}

interface EventRow {
  id: number;
  type: HistoryKind;
  actor_id: string | null;
  target_id: string | null;
  meta: { name?: string } | null;
  created_at: string;
}
interface MatchRow {
  match_number: number;
  kickoff_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
}
interface PredRow {
  profile_id: string;
  match_number: number;
  points_awarded: number;
}

const fmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export async function fetchHistory(groupId: string, limit = 40): Promise<HistoryItem[]> {
  const admin = createSupabaseAdmin();

  const [{ data: events }, { data: finished }] = await Promise.all([
    admin
      .from("group_events")
      .select("id, type, actor_id, target_id, meta, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(60) as unknown as Promise<{ data: EventRow[] | null }>,
    admin
      .from("matches")
      .select("match_number, kickoff_at, home_team_id, away_team_id")
      .eq("status", "finished")
      .order("kickoff_at", { ascending: false })
      .limit(25) as unknown as Promise<{ data: MatchRow[] | null }>,
  ]);

  const finishedMap = new Map<number, MatchRow>((finished ?? []).map((m) => [m.match_number, m]));
  const matchNums = [...finishedMap.keys()];

  const { data: preds } = (matchNums.length
    ? await admin
        .from("predictions")
        .select("profile_id, match_number, points_awarded")
        .eq("group_id", groupId)
        .gt("points_awarded", 0)
        .in("match_number", matchNums)
    : { data: [] as PredRow[] }) as { data: PredRow[] | null };

  // Nombres de todos los perfiles implicados (una sola consulta).
  const ids = new Set<string>();
  for (const e of events ?? []) {
    if (e.actor_id) ids.add(e.actor_id);
    if (e.target_id) ids.add(e.target_id);
  }
  for (const p of preds ?? []) ids.add(p.profile_id);

  const { data: profs } = (ids.size
    ? await admin.from("profiles").select("id, display_name").in("id", [...ids])
    : { data: [] as { id: string; display_name: string }[] }) as {
    data: { id: string; display_name: string }[] | null;
  };
  const nameOf = new Map((profs ?? []).map((p) => [p.id, p.display_name]));

  const items: HistoryItem[] = [];

  for (const p of preds ?? []) {
    const m = finishedMap.get(p.match_number);
    if (!m) continue;
    const home = m.home_team_id ? getTeam(m.home_team_id)?.name ?? "?" : "?";
    const away = m.away_team_id ? getTeam(m.away_team_id)?.name ?? "?" : "?";
    items.push({
      id: `pts-${p.profile_id}-${p.match_number}`,
      at: m.kickoff_at,
      when: fmt.format(new Date(m.kickoff_at)),
      kind: "points",
      actorId: p.profile_id,
      actor: nameOf.get(p.profile_id) ?? "Alguien",
      points: p.points_awarded,
      match: `${home} – ${away}`,
    });
  }

  for (const e of events ?? []) {
    items.push({
      id: `ev-${e.id}`,
      at: e.created_at,
      when: fmt.format(new Date(e.created_at)),
      kind: e.type,
      actorId: e.actor_id ?? undefined,
      actor: e.actor_id ? nameOf.get(e.actor_id) ?? "Alguien" : "Alguien",
      target: e.target_id ? nameOf.get(e.target_id) ?? "alguien" : undefined,
      name: e.meta?.name,
    });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return items.slice(0, limit);
}
