"use client";

import { useActionState } from "react";
import { setNewPinForced, type AuthState } from "@/app/(auth)/actions";
import { AuthField } from "./AuthField";

const initialState: AuthState = {};

/** Formulario del cambio obligatorio de PIN (tras reset del admin). */
export function ForcedPinForm() {
  const [state, action, pending] = useActionState(setNewPinForced, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <AuthField
        label="Nuevo PIN (4 dígitos)"
        name="pin"
        type="password"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        placeholder="••••"
        autoComplete="new-password"
        required
      />
      <AuthField
        label="Repite el PIN"
        name="pin2"
        type="password"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        placeholder="••••"
        autoComplete="new-password"
        required
      />

      {state.error && (
        <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-primary px-5 py-3.5 text-base font-bold text-primary-ink shadow-lg shadow-primary/25 transition hover:bg-primary-strong disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Guardar PIN y entrar"}
      </button>
    </form>
  );
}
