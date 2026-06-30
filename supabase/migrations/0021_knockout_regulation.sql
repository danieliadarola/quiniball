-- =============================================================================
-- Mundial 2026 · Quinielas — 0021: Resultado de eliminatorias por REGLAMENTARIO
-- =============================================================================
-- En eliminatorias el 1X2 (y el bonus de marcador exacto) se puntúa por el
-- resultado a los 90' (tiempo reglamentario). football-data.org devuelve en
-- `fullTime` el marcador con los PENALES sumados (p.ej. 1-1 + 3-4 pen → 3-4),
-- lo que daba ganador a quien no debía. Pasamos a guardar el reglamentario en
-- `home_goals/away_goals` (de ahí cuelga la columna generada `result_outcome`).
--
-- Pero con un empate a 90' el marcador ya no dice QUIÉN se clasificó, así que
-- guardamos aparte al clasificado y la tanda de penales (solo para mostrar).
--   · winner_team_id : equipo que avanza (lo decide la prórroga/penales).
--                      Null en partidos resueltos en los 90' (se deduce del
--                      marcador como hasta ahora).
--   · pen_home/pen_away : tanda de penales, null si no la hubo.
-- =============================================================================
alter table matches
  add column if not exists pen_home       smallint,
  add column if not exists pen_away       smallint,
  add column if not exists winner_team_id text references teams(id);

comment on column matches.winner_team_id is
  'Clasificado tras prórroga/penales; null si se decidió en los 90 (se deduce del marcador).';
comment on column matches.pen_home is 'Penales del local (tanda); null si no hubo penales.';
comment on column matches.pen_away is 'Penales del visitante (tanda); null si no hubo penales.';
