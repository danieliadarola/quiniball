import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { setNewPinForced } from "@/app/(auth)/actions";
import { AuthField } from "@/components/auth/AuthField";

export const metadata = { title: "Cambiar PIN" };

const ERROR_MESSAGES: Record<string, string> = {
  pin: "El PIN debe ser exactamente 4 dígitos.",
  match: "Los dos PIN no coinciden.",
  save: "No se pudo guardar el PIN. Inténtalo de nuevo.",
};

/**
 * Pantalla OBLIGATORIA de cambio de PIN tras un reset del admin. Solo tiene
 * sentido si la sesión está marcada con `mrp`; si no, se sale a /grupos.
 *
 * Es un COMPONENTE DE SERVIDOR puro con un formulario nativo que llama a la
 * server action `setNewPinForced` (sin componente cliente): así no depende del
 * manifiesto de cliente de React y no puede fallar al hidratar.
 */
export default async function CambiarPinPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (!session.mrp) redirect("/grupos");

  const { e } = await searchParams;
  const errorMsg = e ? ERROR_MESSAGES[e] ?? null : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-extrabold uppercase tracking-[2px] text-accent">
          Seguridad
        </span>
        <h1 className="font-display text-3xl font-extrabold italic uppercase leading-[0.92] text-fg">
          Elige tu nuevo PIN
        </h1>
        <p className="mt-1 text-sm text-muted">
          Entraste con un PIN temporal. Por seguridad, crea uno nuevo de 4 dígitos
          para seguir.
        </p>
      </header>

      <form action={setNewPinForced} className="flex flex-col gap-5">
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

        {errorMsg && (
          <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">{errorMsg}</p>
        )}

        <button
          type="submit"
          className="mt-1 rounded-xl bg-primary px-5 py-3.5 text-base font-bold text-primary-ink shadow-lg shadow-primary/25 transition hover:bg-primary-strong"
        >
          Guardar PIN y entrar
        </button>
      </form>
    </div>
  );
}
