"use client";

/**
 * Cuadro de eliminatorias estilo PÓSTER: llave simétrica de dos lados que
 * convergen en la FINAL central, como el clásico cartel del Mundial.
 *
 * Para que entre en el móvil se dibuja en un lienzo de tamaño FIJO (coordenadas
 * de diseño) y se escala al ancho disponible con transform: scale(). Así la
 * llave completa se ve de un vistazo y las banderas y líneas mantienen su
 * proporción. El detalle (marcador y tu pronóstico) se abre al TOCAR un cruce.
 *
 * La estructura del árbol se deriva de los placeholders ("Ganador 73"): no se
 * cablea ningún número de partido a mano.
 */
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Flag } from "@/components/ui/Flag";
import type { BracketRound, BracketMatch, BracketTeam } from "@/lib/tournament/bracket";
import type { Outcome } from "@/lib/scoring/types";

// --- Lienzo de diseño (px); se escala al ancho real ------------------------
const COL_PITCH = 60;
const CELL_W = 42;
const CELL_H = 24;
const FLAG = 15;
const TOP = 30;
const LEAF_PITCH = 38;
const COLS = 9; // R32·R16·QF·SF | FINAL | SF·QF·R16·R32
const DESIGN_W = (COLS - 1) * COL_PITCH + CELL_W; // 522
const DESIGN_H = TOP + 7 * LEAF_PITCH + CELL_H + 12; // 332

const COL_LABELS = ["16vos", "8vos", "4tos", "Semi", "Final", "Semi", "4tos", "8vos", "16vos"];

/** Columna según fase y lado (izq/der), espejo respecto a la final. */
function columnFor(phase: string, side: "L" | "R" | null): number {
  if (phase === "final") return 4;
  const left: Record<string, number> = { round32: 0, round16: 1, quarter: 2, semi: 3 };
  const right: Record<string, number> = { semi: 5, quarter: 6, round16: 7, round32: 8 };
  return side === "R" ? right[phase] ?? 4 : left[phase] ?? 4;
}

/** Número de partido referido por un placeholder "Ganador 73" (o null). */
function winnerRef(placeholder: string | null): number | null {
  if (!placeholder) return null;
  const m = /^Ganador\s+(\d+)/i.exec(placeholder.trim());
  return m ? Number(m[1]) : null;
}

interface Placed {
  match: BracketMatch;
  roundLabel: string;
  col: number;
  x: number;
  y: number; // centro vertical
}

