"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateDisplayName, type ProfileState } from "./actions";

const initialState: ProfileState = {};

export function ProfileNameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, initialState);
  const router = useRouter();

  // Al guardar bien, refresca para que la cabecera muestre el nombre nuevo.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-200">Nombre de usuario</span>
        <input
          name="display_name"
          type="text"
          defaultValue={current}
          minLength={2}
          maxLength={40}
          required
          className="rounded-xl border border-line2 bg-surface2 px-4 py-3.5 font-semibold text-fg outline-none transition focus:border-primary"
        />
      </label>

      <p className="text-xs text-muted">
        Así te verán en los rankings. Debe ser único dentro de cada quiniela en la que juegues.
      </p>

      {state.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-good/10 px-3 py-2 text-sm text-good">Nombre actualizado ✓</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-primary px-5 py-3.5 font-bold text-primary-ink shadow-lg shadow-primary/25 transition hover:bg-primary-strong disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar nombre"}
      </button>
    </form>
  );
}
