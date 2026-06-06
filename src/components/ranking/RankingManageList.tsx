"use client";

/**
 * Lista del ranking en MODO GESTIÓN (solo dueño o admin global).
 * Cada participante (salvo el organizador) puede:
 *   · deslizarse a la izquierda para revelar "Eliminar" (atajo táctil), o
 *   · usar los botones de "Hacer líder" / "Eliminar" (clic, sirve en ordenador).
 * Debajo, una tarjeta para eliminar la quiniela confirmando su nombre.
 *
 * Las acciones reales viven en Server Actions; aquí solo se confirma y se
 * refresca el ranking (o se deja que el borrado redirija a /grupos).
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  removeMember,
  transferOwnership,
  deleteGroup,
} from "@/app/(app)/grupo/[id]/actions";
import type { StandingRow } from "@/lib/standings/fetch";

type Pending =
  | { kind: "remove"; row: StandingRow }
  | { kind: "transfer"; row: StandingRow }
  | null;

export function RankingManageList({
  groupId,
  groupName,
  ownerId,
  currentProfileId,
  rows,
  onChanged,
}: {
  groupId: string;
  groupName: string;
  ownerId: string;
  currentProfileId: string;
  rows: StandingRow[];
  /** Recarga el ranking tras una expulsión. */
  onChanged: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  function confirmAction() {
    if (!pending) return;
    setError(null);
    const { kind, row } = pending;
    startBusy(async () => {
      const res =
        kind === "remove"
          ? await removeMember(groupId, row.profileId)
          : await transferOwnership(groupId, row.profileId);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setPending(null);
      if (kind === "remove") await onChanged();
      // La transferencia cambia quién es dueño → recargar datos del servidor.
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-xl bg-surface2 px-4 py-3 text-center text-xs text-muted">
        Desliza una fila para eliminar, o usa los botones. El organizador no se
        puede eliminar.
      </p>

      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <ManageRow
            key={row.profileId}
            row={row}
            isOwnerRow={row.profileId === ownerId}
            isYou={row.profileId === currentProfileId}
            disabled={busy}
            onRemove={() => {
              setError(null);
              setPending({ kind: "remove", row });
            }}
            onTransfer={() => {
              setError(null);
              setPending({ kind: "transfer", row });
            }}
          />
        ))}
      </ul>

      <DeleteGroupCard groupId={groupId} groupName={groupName} />

      {pending && (
        <ConfirmDialog
          title={
            pending.kind === "remove"
              ? `¿Eliminar a ${pending.row.displayName}?`
              : `¿Hacer líder a ${pending.row.displayName}?`
          }
          message={
            pending.kind === "remove"
              ? "Se borrarán sus pronósticos y puntos de esta quiniela. No se puede deshacer."
              : "Pasará a ser el organizador y tú dejarás de serlo. Solo el nuevo líder podrá gestionar la quiniela."
          }
          confirmLabel={pending.kind === "remove" ? "Eliminar" : "Transferir"}
          danger={pending.kind === "remove"}
          busy={busy}
          error={error}
          onCancel={() => {
            setPending(null);
            setError(null);
          }}
          onConfirm={confirmAction}
        />
      )}
    </div>
  );
}

