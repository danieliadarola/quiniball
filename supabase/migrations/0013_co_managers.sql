-- =============================================================================
-- Mundial 2026 · Quinielas — 0013: Co-organizadores y pestaña Gestionar
-- =============================================================================
-- Añade "co-organizadores": miembros con permisos de gestión (expulsar y
-- renombrar) SIN ser el dueño. El reparto de poder queda así:
--   · Dueño / admin global: todo (expulsar, nombrar co-org, transferir, borrar).
--   · Co-organizador (is_manager): expulsar miembros y renombrar la quiniela.
--   · Miembro: jugar, invitar y salir.
-- Acciones estructurales (transferir, eliminar, nombrar co-org) quedan SOLO en
-- manos del dueño/admin para evitar escaladas de privilegios.
-- =============================================================================

-- Flag de co-organizador por miembro.
alter table group_members add column if not exists is_manager boolean not null default false;

-- "Puede gestionar" ahora incluye a los co-organizadores.
create or replace function can_manage_group(g uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select is_group_owner(g)
      or is_app_admin()
      or exists (
        select 1 from group_members
        where group_id = g and profile_id = auth.uid() and is_manager
      );
$$;

-- Nombrar / quitar co-organizador. SOLO el dueño real o el admin global.
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
end;
$$;

-- Renombrar: dueño o co-organizador (RPC para no tocar la RLS owner-only).
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
end;
$$;

-- Transferir liderato: AHORA solo el dueño/admin (antes can_manage_group). El
-- co-organizador NO puede arrebatar la propiedad. Limpia el flag de co-org.
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
    select 1 from group_members
    where group_id = p_group_id and profile_id = p_new_owner
  ) then
    raise exception 'NOT_A_MEMBER';
  end if;

  if p_new_owner = v_owner then return; end if;

  update groups set owner_id = p_new_owner where id = p_group_id;
  update group_members set role = 'owner', is_manager = false
    where group_id = p_group_id and profile_id = p_new_owner;
  update group_members set role = 'member', is_manager = false
    where group_id = p_group_id and profile_id = v_owner;
end;
$$;

-- Eliminar la quiniela: AHORA solo el dueño/admin (antes can_manage_group).
create or replace function delete_group(p_group_id uuid)
  returns void
  language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not (is_group_owner(p_group_id) or is_app_admin()) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  delete from groups where id = p_group_id;  -- cascada: members, predictions
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
end;
$$;

revoke all on function set_member_manager(uuid, uuid, boolean) from public;
revoke all on function rename_group(uuid, text)               from public;
grant execute on function set_member_manager(uuid, uuid, boolean) to authenticated;
grant execute on function rename_group(uuid, text)                to authenticated;
