"use client";

/**
 * "Cuadro": clasificación REAL del Mundial (no de la quiniela).
 *
 * Muestra las tablas de los 12 grupos calculadas con resultados oficiales
 * (PJ, G, E, P, GF, GC, DG, Pts y forma reciente). La pestaña de eliminatorias
 * queda preparada y se rellenará cuando haya cruces.
 */
import { useState } from "react";
import { Flag } from "@/components/ui/Flag";
import type { GroupStandings, FormResult } from "@/lib/tournament/groupTable";
import type { BracketRound } from "@/lib/tournament/bracket";
import { KnockoutBracket } from "@/components/quiniela/KnockoutBracket";

export function CuadroTab({
  groups,
  bracket,
}: {
  groups: GroupStandings[];
  bracket: BracketRound[];
}) {
  const [phase, setPhase] = useState<"grupos" | "eliminatorias">("grupos");

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-pestañas: fase de grupos / eliminatorias */}
      <div className="flex gap-2">
        {(["grupos", "eliminatorias"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            className={`flex-1 rounded-xl border px-3 py-2.5 text-[12.5px] font-extrabold transition ${
              phase === p
                ? "border-transparent bg-primary text-primary-ink"
                : "border-line bg-surface2 text-muted"
            }`}
          >
            {p === "grupos" ? "Fase de grupos" : "Eliminatorias"}
          </button>
        ))}
      </div>

      {phase === "grupos" ? (
        <div className="flex flex-col gap-5">
          {groups.map((g) => (
            <GroupBlock key={g.letter} group={g} />
          ))}
          <p className="px-1 text-[11px] leading-relaxed text-muted2">
            <span className="mr-1 inline-block h-2.5 w-1 translate-y-0.5 rounded-full bg-primary align-middle" />
            Las dos primeras de cada grupo se clasifican (más los 8 mejores terceros).
          </p>
        </div>
      ) : bracket.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface2 px-6 py-14 text-center">
          <p className="text-sm font-semibold text-muted">
            Las eliminatorias aparecerán aquí cuando empiecen los cruces.
          </p>
        </div>
      ) : (
        <KnockoutBracket bracket={bracket} />
      )}
    </div>
  );
}

function GroupBlock({ group }: { group: GroupStandings }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="border-b border-line bg-surface2 px-4 py-2.5">
        <h3 className="font-display text-[16px] font-extrabold uppercase tracking-wide text-fg">
          Grupo {group.letter}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] border-collapse text-[12.5px]">
          <thead>
            <tr className="text-[10.5px] font-bold uppercase tracking-wide text-muted2">
              <Th className="pl-3 pr-1 text-left">#</Th>
              <Th className="py-2 pr-2 text-left">Equipo</Th>
              <Th>PJ</Th>
              <Th>G</Th>
              <Th>E</Th>
              <Th>P</Th>
              <Th>GF</Th>
              <Th>GC</Th>
              <Th>DG</Th>
              <Th className="px-1.5 py-2 text-center text-fg">Pts</Th>
              <Th className="px-3 py-2 text-left">Últimos</Th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((r, i) => (
              <tr key={r.teamId} className="border-t border-line/60">
                <td className="py-2.5 pl-3 pr-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-5 w-1 rounded-full ${i < 2 ? "bg-primary" : "bg-transparent"}`}
                      aria-hidden
                    />
                    <span className="font-bold text-muted">{i + 1}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-2">
                  <div className="flex items-center gap-2">
                    <Flag iso={r.iso} size={20} />
                    <span className="truncate font-bold text-fg">{r.name}</span>
                  </div>
                </td>
                <Td>{r.played}</Td>
                <Td>{r.won}</Td>
                <Td>{r.drawn}</Td>
                <Td>{r.lost}</Td>
                <Td>{r.goalsFor}</Td>
                <Td>{r.goalsAgainst}</Td>
                <td className="px-1.5 py-2.5 text-center font-semibold text-fg">
                  {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                </td>
                <td className="px-1.5 py-2.5 text-center font-extrabold text-fg">{r.points}</td>
                <td className="px-3 py-2.5">
                  <FormDots form={r.form} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={className ?? "px-1.5 py-2 text-center"}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-1.5 py-2.5 text-center text-muted">{children}</td>;
}

function FormDots({ form }: { form: FormResult[] }) {
  if (form.length === 0) return <span className="text-muted2">—</span>;
  return (
    <span className="inline-flex gap-1">
      {form.map((r, i) => (
        <span
          key={i}
          className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-black leading-none ${
            r === "W"
              ? "bg-accent/20 text-accent"
              : r === "L"
                ? "bg-bad/20 text-bad"
                : "bg-white/10 text-muted"
          }`}
          title={r === "W" ? "Victoria" : r === "L" ? "Derrota" : "Empate"}
        >
          {r === "W" ? "✓" : r === "L" ? "✕" : "–"}
        </span>
      ))}
    </span>
  );
}
