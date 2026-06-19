/**
 * Esqueleto de carga de la pantalla de quiniela (la más pesada). Reproduce la
 * cabecera, las pestañas y unas tarjetas para dar feedback inmediato mientras
 * se cargan los datos y el código de la pantalla.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl pb-28 lg:max-w-4xl">
      {/* Cabecera */}
      <div className="safe-pt sticky top-0 z-20 border-b border-line bg-ink/90 backdrop-blur">
        <header className="flex items-center gap-3 px-4 py-3.5 safe-px [--pad-x:1rem]">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-surface2" />
          <div className="min-w-0 flex-1">
            <div className="h-5 w-40 animate-pulse rounded bg-surface2" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-surface2" />
          </div>
          <div className="h-9 w-12 shrink-0 animate-pulse rounded-lg bg-surface2" />
        </header>

        {/* Pestañas (escritorio) */}
        <div className="mx-auto hidden w-full max-w-2xl gap-1.5 px-4 pb-2.5 pt-1 lg:flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 flex-1 animate-pulse rounded-xl bg-surface2" />
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex flex-col gap-3.5 px-4 pt-3.5 safe-px [--pad-x:1rem]">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-16 animate-pulse rounded-xl bg-surface2" />
          ))}
        </div>
        <div className="h-[88px] animate-pulse rounded-2xl bg-surface2" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl border border-line bg-surface"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
