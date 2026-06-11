import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getSession, getSupabaseForCurrentUser } from "@/lib/auth/session";
import { isCurrentUserAdmin } from "@/lib/admin/auth";
import { fetchStandings } from "@/lib/standings/fetch";
import { fetchHistory } from "@/lib/history/fetch";
import { getTeam } from "@/data/tournament/teams";
import { formatKickoff, formatDay } from "@/lib/matches/format";
import { isPredictionLocked, PREDICTION_LOCK_LEAD_MS } from "@/lib/matches/schedule";
import type { Outcome } from "@/lib/scoring/types";
import type { MatchVM, PredVM } from "@/components/predictions/MatchCard";
import { QuinielaScreen, type JornadaVM } from "@/components/quiniela/QuinielaScreen";

interface GroupRow {
  id: string;
  name: string;
  owner_id: string;
  join_code: string;
}
interface MatchdayRow {
  id: number;
  code: string;
  name: string;
}
interface MatchRow {
  match_number: number;
  matchday_id: number;
  phase: string;
  group_letter: string | null;
  kickoff_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home_goals: number | null;
  away_goals: number | null;
}
interface PredRow {
  match_number: number;
  pred_home_goals: number | null;
  pred_away_goals: number | null;
  pred_outcome: Outcome | null;
}

const PHASE_LABEL: Record<string, string> = {
  round32: "Dieciseisavos",
  round16: "Octavos",
  quarter: "Cuartos",
  semi: "Semifinales",
  third: "3.º puesto",
  final: "Final",
};

function outcomeFrom(h: number, a: number): Outcome {
  return h > a ? "1" : h === a ? "X" : "2";
}

export default async function GrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const sb = await getSupabaseForCurrentUser();
  if (!sb || !session) notFound();

  const { data: group } = (await sb
    .from("groups")
    .select("id, name, owner_id, join_code")
    .eq("id", id)
    .maybeSingle()) as { data: GroupRow | null };
  if (!group) notFound();

  const [{ data: mdRows }, { data: matchRows }, { data: predRows }, { data: featRows }, { data: memberRows }, standings] =
    await Promise.all([
      sb.from("matchdays").select("id, code, name").order("id") as unknown as Promise<{ data: MatchdayRow[] | null }>,
      sb
        .from("matches")
        .select(
          "match_number, matchday_id, phase, group_letter, kickoff_at, home_team_id, away_team_id, home_placeholder, away_placeholder, home_goals, away_goals",
        )
        .order("match_number") as unknown as Promise<{ data: MatchRow[] | null }>,
      sb
        .from("predictions")
        .select("match_number, pred_home_goals, pred_away_goals, pred_outcome")
        .eq("group_id", id)
        // SOLO los pronósticos del jugador que mira: la RLS deja leer los de
        // todo el grupo (para el ranking), así que aquí hay que acotar por
        // usuario o se pintaría el pronóstico de otro miembro en cada tarjeta.
        .eq("profile_id", session.sub) as unknown as Promise<{ data: PredRow[] | null }>,
      // Partidos estrella propios de ESTA quiniela (destacado por grupo).
      sb
        .from("group_featured_matches")
        .select("match_number")
        .eq("group_id", id) as unknown as Promise<{ data: { match_number: number }[] | null }>,
      // Co-organizadores de la quiniela (para mostrar y gestionar roles).
      sb
        .from("group_members")
        .select("profile_id, is_manager")
        .eq("group_id", id) as unknown as Promise<{ data: { profile_id: string; is_manager: boolean }[] | null }>,
      fetchStandings(sb, id),
    ]);

  // Historial (puntos + eventos). Usa admin internamente; la pertenencia ya
  // está garantizada porque el grupo cargó con RLS.
  const history = await fetchHistory(id);

  const matchdays = mdRows ?? [];
  const matches = matchRows ?? [];
  const featuredSet = new Set((featRows ?? []).map((f) => f.match_number));
  const now = Date.now();

  const predByMatch = new Map<number, PredVM>(
    (predRows ?? []).map((p) => [
      p.match_number,
      { outcome: p.pred_outcome, homeGoals: p.pred_home_goals, awayGoals: p.pred_away_goals },
    ]),
  );
  const predictions: Record<number, PredVM> = {};
  predByMatch.forEach((v, k) => (predictions[k] = v));

  // Construir las jornadas con sus partidos.
  const jornadas: JornadaVM[] = matchdays.map((md) => {
    const ms = matches
      .filter((m) => m.matchday_id === md.id)
      // Cronológico: el nº oficial FIFA no va por fecha, así que ordenamos por
      // hora de inicio (con el nº de partido como desempate por estabilidad).
      .sort(
        (a, b) =>
          Date.parse(a.kickoff_at) - Date.parse(b.kickoff_at) || a.match_number - b.match_number,
      );

    const vms: MatchVM[] = ms.map((m) => {
      const home = m.home_team_id ? getTeam(m.home_team_id) : undefined;
      const away = m.away_team_id ? getTeam(m.away_team_id) : undefined;
      const hasResult = m.home_goals !== null && m.away_goals !== null;
      const groupLabel =
        m.phase === "group" && m.group_letter ? `Grupo ${m.group_letter}` : PHASE_LABEL[m.phase] ?? "";
      return {
        matchNumber: m.match_number,
        groupLabel,
        timeLabel: formatKickoff(m.kickoff_at),
        home: home ? { name: home.name, iso: home.iso } : null,
        away: away ? { name: away.name, iso: away.iso } : null,
        homeLabel: home?.name ?? m.home_placeholder ?? "Por determinar",
        awayLabel: away?.name ?? m.away_placeholder ?? "Por determinar",
        locked: isPredictionLocked(Date.parse(m.kickoff_at), now),
        featured: featuredSet.has(m.match_number),
        result: hasResult
          ? { home: m.home_goals!, away: m.away_goals!, outcome: outcomeFrom(m.home_goals!, m.away_goals!) }
          : null,
      };
    });

    // Estado de la jornada a partir de los kickoffs.
    const koffs = ms.map((m) => Date.parse(m.kickoff_at));
    const earliest = Math.min(...koffs);
    const latest = Math.max(...koffs);
    let status: JornadaVM["status"] = "soon";
    if (now >= earliest - PREDICTION_LOCK_LEAD_MS) status = "live";
    if (now > latest + 2 * 60 * 60 * 1000) status = "done";

    return {
      code: md.code,
      name: md.name,
      dateLabel: Number.isFinite(earliest) ? formatDay(new Date(earliest).toISOString()) : "",
      status,
      matches: vms,
    };
  });

  const managerIds = (memberRows ?? []).filter((m) => m.is_manager).map((m) => m.profile_id);

  const me = standings.find((r) => r.profileId === session.sub);
  const origin = await getOrigin();

  // Puede gestionar (expulsar/transferir/eliminar) el dueño o el admin global.
  const canManage =
    group.owner_id === session.sub ? true : await isCurrentUserAdmin();

  return (
    <QuinielaScreen
      groupId={group.id}
      name={group.name}
      joinCode={group.join_code}
      inviteUrl={`${origin}/unirse?code=${group.join_code}`}
      myRank={me?.rank ?? null}
      myPoints={me?.totalPoints ?? 0}
      jornadas={jornadas}
      predictions={predictions}
      standings={standings}
      currentProfileId={session.sub}
      ownerId={group.owner_id}
      canManage={canManage}
      managerIds={managerIds}
      history={history}
    />
  );
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
