import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";

/**
 * Middleware de SESIÓN DESLIZANTE.
 *
 * En cada navegación, si existe la cookie de sesión, se vuelve a escribir con
 * una caducidad fresca. Así, mientras el usuario use el dispositivo, la sesión
 * no expira y no tiene que volver a iniciar sesión (queja recurrente).
 *
 * No verifica el token (eso lo hace getSession en el servidor): solo renueva la
 * ventana de la cookie. Es barato y se ejecuta en el edge.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    res.cookies.set({ name: SESSION_COOKIE, value: token, ...sessionCookieOptions() });
  }
  return res;
}

export const config = {
  // Solo en páginas: se excluyen assets estáticos, imágenes y el avatar generado
  // (no aportan nada al sliding y evitan Set-Cookie innecesarios).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/avatar).*)"],
};
