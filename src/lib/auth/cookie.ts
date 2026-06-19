/**
 * Constantes de la cookie de sesión, COMPARTIDAS entre el servidor
 * (lib/auth/session.ts) y el middleware (que corre en el edge y NO puede
 * importar módulos `server-only`).
 *
 * La sesión es de larga duración a propósito: es una app de temporada y los
 * usuarios se quejaban de tener que iniciar sesión continuamente. El middleware
 * "desliza" la cookie en cada visita (renueva su caducidad), así que mientras se
 * use el dispositivo, la sesión prácticamente no expira.
 */
export const SESSION_COOKIE = "mq_session";

/** Vida de la cookie/token: 400 días (cubre toda la temporada con holgura). */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 400;

/** Opciones comunes de la cookie de sesión (mismas en login y en el sliding). */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
