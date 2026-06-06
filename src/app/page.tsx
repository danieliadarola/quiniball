import Link from "next/link";
import { TOURNAMENT } from "@/config/defaults";
import { VENUES } from "@/data/tournament/venues";
import { Logo } from "@/components/ui/Logo";

/**
 * Landing pública QuiniBall: hero oscuro con halo, titular de impacto y datos
 * reales del torneo. Mobile-first.
 */
export default function HomePage() {
  const stats = [
    { label: "Selecciones", value: TOURNAMENT.teams },
    { label: "Partidos", value: TOURNAMENT.matches },
    { label: "Grupos", value: TOURNAMENT.groups },
    { label: "Sedes", value: VENUES.length },
  ];

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-12 px-5 py-10 safe-px [--pad-x:1.25rem] safe-pb [--pad-b:2.5rem] sm:py-14">
      <Logo size={30} />

      {/* Hero */}
      <header className="relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-line bg-surface px-6 py-10 sm:px-10 sm:py-14">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
          aria-hidden
        />
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-extrabold uppercase tracking-[2px] text-accent">
          11 jun – 19 jul 2026
        </span>
        <h1 className="font-display text-5xl font-extrabold italic uppercase leading-[0.9] tracking-wide text-fg sm:text-6xl">
          Acierta cada
          <br />
          jornada y sube
          <br />
          en el <span className="text-primary">ranking</span>
        </h1>
        <p className="max-w-lg text-lg text-muted">
          Pronostica 1·X·2 en cada partido del Mundial, gana puntos y compite con tu grupo.{" "}
          <span className="font-semibold text-fg">Sin dinero, solo gloria.</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link
            href="/crear"
            className="rounded-xl bg-primary px-6 py-3.5 font-bold text-primary-ink shadow-lg shadow-primary/25 transition hover:bg-primary-strong"
          >
            Crear mi perfil
          </Link>
          <Link
            href="/entrar"
            className="rounded-xl border border-line2 bg-surface2 px-6 py-3.5 font-semibold text-fg transition hover:border-primary/60"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </header>

      {/* Stats del torneo */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-line bg-surface p-5 text-center"
          >
            <div className="font-display text-4xl font-extrabold text-accent">{s.value}</div>
            <div className="mt-1 text-sm text-muted">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Sedes */}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide text-fg">
          Las {VENUES.length} sedes
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {VENUES.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3"
            >
              <div>
                <p className="font-semibold text-fg">{v.city}</p>
                <p className="text-sm text-muted">{v.stadium}</p>
              </div>
              <span className="rounded-md bg-primary/15 px-2 py-1 text-xs font-bold text-primary">
                {v.country}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="border-t border-line pt-6 text-sm text-muted">
        {TOURNAMENT.name} · {TOURNAMENT.hosts.join(" · ")}
      </footer>
    </main>
  );
}
