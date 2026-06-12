import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { SiteFooter } from "@/components/ui/SiteFooter";

/**
 * Layout del área autenticada. Protege TODAS las rutas hijas: sin sesión
 * válida, redirige a /entrar. Renderiza la barra superior común.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  if (!session) redirect("/entrar");
  // Entró con un PIN temporal: no puede usar la app hasta elegir uno nuevo.
  if (session.mrp) redirect("/cambiar-pin");

  // Una sola consulta para el flag de admin y el avatar de la cabecera.
  const admin = createSupabaseAdmin();
  const { data: profile } = (await admin
    .from("profiles")
    .select("is_admin, avatar_style, avatar_seed")
    .eq("id", session.sub)
    .maybeSingle()) as {
    data: { is_admin: boolean; avatar_style: string | null; avatar_seed: string | null } | null;
  };
  const isAdmin = Boolean(profile?.is_admin);

  return (
    <div className="min-h-dvh">
      <header className="safe-pt sticky top-0 z-10 border-b border-line bg-ink/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between py-3 safe-px [--pad-x:1.25rem]">
          <Link href="/grupos" aria-label="QuiniBall">
            <Logo size={26} />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-lg bg-primary px-3 py-1.5 font-bold text-primary-ink transition hover:bg-primary-strong"
              >
                Admin
              </Link>
            )}
            <Link
              href="/perfil"
              className="flex items-center gap-1.5 rounded-lg border border-line2 bg-surface2 py-1 pl-1 pr-3 font-semibold text-fg transition hover:border-primary/60"
            >
              <Avatar
                id={session.sub}
                name={session.display_name ?? ""}
                size={26}
                avatarStyle={profile?.avatar_style}
                avatarSeed={profile?.avatar_seed}
              />
              <span className="hidden max-w-[10rem] truncate sm:inline">{session.display_name}</span>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-line2 bg-surface2 px-3 py-1.5 font-semibold text-fg transition hover:border-primary/60"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
      <SiteFooter />
    </div>
  );
}
