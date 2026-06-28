"use client";

/**
 * Aviso de la JORNADA SELECCIONADA al principio de la pestaña Partidos.
 *
 * Muestra dos cosas, en vivo y referidas SOLO a esa jornada:
 *   · cuenta atrás al SIGUIENTE PARTIDO de la jornada (su kickoff), y
 *   · cuántos partidos te FALTAN POR PRONOSTICAR (abiertos: cierre 5 min antes).
 *
 * Estados: si te faltan pronósticos → ámbar (urgente); si vas al día → tranquilo.
 * Si la jornada ya no tiene partidos por empezar, no se muestra.
 *
 * El reloj arranca en el cliente (sin desajuste de hidratación) y como recibe la
 * jornada actual por props, cambia solo al cambiar de jornada.
 */
import { useEffect, useState } from "react";
import { PREDICTION_LOCK_LEAD_MS } from "@/lib/matches/schedule";
import { formatCountdown } from "@/lib/time/countdown";

export interface JornadaMatch {
  kickoffMs: number;
  predicted: boolean;
}

export function JornadaAlert({ matches }: { matches: JornadaMatch[] }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;

  // Siguiente partido de la jornada (el primero que aún no ha empezado).
  const upcoming = matches.filter((m) => m.kickoffMs > now).sort((a, b) => a.kickoffMs - b.kickoffMs);
  const next = upcoming[0];
  if (!next) return null; // jornada en juego o finalizada: sin aviso

  // Faltan por pronosticar: partidos aún abiertos (cierre 5 min antes) sin pick.
  const pending = matches.filter(
    (m) => now < m.kickoffMs - PREDICTION_LOCK_LEAD_MS && !m.predicted,
  ).length;

  const urgent = pending > 0;
  const time = formatCountdown(next.kickoffMs - now);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
        urgent ? "border-accent/50 bg-accent/10" : "border-line bg-surface2"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          urgent ? "bg-accent/20 text-accent" : "bg-surface3 text-muted"
        }`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" width="18" height="18" className="qb-stroke">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2.5M9 2h6" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-bold text-fg">
          Siguiente partido en <span className={urgent ? "text-accent" : "text-fg"}>{time}</span>
        </p>
        <p className="text-[11.5px] font-semibold text-muted">
          {urgent
            ? `Te faltan ${pending} ${pending === 1 ? "partido" : "partidos"} por pronosticar en esta jornada`
            : "Vas al día en esta jornada ✓"}
        </p>
      </div>
    </div>
  );
}
