"use server";

/**
 * Server Actions de quinielas: crear y unirse.
 * Usan el cliente Supabase con la identidad del jugador (RLS) y delegan en las
 * RPC atómicas `create_group` / `join_group`.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseForCurrentUser } from "@/lib/auth/session";
import { generateJoinCode, normalizeJoinCode } from "@/lib/groups/code";

export interface GroupActionState {
  error?: string;
}

export async function createGroup(
  _prev: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 3 || name.length > 60) {
    return { error: "El nombre de la quiniela debe tener entre 3 y 60 caracteres." };
  }

  // El modelo de puntos ya no es configurable: toda quiniela juega 1X2 + el
  // partido de la jornada (marcador exacto). No se envían modo/extras.
  const sb = await getSupabaseForCurrentUser();
  if (!sb) redirect("/entrar");

  let groupId: string | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await sb
      .rpc("create_group", {
        p_name: name,
        p_join_code: generateJoinCode(),
      })
      .single();

    if (!error) {
      groupId = (data as { id: string }).id;
      break;
    }
    // 23505 = código de invitación duplicado → reintentar con otro.
    if (error.code === "23505") continue;
    return { error: "No se pudo crear la quiniela. Inténtalo de nuevo." };
  }

  if (!groupId) {
    return { error: "No se pudo generar un código único. Reinténtalo." };
  }

  redirect(`/grupo/${groupId}`);
}

/**
 * Renombra una quiniela. Solo el dueño puede (lo garantiza la RLS
 * `groups_update_owner`); además comprobamos que la actualización tocó la fila
 * para no dar un falso "ok" a quien no es dueño.
 */
export async function renameGroup(
  groupId: string,
  rawName: string,
): Promise<GroupActionState> {
  const name = rawName.trim();
  if (name.length < 3 || name.length > 60) {
    return { error: "El nombre debe tener entre 3 y 60 caracteres." };
  }

  const sb = await getSupabaseForCurrentUser();
  if (!sb) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const { data, error } = await sb
    .from("groups")
    .update({ name })
    .eq("id", groupId)
    .select("id");

  if (error || !data || data.length === 0) {
    return { error: "No se pudo cambiar el nombre (¿eres el creador?)." };
  }

  revalidatePath(`/grupo/${groupId}`);
  return {};
}

export async function joinGroup(
  _prev: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const code = normalizeJoinCode(String(formData.get("code") ?? ""));
  if (code.length < 4) {
    return { error: "Introduce un código de invitación válido." };
  }

  const sb = await getSupabaseForCurrentUser();
  if (!sb) redirect("/entrar");

  const { data, error } = await sb.rpc("join_group", { p_code: code }).single();

  if (error) {
    if (error.message.includes("GROUP_NOT_FOUND")) {
      return { error: "No existe ninguna quiniela con ese código." };
    }
    return { error: "No se pudo unir a la quiniela. Inténtalo de nuevo." };
  }

  redirect(`/grupo/${(data as { id: string }).id}`);
}
