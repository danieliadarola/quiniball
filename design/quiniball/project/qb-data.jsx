// qb-data.jsx — datos de ejemplo para el prototipo QuiniBall
// Banderas reales vía flagcdn (SVG). Equipos y resultados ficticios.

const FLAG = (code) => `https://flagcdn.com/${code}.svg`;

// ─── Partidos de la Jornada 1 ───────────────────────────────
// status: 'finished' (ya jugado) | 'open' (puedes pronosticar) | 'soon' (próx.)
// result: '1' | 'X' | '2'  (solo si finished)
// star: true → además de 1X2 se pronostica marcador exacto (6 pts)
const J1_MATCHES = [
  {
    id: 'm1', star: true,
    home: { name: 'México', code: 'mx' },
    away: { name: 'Canadá', code: 'ca' },
    group: 'Grupo A', time: 'Hoy · 19:00', venue: 'Estadio Azteca',
    status: 'open',
  },
  {
    id: 'm2',
    home: { name: 'Argentina', code: 'ar' },
    away: { name: 'Brasil', code: 'br' },
    group: 'Grupo C', time: 'Hoy · 22:00', venue: 'MetLife Stadium',
    status: 'open',
  },
  {
    id: 'm3',
    home: { name: 'España', code: 'es' },
    away: { name: 'Alemania', code: 'de' },
    group: 'Grupo E', time: 'Mañana · 16:00', venue: 'SoFi Stadium',
    status: 'open',
  },
  {
    id: 'm4',
    home: { name: 'Francia', code: 'fr' },
    away: { name: 'Inglaterra', code: 'gb-eng' },
    group: 'Grupo D', time: 'Mañana · 19:00', venue: 'AT&T Stadium',
    status: 'open',
  },
  {
    id: 'm5',
    home: { name: 'Portugal', code: 'pt' },
    away: { name: 'Países Bajos', code: 'nl' },
    group: 'Grupo F', time: 'Vie 12 · 13:00', venue: 'Lumen Field',
    status: 'finished', result: '1', score: [2, 1],
  },
  {
    id: 'm6',
    home: { name: 'Japón', code: 'jp' },
    away: { name: 'Corea del Sur', code: 'kr' },
    group: 'Grupo B', time: 'Vie 12 · 16:00', venue: 'BMO Field',
    status: 'finished', result: 'X', score: [1, 1],
  },
];

const JORNADAS = [
  { id: 1, label: 'Jornada 1', dateLabel: 'Jueves, 11 de junio', color: '#2563eb', accent: '#22c55e', matches: J1_MATCHES, countdown: 'En juego' },
  { id: 2, label: 'Jornada 2', dateLabel: 'Domingo, 14 de junio', color: '#f97316', accent: '#8b5cf6', matches: [], countdown: 'Quedan 3 días', locked: true },
  { id: 3, label: 'Jornada 3', dateLabel: 'Miércoles, 17 de junio', color: '#8b5cf6', accent: '#14b8a6', matches: [], countdown: 'Quedan 6 días', locked: true },
];

// ─── Quinielas en las que participo ─────────────────────────
const MY_QUINIELAS = [
  {
    id: 'q1', name: 'La Oficina FC', code: 'OFI-2026',
    color: '#2563eb', accent: '#22c55e',
    members: 14, myPoints: 39, myRank: 2, totalRanks: 14,
    next: 'México vs Canadá', nextTime: 'Hoy · 19:00', pending: 2,
  },
  {
    id: 'q2', name: 'Familia Mundialista', code: 'FAM-7788',
    color: '#f97316', accent: '#ef4444',
    members: 8, myPoints: 27, myRank: 5, totalRanks: 8,
    next: 'Argentina vs Brasil', nextTime: 'Hoy · 22:00', pending: 5,
  },
  {
    id: 'q3', name: 'Los del barrio', code: 'BAR-1130',
    color: '#8b5cf6', accent: '#14b8a6',
    members: 22, myPoints: 51, myRank: 1, totalRanks: 22,
    next: 'España vs Alemania', nextTime: 'Mañana · 16:00', pending: 4,
  },
];

// ─── Ranking de participantes (de una quiniela) ─────────────
const RANKING = [
  { name: 'Diego M.', pts: 48, hits: 14, exact: 3 },
  { name: 'Tú', pts: 39, hits: 11, exact: 2, you: true },
  { name: 'Laura P.', pts: 36, hits: 11, exact: 1 },
  { name: 'Andrés G.', pts: 33, hits: 10, exact: 1 },
  { name: 'Sofía R.', pts: 30, hits: 9, exact: 1 },
  { name: 'Marcos T.', pts: 27, hits: 8, exact: 1 },
  { name: 'Valentina L.', pts: 24, hits: 8, exact: 0 },
  { name: 'Javier S.', pts: 21, hits: 7, exact: 0 },
  { name: 'Camila V.', pts: 18, hits: 6, exact: 0 },
  { name: 'Nicolás B.', pts: 12, hits: 4, exact: 0 },
].sort((a, b) => b.pts - a.pts);

Object.assign(window, { FLAG, JORNADAS, MY_QUINIELAS, RANKING, J1_MATCHES });
