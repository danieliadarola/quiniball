import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ForcedPinForm } from "@/components/auth/ForcedPinForm";

export const metadata = { title: "Cambiar PIN" };

/**
 * Pantalla OBLIGATORIA de cambio de PIN tras un reset del admin. Solo tiene
 * sentido si la sesión está marcada con `mrp`; si no, se sale a /grupos.
 */
export default async function CambiarPinPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");
  if (!session.mrp) redirect("/grupos");

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
      <ForcedPinForm />
    </div>
  );
}
