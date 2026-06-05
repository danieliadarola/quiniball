/**
 * El calendario de los 104 partidos del Mundial 2026.
 *
 * ⚠️ DATOS PROVISIONALES Y EDITABLES
 * Las HORAS y las SEDES de cada partido son provisionales: se generan de forma
 * determinista para tener un calendario completo y jugable desde el día uno. El
 * organizador podrá ajustarlas en su panel cuando la FIFA publique el detalle
 * definitivo. Lo que SÍ es fiable:
 *   - Los emparejamientos de la fase de grupos (derivados del sorteo real,
 *     patrón de jornadas verificado).
 *   - La numeración 1–104 y la estructura de fases.
 *   - Las ventanas de fechas oficiales de cada ronda.
 *
 * Hora: ISO 8601 con offset de la zona horaria LOCAL de la sede (DST de
 * jun–jul 2026 ya aplicado).
 *
 * Estructura 2026: 12 grupos (72 partidos) → ronda de 32 (incluye 8 mejores
 * terceros) → octavos → cuartos → semis → 3.º puesto → final.
 */
import type { Match, Phase } from "./types";
import { GROUPS } from "./groups";
import { VENUES, getVenue } from "./venues";

// --- Utilidades de hora local --------------------------------------------

/**
 * Offset UTC de cada zona IANA durante jun–jul 2026 (en verano todas las sedes
 * están en su horario de verano, constante en esos meses).
 */
const TZ_OFFSET: Record<string, string> = {
  "America/Mexico_City": "-06:00", // México no aplica DST desde 2022
  "America/Monterrey": "-06:00",
  "America/Toronto": "-04:00", // EDT
  "America/Vancouver": "-07:00", // PDT
  "America/New_York": "-04:00", // EDT
  "America/Chicago": "-05:00", // CDT
  "America/Los_Angeles": "-07:00", // PDT
};

function offsetFor(venueId: string): string {
  const venue = getVenue(venueId);
  if (!venue) throw new Error(`Sede desconocida: ${venueId}`);
  const offset = TZ_OFFSET[venue.timezone];
  if (!offset) throw new Error(`Sin offset configurado para ${venue.timezone}`);
  return offset;
}

/** Construye el kickoff ISO en hora local de la sede. `date` = "2026-06-11". */
function kickoff(date: string, hour: number, venueId: string): string {
  const hh = String(hour).padStart(2, "0");
  return `${date}T${hh}:00:00${offsetFor(venueId)}`;
}

const VENUE_IDS = VENUES.map((v) => v.id);

// --- Fase de grupos (partidos 1–72) ---------------------------------------

/**
 * Patrón de emparejamientos por posición dentro del grupo (0–3 = orden del
 * sorteo). Verificado contra el fixture real: J1 1v2/3v4, J2 1v3/4v2,
 * J3 4v1/2v3 (los dos partidos de la J3 se juegan simultáneamente).
 */
const GROUP_PATTERN: [number, number][][] = [
  [[0, 1], [2, 3]], // Jornada 1
  [[0, 2], [3, 1]], // Jornada 2
  [[3, 0], [1, 2]], // Jornada 3 (simultáneos por grupo)
];

const GROUP_HOURS = [13, 16, 19, 22]; // franjas locales provisionales (J1 y J2)

function buildGroupStage(): Match[] {
  const matches: Match[] = [];
  let n = 1;
  let venueCursor = 0;

  for (let md = 0; md < 3; md++) {
    GROUPS.forEach((group, gi) => {
      // Fecha provisional repartida dentro de la ventana de cada jornada.
      let date: string;
      if (md === 0) date = `2026-06-${String(11 + Math.floor((gi * 6) / 12)).padStart(2, "0")}`;
      else if (md === 1) date = `2026-06-${String(18 + Math.floor((gi * 6) / 12)).padStart(2, "0")}`;
      else date = `2026-06-${String(24 + Math.floor((gi * 4) / 12)).padStart(2, "0")}`;

      GROUP_PATTERN[md].forEach(([homeIdx, awayIdx]) => {
        const venueId = VENUE_IDS[venueCursor++ % VENUE_IDS.length];
        // En la J3 los dos partidos del grupo van a la misma hora (simultáneos).
        const hour = md === 2 ? 17 : GROUP_HOURS[n % GROUP_HOURS.length];
        matches.push({
          matchNumber: n++,
          phase: "group",
          group: group.letter,
          kickoff: kickoff(date, hour, venueId),
          venueId,
          homeTeamId: group.teamIds[homeIdx] ?? null,
          awayTeamId: group.teamIds[awayIdx] ?? null,
        });
      });
    });
  }
  return matches;
}

// --- Eliminatorias (partidos 73–104) --------------------------------------

