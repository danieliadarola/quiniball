"use server";

/**
 * Server Action de perfil: cambiar el nombre de usuario (display_name).
 *
 * Regla de unicidad (decidida con el usuario): el nombre debe ser único DENTRO
 * de cada quiniela. Puede repetirse en el mundo, pero no puede chocar con otro
 * miembro de alguna de tus quinielas (evita dos "Dani" en el mismo ranking).
 *
 * Tras cambiarlo, se vuelve a acuñar la cookie de sesión para que el JWT (y la
 * cabecera) reflejen el nombre nuevo sin tener que volver a entrar.
 */
import { revalidatePath } from "next/cache";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getSession, startSession } from "@/lib/auth/session";

export interface ProfileState {
  error?: string;
  ok?: boolean;
}

export async function updateDisplayName(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const name = String(formData.get("display_name") ?? "").trim();
  if (name.length < 2 || name.length > 40) {
    return { error: "El nombre debe tener entre 2 y 40 caracteres." };
  }

  const session = await getSession();
  if (!session) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const admin = createSupabaseAdmin();

  try {
    // Si el nombre no cambia (salvo mayúsculas), no validamos contra otros.
    const currentName = (session.display_name ?? "").trim().toLowerCase();
    if (name.toLowerCase() !== currentName) {
      // 1) Mis quinielas.
      const { data: myGroups } = (await admin
        .from("group_members")
        .select("group_id")
        .eq("profile_id", session.sub)) as { data: { group_id: string }[] | null };
      const groupIds = (myGroups ?? []).map((g) => g.group_id);

      if (groupIds.length > 0) {
        // 2) Co-miembros de esas quinielas.
        const { data: coMembers } = (await admin
          .from("group_members")
          .select("profile_id")
          .in("group_id", groupIds)
          .neq("profile_id", session.sub)) as { data: { profile_id: string }[] | null };
        const ids = [...new Set((coMembers ?? []).map((m) => m.profile_id))];

        // 3) ¿Alguno usa ya ese nombre?
        if (ids.length > 0) {
          const { data: others } = (await admin
            .from("profiles")
            .select("display_name")
            .in("id", ids)) as { data: { display_name: string }[] | null };
          const taken = (others ?? []).some(
            (p) => p.display_name.trim().toLowerCase() === name.toLowerCase(),
          );
          if (taken) {
            return { error: "Ya hay alguien con ese nombre en una de tus quinielas." };
          }
        }
      }
    }

    const { error } = await admin
      .from("profiles")
      .update({ display_name: name })
      .eq("id", session.sub);
    if (error) return { error: "No se pudo actualizar el nombre. Inténtalo de nuevo." };

    // Refresca la sesión con el nombre nuevo (cookie + JWT).
    await startSession(session.sub, name);
    revalidatePath("/grupos");
    revalidatePath("/perfil");
    return { ok: true };
  } catch {
    return { error: "Error inesperado al actualizar el nombre." };
  }
}
