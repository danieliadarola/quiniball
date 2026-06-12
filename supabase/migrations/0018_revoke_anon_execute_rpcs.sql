-- Hardening: las RPC de gestión/admin tenían EXECUTE para el rol `anon` (sin
-- login) — directo y, en algunas, también vía PUBLIC. Un anónimo con la anon key
-- podía invocarlas por /rest/v1/rpc/*. Casi todas no hacen nada sin sesión
-- (auth.uid() es NULL), pero create_group podría insertar basura, así que se
-- restringen a usuarios autenticados. (Advisor 0028_anon_security_definer_function_executable.)
--
-- La app usa SIEMPRE un JWT con role=authenticated y el admin usa service_role:
-- ambos conservan su grant explícito, así que NADA cambia para la app. Estas
-- funciones NO se usan dentro de políticas RLS (verificado), por lo que revocar
-- a anon/PUBLIC no afecta la evaluación de la RLS.

-- 1) Quitar el grant vía PUBLIC donde existía (si no, anon lo hereda igual).
revoke execute on function public.can_manage_group(uuid) from public;
revoke execute on function public.create_group(text, text) from public;
revoke execute on function public.is_app_admin() from public;

-- 2) Quitar el grant explícito al rol anon en todas las RPC de gestión/admin.
revoke execute on function public.can_manage_group(uuid) from anon;
revoke execute on function public.create_group(text, text) from anon;
revoke execute on function public.delete_group(uuid) from anon;
revoke execute on function public.is_app_admin() from anon;
revoke execute on function public.leave_group(uuid) from anon;
revoke execute on function public.remove_group_member(uuid, uuid) from anon;
revoke execute on function public.rename_group(uuid, text) from anon;
revoke execute on function public.set_member_manager(uuid, uuid, boolean) from anon;
revoke execute on function public.transfer_group_ownership(uuid, uuid) from anon;
