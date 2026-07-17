"use client";

import { useRef, useState, useTransition } from "react";
import {
  savePrediction,
  type PredictionState,
} from "@/app/(app)/grupo/[id]/calendario/actions";
import { Flag } from "@/components/ui/Flag";
import { POINTS, exactBonusFor, FINAL_MATCH_NUMBER, type Outcome } from "@/lib/scoring/types";

export interface MatchVM {
  matchNumber: number;
  groupLabel: string; // "Grupo A", "Octavos", …
  timeLabel: string; // hora de inicio
  kickoffMs: number; // inicio en epoch ms (para cuentas atrás en cliente)
  home: { name: string; iso: string | null } | null;
  away: { name: string; iso: string | null } | null;
  homeLabel: string;
  awayLabel: string;
  locked: boolean;
  featured: boolean;
  result: { home: number; away: number; outcome: Outcome } | null;
}

export interface PredVM {
  outcome: Outcome | null;
  homeGoals: number | null;
  awayGoals: number | null;
}

const signOf = (h: number, a: number): Outcome => (h > a ? "1" : h === a ? "X" : "2");

export function MatchCard({
  groupId,
  match,
  prediction,
}: {
  groupId: string;
  match: MatchVM;
  prediction: PredVM | null;
}) {
  const predictable = match.home !== null && match.away !== null;
  const finished = match.result !== null;
  const editable = predictable && !match.locked && !finished;

  // La GRAN FINAL es la estrella común de todas las quinielas y su marcador
  // exacto vale el doble (10 → 13 en total). Se resalta de forma especial.
  const isFinal = match.matchNumber === FINAL_MATCH_NUMBER;
  const exactBonus = exactBonusFor(match.matchNumber);

  const [pick, setPick] = useState<Outcome | null>(prediction?.outcome ?? null);
  const [exact, setExact] = useState<[number, number] | null>(
    prediction?.homeGoals != null && prediction?.awayGoals != null
      ? [prediction.homeGoals, prediction.awayGoals]
      : null,
  );
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [, startTransition] = useTransition();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function persist(nextPick: Outcome | null, nextExact: [number, number] | null) {
    const outcome = nextPick ?? (nextExact ? signOf(nextExact[0], nextExact[1]) : null);
    if (!outcome) return;
    const fd = new FormData();
    fd.set("groupId", groupId);
    fd.set("matchNumber", String(match.matchNumber));
    fd.set("outcome", outcome);
    if (match.featured && nextExact) {
      fd.set("homeGoals", String(nextExact[0]));
      fd.set("awayGoals", String(nextExact[1]));
    }
    setStatus("saving");
    startTransition(async () => {
      const r: PredictionState = await savePrediction({}, fd);
      setStatus(r.error ? "err" : "ok");
    });
  }

  function choose(k: Outcome) {
    if (!editable) return;
    setPick(k);
    persist(k, exact);
  }

  function changeExact(next: [number, number]) {
    if (!editable) return;
    setExact(next);
    const derived = signOf(next[0], next[1]);
    setPick(derived);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => persist(derived, next), 500);
  }

  // Puntos obtenidos (si ya hay resultado).
  let earned: number | null = null;
  if (finished && match.result) {
    const okOutcome = pick !== null && pick === match.result.outcome;
    const okExact =
      match.featured &&
      exact !== null &&
      exact[0] === match.result.home &&
      exact[1] === match.result.away;
    earned = (okOutcome ? POINTS.outcome : 0) + (okExact ? exactBonus : 0);
  }

  return (
    <div
      className={`rounded-2xl border bg-surface p-3.5 ${
        match.featured
          ? "border-accent/45 shadow-[inset_0_0_0_1px_rgba(250,204,21,0.2)]"
          : "border-line"
      } ${finished ? "opacity-95" : ""}`}
    >
      {match.featured && (
        <div
          className={`-mt-0.5 mb-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.3px] ${
            isFinal
              ? "bg-gradient-to-r from-[#f7cf52] to-[#e0a020] text-[#5a3d00] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
              : "bg-accent text-[#0a2a00]"
          }`}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden>
            <path d="M12 2l2.9 6.3 6.8.6-5.1 4.5 1.5 6.6L12 17.3 5.9 20.6l1.5-6.6L2.3 8.9l6.8-.6z" />
          </svg>
          {isFinal ? (
            <>
              Gran Final · marcador exacto <b className="ml-0.5">+{exactBonus} pts</b>
              <span className="ml-1 rounded bg-black/15 px-1.5 py-px text-[10px]">Hasta 13 pts</span>
            </>
          ) : (
            <>
              Partido estrella · marcador exacto <b className="ml-0.5">+{exactBonus} pts</b>
            </>
          )}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <span className="whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[0.6px] text-muted">
          {match.groupLabel}
        </span>
        {finished && match.result ? (
          <span className="rounded-md bg-surface3 px-2 py-1 text-[11px] font-extrabold text-muted">
            Final {match.result.home}–{match.result.away}
          </span>
        ) : (
          <span className="whitespace-nowrap text-xs font-bold text-fg">{match.timeLabel}</span>
        )}
      </div>

      {/* Equipos */}
      <div className="mb-3.5 flex items-center gap-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Flag iso={match.home?.iso} size={34} />
          <span className="truncate text-[15px] font-bold">{match.homeLabel}</span>
        </div>
        <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[1px] text-muted2">
          {finished && match.result ? `${match.result.home} : ${match.result.away}` : "vs"}
        </span>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
          <span className="truncate text-right text-[15px] font-bold">{match.awayLabel}</span>
          <Flag iso={match.away?.iso} size={34} />
        </div>
      </div>

      {!predictable ? (
        <p className="rounded-xl bg-surface2 px-3 py-2 text-center text-xs text-muted">
          Se abrirá cuando se conozcan los rivales.
        </p>
      ) : (
        <PickRow
          options={OPTS}
          pick={pick}
          finished={finished}
          resultOutcome={match.result?.outcome ?? null}
          disabled={!editable}
          onPick={choose}
        />
      )}

      {/* Marcador exacto (solo estrella, mientras se pueda editar) */}
      {match.featured && predictable && editable && (
        <div className="mt-3.5 border-t border-dashed border-line2 pt-3.5">
          <div className="mb-2.5 flex items-center justify-between text-[12.5px]">
            <span className="font-extrabold">
              Marcador exacto <em className="font-medium not-italic text-muted">(opcional)</em>
            </span>
            <span className="font-extrabold text-accent">+{exactBonus} pts si aciertas</span>
          </div>
          <div className="flex items-center justify-center gap-[18px]">
            <div className="flex items-center gap-2.5">
              <Flag iso={match.home?.iso} size={28} />
              <Stepper value={exact ? exact[0] : 0} onChange={(v) => changeExact([v, exact ? exact[1] : 0])} />
            </div>
            <span className="font-display text-2xl font-extrabold text-muted2">–</span>
            <div className="flex items-center gap-2.5">
              <Stepper value={exact ? exact[1] : 0} onChange={(v) => changeExact([exact ? exact[0] : 0, v])} />
              <Flag iso={match.away?.iso} size={28} />
            </div>
          </div>
        </div>
      )}

      {/* Pronóstico exacto en solo lectura (estrella cerrada con marcador puesto) */}
      {match.featured && !editable && exact && (
        <p className="mt-2.5 text-center text-xs text-muted">
          Tu marcador: <span className="font-bold text-fg">{exact[0]}–{exact[1]}</span>
        </p>
      )}

      {/* Barra de resultado / estado */}
      {finished && earned !== null ? (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-center text-[13px] font-bold ${
            earned > 0 ? "bg-good/15 text-good" : "bg-surface2 text-muted"
          }`}
        >
          {earned > 0 ? (
            <>
              Acertaste <b className="font-display text-base">+{earned} pts</b>
            </>
          ) : pick === null ? (
            <>
              No pronosticaste <b className="font-display text-base">0 pts</b>
            </>
          ) : (
            <>
              Fallaste <b className="font-display text-base">0 pts</b>
            </>
          )}
        </div>
      ) : (
        editable && <SaveHint status={status} hasPick={pick !== null} />
      )}

      {!finished && match.locked && (
        <p className="mt-2.5 text-center text-xs text-muted">
          {pick ? (
            <>
              Cerrado · tu pronóstico: <span className="font-bold text-fg">{pick}</span>
            </>
          ) : (
            "Cerrado · no pronosticaste"
          )}
        </p>
      )}
    </div>
  );
}

const OPTS: [Outcome, string][] = [
  ["1", "Local"],
  ["X", "Empate"],
  ["2", "Visit."],
];

// Colores del cubo del logo: 1 verde · X rojo · 2 azul.
const CUBE: Record<Outcome, { bg: string; text: string; ring: string }> = {
  "1": { bg: "bg-pick1", text: "text-pick1", ring: "shadow-pick1/30" },
  X: { bg: "bg-pickx", text: "text-pickx", ring: "shadow-pickx/30" },
  "2": { bg: "bg-pick2", text: "text-pick2", ring: "shadow-pick2/30" },
};

function PickRow({
  options,
  pick,
  finished,
  resultOutcome,
  disabled,
  onPick,
}: {
  options: [Outcome, string][];
  pick: Outcome | null;
  finished: boolean;
  resultOutcome: Outcome | null;
  disabled: boolean;
  onPick: (k: Outcome) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map(([k, label]) => {
        const isPick = pick === k;
        const isResult = resultOutcome === k;

        let cls =
          "flex flex-1 flex-col items-center gap-px rounded-xl border bg-surface2 px-1 py-2.5 transition duration-150";
        // Sub-etiqueta inferior: en partido cerrado describe el rol de la opción
        // (tu acierto/fallo o el resultado real); abierto, el nombre 1X2.
        let sub = label;
        let subCls = isPick && !finished ? "text-white/85" : "text-muted";

        if (finished) {
          // El color marca SIEMPRE la elección del usuario: verde si acertó,
          // rojo si falló. El ganador real, si no era su pick, se señala en
          // neutro con la etiqueta "Resultado" (sin verde, para no confundir).
          if (isPick && isResult) {
            cls += " border-good text-good bg-good/10";
            sub = "Acierto";
            subCls = "text-good";
          } else if (isPick) {
            cls += " border-bad text-bad bg-bad/5";
            sub = "Fallo";
            subCls = "text-bad";
          } else if (isResult) {
            cls += " border-line2 text-fg";
            sub = "Resultado";
            subCls = "text-muted";
          } else {
            cls += " border-line text-fg opacity-40";
          }
        } else if (isPick) {
          // Elección activa: muy marcada (color del cubo + halo blanco + relieve).
          cls += ` z-[1] scale-[1.06] border-transparent ${CUBE[k].bg} text-white shadow-xl ring-2 ring-white/75 ${CUBE[k].ring}`;
        } else {
          // No elegidos: atenuados para que la elección destaque.
          cls += " border-line text-fg opacity-60";
        }
        return (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => onPick(k)}
            className={`${cls} ${disabled ? "cursor-default" : "active:scale-[0.97]"}`}
          >
            <span
              className={`font-display text-[22px] font-extrabold leading-none ${
                !finished && pick !== k ? CUBE[k].text : ""
              }`}
            >
              {k}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-[0.4px] ${subCls}`}>
              {sub}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const clamp = (n: number) => Math.max(0, Math.min(9, n));
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        aria-label="Subir gol"
        onClick={() => onChange(clamp(value + 1))}
        className="flex h-6 w-9 items-center justify-center rounded-lg border-[1.5px] border-accent/55 text-accent active:bg-accent/15"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" className="qb-stroke"><path d="M6 15l6-6 6 6" /></svg>
      </button>
      <span className="font-display text-[32px] font-extrabold leading-none">{value}</span>
      <button
        type="button"
        aria-label="Bajar gol"
        onClick={() => onChange(clamp(value - 1))}
        className="flex h-6 w-9 items-center justify-center rounded-lg border-[1.5px] border-accent/55 text-accent active:bg-accent/15"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" className="qb-stroke"><path d="M6 9l6 6 6-6" /></svg>
      </button>
    </div>
  );
}

function SaveHint({ status, hasPick }: { status: "idle" | "saving" | "ok" | "err"; hasPick: boolean }) {
  let text = hasPick ? "Pronóstico guardado" : "Toca tu pronóstico";
  let cls = "text-muted";
  if (status === "saving") text = "Guardando…";
  else if (status === "ok") {
    text = "Guardado ✓";
    cls = "text-good";
  } else if (status === "err") {
    text = "No se pudo guardar";
    cls = "text-bad";
  }
  return <p className={`mt-2.5 text-center text-xs font-semibold ${cls}`}>{text}</p>;
}
