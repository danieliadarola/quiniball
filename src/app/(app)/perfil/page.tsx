import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, getSupabaseForCurrentUser } from "@/lib/auth/session";
import { ProfileNameForm } from "./ProfileNameForm";

/**
 * Pantalla de perfil del jugador: por ahora, cambiar el nombre de usuario.
 * El email se muestra en solo lectura (es la credencial de acceso).
 */
export default async function PerfilPage() {
  const session = await getSession();
  if (!session) redirect("/entrar");

  let email: string | null = null;
  const sb = await getSupabaseForCurrentUser();
  if (sb) {
    const { data } = (await sb
      .from("profiles")
      .select("email")
      .eq("id", session.sub)
      .maybeSingle()) as { data: { email: string } | null };
    email = data?.email ?? null;
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-7 px-5 py-8 safe-px [--pad-x:1.25rem] safe-pb [--pad-b:2.5rem]">
      <div className="flex flex-col gap-2">
        <Link href="/grupos" className="w-fit text-sm font-semibold text-primary hover:underline">
          ← Mis quinielas
        </Link>
        <h1 className="font-display text-3xl font-extrabold italic uppercase tracking-wide text-fg">
          Tu perfil
        </h1>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <ProfileNameForm current={session.display_name ?? ""} />
      </section>

      {email && (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-medium text-slate-200">Email (acceso)</h2>
          <p className="mt-1 font-semibold text-muted">{email}</p>
        </section>
      )}
    </main>
  );
}
