"use client";

/**
 * PANEL DE ADMINISTRADOR (fundador) — editar el pronóstico de un participante.
 *
 * Herramienta privada, visible SOLO para la cuenta `is_admin`. Permite elegir un
 * jugador y un partido (incluso ya finalizado), fijar su 1·X·2 (y el marcador
 * exacto si es el partido estrella) y, antes de guardar, muestra una VISTA PREVIA
 * del impacto: puntos que ganará/perderá y cómo se moverá en el ranking.
 *
 * La vista previa se calcula en el cliente (puntos con el mismo baremo y el
 * ranking re-ordenando localmente). El guardado real lo recalcula el servidor de
 * forma autoritativa (ver admin-actions.ts).
 */
import { useMemo, useState, useTransition } from "react";
import { POINTS, type Outcome } from "@/lib/scoring/types";
import type { StandingRow } from "@/lib/standings/fetch";
import type { JornadaVM } from "@/components/quiniela/QuinielaScreen";
import type { MatchVM } from "@/components/predictions/MatchCard";
import {
  loadAdminTarget,
  saveAdminPrediction,
  type AdminTarget,
} from "@/app/(app)/grupo/[id]/admin-actions";

interface FlatMatch extends MatchVM {
  jornadaName: string;
}

const OPTS: [Outcome, string][] = [
  ["1", "Local"],
  ["X", "Empate"],
  ["2", "Visit."],
];

const derive = (h: number, a: number): Outcome => (h > a ? "1" : h === a ? "X" : "2");

