import Link from "next/link";
import { getSession, getSupabaseForCurrentUser } from "@/lib/auth/session";
import { isCurrentUserAdmin } from "@/lib/admin/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeam } from "@/data/tournament/teams";
import { formatKickoff } from "@/lib/matches/format";
import { isPredictionLocked } from "@/lib/matches/schedule";
import { GroupCard } from "@/components/groups/GroupCard";
import { ManageGroupsButton } from "@/components/groups/ManageGroupsButton";
import { PhaseCountdown, type PhaseStart } from "@/components/dashboard/PhaseCountdown";

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
  phase: string;
  kickoff_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
}

// Fases del torneo en orden, con su etiqueta. "third" (3.º puesto) se omite del
// contador: no es una "fase" que el jugador espere, va pegada a la final.
const PHASE_LABEL: Record<string, string> = {
  group: "Fase de grupos",
  round32: "Dieciseisavos",
  round16: "Octavos",
  quarter: "Cuartos",
  semi: "Semifinales",
  final: "Final",
};
const PHASE_ORDER = ["group", "round32", "round16", "quarter", "semi", "final"];

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
    sb.from("matches").select("match_number, phase, kickoff_at, home_team_id, away_team_id").order("match_number") as unknown as Promise<{ data: MatchRow[] | null }>,
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

  // Inicio (kickoff más temprano) de cada fase, para el contador del dashboard.
  const phaseStart = new Map<string, number>();
  for (const m of allMatches) {
    const t = Date.parse(m.kickoff_at);
    const cur = phaseStart.get(m.phase);
    if (cur == null || t < cur) phaseStart.set(m.phase, t);
  }
  const phases: PhaseStart[] = PHASE_ORDER.filter((p) => phaseStart.has(p)).map((p) => ({
    phase: p,
    label: PHASE_LABEL[p],
    startMs: phaseStart.get(p)!,
  }));

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

  // --- ADMIN: todas las DEMÁS quinielas (las que no son mías) ----------------
  // El fundador ve un apartado extra con las quinielas creadas por otras
  // personas, para poder entrar (con service_role) a editar/gestionar. Se lee
  // con cliente admin porque la RLS solo devolvería las propias.
  const isAppAdmin = await isCurrentUserAdmin();
  let otherGroups: { id: string; name: string; ownerName: string; members: number }[] = [];
  if (isAppAdmin) {
    const admin = createSupabaseAdmin();
    const mineSet = new Set(groupIds);
    const { data: allGroups } = (await admin
      .from("groups")
      .select("id, name, owner_id, created_at")
      .order("created_at", { ascending: false })) as {
      data: { id: string; name: string; owner_id: string; created_at: string }[] | null;
    };
    const others = (allGroups ?? []).filter((g) => !mineSet.has(g.id));
    if (others.length) {
      const otherIds = others.map((g) => g.id);
      const ownerIds = Array.from(new Set(others.map((g) => g.owner_id)));
      const [{ data: gms }, { data: owners }] = await Promise.all([
        admin.from("group_members").select("group_id").in("group_id", otherIds) as unknown as Promise<{
          data: { group_id: string }[] | null;
        }>,
        admin.from("profiles").select("id, display_name").in("id", ownerIds) as unknown as Promise<{
          data: { id: string; display_name: string }[] | null;
        }>,
      ]);
      const countByGroup = new Map<string, number>();
      for (const r of gms ?? []) countByGroup.set(r.group_id, (countByGroup.get(r.group_id) ?? 0) + 1);
      const nameById = new Map<string, string>((owners ?? []).map((o) => [o.id, o.display_name]));
      otherGroups = others.map((g) => ({
        id: g.id,
        name: g.name,
        ownerName: nameById.get(g.owner_id) ?? "—",
        members: countByGroup.get(g.id) ?? 0,
      }));
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-0 px-5 py-6 safe-px [--pad-x:1.25rem] safe-pb [--pad-b:1.5rem]">
      {/* Saludo + contador de la próxima fase (esquina superior derecha) */}
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-muted">Hola,</span>
          <h1 className="truncate font-display text-4xl font-extrabold italic uppercase leading-[0.9] text-fg">
            {session.display_name}
          </h1>
        </div>
        <PhaseCountdown phases={phases} />
      </div>

      <div className="mb-3 mt-6 flex items-center gap-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wide text-fg">Mis quinielas</h2>
        <span className="rounded-lg bg-surface3 px-2 py-0.5 text-xs font-extrabold text-muted">
          {groups.length}
        </span>
        {groups.length > 0 && (
          <div className="ml-auto">
            <ManageGroupsButton
              groups={groups.map((g) => ({
                id: g.id,
                name: g.name,
                isOwner: g.owner_id === session.sub,
              }))}
            />
          </div>
        )}
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

      {/* Apartado solo para el admin global: las quinielas del resto de gente. */}
      {isAppAdmin && otherGroups.length > 0 && (
        <section className="mt-10">
          <div className="mb-1.5 flex items-center gap-2">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-fg">Otras quinielas</h2>
            <span className="rounded-lg bg-surface3 px-2 py-0.5 text-xs font-extrabold text-muted">
              {otherGroups.length}
            </span>
            <span className="ml-auto rounded-lg border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-accent">
              Admin
            </span>
          </div>
          <p className="mb-3 text-xs text-muted">
            Creadas por otras personas. Entra para editar pronósticos o gestionarlas.
          </p>
          <ul className="flex flex-col gap-2">
            {otherGroups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/grupo/${g.id}`}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface2 px-4 py-3 transition hover:border-primary/60"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-fg">{g.name}</span>
                    <span className="text-[11.5px] font-bold text-muted">
                      {g.ownerName} · {g.members} {g.members === 1 ? "jugador" : "jugadores"}
                    </span>
                  </div>
                  <svg viewBox="0 0 24 24" width="18" height="18" className="qb-stroke text-muted" aria-hidden>
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
