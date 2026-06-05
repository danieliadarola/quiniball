/**
 * Tipos de los DATOS MAESTROS del Mundial 2026.
 *
 * Estos tipos describen la información estática del torneo (sedes, selecciones,
 * grupos y calendario). Se cargan desde ficheros de configuración editables
 * (`venues.ts`, `teams.ts`, `groups.ts`, `matches.ts`) y luego se "siembran"
 * en la base de datos.
 *
 * Regla de oro: la app NUNCA inventa resultados aquí. El resultado oficial vive
 * en la BD (tabla `matches`) y lo escribe la capa de resultados (manual o API).
 */

// --- Sedes -----------------------------------------------------------------

export type Country = "USA" | "MEX" | "CAN";

export interface Venue {
  id: string;          // slug estable, p.ej. "mexico-city-azteca"
  city: string;
  stadium: string;
  country: Country;
  timezone: string;    // IANA, p.ej. "America/Mexico_City"
}

// --- Selecciones -----------------------------------------------------------

/** Letra de grupo del Mundial 2026: 12 grupos, de la A a la L. */
export type GroupLetter =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export interface Team {
  id: string;          // código FIFA en minúsculas, p.ej. "mex", "arg"
  code: string;        // código FIFA en mayúsculas, p.ej. "MEX"
  name: string;        // nombre mostrado, p.ej. "México"
  group: GroupLetter | null; // null hasta que se conozca el sorteo
  flag: string;        // emoji de bandera (fallback)
  iso: string;         // código para flag-icons, p.ej. "mx", "gb-sct"
  isHost?: boolean;
}

export interface TournamentGroup {
  letter: GroupLetter;
  teamIds: string[];   // 4 ids de Team (vacío hasta el sorteo)
}

// --- Partidos --------------------------------------------------------------

/** Fases del torneo en orden cronológico. */
export type Phase =
  | "group"        // fase de grupos (partidos 1–72)
  | "round32"      // dieciseisavos / ronda de 32
  | "round16"      // octavos
  | "quarter"      // cuartos
  | "semi"         // semifinales
  | "third"        // tercer y cuarto puesto
  | "final";       // final

/**
 * Un partido del calendario oficial.
 *
 * En eliminatorias los equipos no se conocen hasta que terminan las fases
 * previas: por eso `homeTeamId`/`awayTeamId` pueden ser null y se usan
 * `homePlaceholder`/`awayPlaceholder` para mostrar "1ºA", "Ganador W57", etc.
 */
export interface Match {
  matchNumber: number;          // 1–104 (numeración oficial FIFA)
  phase: Phase;
  group: GroupLetter | null;    // solo en fase de grupos
  kickoff: string;              // ISO 8601 con offset, p.ej. "2026-06-11T20:00:00-06:00"
  venueId: string;

  homeTeamId: string | null;
  awayTeamId: string | null;
  homePlaceholder?: string;     // p.ej. "1ºA"  | "Ganador 73"
  awayPlaceholder?: string;     // p.ej. "2ºB"  | "Ganador 74"
}