export function KnockoutBracket({ bracket }: { bracket: BracketRound[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [openNum, setOpenNum] = useState<number | null>(null);

  // Escalado al ancho del contenedor.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const apply = () => setScale(el.clientWidth / DESIGN_W);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const model = useMemo(() => buildLayout(bracket), [bracket]);

  if (!model) {
    // Estructura inesperada: no rompemos la pantalla.
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface2 px-6 py-12 text-center text-sm font-semibold text-muted">
        El cuadro aparecerá cuando se definan los cruces.
      </div>
    );
  }

  const { placed, links, third } = model;
  const byNum = new Map(placed.map((p) => [p.match.matchNumber, p]));
  const openMatch = openNum != null ? byNum.get(openNum) ?? (third?.match.matchNumber === openNum ? third : null) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Etiquetas de ronda (no se escalan, para que sean legibles) */}
      <div className="relative h-4 w-full">
        {COL_LABELS.map((lab, c) => {
          const centerPct = ((c * COL_PITCH + CELL_W / 2) / DESIGN_W) * 100;
          return (
            <span
              key={c}
              className={`absolute -translate-x-1/2 text-[8.5px] font-extrabold uppercase tracking-wide ${
                c === 4 ? "text-accent" : "text-muted2"
              }`}
              style={{ left: `${centerPct}%` }}
            >
              {lab}
            </span>
          );
        })}
      </div>

      {/* Lienzo escalado */}
      <div ref={wrapRef} className="relative w-full" style={{ height: DESIGN_H * scale }}>
        {scale > 0 && (
          <div
            className="absolute left-0 top-0"
            style={{
              width: DESIGN_W,
              height: DESIGN_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {/* Conectores */}
            <svg
              width={DESIGN_W}
              height={DESIGN_H}
              viewBox={`0 0 ${DESIGN_W} ${DESIGN_H}`}
              className="absolute left-0 top-0"
              aria-hidden
            >
              {links.map((pts, i) => (
                <polyline
                  key={i}
                  points={pts}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                  className="text-line2"
                />
              ))}
            </svg>

            {/* Celdas */}
            {placed.map((p) => (
              <BracketCell key={p.match.matchNumber} placed={p} onOpen={() => setOpenNum(p.match.matchNumber)} />
            ))}

            {/* Copa bajo la final */}
            <div
              className="absolute text-center"
              style={{ left: 4 * COL_PITCH, top: DESIGN_H - 26, width: CELL_W }}
            >
              <span className="text-[16px] leading-none">🏆</span>
            </div>
          </div>
        )}
      </div>

      {/* Tercer puesto, aparte y a tamaño normal */}
      {third && (
        <div className="flex flex-col gap-1.5">
          <h3 className="px-1 text-[11px] font-extrabold uppercase tracking-wide text-muted2">
            Tercer puesto
          </h3>
          <FullCard placed={third} onOpen={() => setOpenNum(third.match.matchNumber)} />
        </div>
      )}

      <p className="px-1 text-[11px] leading-relaxed text-muted2">
        Toca un cruce para ver el marcador y tu pronóstico. El recuadro dorado es la final.
      </p>

      {openMatch && <DetailModal placed={openMatch} onClose={() => setOpenNum(null)} />}
    </div>
  );
}

/** Construye posiciones y conectores del árbol a partir de los placeholders. */
function buildLayout(bracket: BracketRound[]) {
  const matches = new Map<number, { m: BracketMatch; label: string }>();
  for (const r of bracket) for (const m of r.matches) matches.set(m.matchNumber, { m, label: r.label });

  // Final = el partido de la ronda "final".
  const finalRound = bracket.find((r) => r.phase === "final");
  const finalNum = finalRound?.matches[0]?.matchNumber;
  if (!finalNum) return null;

  const children = (num: number): number[] => {
    const e = matches.get(num);
    if (!e) return [];
    return [winnerRef(e.m.home.placeholder), winnerRef(e.m.away.placeholder)].filter(
      (n): n is number => n != null && matches.has(n),
    );
  };

  // Lado (izq/der) por descendencia desde los dos hijos de la final.
  const side = new Map<number, "L" | "R">();
  const [leftRoot, rightRoot] = children(finalNum);
  const mark = (num: number | undefined, s: "L" | "R") => {
    if (num == null) return;
    side.set(num, s);
    for (const c of children(num)) mark(c, s);
  };
  mark(leftRoot, "L");
  mark(rightRoot, "R");

  // Y de cada partido: hojas equiespaciadas; padres = media de sus hijos.
  const yMemo = new Map<number, number>();
  const computeY = (num: number): number => {
    if (yMemo.has(num)) return yMemo.get(num)!;
    const ch = children(num);
    let y: number;
    if (ch.length === 0) {
      const s = side.get(num);
      const slot = s === "R" ? num - rightRoot32Base(bracket) : num - leftRoot32Base(bracket);
      y = TOP + Math.max(0, slot) * LEAF_PITCH + CELL_H / 2;
    } else {
      const ys = ch.map(computeY);
      y = ys.reduce((a, b) => a + b, 0) / ys.length;
    }
    yMemo.set(num, y);
    return y;
  };

  const placed: Placed[] = [];
  let third: Placed | null = null;
  for (const [num, { m, label }] of matches) {
    if (m.matchNumber === finalNum) {
      placed.push({ match: m, roundLabel: label, col: 4, x: 4 * COL_PITCH, y: computeY(num) });
      continue;
    }
    const e = matches.get(num)!;
    if (isThird(e, bracket)) {
      third = { match: m, roundLabel: label, col: 4, x: 0, y: 0 };
      continue;
    }
    const s = side.get(num) ?? "L";
    const col = columnFor(phaseOf(num, bracket), s);
    placed.push({ match: m, roundLabel: label, col, x: col * COL_PITCH, y: computeY(num) });
  }

  // Conectores padre→hijo.
  const links: string[] = [];
  const posByNum = new Map(placed.map((p) => [p.match.matchNumber, p]));
  for (const p of placed) {
    for (const c of children(p.match.matchNumber)) {
      const cp = posByNum.get(c);
      if (!cp) continue;
      const childRight = cp.col < p.col;
      const childEdge = childRight ? cp.x + CELL_W : cp.x;
      const parentEdge = childRight ? p.x : p.x + CELL_W;
      const midX = (childEdge + parentEdge) / 2;
      links.push(`${childEdge},${cp.y} ${midX},${cp.y} ${midX},${p.y} ${parentEdge},${p.y}`);
    }
  }

  return { placed, links, third };
}

// --- Helpers de fase/estructura -------------------------------------------
function phaseOf(num: number, bracket: BracketRound[]): string {
  for (const r of bracket) if (r.matches.some((m) => m.matchNumber === num)) return r.phase;
  return "";
}
function isThird(e: { m: BracketMatch }, bracket: BracketRound[]) {
  return bracket.some((r) => r.phase === "third" && r.matches.some((m) => m.matchNumber === e.m.matchNumber));
}
/** Menor nº de R32 que está en el lado izquierdo (para el slot vertical). */
function leftRoot32Base(bracket: BracketRound[]): number {
  const r32 = bracket.find((r) => r.phase === "round32");
  if (!r32) return 0;
  return Math.min(...r32.matches.map((m) => m.matchNumber));
}
/** Menor nº de R32 del lado derecho = base izq + 8 (16 cruces, 8 por lado). */
function rightRoot32Base(bracket: BracketRound[]): number {
  return leftRoot32Base(bracket) + 8;
}

// --- Celdas ----------------------------------------------------------------
function BracketCell({ placed: p, onOpen }: { placed: Placed; onOpen: () => void }) {
  const m = p.match;
  const isFinalCell = p.col === 4;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`absolute flex items-center justify-center gap-0.5 rounded-md border transition active:scale-95 ${
        isFinalCell
          ? "border-accent/70 bg-accent/10"
          : "border-line bg-surface hover:border-primary/50"
      }`}
      style={{ left: p.x, top: p.y - CELL_H / 2, width: CELL_W, height: CELL_H }}
    >
      <FlagMini team={m.home} dim={m.hasResult && m.winner === "away"} win={m.hasResult && m.winner === "home"} />
      <FlagMini team={m.away} dim={m.hasResult && m.winner === "home"} win={m.hasResult && m.winner === "away"} />
    </button>
  );
}

