/**
 * Las 48 selecciones del Mundial 2026, repartidas en 12 grupos (A–L).
 *
 * Fuente: datos facilitados por el organizador (FIFA/ESPN, verificado may-2026).
 * `id` = código FIFA en minúsculas. `iso` = código de bandera (flag-icons).
 * Editar aquí si cambiara el sorteo.
 */
import type { Team } from "./types";

export const TEAMS: Team[] = [
  // Grupo A
  { id: "mex", code: "MEX", name: "México",             group: "A", flag: "🇲🇽", iso: "mx", isHost: true },
  { id: "rsa", code: "RSA", name: "Sudáfrica",          group: "A", flag: "🇿🇦", iso: "za" },
  { id: "kor", code: "KOR", name: "Corea del Sur",      group: "A", flag: "🇰🇷", iso: "kr" },
  { id: "cze", code: "CZE", name: "República Checa",    group: "A", flag: "🇨🇿", iso: "cz" },

  // Grupo B
  { id: "can", code: "CAN", name: "Canadá",             group: "B", flag: "🇨🇦", iso: "ca", isHost: true },
  { id: "bih", code: "BIH", name: "Bosnia y Herzegovina", group: "B", flag: "🇧🇦", iso: "ba" },
  { id: "qat", code: "QAT", name: "Catar",              group: "B", flag: "🇶🇦", iso: "qa" },
  { id: "sui", code: "SUI", name: "Suiza",              group: "B", flag: "🇨🇭", iso: "ch" },

  // Grupo C
  { id: "bra", code: "BRA", name: "Brasil",             group: "C", flag: "🇧🇷", iso: "br" },
  { id: "mar", code: "MAR", name: "Marruecos",          group: "C", flag: "🇲🇦", iso: "ma" },
  { id: "hai", code: "HAI", name: "Haití",              group: "C", flag: "🇭🇹", iso: "ht" },
  { id: "sco", code: "SCO", name: "Escocia",            group: "C", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", iso: "gb-sct" },

  // Grupo D
  { id: "usa", code: "USA", name: "Estados Unidos",     group: "D", flag: "🇺🇸", iso: "us", isHost: true },
  { id: "par", code: "PAR", name: "Paraguay",           group: "D", flag: "🇵🇾", iso: "py" },
  { id: "aus", code: "AUS", name: "Australia",          group: "D", flag: "🇦🇺", iso: "au" },
  { id: "tur", code: "TUR", name: "Turquía",            group: "D", flag: "🇹🇷", iso: "tr" },

  // Grupo E
  { id: "ger", code: "GER", name: "Alemania",           group: "E", flag: "🇩🇪", iso: "de" },
  { id: "cuw", code: "CUW", name: "Curazao",            group: "E", flag: "🇨🇼", iso: "cw" },
  { id: "civ", code: "CIV", name: "Costa de Marfil",    group: "E", flag: "🇨🇮", iso: "ci" },
  { id: "ecu", code: "ECU", name: "Ecuador",            group: "E", flag: "🇪🇨", iso: "ec" },

  // Grupo F
  { id: "ned", code: "NED", name: "Países Bajos",       group: "F", flag: "🇳🇱", iso: "nl" },
  { id: "jpn", code: "JPN", name: "Japón",              group: "F", flag: "🇯🇵", iso: "jp" },
  { id: "swe", code: "SWE", name: "Suecia",             group: "F", flag: "🇸🇪", iso: "se" },
  { id: "tun", code: "TUN", name: "Túnez",              group: "F", flag: "🇹🇳", iso: "tn" },

  // Grupo G
  { id: "bel", code: "BEL", name: "Bélgica",            group: "G", flag: "🇧🇪", iso: "be" },
  { id: "egy", code: "EGY", name: "Egipto",             group: "G", flag: "🇪🇬", iso: "eg" },
  { id: "irn", code: "IRN", name: "Irán",               group: "G", flag: "🇮🇷", iso: "ir" },
  { id: "nzl", code: "NZL", name: "Nueva Zelanda",      group: "G", flag: "🇳🇿", iso: "nz" },

  // Grupo H
  { id: "esp", code: "ESP", name: "España",             group: "H", flag: "🇪🇸", iso: "es" },
  { id: "cpv", code: "CPV", name: "Cabo Verde",         group: "H", flag: "🇨🇻", iso: "cv" },
  { id: "ksa", code: "KSA", name: "Arabia Saudí",       group: "H", flag: "🇸🇦", iso: "sa" },
  { id: "uru", code: "URU", name: "Uruguay",            group: "H", flag: "🇺🇾", iso: "uy" },

  // Grupo I
  { id: "fra", code: "FRA", name: "Francia",            group: "I", flag: "🇫🇷", iso: "fr" },
  { id: "sen", code: "SEN", name: "Senegal",            group: "I", flag: "🇸🇳", iso: "sn" },
  { id: "irq", code: "IRQ", name: "Irak",               group: "I", flag: "🇮🇶", iso: "iq" },
  { id: "nor", code: "NOR", name: "Noruega",            group: "I", flag: "🇳🇴", iso: "no" },

  // Grupo J
  { id: "arg", code: "ARG", name: "Argentina",          group: "J", flag: "🇦🇷", iso: "ar" },
  { id: "alg", code: "ALG", name: "Argelia",            group: "J", flag: "🇩🇿", iso: "dz" },
  { id: "aut", code: "AUT", name: "Austria",            group: "J", flag: "🇦🇹", iso: "at" },
  { id: "jor", code: "JOR", name: "Jordania",           group: "J", flag: "🇯🇴", iso: "jo" },

  // Grupo K
  { id: "por", code: "POR", name: "Portugal",           group: "K", flag: "🇵🇹", iso: "pt" },
  { id: "cod", code: "COD", name: "RD Congo",           group: "K", flag: "🇨🇩", iso: "cd" },
  { id: "uzb", code: "UZB", name: "Uzbekistán",         group: "K", flag: "🇺🇿", iso: "uz" },
  { id: "col", code: "COL", name: "Colombia",           group: "K", flag: "🇨🇴", iso: "co" },

  // Grupo L
  { id: "eng", code: "ENG", name: "Inglaterra",         group: "L", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", iso: "gb-eng" },
  { id: "cro", code: "CRO", name: "Croacia",            group: "L", flag: "🇭🇷", iso: "hr" },
  { id: "gha", code: "GHA", name: "Ghana",              group: "L", flag: "🇬🇭", iso: "gh" },
  { id: "pan", code: "PAN", name: "Panamá",             group: "L", flag: "🇵🇦", iso: "pa" },
];

export const getTeam = (id: string): Team | undefined =>
  TEAMS.find((t) => t.id === id);
