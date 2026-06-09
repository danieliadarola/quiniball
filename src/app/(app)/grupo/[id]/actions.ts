"use server";

/**
 * Server Actions de GESTIÓN de una quiniela (solo dueño o admin global).
 * Delegan en RPC SECURITY DEFINER (`remove_group_member`,
 * `transfer_group_ownership`, `delete_group`) que validan los permisos en la BD.
 * Aquí traducimos los errores a mensajes claros y revalidamos la vista.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseForCurrentUser } from "@/lib/auth/session";

export interface ManageState {
  error?: string;
  ok?: boolean;
}

/** Traduce los códigos de error que lanzan las RPC a texto para el usuario. */
function mapRpcError(message?: string): string {
  const m = message ?? "";
  if (m.includes("NOT_AUTHORIZED") || m.includes("NOT_AUTHENTICATED")) {
    return "No tienes permisos para gestionar esta quiniela.";
  }
  if (m.includes("CANNOT_REMOVE_OWNER")) {
    return "No puedes eliminar al organizador. Transfiere antes el liderato.";
  }
  if (m.includes("CANNOT_CHANGE_OWNER")) {
    return "El organizador ya tiene todos los permisos.";
  }
  if (m.includes("NOT_A_MEMBER")) return "Ese jugador ya no está en la quiniela.";
  if (m.includes("GROUP_NOT_FOUND")) return "La quiniela ya no existe.";
  return "No se pudo completar la acción. Inténtalo de nuevo.";
}

/** Nombra o retira a un miembro como co-organizador (solo el dueño/admin). */
export async function setManager(
  groupId: string,
  profileId: string,
  value: boolean,
): Promise<ManageState> {
  if (!groupId || !profileId) return { error: "Datos no válidos." };

  const sb = await getSupabaseForCurrentUser();
  if (!sb) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const { error } = await sb.rpc("set_member_manager", {
    p_group_id: groupId,
    p_profile_id: profileId,
    p_value: value,
  });
  if (error) return { error: mapRpcError(error.message) };

  revalidatePath(`/grupo/${groupId}`);
  return { ok: true };
}

/** Expulsa a un jugador (borra su pertenencia y sus pronósticos del grupo). */
export async function removeMember(
  groupId: string,
  profileId: string,
): Promise<ManageState> {
  if (!groupId || !profileId) return { error: "Datos no válidos." };

  const sb = await getSupabaseForCurrentUser();
  if (!sb) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const { error } = await sb.rpc("remove_group_member", {
    p_group_id: groupId,
    p_profile_id: profileId,
  });
  if (error) return { error: mapRpcError(error.message) };

  revalidatePath(`/grupo/${groupId}`);
  return { ok: true };
}

/** Transfiere el liderato de la quiniela a otro miembro. */
export async function transferOwnership(
  groupId: string,
  newOwnerId: string,
): Promise<ManageState> {
  if (!groupId || !newOwnerId) return { error: "Datos no válidos." };

  const sb = await getSupabaseForCurrentUser();
  if (!sb) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const { error } = await sb.rpc("transfer_group_ownership", {
    p_group_id: groupId,
    p_new_owner: newOwnerId,
  });
  if (error) return { error: mapRpcError(error.message) };

  revalidatePath(`/grupo/${groupId}`);
  return { ok: true };
}

/**
 * Elimina la quiniela entera. Pide reescribir el nombre como confirmación
 * (defensa extra; los permisos los valida la BD). Redirige a /grupos al acabar.
 */
export async function deleteGroup(
  groupId: string,
  confirmName: string,
): Promise<ManageState> {
  if (!groupId) return { error: "Datos no válidos." };

  const sb = await getSupabaseForCurrentUser();
  if (!sb) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const { data: group } = (await sb
    .from("groups")
    .select("name")
    .eq("id", groupId)
    .maybeSingle()) as { data: { name: string } | null };
  if (!group) return { error: "La quiniela ya no existe." };
  if (confirmName.trim() !== group.name) {
    return { error: "El nombre no coincide. Escríbelo tal cual para confirmar." };
  }

  const { error } = await sb.rpc("delete_group", { p_group_id: groupId });
  if (error) return { error: mapRpcError(error.message) };

  revalidatePath("/grupos");
  redirect("/grupos");
}
