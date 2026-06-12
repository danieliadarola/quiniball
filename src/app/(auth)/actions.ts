"use server";

/**
 * Server Actions de autenticación (email + PIN, sin verificación por email).
 *
 * Flujo (grupo privado/de confianza):
 *  - registerProfile: crea el perfil (email + PIN) e inicia sesión directamente.
 *  - loginWithEmail:  email + PIN, con bloqueo temporal tras varios fallos.
 *  - logout:          cierra la sesión.
 *
 * El acceso a perfiles usa el cliente admin (service_role) porque ocurre ANTES
 * de existir una sesión; el PIN se verifica aquí.
 */
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { startSession, endSession, getSession } from "@/lib/auth/session";
import { hashPin, isValidPin, verifyPin } from "@/lib/auth/pin";
import { LOGIN_LOCK_MS, MAX_LOGIN_FAILURES } from "@/lib/auth/verification";

export interface AuthState {
  error?: string;
  info?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

// ---------------------------------------------------------------------------
export async function registerProfile(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const displayName = field(formData, "display_name");
  const pin = field(formData, "pin");
  const email = field(formData, "email").toLowerCase();

  if (displayName.length < 2 || displayName.length > 40) {
    return { error: "El nombre debe tener entre 2 y 40 caracteres." };
  }
  if (!isValidPin(pin)) {
    return { error: "El PIN debe ser exactamente 4 dígitos." };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { error: "Introduce un email válido." };
  }

  let redirectTo: string | null = null;
  try {
    const admin = createSupabaseAdmin();
    const pin_hash = await hashPin(pin);

    const { data, error } = await admin
      .from("profiles")
      .insert({ display_name: displayName, email, pin_hash, email_verified: true })
      .select("id")
      .single();

    if (error) {
      // 23505 = email ya registrado.
      if (error.code === "23505") {
        return { error: "Ya existe una cuenta con ese email. Entra con tu PIN." };
      }
      return { error: "No se pudo crear el perfil. Inténtalo de nuevo." };
    }

    await startSession(data.id, displayName);
    redirectTo = "/grupos";
  } catch {
    return { error: "Error inesperado al crear el perfil." };
  }

  if (redirectTo) redirect(redirectTo);
  return {};
}

// ---------------------------------------------------------------------------
export async function loginWithEmail(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = field(formData, "email").toLowerCase();
  const pin = field(formData, "pin");

  if (!EMAIL_REGEX.test(email) || !isValidPin(pin)) {
    return { error: "Email o PIN incorrectos." };
  }

  let redirectTo: string | null = null;
  try {
    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, display_name, pin_hash, failed_attempts, locked_until, must_reset_pin")
      .eq("email", email)
      .maybeSingle();

    // Mensaje genérico para no revelar qué emails existen.
    if (!profile) return { error: "Email o PIN incorrectos." };

    if (profile.locked_until && Date.parse(profile.locked_until) > Date.now()) {
      return { error: "Cuenta bloqueada temporalmente por seguridad. Inténtalo en unos minutos." };
    }

    const pinOk = await verifyPin(pin, profile.pin_hash);
    if (!pinOk) {
      const failed = profile.failed_attempts + 1;
      const lock = failed >= MAX_LOGIN_FAILURES;
      await admin
        .from("profiles")
        .update({
          failed_attempts: lock ? 0 : failed,
          locked_until: lock ? new Date(Date.now() + LOGIN_LOCK_MS).toISOString() : null,
        })
        .eq("id", profile.id);
      return {
        error: lock
          ? "Demasiados intentos. Cuenta bloqueada 15 minutos."
          : "Email o PIN incorrectos.",
      };
    }

    // PIN correcto: limpia el contador de fallos e inicia sesión.
    await admin
      .from("profiles")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("id", profile.id);

    // Si entró con un PIN temporal (reseteado por el admin), la sesión queda
    // marcada y se le lleva a la pantalla OBLIGATORIA de cambio de PIN.
    const mustReset = Boolean(profile.must_reset_pin);
    await startSession(profile.id, profile.display_name, mustReset);
    redirectTo = mustReset ? "/cambiar-pin" : "/grupos";
  } catch {
    return { error: "Error inesperado al entrar." };
  }

  if (redirectTo) redirect(redirectTo);
  return {};
}

// ---------------------------------------------------------------------------
/**
 * Cambio OBLIGATORIO de PIN tras un reset del admin. Requiere sesión marcada
 * con `mrp`; fija el nuevo PIN, limpia el flag y re-emite el token sin la marca.
 */
export async function setNewPinForced(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const session = await getSession();
  if (!session) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const pin = field(formData, "pin");
  const pin2 = field(formData, "pin2");
  if (!isValidPin(pin)) return { error: "El PIN debe ser exactamente 4 dígitos." };
  if (pin !== pin2) return { error: "Los dos PIN no coinciden." };

  let redirectTo: string | null = null;
  try {
    const admin = createSupabaseAdmin();
    const pin_hash = await hashPin(pin);
    const { error } = await admin
      .from("profiles")
      .update({ pin_hash, must_reset_pin: false, failed_attempts: 0, locked_until: null })
      .eq("id", session.sub);
    if (error) return { error: "No se pudo guardar el PIN. Inténtalo de nuevo." };

    // Re-emite la sesión sin la marca `mrp` para liberar el resto de la app.
    await startSession(session.sub, session.display_name ?? "", false);
    redirectTo = "/grupos";
  } catch {
    return { error: "Error inesperado al cambiar el PIN." };
  }

  if (redirectTo) redirect(redirectTo);
  return {};
}

// ---------------------------------------------------------------------------
export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}