export function AdminEditPanel({
  groupId,
  players,
  jornadas,
  onClose,
  onSaved,
}: {
  groupId: string;
  players: StandingRow[];
  jornadas: JornadaVM[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const matches = useMemo<FlatMatch[]>(
    () =>
      jornadas.flatMap((j) =>
        j.matches
          .filter((m) => m.home !== null && m.away !== null)
          .map((m) => ({ ...m, jornadaName: j.name })),
      ),
    [jornadas],
  );

  const [profileId, setProfileId] = useState("");
  const [matchNumber, setMatchNumber] = useState<number | "">("");
  const [target, setTarget] = useState<AdminTarget | null>(null);
  const [pick, setPick] = useState<Outcome | null>(null);
  const [exact, setExact] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, startSave] = useTransition();
  const [done, setDone] = useState(false);

  const chosenMatch = matches.find((m) => m.matchNumber === matchNumber) ?? null;
  const ready = profileId && chosenMatch && target;

  // Carga el contexto cuando hay jugador + partido seleccionados.
  function loadContext(pid: string, mn: number | "") {
    setTarget(null);
    setPick(null);
    setExact(null);
    setError(null);
    setConfirming(false);
    if (!pid || mn === "") return;
    setLoading(true);
    loadAdminTarget(groupId, pid, mn)
      .then((r) => {
        if (r.error || !r.data) {
          setError(r.error ?? "No se pudo cargar.");
          return;
        }
        setTarget(r.data);
        setPick(r.data.current?.outcome ?? null);
        setExact(
          r.data.current?.homeGoals != null && r.data.current?.awayGoals != null
            ? [r.data.current.homeGoals, r.data.current.awayGoals]
            : null,
        );
      })
      .finally(() => setLoading(false));
  }

  // ---- Vista previa de impacto (cliente) -----------------------------------
  const preview = useMemo(() => {
    if (!target || !chosenMatch || pick === null) return null;

    const oldPts = target.current?.pointsAwarded ?? 0;
    let newPts = 0;
    if (target.finished && target.result) {
      const okOutcome = pick === derive(target.result.home, target.result.away);
      const okExact =
        target.featured &&
        exact !== null &&
        exact[0] === target.result.home &&
        exact[1] === target.result.away;
      newPts = (okOutcome ? POINTS.outcome : 0) + (okExact ? POINTS.exactBonus : 0);
    }
    const delta = newPts - oldPts;

    // Ranking proyectado: ajusta el total del jugador y recuenta posiciones.
    const me = players.find((p) => p.profileId === profileId);
    const currentRank = me?.rank ?? null;
    let projectedRank = currentRank;
    if (me && delta !== 0) {
      const newTotal = me.totalPoints + delta;
      projectedRank =
        1 +
        players.filter((p) =>
          p.profileId === profileId ? false : p.totalPoints > newTotal,
        ).length;
    }

    return { oldPts, newPts, delta, currentRank, projectedRank };
  }, [target, chosenMatch, pick, exact, players, profileId]);

  function doSave() {
    if (pick === null || matchNumber === "" || !profileId) return;
    setError(null);
    startSave(async () => {
      const r = await saveAdminPrediction({
        groupId,
        profileId,
        matchNumber,
        outcome: pick,
        homeGoals: target?.featured ? exact?.[0] ?? null : null,
        awayGoals: target?.featured ? exact?.[1] ?? null : null,
      });
      if (r.error) {
        setError(r.error);
        setConfirming(false);
        return;
      }
      setDone(true);
      onSaved();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-5"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-line bg-surface p-5 safe-pb sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">
              Editar pronóstico
            </h3>
            <p className="text-[11.5px] font-bold uppercase tracking-[0.4px] text-muted">
              Herramienta de admin · privada
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition hover:border-primary/60 hover:text-fg"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" className="qb-stroke"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-good/15 text-good">
              <svg viewBox="0 0 24 24" width="26" height="26" className="qb-stroke"><path d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-bold text-fg">Cambio guardado.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-ink transition hover:bg-primary-strong"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Jugador */}
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-extrabold text-fg">Jugador</span>
              <select
                value={profileId}
                onChange={(e) => {
                  setProfileId(e.target.value);
                  loadContext(e.target.value, matchNumber);
                }}
                className="w-full rounded-xl border border-line2 bg-surface2 px-3 py-3 text-fg outline-none focus:border-primary/60"
              >
                <option value="">Elige un participante…</option>
                {players.map((p) => (
                  <option key={p.profileId} value={p.profileId}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </label>

            {/* Partido */}
            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-extrabold text-fg">Partido</span>
              <select
                value={matchNumber}
                onChange={(e) => {
                  const mn = e.target.value === "" ? "" : Number(e.target.value);
                  setMatchNumber(mn);
                  loadContext(profileId, mn);
                }}
                className="w-full rounded-xl border border-line2 bg-surface2 px-3 py-3 text-fg outline-none focus:border-primary/60"
              >
                <option value="">Elige un partido…</option>
                {jornadas.map((j) => (
                  <optgroup key={j.code} label={j.name}>
                    {j.matches
                      .filter((m) => m.home !== null && m.away !== null)
                      .map((m) => (
                        <option key={m.matchNumber} value={m.matchNumber}>
                          {m.homeLabel} – {m.awayLabel}
                          {m.result ? `  (Final ${m.result.home}–${m.result.away})` : ""}
                          {m.featured ? "  ★" : ""}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>

            {loading && <p className="text-center text-sm text-muted">Cargando…</p>}

            {ready && target && (
              <>
                {/* Estado del partido */}
                <div className="rounded-xl border border-line bg-surface2 px-3.5 py-3 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-fg">{target.playerName}</span>
                    {target.finished && target.result ? (
                      <span className="font-extrabold text-muted">
                        Final {target.result.home}–{target.result.away}
                      </span>
                    ) : (
                      <span className="font-bold text-accent">Sin finalizar</span>
                    )}
                  </div>
                  <p className="mt-1 text-muted">
                    {target.current
                      ? `Pronóstico actual: ${target.current.outcome ?? "—"}${
                          target.current.homeGoals != null
                            ? ` (${target.current.homeGoals}–${target.current.awayGoals})`
                            : ""
                        }`
                      : "Sin pronóstico registrado."}
                    {target.featured && " · Partido estrella ★"}
                  </p>
                </div>

                {/* Selector 1·X·2 */}
                <div>
                  <span className="mb-1.5 block text-[12.5px] font-extrabold text-fg">
                    Nuevo pronóstico
                  </span>
                  <div className="flex gap-2">
                    {OPTS.map(([k, label]) => {
                      const active = pick === k;
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            setPick(k);
                            setConfirming(false);
                          }}
                          className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl border px-1 py-2.5 transition ${
                            active
                              ? "border-transparent bg-primary text-primary-ink"
                              : "border-line bg-surface2 text-fg opacity-70"
                          }`}
                        >
                          <span className="font-display text-xl font-extrabold leading-none">{k}</span>
                          <span className="text-[10px] font-bold uppercase tracking-[0.4px]">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Marcador exacto (solo estrella) */}
                {target.featured && (
                  <div className="rounded-xl border border-dashed border-accent/40 px-3.5 py-3">
                    <div className="mb-2 flex items-center justify-between text-[12px]">
                      <span className="font-extrabold text-fg">
                        Marcador exacto <em className="font-medium not-italic text-muted">(opcional)</em>
                      </span>
                      <span className="font-extrabold text-accent">+{POINTS.exactBonus} pts</span>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <Stepper
                        value={exact ? exact[0] : 0}
                        onChange={(v) => {
                          const next: [number, number] = [v, exact ? exact[1] : 0];
                          setExact(next);
                          setPick(derive(next[0], next[1]));
                          setConfirming(false);
                        }}
                      />
                      <span className="font-display text-2xl font-extrabold text-muted2">–</span>
                      <Stepper
                        value={exact ? exact[1] : 0}
                        onChange={(v) => {
                          const next: [number, number] = [exact ? exact[0] : 0, v];
                          setExact(next);
                          setPick(derive(next[0], next[1]));
                          setConfirming(false);
                        }}
                      />
                    </div>
                    {exact && (
                      <button
                        type="button"
                        onClick={() => setExact(null)}
                        className="mt-2 w-full text-center text-[11px] font-semibold text-muted underline"
                      >
                        Quitar marcador exacto (dejar solo 1·X·2)
                      </button>
                    )}
                  </div>
                )}

                {/* Vista previa de impacto */}
                {preview && pick !== null && (
                  <div className="rounded-xl border border-line2 bg-surface3/40 px-3.5 py-3 text-[12.5px]">
                    {target.finished ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Puntos en este partido</span>
                          <span className="font-extrabold text-fg">
                            {preview.oldPts} → {preview.newPts}
                            {preview.delta !== 0 && (
                              <b className={preview.delta > 0 ? "text-good" : "text-bad"}>
                                {" "}
                                ({preview.delta > 0 ? "+" : ""}
                                {preview.delta})
                              </b>
                            )}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-muted">Posición</span>
                          <span className="font-extrabold text-fg">
                            #{preview.currentRank ?? "—"}
                            {preview.projectedRank !== preview.currentRank && (
                              <> → #{preview.projectedRank}</>
                            )}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted">
                        El partido aún no ha terminado: no cambia puntos todavía, solo se
                        guarda el pronóstico.
                      </p>
                    )}
                  </div>
                )}

                {error && <p className="text-sm font-semibold text-bad">{error}</p>}

                {/* Acciones */}
                {!confirming ? (
                  <button
                    type="button"
                    disabled={pick === null}
                    onClick={() => setConfirming(true)}
                    className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-ink transition hover:bg-primary-strong disabled:opacity-50"
                  >
                    Revisar cambio
                  </button>
                ) : (
                  <div className="rounded-xl border border-accent/40 bg-accent/5 p-3.5">
                    <p className="text-[13px] font-bold text-fg">
                      ¿Confirmar el cambio para {target.playerName}?
                    </p>
                    {target.finished && preview && preview.delta !== 0 && (
                      <p className="mt-1 text-[12px] text-muted">
                        Se le {preview.delta > 0 ? "sumarán" : "restarán"}{" "}
                        <b className={preview.delta > 0 ? "text-good" : "text-bad"}>
                          {Math.abs(preview.delta)} pts
                        </b>{" "}
                        y el ranking se actualizará al instante para todos.
                      </p>
                    )}
                    <div className="mt-3 flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => setConfirming(false)}
                        disabled={saving}
                        className="flex-1 rounded-xl border border-line2 bg-surface2 px-4 py-2.5 font-semibold text-fg transition hover:border-primary/60 disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={doSave}
                        disabled={saving}
                        className="flex-1 rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-ink transition hover:bg-primary-strong disabled:opacity-60"
                      >
                        {saving ? "Guardando…" : "Confirmar"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
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
      <span className="font-display text-[30px] font-extrabold leading-none">{value}</span>
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
