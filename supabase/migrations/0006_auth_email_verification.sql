-- =============================================================================
-- Mundial 2026 · Quinielas — 0006: Auth email obligatorio + verificación
-- =============================================================================
-- Cambio de auth (decidido con el usuario, jun-2026):
--   · El email pasa a ser OBLIGATORIO y debe VERIFICARSE con un código de 6
--     dígitos enviado por correo (Resend). Login = email + PIN (4 dígitos).
--   · Mientras el email no esté verificado, el usuario NO tiene sesión (no entra).
--   · Anti-fuerza-bruta en el login (intentos fallidos + bloqueo temporal).
--   · El `display_name` queda como apodo del ranking (puede repetirse).
--
-- Pre-lanzamiento: se BORRAN los datos de prueba para empezar limpio.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Limpieza de datos de prueba (pre-lanzamiento).
--    El borrado de groups arrastra group_members y predictions (on delete
--    cascade); se borran antes explícitamente por claridad.
-- -----------------------------------------------------------------------------
delete from predictions;
delete from group_members;
delete from groups;
delete from profiles;

-- -----------------------------------------------------------------------------
-- 1) profiles: email obligatorio + verificación + anti-fuerza-bruta.
-- -----------------------------------------------------------------------------
alter table profiles
  alter column email set not null,
  add column email_verified boolean    not null default false,
  add column failed_attempts smallint  not null default 0,
  add column locked_until    timestamptz;

-- -----------------------------------------------------------------------------
-- 2) Códigos de verificación de email (1 por perfil; se sobrescribe al reenviar).
--    El código nunca se guarda en claro: se almacena su bcrypt en `code_hash`.
-- -----------------------------------------------------------------------------
create table email_verifications (
  profile_id   uuid primary key references profiles(id) on delete cascade,
  code_hash    text        not null,
  expires_at   timestamptz not null,
  attempts     smallint    not null default 0,
  last_sent_at timestamptz not null default now()
);

-- Solo el servidor (service_role) accede a esta tabla, ANTES de existir sesión.
-- Activamos RLS sin políticas: anon/authenticated quedan denegados; service_role
-- la salta por diseño.
alter table email_verifications enable row level security;
