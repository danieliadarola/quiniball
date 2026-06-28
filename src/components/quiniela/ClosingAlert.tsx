"use client";

/**
 * Banner de CIERRE DE PRONÓSTICOS al principio de la pestaña Partidos.
 *
 * Cuenta atrás en vivo hacia el próximo cierre (kickoff − 5 min) y cuántos
 * partidos abiertos te faltan por pronosticar. Dos estados:
 *   · pendientes > 0 → urgente (ámbar): "Cierra en 2h 15m · te faltan 3 partidos".
 *   · al día        → tranquilo: "Próximo cierre en 2h 15m · vas al día ✓".
 *
 * El reloj arranca en el cliente para no romper la hidratación. Cuando el cierre
 * ya ha pasado (dato del servidor desfasado), no muestra nada hasta recargar.
 */
import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/time/countdown";

export function ClosingAlert({
  nextLockMs,
  pendingCount,
}: {
  nextLockMs: number;
  pendingCount: number;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null; // evita parpadeo/desajuste hasta montar
  const remaining = nextLockMs - now;
  if (remaining <= 0) return null;

  const urgent = pendingCount > 0;
  const time = formatCountdown(remaining);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
        urgent
          ? "border-accent/50 bg-accent/10"
          : "border-line bg-surface2"
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
          {urgent ? (
            <>
              Cierra en <span className="text-accent">{time}</span>
            </>
          ) : (
            <>
              Próximo cierre en <span className="text-fg">{time}</span>
            </>
          )}
        </p>
        <p className="text-[11.5px] font-semibold text-muted">
          {urgent
            ? `Te faltan ${pendingCount} ${pendingCount === 1 ? "partido" : "partidos"} por pronosticar`
            : "Vas al día ✓"}
        </p>
      </div>
    </div>
  );
}
