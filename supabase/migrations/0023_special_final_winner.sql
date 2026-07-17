-- =============================================================================
-- Mundial 2026 · Quinielas — 0023: Regla ESPECIAL de campeón (one-off)
-- =============================================================================
-- Regla única acordada con el usuario (jul-2026), exclusiva de esta edición:
--   Si el participante RICARDO MAYORALAS clava el MARCADOR EXACTO de la GRAN
--   FINAL (#104), es el GANADOR de su quiniela ("Mundialito PRATS") pase lo que
--   pase con los puntos: campeón ÚNICO, por delante de quien lidere por puntos.
--
-- Se implementa como un override en la vista `standings`: cuando existe ese
-- "ganador especial" en un grupo, `is_champion` es true SOLO para él (y false
-- para el resto de ese grupo). Si no clava la final, se aplica la regla normal
-- (máximo de puntos, co-campeones en empate). Ver [[final-star-and-champion]].
--
-- Perfil fijado a propósito (no es secreto): es un ajuste puntual de esta edición;
-- QuiniBall cambia por completo tras el Mundial. Se recrea la vista manteniendo
-- `security_invoker = true` (imprescindible, 0017).
-- =============================================================================
create or replace view standings
with (security_invoker = true) as
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
),
tournament as (
  -- El Mundial termina cuando la GRAN FINAL (#104) está finalizada.
  select coalesce(bool_or(status = 'finished'), false) as is_over
  from matches
  where match_number = 104
),
special_winner as (
  -- Ganador especial: Ricardo Mayoralas clava el marcador EXACTO de la final.
  select pr.group_id, pr.profile_id
  from predictions pr
    join matches m on m.match_number = 104
  where pr.profile_id = 'b1b85f1b-1121-4c6a-9acf-2f2fd3673a9d'
    and pr.match_number = 104
    and m.status = 'finished'
    and m.result_outcome is not null
    and pr.pred_home_goals = m.home_goals
    and pr.pred_away_goals = m.away_goals
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
  p.avatar_seed,
  case
    -- Grupo con ganador especial: campeón único = ese participante.
    when sw.profile_id is not null then (pp.profile_id = sw.profile_id)
    -- Regla normal: máximo de puntos del grupo (co-campeones si empate).
    else (
      t.is_over
      and pp.total_points > 0
      and pp.total_points = max(pp.total_points) over (partition by pp.group_id)
    )
  end as is_champion
from pred_pts pp
  join profiles p on p.id = pp.profile_id
  cross join tournament t
  left join special_winner sw on sw.group_id = pp.group_id;
