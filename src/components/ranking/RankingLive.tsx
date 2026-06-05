"use client";

/**
 * Ranking en vivo. Se suscribe por Realtime a los cambios de `matches` (anon
 * key, tabla pública) y, al detectar un cambio, reconsulta la clasificación con
 * una Server Action (que usa la sesión httpOnly). Así el JWT no sale al cliente.
 */
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { refreshStandings } from "@/app/(app)/grupo/[id]/ranking/actions";
import { RankingTable } from "@/components/ranking/RankingTable";
import type { StandingRow } from "@/lib/standings/fetch";

export function RankingLive({
  groupId,
  currentProfileId,
  initialRows,
}: {
  groupId: string;
  currentProfileId: string;
  initialRows: StandingRow[];
}) {
  const [rows, setRows] = useState<StandingRow[]>(initialRows);
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          timer.current = setTimeout(async () => {
            const fresh = await refreshStandings(groupId);
            setRows(fresh);
          }, 400);
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span
          className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-accent" : "bg-line"}`}
          aria-hidden
        />
        {live ? "En vivo" : "Conectando…"}
      </div>
      <RankingTable rows={rows} currentProfileId={currentProfileId} />
    </div>
  );
}
