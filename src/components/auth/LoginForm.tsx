"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginWithEmail, type AuthState } from "@/app/(auth)/actions";
import { AuthField } from "./AuthField";

const initialState: AuthState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginWithEmail, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <AuthField
        label="Email"
        name="email"
        type="email"
        placeholder="tu@email.com"
        autoComplete="email"
        required
      />
      <AuthField
        label="PIN (4 dígitos)"
        name="pin"
        type="password"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        placeholder="••••"
        autoComplete="current-password"
        required
      />

      {state.error && (
        <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-primary px-5 py-3.5 text-base font-bold text-primary-ink shadow-lg shadow-primary/25 transition hover:bg-primary-strong disabled:opacity-50"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>

      <p className="text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/crear" className="font-bold text-fg hover:text-primary">
          Crear con email y PIN
        </Link>
      </p>
    </form>
  );
}
