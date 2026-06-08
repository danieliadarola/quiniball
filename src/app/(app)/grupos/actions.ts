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

/**
 * Salir de una quiniela por tu cuenta (auto-baja). El dueño NO puede: debe
 * eliminarla o transferir antes el liderato (lo valida la RPC `leave_group`).
 */
export async function leaveGroup(groupId: string): Promise<GroupActionState> {
  if (!groupId) return { error: "Datos no válidos." };

  const sb = await getSupabaseForCurrentUser();
  if (!sb) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const { error } = await sb.rpc("leave_group", { p_group_id: groupId });
  if (error) {
    if (error.message.includes("OWNER_CANNOT_LEAVE")) {
      return { error: "Eres el organizador: elimínala o transfiere el liderato antes de salir." };
    }
    if (error.message.includes("NOT_A_MEMBER")) {
      return { error: "Ya no estás en esta quiniela." };
    }
    return { error: "No se pudo salir de la quiniela. Inténtalo de nuevo." };
  }

  revalidatePath("/grupos");
  return {};
}

/**
 * Elimina una quiniela desde el dashboard (solo dueño/admin; lo valida la RPC
 * `delete_group`). La confirmación se hace en la UI (diálogo), por eso aquí no
 * se pide reescribir el nombre.
 */
export async function deleteOwnedGroup(groupId: string): Promise<GroupActionState> {
  if (!groupId) return { error: "Datos no válidos." };

  const sb = await getSupabaseForCurrentUser();
  if (!sb) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const { error } = await sb.rpc("delete_group", { p_group_id: groupId });
  if (error) {
    if (error.message.includes("NOT_AUTHORIZED")) {
      return { error: "Solo el organizador puede eliminar la quiniela." };
    }
    return { error: "No se pudo eliminar la quiniela. Inténtalo de nuevo." };
  }

  revalidatePath("/grupos");
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
