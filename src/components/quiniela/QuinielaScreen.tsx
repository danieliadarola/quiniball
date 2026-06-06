"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MatchCard, type MatchVM, type PredVM } from "@/components/predictions/MatchCard";
import { RankingLive } from "@/components/ranking/RankingLive";
import { ShareCode } from "@/components/groups/ShareCode";
import type { StandingRow } from "@/lib/standings/fetch";

export interface JornadaVM {
  code: string;
  name: string;
  dateLabel: string;
  status: "soon" | "live" | "done";
  matches: MatchVM[];
}

// Color del banner por jornada (estable por índice).
const BANNERS = [
  "linear-gradient(120deg,#2563eb,#13284d)",
  "linear-gradient(120deg,#f97316,#5a2a08)",
  "linear-gradient(120deg,#8b5cf6,#2e1d52)",
  "linear-gradient(120deg,#0ea5e9,#093345)",
  "linear-gradient(120deg,#14b8a6,#07332e)",
  "linear-gradient(120deg,#e11d48,#4a0a1c)",
  "linear-gradient(120deg,#6366f1,#23264d)",
  "linear-gradient(120deg,#1F8A5B,#0c3322)",
];

export function QuinielaScreen({
  groupId,
  name,
  joinCode,
  inviteUrl,
  myRank,
  myPoints,
  jornadas,
  predictions,
  standings,
  currentProfileId,
  ownerId,
  canManage,
}: {
  groupId: string;
  name: string;
  joinCode: string;
  inviteUrl: string;
  myRank: number | null;
  myPoints: number;
  jornadas: JornadaVM[];
  predictions: Record<number, PredVM>;
  standings: StandingRow[];
  currentProfileId: string;
  ownerId: string;
  canManage: boolean;
}) {
  const [tab, setTab] = useState<"partidos" | "ranking">("partidos");
  const initialJ = useMemo(() => {
    const live = jornadas.findIndex((j) => j.status === "live");
    if (live >= 0) return live;
    const soon = jornadas.findIndex((j) => j.status === "soon");
    return soon >= 0 ? soon : 0;
  }, [jornadas]);
  const [jIdx, setJIdx] = useState(initialJ);
  const j = jornadas[jIdx];

  return (
    <main className="mx-auto w-full max-w-2xl pb-10 safe-pb [--pad-b:2.5rem] lg:max-w-4xl">
      {/* Cabecera + pestañas: un único bloque pegajoso (sin offsets mágicos). */}
      <div className="safe-pt sticky top-0 z-20 border-b border-line bg-ink/90 backdrop-blur">
      <header className="flex items-center gap-3 px-4 py-3.5 safe-px [--pad-x:1rem]">
        <Link
          href="/grupos"
          aria-label="Volver"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white/[0.06] text-fg transition hover:border-primary/60"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" className="qb-stroke"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold">{name}</h1>
          <span className="text-[11.5px] font-bold tracking-[0.4px] text-muted">Código {joinCode}</span>
        </div>
        <div className="shrink-0 text-right">
          <span className="block font-display text-[22px] font-extrabold leading-none text-accent">
            #{myRank ?? "—"}
          </span>
          <span className="text-[11px] font-bold text-muted">{myPoints} pts</span>
        </div>
      </header>

      {/* Pestañas */}
      <div className="mx-auto flex w-full max-w-md gap-2 px-4 pb-2.5 pt-1 safe-px [--pad-x:1rem]">
        {(["partidos", "ranking"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-extrabold transition ${
              tab === t
                ? "border-transparent bg-primary text-primary-ink"
                : "border-line bg-surface2 text-muted"
            }`}
          >
            {t === "partidos" ? "Partidos" : "Ranking"}
          </button>
        ))}
      </div>
      </div>

      {tab === "partidos" ? (
        <div className="flex flex-col gap-3.5 px-4 pt-3.5 safe-px [--pad-x:1rem]">
          {/* Chips de jornada */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {jornadas.map((jx, i) => (
              <button
                key={jx.code}
                onClick={() => setJIdx(i)}
                className={`shrink-0 rounded-xl border px-4 py-1.5 font-display text-[15px] font-extrabold transition ${
                  i === jIdx
                    ? "border-line2 bg-surface3 text-fg"
                    : "border-line bg-surface2 text-muted"
                }`}
              >
                {jx.code}
              </button>
            ))}
          </div>

          {/* Banner de jornada */}
          {j && (
            <div
              className="relative flex min-h-[88px] items-center overflow-hidden rounded-2xl px-[18px] py-4"
              style={{ background: BANNERS[jIdx % BANNERS.length] }}
            >
              <div className="relative z-[1]">
                <h2 className="m-0 font-display text-[30px] font-extrabold italic uppercase leading-[0.9] text-white drop-shadow">
                  {j.name}
                </h2>
                <span className="mt-1 block text-[11.5px] font-bold uppercase tracking-[0.5px] text-white/85">
                  {j.dateLabel}
                </span>
                <span
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.5px] ${
                    j.status === "live"
                      ? "bg-accent text-[#0a2a00]"
                      : "bg-black/30 text-white"
                  }`}
                >
                  {j.status === "live" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0a2a00]" />}
                  {j.status === "live" ? "En juego" : j.status === "done" ? "Finalizada" : "Próxima"}
                </span>
              </div>
            </div>
          )}

          {/* Partidos */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {j?.matches.map((m) => (
              <MatchCard
                key={m.matchNumber}
                groupId={groupId}
                match={m}
                prediction={predictions[m.matchNumber] ?? null}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 px-4 pt-4 safe-px [--pad-x:1rem] lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <RankingLive
            groupId={groupId}
            groupName={name}
            ownerId={ownerId}
            canManage={canManage}
            currentProfileId={currentProfileId}
            initialRows={standings}
          />

          {/* Invitar */}
          <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">Invita a tu gente</h3>
            <ShareCode code={joinCode} url={inviteUrl} />
          </section>
        </div>
      )}
    </main>
  );
}
