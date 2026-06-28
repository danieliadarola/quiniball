"use client";

/**
 * Chip de cuenta atrás al INICIO DE LA PRÓXIMA FASE del torneo, para la esquina
 * superior derecha del dashboard. Recibe las fases con su hora de inicio (ya
 * calculadas en el servidor) y va contando en vivo hacia la siguiente que aún
 * no ha empezado. Si ya empezaron todas, muestra la fase en curso.
 *
 * El reloj se inicializa en el cliente (no en SSR) para no provocar desajustes
 * de hidratación: hasta que monta, pinta un esqueleto neutro.
 */
import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/time/countdown";

export interface PhaseStart {
  phase: string;
  label: string;
  startMs: number;
}

export function PhaseCountdown({ phases }: { phases: PhaseStart[] }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (phases.length === 0) return null;

  // Esqueleto antes de montar (mismo árbol en SSR y primer render cliente).
  if (now === null) {
    return (
      <div className="shrink-0 rounded-2xl border border-line bg-surface2 px-3 py-2">
        <div className="h-3 w-16 animate-pulse rounded bg-surface3" />
        <div className="mt-1.5 h-4 w-20 animate-pulse rounded bg-surface3" />
      </div>
    );
  }

  const next = phases.find((p) => p.startMs > now);
  const current = [...phases].reverse().find((p) => p.startMs <= now);

  return (
    <div className="shrink-0 rounded-2xl border border-line bg-surface2 px-3 py-2 text-right">
      <div className="flex items-center justify-end gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-muted2">
        <svg viewBox="0 0 24 24" width="11" height="11" className="qb-stroke" aria-hidden>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2.5M9 2h6" />
        </svg>
        {next ? next.label : current ? "En juego" : "Torneo"}
      </div>
      <div className="mt-0.5 font-display text-[15px] font-extrabold leading-none text-fg">
        {next ? (
          <>
            <span className="text-muted">en </span>
            <span className="text-accent">{formatCountdown(next.startMs - now)}</span>
          </>
        ) : (
          <span className="text-accent">{current?.label ?? "Final"}</span>
        )}
      </div>
    </div>
  );
}
