-- Sincronización automática de resultados cada 5 minutos.
--
-- Supabase pg_cron dispara una llamada HTTP (pg_net) a la ruta /api/sync de la
-- app en Vercel, que reutiliza el motor de resultados (applyMatchResult) para
-- mantener calendario, estados, equipos y marcadores al día y recalcular puntos.
--
-- Requisitos antes de que esto funcione de verdad:
--   1. En Vercel, la ruta /api/sync debe ser PÚBLICA (Deployment Protection
--      desactivada o que no cubra producción).
--   2. Variables de entorno en Vercel: FOOTBALLDATA_TOKEN y CRON_SECRET.
--
-- El secreto va incrustado en el comando del job (visible solo para el dueño de
-- la BD). Si se rota, reprograma el job.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Reprogramable: si el job ya existe, lo quitamos antes de recrearlo.
select cron.unschedule('sync-resultados-mundial')
where exists (select 1 from cron.job where jobname = 'sync-resultados-mundial');

-- Cada 5 min durante junio y julio (ventana del torneo).
select cron.schedule(
  'sync-resultados-mundial',
  '*/5 * * 6,7 *',
  $$
  select net.http_post(
    url     := 'https://quiniball-rudami-project-s-projects.vercel.app/api/sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'I-SU02HltlhPtYMBSIaWqNYUUBinQuNr'
    ),
    timeout_milliseconds := 55000
  );
  $$
);
