import "server-only";

/**
 * Límites anti-fuerza-bruta del login por PIN.
 *
 * Tras varios fallos consecutivos la cuenta se bloquea temporalmente; los
 * contadores viven en `profiles.failed_attempts` / `profiles.locked_until`.
 */
export const MAX_LOGIN_FAILURES = 5;
export const LOGIN_LOCK_MS = 15 * 60 * 1000; // 15 minutos de bloqueo
