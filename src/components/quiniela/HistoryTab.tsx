"use client";

/**
 * Pestaña "Historial": feed de actividad de la quiniela (puntos por partido y
 * cambios de gestión), lo más reciente arriba. Datos ya preparados en el
 * servidor (lib/history/fetch). Aquí solo se pinta.
 */
import type { HistoryItem, HistoryKind } from "@/lib/history/fetch";

const ICON: Record<HistoryKind, string> = {
  points: "⚽",
  join: "👋",
  leave: "🚪",
  remove: "❌",
  transfer: "👑",
  manager_add: "★",
  manager_remove: "☆",
  rename: "✏️",
};

function Line({ item, isYou }: { item: HistoryItem; isYou: boolean }) {
  const who = isYou ? "Tú" : item.actor;
  const b = (t?: string) => <span className="font-bold text-fg">{t}</span>;

  switch (item.kind) {
    case "points":
      return (
        <>
          {b(who)} {isYou ? "ganaste" : "ganó"}{" "}
          <span className="font-extrabold text-accent">{item.points} pts</span> · {item.match}
        </>
      );
    case "join":
      return <>{b(who)} se unió a la quiniela</>;
    case "leave":
      return <>{b(who)} salió de la quiniela</>;
    case "remove":
      return <>{b(who)} expulsó a {b(item.target)}</>;
    case "transfer":
      return <>{b(who)} pasó el liderato a {b(item.target)}</>;
    case "manager_add":
      return <>{b(who)} nombró co-organizador a {b(item.target)}</>;
    case "manager_remove":
      return <>{b(who)} quitó co-organizador a {b(item.target)}</>;
    case "rename":
      return <>{b(who)} renombró la quiniela a {b(`«${item.name}»`)}</>;
    default:
      return null;
  }
}

export function HistoryTab({
  items,
  currentProfileId,
}: {
  items: HistoryItem[];
  currentProfileId: string;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
        <p className="text-fg">Aún no hay actividad.</p>
        <p className="mt-1 text-sm text-muted">
          Aquí verás quién gana puntos cada jornada y los cambios de la quiniela.
        </p>
      </section>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const isYou = !!item.actorId && item.actorId === currentProfileId;
        return (
          <li
            key={item.id}
            className={`flex items-start gap-3 rounded-2xl border px-3.5 py-3 ${
              isYou ? "border-primary/40 bg-primary/[0.06]" : "border-line bg-surface"
            }`}
          >
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface2 text-base"
              aria-hidden
            >
              {ICON[item.kind]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] leading-snug text-muted">
                <Line item={item} isYou={isYou} />
              </p>
              <span className="text-[11px] font-semibold text-muted2">{item.when}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
