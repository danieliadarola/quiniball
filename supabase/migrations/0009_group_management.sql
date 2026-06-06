-- =============================================================================
-- Mundial 2026 · Quinielas — 0009: Gestión de la quiniela por el organizador
-- =============================================================================
-- Da al DUEÑO de cada quiniela (y al admin global de la app) tres acciones:
--   · expulsar a un jugador (borra su pertenencia y sus pronósticos del grupo),
--   · transferir el liderato a otro miembro,
--   · eliminar la quiniela entera (cascada: miembros y pronósticos).
--
-- Todo va por RPC SECURITY DEFINER porque la RLS por sí sola no basta:
--   (a) `predictions` no tiene política de DELETE → nadie salvo el sistema puede
--       borrar pronósticos ajenos.
--   (b) `groups_update_owner` exige (with check owner_id = auth.uid()), así que el
--       dueño NO puede reasignar owner_id a otra persona con un UPDATE normal.
-- La autorización se comprueba DENTRO de cada función (defensa en profundidad).
-- =============================================================================

-- ¿El usuario actual es admin global de la app? (mete resultados oficiales)
create or replace function is_app_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- ¿Puede gestionar este grupo? Dueño del grupo o admin global.
create or replace function can_manage_group(g uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select is_group_owner(g) or is_app_admin();
$$;

-- --- Expulsar a un jugador ---------------------------------------------------
create or replace function remove_group_member(p_group_id uuid, p_profile_id uuid)
  returns void
  language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not can_manage_group(p_group_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select owner_id into v_owner from groups where id = p_group_id;
  if v_owner is null then
    raise exception 'GROUP_NOT_FOUND';
  end if;
  if p_profile_id = v_owner then
    raise exception 'CANNOT_REMOVE_OWNER';
  end if;

  -- Borra primero sus pronósticos del grupo (no hay cascada al quitar el member).
  delete from predictions where group_id = p_group_id and profile_id = p_profile_id;

  delete from group_members where group_id = p_group_id and profile_id = p_profile_id;
  if not found then
    raise exception 'NOT_A_MEMBER';
  end if;
end;
$$;

-- --- Transferir el liderato --------------------------------------------------
create or replace function transfer_group_ownership(p_group_id uuid, p_new_owner uuid)
  returns void
  language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not can_manage_group(p_group_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  select owner_id into v_owner from groups where id = p_group_id;
  if v_owner is null then
    raise exception 'GROUP_NOT_FOUND';
  end if;

  if not exists (
    select 1 from group_members
    where group_id = p_group_id and profile_id = p_new_owner
  ) then
    raise exception 'NOT_A_MEMBER';
  end if;

  if p_new_owner = v_owner then
    return; -- ya es el dueño: nada que hacer
  end if;

  update groups set owner_id = p_new_owner where id = p_group_id;
  update group_members set role = 'owner'
    where group_id = p_group_id and profile_id = p_new_owner;
  update group_members set role = 'member'
    where group_id = p_group_id and profile_id = v_owner;
end;
$$;

-- --- Eliminar la quiniela entera ---------------------------------------------
create or replace function delete_group(p_group_id uuid)
  returns void
  language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not can_manage_group(p_group_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  delete from groups where id = p_group_id;  -- cascada: members, predictions
  if not found then
    raise exception 'GROUP_NOT_FOUND';
  end if;
end;
$$;

-- Solo usuarios autenticados pueden invocarlas; cada una valida permisos dentro.
revoke all on function remove_group_member(uuid, uuid)        from public;
revoke all on function transfer_group_ownership(uuid, uuid)   from public;
revoke all on function delete_group(uuid)                     from public;
grant execute on function remove_group_member(uuid, uuid)      to authenticated;
grant execute on function transfer_group_ownership(uuid, uuid) to authenticated;
grant execute on function delete_group(uuid)                   to authenticated;
