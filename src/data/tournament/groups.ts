/**
 * Los 12 grupos (A–L) del Mundial 2026, de 4 selecciones cada uno.
 *
 * Se deriva automáticamente de TEAMS: cada grupo agrupa los equipos cuyo
 * campo `group` coincide con su letra. Así no hay que mantener la lista en dos
 * sitios: editas TEAMS y los grupos se recalculan solos.
 */
import type { GroupLetter, TournamentGroup } from "./types";
import { TEAMS } from "./teams";

export const GROUP_LETTERS: GroupLetter[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
];

export const GROUPS: TournamentGroup[] = GROUP_LETTERS.map((letter) => ({
  letter,
  teamIds: TEAMS.filter((t) => t.group === letter).map((t) => t.id),
}));

export const getGroup = (letter: GroupLetter): TournamentGroup | undefined =>
  GROUPS.find((g) => g.letter === letter);
