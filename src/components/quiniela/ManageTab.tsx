"use client";

/**
 * Pestaña "Gestionar" de una quiniela. Reúne TODO lo de gestión, separado del
 * Ranking (que queda solo con puntos):
 *   · Invitar (compartir código) — visible para todos.
 *   · Participantes (solo si puedes gestionar): expulsar, nombrar co-organizador
 *     (solo el dueño) y transferir el liderato (solo el dueño).
 *   · Salir de la quiniela — para miembros y co-organizadores (el dueño no).
 *   · Eliminar la quiniela — solo el dueño (confirmando el nombre).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShareCode } from "@/components/groups/ShareCode";
import { removeMember, transferOwnership, setManager, deleteGroup } from "@/app/(app)/grupo/[id]/actions";
import { leaveGroup } from "@/app/(app)/grupos/actions";
import type { StandingRow } from "@/lib/standings/fetch";

interface Props {
  groupId: string;
  groupName: string;
  joinCode: string;
  inviteUrl: string;
  ownerId: string;
  currentProfileId: string;
  canManage: boolean;
  managerIds: string[];
  members: StandingRow[];
  onChanged: () => void | Promise<void>;
}

type Confirm =
  | { kind: "remove"; row: StandingRow }
  | { kind: "transfer"; row: StandingRow }
  | { kind: "leave" }
  | null;

export function ManageTab({
  groupId,
  groupName,
  joinCode,
  inviteUrl,
  ownerId,
  currentProfileId,
  canManage,
  managerIds,
  members,
  onChanged,
}: Props) {
  const router = useRouter();
  const isOwner = currentProfileId === ownerId;
  const managerSet = new Set(managerIds);

  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  function runConfirm() {
    if (!confirm) return;
    setError(null);
    startBusy(async () => {
      let res: { error?: string } | undefined;
      if (confirm.kind === "remove") res = await removeMember(groupId, confirm.row.profileId);
      else if (confirm.kind === "transfer") res = await transferOwnership(groupId, confirm.row.profileId);
      else if (confirm.kind === "leave") res = await leaveGroup(groupId);

      if (res?.error) {
        setError(res.error);
        return;
      }
      setConfirm(null);
      if (confirm.kind === "leave" || confirm.kind === "transfer") {
        router.push("/grupos");
        router.refresh();
      } else {
        await onChanged();
        router.refresh();
      }
    });
  }

  function toggleManager(row: StandingRow, makeManager: boolean) {
    setError(null);
    startBusy(async () => {
      const res = await setManager(groupId, row.profileId, makeManager);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Invitar */}
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
        <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">Invita a tu gente</h3>
        <ShareCode code={joinCode} url={inviteUrl} />
      </section>

      {/* Participantes (solo gestores) */}
      {canManage && (
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-wide">Participantes</h3>
          <p className="text-xs text-muted">
            {isOwner
              ? "Expulsa, nombra co-organizadores o pasa el liderato a otra persona."
              : "Como co-organizador puedes expulsar jugadores."}
          </p>
          <ul className="flex flex-col gap-2">
            {members.map((row) => {
              const rowIsOwner = row.profileId === ownerId;
              const rowIsManager = managerSet.has(row.profileId);
              const isYou = row.profileId === currentProfileId;
              return (
                <li
                  key={row.profileId}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface2 px-3.5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold text-fg">
                      {row.displayName}
                      {isYou && <span className="ml-2 text-xs font-bold text-primary">Tú</span>}
                    </span>
                    <span className="text-[11.5px] font-bold text-muted">
                      {rowIsOwner ? (
                        <span className="text-accent">👑 Organizador</span>
                      ) : rowIsManager ? (
                        <span className="text-primary">★ Co-organizador</span>
                      ) : (
                        "Jugador"
                      )}
                    </span>
                  </div>

                  {/* Acciones: nunca sobre el dueño ni sobre ti mismo. */}
                  {!rowIsOwner && !isYou && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {isOwner && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleManager(row, !rowIsManager)}
                          title={rowIsManager ? "Quitar co-organizador" : "Hacer co-organizador"}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-extrabold transition disabled:opacity-50 ${
                            rowIsManager
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-line bg-surface text-muted hover:border-primary/60"
                          }`}
                        >
                          {rowIsManager ? "Co-org ✓" : "Co-org"}
                        </button>
                      )}
                      {isOwner && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setError(null);
                            setConfirm({ kind: "transfer", row });
                          }}
                          aria-label={`Hacer líder a ${row.displayName}`}
                          title="Hacer líder"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-base transition hover:border-accent/60 disabled:opacity-50"
                        >
                          👑
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setError(null);
                          setConfirm({ kind: "remove", row });
                        }}
                        aria-label={`Expulsar a ${row.displayName}`}
                        title="Expulsar"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-bad/40 bg-bad/10 text-bad transition hover:bg-bad/20 disabled:opacity-50"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" className="qb-stroke">
                          <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                        </svg>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Salir (miembros y co-organizadores; el dueño no puede) */}
      {!isOwner && (
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
          <div>
            <h3 className="font-display text-base font-extrabold uppercase tracking-wide text-fg">
              Salir de la quiniela
            </h3>
            <p className="mt-1 text-xs text-muted">
              Te darás de baja y se borrarán tus pronósticos de esta quiniela.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              setConfirm({ kind: "leave" });
            }}
            className="self-start rounded-xl border border-bad/45 bg-bad/10 px-4 py-2.5 text-sm font-bold text-bad transition hover:bg-bad/20 disabled:opacity-50"
          >
            Salir de la quiniela
          </button>
        </section>
      )}

      {/* Eliminar (solo el dueño) */}
      {isOwner && <DeleteGroupCard groupId={groupId} groupName={groupName} />}

      {confirm && confirm.kind !== "leave" && (
        <ConfirmDialog
          title={
            confirm.kind === "remove"
              ? `¿Expulsar a ${confirm.row.displayName}?`
              : `¿Hacer líder a ${confirm.row.displayName}?`
          }
          message={
            confirm.kind === "remove"
              ? "Se borrarán sus pronósticos y puntos de esta quiniela. No se puede deshacer."
              : "Pasará a ser el organizador y tú dejarás de serlo. Solo el nuevo líder podrá nombrar co-organizadores, transferir o eliminar."
          }
          confirmLabel={confirm.kind === "remove" ? "Expulsar" : "Transferir"}
          danger={confirm.kind === "remove"}
          busy={busy}
          error={error}
          onCancel={() => {
            setConfirm(null);
            setError(null);
          }}
          onConfirm={runConfirm}
        />
      )}

      {confirm?.kind === "leave" && (
        <ConfirmDialog
          title="¿Salir de la quiniela?"
          message="Se borrarán tus pronósticos de esta quiniela. No se puede deshacer."
          confirmLabel="Salir"
          danger
          busy={busy}
          error={error}
          onCancel={() => {
            setConfirm(null);
            setError(null);
          }}
          onConfirm={runConfirm}
        />
      )}
    </div>
  );
}

/** Tarjeta de "zona peligrosa": elimina la quiniela reescribiendo su nombre. */
function DeleteGroupCard({ groupId, groupName }: { groupId: string; groupName: string }) {
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
      if (res?.error) setError(res.error); // si va bien, redirige a /grupos
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-bad/35 bg-bad/[0.06] p-5">
      <div>
        <h3 className="font-display text-base font-extrabold uppercase tracking-wide text-bad">
          Eliminar quiniela
        </h3>
        <p className="mt-1 text-xs text-muted">
          Borra la quiniela y los pronósticos de todos para siempre. No se puede deshacer.
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
            Escribe <span className="font-bold text-fg">{groupName}</span> para confirmar:
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 safe-px [--pad-x:1rem] sm:items-center"
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
