-- =============================================================================
-- Mundial 2026 · Quinielas — Esquema inicial
-- =============================================================================
-- Separa DATOS MAESTROS del torneo (compartidos por todos: venues, teams,
-- matches) de los DATOS POR QUINIELA (aislados por grupo: groups, members,
-- predictions, extras).
--
-- Seguridad: RLS activada en todas las tablas de usuario. La autenticación es
-- "nombre + PIN": el servidor verifica el PIN y acuña un JWT con sub = profile.id,
-- de modo que auth.uid() = profiles.id en las políticas de abajo.
-- =============================================================================

create extension if not exists pgcrypto;

-- =============================================================================
-- ENUMS
-- =============================================================================
create type match_phase   as enum ('group','round32','round16','quarter','semi','third','final');
create type match_status  as enum ('scheduled','live','finished');
create type quiniela_mode as enum ('1x2','exacto','mixto');
create type knockout_mode as enum ('bracket','phased');   -- cuadro completo | por fases
create type lock_mode     as enum ('per_match','matchday'); -- cierre por partido | por jornada
create type member_role   as enum ('owner','member');
create type extra_type    as enum (
  'champion','top_scorer','group_qualifier','best_thirds','over_under','ko_bonus'
);

-- =============================================================================
-- DATOS MAESTROS (lectura pública; escritura solo service_role / admin)
-- =============================================================================

create table venues (
  id        text primary key,                 -- slug, p.ej. 'mexico-city-azteca'
  city      text not null,
  stadium   text not null,
  country   text not null check (country in ('USA','MEX','CAN')),
  timezone  text not null                      -- IANA, p.ej. 'America/Mexico_City'
);

create table teams (
  id           text primary key,               -- código FIFA en minúsculas: 'mex'
  code         text not null,                   -- 'MEX'
  name         text not null,
  group_letter char(1) check (group_letter between 'A' and 'L'),
  flag         text not null,
  is_host      boolean not null default false
);

create table matches (
  match_number    int primary key check (match_number between 1 and 104),
  phase           match_phase not null,
  group_letter    char(1) check (group_letter between 'A' and 'L'),
  kickoff_at      timestamptz not null,        -- determina el cierre de predicciones
  venue_id        text not null references venues(id),

  -- En eliminatorias los equipos pueden ser desconocidos: se usan placeholders.
  home_team_id    text references teams(id),
  away_team_id    text references teams(id),
  home_placeholder text,                        -- '1ºA' | 'Ganador 73'
  away_placeholder text,

  status          match_status not null default 'scheduled',
  home_goals      smallint,
  away_goals      smallint,

  -- Resultado 1/X/2 derivado automáticamente del marcador (evita errores).
  result_outcome  char(1) generated always as (
    case
      when home_goals is null or away_goals is null then null
      when home_goals > away_goals then '1'
      when home_goals = away_goals then 'X'
      else '2'
    end
  ) stored,

  updated_at      timestamptz not null default now()
);
create index on matches (kickoff_at);
create index on matches (phase);

-- =============================================================================
-- IDENTIDAD (perfil GLOBAL: un jugador, varias quinielas)
-- =============================================================================
create table profiles (
  id           uuid primary key default gen_random_uuid(),
  display_name text not null,
  email        text unique,                     -- opcional, solo recuperación
  pin_hash     text not null,                   -- bcrypt del PIN de 4 dígitos
  created_at   timestamptz not null default now()
);

-- =============================================================================
-- QUINIELAS (grupos)
-- =============================================================================
create table groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  owner_id      uuid not null references profiles(id) on delete restrict,
  join_code     text not null unique,           -- código corto para enlace/QR/WhatsApp
  mode          quiniela_mode not null default 'mixto',
  knockout_mode knockout_mode not null default 'phased',
  lock_mode     lock_mode     not null default 'per_match',

  -- Sistema de puntos configurable, con valores por defecto sensatos.
  scoring_rules jsonb not null default '{
    "outcome_1x2": 3,
    "exact_score": 5,
    "exact_includes_outcome": true,
    "champion": 15,
    "top_scorer": 10,
    "group_qualifier": 2,
    "best_thirds": 3,
    "over_under": 2,
    "ko_bonus": 4
  }'::jsonb,

  enabled_extras jsonb not null default '[]'::jsonb,  -- ['champion','top_scorer',...]
  created_at     timestamptz not null default now()
);

