"use server";

/**
 * Server Actions de quinielas: crear y unirse.
 * Usan el cliente Supabase con la identidad del jugador (RLS) y delegan en las
 * RPC atómicas `create_group` / `join_group`.
 */
import { redirect } from "next/navigation";
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
