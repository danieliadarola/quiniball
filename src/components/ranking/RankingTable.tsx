import type { StandingRow } from "@/lib/standings/fetch";

const POS_COLOR: Record<number, string> = {
  1: "text-[#f5c542]",
  2: "text-[#cfd3da]",
  3: "text-[#d99058]",
};

/** Lista de clasificación estilo QuiniBall. Resalta la fila del jugador. */
export function RankingTable({
  rows,
  currentProfileId,
}: {
  rows: StandingRow[];
  currentProfileId: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface px-5 py-8 text-center text-sm text-muted">
        Aún no hay participantes con clasificación.
      </p>
    );
  }

  const noPointsYet = rows.every((r) => r.totalPoints === 0);

  return (
    <div className="flex flex-col gap-2">
      {noPointsYet && (
        <p className="rounded-xl bg-surface px-4 py-3 text-center text-xs text-muted">
          La clasificación arrancará en cuanto se registren los primeros resultados.
        </p>
      )}
      {rows.map((row) => {
        const isYou = row.profileId === currentProfileId;
        return (
          <div
            key={row.profileId}
            className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${
              isYou ? "border-primary bg-primary/10" : "border-line bg-surface"
            }`}
          >
            <span className={`w-6 shrink-0 text-center font-display text-lg font-extrabold ${POS_COLOR[row.rank] ?? "text-muted"}`}>
              {row.rank}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${
                  isYou ? "bg-primary text-white" : "bg-surface3 text-fg"
                }`}
              >
                {isYou ? "★" : (row.displayName?.[0] ?? "?").toUpperCase()}
              </span>
              <div className="min-w-0">
                <span className="block truncate text-[15px] font-bold">
                  {row.displayName}
                  {isYou && <span className="ml-2 text-xs font-bold text-primary">Tú</span>}
                </span>
                <span className="text-[11.5px] font-semibold text-muted">
                  {row.outcomeHits} aciertos · {row.exactHits} exactos
                </span>
              </div>
            </div>
            <span className="shrink-0 font-display text-[22px] font-extrabold text-accent">
              {row.totalPoints}
              <small className="ml-0.5 text-[11px] font-bold text-muted">pts</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}