create table group_members (
  group_id   uuid not null references groups(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role       member_role not null default 'member',
  joined_at  timestamptz not null default now(),
  primary key (group_id, profile_id)
);
create index on group_members (profile_id);

-- =============================================================================
-- PREDICCIONES por partido
-- =============================================================================
create table predictions (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid not null references groups(id) on delete cascade,
  profile_id      uuid not null references profiles(id) on delete cascade,
  match_number    int  not null references matches(match_number),

  pred_home_goals smallint,                     -- usado en exacto/mixto
  pred_away_goals smallint,
  pred_outcome    char(1) check (pred_outcome in ('1','X','2')), -- usado en 1x2

  points_awarded  int,                          -- lo escribe el motor de puntos
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (group_id, profile_id, match_number)
);
create index on predictions (group_id);
create index on predictions (match_number);

-- =============================================================================
-- APUESTAS EXTRA (campeón, pichichi, over/under, clasificados...)
-- Modelo flexible tipo "mercados" para no crear una tabla por cada extra.
-- =============================================================================
create table extra_markets (
  id             uuid primary key default gen_random_uuid(),
  group_id       uuid not null references groups(id) on delete cascade,
  type           extra_type not null,
  ref_id         text,                           -- match_number / group_letter según type
  title          text not null,
  options        jsonb,                          -- opciones posibles (si aplica)
  points         int not null default 0,
  close_at       timestamptz not null,
  resolved_value jsonb,                          -- valor correcto al resolverse
  created_at     timestamptz not null default now()
);
create index on extra_markets (group_id);

create table extra_predictions (
  id             uuid primary key default gen_random_uuid(),
  market_id      uuid not null references extra_markets(id) on delete cascade,
  profile_id     uuid not null references profiles(id) on delete cascade,
  value          jsonb not null,
  points_awarded int,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (market_id, profile_id)
);

-- =============================================================================
-- updated_at automático
-- =============================================================================
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_matches_touch            before update on matches            for each row execute function touch_updated_at();
create trigger trg_predictions_touch        before update on predictions        for each row execute function touch_updated_at();
create trigger trg_extra_predictions_touch  before update on extra_predictions  for each row execute function touch_updated_at();

-- =============================================================================
-- FUNCIONES AUXILIARES (SECURITY DEFINER para evitar recursión en RLS)
-- =============================================================================
create or replace function is_group_member(g uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from group_members
                 where group_id = g and profile_id = auth.uid());
$$;

create or replace function is_group_owner(g uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from groups where id = g and owner_id = auth.uid());
$$;

create or replace function shares_group_with(other uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from group_members a
    join group_members b on a.group_id = b.group_id
    where a.profile_id = auth.uid() and b.profile_id = other
  );
$$;

-- =============================================================================
-- RANKING (vista). El front se suscribe vía Realtime a predictions/matches
-- y consulta esta vista para el leaderboard "en vivo".
-- Desempate FIJO: puntos desc -> marcadores exactos desc -> aciertos 1X2 desc
--                 -> nombre asc.
-- =============================================================================
create view standings as
with pred_pts as (
  select
    gm.group_id,
    gm.profile_id,
    coalesce(sum(pr.points_awarded), 0) as pred_points,
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
),
extra_pts as (
  select em.group_id, ep.profile_id,
         coalesce(sum(ep.points_awarded), 0) as extra_points
  from extra_markets em
  join extra_predictions ep on ep.market_id = em.id
  group by em.group_id, ep.profile_id
)
select
  pp.group_id,
  pp.profile_id,
  p.display_name,
  pp.pred_points + coalesce(ex.extra_points, 0) as total_points,
  pp.exact_hits,
  pp.outcome_hits,
  rank() over (
    partition by pp.group_id
    order by pp.pred_points + coalesce(ex.extra_points, 0) desc,
             pp.exact_hits desc,
             pp.outcome_hits desc,
             p.display_name asc
  ) as rank
from pred_pts pp
join profiles p on p.id = pp.profile_id
left join extra_pts ex
       on ex.group_id = pp.group_id and ex.profile_id = pp.profile_id;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- --- Datos maestros: lectura pública, escritura solo service_role ----------
alter table venues  enable row level security;
alter table teams   enable row level security;
alter table matches enable row level security;
create policy "venues_read"  on venues  for select using (true);
create policy "teams_read"   on teams   for select using (true);
create policy "matches_read" on matches for select using (true);

-- --- profiles --------------------------------------------------------------
alter table profiles enable row level security;
create policy "profiles_read_self_or_comember" on profiles for select
  using (id = auth.uid() or shares_group_with(id));
create policy "profiles_update_self" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- --- groups ----------------------------------------------------------------
alter table groups enable row level security;
create policy "groups_read_members" on groups for select
  using (is_group_member(id));
create policy "groups_insert_self_owner" on groups for insert
  with check (owner_id = auth.uid());
create policy "groups_update_owner" on groups for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "groups_delete_owner" on groups for delete
  using (owner_id = auth.uid());

-- --- group_members ---------------------------------------------------------
alter table group_members enable row level security;
create policy "members_read" on group_members for select
  using (is_group_member(group_id));
-- El alta por código y la gestión de miembros la hace el servidor (service_role);
-- aquí permitimos además que el organizador gestione miembros de su grupo.
create policy "members_manage_owner" on group_members for all
  using (is_group_owner(group_id)) with check (is_group_owner(group_id));

-- --- predictions -----------------------------------------------------------
alter table predictions enable row level security;
-- Ver: las propias siempre; las ajenas SOLO tras el inicio del partido.
create policy "predictions_select" on predictions for select using (
  profile_id = auth.uid()
  or (
    is_group_member(group_id)
    and exists (select 1 from matches m
                where m.match_number = predictions.match_number
                  and m.kickoff_at <= now())
  )
);
-- Crear/editar: solo las propias, siendo miembro y ANTES del inicio.
create policy "predictions_insert" on predictions for insert with check (
  profile_id = auth.uid()
  and is_group_member(group_id)
  and exists (select 1 from matches m
              where m.match_number = predictions.match_number
                and now() < m.kickoff_at)
);
create policy "predictions_update" on predictions for update
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and exists (select 1 from matches m
                where m.match_number = predictions.match_number
                  and now() < m.kickoff_at)
  );

-- --- extra_markets ---------------------------------------------------------
alter table extra_markets enable row level security;
create policy "extra_markets_read" on extra_markets for select
  using (is_group_member(group_id));
create policy "extra_markets_manage_owner" on extra_markets for all
  using (is_group_owner(group_id)) with check (is_group_owner(group_id));

-- --- extra_predictions -----------------------------------------------------
alter table extra_predictions enable row level security;
create policy "extra_predictions_select" on extra_predictions for select using (
  profile_id = auth.uid()
  or exists (select 1 from extra_markets em
             where em.id = extra_predictions.market_id
               and is_group_member(em.group_id)
               and em.close_at <= now())
);
create policy "extra_predictions_insert" on extra_predictions for insert with check (
  profile_id = auth.uid()
  and exists (select 1 from extra_markets em
              where em.id = extra_predictions.market_id
                and is_group_member(em.group_id)
                and now() < em.close_at)
);
create policy "extra_predictions_update" on extra_predictions for update
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and exists (select 1 from extra_markets em
                where em.id = extra_predictions.market_id
                  and now() < em.close_at)
  );
