-- =============================================================================
-- Mundial 2026 · Quinielas — 0020: Preferencias de notificaciones (por cuenta)
-- =============================================================================
-- Qué tipos de aviso quiere cada usuario. Es POR CUENTA (perfil), aplica a todos
-- sus dispositivos. La AUSENCIA de fila significa "todo activado" (opt-out), así
-- que no hay que rellenar nada para los usuarios existentes.
-- =============================================================================
create table if not exists push_prefs (
  profile_id  uuid primary key references profiles(id) on delete cascade,
  close       boolean not null default true,  -- recordatorio de cierre de jornada
  result      boolean not null default true,  -- resultado y puntos de tus partidos
  phase       boolean not null default true,  -- inicio de una fase nueva
  rank        boolean not null default true,  -- te han adelantado en el ranking
  updated_at  timestamptz not null default now()
);

alter table push_prefs enable row level security;

drop policy if exists push_prefs_select on push_prefs;
create policy push_prefs_select on push_prefs for select using (profile_id = auth.uid());

drop policy if exists push_prefs_insert on push_prefs;
create policy push_prefs_insert on push_prefs for insert with check (profile_id = auth.uid());

drop policy if exists push_prefs_update on push_prefs;
create policy push_prefs_update on push_prefs for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

revoke all on push_prefs from anon;
grant select, insert, update on push_prefs to authenticated;
grant all on push_prefs to service_role;
