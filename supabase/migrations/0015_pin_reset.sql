-- =============================================================================
-- Mundial 2026 · Quinielas — 0015: Reset de PIN asistido por el admin
-- =============================================================================
-- No había forma de recuperar un PIN olvidado (login = email + PIN, sin correo).
-- El admin global puede ahora generar un PIN TEMPORAL para un perfil; al entrar
-- con él, la app obliga a la persona a elegir un PIN nuevo.
--
-- `must_reset_pin` marca ese estado: lo pone a true la acción de admin
-- (resetMemberPin) y lo limpia la pantalla obligatoria de cambio de PIN.
-- =============================================================================
alter table profiles
  add column if not exists must_reset_pin boolean not null default false;
