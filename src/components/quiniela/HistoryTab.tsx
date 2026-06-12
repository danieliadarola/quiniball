"use client";

/**
 * Pestaña "Historial": partidos que ya empezaron (en juego o finalizados). Al
 * pinchar uno se despliegan los pronósticos de CADA jugador de la quiniela: su
 * 1X2, el marcador exacto (en el partido estrella) y los puntos que sacó.
 *
 * Los datos llegan ya preparados del servidor (lib/history/picks) — que NUNCA
 * incluye partidos sin empezar, para no revelar picks antes del cierre.
 */
import { useState } from "react";
import { Flag } from "@/components/ui/Flag";
import { Avatar } from "@/components/ui/Avatar";
import type { MatchPicks, PlayerPick } from "@/lib/history/picks";
import type { Outcome } from "@/lib/scoring/types";

const OUTCOME_LABEL: Record<Outcome, string> = { "1": "Local", X: "Empate", "2": "Visit." };

export function HistoryTab({
  matches,
  currentProfileId,
}: {
  matches: MatchPicks[];
  currentProfileId: string;
}) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());

  function toggle(n: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  if (matches.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
        <p className="text-fg">Aún no ha empezado ningún partido.</p>
        <p className="mt-1 text-sm text-muted">
          Cuando arranque un partido podrás ver aquí los pronósticos de cada jugador.
        </p>
      </section>
    );
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {matches.map((m) => (
        <MatchRow
          key={m.matchNumber}
          match={m}
          isOpen={open.has(m.matchNumber)}
          onToggle={() => toggle(m.matchNumber)}
          currentProfileId={currentProfileId}
        />
      ))}
    </ul>
  );
}

function MatchRow({
  match,
  isOpen,
  onToggle,
  currentProfileId,
}: {
  match: MatchPicks;
  isOpen: boolean;
  onToggle: () => void;
  currentProfileId: string;
}) {
  const live = match.status === "live";
  const predicted = match.picks.filter((p) => p.outcome !== null).length;

  return (
    <li className="overflow-hidden rounded-2xl border border-line bg-surface">
      {/* Cabecera del partido (siempre visible, clicable) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-surface2"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="truncate text-[10.5px] font-extrabold uppercase tracking-[0.5px] text-muted">
              {match.groupLabel}
            </span>
            {match.featured && (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.3px] text-accent">
                ★ Estrella
              </span>
            )}
            {live ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.4px] text-[#0a2a00]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0a2a00]" />
                En juego
              </span>
            ) : (
              <span className="text-[10.5px] font-bold text-muted2">{match.whenLabel}</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Flag iso={match.home.iso} size={26} />
              <span className="truncate text-[14px] font-bold">{match.home.name}</span>
            </div>
            <span className="shrink-0 rounded-md bg-surface3 px-2 py-1 font-display text-sm font-extrabold tabular-nums">
              {match.result ? `${match.result.home} : ${match.result.away}` : "vs"}
            </span>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <span className="truncate text-right text-[14px] font-bold">{match.away.name}</span>
              <Flag iso={match.away.iso} size={26} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-muted2">{predicted} picks</span>
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            className={`qb-stroke text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {/* Pronósticos de cada jugador */}
      {isOpen && (
        <ul className="flex flex-col gap-1.5 border-t border-line bg-ink/40 px-2.5 py-2.5">
          {match.picks.map((p) => (
            <PickLine
              key={p.profileId}
              pick={p}
              featured={match.featured}
              resultOutcome={match.result?.outcome ?? null}
              isYou={p.profileId === currentProfileId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Color del chip 1X2 según acierto (si ya hay resultado). */
function chipClasses(pick: Outcome, resultOutcome: Outcome | null): string {
  if (resultOutcome === null) return "border-line2 bg-surface2 text-fg"; // en juego: neutro
  if (pick === resultOutcome) return "border-good/60 bg-good/15 text-good";
  return "border-bad/50 bg-bad/10 text-bad";
}

function PickLine({
  pick,
  featured,
  resultOutcome,
  isYou,
}: {
  pick: PlayerPick;
  featured: boolean;
  resultOutcome: Outcome | null;
  isYou: boolean;
}) {
  const noPick = pick.outcome === null;
  const hasExact = featured && pick.homeGoals !== null && pick.awayGoals !== null;

  return (
    <li
      className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 ${
        isYou ? "border-primary/40 bg-primary/[0.07]" : "border-line bg-surface"
      }`}
    >
      <Avatar
        id={pick.profileId}
        name={pick.displayName}
        size={28}
        avatarStyle={pick.avatarStyle}
        avatarSeed={pick.avatarSeed}
      />
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">
        {isYou ? <span className="text-primary">Tú</span> : pick.displayName}
      </span>

      {noPick ? (
        <span className="text-[11.5px] font-semibold italic text-muted2">No pronosticó</span>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          {hasExact && (
            <span className="font-display text-[13px] font-extrabold tabular-nums text-muted">
              {pick.homeGoals}–{pick.awayGoals}
            </span>
          )}
          <span
            className={`inline-flex h-7 min-w-[2.4rem] items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-extrabold uppercase tracking-[0.3px] ${chipClasses(
              pick.outcome as Outcome,
              resultOutcome,
            )}`}
            title={OUTCOME_LABEL[pick.outcome as Outcome]}
          >
            {pick.outcome}
          </span>
        </div>
      )}

      {/* Puntos (solo si el partido ya finalizó) */}
      {pick.points !== null && (
        <span
          className={`w-12 shrink-0 text-right font-display text-[13px] font-extrabold tabular-nums ${
            pick.points > 0 ? "text-accent" : "text-muted2"
          }`}
        >
          {pick.points > 0 ? `+${pick.points}` : "0"}
        </span>
      )}
    </li>
  );
}
