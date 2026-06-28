/**
 * Formato compacto de cuenta atrás, compartido por los contadores del dashboard
 * (inicio de fase) y de la quiniela (cierre de pronósticos).
 *
 * Muestra como mucho dos unidades, de la más significativa a la siguiente:
 *   · ≥ 1 día  → "5d 3h"
 *   · ≥ 1 hora → "3h 12m"
 *   · ≥ 1 min  → "12m 30s"
 *   · < 1 min  → "30s"
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
