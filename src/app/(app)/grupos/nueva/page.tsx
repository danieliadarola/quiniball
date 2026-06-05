import Link from "next/link";
import { CreateGroupForm } from "@/components/groups/CreateGroupForm";

export const metadata = { title: "Crear quiniela" };

export default function NuevaQuinielaPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-5 py-10">
      <Link href="/grupos" className="text-sm text-muted transition hover:text-accent">
        ← Volver
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl uppercase tracking-wide text-slate-100">
          Nueva quiniela
        </h1>
        <p className="text-sm text-muted">
          Configura las reglas. Serás el organizador y podrás invitar con un código.
        </p>
      </header>
      <CreateGroupForm />
    </main>
  );
}
