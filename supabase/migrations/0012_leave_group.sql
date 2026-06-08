-- =============================================================================
-- 0012 · Salir de una quiniela por tu cuenta (auto-baja)
-- =============================================================================
-- Hasta ahora solo el dueño/admin podía expulsar (remove_group_member). Falta
-- que un MIEMBRO normal pueda salirse él mismo. Va por RPC SECURITY DEFINER
-- porque borrar pronósticos requiere privilegios (predictions no tiene DELETE
-- para el jugador) y la baja debe ser atómica.
--
-- Regla (decidida con el usuario): el DUEÑO no puede salir; debe eliminar la
-- quiniela o transferir el liderato antes. Así no quedan quinielas huérfanas.
-- =============================================================================

create or replace function leave_group(p_group_id uuid)
  returns void
  language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select owner_id into v_owner from groups where id = p_group_id;
  if v_owner is null then
    raise exception 'GROUP_NOT_FOUND';
  end if;
  if v_owner = auth.uid() then
    raise exception 'OWNER_CANNOT_LEAVE';
  end if;

  -- Borra sus pronósticos del grupo y luego su pertenencia.
  delete from predictions where group_id = p_group_id and profile_id = auth.uid();

  delete from group_members where group_id = p_group_id and profile_id = auth.uid();
  if not found then
    raise exception 'NOT_A_MEMBER';
  end if;
end;
$$;

revoke all on function leave_group(uuid) from public;
grant execute on function leave_group(uuid) to authenticated;
