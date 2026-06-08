-- =============================================================================
-- 0011 · Partido estrella ALEATORIO POR QUINIELA
-- =============================================================================
-- Cambio de regla (decidido con el usuario, jun-2026): el "partido de la jornada"
-- (1X2 + marcador exacto, +5) deja de ser GLOBAL (igual para todos) y pasa a ser
-- ALEATORIO E INDEPENDIENTE EN CADA QUINIELA. Así dos quinielas distintas pueden
-- tener marcador exacto en partidos distintos de la misma jornada.
--
-- Modelo: una fila por (grupo, jornada) con el partido destacado de esa quiniela.
--   · La jornada Final ('F') SIEMPRE destaca la final (mayor nº de partido).
--   · El resto se sortea entre los partidos de la jornada.
--
-- `matchdays.featured_match_number` (destacado global) queda OBSOLETO: la app ya
-- no lo usa. Se conserva la columna por compatibilidad histórica, pero el motor
-- de puntos, el guardado de pronósticos y el calendario leen esta tabla.
-- =============================================================================

create table group_featured_matches (
  group_id     uuid     not null references groups(id) on delete cascade,
  matchday_id  smallint not null references matchdays(id),
  match_number int      not null references matches(match_number),
  primary key (group_id, matchday_id)
);

create index on group_featured_matches (match_number);
create index on group_featured_matches (group_id);

-- RLS: cada miembro de la quiniela puede leer sus destacados. Las inserciones
-- las hace `create_group` (security definer) y el backfill de esta migración.
alter table group_featured_matches enable row level security;
create policy "gfm_read_members" on group_featured_matches
  for select using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_featured_matches.group_id
        and gm.profile_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- Backfill: asigna destacados aleatorios a las quinielas YA existentes.
-- random() se reevalúa por cada (grupo, jornada) → sorteo independiente.
-- -----------------------------------------------------------------------------
insert into group_featured_matches (group_id, matchday_id, match_number)
select g.id, md.id,
  case
    when md.code = 'F'
      then (select max(m.match_number) from matches m where m.matchday_id = md.id)
    else (select m.match_number from matches m where m.matchday_id = md.id order by random() limit 1)
  end
from groups g
cross join matchdays md
on conflict (group_id, matchday_id) do nothing;

-- -----------------------------------------------------------------------------
-- create_group: además de crear el grupo y al dueño, sortea los destacados de
-- esa quiniela (uno por jornada). Misma lógica de azar que el backfill.
-- -----------------------------------------------------------------------------
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

  -- Partido estrella aleatorio por jornada, propio de esta quiniela.
  insert into group_featured_matches (group_id, matchday_id, match_number)
  select g.id, md.id,
    case
      when md.code = 'F'
        then (select max(m.match_number) from matches m where m.matchday_id = md.id)
      else (select m.match_number from matches m where m.matchday_id = md.id order by random() limit 1)
    end
  from matchdays md;

  return g;
end;
$$;
