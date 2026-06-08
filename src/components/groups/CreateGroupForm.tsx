"use client";

import { useActionState } from "react";
import { createGroup, type GroupActionState } from "@/app/(app)/grupos/actions";
import { POINTS } from "@/lib/scoring/types";

const initialState: GroupActionState = {};

export function CreateGroupForm() {
  const [state, action, pending] = useActionState(createGroup, initialState);

  return (
    <form action={action} className="flex flex-col gap-7">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-200">Nombre de la quiniela</span>
        <input
          name="name"
          type="text"
          placeholder="Porra de la oficina"
          maxLength={60}
          required
          className="rounded-xl border border-line2 bg-surface2 px-4 py-3.5 font-semibold text-fg placeholder:font-medium placeholder:text-muted2 outline-none transition focus:border-primary"
        />
      </label>

      {/* El baremo es único y fijo: no hay nada que configurar. */}
      <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface2 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-100">Cómo se juega</h2>
        <ul className="flex flex-col gap-1 text-sm text-muted">
          <li>
            · Pronostica el <span className="text-slate-200">1X2</span> de cada partido:{" "}
            <span className="font-semibold text-accent">{POINTS.outcome} pts</span> por acierto.
          </li>
          <li>
            · Cada jornada hay un <span className="text-slate-200">★ partido estrella</span>{" "}
            (aleatorio y propio de cada quiniela) que además puntúa el marcador exacto:{" "}
            <span className="font-semibold text-accent">+{POINTS.exactBonus} pts</span>.
          </li>
        </ul>
      </section>

      {state.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-primary px-5 py-3.5 font-bold text-primary-ink shadow-lg shadow-primary/25 transition hover:bg-primary-strong disabled:opacity-50"
      >
        {pending ? "Creando…" : "Crear quiniela"}
      </button>
    </form>
  );
}
