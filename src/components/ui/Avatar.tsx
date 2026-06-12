import type { CSSProperties } from "react";

/**
 * Avatar de usuario. De momento muestra la INICIAL del nombre sobre un círculo
 * de color estable (derivado del id, para que cada persona tenga siempre el
 * mismo color). Está pensado para crecer en la fase 2: aceptará un icono/emoji
 * elegido por el usuario sin cambiar su API en el resto de la app.
 */
const COLORS = [
  "#2563eb", "#f97316", "#8b5cf6", "#0ea5e9", "#14b8a6",
  "#e11d48", "#6366f1", "#1F8A5B", "#d946ef", "#f59e0b",
];

function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function Avatar({
  id,
  name,
  size = 36,
  ringClass,
}: {
  id: string;
  name: string;
  size?: number;
  /** Clases extra para el aro (p. ej. el borde de medalla en el podio). */
  ringClass?: string;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  const style: CSSProperties = {
    width: size,
    height: size,
    background: colorFor(id),
    fontSize: Math.round(size * 0.42),
  };
  return (
    <span
      style={style}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-display font-extrabold uppercase leading-none text-white ${ringClass ?? ""}`}
      aria-hidden
    >
      {initial}
    </span>
  );
}
