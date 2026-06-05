-- 1) Administrador de la app: introduce/corrige resultados oficiales globales.
alter table profiles add column if not exists is_admin boolean not null default false;

-- 2) Aplicación ATÓMICA de un resultado oficial + recálculo de puntos.
--    Recibe los puntos ya calculados por el motor (TS) en `p_points` para no
--    duplicar la lógica de puntuación en SQL. Une marcador + puntos en una sola
--    transacción: el ranking nunca queda a medias.
--    Formato p_points: [{"id":"<uuid prediccion>","points":5}, ...]
create or replace function apply_match_result(
  p_match_number int,
  p_home int,
  p_away int,
  p_points jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update matches
     set home_goals = p_home,
         away_goals = p_away,
         status = 'finished'
   where match_number = p_match_number;

  if not found then
    raise exception 'MATCH_NOT_FOUND';
  end if;

  update predictions pr
     set points_awarded = (j.value->>'points')::int
    from jsonb_array_elements(p_points) as j
   where pr.id = (j.value->>'id')::uuid;
end;
$$;

-- Solo el sistema (service_role) puede ejecutarla; nunca jugadores ni anónimos.
revoke all on function apply_match_result(int,int,int,jsonb) from public;
grant execute on function apply_match_result(int,int,int,jsonb) to service_role;
