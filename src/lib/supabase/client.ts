/**
 * Cliente Supabase para el NAVEGADOR.
 *
 * Se usa sobre todo para suscripciones Realtime (ranking en vivo). Las
 * escrituras pasan por Server Actions, no directamente desde el cliente.
 * Si hay sesión de jugador, se le pasa el accessToken para que Realtime y las
 * lecturas respeten RLS.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseBrowser(accessToken?: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}
