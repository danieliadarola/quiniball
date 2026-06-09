"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { leaveGroup, deleteOwnedGroup } from "@/app/(app)/grupos/actions";

export interface ManageGroupItem {
  id: string;
  name: string;
  isOwner: boolean;
}

/**
 * Botón "Gestionar" del dashboard: abre una ventana con TODAS tus quinielas y,
 * en cada una, su acción (Eliminar si eres el dueño, Salir si eres miembro),
 * con confirmación. Es una alternativa VISIBLE al gesto de deslizar (que mucha
 * gente no descubre); el deslizar se mantiene tal cual.
 */
export function ManageGroupsButton({ groups }: { groups: ManageGroupItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<ManageGroupItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function closeAll() {
    if (pending) return;
    setConfirming(null);
    setError(null);
    setOpen(false);
  }

  function confirmAction() {
    if (!confirming) return;
    setError(null);
    const target = confirming;
    startTransition(async () => {
      const r = target.isOwner
        ? await deleteOwnedGroup(target.id)
        : await leaveGroup(target.id);
      if (r.error) {
        setError(r.error);
      } else {
        setConfirming(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-line2 bg-surface2 px-3 py-1.5 text-xs font-bold text-fg transition hover:border-primary/60"
      >
        <svg viewBox="0 0 24 24" width="15" height="15" className="qb-stroke" aria-hidden>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Gestionar
      </button>

      {/* Ventana con la lista de quinielas y sus acciones */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 safe-px [--pad-x:1.25rem]"
          onClick={closeAll}
        >
          <div
            className="flex max-h-[80dvh] w-full max-w-sm flex-col rounded-2xl border border-line bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-line px-5 py-4">
              <h3 className="font-display text-lg font-extrabold uppercase tracking-wide text-fg">
                Gestionar quinielas
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                Sal de una quiniela o, si eres el organizador, elimínala.
              </p>
            </div>

            <ul className="flex flex-col gap-2 overflow-y-auto p-4">
              {groups.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface2 px-3.5 py-3"
                >
                  <span className="min-w-0 flex-1 truncate font-bold text-fg">{g.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setConfirming(g);
                    }}
                    className="shrink-0 rounded-lg bg-bad/15 px-3 py-1.5 text-xs font-extrabold text-bad transition hover:bg-bad/25"
                  >
                    {g.isOwner ? "Eliminar" : "Salir"}
                  </button>
                </li>
              ))}
            </ul>

            <div className="border-t border-line px-5 py-4">
              <button
                type="button"
                onClick={closeAll}
                className="w-full rounded-xl border border-line2 bg-surface2 px-4 py-2.5 font-semibold text-fg transition hover:border-primary/60"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación (por encima de la ventana) */}
      {confirming && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-5 safe-px [--pad-x:1.25rem]"
          onClick={() => !pending && setConfirming(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">
              {confirming.isOwner ? "Eliminar quiniela" : "Salir de la quiniela"}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {confirming.isOwner ? (
                <>
                  Vas a eliminar <span className="font-bold text-fg">{confirming.name}</span>. Se
                  borrará para <span className="font-bold text-fg">todos</span> los jugadores y no se
                  puede deshacer.
                </>
              ) : (
                <>
                  Vas a salir de <span className="font-bold text-fg">{confirming.name}</span>. Se
                  borrarán tus pronósticos de esta quiniela.
                </>
              )}
            </p>
            {error && <p className="mt-2 text-sm font-semibold text-bad">{error}</p>}
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirming(null)}
                className="flex-1 rounded-xl border border-line2 bg-surface2 px-4 py-2.5 font-semibold text-fg transition hover:border-primary/60 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirmAction}
                className="flex-1 rounded-xl bg-bad px-4 py-2.5 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {pending ? "…" : confirming.isOwner ? "Eliminar" : "Salir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
