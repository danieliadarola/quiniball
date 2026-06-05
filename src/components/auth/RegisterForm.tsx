"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerProfile, type AuthState } from "@/app/(auth)/actions";
import { AuthField } from "./AuthField";

const initialState: AuthState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerProfile, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <AuthField
        label="Tu nombre"
        name="display_name"
        type="text"
        placeholder="Cómo te verán en el ranking"
        autoComplete="nickname"
        maxLength={40}
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
        autoComplete="new-password"
        hint="Lo usarás para entrar desde otro dispositivo."
        required
      />
      <AuthField
        label="Email"
        name="email"
        type="email"
        placeholder="tu@email.com"
        autoComplete="email"
        hint="Lo usarás junto al PIN para entrar."
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
        {pending ? "Creando…" : "Crear mi perfil"}
      </button>

      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/entrar" className="font-bold text-fg hover:text-primary">
          Entrar
        </Link>
      </p>
    </form>
  );
}
