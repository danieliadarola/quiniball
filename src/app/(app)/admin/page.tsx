import { notFound } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/admin/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getTeam } from "@/data/tournament/teams";
import type { Phase } from "@/data/tournament/types";
import { groupIntoSections } from "@/lib/matches/schedule";
import { formatKickoff } from "@/lib/matches/format";
import { ResultForm } from "@/components/admin/ResultForm";

interface MatchRow {
  match_number: number;
  phase: Phase;
  kickoff_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  status: "scheduled" | "live" | "finished";
  home_goals: number | null;
  away_goals: number | null;
}

export default async function AdminPage() {
  // Verja: si no eres admin, la página "no existe".
  if (!(await isCurrentUserAdmin())) notFound();

  const admin = createSupabaseAdmin();
  const { data } = (await admin
    .from("matches")
    .select(
      "match_number, phase, kickoff_at, home_team_id, away_team_id, home_placeholder, away_placeholder, status, home_goals, away_goals",
    )
    .order("match_number")) as { data: MatchRow[] | null };

  const matches = data ?? [];
  const sections = groupIntoSections(
    matches.map((m) => ({ matchNumber: m.match_number, phase: m.phase, kickoff: m.kickoff_at })),
  );
  const byId = new Map(matches.map((m) => [m.match_number, m]));
  const finishedCount = matches.filter((m) => m.status === "finished").length;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl uppercase tracking-wide text-slate-100">
          Panel de resultados
        </h1>
        <p className="text-sm text-muted">
          Introduce el marcador oficial de cada partido. Al guardar, se recalculan
          los puntos de <span className="font-medium text-slate-200">todas</span> las
          quinielas y el ranking se actualiza en vivo.
        </p>
        <p className="rounded-xl bg-surface px-4 py-3 text-xs text-muted">
          Más adelante esto se sincronizará solo con los datos oficiales. Este panel
          quedará como respaldo manual. · {finishedCount}/{matches.length} partidos con
          resultado.
        </p>
      </header>

      {sections.map((section) => (
        <section key={section.key} className="flex flex-col gap-3">
          <h2 className="font-display text-base uppercase tracking-wider text-accent">
            {section.label}
          </h2>
          <ul className="flex flex-col gap-3">
            {section.matches.map((sm) => {
              const m = byId.get(sm.matchNumber)!;
              const home = m.home_team_id ? getTeam(m.home_team_id) : undefined;
              const away = m.away_team_id ? getTeam(m.away_team_id) : undefined;

              // Eliminatorias sin rivales definidos: aún no se puntúa.
              if (!home || !away) {
                return (
                  <li
                    key={m.match_number}
                    className="rounded-2xl border border-dashed border-line px-4 py-3 text-center text-xs text-muted"
                  >
                    #{m.match_number} · {m.home_placeholder ?? "?"} vs{" "}
                    {m.away_placeholder ?? "?"} — equipos por determinar
                  </li>
                );
              }

              return (
                <ResultForm
                  key={m.match_number}
                  matchNumber={m.match_number}
                  kickoffLabel={formatKickoff(m.kickoff_at)}
                  homeLabel={home.name}
                  awayLabel={away.name}
                  homeIso={home.iso}
                  awayIso={away.iso}
                  finished={m.status === "finished"}
                  current={
                    m.home_goals !== null && m.away_goals !== null
                      ? { home: m.home_goals, away: m.away_goals }
                      : null
                  }
                />
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
