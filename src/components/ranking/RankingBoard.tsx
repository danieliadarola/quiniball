"use client";

/**
 * Tablero de clasificación estilo "podio": Top 3 destacado + clasificación
 * completa con buscador y "Ir a mi posición". Resalta la fila del propio
 * jugador. Solo presentación: recibe las filas ya ordenadas por posición.
 */
import { useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { StandingRow } from "@/lib/standings/fetch";

// Oro / plata / bronce: aro del avatar, gradiente del bloque y alto del podio.
const PODIUM: Record<number, { h: number; grad: string; ring: string; num: string; numColor: string }> = {
  1: { h: 112, grad: "linear-gradient(180deg,#f7cf52,#e0a020)", ring: "ring-[#f5c542]", num: "1.º", numColor: "#6b4a00" },
  2: { h: 84, grad: "linear-gradient(180deg,#d3d7de,#9aa0aa)", ring: "ring-[#cfd3da]", num: "2.º", numColor: "#3f444c" },
  3: { h: 68, grad: "linear-gradient(180deg,#e3ab7a,#c07c40)", ring: "ring-[#d99058]", num: "3.º", numColor: "#5a3618" },
};

const POS_COLOR: Record<number, string> = {
  1: "text-[#f5c542]",
  2: "text-[#cfd3da]",
  3: "text-[#d99058]",
};

export function RankingBoard({
  rows,
  currentProfileId,
}: {
  rows: StandingRow[];
  currentProfileId: string;
}) {
  const [query, setQuery] = useState("");
  const meRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => r.displayName.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  function goToMe() {
    setQuery("");
    requestAnimationFrame(() =>
      meRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface px-5 py-8 text-center text-sm text-muted">
        Aún no hay participantes con clasificación.
      </p>
    );
  }

  const top3 = rows.slice(0, 3);
  const noPointsYet = rows.every((r) => r.totalPoints === 0);
  const iAmHere = rows.some((r) => r.profileId === currentProfileId);

  return (
    <div className="flex flex-col gap-4">
      {/* ---------- Podio Top 3 ---------- */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <h3 className="border-b border-line px-4 py-2.5 text-[11.5px] font-extrabold uppercase tracking-[1px] text-muted">
          Top 3
        </h3>
        <div className="flex items-end justify-center gap-2 px-3 pt-5 sm:gap-4">
          {[2, 1, 3].map((place) => {
            const row = top3[place - 1];
            const meta = PODIUM[place];
            if (!row) return <div key={place} className="flex-1" />;
            const isYou = row.profileId === currentProfileId;
            return (
              <div key={place} className="flex flex-1 flex-col items-center justify-end gap-2">
                <Avatar
                  id={row.profileId}
                  name={row.displayName}
                  size={place === 1 ? 70 : 56}
                  ringClass={`ring-2 ${meta.ring} ring-offset-2 ring-offset-surface`}
                  avatarStyle={row.avatarStyle}
                  avatarSeed={row.avatarSeed}
                />
                <div className="w-full px-0.5 text-center">
                  <span className="block truncate text-[12.5px] font-bold leading-tight">
                    {row.displayName}
                    {isYou && <span className="ml-1 text-[10px] font-extrabold text-accent">· Tú</span>}
                  </span>
                  <span className="text-[11px] font-bold text-muted">{row.totalPoints} pts</span>
                </div>
                <div
                  className="flex w-full flex-col items-center rounded-t-xl pt-2"
                  style={{ height: meta.h, background: meta.grad }}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="rgba(255,255,255,0.9)" aria-hidden>
                    <path d="M12 2l2.9 6.3 6.8.6-5.1 4.5 1.5 6.6L12 17.3 5.9 20.6l1.5-6.6L2.3 8.9l6.8-.6z" />
                  </svg>
                  <span className="mt-0.5 font-display text-sm font-extrabold" style={{ color: meta.numColor }}>
                    {meta.num}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- Clasificación completa ---------- */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <h3 className="border-b border-line px-4 py-2.5 text-[11.5px] font-extrabold uppercase tracking-[1px] text-muted">
          Clasificación completa
        </h3>

        <div className="flex flex-col gap-3 p-3">
          {noPointsYet && (
            <p className="rounded-xl bg-surface2 px-3 py-2 text-center text-[11.5px] text-muted">
              La clasificación arrancará en cuanto se registren los primeros resultados.
            </p>
          )}

          {/* Buscador + ir a mi posición */}
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar participante…"
              className="min-w-0 flex-1 rounded-xl border border-line2 bg-surface2 px-3.5 py-2.5 text-sm text-fg outline-none transition placeholder:text-muted2 focus:border-primary/60"
            />
            {iAmHere && (
              <button
                type="button"
                onClick={goToMe}
                className="shrink-0 rounded-xl border border-line2 bg-surface2 px-3 py-2.5 text-xs font-extrabold text-fg transition hover:border-primary/60"
              >
                Ir a mi posición
              </button>
            )}
          </div>

          {/* Lista */}
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted">
              Nadie coincide con “{query.trim()}”.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((row) => {
                const isYou = row.profileId === currentProfileId;
                return (
                  <div
                    key={row.profileId}
                    ref={isYou ? meRef : undefined}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                      isYou ? "border-accent bg-accent/10" : "border-line bg-surface2"
                    }`}
                  >
                    <span
                      className={`w-7 shrink-0 text-center font-display text-base font-extrabold ${
                        POS_COLOR[row.rank] ?? "text-muted"
                      }`}
                    >
                      {row.rank}
                    </span>
                    <Avatar
                      id={row.profileId}
                      name={row.displayName}
                      size={38}
                      avatarStyle={row.avatarStyle}
                      avatarSeed={row.avatarSeed}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-bold">
                        {row.displayName}
                        {isYou && <span className="ml-2 text-xs font-extrabold text-accent">Tú</span>}
                      </span>
                      <span className="text-[11px] font-semibold text-muted">
                        {row.exactHits} exactos · {row.outcomeHits} aciertos
                      </span>
                    </div>
                    <span className="shrink-0 font-display text-[20px] font-extrabold text-accent">
                      {row.totalPoints}
                      <small className="ml-0.5 text-[11px] font-bold text-muted">pts</small>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
