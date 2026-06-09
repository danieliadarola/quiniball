-- =============================================================================
-- Mundial 2026 · Quinielas — 0014: Historial de acciones (eventos del grupo)
-- =============================================================================
-- Tabla de eventos por quiniela (altas/bajas y cambios de gestión). Los eventos
-- de PUNTOS no se guardan aquí: se calculan al vuelo de predictions + matches.
-- Las RPC SECURITY DEFINER que cambian el estado del grupo insertan su evento.
-- =============================================================================

create table if not exists group_events (
  id         bigint generated always as identity primary key,
  group_id   uuid        not null references groups(id)   on delete cascade,
  type       text        not null,  -- join|leave|remove|transfer|manager_add|manager_remove|rename
  actor_id   uuid        references profiles(id) on delete set null,
  target_id  uuid        references profiles(id) on delete set null,
  meta       jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists group_events_group_time_idx
  on group_events (group_id, created_at desc);

alter table group_events enable row level security;
-- Solo miembros del grupo leen su historial. La escritura va por las RPC
-- (security definer) / service_role; no hay política de INSERT para usuarios.
drop policy if exists ge_read_members on group_events;
create policy ge_read_members on group_events
  for select using (is_group_member(group_id));

-- --- Recrear RPC añadiendo el registro del evento --------------------------

-- Unirse: registra 'join' solo si realmente se insertó (no en re-entradas).
create or replace function join_group(p_code text) returns groups
  language plpgsql security definer set search_path = public as $$
declare g groups;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into g from groups where join_code = upper(p_code);
  if g.id is null then raise exception 'GROUP_NOT_FOUND'; end if;

  insert into group_members (group_id, profile_id, role)
  values (g.id, auth.uid(), 'member')
  on conflict (group_id, profile_id) do nothing;

  if found then
    insert into group_events (group_id, type, actor_id, target_id)
    values (g.id, 'join', auth.uid(), auth.uid());
  end if;

  return g;
end;
$$;

-- Salir: registra 'leave'.
create or replace function leave_group(p_group_id uuid) returns void
  language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select owner_id into v_owner from groups where id = p_group_id;
  if v_owner is null then raise exception 'GROUP_NOT_FOUND'; end if;
  if v_owner = auth.uid() then raise exception 'OWNER_CANNOT_LEAVE'; end if;

  delete from predictions where group_id = p_group_id and profile_id = auth.uid();

  delete from group_members where group_id = p_group_id and profile_id = auth.uid();
  if not found then raise exception 'NOT_A_MEMBER'; end if;

  insert into group_events (group_id, type, actor_id, target_id)
  values (p_group_id, 'leave', auth.uid(), auth.uid());
end;
$$;

-- Expulsar: registra 'remove'.
create or replace function remove_group_member(p_group_id uuid, p_profile_id uuid)
  returns void
  language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not can_manage_group(p_group_id) then raise exception 'NOT_AUTHORIZED'; end if;

  select owner_id into v_owner from groups where id = p_group_id;
  if v_owner is null then raise exception 'GROUP_NOT_FOUND'; end if;
  if p_profile_id = v_owner then raise exception 'CANNOT_REMOVE_OWNER'; end if;

  delete from predictions where group_id = p_group_id and profile_id = p_profile_id;

  delete from group_members where group_id = p_group_id and profile_id = p_profile_id;
  if not found then raise exception 'NOT_A_MEMBER'; end if;

  insert into group_events (group_id, type, actor_id, target_id)
  values (p_group_id, 'remove', auth.uid(), p_profile_id);
end;
$$;

-- Transferir liderato: registra 'transfer' (solo dueño/admin).
create or replace function transfer_group_ownership(p_group_id uuid, p_new_owner uuid)
  returns void
  language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not (is_group_owner(p_group_id) or is_app_admin()) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select owner_id into v_owner from groups where id = p_group_id;
  if v_owner is null then raise exception 'GROUP_NOT_FOUND'; end if;

  if not exists (
    select 1 from group_members where group_id = p_group_id and profile_id = p_new_owner
  ) then
    raise exception 'NOT_A_MEMBER';
  end if;

  if p_new_owner = v_owner then return; end if;

  update groups set owner_id = p_new_owner where id = p_group_id;
  update group_members set role = 'owner', is_manager = false
    where group_id = p_group_id and profile_id = p_new_owner;
  update group_members set role = 'member', is_manager = false
    where group_id = p_group_id and profile_id = v_owner;

  insert into group_events (group_id, type, actor_id, target_id)
  values (p_group_id, 'transfer', auth.uid(), p_new_owner);
end;
$$;

-- Co-organizador: registra 'manager_add' / 'manager_remove' (solo dueño/admin).
create or replace function set_member_manager(
  p_group_id uuid, p_profile_id uuid, p_value boolean
) returns void
  language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not (is_group_owner(p_group_id) or is_app_admin()) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select owner_id into v_owner from groups where id = p_group_id;
  if v_owner is null then raise exception 'GROUP_NOT_FOUND'; end if;
  if p_profile_id = v_owner then raise exception 'CANNOT_CHANGE_OWNER'; end if;

  update group_members set is_manager = p_value
   where group_id = p_group_id and profile_id = p_profile_id;
  if not found then raise exception 'NOT_A_MEMBER'; end if;

  insert into group_events (group_id, type, actor_id, target_id)
  values (p_group_id, case when p_value then 'manager_add' else 'manager_remove' end,
          auth.uid(), p_profile_id);
end;
$$;

-- Renombrar: registra 'rename' con el nombre nuevo (dueño o co-organizador).
create or replace function rename_group(p_group_id uuid, p_name text) returns void
  language plpgsql security definer set search_path = public as $$
declare v_name text := btrim(p_name);
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not can_manage_group(p_group_id) then raise exception 'NOT_AUTHORIZED'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 60 then
    raise exception 'BAD_NAME';
  end if;

  update groups set name = v_name where id = p_group_id;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;

  insert into group_events (group_id, type, actor_id, meta)
  values (p_group_id, 'rename', auth.uid(), jsonb_build_object('name', v_name));
end;
$$;
