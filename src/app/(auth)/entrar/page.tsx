import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Entrar" };

export default async function EntrarPage() {
  // Si ya hay sesión, no mostramos el formulario (la app abre en "/").
  const session = await getSession();
  if (session) redirect("/grupos");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-extrabold uppercase tracking-[2px] text-accent">
          QuiniBall
        </span>
        <h1 className="font-display text-4xl font-extrabold italic uppercase leading-[0.92] text-fg">
          Entra a tu cuenta
        </h1>
        <p className="mt-1 text-sm text-muted">
          Accede con tu email y PIN desde cualquier dispositivo.
        </p>
      </header>
      <LoginForm />
    </div>
  );
}