function koMatch(
  matchNumber: number,
  phase: Phase,
  date: string,
  hour: number,
  venueId: string,
  homePlaceholder: string,
  awayPlaceholder: string,
): Match {
  return {
    matchNumber,
    phase,
    group: null,
    kickoff: kickoff(date, hour, venueId),
    venueId,
    homeTeamId: null,
    awayTeamId: null,
    homePlaceholder,
    awayPlaceholder,
  };
}

/**
 * Emparejamientos provisionales de la ronda de 32: 12 ganadores de grupo + 12
 * segundos + 8 mejores terceros = 32 equipos en 16 partidos. La asignación
 * exacta de los terceros la fija la FIFA al cierre de la fase de grupos; aquí
 * se usa un cuadro coherente y editable.
 */
const R32_PAIRINGS: [string, string][] = [
  ["1.ºA", "Mejor 3.º (1)"],
  ["1.ºB", "Mejor 3.º (2)"],
  ["1.ºC", "Mejor 3.º (3)"],
  ["1.ºD", "Mejor 3.º (4)"],
  ["1.ºE", "Mejor 3.º (5)"],
  ["1.ºF", "Mejor 3.º (6)"],
  ["1.ºG", "Mejor 3.º (7)"],
  ["1.ºH", "Mejor 3.º (8)"],
  ["2.ºA", "2.ºB"],
  ["2.ºC", "2.ºD"],
  ["2.ºE", "2.ºF"],
  ["2.ºG", "2.ºH"],
  ["1.ºI", "2.ºJ"],
  ["1.ºK", "2.ºL"],
  ["1.ºJ", "2.ºI"],
  ["1.ºL", "2.ºK"],
];

const R32_DATES = [
  "2026-06-28", "2026-06-28", "2026-06-29", "2026-06-29",
  "2026-06-30", "2026-06-30", "2026-07-01", "2026-07-01",
  "2026-07-01", "2026-07-02", "2026-07-02", "2026-07-02",
  "2026-07-03", "2026-07-03", "2026-07-03", "2026-07-03",
];

const R16_DATES = [
  "2026-07-04", "2026-07-04", "2026-07-05", "2026-07-05",
  "2026-07-06", "2026-07-06", "2026-07-07", "2026-07-07",
];

const QF_DATES = ["2026-07-09", "2026-07-09", "2026-07-10", "2026-07-11"];

function buildKnockouts(): Match[] {
  const ko: Match[] = [];
  let venueCursor = 0;
  const nextVenue = () => VENUE_IDS[venueCursor++ % VENUE_IDS.length];

  // Ronda de 32 (73–88)
  R32_PAIRINGS.forEach(([home, away], i) => {
    ko.push(koMatch(73 + i, "round32", R32_DATES[i], 18, nextVenue(), home, away));
  });

  // Octavos (89–96): cruces de los ganadores de 32avos
  for (let i = 0; i < 8; i++) {
    const a = 73 + i * 2;
    ko.push(koMatch(89 + i, "round16", R16_DATES[i], 18, nextVenue(), `Ganador ${a}`, `Ganador ${a + 1}`));
  }

  // Cuartos (97–100)
  for (let i = 0; i < 4; i++) {
    const a = 89 + i * 2;
    ko.push(koMatch(97 + i, "quarter", QF_DATES[i], 18, nextVenue(), `Ganador ${a}`, `Ganador ${a + 1}`));
  }

  // Semifinales (101–102): sedes fijas según el calendario oficial
  ko.push(koMatch(101, "semi", "2026-07-14", 19, "dallas-att", "Ganador 97", "Ganador 98"));
  ko.push(koMatch(102, "semi", "2026-07-15", 19, "atlanta-mercedes", "Ganador 99", "Ganador 100"));

  // Tercer puesto (103) y Final (104)
  ko.push(koMatch(103, "third", "2026-07-18", 16, "miami-hardrock", "Perdedor 101", "Perdedor 102"));
  ko.push(koMatch(104, "final", "2026-07-19", 15, "new-york-metlife", "Ganador 101", "Ganador 102"));

  return ko;
}

// --- Calendario completo ---------------------------------------------------

export const MATCHES: Match[] = [...buildGroupStage(), ...buildKnockouts()];

// Comprobación de integridad: exactamente 104 partidos, numeración única 1–104.
if (MATCHES.length !== 104) {
  throw new Error(`Se esperaban 104 partidos, generados ${MATCHES.length}`);
}
const numbers = new Set(MATCHES.map((m) => m.matchNumber));
if (numbers.size !== 104) {
  throw new Error("Hay números de partido duplicados en el calendario");
}

export const getMatch = (matchNumber: number): Match | undefined =>
  MATCHES.find((m) => m.matchNumber === matchNumber);
