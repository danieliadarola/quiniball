"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MatchCard, type MatchVM, type PredVM } from "@/components/predictions/MatchCard";
import { RankingLive } from "@/components/ranking/RankingLive";
import { ManageTab } from "@/components/quiniela/ManageTab";
import { HistoryTab } from "@/components/quiniela/HistoryTab";
import { AdminEditPanel } from "@/components/quiniela/AdminEditPanel";
import { renameGroup } from "@/app/(app)/grupos/actions";
import type { StandingRow } from "@/lib/standings/fetch";
import type { HistoryItem } from "@/lib/history/fetch";

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
  managerIds,
  history,
  isAppAdmin,
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
  managerIds: string[];
  history: HistoryItem[];
  isAppAdmin: boolean;
}) {
  const [tab, setTab] = useState<"partidos" | "ranking" | "historial" | "gestionar">("partidos");
  const initialJ = useMemo(() => {
    const live = jornadas.findIndex((j) => j.status === "live");
    if (live >= 0) return live;
    const soon = jornadas.findIndex((j) => j.status === "soon");
    return soon >= 0 ? soon : 0;
  }, [jornadas]);
  const [jIdx, setJIdx] = useState(initialJ);
  const j = jornadas[jIdx];

  // Edición del nombre de la quiniela (dueño o co-organizador).
  const router = useRouter();
  const [groupName, setGroupName] = useState(name);
  const [editing, setEditing] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

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
          <div className="flex items-center gap-1.5">
            <h1 className="truncate text-lg font-extrabold">{groupName}</h1>
            {canManage && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Editar nombre de la quiniela"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition hover:border-primary/60 hover:text-fg"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" className="qb-stroke" aria-hidden>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </button>
            )}
          </div>
          <span className="text-[11.5px] font-bold tracking-[0.4px] text-muted">Código {joinCode}</span>
        </div>
        {isAppAdmin && (
          <button
            type="button"
            onClick={() => setAdminOpen(true)}
            aria-label="Herramienta de administrador"
            title="Editar pronósticos (admin)"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line text-muted transition hover:border-accent/60 hover:text-accent"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" className="qb-stroke" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}
        <div className="shrink-0 text-right">
          <span className="block font-display text-[22px] font-extrabold leading-none text-accent">
            #{myRank ?? "—"}
          </span>
          <span className="text-[11px] font-bold text-muted">{myPoints} pts</span>
        </div>
      </header>

      {/* Pestañas */}
      <div className="mx-auto flex w-full max-w-lg gap-1.5 px-4 pb-2.5 pt-1 safe-px [--pad-x:1rem]">
        {(["partidos", "ranking", "historial", "gestionar"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl border px-2 py-2.5 text-[13px] font-extrabold transition ${
              tab === t
                ? "border-transparent bg-primary text-primary-ink"
                : "border-line bg-surface2 text-muted"
            }`}
          >
            {t === "partidos"
              ? "Partidos"
              : t === "ranking"
                ? "Ranking"
                : t === "historial"
                  ? "Historial"
                  : "Gestionar"}
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
      ) : tab === "ranking" ? (
        <div className="px-4 pt-4 safe-px [--pad-x:1rem]">
          <RankingLive
            groupId={groupId}
            groupName={groupName}
            ownerId={ownerId}
            canManage={false}
            currentProfileId={currentProfileId}
            initialRows={standings}
          />
        </div>
      ) : tab === "historial" ? (
        <div className="px-4 pt-4 safe-px [--pad-x:1rem]">
          <HistoryTab items={history} currentProfileId={currentProfileId} />
        </div>
      ) : (
        <div className="px-4 pt-4 safe-px [--pad-x:1rem]">
          <ManageTab
            groupId={groupId}
            groupName={groupName}
            joinCode={joinCode}
            inviteUrl={inviteUrl}
            ownerId={ownerId}
            currentProfileId={currentProfileId}
            canManage={canManage}
            managerIds={managerIds}
            members={standings}
            onChanged={() => router.refresh()}
          />
        </div>
      )}

      {adminOpen && (
        <AdminEditPanel
          groupId={groupId}
          players={standings}
          jornadas={jornadas}
          onClose={() => setAdminOpen(false)}
          onSaved={() => router.refresh()}
        />
      )}

      {editing && (
        <RenameDialog
          groupId={groupId}
          current={groupName}
          onClose={() => setEditing(false)}
          onSaved={(newName) => {
            setGroupName(newName);
            setEditing(false);
            router.refresh();
          }}
        />
      )}
    </main>
  );
}

/** Modal para que el dueño renombre la quiniela. */
function RenameDialog({
  groupId,
  current,
  onClose,
  onSaved,
}: {
  groupId: string;
  current: string;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await renameGroup(groupId, value);
      if (r.error) setError(r.error);
      else onSaved(value.trim());
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 safe-px [--pad-x:1.25rem]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">
          Nombre de la quiniela
        </h3>
        <input
          autoFocus
          value={value}
          maxLength={60}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !pending) submit();
          }}
          className="mt-4 w-full rounded-xl border border-line2 bg-surface2 px-4 py-3 text-fg outline-none focus:border-primary/60"
          placeholder="Ej. La porra de la oficina"
        />
        {error && <p className="mt-2 text-sm font-semibold text-bad">{error}</p>}
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-line2 bg-surface2 px-4 py-2.5 font-semibold text-fg transition hover:border-primary/60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="flex-1 rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-ink transition hover:bg-primary-strong disabled:opacity-60"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
