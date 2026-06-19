/**
 * Constantes de aplicación y valores por defecto.
 */
export { POINTS } from "@/lib/scoring/types";

export const APP_NAME = "QuiniBall";

/** Versión visible de la app (única fuente de verdad para el pie y los avisos). */
export const APP_VERSION = "1.1.0";

export const TOURNAMENT = {
  name: "Copa Mundial de la FIFA 2026",
  startDate: "2026-06-11",
  endDate: "2026-07-19",
  teams: 48,
  groups: 12,
  matches: 104,
  hosts: ["USA", "México", "Canadá"],
} as const;
