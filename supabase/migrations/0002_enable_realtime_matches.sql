-- Ranking en vivo: el front se suscribe a los cambios de `matches` (entrada de
-- resultados por el organizador) para refrescar la clasificación sin recargar.
-- La RLS de `matches` es de lectura pública, así que la suscripción funciona con
-- la anon key (no hace falta exponer el JWT del jugador al cliente).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table matches;
  end if;
end $$;
