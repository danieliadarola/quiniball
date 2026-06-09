"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { loginWithEmail, type AuthState } from "@/app/(auth)/actions";
import { AuthField } from "./AuthField";

const initialState: AuthState = {};
const LAST_EMAIL_KEY = "qb_last_email";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginWithEmail, initialState);

  // Recordamos el último email en este dispositivo para no tener que
  // reescribirlo (útil en Safari iOS). Se rellena tras montar para no romper la
  // hidratación; el PIN nunca se guarda.
  const [email, setEmail] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_EMAIL_KEY);
      if (saved) setEmail(saved);
    } catch {
      /* localStorage no disponible (modo privado): se ignora */
    }
  }, []);

  function rememberEmail() {
    try {
      if (email.trim()) localStorage.setItem(LAST_EMAIL_KEY, email.trim());
    } catch {
      /* sin persistencia en modo privado */
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <AuthField
        label="Email"
        name="email"
        type="email"
        placeholder="tu@email.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={rememberEmail}
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
