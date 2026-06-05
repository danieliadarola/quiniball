"use server";

/**
 * Server Action del override manual de admin: fija/corrige el resultado oficial
 * de un partido. Misma vía que usará la sincronización automática (API-FIFA):
 * ambas delegan en `applyMatchResult`, que recalcula y persiste de forma atómica.
 */
import { revalidatePath } from "next/cache";
import { isCurrentUserAdmin } from "@/lib/admin/auth";
import { applyMatchResult } from "@/lib/results/apply";

export interface ResultState {
  error?: string;
  ok?: boolean;
  updated?: number;
}

export async function saveResult(
  _prev: ResultState,
  formData: FormData,
): Promise<ResultState> {
  if (!(await isCurrentUserAdmin())) {
    return { error: "No tienes permisos de administrador." };
  }

  const matchNumber = Number(formData.get("matchNumber"));
  const home = Number(formData.get("homeGoals"));
  const away = Number(formData.get("awayGoals"));

  if (!Number.isInteger(matchNumber)) return { error: "Partido no válido." };
  if (
    !Number.isInteger(home) || !Number.isInteger(away) ||
    home < 0 || away < 0 || home > 99 || away > 99
  ) {
    return { error: "Marcador no válido (0–99 por equipo)." };
  }

  const res = await applyMatchResult(matchNumber, home, away);
  if (!res.ok) return { error: res.error ?? "No se pudo guardar." };

  revalidatePath("/admin");
  return { ok: true, updated: res.predictionsUpdated };
}
