import Link from "next/link";
import { getSession, getSupabaseForCurrentUser } from "@/lib/auth/session";
import { getTeam } from "@/data/tournament/teams";
import { formatKickoff } from "@/lib/matches/format";
import { isPredictionLocked } from "@/lib/matches/schedule";
import { GroupCard } from "@/components/groups/GroupCard";

export const metadata = { title: "Mis quinielas · QuiniBall" };

// Paleta de acentos por quiniela (estable según el id).
const PALETTE = [
  { c: "#2563eb", a: "#22c55e" },
  { c: "#f97316", a: "#ef4444" },
  { c: "#8b5cf6", a: "#14b8a6" },
  { c: "#0ea5e9", a: "#f59e0b" },
  { c: "#e11d48", a: "#a3e635" },
];
function paletteFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

interface GroupRow {
  id: string;
  name: string;
  owner_id: string;
}
interface StandingRow {
  group_id: string;
  profile_id: string;
  total_points: number;
  rank: number;
}
interface MatchRow {
  match_number: number;
  kickoff_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
}

/** Home: mis quinielas, puntos totales y accesos a crear/unirse. */
export default async function GruposPage() {
  const session = await getSession();
  const sb = await getSupabaseForCurrentUser();
  if (!sb || !session) return null;

  const { data: groupsData } = (await sb
    .from("groups")
    .select("id, name, owner_id")
    .order("created_at", { ascending: false })) as { data: GroupRow[] | null };
  const groups = groupsData ?? [];
  const groupIds = groups.map((g) => g.id);

  // Datos agregados en pocas consultas (no por grupo).
  const [{ data: standings }, { data: myPreds }, { data: matches }] = await Promise.all([
    groupIds.length
      ? (sb.from("standings").select("group_id, profile_id, total_points, rank").in("group_id", groupIds) as unknown as Promise<{ data: StandingRow[] | null }>)
      : Promise.resolve({ data: [] as StandingRow[] }),
    sb.from("predictions").select("group_id, match_number").eq("profile_id", session.sub) as unknown as Promise<{ data: { group_id: string; match_number: number }[] | null }>,
    sb.from("matches").select("match_number, kickoff_at, home_team_id, away_team_id").order("match_number") as unknown as Promise<{ data: MatchRow[] | null }>,
  ]);

  const now = Date.now();
  const allMatches = matches ?? [];
  // Partidos aún pronosticables (cierre 5 min antes).
  const openMatchNumbers = allMatches
    .filter((m) => !isPredictionLocked(Date.parse(m.kickoff_at), now))
    .map((m) => m.match_number);
  // Próximo partido con rivales definidos.
  const nextMatch = allMatches.find(
    (m) => Date.parse(m.kickoff_at) > now && m.home_team_id && m.away_team_id,
  );
  const nextLabel = nextMatch
    ? `${getTeam(nextMatch.home_team_id!)?.name ?? "?"} vs ${getTeam(nextMatch.away_team_id!)?.name ?? "?"}`
    : null;
  const nextTime = nextMatch ? formatKickoff(nextMatch.kickoff_at) : null;

  // Mapas por grupo.
  const membersByGroup = new Map<string, number>();
  const mineByGroup = new Map<string, StandingRow>();
  for (const s of standings ?? []) {
    membersByGroup.set(s.group_id, (membersByGroup.get(s.group_id) ?? 0) + 1);
    if (s.profile_id === session.sub) mineByGroup.set(s.group_id, s);
  }
  const predsByGroup = new Map<string, Set<number>>();
  for (const p of myPreds ?? []) {
    if (!predsByGroup.has(p.group_id)) predsByGroup.set(p.group_id, new Set());
    predsByGroup.get(p.group_id)!.add(p.match_number);
  }

  const totalPts = [...mineByGroup.values()].reduce((s, r) => s + r.total_points, 0);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-0 px-5 py-6 safe-px [--pad-x:1.25rem] safe-pb [--pad-b:1.5rem]">
      {/* Saludo + puntos totales */}
      <div className="mb-1 flex items-end justify-between">
        <div>
          <span className="text-sm font-semibold text-muted">Hola,</span>
          <h1 className="font-display text-4xl font-extrabold italic uppercase leading-[0.9] text-fg">
            {session.display_name}
          </h1>
        </div>
        <div className="rounded-2xl border border-line bg-surface2 px-4 py-2 text-right">
          <span className="block font-display text-2xl font-extrabold leading-none text-accent">
            {totalPts}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
            pts totales
          </span>
        </div>
      </div>

      <div className="mb-3 mt-6 flex items-center gap-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-fg">Mis quinielas</h2>
        <span className="rounded-lg bg-surface3 px-2 py-0.5 text-xs font-extrabold text-muted">
          {groups.length}
        </span>
      </div>

      {groups.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <p className="text-fg">Todavía no estás en ninguna quiniela.</p>
          <p className="mt-1 text-sm text-muted">
            Crea una para tu oficina o únete con el código que te pasen.
          </p>
        </section>
      ) : (
        <ul
          className={`grid grid-cols-1 gap-3 ${
            groups.length > 1 ? "sm:grid-cols-2" : ""
          }`}
        >
          {groups.map((g) => {
            const pal = paletteFor(g.id);
            const mine = mineByGroup.get(g.id);
            const members = membersByGroup.get(g.id) ?? 1;
            const myPredSet = predsByGroup.get(g.id) ?? new Set<number>();
            const pending = openMatchNumbers.filter((n) => !myPredSet.has(n)).length;
            return (
              <GroupCard
                key={g.id}
                id={g.id}
                name={g.name}
                color={pal.c}
                accent={pal.a}
                rank={mine?.rank ?? null}
                members={members}
                points={mine?.total_points ?? 0}
                pending={pending}
                nextLabel={nextLabel}
                nextTime={nextTime}
                isOwner={g.owner_id === session.sub}
              />
            );
          })}
        </ul>
      )}

      <div className="mt-6 flex flex-col gap-2.5 sm:mx-auto sm:w-full sm:max-w-md sm:flex-row">
        <Link
          href="/grupos/nueva"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-bold text-primary-ink shadow-lg shadow-primary/25 transition hover:bg-primary-strong"
        >
          <span aria-hidden className="text-lg leading-none">＋</span> Crear quiniela
        </Link>
        <Link
          href="/unirse"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-line2 bg-surface2 px-5 py-3.5 font-semibold text-fg transition hover:border-primary/60"
        >
          Unirme con código
        </Link>
      </div>
    </main>
  );
}
