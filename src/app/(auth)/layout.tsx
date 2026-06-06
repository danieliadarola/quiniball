import Link from "next/link";
import { LogoBadge } from "@/components/ui/Logo";

/** Layout centrado para las pantallas de autenticación (mobile-first). */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-5 py-12 safe-px [--pad-x:1.25rem] safe-pb [--pad-b:3rem]">
      <Link href="/" className="mx-auto" aria-label="QuiniBall">
        <LogoBadge size={128} priority />
      </Link>
      <div className="rounded-3xl border border-line bg-surface/80 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
        {children}
      </div>
    </main>
  );
}
