-- =============================================================================
-- Mundial 2026 · Quinielas — 0016: Avatares de perfil (DiceBear)
-- =============================================================================
-- Cada perfil puede tener un avatar generado: guardamos solo el ESTILO y la
-- SEMILLA (dos textos cortos); el SVG se genera en el servidor (ruta
-- /api/avatar) sin fotos ni almacenamiento. Si están a null, la UI muestra la
-- inicial sobre un círculo de color.
--
-- La vista `standings` expone también el avatar para pintarlo en el ranking
-- (y en gestión) sin consultas extra. Se recrea con la definición REAL de
-- producción (sin extras) + las dos columnas nuevas al final.
-- =============================================================================
alter table profiles add column if not exists avatar_style text;
alter table profiles add column if not exists avatar_seed  text;

create or replace view standings as
with pred_pts as (
  select
    gm.group_id,
    gm.profile_id,
    coalesce(sum(pr.points_awarded), 0::bigint) as total_points,
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
                when pr.pred_home_goals > pr.pred_away_goals then '1'::text
                when pr.pred_home_goals = pr.pred_away_goals then 'X'::text
                when pr.pred_home_goals < pr.pred_away_goals then '2'::text
                else null::text
              end::bpchar
            ) = m.result_outcome
    ) as outcome_hits
  from group_members gm
    left join predictions pr on pr.group_id = gm.group_id and pr.profile_id = gm.profile_id
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
    order by pp.total_points desc, pp.exact_hits desc, pp.outcome_hits desc, p.display_name
  ) as rank,
  p.avatar_style,
  p.avatar_seed
from pred_pts pp
  join profiles p on p.id = pp.profile_id;
