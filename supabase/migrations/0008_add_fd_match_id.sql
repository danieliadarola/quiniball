-- =============================================================================
-- Vínculo con la fuente de datos externa (football-data.org)
-- =============================================================================
-- Guarda el id del partido en football-data.org para poder resincronizar el
-- calendario y los resultados de forma estable (1:1), sin depender de heurísticas
-- de emparejamiento por equipos/fecha en cada ejecución.
-- =============================================================================

alter table matches
  add column if not exists fd_match_id bigint;

-- Un partido externo se mapea a un único partido local.
create unique index if not exists matches_fd_match_id_key
  on matches (fd_match_id)
  where fd_match_id is not null;

comment on column matches.fd_match_id is
  'id del partido en football-data.org (fuente del calendario y resultados).';
