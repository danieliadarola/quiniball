"use client";

import { useActionState } from "react";
import { joinGroup, type GroupActionState } from "@/app/(app)/grupos/actions";

const initialState: GroupActionState = {};

export function JoinGroupForm({ defaultCode = "" }: { defaultCode?: string }) {
  const [state, action, pending] = useActionState(joinGroup, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.6px] text-muted">
          Código de invitación
        </span>
        <input
          name="code"
          type="text"
          defaultValue={defaultCode}
          placeholder="Ej. K7P3QX"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={10}
          required
          className="rounded-xl border border-line2 bg-surface2 px-4 py-3.5 text-center font-display text-2xl font-extrabold uppercase tracking-[0.3em] text-fg placeholder:text-muted2 outline-none transition focus:border-primary"
        />
      </label>

      {state.error && (
        <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-primary px-5 py-3.5 font-bold text-primary-ink shadow-lg shadow-primary/25 transition hover:bg-primary-strong disabled:opacity-50"
      >
        {pending ? "Uniéndote…" : "Unirme"}
      </button>
    </form>
  );
}
