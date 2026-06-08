"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { leaveGroup, deleteOwnedGroup } from "@/app/(app)/grupos/actions";

const ACTION_W = 104; // ancho del botón que se revela al deslizar

export interface GroupCardProps {
  id: string;
  name: string;
  color: string;
  accent: string;
  rank: number | null;
  members: number;
  points: number;
  pending: number;
  nextLabel: string | null;
  nextTime: string | null;
  isOwner: boolean;
}

/**
 * Fila de quiniela del dashboard, DESLIZABLE: arrastrando a la izquierda
 * (táctil o ratón) se revela una acción a la derecha:
 *   · dueño  -> Eliminar (borra la quiniela para todos)
 *   · miembro -> Salir (auto-baja)
 * Confirmación con diálogo simple. Un toque normal abre la quiniela.
 */
export function GroupCard(props: GroupCardProps) {
  const { id, name, color, accent, rank, members, points, pending, nextLabel, nextTime, isOwner } =
    props;
  const router = useRouter();

  const [tx, setTx] = useState(0); // desplazamiento actual del card
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, startTransition] = useTransition();

  // Estado del gesto (en ref para no re-renderizar en cada move).
  const drag = useRef({ active: false, startX: 0, startY: 0, base: 0, horizontal: false, moved: false });

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, base: tx, horizontal: false, moved: false };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.horizontal) {
      // Aún no decidido: si el gesto es claramente vertical, lo dejamos scrollar.
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        d.active = false;
        return;
      }
      if (Math.abs(dx) > 8) d.horizontal = true;
    }
    if (d.horizontal) {
      d.moved = true;
      const next = Math.max(-ACTION_W, Math.min(0, d.base + dx));
      setTx(next);
    }
  }
  function endDrag() {
    const d = drag.current;
    if (d.active && d.horizontal) {
      setTx(tx <= -ACTION_W / 2 ? -ACTION_W : 0); // engancha abierto o cerrado
    }
    d.active = false;
  }

  function onCardClick() {
    // Si venía de un swipe, no navegamos; si está abierto, lo cerramos.
    if (drag.current.moved) {
      drag.current.moved = false;
      return;
    }
    if (tx !== 0) {
      setTx(0);
      return;
    }
    router.push(`/grupo/${id}`);
  }

  function confirmAction() {
    setError(null);
    startTransition(async () => {
      const r = isOwner ? await deleteOwnedGroup(id) : await leaveGroup(id);
      if (r.error) {
        setError(r.error);
      } else {
        setConfirming(false);
        setTx(0);
        router.refresh();
      }
    });
  }

  return (
    <li className="relative overflow-hidden rounded-2xl">
      {/* Acción revelada detrás (derecha) */}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={isOwner ? "Eliminar quiniela" : "Salir de la quiniela"}
        className="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-1 bg-bad px-4 text-white"
        style={{ width: ACTION_W }}
      >
        {isOwner ? (
          <svg viewBox="0 0 24 24" width="20" height="20" className="qb-stroke" aria-hidden>
            <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" className="qb-stroke" aria-hidden>
            <path d="M15 12H4M11 8l-4 4 4 4M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
          </svg>
        )}
        <span className="text-[11px] font-extrabold">{isOwner ? "Eliminar" : "Salir"}</span>
      </button>

      {/* Card en primer plano (se desliza) */}
      <div
        role="button"
        tabIndex={0}
        onClick={onCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter") router.push(`/grupo/${id}`);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative flex cursor-pointer items-stretch overflow-hidden rounded-2xl border border-line bg-surface transition-[transform] duration-150 active:scale-[0.99]"
        style={{ transform: `translateX(${tx}px)`, touchAction: "pan-y" }}
      >
        {/* Barra de color con bloques */}
        <span className="relative w-2.5 shrink-0" style={{ background: color }}>
          <span className="absolute inset-x-0 top-0 h-[40%]" style={{ background: color }} />
          <span className="absolute inset-x-0 top-[40%] h-[30%]" style={{ background: accent }} />
          <span className="absolute inset-x-0 bottom-0 top-[70%] bg-primary" />
        </span>

        <div className="min-w-0 flex-1 py-3.5 pl-3.5 pr-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[17px] font-extrabold tracking-[0.2px] text-fg">{name}</h3>
            {pending > 0 && (
              <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-extrabold text-primary">
                {pending} pend.
              </span>
            )}
          </div>

          <div className="mt-1.5 flex items-center gap-2 text-[12.5px] font-semibold text-muted">
            <span className="font-display text-base font-extrabold" style={{ color }}>
              #{rank ?? "—"}
              <small className="text-[11px] font-bold text-muted">/{members}</small>
            </span>
            <span className="h-[3px] w-[3px] rounded-full bg-muted2" />
            <span>{members} jugadores</span>
            <span className="h-[3px] w-[3px] rounded-full bg-muted2" />
            <span className="font-extrabold text-accent">{points} pts</span>
          </div>

          {nextLabel && (
            <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-surface2 px-2.5 py-1.5 text-xs font-semibold text-muted">
              <span className="h-[7px] w-[7px] shrink-0 animate-pulse rounded-full bg-primary shadow-[0_0_0_3px_rgba(31,138,91,0.2)]" />
              <span className="min-w-0 truncate">Próximo · {nextLabel}</span>
              <b className="ml-auto shrink-0 whitespace-nowrap font-bold text-fg">{nextTime}</b>
            </div>
          )}
        </div>
        <span className="self-center pr-3 text-muted2" aria-hidden>
          ›
        </span>
      </div>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 safe-px [--pad-x:1.25rem]"
          onClick={() => !pendingAction && setConfirming(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">
              {isOwner ? "Eliminar quiniela" : "Salir de la quiniela"}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {isOwner ? (
                <>
                  Vas a eliminar <span className="font-bold text-fg">{name}</span>. Se borrará para{" "}
                  <span className="font-bold text-fg">todos</span> los jugadores y no se puede deshacer.
                </>
              ) : (
                <>
                  Vas a salir de <span className="font-bold text-fg">{name}</span>. Se borrarán tus
                  pronósticos de esta quiniela.
                </>
              )}
            </p>
            {error && <p className="mt-2 text-sm font-semibold text-bad">{error}</p>}
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                disabled={pendingAction}
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-xl border border-line2 bg-surface2 px-4 py-2.5 font-semibold text-fg transition hover:border-primary/60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pendingAction}
                onClick={confirmAction}
                className="flex-1 rounded-xl bg-bad px-4 py-2.5 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {pendingAction ? "…" : isOwner ? "Eliminar" : "Salir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
