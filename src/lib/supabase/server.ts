/**
 * Clientes Supabase para el SERVIDOR.
 *
 * - `createSupabaseForUser(accessToken)`: actúa con la identidad del jugador
 *   (nuestro JWT nombre+PIN). Respeta las políticas RLS.
 * - `createSupabaseAdmin()`: usa la service_role key y OMITE RLS. Reservado
 *   para tareas de sistema: recálculo de puntos, sembrado de datos, etc.
 *
 * Las variables de entorno se leen de forma perezosa (dentro de la función)
 * para no exigirlas en tiempo de build.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

/** Cliente con la sesión del jugador → RLS aplicada. */
export function createSupabaseForUser(accessToken: string): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

/** Cliente de sistema (service_role) → omite RLS. Usar con cuidado. */
export function createSupabaseAdmin(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
