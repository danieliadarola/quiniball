/**
 * Formato de fechas del calendario para el jugador.
 *
 * Los kickoffs se guardan como instante absoluto (timestamptz). Para el jugador
 * —que está en España— mostramos la hora peninsular: es la que necesita para no
 * perder el cierre. La sede/ciudad se muestra aparte como contexto.
 */
const KICKOFF_FMT = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Madrid",
});

/** "jue, 11 jun, 22:00" (hora de España peninsular). */
export function formatKickoff(iso: string): string {
  return KICKOFF_FMT.format(new Date(iso));
}

const DAY_FMT = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Madrid",
});

/** "jueves, 11 de junio" — para cabeceras de día si hiciera falta. */
export function formatDay(iso: string): string {
  return DAY_FMT.format(new Date(iso));
}
