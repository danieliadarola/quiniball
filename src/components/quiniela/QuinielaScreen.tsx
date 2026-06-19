"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MatchCard, type MatchVM, type PredVM } from "@/components/predictions/MatchCard";
import { RankingLive } from "@/components/ranking/RankingLive";
import { ManageTab } from "@/components/quiniela/ManageTab";
import { HistoryTab } from "@/components/quiniela/HistoryTab";
import { CuadroTab } from "@/components/quiniela/CuadroTab";
import { AdminEditPanel } from "@/components/quiniela/AdminEditPanel";
import { renameGroup } from "@/app/(app)/grupos/actions";
import type { StandingRow } from "@/lib/standings/fetch";
import type { MatchPicks } from "@/lib/history/picks";
import type { GroupStandings } from "@/lib/tournament/groupTable";

type Tab = "partidos" | "ranking" | "historial" | "cuadro" | "gestionar";

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
  matchPicks,
  groupStandings,
  isAppAdmin,
  isMember,
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
  matchPicks: MatchPicks[];
  groupStandings: GroupStandings[];
  isAppAdmin: boolean;
  isMember: boolean;
}) {
  const [tab, setTab] = useState<Tab>("partidos");
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
    <main className="mx-auto w-full max-w-2xl pb-28 safe-pb [--pad-b:2.5rem] lg:max-w-4xl lg:pb-10">
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
              <path d="M14.7 6.3a3.8 3.8 0 0 0-5 5L3.3 17.7a1.5 1.5 0 0 0 0 2.1l.9.9a1.5 1.5 0 0 0 2.1 0l6.4-6.4a3.8 3.8 0 0 0 5-5l-2.5 2.5-2.4-.6-.6-2.4z" />
            </svg>
          </button>
        )}
        <div className="shrink-0 text-right">
          <span className="block font-display text-[22px] font-extrabold leading-none text-accent">
            #{myRank ?? "—"}
          </span>
          <span className="text-[11px] font-bold text-muted">{myPoints} pts</span>
        </div>
        {/* Tuerca de "Gestionar" (estilo Instagram): solo en móvil; en escritorio
            Gestionar es una pestaña más. */}
        <button
          type="button"
          onClick={() => setTab("gestionar")}
          aria-label="Gestionar la quiniela"
          title="Gestionar"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition lg:hidden ${
            tab === "gestionar"
              ? "border-primary/60 bg-primary/10 text-fg"
              : "border-line text-muted hover:border-primary/60 hover:text-fg"
          }`}
        >
          <GearIcon />
        </button>
      </header>

      {/* Pestañas (solo escritorio): en móvil se usa la barra inferior. */}
      <div className="mx-auto hidden w-full max-w-2xl gap-1.5 px-4 pb-2.5 pt-1 safe-px [--pad-x:1rem] lg:flex">
        {(["partidos", "ranking", "historial", "cuadro", "gestionar"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl border px-2 py-2.5 text-[13px] font-extrabold capitalize transition ${
              tab === t
                ? "border-transparent bg-primary text-primary-ink"
                : "border-line bg-surface2 text-muted"
            }`}
          >
            {TAB_LABEL[t]}
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
          <HistoryTab matches={matchPicks} currentProfileId={currentProfileId} />
        </div>
      ) : tab === "cuadro" ? (
        <div className="px-4 pt-4 safe-px [--pad-x:1rem]">
          <CuadroTab groups={groupStandings} />
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
            isMember={isMember}
            isAppAdmin={isAppAdmin}
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

      {/* Barra de navegación inferior (estilo Instagram): solo en móvil. */}
      <BottomNav tab={tab} onChange={setTab} />
    </main>
  );
}

const TAB_LABEL: Record<Tab, string> = {
  partidos: "Partidos",
  ranking: "Ranking",
  historial: "Historial",
  cuadro: "Cuadro",
  gestionar: "Gestionar",
};

/** Barra inferior fija con iconos. Visible solo en móvil (en escritorio hay pestañas). */
function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "partidos", label: "Partidos", icon: <BallIcon /> },
    { key: "ranking", label: "Ranking", icon: <TrophyIcon /> },
    { key: "historial", label: "Historial", icon: <HistoryIcon /> },
    { key: "cuadro", label: "Cuadro", icon: <TableIcon /> },
  ];
  return (
    <nav
      className="safe-pb fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur lg:hidden [--pad-b:0.25rem]"
      aria-label="Navegación principal"
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pt-1.5">
        {items.map((it) => {
          const active = tab === it.key;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange(it.key)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition ${
                active ? "text-primary" : "text-muted hover:text-fg"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center">{it.icon}</span>
              <span className="text-[10.5px] font-bold leading-none">{it.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// --- Iconos de la barra (trazo, heredan el color del texto) -----------------

function BallIcon() {
  return (
    <svg viewBox="0 0 24 24" width="23" height="23" className="qb-stroke" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.8l4 2.9-1.5 4.8h-5L8 10.7z" />
      <path d="M12 7.8V4.5M16 10.7l3-1M14.5 15.5l1.8 2.6M9.5 15.5l-1.8 2.6M8 10.7l-3-1" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="23" height="23" className="qb-stroke" aria-hidden>
      <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
      <path d="M7 5H4.3v1.6A3.5 3.5 0 0 0 8 10" />
      <path d="M17 5h2.7v1.6A3.5 3.5 0 0 1 16 10" />
      <path d="M12 13v3" />
      <path d="M9 20h6" />
      <path d="M10 20l.4-2.2h3.2L14 20" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="23" height="23" className="qb-stroke" aria-hidden>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3 4.5V8h3.5" />
      <path d="M12 8v4l2.6 1.6" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg viewBox="0 0 24 24" width="23" height="23" className="qb-stroke" aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M3.5 14.5h17M9 4.5v15" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" className="qb-stroke" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
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
