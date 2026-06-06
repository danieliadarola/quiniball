"use client";

/**
 * Ranking en vivo. Se suscribe por Realtime a los cambios de `matches` (anon
 * key, tabla pública) y, al detectar un cambio, reconsulta la clasificación con
 * una Server Action (que usa la sesión httpOnly). Así el JWT no sale al cliente.
 *
 * Si el usuario puede gestionar la quiniela (dueño o admin global), muestra un
 * botón "Gestionar" que activa el modo de expulsar/transferir/eliminar.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { refreshStandings } from "@/app/(app)/grupo/[id]/ranking/actions";
import { RankingTable } from "@/components/ranking/RankingTable";
import { RankingManageList } from "@/components/ranking/RankingManageList";
import type { StandingRow } from "@/lib/standings/fetch";

export function RankingLive({
  groupId,
  groupName,
  ownerId,
  canManage,
  currentProfileId,
  initialRows,
}: {
  groupId: string;
  groupName: string;
  ownerId: string;
  canManage: boolean;
  currentProfileId: string;
  initialRows: StandingRow[];
}) {
  const [rows, setRows] = useState<StandingRow[]>(initialRows);
  const [live, setLive] = useState(false);
  const [manage, setManage] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const fresh = await refreshStandings(groupId);
    setRows(fresh);
  }, [groupId]);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const channel = supabase
      .channel(`ranking-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => {
          // Coalesce ráfagas (varios partidos actualizados a la vez).
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            void refresh();
          }, 400);
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [groupId, refresh]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span
            className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-accent" : "bg-line"}`}
            aria-hidden
          />
          {live ? "En vivo" : "Conectando…"}
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setManage((m) => !m)}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-extrabold transition ${
              manage
                ? "border-primary bg-primary text-primary-ink"
                : "border-line bg-surface2 text-fg hover:border-primary/60"
            }`}
          >
            {manage ? "Hecho" : "Gestionar"}
          </button>
        )}
      </div>

      {manage && canManage ? (
        <RankingManageList
          groupId={groupId}
          groupName={groupName}
          ownerId={ownerId}
          currentProfileId={currentProfileId}
          rows={rows}
          onChanged={refresh}
        />
      ) : (
        <RankingTable rows={rows} currentProfileId={currentProfileId} />
      )}
    </div>
  );
}
