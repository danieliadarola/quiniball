-- =============================================================================
-- Mundial 2026 · Quinielas — 0004: Jornadas + puntuación FIJA
-- =============================================================================
-- Rediseño de lógica (decidido con el usuario, jun-2026): se ABANDONA el modelo
-- configurable por grupo (modos 1x2/exacto/mixto + extras) en favor de un modelo
-- ÚNICO para todas las quinielas:
--   · Todo el torneo se juega 1X2: acierto = 3, fallo = 0.
--   · 1 "partido de la jornada" ALEATORIO y GLOBAL por jornada: además del 1X2,
--     puntúa el marcador EXACTO (+5). Máximo en ese partido = 8.
--
-- Esta migración:
--   1) Crea la entidad `matchdays` (8 jornadas) y la enlaza con `matches`.
--   2) Simplifica `groups` (fuera modo, reglas configurables y extras).
--   3) Elimina las tablas de extras y los enums sin uso.
--   4) Recrea la vista `standings` sin extras.
-- El "partido de la jornada" (featured_match_number) lo siembra, de forma
-- ALEATORIA, el script `scripts/seed-matchdays-featured.mjs` (no la migración,
-- para que el azar sea reproducible/re-rolleable y no quede fijado en el SQL).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) JORNADAS (datos maestros, lectura pública)
-- -----------------------------------------------------------------------------
-- Mapeo cronológico fijo de las 8 jornadas a los rangos de partido FIFA:
--   J1 1–24 · J2 25–48 · J3 49–72  (fase de grupos)
--   R32 73–88 · R16 89–96 · QF 97–100 · SF 101–102 · F 103–104 (3.º + final)
create table matchdays (
  id          smallint primary key,           -- 1..8, orden cronológico
  code        text not null unique,           -- 'J1','J2','J3','R32','R16','QF','SF','F'
  name        text not null,                  -- etiqueta mostrada
  phase       match_phase not null,           -- fase predominante de la jornada
  -- Partido destacado de la jornada (1X2 + marcador exacto). NULL hasta sembrar.
  featured_match_number int references matches(match_number),
  created_at  timestamptz not null default now()
);

insert into matchdays (id, code, name, phase) values
  (1, 'J1',  'Jornada 1',     'group'),
  (2, 'J2',  'Jornada 2',     'group'),
  (3, 'J3',  'Jornada 3',     'group'),
  (4, 'R32', 'Dieciseisavos', 'round32'),
  (5, 'R16', 'Octavos',       'round16'),
  (6, 'QF',  'Cuartos',       'quarter'),
  (7, 'SF',  'Semifinales',   'semi'),
  (8, 'F',   'Final',         'final');   -- incluye 3.º puesto (103) y final (104)

-- -----------------------------------------------------------------------------
-- 2) matches.matchday_id  (cada partido pertenece a una jornada)
-- -----------------------------------------------------------------------------
alter table matches add column matchday_id smallint references matchdays(id);

update matches set matchday_id = case
  when match_number between   1 and  24 then 1
  when match_number between  25 and  48 then 2
  when match_number between  49 and  72 then 3
  when match_number between  73 and  88 then 4
  when match_number between  89 and  96 then 5
  when match_number between  97 and 100 then 6
  when match_number between 101 and 102 then 7
  else 8
end;

alter table matches alter column matchday_id set not null;
create index on matches (matchday_id);

-- -----------------------------------------------------------------------------
-- 3) Simplificar `groups`: el modelo de puntos ya no es configurable.
--    Las constantes (1X2 = 3, exacto = 5) viven en código (src/config/scoring).
-- -----------------------------------------------------------------------------
alter table groups
  drop column if exists mode,
  drop column if exists scoring_rules,
  drop column if exists enabled_extras,
  drop column if exists knockout_mode,
  drop column if exists lock_mode;

-- -----------------------------------------------------------------------------
-- 4) Eliminar extras. La vista `standings` depende de `extra_predictions`,
--    así que se borra primero y se recrea más abajo sin extras.
-- -----------------------------------------------------------------------------
drop view if exists standings;
drop table if exists extra_predictions;
drop table if exists extra_markets;

-- La RPC `create_group` usaba los enums de modo/extras. La sustituimos por una
-- versión simplificada (solo nombre + código) acorde al modelo único.
drop function if exists create_group(text, quiniela_mode, knockout_mode, lock_mode, text, jsonb);

create or replace function create_group(p_name text, p_join_code text)
  returns groups
  language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  insert into groups (name, owner_id, join_code)
  values (p_name, auth.uid(), upper(p_join_code))
  returning * into g;

  insert into group_members (group_id, profile_id, role)
  values (g.id, auth.uid(), 'owner');

  return g;
end;
$$;

-- Enums que quedan sin uso tras quitar columnas, tablas y la RPC antigua.
drop type if exists quiniela_mode;
drop type if exists knockout_mode;
drop type if exists lock_mode;
drop type if exists extra_type;

-- -----------------------------------------------------------------------------
-- 5) Recrear `standings` SIN extras (mismas columnas que consume el front).
--    Los puntos del partido destacado (1X2 + exacto) ya vienen sumados en
--    predictions.points_awarded por el motor TS, así que aquí solo se totaliza.
--    Desempate FIJO: puntos desc -> marcadores exactos -> aciertos 1X2 -> nombre.
-- -----------------------------------------------------------------------------
create view standings
with (security_invoker = true) as
with pred_pts as (
  select
    gm.group_id,
    gm.profile_id,
    coalesce(sum(pr.points_awarded), 0) as total_points,
    count(*) filter (
      where m.result_outcome is not null
        and pr.pred_home_goals = m.home_goals
        and pr.pred_away_goals = m.away_goals
    ) as exact_hits,
    count(*) filter (
      where m.result_outcome is not null
        and coalesce(
              pr.pred_outcome,
              case
                when pr.pred_home_goals > pr.pred_away_goals then '1'
                when pr.pred_home_goals = pr.pred_away_goals then 'X'
                when pr.pred_home_goals < pr.pred_away_goals then '2'
              end
            ) = m.result_outcome
    ) as outcome_hits
  from group_members gm
  left join predictions pr
         on pr.group_id = gm.group_id and pr.profile_id = gm.profile_id
  left join matches m on m.match_number = pr.match_number
  group by gm.group_id, gm.profile_id
)
select
  pp.group_id,
  pp.profile_id,
  p.display_name,
  pp.total_points,
  pp.exact_hits,
  pp.outcome_hits,
  rank() over (
    partition by pp.group_id
    order by pp.total_points desc,
             pp.exact_hits desc,
             pp.outcome_hits desc,
             p.display_name asc
  ) as rank
from pred_pts pp
join profiles p on p.id = pp.profile_id;

-- -----------------------------------------------------------------------------
-- 6) RLS de `matchdays`: lectura pública (datos maestros, como matches/teams).
-- -----------------------------------------------------------------------------
alter table matchdays enable row level security;
create policy "matchdays_read" on matchdays for select using (true);
