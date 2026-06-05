/**
 * Agrupación del calendario en "secciones" (jornadas de grupos y rondas de
 * eliminatorias) y lógica de cierre de pronósticos.
 *
 * Módulo puro (sin BD ni I/O) para poder testearlo de forma aislada.
 */
import type { Phase } from "@/data/tournament/types";

export type SectionKey =
  | "group-1" | "group-2" | "group-3"
  | "round32" | "round16" | "quarter" | "semi" | "third" | "final";

/** Orden cronológico de las secciones del torneo. */
export const SECTION_ORDER: SectionKey[] = [
  "group-1", "group-2", "group-3",
  "round32", "round16", "quarter", "semi", "third", "final",
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  "group-1": "Fase de grupos · Jornada 1",
  "group-2": "Fase de grupos · Jornada 2",
  "group-3": "Fase de grupos · Jornada 3",
  round32: "Dieciseisavos de final",
  round16: "Octavos de final",
  quarter: "Cuartos de final",
  semi: "Semifinales",
  third: "Tercer y cuarto puesto",
  final: "Final",
};

/** Mínimo necesario de un partido para clasificarlo y calcular su cierre. */
export interface SchedulableMatch {
  matchNumber: number;
  phase: Phase;
  kickoff: string; // ISO 8601
}

/** Devuelve la sección a la que pertenece un partido. */
export function sectionOf(match: SchedulableMatch): SectionKey {
  if (match.phase === "group") {
    const matchday = Math.floor((match.matchNumber - 1) / 24) + 1; // 1–24, 25–48, 49–72
    return `group-${matchday}` as SectionKey;
  }
  return match.phase as SectionKey;
}

export interface ScheduleSection<T extends SchedulableMatch> {
  key: SectionKey;
  label: string;
  matches: T[];
  /** Kickoff más temprano de la sección (epoch ms); base del cierre por jornada. */
  earliestKickoffMs: number;
}

/** Agrupa los partidos en secciones, en orden cronológico. */
export function groupIntoSections<T extends SchedulableMatch>(
  matches: T[],
): ScheduleSection<T>[] {
  const buckets = new Map<SectionKey, T[]>();
  for (const m of matches) {
    const key = sectionOf(m);
    const list = buckets.get(key);
    if (list) list.push(m);
    else buckets.set(key, [m]);
  }

  return SECTION_ORDER.filter((key) => buckets.has(key)).map((key) => {
    const list = buckets.get(key)!.sort((a, b) => a.matchNumber - b.matchNumber);
    const earliestKickoffMs = Math.min(...list.map((m) => Date.parse(m.kickoff)));
    return { key, label: SECTION_LABELS[key], matches: list, earliestKickoffMs };
  });
}

/**
 * Antelación con la que se cierran los pronósticos: 5 minutos ANTES del inicio
 * del partido. Fuente de verdad compartida por la UI y las Server Actions; la
 * RLS replica la misma regla (`kickoff_at - interval '5 minutes'`).
 */
export const PREDICTION_LOCK_LEAD_MS = 5 * 60 * 1000;

/** Instante (epoch ms) en que se cierra el pronóstico de un partido. */
export function lockDeadlineMs(matchKickoffMs: number): number {
  return matchKickoffMs - PREDICTION_LOCK_LEAD_MS;
}

/**
 * ¿Está cerrado el pronóstico de un partido? Cierra 5 minutos antes del kickoff.
 */
export function isPredictionLocked(matchKickoffMs: number, nowMs: number): boolean {
  return nowMs >= lockDeadlineMs(matchKickoffMs);
}
