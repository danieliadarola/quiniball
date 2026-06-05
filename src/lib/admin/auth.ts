import "server-only";

/**
 * Autorización de administrador de la app (quien introduce resultados oficiales).
 * El flag vive en `profiles.is_admin`. Se comprueba con service_role para no
 * depender de la RLS al leer el propio perfil.
 */
import { getSession } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export async function isCurrentUserAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", session.sub)
    .maybeSingle();
  return Boolean((data as { is_admin?: boolean } | null)?.is_admin);
}
