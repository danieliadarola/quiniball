/**
 * Constantes de aplicación y valores por defecto.
 */
export { POINTS } from "@/lib/scoring/types";

export const APP_NAME = "QuiniBall";

export const TOURNAMENT = {
  name: "Copa Mundial de la FIFA 2026",
  startDate: "2026-06-11",
  endDate: "2026-07-19",
  teams: 48,
  groups: 12,
  matches: 104,
  hosts: ["USA", "México", "Canadá"],
} as const;
