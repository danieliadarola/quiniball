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
import { resetMemberPin } from "@/app/(app)/grupo/[id]/admin-actions";
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
  /** ¿El usuario actual es miembro de esta quiniela? (false en modo admin-ajeno). */
  isMember: boolean;
  /** ¿Es admin global de la app? Habilita acciones estructurales sin ser dueño. */
  isAppAdmin: boolean;
  onChanged: () => void | Promise<void>;
}

type Confirm =
  | { kind: "remove"; row: StandingRow }
  | { kind: "transfer"; row: StandingRow }
  | { kind: "resetpin"; row: StandingRow }
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
  isMember,
  isAppAdmin,
  onChanged,
}: Props) {
  const router = useRouter();
  const isOwner = currentProfileId === ownerId;
  // Acciones estructurales (co-organizador, transferir, eliminar): el dueño real
  // o el admin global. El admin global puede gestionar cualquier quiniela aunque
  // no sea miembro (las RPC ya lo autorizan vía is_app_admin).
  const canStructural = isOwner || isAppAdmin;
  const managerSet = new Set(managerIds);

  const [confirm, setConfirm] = useState<Confirm>(null);
  const [error, setError] = useState<string | null>(null);
  const [pinResult, setPinResult] = useState<{ name: string; pin: string } | null>(null);
  const [busy, startBusy] = useTransition();

  function runConfirm() {
    if (!confirm) return;
    setError(null);
    startBusy(async () => {
      // Reset de PIN: devuelve un PIN temporal que se muestra al admin.
      if (confirm.kind === "resetpin") {
        const r = await resetMemberPin(confirm.row.profileId);
        if (r.error) {
          setError(r.error);
          return;
        }
        setConfirm(null);
        setPinResult({ name: r.playerName ?? confirm.row.displayName, pin: r.tempPin ?? "" });
        return;
      }

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

                  {/* Reset de PIN: SOLO el admin global, sobre cualquiera menos
                      sobre sí mismo (incluido el dueño, por si lo olvida). */}
                  {isAppAdmin && !isYou && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setError(null);
                        setConfirm({ kind: "resetpin", row });
                      }}
                      aria-label={`Resetear el PIN de ${row.displayName}`}
                      title="Resetear PIN (admin)"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:border-accent/60 hover:text-accent disabled:opacity-50"
                    >
                      <svg viewBox="0 0 24 24" width="17" height="17" className="qb-stroke" aria-hidden>
                        <circle cx="8" cy="15" r="4" />
                        <path d="M10.85 12.15 19 4M16 7l3 3M14 9l2 2" />
                      </svg>
                    </button>
                  )}

                  {/* Acciones: nunca sobre el dueño ni sobre ti mismo. */}
                  {!rowIsOwner && !isYou && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {canStructural && (
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
                      {canStructural && (
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

      {/* Salir (miembros y co-organizadores; el dueño no puede). El admin que
          entra en una quiniela ajena no es miembro: no tiene nada de lo que salir. */}
      {isMember && !isOwner && (
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

      {/* Eliminar (el dueño o el admin global, también en quinielas ajenas) */}
      {canStructural && <DeleteGroupCard groupId={groupId} groupName={groupName} />}

      {confirm && confirm.kind !== "leave" && (
        <ConfirmDialog
          title={
            confirm.kind === "remove"
              ? `¿Expulsar a ${confirm.row.displayName}?`
              : confirm.kind === "transfer"
                ? `¿Hacer líder a ${confirm.row.displayName}?`
                : `¿Resetear el PIN de ${confirm.row.displayName}?`
          }
          message={
            confirm.kind === "remove"
              ? "Se borrarán sus pronósticos y puntos de esta quiniela. No se puede deshacer."
              : confirm.kind === "transfer"
                ? "Pasará a ser el organizador y tú dejarás de serlo. Solo el nuevo líder podrá nombrar co-organizadores, transferir o eliminar."
                : "Se generará un PIN temporal. Su PIN actual dejará de funcionar y, al entrar con el temporal, deberá elegir uno nuevo."
          }
          confirmLabel={
            confirm.kind === "remove"
              ? "Expulsar"
              : confirm.kind === "transfer"
                ? "Transferir"
                : "Resetear PIN"
          }
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

      {pinResult && (
        <PinResultDialog
          name={pinResult.name}
          pin={pinResult.pin}
          onClose={() => setPinResult(null)}
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

/** Muestra (una sola vez) el PIN temporal generado para que el admin lo dé. */
function PinResultDialog({
  name,
  pin,
  onClose,
}: {
  name: string;
  pin: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 safe-px [--pad-x:1rem] sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-extrabold text-fg">PIN temporal de {name}</h3>
        <p className="mt-1 text-sm text-muted">
          Dale este PIN. Al entrar tendrá que elegir uno nuevo. Su PIN anterior ya no vale.
        </p>
        <div className="my-4 rounded-2xl border border-accent/40 bg-accent/10 py-4">
          <span className="font-display text-4xl font-extrabold tracking-[0.5em] text-accent">
            {pin}
          </span>
        </div>
        <p className="mb-4 text-[11.5px] font-bold uppercase tracking-wide text-muted">
          Este código no se vuelve a mostrar
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-primary px-4 py-2.5 font-bold text-primary-ink transition hover:bg-primary-strong"
        >
          Entendido
        </button>
      </div>
    </div>
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
