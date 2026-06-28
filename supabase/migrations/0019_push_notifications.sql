-- =============================================================================
-- Mundial 2026 · Quinielas — 0019: Notificaciones Web Push
-- =============================================================================
-- Tres tablas:
--   · push_subscriptions  → suscripciones del navegador/PWA por dispositivo,
--     atadas al perfil. El usuario gestiona las suyas (RLS); el envío usa
--     service_role.
--   · push_notifications_sent → idempotencia del cron de envío: cada aviso se
--     registra con una clave única para no reenviarlo (recordatorios, resultados,
--     inicio de fase…). Solo service_role.
--   · push_rank_state → último puesto notificado por (grupo, jugador), para
--     detectar adelantamientos en el ranking. Solo service_role.
-- =============================================================================

-- 1) Suscripciones ------------------------------------------------------------
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_profile_idx on push_subscriptions(profile_id);

alter table push_subscriptions enable row level security;

drop policy if exists push_sub_select on push_subscriptions;
create policy push_sub_select on push_subscriptions
  for select using (profile_id = auth.uid());

drop policy if exists push_sub_insert on push_subscriptions;
create policy push_sub_insert on push_subscriptions
  for insert with check (profile_id = auth.uid());

drop policy if exists push_sub_delete on push_subscriptions;
create policy push_sub_delete on push_subscriptions
  for delete using (profile_id = auth.uid());

revoke all on push_subscriptions from anon;
grant select, insert, delete on push_subscriptions to authenticated;
grant all on push_subscriptions to service_role;

-- 2) Idempotencia de envíos ---------------------------------------------------
create table if not exists push_notifications_sent (
  dedupe_key  text primary key,
  created_at  timestamptz not null default now()
);
alter table push_notifications_sent enable row level security;
revoke all on push_notifications_sent from anon, authenticated;
grant all on push_notifications_sent to service_role;

-- 3) Último puesto notificado (para "te han adelantado") ----------------------
create table if not exists push_rank_state (
  group_id    uuid not null references groups(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  last_rank   integer not null,
  updated_at  timestamptz not null default now(),
  primary key (group_id, profile_id)
);
alter table push_rank_state enable row level security;
revoke all on push_rank_state from anon, authenticated;
grant all on push_rank_state to service_role;
