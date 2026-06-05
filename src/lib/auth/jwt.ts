/**
 * Acuñación y verificación del JWT propio de sesión (auth nombre + PIN).
 *
 * Tras verificar el PIN, el servidor firma un JWT con el SECRETO JWT del
 * proyecto Supabase. Al incluir `role: "authenticated"`, `aud: "authenticated"`
 * y `sub = profile.id`, Postgres/Supabase lo acepta y `auth.uid()` devuelve el
 * id del perfil → las políticas RLS funcionan igual que con Supabase Auth.
 *
 * El token se guarda en una cookie httpOnly (ver lib/auth/session.ts, fase auth).
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

function secretKey(): Uint8Array {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("Falta la variable de entorno SUPABASE_JWT_SECRET");
  return new TextEncoder().encode(secret);
}

export interface SessionClaims extends JWTPayload {
  sub: string;          // profile.id
  role: "authenticated";
  display_name?: string;
}

/** Firma un token de sesión para un perfil. */
export async function mintAccessToken(
  profileId: string,
  displayName?: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: "authenticated", display_name: displayName })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(profileId)
    .setAudience("authenticated")
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .sign(secretKey());
}

/** Verifica un token de sesión y devuelve sus claims, o lanza error. */
export async function verifyAccessToken(token: string): Promise<SessionClaims> {
  const { payload } = await jwtVerify(token, secretKey(), {
    audience: "authenticated",
  });
  return payload as SessionClaims;
}
