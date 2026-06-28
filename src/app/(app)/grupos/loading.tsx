/**
 * Esqueleto de carga de "Mis quinielas". Se muestra al instante mientras el
 * servidor prepara los datos, en vez de dejar la pantalla en blanco.
 */
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-0 px-5 py-6 safe-px [--pad-x:1.25rem]">
      <div className="mb-1 flex animate-pulse items-start justify-between gap-3">
        <div>
          <div className="h-4 w-16 rounded bg-surface2" />
          <div className="mt-2 h-9 w-48 rounded-lg bg-surface2" />
        </div>
        <div className="h-12 w-24 rounded-2xl bg-surface2" />
      </div>

      <div className="mb-3 mt-6 flex items-center gap-2">
        <div className="h-4 w-28 animate-pulse rounded bg-surface2" />
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <li
            key={i}
            className="h-36 animate-pulse rounded-2xl border border-line bg-surface"
          />
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-2.5 sm:mx-auto sm:w-full sm:max-w-md sm:flex-row">
        <div className="h-12 flex-1 animate-pulse rounded-xl bg-surface2" />
        <div className="h-12 flex-1 animate-pulse rounded-xl bg-surface2" />
      </div>
    </main>
  );
}
