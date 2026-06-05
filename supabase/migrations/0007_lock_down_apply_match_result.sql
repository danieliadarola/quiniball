-- =============================================================================
-- Mundial 2026 · Quinielas — 0007: Endurecer apply_match_result
-- =============================================================================
-- `apply_match_result` es SECURITY DEFINER y escribe el marcador oficial + los
-- puntos. Solo debe invocarla el SERVIDOR (service_role), nunca un usuario.
-- Por defecto, EXECUTE está concedido a public/anon/authenticated, lo que
-- permitiría a cualquier usuario logueado falsificar resultados vía RPC.
-- Revocamos EXECUTE de todos salvo service_role (que la sigue pudiendo llamar).
-- =============================================================================
revoke execute on function public.apply_match_result(integer, integer, integer, jsonb)
  from public, anon, authenticated;

grant  execute on function public.apply_match_result(integer, integer, integer, jsonb)
  to service_role;