function FlagMini({ team, dim, win }: { team: BracketTeam; dim: boolean; win: boolean }) {
  return (
    <span
      className={`flex items-center justify-center rounded-full ${win ? "ring-1 ring-primary" : ""} ${
        dim ? "opacity-35" : ""
      }`}
      style={{ width: FLAG, height: FLAG }}
    >
      {team.iso ? (
        <Flag iso={team.iso} size={FLAG} />
      ) : (
        <span className="block rounded-full bg-surface3" style={{ width: FLAG, height: FLAG }} />
      )}
    </span>
  );
}

/** Tarjeta a tamaño normal (tercer puesto), reutiliza el detalle compacto. */
function FullCard({ placed: p, onOpen }: { placed: Placed; onOpen: () => void }) {
  const m = p.match;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-left transition hover:border-primary/50"
    >
      <TeamInline team={m.home} win={m.winner === "home"} />
      <span className="shrink-0 rounded-md bg-surface3 px-2 py-0.5 font-display text-[13px] font-extrabold tabular-nums">
        {m.hasResult ? `${m.homeGoals} : ${m.awayGoals}` : "vs"}
      </span>
      <TeamInline team={m.away} win={m.winner === "away"} align="right" />
    </button>
  );
}

function TeamInline({
  team,
  win,
  align = "left",
}: {
  team: BracketTeam;
  win: boolean;
  align?: "left" | "right";
}) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
      {team.iso ? (
        <Flag iso={team.iso} size={22} />
      ) : (
        <span className="h-[22px] w-[22px] shrink-0 rounded-full bg-surface3" />
      )}
      <span
        className={`min-w-0 truncate text-[13px] ${
          team.name ? "font-bold text-fg" : "font-semibold italic text-muted2"
        } ${win ? "text-primary" : ""}`}
      >
        {team.name ?? team.placeholder ?? "Por determinar"}
      </span>
    </div>
  );
}

