/**
 * Gestión de la sesión del jugador mediante cookie httpOnly.
 *
 * El token (JWT propio, ver lib/auth/jwt.ts) se guarda en una cookie httpOnly
 * para que no sea accesible desde JS del cliente. En el servidor lo leemos para
 * reconstruir la identidad y para crear un cliente Supabase que respete la RLS.
 */
import "server-only";
import { cookies } from "next/headers";
import {
  mintAccessToken,
  verifyAccessToken,
  type SessionClaims,
} from "./jwt";
import { createSupabaseForUser } from "@/lib/supabase/server";
import { SESSION_COOKIE, sessionCookieOptions } from "./cookie";
import type { SupabaseClient } from "@supabase/supabase-js";

const COOKIE_NAME = SESSION_COOKIE;

/** Crea la sesión: firma el token y lo guarda en la cookie. */
export async function startSession(
  profileId: string,
  displayName: string,
  mustResetPin = false,
): Promise<void> {
  const token = await mintAccessToken(profileId, displayName, mustResetPin);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, sessionCookieOptions());
}

/** Cierra la sesión. */
export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/** Devuelve los claims de la sesión actual, o null si no hay/expiró. */
export async function getSession(): Promise<SessionClaims | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

/** Token bruto de la sesión (para pasárselo al cliente Supabase). */
export async function getAccessToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value ?? null;
}

/** Cliente Supabase con la identidad del jugador (respeta RLS), o null. */
export async function getSupabaseForCurrentUser(): Promise<SupabaseClient | null> {
  const token = await getAccessToken();
  return token ? createSupabaseForUser(token) : null;
}
