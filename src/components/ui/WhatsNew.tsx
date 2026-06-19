"use client";

/**
 * Aviso "¿Qué hay de nuevo?" al entrar en la app. Minimalista y de una sola vez
 * POR DISPOSITIVO: se recuerda en localStorage qué versión del aviso ya viste.
 * Para anunciar cambios nuevos, sube `WHATS_NEW.version` y los `items`: volverá
 * a salir una vez a todo el mundo.
 */
import { useEffect, useState } from "react";

const STORAGE_KEY = "qb_whatsnew";

const WHATS_NEW = {
  // Cambia esta clave cuando haya novedades que anunciar (sale una vez por móvil).
  version: "v1.1.0",
  items: [
    {
      icon: "📊",
      title: "Nuevo apartado «Cuadro»",
      text: "Consulta la clasificación real del Mundial: tabla de cada grupo con partidos, goles y puntos.",
    },
    {
      icon: "📱",
      title: "Menú inferior en el móvil",
      text: "Navega más rápido con la barra de abajo. La configuración de la quiniela está ahora en la tuerca de arriba.",
    },
    {
      icon: "🔐",
      title: "Sin reloguear a cada rato",
      text: "Tu dispositivo recuerda la sesión: ya no tienes que iniciar sesión continuamente.",
    },
  ],
};

export function WhatsNew() {
  const [show, setShow] = useState(false);

  // Solo en cliente: decide si mostrarlo según lo que ya se vio en este móvil.
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== WHATS_NEW.version) setShow(true);
    } catch {
      /* localStorage no disponible (modo privado): no se muestra */
    }
  }, []);

  function close() {
    try {
      localStorage.setItem(STORAGE_KEY, WHATS_NEW.version);
    } catch {
      /* sin persistencia: se ignora */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Novedades"
    >
      <div
        className="w-full max-w-sm rounded-t-3xl border border-line bg-surface p-6 safe-pb sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex flex-col items-center gap-1 text-center">
          <span className="text-3xl" aria-hidden>
            ✨
          </span>
          <h2 className="font-display text-xl font-extrabold uppercase tracking-wide text-fg">
            Novedades
          </h2>
          <p className="text-[12.5px] font-semibold text-muted">Esto es lo último que hemos añadido</p>
        </div>

        <ul className="flex flex-col gap-3">
          {WHATS_NEW.items.map((it) => (
            <li
              key={it.title}
              className="flex items-start gap-3 rounded-2xl border border-line bg-surface2 px-3.5 py-3"
            >
              <span className="text-2xl leading-none" aria-hidden>
                {it.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[14.5px] font-bold text-fg">{it.title}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{it.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={close}
          className="mt-5 w-full rounded-xl bg-primary px-5 py-3.5 font-bold text-primary-ink shadow-lg shadow-primary/25 transition hover:bg-primary-strong"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
