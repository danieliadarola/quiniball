-- =============================================================================
-- Mundial 2026 · Quinielas — 0022: Reconocimiento al CAMPEÓN de cada quiniela
-- =============================================================================
-- Al TERMINAR el Mundial, cada quiniela corona a su ganador. La vista `standings`
-- expone `is_champion` para que la UI pinte el trofeo/banner/modal sin lógica
-- extra ni consultas nuevas.
--
-- Reglas (decididas con el usuario, jul-2026):
--   · El torneo se considera terminado cuando la GRAN FINAL (partido #104) está
--     'finished'.
--   · Campeón = quien tiene el MÁXIMO de puntos del grupo. En caso de EMPATE a
--     puntos, TODOS los empatados son co-campeones (a diferencia del `rank`, que
--     desempata por exactos/aciertos/nombre para ordenar la tabla).
--   · Un grupo sin puntos (todos a 0) no corona a nadie.
--
-- Se recrea la vista con la MISMA definición de producción (0016) + `security_
-- invoker` (0017, imprescindible: sin él la vista salta la RLS) + la columna
-- `is_champion` al final.
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
  (
    t.is_over
    and pp.total_points > 0
    and pp.total_points = max(pp.total_points) over (partition by pp.group_id)
  ) as is_champion
from pred_pts pp
  join profiles p on p.id = pp.profile_id
  cross join tournament t;