// --- Detalle al tocar ------------------------------------------------------
const OUTCOME_LABEL: Record<Outcome, string> = { "1": "Local", X: "Empate", "2": "Visit." };

function DetailModal({ placed: p, onClose }: { placed: Placed; onClose: () => void }) {
  const m = p.match;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 safe-px"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line bg-surface2 px-4 py-2.5">
          <span className="font-display text-[13px] font-extrabold uppercase tracking-wide text-fg">
            {p.roundLabel}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted transition hover:bg-surface3"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" className="qb-stroke" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-2 px-4 py-4">
          <DetailRow team={m.home} goals={m.homeGoals} win={m.winner === "home"} hasResult={m.hasResult} />
          <DetailRow team={m.away} goals={m.awayGoals} win={m.winner === "away"} hasResult={m.hasResult} />
        </div>

        <div className="flex items-center gap-2 border-t border-line bg-ink/30 px-4 py-2.5">
          {!m.hasResult && <span className="text-[11.5px] font-bold text-muted2">{m.whenLabel}</span>}
          {m.featured && (
            <span className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.3px] text-accent">
              ★ Estrella
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {m.myOutcome === null ? (
              <span className="text-[11.5px] font-semibold italic text-muted2">
                {m.hasResult ? "No pronosticaste" : "Sin pronóstico"}
              </span>
            ) : (
              <>
                <span className="text-[11.5px] font-bold text-muted2">Tu pron.</span>
                <OutcomeChip
                  outcome={m.myOutcome}
                  state={m.hasResult ? (m.myCorrect ? "good" : "bad") : "neutral"}
                />
                {m.hasResult && (
                  <span
                    className={`font-display text-[13px] font-extrabold tabular-nums ${
                      (m.myPoints ?? 0) > 0 ? "text-accent" : "text-muted2"
                    }`}
                  >
                    {(m.myPoints ?? 0) > 0 ? `+${m.myPoints}` : "0"}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  team,
  goals,
  win,
  hasResult,
}: {
  team: BracketTeam;
  goals: number | null;
  win: boolean;
  hasResult: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-2 py-1.5 ${win ? "bg-primary/[0.08]" : ""}`}>
      {team.iso ? (
        <Flag iso={team.iso} size={26} />
      ) : (
        <span className="h-[26px] w-[26px] shrink-0 rounded-full bg-surface3" />
      )}
      <span
        className={`min-w-0 flex-1 truncate text-[14px] ${
          team.name ? "font-bold text-fg" : "font-semibold italic text-muted2"
        }`}
      >
        {team.name ?? team.placeholder ?? "Por determinar"}
      </span>
      {win && (
        <svg viewBox="0 0 24 24" width="16" height="16" className="qb-stroke shrink-0 text-primary" aria-hidden>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
      <span className={`font-display text-[18px] font-extrabold tabular-nums ${win ? "text-fg" : "text-muted"}`}>
        {hasResult ? goals : "–"}
      </span>
    </div>
  );
}

function OutcomeChip({ outcome, state }: { outcome: Outcome; state: "good" | "bad" | "neutral" }) {
  const cls =
    state === "good"
      ? "border-good/60 bg-good/15 text-good"
      : state === "bad"
        ? "border-bad/50 bg-bad/10 text-bad"
        : "border-line2 bg-surface2 text-fg";
  return (
    <span
      className={`inline-flex h-6 min-w-[2rem] items-center justify-center rounded-lg border px-1.5 text-[11px] font-extrabold uppercase ${cls}`}
      title={OUTCOME_LABEL[outcome]}
    >
      {outcome}
    </span>
  );
}
