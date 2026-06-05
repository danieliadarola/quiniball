import Link from "next/link";
import { JoinGroupForm } from "@/components/groups/JoinGroupForm";
import { normalizeJoinCode } from "@/lib/groups/code";

export const metadata = { title: "Unirme a una quiniela" };

/** El código puede llegar prerrellenado por enlace: /unirse?code=K7P3QX */
export default async function UnirsePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const defaultCode = code ? normalizeJoinCode(code) : "";

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-5 py-10">
      <Link href="/grupos" className="text-sm text-muted transition hover:text-accent">
        ← Volver
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl uppercase tracking-wide text-slate-100">
          Unirme a una quiniela
        </h1>
        <p className="text-sm text-muted">
          Introduce el código que te ha pasado el organizador.
        </p>
      </header>
      <JoinGroupForm defaultCode={defaultCode} />
    </main>
  );
}