/** Una fila gestionable: deslizable en táctil + botones de acción. */
function ManageRow({
  row,
  isOwnerRow,
  isYou,
  disabled,
  onRemove,
  onTransfer,
}: {
  row: StandingRow;
  isOwnerRow: boolean;
  isYou: boolean;
  disabled: boolean;
  onRemove: () => void;
  onTransfer: () => void;
}) {
  const REVEAL = 88; // ancho del cajón de "Eliminar"
  const [dx, setDx] = useState(0); // desplazamiento actual (px, ≤ 0)
  const startX = useRef<number | null>(null);
  const base = useRef(0); // dx al empezar el gesto

  function onTouchStart(e: React.TouchEvent) {
    if (isOwnerRow) return;
    startX.current = e.touches[0].clientX;
    base.current = dx;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return;
    const delta = e.touches[0].clientX - startX.current;
    setDx(Math.max(-REVEAL, Math.min(0, base.current + delta)));
  }
  function onTouchEnd() {
    if (startX.current === null) return;
    startX.current = null;
    setDx((d) => (d < -REVEAL / 2 ? -REVEAL : 0)); // imán: abierto o cerrado
  }

  return (
    <li className="relative overflow-hidden rounded-2xl">
      {/* Cajón de "Eliminar" que se revela al deslizar */}
      {!isOwnerRow && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setDx(0);
            onRemove();
          }}
          aria-label={`Eliminar a ${row.displayName}`}
          className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center bg-bad font-bold text-white"
        >
          Eliminar
        </button>
      )}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${dx}px)` }}
        className={`relative flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition-transform ${
          isYou ? "border-primary bg-primary/10" : "border-line bg-surface"
        }`}
      >
        <span className="w-6 shrink-0 text-center font-display text-lg font-extrabold text-muted">
          {row.rank}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold">
            {row.displayName}
            {isOwnerRow && (
              <span className="ml-2 align-middle text-xs font-bold text-accent">
                👑 Organizador
              </span>
            )}
            {isYou && !isOwnerRow && (
              <span className="ml-2 text-xs font-bold text-primary">Tú</span>
            )}
          </span>
          <span className="text-[11.5px] font-semibold text-muted">
            {row.totalPoints} pts · {row.outcomeHits} aciertos
          </span>
        </div>

        {!isOwnerRow && (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={onTransfer}
              aria-label={`Hacer líder a ${row.displayName}`}
              title="Hacer líder"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface2 text-base transition hover:border-accent/60 disabled:opacity-50"
            >
              👑
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onRemove}
              aria-label={`Eliminar a ${row.displayName}`}
              title="Eliminar"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-bad/40 bg-bad/10 text-bad transition hover:bg-bad/20 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" className="qb-stroke">
                <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

/** Tarjeta de "zona peligrosa": elimina la quiniela tras reescribir su nombre. */
function DeleteGroupCard({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const matches = name.trim() === groupName;

  function onDelete() {
    if (!matches) return;
    setError(null);
    startBusy(async () => {
      const res = await deleteGroup(groupId, name);
      // Si todo va bien, deleteGroup redirige y no volvemos aquí.
      if (res?.error) setError(res.error);
    });
  }

  return (
    <section className="mt-3 flex flex-col gap-3 rounded-2xl border border-bad/35 bg-bad/[0.06] p-5">
      <div>
        <h3 className="font-display text-base font-extrabold uppercase tracking-wide text-bad">
          Eliminar quiniela
        </h3>
        <p className="mt-1 text-xs text-muted">
          Borra la quiniela y los pronósticos de todos para siempre. No se puede
          deshacer.
        </p>
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="self-start rounded-xl border border-bad/45 bg-bad/10 px-4 py-2.5 text-sm font-bold text-bad transition hover:bg-bad/20"
        >
          Eliminar esta quiniela
        </button>
      ) : (
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-semibold text-muted">
            Escribe <span className="font-bold text-fg">{groupName}</span> para
            confirmar:
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={groupName}
            autoComplete="off"
            className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg outline-none focus:border-bad"
          />
          {error && <p className="text-xs font-semibold text-bad">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setName("");
                setError(null);
              }}
              disabled={busy}
              className="flex-1 rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm font-semibold text-fg transition hover:border-line2 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={!matches || busy}
              className="flex-1 rounded-xl bg-bad px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {busy ? "Eliminando…" : "Eliminar definitivamente"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Diálogo modal de confirmación reutilizable. */
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-extrabold text-fg">{title}</h3>
        <p className="mt-2 text-sm text-muted">{message}</p>
        {error && <p className="mt-3 text-xs font-semibold text-bad">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm font-semibold text-fg transition hover:border-line2 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-50 ${
              danger ? "bg-bad hover:opacity-90" : "bg-primary hover:bg-primary-strong"
            }`}
          >
            {busy ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
